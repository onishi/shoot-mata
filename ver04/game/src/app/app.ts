import type { GameEvent, GameState, InputFrame, StageId } from '../core/types';
import { copyState, createInitialState, step } from '../simulation/game';
import { defaultSettings, type GameSettings } from './settings';
import { marginaliaCandidates, marginaliaEffects, type MarginaliaId } from '../content/marginalia';

export type AppScreen = 'title' | 'guide' | 'settings' | 'stage-intro' | 'playing' | 'paused' | 'continue' | 'result' | 'marginalia' | 'ending' | 'campaign-result';
export type AppAction = 'start' | 'guide' | 'settings' | 'confirm' | 'back' | 'pause';
export type CheckpointName =
  | 'harbor-entry' | 'bailiff-gate'
  | 'crosswind-entry' | 'compiler-gate'
  | 'rain-gallery-entry' | 'eel-gate'
  | 'burnt-footnote-entry' | 'advocate-gate'
  | 'mirror-chamber-entry' | 'apocrypha-gate'
  | 'original-dawn-entry' | 'last-editor-gate';

export interface AppState {
  screen: AppScreen;
  game: GameState;
  checkpoint: GameState;
  checkpointName: CheckpointName;
  continuesRemaining: number;
  campaign: CampaignSummary;
  saveAvailable: boolean;
  saveWarning: boolean;
  settings: GameSettings;
  settingsReturn: 'title' | 'paused';
  settingsIndex: number;
  settingsWarning: boolean;
  marginalia: MarginaliaId[];
  marginaliaOptions: MarginaliaId[];
  marginaliaIndex: number;
}

export interface CampaignSummary {
  stagesCompleted: number;
  score: number;
  collates: number;
  returnedFire: number;
  damage: number;
  revisionsUsed: number;
  complete: boolean;
}

const emptyCampaign = (): CampaignSummary => ({
  stagesCompleted: 0, score: 0, collates: 0, returnedFire: 0, damage: 0, revisionsUsed: 0, complete: false
});

const entryCheckpoints: Record<StageId, CheckpointName> = {
  'stage-01': 'harbor-entry', 'stage-02': 'crosswind-entry', 'stage-03': 'rain-gallery-entry', 'stage-04': 'burnt-footnote-entry', 'stage-05': 'mirror-chamber-entry', 'stage-06': 'original-dawn-entry'
};
const bossCheckpoints: Record<StageId, CheckpointName> = {
  'stage-01': 'bailiff-gate', 'stage-02': 'compiler-gate', 'stage-03': 'eel-gate', 'stage-04': 'advocate-gate', 'stage-05': 'apocrypha-gate', 'stage-06': 'last-editor-gate'
};
const nextStages: Partial<Record<StageId, StageId>> = {
  'stage-01': 'stage-02', 'stage-02': 'stage-03', 'stage-03': 'stage-04', 'stage-04': 'stage-05', 'stage-05': 'stage-06'
};

const beginStage = (stageId: StageId, seed: number, campaign: CampaignSummary, settings: GameSettings, marginalia: MarginaliaId[]): AppState => {
  const game = createInitialState(seed || 404, stageId, settings.difficulty);
  game.gauge = Math.min(game.gauge, marginaliaEffects(marginalia).gaugeCap);
  return {
    screen: 'stage-intro', game, checkpoint: copyState(game),
    checkpointName: entryCheckpoints[stageId], continuesRemaining: 1, campaign,
    saveAvailable: true, saveWarning: false, settings, settingsReturn: 'title', settingsIndex: 0, settingsWarning: false,
    marginalia, marginaliaOptions: [], marginaliaIndex: 0
  };
};

export const createAppState = (seed = 404, settings: GameSettings = defaultSettings()): AppState => {
  const game = createInitialState(seed, 'stage-01', settings.difficulty);
  return { screen: 'title', game, checkpoint: copyState(game), checkpointName: 'harbor-entry', continuesRemaining: 1, campaign: emptyCampaign(), saveAvailable: false, saveWarning: false, settings, settingsReturn: 'title', settingsIndex: 0, settingsWarning: false, marginalia: [], marginaliaOptions: [], marginaliaIndex: 0 };
};

const freshVoyage = (state: AppState): AppState => beginStage('stage-01', state.game.seed, emptyCampaign(), state.settings, []);

