import { describe, expect, it } from 'vitest';
import { createAppState, transition } from '../src/app/app';
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY, SETTINGS_TEMP_KEY } from '../src/app/settings';
import type { StorageLike } from '../src/app/save';
import { STAGE_01_BOSS_START_TICK, STAGE_01_SPAWNS } from '../src/content/stage-01';
import { createInitialState, DIFFICULTY_PRESSURE, step } from '../src/simulation/game';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  failWrites = false;
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { if (this.failWrites) throw new DOMException('denied', 'SecurityError'); this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe('M4 independent settings persistence', () => {
  it('round-trips every setting through the v4-only key', () => {
    const storage = new MemoryStorage();
    const settings = { bgm: 35, se: 80, screenShake: false, reducedFlash: true, difficulty: 'proof' as const };
    expect(saveSettings(storage, settings)).toBe(true);
    expect(storage.getItem(SETTINGS_TEMP_KEY)).toBeNull();
    expect(loadSettings(storage)).toEqual(settings);
    expect(storage.getItem('palimpsest-wake:v4.2:save')).toBeNull();
    expect(storage.getItem('palimpsest-wake:v4.0:settings')).toBeNull();
  });

  it('rejects corrupt, out-of-range and unknown difficulty values', () => {
    const storage = new MemoryStorage();
    for (const raw of [
      '{broken',
      JSON.stringify({ schemaVersion: 1, ...defaultSettings(), bgm: 101 }),
      JSON.stringify({ schemaVersion: 1, ...defaultSettings(), se: -1 }),
      JSON.stringify({ schemaVersion: 1, ...defaultSettings(), difficulty: 'impossible' })
    ]) {
      storage.setItem(SETTINGS_KEY, raw);
      expect(loadSettings(storage)).toBeNull();
    }
  });

  it('reports rejected writes without mutating the in-memory settings object', () => {
    const storage = new MemoryStorage(); const settings = defaultSettings();
    storage.failWrites = true;
    expect(saveSettings(storage, settings)).toBe(false);
    expect(settings).toEqual(defaultSettings());
  });

  it('opens from title and pause and preserves the selected voyage difficulty', () => {
    const settings = { ...defaultSettings(), difficulty: 'echo' as const };
    let app = createAppState(404, settings);
    app = transition(app, 'settings');
    expect(app).toMatchObject({ screen: 'settings', settingsReturn: 'title' });
    app = transition(app, 'back');
    app = transition(transition(app, 'start'), 'confirm');
    expect(app.settings.difficulty).toBe('echo');
    app = transition(app, 'pause');
    app = transition(app, 'settings');
    expect(app).toMatchObject({ screen: 'settings', settingsReturn: 'paused' });
    expect(transition(app, 'back').screen).toBe('paused');
  });

  it('applies ECHO survival aids and PROOF pressure without changing bullet speed', () => {
    const normal = createInitialState(404);
    const echo = createInitialState(404);
    normal.tick = 384; echo.tick = 384;
    normal.trail = [{ x: normal.player.x, y: normal.player.y, bornTick: 0, segmentId: 1 }];
    echo.trail = [{ x: echo.player.x, y: echo.player.y, bornTick: 0, segmentId: 1 }];
    expect(step(normal, {}, 'normal').state.trail[0].bornTick).toBe(385);
    expect(step(echo, {}, 'echo').state.trail[0].bornTick).toBe(0);

    const hit = createInitialState(404);
    hit.bullets = [{ id: hit.nextId++, x: hit.player.x, y: hit.player.y, vx: 0, vy: 0, radius: 8, kind: 'enemy', annotated: false, capturable: true }];
    const echoHit = step(hit, {}, 'echo').state;
    expect(echoHit.player.invulnerableUntil - echoHit.tick).toBe(420);
    expect(echoHit.bullets.filter((bullet) => bullet.kind === 'enemy')).toHaveLength(0);

    expect(DIFFICULTY_PRESSURE.echo.warningTicks).toBeGreaterThan(DIFFICULTY_PRESSURE.normal.warningTicks);
    expect(DIFFICULTY_PRESSURE.normal.warningTicks).toBeGreaterThan(DIFFICULTY_PRESSURE.proof.warningTicks);
    expect(DIFFICULTY_PRESSURE.echo.aimSpread).toBe(DIFFICULTY_PRESSURE.normal.aimSpread);
    expect(DIFFICULTY_PRESSURE.proof.aimSpread).toBeGreaterThan(DIFFICULTY_PRESSURE.normal.aimSpread);

    const echoGate = createInitialState(404, 'stage-01', 'echo');
    echoGate.tick = STAGE_01_BOSS_START_TICK - 1;
    echoGate.encounterIndex = STAGE_01_SPAWNS.length;
    echoGate.enemies = [];
    const proofGate = createInitialState(404, 'stage-01', 'proof');
    proofGate.tick = STAGE_01_BOSS_START_TICK - 1;
    proofGate.encounterIndex = STAGE_01_SPAWNS.length;
    proofGate.enemies = [];
    const echoBoss = step(echoGate, {}, 'echo').state;
    const proofBoss = step(proofGate, {}, 'proof').state;
    expect(echoBoss.boss!.fanFiresAt - echoBoss.tick).toBe(120);
    expect(proofBoss.boss!.fanFiresAt - proofBoss.tick).toBe(60);

    const normalOpening = createInitialState(404, 'stage-01', 'normal').enemies[0];
    const proofOpening = createInitialState(404, 'stage-01', 'proof').enemies[0];
    expect(proofOpening.fireCooldown).toBeLessThan(normalOpening.fireCooldown);

    normalOpening.fireCooldown = 12;
    proofOpening.fireCooldown = 12;
    normal.enemies = [normalOpening];
    const proof = createInitialState(404, 'stage-01', 'proof');
    proof.enemies = [proofOpening];
    let sustainedNormal = normal;
    let sustainedProof = proof;
    for (let tick = 0; tick < 20; tick += 1) {
      sustainedNormal = step(sustainedNormal, {}, 'normal').state;
      sustainedProof = step(sustainedProof, {}, 'proof').state;
    }
    expect(sustainedProof.enemies[0].fireCooldown).toBeLessThan(sustainedNormal.enemies[0].fireCooldown);
  });
});
