export const CORE_TYPES = Object.freeze(["red", "blue", "yellow"]);
export const CORE_INFO = Object.freeze({
  red: Object.freeze({ colorLabel: "赤", shape: "diamond", glyph: "I", weapon: "ランス" }),
  blue: Object.freeze({ colorLabel: "青", shape: "circle", glyph: "+", weapon: "スプレッド" }),
  yellow: Object.freeze({ colorLabel: "黄", shape: "triangle", glyph: "◎", weapon: "シーカー" }),
});
export const COMPARISON_TARGET = 3;
export const COMPARISON_PROTOCOL = 2;
const GAMEPLAY_KEYS = Object.freeze([
  "arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s",
]);
export const COMPARISON_ORDER = Object.freeze([
  "queue", "armory", "chain",
  "armory", "chain", "queue",
  "chain", "queue", "armory",
]);

export const MODE_INFO = Object.freeze({
  queue: {
    label: "FIFO三連装",
    summary: "最古の色が主武器。同色数がLv。4個目で最古を押し出す。",
  },
  armory: {
    label: "独立兵装庫",
    summary: "色ごとのLvを保存。取った色へ即時切替。成長は失わない。",
  },
  chain: {
    label: "連鎖過給",
    summary: "最後の色が主武器。同色連続でLv上昇、異色でLv1へ戻る。",
  },
});

export const SUPPORT_INFO = Object.freeze({
  red: { label: "赤 / 貫通", summary: "弾が追加で1体を貫く" },
  blue: { label: "青 / 防御", summary: "被弾後の無敵時間を延ばす" },
  yellow: { label: "黄 / 回収", summary: "コアの回収範囲を広げる" },
});

export function createPowerState(mode = "queue") {
  if (!MODE_INFO[mode]) throw new Error(`Unknown mode: ${mode}`);
  return {
    mode,
    queue: [],
    levels: { red: 0, blue: 0, yellow: 0 },
    active: null,
    chain: { color: null, count: 0 },
    collections: 0,
    switches: 0,
    tradeoffs: 0,
    maxLevel: 0,
  };
}

function assertCore(type) {
  if (!CORE_TYPES.includes(type)) throw new Error(`Unknown core: ${type}`);
}

export function getBuild(state) {
  if (state.mode === "queue") {
    const weapon = state.queue[0] ?? null;
    const level = weapon
      ? Math.min(3, state.queue.filter((core) => core === weapon).length)
      : 0;
    const supports = CORE_TYPES.filter(
      (core) => core !== weapon && state.queue.includes(core),
    );
    return { weapon, level, supports, slots: [...state.queue] };
  }

  if (state.mode === "armory") {
    return {
      weapon: state.active,
      level: state.active ? state.levels[state.active] : 0,
      supports: [],
      slots: CORE_TYPES.map((core) => ({ core, level: state.levels[core] })),
    };
  }

  return {
    weapon: state.chain.color,
    level: state.chain.count,
    supports: [],
    slots: state.chain.color
      ? Array.from({ length: state.chain.count }, () => state.chain.color)
      : [],
  };
}

export function collectCore(state, type) {
  assertCore(type);
  const before = getBuild(state);

  if (state.mode === "queue") {
    const wasFull = state.queue.length === 3;
    const ejected = wasFull ? state.queue[0] : null;
    state.queue.push(type);
    if (state.queue.length > 3) state.queue.shift();
    if (wasFull && (ejected !== type || before.weapon !== state.queue[0])) {
      state.tradeoffs += 1;
    }
  } else if (state.mode === "armory") {
    state.levels[type] = Math.min(3, state.levels[type] + 1);
    state.active = type;
  } else {
    if (state.chain.color === type) {
      state.chain.count = Math.min(3, state.chain.count + 1);
    } else {
      if (state.chain.color !== null) state.tradeoffs += 1;
      state.chain.color = type;
      state.chain.count = 1;
    }
  }

  const after = getBuild(state);
  state.collections += 1;
  if (before.weapon && after.weapon !== before.weapon) state.switches += 1;
  state.maxLevel = Math.max(state.maxLevel, after.level);
  return after;
}

export function previewCollection(state, type) {
  const clone = structuredClone(state);
  return collectCore(clone, type);
}

export function getSupportEffects(state) {
  const supports = getBuild(state).supports;
  return {
    pierceBonus: supports.includes("red") ? 1 : 0,
    invulnerabilitySeconds: supports.includes("blue") ? 1.6 : 0.8,
    collectionRadiusBonus: supports.includes("yellow") ? 64 : 0,
  };
}

