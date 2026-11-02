import { SCALE, TICK_RATE, type GameEvent, type GameState, type InputFrame, type StageId } from '../core/types';
import { copyState, createInitialState, step } from '../simulation/game';
import { defaultSettings, type GameSettings } from './settings';
import { marginaliaCandidates, marginaliaEffects, type MarginaliaId } from '../content/marginalia';
import { stageDefinition } from '../content/campaign';

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
  marginaliaMoment: 'midpoint' | 'result';
  midpointMarginaliaTaken: boolean;
  tutorial: TutorialState;
}

export type TutorialFeedback = 'WAKE DRAWN' | 'FIRE INSCRIBED' | 'LOOP CLOSED' | 'FIRE RETURNED';
export interface TutorialState {
  eligible: boolean;
  active: boolean;
  movedAt: number | null;
  firedAt: number | null;
  collatedAt: number | null;
  reflectedAt: number | null;
  completedAt: number | null;
  practiceSpawned: boolean;
  feedback: TutorialFeedback | null;
  feedbackUntil: number;
}

export const FIRST_WAKE_LIMIT_TICKS = 30 * TICK_RATE;
export const createTutorialState = (eligible: boolean, active = false): TutorialState => ({
  eligible, active: eligible && active,
  movedAt: null, firedAt: null, collatedAt: null, reflectedAt: null, completedAt: null, practiceSpawned: false,
  feedback: null, feedbackUntil: 0
});

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

const beginStage = (stageId: StageId, seed: number, campaign: CampaignSummary, settings: GameSettings, marginalia: MarginaliaId[], tutorialEligible = false): AppState => {
  const game = createInitialState(seed || 404, stageId, settings.difficulty);
  game.gauge = Math.min(game.gauge, marginaliaEffects(marginalia).gaugeCap);
  return {
    screen: 'stage-intro', game, checkpoint: copyState(game),
    checkpointName: entryCheckpoints[stageId], continuesRemaining: 1, campaign,
    saveAvailable: true, saveWarning: false, settings, settingsReturn: 'title', settingsIndex: 0, settingsWarning: false,
    marginalia, marginaliaOptions: [], marginaliaIndex: 0, marginaliaMoment: 'midpoint', midpointMarginaliaTaken: false,
    tutorial: createTutorialState(tutorialEligible && stageId === 'stage-01', tutorialEligible && stageId === 'stage-01')
  };
};

export const createAppState = (seed = 404, settings: GameSettings = defaultSettings(), tutorialEligible = true): AppState => {
  const game = createInitialState(seed, 'stage-01', settings.difficulty);
  return { screen: 'title', game, checkpoint: copyState(game), checkpointName: 'harbor-entry', continuesRemaining: 1, campaign: emptyCampaign(), saveAvailable: false, saveWarning: false, settings, settingsReturn: 'title', settingsIndex: 0, settingsWarning: false, marginalia: [], marginaliaOptions: [], marginaliaIndex: 0, marginaliaMoment: 'midpoint', midpointMarginaliaTaken: false, tutorial: createTutorialState(tutorialEligible) };
};

