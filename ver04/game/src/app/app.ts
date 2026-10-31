import type { GameEvent, GameState, InputFrame, StageId } from '../core/types';
import { copyState, createInitialState, step } from '../simulation/game';

export type AppScreen = 'title' | 'guide' | 'stage-intro' | 'playing' | 'paused' | 'continue' | 'result';
export type AppAction = 'start' | 'guide' | 'confirm' | 'back' | 'pause';
export type CheckpointName =
  | 'harbor-entry' | 'bailiff-gate'
  | 'crosswind-entry' | 'compiler-gate'
  | 'rain-gallery-entry' | 'eel-gate'
  | 'burnt-footnote-entry' | 'advocate-gate';

export interface AppState {
  screen: AppScreen;
  game: GameState;
  checkpoint: GameState;
  checkpointName: CheckpointName;
  continuesRemaining: number;
}

const entryCheckpoints: Record<StageId, CheckpointName> = {
  'stage-01': 'harbor-entry', 'stage-02': 'crosswind-entry', 'stage-03': 'rain-gallery-entry', 'stage-04': 'burnt-footnote-entry'
};
const bossCheckpoints: Record<StageId, CheckpointName> = {
  'stage-01': 'bailiff-gate', 'stage-02': 'compiler-gate', 'stage-03': 'eel-gate', 'stage-04': 'advocate-gate'
};
const nextStages: Partial<Record<StageId, StageId>> = {
  'stage-01': 'stage-02', 'stage-02': 'stage-03'
};

const beginStage = (stageId: StageId, seed: number): AppState => {
  const game = createInitialState(seed || 404, stageId);
  return {
    screen: 'stage-intro', game, checkpoint: copyState(game),
    checkpointName: entryCheckpoints[stageId], continuesRemaining: 1
  };
};

export const createAppState = (seed = 404): AppState => {
  const game = createInitialState(seed);
  return { screen: 'title', game, checkpoint: copyState(game), checkpointName: 'harbor-entry', continuesRemaining: 1 };
};

const freshVoyage = (state: AppState): AppState => beginStage('stage-01', state.game.seed);

export const transition = (state: AppState, action: AppAction): AppState => {
  if (state.screen === 'title') {
    if (action === 'start' || action === 'confirm') return freshVoyage(state);
    if (action === 'guide') return { ...state, screen: 'guide' };
    return state;
  }
  if (state.screen === 'guide') {
    if (action === 'back' || action === 'confirm') return { ...state, screen: 'title' };
    return state;
  }
  if (state.screen === 'stage-intro') {
    if (action === 'confirm' || action === 'start') return { ...state, screen: 'playing' };
    if (action === 'back') return { ...state, screen: 'title' };
    return state;
  }
  if (state.screen === 'playing') return action === 'pause' ? { ...state, screen: 'paused' } : state;
  if (state.screen === 'paused') {
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
      const nextStage = nextStages[state.game.stageId];
      return nextStage ? beginStage(nextStage, state.game.seed) : { ...state, screen: 'title' };
    }
  }
  return state;
};

export const advance = (state: AppState, input: InputFrame = {}): { state: AppState; events: GameEvent[] } => {
  if (state.screen !== 'playing') return { state, events: [] };
  const result = step(state.game, input);
  let next: AppState = { ...state, game: result.state };
  if (result.events.some((event) => event.type === 'boss-spawned')) {
    next = { ...next, checkpoint: copyState(result.state), checkpointName: bossCheckpoints[result.state.stageId] };
  }
  if (result.state.player.health <= 0) next = { ...next, screen: 'continue' };
  else if (result.events.some((event) => event.type === 'boss-defeated')) next = { ...next, screen: 'result' };
  return { state: next, events: result.events };
};

export const autoPause = (state: AppState): AppState => state.screen === 'playing' ? { ...state, screen: 'paused' } : state;