export function createWeaponProjectiles(build, origin, supportEffects = {
  pierceBonus: 0,
  invulnerabilitySeconds: 0.8,
  collectionRadiusBonus: 0,
}) {
  if (!build.weapon) return [];
  assertCore(build.weapon);
  const level = Math.max(1, Math.min(3, build.level));
  const createShot = (shot, basePierce = 0) => ({
    ...shot,
    pierce: basePierce + supportEffects.pierceBonus,
    supportPiercing: supportEffects.pierceBonus > 0,
    hitIds: new Set(),
  });

  if (build.weapon === "red") {
    return [createShot(
      { x: origin.x + 18, y: origin.y, vx: 620, vy: 0, damage: level, radius: 4 + level },
      level - 1,
    )];
  }

  if (build.weapon === "blue") {
    const count = 1 + level * 2;
    return Array.from({ length: count }, (_, index) => {
      const angle = (index - (count - 1) / 2) * .11;
      return createShot({ x: origin.x + 15, y: origin.y, vx: 500, vy: 500 * angle, damage: 1, radius: 4 });
    });
  }

  return Array.from({ length: level }, (_, index) => createShot({
    x: origin.x + 12,
    y: origin.y + (index - (level - 1) / 2) * 9,
    vx: 430,
    vy: 0,
    damage: 1,
    radius: 5,
    seeking: true,
  }));
}

function assertSpawnInput(index, elapsed) {
  if (!Number.isInteger(index) || index < 0 || !Number.isFinite(elapsed) || elapsed < 0) {
    throw new Error("Invalid spawn input");
  }
}

export function createEnemySpawn(index, elapsed) {
  assertSpawnInput(index, elapsed);
  return {
    id: index,
    x: 990,
    y: 70 + (index % 5) * 100 + Math.sin((index + 1) * 2.1) * 20,
    radius: 18,
    hp: 2 + Math.floor(elapsed / 15),
    phase: (index + 1) * .7,
    lastFireTick: null,
  };
}

export function createPickupSpawn(index, elapsed) {
  assertSpawnInput(index, elapsed);
  return {
    id: index,
    type: CORE_TYPES[index % CORE_TYPES.length],
    x: 990,
    y: 70 + ((index * 2 + Math.floor(elapsed / 9)) % 5) * 100,
    radius: 17,
  };
}

export function enemyFireTick(enemyId, elapsed, lastFireTick = null) {
  const tick = Math.floor(elapsed * 2);
  if ((enemyId + tick) % 37 !== 0 || tick === lastFireTick) return null;
  return tick;
}

export function sessionStepSeconds(elapsed, requestedStep, sessionSeconds, suspended = false) {
  if (![elapsed, requestedStep, sessionSeconds].every(Number.isFinite)
    || elapsed < 0 || requestedStep < 0 || sessionSeconds <= 0
    || typeof suspended !== "boolean") {
    throw new Error("Invalid session timing");
  }
  if (suspended) return 0;
  return Math.min(requestedStep, Math.max(0, sessionSeconds - elapsed));
}

export function normalizeGameplayKey(key) {
  if (typeof key !== "string") return null;
  const normalized = key.toLowerCase();
  return GAMEPLAY_KEYS.includes(normalized) ? normalized : null;
}

export function createInteractionState() {
  return {
    keys: new Set(),
    pointerId: null,
    pointerTarget: null,
    inputMethods: new Set(),
  };
}

export function clearInteractionState(state) {
  state.keys.clear();
  state.pointerId = null;
  state.pointerTarget = null;
}

export function weaponLabel(type) {
  const info = CORE_INFO[type];
  return info ? `${info.colorLabel}・${info.weapon}` : "未装填";
}

function normalizeSessionEnvironment(environment) {
  if (environment === undefined || environment === null) return null;
  const { viewportWidth, viewportHeight, inputMethods } = environment;
  if (!Number.isInteger(viewportWidth) || viewportWidth <= 0
    || !Number.isInteger(viewportHeight) || viewportHeight <= 0
    || !Array.isArray(inputMethods)) {
    throw new Error("Invalid session environment");
  }
  const allowedMethods = ["keyboard", "mouse", "touch", "pen", "pointer"];
  const normalizedMethods = [...new Set(inputMethods)].sort();
  if (normalizedMethods.some((method) => !allowedMethods.includes(method))) {
    throw new Error("Invalid session environment");
  }
  return { viewportWidth, viewportHeight, inputMethods: normalizedMethods };
}