const freshVoyage = (state: AppState): AppState => beginStage('stage-01', state.game.seed, emptyCampaign(), state.settings, [], state.tutorial.eligible);

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
      return { ...state, screen: 'stage-intro', game, continuesRemaining: state.continuesRemaining - 1, tutorial: createTutorialState(false) };
    }
    return state;
  }
  if (state.screen === 'result') {
    if (action === 'back') return { ...state, screen: 'title' };
    if (action === 'confirm') {
      const campaign = recordStage(state);
      return { ...state, screen: 'marginalia', campaign, marginaliaOptions: marginaliaCandidates(state.game.seed, state.game.stageId, 'result'), marginaliaIndex: 0, marginaliaMoment: 'result' };
    }
  }
  if (state.screen === 'marginalia') {
    if (action === 'back') return { ...state, screen: 'title' };
    if (action === 'confirm') {
      const selected = state.marginaliaOptions[state.marginaliaIndex];
      if (!selected) return state;
      const marginalia = [...state.marginalia, selected];
      if (state.marginaliaMoment === 'midpoint') {
        const game = copyState(state.game);
        // The midpoint is the campaign's only guaranteed breathing point.
        // Turning the page restores the three-hit budget without clearing the
        // field, so the choice remains part of live play rather than a continue.
        game.player.health = 3;
        game.player.invulnerableUntil = Math.max(game.player.invulnerableUntil, game.tick + 132);
        return { ...state, screen: 'playing', game, marginalia, midpointMarginaliaTaken: true };
      }
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
  if (state.tutorial.active) {
    const tutorial = { ...state.tutorial };
    const moved = Boolean(input.up || input.down || input.left || input.right)
      && (result.state.player.x !== state.game.player.x || result.state.player.y !== state.game.player.y);
    const fired = result.events.some((event) => event.type === 'shot-fired');
    const collateEvent = result.events.find((event) => event.type === 'loop-collated');
    const completedCollateBeforeThisTick = tutorial.collatedAt !== null;
    if (tutorial.movedAt === null && moved) {
      tutorial.movedAt = result.state.tick; tutorial.feedback = 'WAKE DRAWN'; tutorial.feedbackUntil = result.state.tick + TICK_RATE;
    } else if (tutorial.firedAt === null && fired) {
      tutorial.firedAt = result.state.tick; tutorial.feedback = 'FIRE INSCRIBED'; tutorial.feedbackUntil = result.state.tick + TICK_RATE;
    } else if (tutorial.collatedAt === null && collateEvent) {
      tutorial.collatedAt = result.state.tick; tutorial.feedback = 'LOOP CLOSED'; tutorial.feedbackUntil = result.state.tick + TICK_RATE;
      // The opening mites erase wake but intentionally do not fire. Release one
      // slow, readable practice bracket after the player proves they can close
      // a loop, so the next loop teaches capture without adding a lethal wall.
      // Three lanes keep the exercise reachable without steering the player.
      if (!tutorial.practiceSpawned && result.state.stageId === 'stage-01') {
        for (const y of [240, 360, 480]) {
          result.state.bullets.push({
            id: result.state.nextId++, x: 850 * SCALE, y: y * SCALE,
            vx: Math.round(-20 * SCALE / TICK_RATE), vy: 0, radius: 7,
            kind: 'enemy', annotated: false, capturable: true, sourceAttack: 'enemy-aimed'
          });
        }
        result.state.player.invulnerableUntil = Math.max(result.state.player.invulnerableUntil, FIRST_WAKE_LIMIT_TICKS);
        tutorial.practiceSpawned = true;
      }
    } else if (tutorial.reflectedAt === null && completedCollateBeforeThisTick && collateEvent && collateEvent.captured > 0) {
      tutorial.reflectedAt = result.state.tick; tutorial.completedAt = result.state.tick;
      tutorial.feedback = 'FIRE RETURNED'; tutorial.feedbackUntil = result.state.tick + 2 * TICK_RATE;
      tutorial.active = false; tutorial.eligible = false;
    }
    if (tutorial.active && result.state.tick >= FIRST_WAKE_LIMIT_TICKS) {
      tutorial.active = false; tutorial.eligible = false;
    }
    next.tutorial = tutorial;
  }
  const midpoint = Math.floor(stageDefinition(result.state.stageId).durationTicks / 2);
  if (!state.midpointMarginaliaTaken && state.game.tick < midpoint && result.state.tick >= midpoint) {
    next = { ...next, screen: 'marginalia', marginaliaOptions: marginaliaCandidates(result.state.seed, result.state.stageId, 'midpoint'), marginaliaIndex: 0, marginaliaMoment: 'midpoint' };
  }
  if (result.events.some((event) => event.type === 'boss-spawned')) {
    const game = copyState(result.state);
    // Enter every duel from the common writing gate. Carrying a long approach
    // trail from the scrolling section can otherwise consume the entire trail
    // lifetime before the first authored weak-point loop is drawn.
    game.player.x = 780 * SCALE;
    game.player.y = 360 * SCALE;
    game.trail = [];
    game.candidate = null;
    game.player.health = 3;
    game.player.invulnerableUntil = Math.max(game.player.invulnerableUntil, game.tick + 1200);
    next = { ...next, game, checkpoint: copyState(game), checkpointName: bossCheckpoints[result.state.stageId] };
  }
  if (result.events.some((event) => event.type === 'boss-phase')) {
    const game = copyState(next.game);
    game.player.health = 3;
    game.player.invulnerableUntil = Math.max(game.player.invulnerableUntil, game.tick + 1200);
    next = { ...next, game };
  }
  if (next.game.player.health <= 0) next = { ...next, screen: 'continue' };
  else if (result.events.some((event) => event.type === 'boss-defeated')) next = { ...next, screen: 'result' };
  return { state: next, events: result.events };
};

export const autoPause = (state: AppState): AppState => state.screen === 'playing' ? { ...state, screen: 'paused' } : state;
