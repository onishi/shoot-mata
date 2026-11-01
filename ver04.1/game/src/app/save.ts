import type { AppState, CampaignSummary, CheckpointName } from './app';
import type { GameState, StageId } from '../core/types';
import { defaultSettings } from './settings';
import { MARGINALIA_IDS, type MarginaliaId } from '../content/marginalia';
import { stageDefinition } from '../content/campaign';

export const SAVE_KEY = 'palimpsest-wake:v4.1:save';
export const SAVE_TEMP_KEY = `${SAVE_KEY}:temporary`;
export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_BUILD_VERSION = 'v4.1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveBody {
  schemaVersion: number;
  buildVersion: string;
  stage: StageId;
  checkpoint: CheckpointName;
  health: number;
  gauge: number;
  marginalia: MarginaliaId[];
  score: number;
  seed: number;
  continuesRemaining: number;
  campaign: CampaignSummary;
  checkpointState: GameState;
}

interface SaveDocument extends SaveBody { checksum: string }

export type LoadResult =
  | { status: 'empty'; state: null }
  | { status: 'loaded'; state: AppState }
  | { status: 'quarantined' | 'unavailable'; state: null };

const stages = new Set<StageId>(['stage-01', 'stage-02', 'stage-03', 'stage-04', 'stage-05', 'stage-06']);
const checkpointStages: Record<CheckpointName, StageId> = {
  'harbor-entry': 'stage-01', 'bailiff-gate': 'stage-01',
  'crosswind-entry': 'stage-02', 'compiler-gate': 'stage-02',
  'rain-gallery-entry': 'stage-03', 'eel-gate': 'stage-03',
  'burnt-footnote-entry': 'stage-04', 'advocate-gate': 'stage-04',
  'mirror-chamber-entry': 'stage-05', 'apocrypha-gate': 'stage-05',
  'original-dawn-entry': 'stage-06', 'last-editor-gate': 'stage-06'
};

const finiteInteger = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;

const checksum = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const bodyFrom = (state: AppState): SaveBody => ({
  schemaVersion: SAVE_SCHEMA_VERSION,
  buildVersion: SAVE_BUILD_VERSION,
  stage: state.checkpoint.stageId,
  checkpoint: state.checkpointName,
  health: state.checkpoint.player.health,
  gauge: state.checkpoint.gauge,
  marginalia: state.marginalia,
  score: state.checkpoint.score,
  seed: state.checkpoint.seed,
  continuesRemaining: state.continuesRemaining,
  campaign: state.campaign,
  checkpointState: state.checkpoint
});

const encode = (state: AppState): string => {
  const body = bodyFrom(state);
  return JSON.stringify({ ...body, checksum: checksum(JSON.stringify(body)) });
};

const validCampaign = (value: unknown): value is CampaignSummary => {
  if (!value || typeof value !== 'object') return false;
  const campaign = value as Record<string, unknown>;
  return finiteInteger(campaign.stagesCompleted, 0, 6)
    && finiteInteger(campaign.score, 0, Number.MAX_SAFE_INTEGER)
    && finiteInteger(campaign.collates, 0, Number.MAX_SAFE_INTEGER)
    && finiteInteger(campaign.returnedFire, 0, Number.MAX_SAFE_INTEGER)
    && finiteInteger(campaign.damage, 0, Number.MAX_SAFE_INTEGER)
    && finiteInteger(campaign.revisionsUsed, 0, 6)
    && typeof campaign.complete === 'boolean';
};