const recordStage = (state: AppState): CampaignSummary => ({
  stagesCompleted: state.campaign.stagesCompleted + 1,
  score: state.campaign.score + state.game.score,
  collates: state.campaign.collates + state.game.metrics.loops,
  returnedFire: state.campaign.returnedFire + state.game.metrics.captured,
  damage: state.campaign.damage + state.game.metrics.damage,
  revisionsUsed: state.campaign.revisionsUsed + (1 - state.continuesRemaining),
  complete: state.game.stageId === 'stage-06'
});

export const transition = (state: AppState, action: AppAction): AppState => {
  if (state.screen === 'title') {
    if (action === 'start' || action === 'confirm') return freshVoyage(state);
    if (action === 'guide') return { ...state, screen: 'guide' };
    if (action === 'settings') return { ...state, screen: 'settings', settingsReturn: 'title', settingsIndex: 0 };
    return state;
  }
  if (state.screen === 'guide') {
    if (action === 'back' || action === 'confirm') return { ...state, screen: 'title' };
    return state;
  }
  if (state.screen === 'settings') {
    if (action === 'back') return { ...state, screen: state.settingsReturn };
    return state;
  }
  if (state.screen === 'stage-intro') {
    if (action === 'confirm' || action === 'start') return { ...state, screen: 'playing' };
    if (action === 'back') return { ...state, screen: 'title' };
    return state;
  }
  if (state.screen === 'playing') return action === 'pause' ? { ...state, screen: 'paused' } : state;
  if (state.screen === 'paused') {
    if (action === 'settings') return { ...state, screen: 'settings', settingsReturn: 'paused', settingsIndex: 0 };
    if (action === 'pause' || action === 'confirm') return { ...state, screen: 'playing' };
    if (action === 'back') return { ...state, screen: 'title' };
    return state;
  }
  if (state.screen === 'continue') {
    if (action === 'back' || (action === 'confirm' && state.continuesRemaining === 0)) return { ...state, screen: 'title' };
    if (action === 'confirm' && state.continuesRemaining > 0) {
      const game = copyState(state.checkpoint);
      game.player.health = 3;
      game.player.invulnerableUntil = game.tick + 132;
      game.gauge = 50;
      game.trail = [];
      game.candidate = null;
      game.retrace = null;
      game.bullets = game.bullets.filter((bullet) => bullet.kind !== 'enemy');
      return { ...state, screen: 'stage-intro', game, continuesRemaining: state.continuesRemaining - 1 };
    }
    return state;
  }
  if (state.screen === 'result') {
    if (action === 'back') return { ...state, screen: 'title' };
    if (action === 'confirm') {
      const campaign = recordStage(state);
      return { ...state, screen: 'marginalia', campaign, marginaliaOptions: marginaliaCandidates(state.game.seed, state.game.stageId), marginaliaIndex: 0 };
    }
  }
  if (state.screen === 'marginalia') {
    if (action === 'back') return { ...state, screen: 'title' };
    if (action === 'confirm') {
      const selected = state.marginaliaOptions[state.marginaliaIndex];
      if (!selected) return state;
      const marginalia = [...state.marginalia, selected];
      const nextStage = nextStages[state.game.stageId];
      return nextStage
        ? beginStage(nextStage, state.game.seed, state.campaign, state.settings, marginalia)
        : { ...state, screen: 'ending', marginalia };
    }
  }
  if (state.screen === 'ending') {
    if (action === 'confirm') return { ...state, screen: 'campaign-result' };
    if (action === 'back') return { ...state, screen: 'title' };
  }
  if (state.screen === 'campaign-result' && (action === 'confirm' || action === 'back')) return { ...state, screen: 'title' };
  return state;
};

export const advance = (state: AppState, input: InputFrame = {}): { state: AppState; events: GameEvent[] } => {
  if (state.screen !== 'playing') return { state, events: [] };
  const result = step(state.game, input, state.settings.difficulty, state.marginalia);
  let next: AppState = { ...state, game: result.state };
  if (result.events.some((event) => event.type === 'boss-spawned')) {
    next = { ...next, checkpoint: copyState(result.state), checkpointName: bossCheckpoints[result.state.stageId] };
  }
  if (result.state.player.health <= 0) next = { ...next, screen: 'continue' };
  else if (result.events.some((event) => event.type === 'boss-defeated')) next = { ...next, screen: 'result' };
  return { state: next, events: result.events };
};

export const autoPause = (state: AppState): AppState => state.screen === 'playing' ? { ...state, screen: 'paused' } : state;
