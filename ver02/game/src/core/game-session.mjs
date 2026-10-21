import { createFlowState, transitionFlow } from "./flow-machine.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "./stage-simulation.mjs";

const ACTION_EVENTS = Object.freeze({
  "start-campaign": "START_CAMPAIGN",
  "complete-tutorial": "COMPLETE_TUTORIAL",
  "begin-stage": "BEGIN_STAGE",
  pause: "PAUSE",
  resume: "RESUME",
  "request-restart": "REQUEST_RESTART",
  "request-title": "REQUEST_TITLE",
  confirm: "CONFIRM",
  cancel: "CANCEL_CONFIRMATION",
  retry: "RETRY_STAGE",
  continue: "CONTINUE_CAMPAIGN",
});

function requireSession(session) {
  if (!session || typeof session !== "object" || !session.flow) {
    throw new TypeError("invalid game session");
  }
}

function startSimulation(session, stage) {
  session.simulation = createStageSimulation(stage, { seed: session.seed });
  session.lastRun = null;
}

export function createGameSession(options = {}) {
  const seed = options.seed ?? 20261022;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new TypeError("seed must be an unsigned 32-bit integer");
  }
  return {
    seed,
    flow: createFlowState({
      tutorialSeen: options.tutorialSeen === true,
      maxUnlockedStage: options.maxUnlockedStage ?? 0,
    }),
    simulation: null,
    lastRun: null,
  };
}

export function dispatchGameAction(session, stage, action) {
  requireSession(session);
  const eventType = ACTION_EVENTS[action];
  if (!eventType) throw new Error(`unknown game action: ${action}`);
  session.flow = transitionFlow(session.flow, { type: eventType });
  if (eventType === "BEGIN_STAGE") startSimulation(session, stage);
  if (["RETRY_STAGE", "CONTINUE_CAMPAIGN"].includes(eventType)
    || (eventType === "CONFIRM" && session.flow.screen !== "playing")) {
    session.simulation = null;
  }
  if (session.flow.screen === "title") {
    session.simulation = null;
    session.lastRun = null;
  }
  return session;
}

export function updateGameSession(session, stage, command = {}) {
  requireSession(session);
  if (session.flow.confirmation !== null) {
    if (command.confirm === true) dispatchGameAction(session, stage, "confirm");
    else if (command.back === true) dispatchGameAction(session, stage, "cancel");
    return session;
  }

  switch (session.flow.screen) {
    case "title":
      if (command.confirm === true) dispatchGameAction(session, stage, "start-campaign");
      break;
    case "tutorial":
      if (command.confirm === true) dispatchGameAction(session, stage, "complete-tutorial");
      break;
    case "stageIntro":
      if (command.confirm === true) dispatchGameAction(session, stage, "begin-stage");
      break;
    case "playing":
      if (command.pause === true || command.back === true) {
        dispatchGameAction(session, stage, "pause");
        break;
      }
      if (!session.simulation) throw new Error("playing session requires a simulation");
      stepStageSimulation(session.simulation, stage, command);
      if (session.simulation.flowEvent) {
        session.lastRun = createStageSimulationSnapshot(session.simulation);
        session.flow = transitionFlow(session.flow, { type: session.simulation.flowEvent });
      }
      break;
    case "paused":
      if (command.pause === true || command.confirm === true) {
        dispatchGameAction(session, stage, "resume");
      }
      break;
    case "result":
    case "gameOver":
      if (command.confirm === true) dispatchGameAction(session, stage, "retry");
      break;
    default:
      break;
  }
  return session;
}

export function getGameSessionSnapshot(session) {
  requireSession(session);
  if (session.simulation) return createStageSimulationSnapshot(session.simulation);
  if (session.lastRun) return session.lastRun;
  return {
    tick: 0,
    status: "waiting",
    flowEvent: null,
    player: { x: 0.18, y: 0.5, lives: 3, invulnerabilityTicks: 0 },
    coreQueue: ["red"],
    weapon: { weaponLabel: "LANCE", level: 1 },
    score: 0,
    scoreBreakdown: { enemy: 0, core: 0, streak: 0, noHit: 0 },
    hitsTaken: 0,
    boss: null,
    actors: [
      { id: "player", assetId: "player-interceptor", x: 0.18, y: 0.5, width: 0.12, height: 0.15, tone: "player" },
    ],
  };
}
