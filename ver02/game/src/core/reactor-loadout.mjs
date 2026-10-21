export const CORE_TYPES = Object.freeze(["red", "blue", "yellow"]);

const WEAPON_LABELS = Object.freeze({
  red: "LANCE",
  blue: "SPREAD",
  yellow: "SEEKER",
});

function assertCore(core) {
  if (!CORE_TYPES.includes(core)) throw new TypeError(`unknown reactor core: ${core}`);
}

export function createReactorLoadout(initialQueue = ["red"]) {
  if (!Array.isArray(initialQueue) || initialQueue.length > 3) {
    throw new TypeError("initialQueue must contain at most three cores");
  }
  initialQueue.forEach(assertCore);
  return { queue: [...initialQueue] };
}

export function describeReactorLoadout(loadout) {
  if (!loadout || !Array.isArray(loadout.queue) || loadout.queue.length > 3) {
    throw new TypeError("invalid reactor loadout");
  }
  loadout.queue.forEach(assertCore);
  const weapon = loadout.queue[0] ?? null;
  const level = weapon === null
    ? 0
    : loadout.queue.filter((core) => core === weapon).length;
  return {
    weapon,
    weaponLabel: weapon === null ? "UNARMED" : WEAPON_LABELS[weapon],
    level,
    supports: CORE_TYPES.filter((core) => core !== weapon && loadout.queue.includes(core)),
    queue: [...loadout.queue],
    nextEjected: loadout.queue.length === 3 ? loadout.queue[0] : null,
  };
}

export function collectReactorCore(loadout, core) {
  assertCore(core);
  const ejected = loadout.queue.length === 3 ? loadout.queue.shift() : null;
  loadout.queue.push(core);
  return { ejected, build: describeReactorLoadout(loadout) };
}

export function loseReactorCore(loadout) {
  const lost = loadout.queue.shift() ?? null;
  return { lost, build: describeReactorLoadout(loadout) };
}

export function resetReactorLoadout(loadout, initialQueue = ["red"]) {
  const replacement = createReactorLoadout(initialQueue);
  loadout.queue.splice(0, loadout.queue.length, ...replacement.queue);
  return describeReactorLoadout(loadout);
}

export function getWeaponProfile(loadout) {
  const build = describeReactorLoadout(loadout);
  if (build.weapon === null) {
    return {
      ...build,
      damage: 0,
      cooldownTicks: Number.POSITIVE_INFINITY,
      projectileCount: 0,
      pierce: 0,
      invulnerabilityTicks: 42,
      collectionRadius: 0.09,
      projectileKind: null,
      soundAssetId: null,
    };
  }
  const supportPierce = build.supports.includes("red") ? 1 : 0;
  const invulnerabilityTicks = build.supports.includes("blue") ? 72 : 42;
  const collectionRadius = build.supports.includes("yellow") ? 0.16 : 0.09;
  const profiles = {
    red: {
      damage: 2 + build.level * 2,
      cooldownTicks: 8,
      projectileCount: 1,
      pierce: build.level - 1 + supportPierce,
      projectileKind: "lance",
      soundAssetId: "audio-ref-weapon-lance",
    },
    blue: {
      damage: 3,
      cooldownTicks: 10,
      projectileCount: 1 + build.level * 2,
      pierce: supportPierce,
      projectileKind: "spread",
      soundAssetId: "audio-ref-weapon-spread",
    },
    yellow: {
      damage: 3,
      cooldownTicks: 9,
      projectileCount: build.level,
      pierce: supportPierce,
      seeking: true,
      projectileKind: "seeker",
      soundAssetId: "audio-ref-weapon-seeker",
    },
  };
  return { ...build, ...profiles[build.weapon], invulnerabilityTicks, collectionRadius };
}
