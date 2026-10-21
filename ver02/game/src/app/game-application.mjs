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
  if (!options?.stage) throw new TypeError("stage is required");
  requirePort(options.saveRepository, ["load", "save"], "save repository");
  requirePort(options.audio, ["activate", "getStatus", "setSettings", "playBgm", "playSfx", "stopBgm"], "audio");

  const stage = options.stage;
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
    maxUnlockedStage: saveData.progress.maxUnlockedStage,
  });
  audio.setSettings(saveData.settings);

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
    if (nextScreen === "playing") audio.playBgm(stage.audio.stageLoopAssetId);
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
      if (action === "start-campaign") activateAudio();
      dispatchGameAction(session, stage, action);
      if (action === "complete-tutorial" && !saveData.progress.tutorialSeen) {
        persist(markTutorialSeen(saveData));
      }
      syncScreenAudio(previousScreen);
      return session;
    },

    update(command = {}) {
      const previousScreen = session.flow.screen;
      if (previousScreen === "title" && command.confirm === true) activateAudio();
      updateGameSession(session, stage, command);
      if (previousScreen === "tutorial" && session.flow.screen === "stageIntro"
        && !saveData.progress.tutorialSeen) {
        persist(markTutorialSeen(saveData));
      }
      recordCompletedRun(previousScreen);
      syncScreenAudio(previousScreen);
      if (previousScreen === "playing") {
        for (const event of session.simulation?.events ?? []) {
          if (event.type === "weapon-fired") audio.playSfx(event.soundAssetId);
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
