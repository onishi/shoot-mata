import { CAMPAIGN_STAGE_COUNT } from "./flow-machine.mjs";

export const SAVE_SCHEMA_VERSION = 1;
export const DIFFICULTIES = Object.freeze(["standard", "assist"]);

const SCORE_PARTS = Object.freeze(["enemies", "cores", "streak", "noDamage"]);
const SETTINGS_KEYS = Object.freeze([
  "difficulty",
  "bgmVolume",
  "sfxVolume",
  "bgmMuted",
  "sfxMuted",
  "reducedMotion",
  "reducedFlashes",
  "highContrast",
]);

function createEmptyResult() {
  return {
    score: 0,
    breakdown: { enemies: 0, cores: 0, streak: 0, noDamage: 0 },
    coreQueue: [],
  };
}

function createStageRecord() {
  return {
    cleared: { standard: false, assist: false },
    best: { standard: createEmptyResult(), assist: createEmptyResult() },
  };
}

export function createDefaultSaveData() {
  return {
    version: SAVE_SCHEMA_VERSION,
    progress: {
      tutorialSeen: false,
      maxUnlockedStage: 0,
      stages: Array.from({ length: CAMPAIGN_STAGE_COUNT }, createStageRecord),
    },
    settings: {
      difficulty: "standard",
      bgmVolume: 0.8,
      sfxVolume: 0.8,
      bgmMuted: false,
      sfxMuted: false,
      reducedMotion: false,
      reducedFlashes: false,
      highContrast: false,
    },
  };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isScore(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isVolume(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isDifficultyMap(value, predicate) {
  return hasExactKeys(value, DIFFICULTIES) && DIFFICULTIES.every((difficulty) => predicate(value[difficulty]));
}

function isResult(value) {
  return hasExactKeys(value, ["score", "breakdown", "coreQueue"])
    && isScore(value.score)
    && hasExactKeys(value.breakdown, SCORE_PARTS)
    && SCORE_PARTS.every((part) => isScore(value.breakdown[part]))
    && Array.isArray(value.coreQueue)
    && value.coreQueue.length <= 3
    && value.coreQueue.every((core) => ["red", "blue", "yellow"].includes(core));
}

function isStageRecord(value) {
  return hasExactKeys(value, ["cleared", "best"])
    && isDifficultyMap(value.cleared, (cleared) => typeof cleared === "boolean")
    && isDifficultyMap(value.best, isResult);
}

export function validateSaveData(value) {
  if (!hasExactKeys(value, ["version", "progress", "settings"])) return false;
  if (value.version !== SAVE_SCHEMA_VERSION) return false;
  if (!hasExactKeys(value.progress, ["tutorialSeen", "maxUnlockedStage", "stages"])) return false;
  if (typeof value.progress.tutorialSeen !== "boolean") return false;
  if (!Number.isInteger(value.progress.maxUnlockedStage)
    || value.progress.maxUnlockedStage < 0
    || value.progress.maxUnlockedStage >= CAMPAIGN_STAGE_COUNT) return false;
  if (!Array.isArray(value.progress.stages)
    || value.progress.stages.length !== CAMPAIGN_STAGE_COUNT
    || !value.progress.stages.every(isStageRecord)) return false;
  if (!hasExactKeys(value.settings, SETTINGS_KEYS)) return false;
  if (!DIFFICULTIES.includes(value.settings.difficulty)) return false;
  if (!isVolume(value.settings.bgmVolume) || !isVolume(value.settings.sfxVolume)) return false;
  return ["bgmMuted", "sfxMuted", "reducedMotion", "reducedFlashes", "highContrast"]
    .every((key) => typeof value.settings[key] === "boolean");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateVersionZero(value) {
  if (!hasExactKeys(value, ["version", "tutorialSeen", "unlockedStage", "settings"])) {
    throw new TypeError("version 0 save has an invalid shape");
  }
  if (value.version !== 0
    || typeof value.tutorialSeen !== "boolean"
    || !Number.isInteger(value.unlockedStage)
    || value.unlockedStage < 0
    || value.unlockedStage >= CAMPAIGN_STAGE_COUNT
    || !isPlainObject(value.settings)) {
    throw new TypeError("version 0 save has invalid values");
  }

  const migrated = createDefaultSaveData();
  migrated.progress.tutorialSeen = value.tutorialSeen;
  migrated.progress.maxUnlockedStage = value.unlockedStage;
  for (const key of SETTINGS_KEYS) {
    if (Object.hasOwn(value.settings, key)) migrated.settings[key] = value.settings[key];
  }
  if (!validateSaveData(migrated)) throw new TypeError("version 0 migration produced invalid data");
  return migrated;
}

export function decodeSaveData(serialized) {
  if (typeof serialized !== "string") throw new TypeError("serialized save must be a string");

  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!isPlainObject(parsed) || !Number.isInteger(parsed.version)) {
    return { ok: false, reason: "invalid-schema" };
  }
  if (parsed.version > SAVE_SCHEMA_VERSION) return { ok: false, reason: "future-version" };
  if (parsed.version < 0) return { ok: false, reason: "unsupported-version" };

  try {
    const data = parsed.version === 0 ? migrateVersionZero(parsed) : parsed;
    if (!validateSaveData(data)) return { ok: false, reason: "invalid-schema" };
    return { ok: true, data: clone(data), migrated: parsed.version !== SAVE_SCHEMA_VERSION };
  } catch {
    return { ok: false, reason: "migration-failed" };
  }
}

export function encodeSaveData(data) {
  if (!validateSaveData(data)) throw new TypeError("invalid save data");
  return JSON.stringify(data);
}

export function updateSettings(data, patch) {
  if (!validateSaveData(data)) throw new TypeError("invalid save data");
  if (!isPlainObject(patch) || Object.keys(patch).some((key) => !SETTINGS_KEYS.includes(key))) {
    throw new TypeError("invalid settings patch");
  }
  const updated = clone(data);
  Object.assign(updated.settings, patch);
  if (!validateSaveData(updated)) throw new TypeError("invalid settings values");
  return updated;
}

export function markTutorialSeen(data) {
  if (!validateSaveData(data)) throw new TypeError("invalid save data");
  const updated = clone(data);
  updated.progress.tutorialSeen = true;
  return updated;
}

export function recordStageClear(data, result) {
  if (!validateSaveData(data)) throw new TypeError("invalid save data");
  if (!isPlainObject(result)) throw new TypeError("stage result is required");
  const { stageIndex, difficulty, score, breakdown, coreQueue } = result;
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= CAMPAIGN_STAGE_COUNT) {
    throw new RangeError("invalid stage index");
  }
  if (!DIFFICULTIES.includes(difficulty)) throw new TypeError("invalid difficulty");
  const savedResult = { score, breakdown, coreQueue };
  if (!isResult(savedResult)) throw new TypeError("invalid stage result");

  const updated = clone(data);
  const stage = updated.progress.stages[stageIndex];
  stage.cleared[difficulty] = true;
  if (score > stage.best[difficulty].score) stage.best[difficulty] = clone(savedResult);
  updated.progress.maxUnlockedStage = Math.max(
    updated.progress.maxUnlockedStage,
    Math.min(stageIndex + 1, CAMPAIGN_STAGE_COUNT - 1),
  );
  return updated;
}
