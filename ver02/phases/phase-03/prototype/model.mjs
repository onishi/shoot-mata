export const CORE_TYPES = Object.freeze(["red", "blue", "yellow"]);
export const COMPARISON_TARGET = 3;

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

export function weaponLabel(type) {
  return {
    red: "赤・ランス",
    blue: "青・スプレッド",
    yellow: "黄・シーカー",
  }[type] ?? "未装填";
}

export function createSessionRecord({ mode, metrics, reflection, completedAt = new Date().toISOString() }) {
  if (!MODE_INFO[mode]) throw new Error(`Unknown mode: ${mode}`);
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

export function comparisonProgress(records, target = COMPARISON_TARGET) {
  return Object.fromEntries(Object.keys(MODE_INFO).map((mode) => {
    const count = records.filter((record) => record?.mode === mode).length;
    return [mode, { count, remaining: Math.max(0, target - count), complete: count >= target }];
  }));
}
