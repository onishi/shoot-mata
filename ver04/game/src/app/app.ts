import type { GameEvent, GameState, InputFrame } from '../core/types';
import { copyState, createInitialState, step } from '../simulation/game';

export type AppScreen = 'title' | 'guide' | 'stage-intro' | 'playing' | 'paused' | 'continue' | 'result';
export type AppAction = 'start' | 'guide' | 'confirm' | 'back' | 'pause';

export interface AppState {
  screen: AppScreen;
  game: GameState;
  checkpoint: GameState;
  checkpointName: 'harbor-entry' | 'boss-gate';
  continuesRemaining: number;
}

export const createAppState = (seed = 404): AppState => {
  const game = createInitialState(seed);
  return { screen: 'title', game, checkpoint: copyState(game), checkpointName: 'harbor-entry', continuesRemaining: 1 };
};

const freshVoyage = (state: AppState): AppState => {
  const game = createInitialState(state.game.seed || 404);
  return { screen: 'stage-intro', game, checkpoint: copyState(game), checkpointName: 'harbor-entry', continuesRemaining: 1 };
};

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
  if (state.screen === 'result' && (action === 'confirm' || action === 'back')) return { ...state, screen: 'title' };
  return state;
};

export const advance = (state: AppState, input: InputFrame = {}): { state: AppState; events: GameEvent[] } => {
  if (state.screen !== 'playing') return { state, events: [] };
  const result = step(state.game, input);
  let next: AppState = { ...state, game: result.state };
  if (result.events.some((event) => event.type === 'boss-spawned')) next = { ...next, checkpoint: copyState(result.state), checkpointName: 'boss-gate' };
  if (result.state.player.health <= 0) next = { ...next, screen: 'continue' };
  else if (result.events.some((event) => event.type === 'boss-defeated')) next = { ...next, screen: 'result' };
  return { state: next, events: result.events };
};

export const autoPause = (state: AppState): AppState => state.screen === 'playing' ? { ...state, screen: 'paused' } : state;
