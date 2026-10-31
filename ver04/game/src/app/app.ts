import type { GameEvent, GameState, InputFrame, StageId } from '../core/types';
import { copyState, createInitialState, step } from '../simulation/game';

export type AppScreen = 'title' | 'guide' | 'stage-intro' | 'playing' | 'paused' | 'continue' | 'result';
export type AppAction = 'start' | 'guide' | 'confirm' | 'back' | 'pause';
export type CheckpointName = 'harbor-entry' | 'bailiff-gate' | 'crosswind-entry' | 'compiler-gate';

export interface AppState {
  screen: AppScreen;
  game: GameState;
  checkpoint: GameState;
  checkpointName: CheckpointName;
  continuesRemaining: number;
}

const entryCheckpoint = (stageId: StageId): CheckpointName => stageId === 'stage-01' ? 'harbor-entry' : 'crosswind-entry';
const bossCheckpoint = (stageId: StageId): CheckpointName => stageId === 'stage-01' ? 'bailiff-gate' : 'compiler-gate';

const beginStage = (stageId: StageId, seed: number): AppState => {
  const game = createInitialState(seed || 404, stageId);
  return {
    screen: 'stage-intro', game, checkpoint: copyState(game),
    checkpointName: entryCheckpoint(stageId), continuesRemaining: 1
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
    if (action === 'confirm' && state.game.stageId === 'stage-01') return beginStage('stage-02', state.game.seed);
    if (action === 'confirm') return { ...state, screen: 'title' };
  }
  return state;
};

export const advance = (state: AppState, input: InputFrame = {}): { state: AppState; events: GameEvent[] } => {
  if (state.screen !== 'playing') return { state, events: [] };
  const result = step(state.game, input);
  let next: AppState = { ...state, game: result.state };
  if (result.events.some((event) => event.type === 'boss-spawned')) {
    next = { ...next, checkpoint: copyState(result.state), checkpointName: bossCheckpoint(result.state.stageId) };
  }
  if (result.state.player.health <= 0) next = { ...next, screen: 'continue' };
  else if (result.events.some((event) => event.type === 'boss-defeated')) next = { ...next, screen: 'result' };
  return { state: next, events: result.events };
};

export const autoPause = (state: AppState): AppState => state.screen === 'playing' ? { ...state, screen: 'paused' } : state;