const decode = (raw: string): AppState | null => {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const document = parsed as Partial<SaveDocument>;
  const { checksum: storedChecksum, ...body } = document;
  if (typeof storedChecksum !== 'string' || checksum(JSON.stringify(body)) !== storedChecksum) return null;
  if (body.schemaVersion !== SAVE_SCHEMA_VERSION || body.buildVersion !== SAVE_BUILD_VERSION) return null;
  if (!stages.has(body.stage as StageId) || typeof body.checkpoint !== 'string' || !(body.checkpoint in checkpointStages)) return null;
  const checkpoint = body.checkpoint as CheckpointName;
  if (checkpointStages[checkpoint] !== body.stage) return null;
  if (!finiteInteger(body.health, 0, 3) || !finiteInteger(body.gauge, 0, 100)) return null;
  if (!Array.isArray(body.marginalia) || body.marginalia.length > 12
    || !body.marginalia.every((item) => MARGINALIA_IDS.includes(item as MarginaliaId))) return null;
  if (!finiteInteger(body.score, 0, Number.MAX_SAFE_INTEGER) || !finiteInteger(body.seed, 0, 0xffffffff)) return null;
  if (!finiteInteger(body.continuesRemaining, 0, 1) || !validCampaign(body.campaign)) return null;
  if (!body.checkpointState || typeof body.checkpointState !== 'object') return null;
  const game = body.checkpointState as GameState;
  if (game.stageId !== body.stage || game.seed !== body.seed || game.score !== body.score) return null;
  if (!finiteInteger(game.tick, 0, 100000) || !finiteInteger(game.gauge, 0, 100)) return null;
  if (!game.player || game.player.health !== body.health || game.gauge !== body.gauge) return null;
  if (!Array.isArray(game.trail) || !Array.isArray(game.bullets) || !Array.isArray(game.enemies)) return null;
  game.annotationChain = finiteInteger(game.annotationChain, 0, Number.MAX_SAFE_INTEGER) ? game.annotationChain : 0;
  game.errataReadyAt = finiteInteger(game.errataReadyAt, 0, 100000) ? game.errataReadyAt : 0;
  game.lastDamageTick = typeof game.lastDamageTick === 'number' && Number.isFinite(game.lastDamageTick) ? game.lastDamageTick : -100000;
  game.recovery ??= { active: null, redactionProgress: 0, redactionReadyUntil: 0, citationProgress: 0, palinodeProgress: 0, palinodeReady: false, afterwordProgress: 0, afterwordReady: false, afterwordReadyUntil: 0, afterwordRecoveryUntil: 0, feedbackUntil: 0 };
  game.recovery.afterwordRecoveryUntil ??= 0;
  game.metrics.recovery ??= { redactionTriggers: 0, redactionBulletsCleared: 0, redactionBlocks: 0, citationLances: 0, palinodePrimes: 0, palinodeClosures: 0, afterwordPrimes: 0, afterwordProtectedTicks: 0 };
  return {
    screen: 'stage-intro', game, checkpoint: game, checkpointName: checkpoint,
    continuesRemaining: body.continuesRemaining, campaign: body.campaign,
    saveAvailable: true, saveWarning: false,
    settings: defaultSettings(), settingsReturn: 'title', settingsIndex: 0, settingsWarning: false,
    marginalia: body.marginalia, marginaliaOptions: [], marginaliaIndex: 0,
    marginaliaMoment: 'midpoint', midpointMarginaliaTaken: game.tick >= Math.floor(stageDefinition(game.stageId).durationTicks / 2)
  };
};

const quarantine = (storage: StorageLike, raw: string, now: () => number): boolean => {
  try {
    storage.setItem(`${SAVE_KEY}:quarantine:${now()}`, raw);
    storage.removeItem(SAVE_KEY);
    return true;
  } catch { return false; }
};

export const saveCampaign = (storage: StorageLike, state: AppState): boolean => {
  const raw = encode(state);
  try {
    storage.setItem(SAVE_TEMP_KEY, raw);
    const verified = storage.getItem(SAVE_TEMP_KEY);
    if (verified !== raw || !decode(verified)) throw new Error('Save verification failed');
    storage.setItem(SAVE_KEY, raw);
    storage.removeItem(SAVE_TEMP_KEY);
    return true;
  } catch {
    try { storage.removeItem(SAVE_TEMP_KEY); } catch { /* Storage is unavailable. */ }
    return false;
  }
};

export const loadCampaign = (storage: StorageLike, now: () => number = Date.now): LoadResult => {
  let raw: string | null;
  try { raw = storage.getItem(SAVE_KEY); } catch { return { status: 'unavailable', state: null }; }
  if (raw === null) return { status: 'empty', state: null };
  const state = decode(raw);
  if (state) return { status: 'loaded', state };
  quarantine(storage, raw, now);
  return { status: 'quarantined', state: null };
};

export const clearCampaign = (storage: StorageLike): boolean => {
  try { storage.removeItem(SAVE_KEY); storage.removeItem(SAVE_TEMP_KEY); return true; }
  catch { return false; }
};
