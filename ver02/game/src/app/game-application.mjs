import {
  createGameSession,
  dispatchGameAction,
  updateGameSession,
} from "../core/game-session.mjs";
import {
  markTutorialSeen,
  recordStageClear,
  updateSettings,
} from "../core/save-data.mjs";

function requirePort(port, methods, name) {
  if (!port || methods.some((method) => typeof port[method] !== "function")) {
    throw new TypeError(`${name} port is invalid`);
  }
}

function saveResultFromSession(session, difficulty) {
  const run = session.lastRun;
  return {
    stageIndex: session.flow.stageIndex,
    difficulty,
    score: run.score,
    breakdown: {
      enemies: run.scoreBreakdown.enemy,
      cores: run.scoreBreakdown.core,
      streak: run.scoreBreakdown.streak,
      noDamage: run.scoreBreakdown.noHit,
    },
    coreQueue: [...run.coreQueue],
  };
}

export function createGameApplication(options) {
  const stages = options?.stages ?? (options?.stage ? [options.stage] : null);
  if (!Array.isArray(stages) || stages.length === 0) throw new TypeError("at least one stage is required");
  requirePort(options.saveRepository, ["load", "save"], "save repository");
  requirePort(options.audio, ["activate", "getStatus", "setSettings", "playBgm", "playSfx", "stopBgm"], "audio");

  const repository = options.saveRepository;
  const audio = options.audio;
  const loaded = repository.load();
  let saveData = loaded.data;
  let saveWarning = loaded.warning;
  let activationPromise = null;
  let lastRecordedRun = null;
  const session = createGameSession({
    seed: options.seed,
    tutorialSeen: saveData.progress.tutorialSeen,
    maxUnlockedStage: Math.max(
      saveData.progress.maxUnlockedStage,
      options.minimumUnlockedStage ?? 0,
    ),
  });
  audio.setSettings(saveData.settings);

  function currentStage() {
    const stageIndex = session.flow.stageIndex ?? 0;
    const stage = stages[stageIndex];
    if (!stage) throw new RangeError(`stage ${stageIndex} is unavailable`);
    return stage;
  }

  function persist(nextData) {
    saveData = nextData;
    const result = repository.save(saveData);
    saveWarning = result.warning;
    return result;
  }

  function activateAudio() {
    // activate() creates AudioContext synchronously before returning its promise.
    activationPromise ??= Promise.resolve(audio.activate()).then((result) => result);
    return activationPromise;
  }

  function syncScreenAudio(previousScreen) {
    const nextScreen = session.flow.screen;
    if (previousScreen === nextScreen) return;
    const stage = currentStage();
    if (nextScreen === "playing") {
      audio.playBgm(stage.audio.stageLayerAssetIds);
      audio.playSfx(stage.audio.introAssetId);
    }
    if (["title", "result", "gameOver"].includes(nextScreen)) audio.stopBgm();
    if (nextScreen !== "playing") audio.playSfx("audio-ref-ui-confirm");
  }

  function recordCompletedRun(previousScreen) {
    if (previousScreen === "result" || session.flow.screen !== "result" || !session.lastRun) return;
    if (lastRecordedRun === session.lastRun) return;
    saveData = recordStageClear(
      saveData,
      saveResultFromSession(session, saveData.settings.difficulty),
    );
    persist(saveData);
    lastRecordedRun = session.lastRun;
  }

  return {
    session,

    activateAudio,

    dispatch(action) {
      const previousScreen = session.flow.screen;
      if (action === "start-campaign" || action.startsWith("start-stage-")) activateAudio();
      dispatchGameAction(session, currentStage(), action);
      if (action === "complete-tutorial" && !saveData.progress.tutorialSeen) {
        persist(markTutorialSeen(saveData));
      }
      syncScreenAudio(previousScreen);
      return session;
    },

    update(command = {}) {
      const previousScreen = session.flow.screen;
      if ((previousScreen === "title" && command.confirm === true)
        || (previousScreen === "stageSelect" && Number.isInteger(command.stageIndex))) {
        activateAudio();
      }
      updateGameSession(session, currentStage(), command);
      if (previousScreen === "tutorial" && session.flow.screen === "stageIntro"
        && !saveData.progress.tutorialSeen) {
        persist(markTutorialSeen(saveData));
      }
      recordCompletedRun(previousScreen);
      syncScreenAudio(previousScreen);
      if (previousScreen === "playing") {
        const stage = currentStage();
        for (const event of session.simulation?.events ?? []) {
          if (event.type === "boss-entered") audio.playBgm(stage.audio.bossLayerAssetIds);
          if (event.type === "stage-cleared") audio.playSfx(stage.audio.clearAssetId);
          if (event.soundAssetId) audio.playSfx(event.soundAssetId);
        }
      }
      return session;
    },

    updateSettings(patch) {
      const nextData = updateSettings(saveData, patch);
      persist(nextData);
      audio.setSettings(nextData.settings);
      return nextData.settings;
    },

    getSettings() {
      return { ...saveData.settings };
    },

    getStatus() {
      const audioStatus = audio.getStatus();
      return {
        saveWarning,
        audioWarning: audioStatus.warning,
        audioMode: audioStatus.mode,
      };
    },
  };
}
