import { describe, expect, it } from 'vitest';
import { advance, createAppState, transition } from '../src/app/app';
import { loadCampaign, SAVE_KEY, SAVE_TEMP_KEY, saveCampaign, type StorageLike } from '../src/app/save';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  failWrites = false;
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { if (this.failWrites) throw new DOMException('denied', 'QuotaExceededError'); this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const started = () => transition(transition(createAppState(404), 'start'), 'confirm');

describe('M4 campaign persistence', () => {
  it('round-trips an entry checkpoint through the v4-only transactional key', () => {
    const storage = new MemoryStorage();
    const app = started();
    app.marginalia = ['longhand', 'rubric'];
    const checkpointSeed = app.checkpoint.seed;
    expect(saveCampaign(storage, app)).toBe(true);
    expect(storage.getItem(SAVE_TEMP_KEY)).toBeNull();
    const loaded = loadCampaign(storage);
    expect(loaded.status).toBe('loaded');
    expect(loaded.state).toMatchObject({ screen: 'stage-intro', checkpointName: 'harbor-entry', continuesRemaining: 1, saveAvailable: true });
    expect(loaded.state?.game).toMatchObject({ stageId: 'stage-01', tick: 0, seed: checkpointSeed });
    expect(loaded.state?.marginalia).toEqual(['longhand', 'rubric']);
  });

  it('restores the boss gate rather than transient combat state', () => {
    const storage = new MemoryStorage();
    let app = started();
    app.game.tick = STAGE_01_BOSS_START_TICK - 1;
    app.game.encounterIndex = STAGE_01_SPAWNS.length;
    app.game.enemies = [];
    app = advance(app).state;
    app.game.player.x = 123 * 256;
    expect(saveCampaign(storage, app)).toBe(true);
    const restored = loadCampaign(storage).state!;
    expect(restored.checkpointName).toBe('bailiff-gate');
    expect(restored.game.tick).toBe(STAGE_01_BOSS_START_TICK);
    expect(restored.game.player.x).not.toBe(123 * 256);
    expect(restored.game.boss?.kind).toBe('blank-bailiff');
  });

  it('quarantines tampered and unknown-version data without accepting it', () => {
    const storage = new MemoryStorage();
    expect(saveCampaign(storage, started())).toBe(true);
    const raw = storage.getItem(SAVE_KEY)!;
    storage.setItem(SAVE_KEY, raw.replace('"schemaVersion":1', '"schemaVersion":9'));
    expect(loadCampaign(storage, () => 1234).status).toBe('quarantined');
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(`${SAVE_KEY}:quarantine:1234`)).not.toBeNull();
  });

  it('keeps the in-memory voyage playable when quota or security rejects writes', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const app = started();
    expect(saveCampaign(storage, app)).toBe(false);
    expect(app.screen).toBe('playing');
    expect(advance(app, { fire: true }).state.game.tick).toBe(1);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('does not read a save belonging to an older version key', () => {
    const storage = new MemoryStorage();
    storage.setItem('palimpsest-wake:v4.0:save', '{"previousRelease":true}');
    storage.setItem('palimpsest-wake:v3.4:save', '{"legacy":true}');
    expect(loadCampaign(storage)).toEqual({ status: 'empty', state: null });
    expect(storage.getItem('palimpsest-wake:v4.0:save')).not.toBeNull();
  });
});