export function createSessionRecord({
  mode,
  metrics,
  reflection,
  environment,
  included = true,
  legacyExcluded = false,
  classificationReviewed = true,
  completedAt = new Date().toISOString(),
}) {
  if (!MODE_INFO[mode]) throw new Error(`Unknown mode: ${mode}`);
  if (typeof included !== "boolean") throw new Error("Invalid comparison inclusion");
  if (typeof legacyExcluded !== "boolean" || (legacyExcluded && included)) {
    throw new Error("Invalid legacy comparison state");
  }
  if (typeof classificationReviewed !== "boolean"
    || (!classificationReviewed && (!legacyExcluded || included))) {
    throw new Error("Invalid comparison classification");
  }
  if (typeof completedAt !== "string" || !Number.isFinite(Date.parse(completedAt))) {
    throw new Error("Invalid completion date");
  }
  const requiredMetrics = ["collections", "switches", "tradeoffs", "kills", "hits", "level3"];
  for (const key of requiredMetrics) {
    if (!Number.isFinite(metrics[key]) || metrics[key] < 0) throw new Error(`Invalid metric: ${key}`);
  }
  const ratings = ["prediction", "choice", "retry"];
  for (const key of ratings) {
    if (!Number.isInteger(reflection[key]) || reflection[key] < 1 || reflection[key] > 5) {
      throw new Error(`Invalid rating: ${key}`);
    }
  }
  return {
    version: 1,
    protocol: COMPARISON_PROTOCOL,
    included,
    legacyExcluded,
    classificationReviewed,
    mode,
    completedAt,
    metrics: Object.fromEntries(requiredMetrics.map((key) => [key, metrics[key]])),
    reflection: {
      prediction: reflection.prediction,
      choice: reflection.choice,
      retry: reflection.retry,
      note: String(reflection.note ?? "").trim().slice(0, 500),
    },
    environment: normalizeSessionEnvironment(environment),
  };
}

export function restoreSessionRecords(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((record) => {
    try {
      if (record?.version !== 1 || record?.protocol !== COMPARISON_PROTOCOL) return [];
      const classificationReviewed = record.classificationReviewed === true;
      return [createSessionRecord({
        ...record,
        included: classificationReviewed ? record.included : false,
        legacyExcluded: !classificationReviewed,
        classificationReviewed,
      })];
    } catch {
      return [];
    }
  });
}

export function parseComparisonExport(source) {
  let payload;
  try {
    payload = typeof source === "string" ? JSON.parse(source) : source;
  } catch {
    throw new Error("Invalid comparison export");
  }
  if (!payload || typeof payload !== "object"
    || payload.protocol !== COMPARISON_PROTOCOL
    || !Array.isArray(payload.records)) {
    throw new Error("Invalid comparison export");
  }
  const records = restoreSessionRecords(payload.records);
  if (records.length !== payload.records.length) {
    throw new Error("Invalid comparison records");
  }
  return records;
}

export function mergeSessionRecords(current, imported, target = COMPARISON_TARGET) {
  if (!Array.isArray(current) || !Array.isArray(imported)
    || !Number.isInteger(target) || target <= 0) {
    throw new Error("Invalid merge input");
  }
  const records = [...current];
  const seen = new Set(records.map((record) => JSON.stringify(record)));
  const counts = Object.fromEntries(Object.keys(MODE_INFO).map((mode) => [
    mode,
    records.filter((record) => record?.mode === mode && record.included !== false).length,
  ]));
  let added = 0;
  let duplicates = 0;
  let excess = 0;

  for (const record of imported) {
    const key = JSON.stringify(record);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    if (!MODE_INFO[record?.mode] || (record.included !== false && counts[record.mode] >= target)) {
      excess += 1;
      continue;
    }
    records.push(record);
    seen.add(key);
    if (record.included !== false) counts[record.mode] += 1;
    added += 1;
  }

  return { records, added, duplicates, excess };
}

export function persistSessionRecords(storage, key, records) {
  if (typeof key !== "string" || key.length === 0 || !Array.isArray(records)) {
    throw new Error("Invalid persistence input");
  }
  try {
    const serialized = JSON.stringify(records);
    storage.setItem(key, serialized);
    return storage.getItem(key) === serialized;
  } catch {
    return false;
  }
}

