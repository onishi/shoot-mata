export const SCREEN_STATES = Object.freeze([
  "title",
  "stageSelect",
  "settings",
  "tutorial",
  "stageIntro",
  "playing",
  "paused",
  "result",
  "gameOver",
  "ending",
  "credits",
]);

export const CAMPAIGN_STAGE_COUNT = 4;
export const INITIAL_CONTINUES = 2;

const CONFIRMATIONS = Object.freeze(["restart", "title"]);

function assertIntegerInRange(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer from ${min} to ${max}`);
  }
}

export function createFlowState(options = {}) {
  const maxUnlockedStage = options.maxUnlockedStage ?? 0;
  assertIntegerInRange(maxUnlockedStage, 0, CAMPAIGN_STAGE_COUNT - 1, "maxUnlockedStage");
  return {
    screen: "title",
    returnScreen: null,
    confirmation: null,
    mode: null,
    stageIndex: null,
    maxUnlockedStage,
    attempt: 0,
    continuesRemaining: INITIAL_CONTINUES,
    tutorialSeen: options.tutorialSeen === true,
    stageCleared: false,
  };
}

function assertFlowState(state) {
  if (!state || typeof state !== "object" || !SCREEN_STATES.includes(state.screen)) {
    throw new TypeError("invalid flow state");
  }
  if (state.confirmation !== null && !CONFIRMATIONS.includes(state.confirmation)) {
    throw new TypeError("invalid confirmation state");
  }
}

function nextState(state, patch) {
  return { ...state, ...patch };
}

function stageStart(state, patch = {}) {
  return nextState(state, {
    screen: "stageIntro",
    returnScreen: null,
    confirmation: null,
    stageCleared: false,
    attempt: state.attempt + 1,
    ...patch,
  });
}

function requireScreen(state, eventType, ...screens) {
  if (!screens.includes(state.screen)) {
    throw new Error(`${eventType} is not allowed from ${state.screen}`);
  }
}

function requestConfirmation(state, confirmation) {
  requireScreen(state, `REQUEST_${confirmation.toUpperCase()}`, "playing", "paused");
  if (state.confirmation !== null) throw new Error("a confirmation is already open");
  return nextState(state, { confirmation });
}

export function transitionFlow(state, event) {
  assertFlowState(state);
  if (!event || typeof event.type !== "string") throw new TypeError("event.type is required");

  if (state.confirmation !== null) {
    if (event.type === "CANCEL_CONFIRMATION") {
      return nextState(state, { confirmation: null });
    }
    if (event.type !== "CONFIRM") throw new Error("confirmation must be resolved first");
    if (state.confirmation === "restart") return stageStart(state);
    return createFlowState({
      tutorialSeen: state.tutorialSeen,
      maxUnlockedStage: state.maxUnlockedStage,
    });
  }

  switch (event.type) {
    case "START_CAMPAIGN":
      requireScreen(state, event.type, "title");
      return nextState(state, {
        screen: state.tutorialSeen ? "stageIntro" : "tutorial",
        mode: "campaign",
        stageIndex: 0,
        attempt: 1,
        continuesRemaining: INITIAL_CONTINUES,
        stageCleared: false,
      });
    case "OPEN_STAGE_SELECT":
      requireScreen(state, event.type, "title", "result");
      return nextState(state, { screen: "stageSelect", mode: null, stageIndex: null });
    case "START_STAGE": {
      requireScreen(state, event.type, "stageSelect");
      assertIntegerInRange(event.stageIndex, 0, state.maxUnlockedStage, "stageIndex");
      return stageStart(state, { mode: "single", stageIndex: event.stageIndex, attempt: 1 });
    }
    case "OPEN_SETTINGS":
      requireScreen(state, event.type, "title", "stageSelect", "paused");
      return nextState(state, { screen: "settings", returnScreen: state.screen });
    case "CLOSE_SETTINGS":
      requireScreen(state, event.type, "settings");
      if (!SCREEN_STATES.includes(state.returnScreen)) throw new Error("settings return screen is missing");
      return nextState(state, { screen: state.returnScreen, returnScreen: null });
    case "COMPLETE_TUTORIAL":
      requireScreen(state, event.type, "tutorial");
      return nextState(state, { screen: "stageIntro", tutorialSeen: true });
    case "BEGIN_STAGE":
      requireScreen(state, event.type, "stageIntro");
      return nextState(state, { screen: "playing" });
    case "PAUSE":
      requireScreen(state, event.type, "playing");
      return nextState(state, { screen: "paused" });
    case "RESUME":
      requireScreen(state, event.type, "paused");
      return nextState(state, { screen: "playing" });
    case "REQUEST_RESTART":
      return requestConfirmation(state, "restart");
    case "REQUEST_TITLE":
      return requestConfirmation(state, "title");
    case "PLAYER_DEFEATED":
      requireScreen(state, event.type, "playing");
      return nextState(state, { screen: "gameOver" });
    case "RETRY_STAGE":
      requireScreen(state, event.type, "gameOver", "result");
      return stageStart(state);
    case "CONTINUE_CAMPAIGN":
      requireScreen(state, event.type, "gameOver");
      if (state.mode !== "campaign") throw new Error("continue is campaign-only");
      if (state.continuesRemaining <= 0) throw new Error("no continues remaining");
      return stageStart(state, { continuesRemaining: state.continuesRemaining - 1 });
    case "STAGE_CLEAR": {
      requireScreen(state, event.type, "playing");
      const unlocked = Math.min(
        CAMPAIGN_STAGE_COUNT - 1,
        Math.max(state.maxUnlockedStage, state.stageIndex + 1),
      );
      return nextState(state, { screen: "result", stageCleared: true, maxUnlockedStage: unlocked });
    }
    case "ADVANCE":
      requireScreen(state, event.type, "result");
      if (!state.stageCleared) throw new Error("stage must be cleared before advancing");
      if (state.mode === "single") {
        return nextState(state, { screen: "stageSelect", mode: null, stageIndex: null });
      }
      if (state.stageIndex === CAMPAIGN_STAGE_COUNT - 1) {
        return nextState(state, { screen: "ending" });
      }
      return stageStart(state, { stageIndex: state.stageIndex + 1 });
    case "COMPLETE_ENDING":
      requireScreen(state, event.type, "ending");
      return nextState(state, { screen: "credits" });
    case "OPEN_CREDITS":
      requireScreen(state, event.type, "title");
      return nextState(state, { screen: "credits", returnScreen: "title" });
    case "RETURN_TITLE":
      requireScreen(state, event.type, "credits", "stageSelect");
      return createFlowState({
        tutorialSeen: state.tutorialSeen,
        maxUnlockedStage: state.maxUnlockedStage,
      });
    default:
      throw new Error(`unknown flow event: ${event.type}`);
  }
}
