export const CORE_TYPES = Object.freeze(["red", "blue", "yellow"]);
export const CORE_INFO = Object.freeze({
  red: Object.freeze({ colorLabel: "赤", shape: "diamond", glyph: "I", weapon: "ランス" }),
  blue: Object.freeze({ colorLabel: "青", shape: "circle", glyph: "+", weapon: "スプレッド" }),
  yellow: Object.freeze({ colorLabel: "黄", shape: "triangle", glyph: "◎", weapon: "シーカー" }),
});
export const COMPARISON_TARGET = 3;
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

export function weaponLabel(type) {
  const info = CORE_INFO[type];
  return info ? `${info.colorLabel}・${info.weapon}` : "未装填";
}

export function createSessionRecord({ mode, metrics, reflection, completedAt = new Date().toISOString() }) {
  if (!MODE_INFO[mode]) throw new Error(`Unknown mode: ${mode}`);
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
    mode,
    completedAt,
    metrics: Object.fromEntries(requiredMetrics.map((key) => [key, metrics[key]])),
    reflection: {
      prediction: reflection.prediction,
      choice: reflection.choice,
      retry: reflection.retry,
      note: String(reflection.note ?? "").trim().slice(0, 500),
    },
  };
}

export function restoreSessionRecords(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((record) => {
    try {
      if (record?.version !== 1) return [];
      return [createSessionRecord(record)];
    } catch {
      return [];
    }
  });
}

export function comparisonProgress(records, target = COMPARISON_TARGET) {
  return Object.fromEntries(Object.keys(MODE_INFO).map((mode) => {
    const count = records.filter((record) => record?.mode === mode).length;
    return [mode, { count, remaining: Math.max(0, target - count), complete: count >= target }];
  }));
}

export function recommendedMode(records) {
  const recordedCounts = Object.fromEntries(
    Object.keys(MODE_INFO).map((mode) => [
      mode,
      records.filter((record) => record?.mode === mode).length,
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
    const modeRecords = records.filter((record) => record.mode === mode);
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