export function acquireSessionStorage(readStorage) {
  if (typeof readStorage !== "function") throw new Error("Invalid storage reader");
  try {
    const storage = readStorage();
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new Error("Invalid storage");
    }
    return storage;
  } catch {
    return Object.freeze({
      getItem() { throw new Error("Storage unavailable"); },
      setItem() { throw new Error("Storage unavailable"); },
    });
  }
}

export function initializeSessionRecords(storage, key) {
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("Invalid persistence input");
  }
  let records = [];
  try {
    records = restoreSessionRecords(JSON.parse(storage.getItem(key) ?? "[]"));
  } catch {
    records = [];
  }
  return {
    records,
    persisted: persistSessionRecords(storage, key, records),
  };
}

export function removeLastSessionRecord(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  return records.slice(0, -1);
}

export function removeSessionRecord(records, index) {
  if (!Array.isArray(records)) return [];
  if (!Number.isInteger(index) || index < 0 || index >= records.length) return [...records];
  return records.filter((_, recordIndex) => recordIndex !== index);
}

export function setSessionRecordInclusion(records, index, included) {
  if (!Array.isArray(records)) return [];
  if (!Number.isInteger(index) || index < 0 || index >= records.length
    || typeof included !== "boolean") return [...records];
  return records.map((record, recordIndex) => recordIndex === index
    ? { ...record, included, legacyExcluded: false, classificationReviewed: true }
    : record);
}

export function comparisonProgress(records, target = COMPARISON_TARGET) {
  return Object.fromEntries(Object.keys(MODE_INFO).map((mode) => {
    const count = records.filter((record) => record?.mode === mode && record.included !== false).length;
    return [mode, { count, remaining: Math.max(0, target - count), complete: count >= target }];
  }));
}

export function canStartMode(records, mode, target = COMPARISON_TARGET) {
  if (!MODE_INFO[mode]) throw new Error(`Unknown mode: ${mode}`);
  return !comparisonProgress(records, target)[mode].complete;
}

export function startButtonLabel(records, mode, target = COMPARISON_TARGET) {
  return canStartMode(records, mode, target)
    ? "45秒テストを開始"
    : "この方式は3/3完了";
}

export function canEditComparisonRecords(running, hasPendingSession) {
  if (typeof running !== "boolean" || typeof hasPendingSession !== "boolean") {
    throw new Error("Invalid comparison state");
  }
  return !running && !hasPendingSession;
}

export function canDiscardPendingSession(running, hasPendingSession) {
  if (typeof running !== "boolean" || typeof hasPendingSession !== "boolean") {
    throw new Error("Invalid comparison state");
  }
  return !running && hasPendingSession;
}

export function shouldWarnBeforeUnload(running, hasPendingSession) {
  if (typeof running !== "boolean" || typeof hasPendingSession !== "boolean") {
    throw new Error("Invalid comparison state");
  }
  return running || hasPendingSession;
}

export function recommendedMode(records) {
  const recordedCounts = Object.fromEntries(
    Object.keys(MODE_INFO).map((mode) => [
      mode,
      records.filter((record) => record?.mode === mode && record.included !== false).length,
    ]),
  );

  for (const mode of COMPARISON_ORDER) {
    if (recordedCounts[mode] > 0) {
      recordedCounts[mode] -= 1;
    } else {
      return mode;
    }
  }

  return null;
}

function mean(records, read) {
  if (records.length === 0) return null;
  return Number((records.reduce((total, record) => total + read(record), 0) / records.length).toFixed(2));
}

export function summarizeComparison(records) {
  const progress = comparisonProgress(records);
  const byMode = Object.fromEntries(Object.keys(MODE_INFO).map((mode) => {
    const modeRecords = records.filter((record) => record.mode === mode && record.included !== false);
    return [mode, {
      count: modeRecords.length,
      metrics: Object.fromEntries(
        ["collections", "switches", "tradeoffs", "kills", "hits", "level3"]
          .map((key) => [key, mean(modeRecords, (record) => record.metrics[key])]),
      ),
      reflection: Object.fromEntries(
        ["prediction", "choice", "retry"]
          .map((key) => [key, mean(modeRecords, (record) => record.reflection[key])]),
      ),
    }];
  }));
  return {
    complete: Object.values(progress).every((state) => state.complete),
    progress,
    byMode,
  };
}
