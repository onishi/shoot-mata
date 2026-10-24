import { createFlowState, transitionFlow } from "./flow-machine.mjs";
import {
  createStageSimulation,
  createStageSimulationSnapshot,
  stepStageSimulation,
} from "./stage-simulation.mjs";

const ACTION_EVENTS = Object.freeze({
  "start-campaign": "START_CAMPAIGN",
  "open-stage-select": "OPEN_STAGE_SELECT",
  "complete-tutorial": "COMPLETE_TUTORIAL",
  "begin-stage": "BEGIN_STAGE",
  pause: "PAUSE",
  resume: "RESUME",
  "request-restart": "REQUEST_RESTART",
  "request-title": "REQUEST_TITLE",
  confirm: "CONFIRM",
  cancel: "CANCEL_CONFIRMATION",
  retry: "RETRY_STAGE",
  advance: "ADVANCE",
  continue: "CONTINUE_CAMPAIGN",
  "complete-ending": "COMPLETE_ENDING",
  "open-credits": "OPEN_CREDITS",
  "return-title": "RETURN_TITLE",
});

function requireSession(session) {
  if (!session || typeof session !== "object" || !session.flow) {
    throw new TypeError("invalid game session");
  }
}

function startSimulation(session, stage) {
  session.simulation = createStageSimulation(stage, {
    seed: session.seed,
    difficulty: session.difficulty,
  });
  session.lastRun = null;
}

function recordCampaignRun(session) {
  if (session.flow.mode !== "campaign" || !session.lastRun) return;
  const run = {
    stageIndex: session.flow.stageIndex,
    score: session.lastRun.score,
    scoreBreakdown: { ...session.lastRun.scoreBreakdown },
    hitsTaken: session.lastRun.hitsTaken,
    coreQueue: [...session.lastRun.coreQueue],
  };
  session.campaignRuns[session.flow.stageIndex] = run;
}

export function createGameSession(options = {}) {
  const seed = options.seed ?? 20261022;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new TypeError("seed must be an unsigned 32-bit integer");
  }
  const difficulty = options.difficulty ?? "standard";
  if (!["standard", "assist"].includes(difficulty)) {
    throw new TypeError("difficulty must be standard or assist");
  }
  return {
    seed,
    difficulty,
    flow: createFlowState({
      tutorialSeen: options.tutorialSeen === true,
      maxUnlockedStage: options.maxUnlockedStage ?? 0,
    }),
    simulation: null,
    lastRun: null,
    campaignRuns: [],
  };
}

export function dispatchGameAction(session, stage, action) {
  requireSession(session);
  const stageMatch = /^start-stage-([0-3])$/.exec(action);
  const eventType = stageMatch ? "START_STAGE" : ACTION_EVENTS[action];
  if (!eventType) throw new Error(`unknown game action: ${action}`);
  const event = stageMatch
    ? { type: eventType, stageIndex: Number(stageMatch[1]) }
    : { type: eventType };
  if (eventType === "START_CAMPAIGN") session.campaignRuns = [];
  session.flow = transitionFlow(session.flow, event);
  if (eventType === "BEGIN_STAGE") startSimulation(session, stage);
  if (["RETRY_STAGE", "CONTINUE_CAMPAIGN"].includes(eventType)
    || (eventType === "CONFIRM" && session.flow.screen !== "playing")) {
    session.simulation = null;
  }
  if (session.flow.screen === "title") {
    session.simulation = null;
    session.lastRun = null;
    session.campaignRuns = [];
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
      if (command.openStageSelect === true) dispatchGameAction(session, stage, "open-stage-select");
      else if (command.confirm === true) dispatchGameAction(session, stage, "start-campaign");
      break;
    case "stageSelect":
      if (Number.isInteger(command.stageIndex)) {
        dispatchGameAction(session, stage, `start-stage-${command.stageIndex}`);
      } else if (command.back === true) {
        dispatchGameAction(session, stage, "return-title");
      }
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
        if (session.simulation.flowEvent === "STAGE_CLEAR") recordCampaignRun(session);
        session.flow = transitionFlow(session.flow, { type: session.simulation.flowEvent });
      }
      break;
    case "paused":
      if (command.pause === true || command.confirm === true) {
        dispatchGameAction(session, stage, "resume");
      }
      break;
    case "result":
      if (command.advance === true) dispatchGameAction(session, stage, "advance");
      else if (command.confirm === true) {
        dispatchGameAction(session, stage, session.flow.mode === "campaign" ? "advance" : "retry");
      }
      break;
    case "gameOver":
      if (command.confirm === true) dispatchGameAction(session, stage, "retry");
      break;
    case "ending":
      if (command.confirm === true) dispatchGameAction(session, stage, "complete-ending");
      break;
    case "credits":
      if (command.confirm === true || command.back === true) {
        dispatchGameAction(session, stage, "return-title");
      }
      break;
    default:
      break;
  }
  return session;
}

export function getCampaignSummary(session) {
  requireSession(session);
  const completedStages = session.campaignRuns.filter(Boolean);
  return {
    completedStages: completedStages.length,
    score: completedStages.reduce((total, run) => total + run.score, 0),
    hitsTaken: completedStages.reduce((total, run) => total + run.hitsTaken, 0),
    breakdown: completedStages.reduce((total, run) => ({
      enemy: total.enemy + run.scoreBreakdown.enemy,
      core: total.core + run.scoreBreakdown.core,
      streak: total.streak + run.scoreBreakdown.streak,
      noHit: total.noHit + run.scoreBreakdown.noHit,
    }), { enemy: 0, core: 0, streak: 0, noHit: 0 }),
  };
}

export function getGameSessionSnapshot(session) {
  requireSession(session);
  if (session.simulation) return createStageSimulationSnapshot(session.simulation);
  if (session.lastRun) return session.lastRun;
  return {
    difficulty: session.difficulty,
    tick: 0,
    status: "waiting",
    flowEvent: null,
    player: { x: 0.18, y: 0.5, lives: 3, invulnerabilityTicks: 0, attackTicks: 0 },
    coreQueue: ["red"],
    weapon: { weaponLabel: "LANCE", level: 1 },
    score: 0,
    scoreBreakdown: { enemy: 0, core: 0, streak: 0, noHit: 0 },
    hitsTaken: 0,
    boss: null,
    actors: [
      {
        id: "player", assetId: "player-interceptor", x: 0.18, y: 0.5,
        width: 0.12, height: 0.15, tone: "player",
        animation: { state: "move", progress: 0, variant: "player-interceptor" },
      },
    ],
    projectiles: [],
    effects: [],
    transition: session.flow.screen === "stageIntro" ? { kind: "intro", progress: 0 } : null,
  };
}
