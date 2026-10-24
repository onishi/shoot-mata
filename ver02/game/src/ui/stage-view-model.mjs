import { parseStageDefinition } from "../content/stage-schema.mjs";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

const CORE_PRESENTATION = Object.freeze({
  red: Object.freeze({ assetId: "core-red", symbol: "I", label: "LANCE", color: "#ff6871" }),
  blue: Object.freeze({ assetId: "core-blue", symbol: "+", label: "SPREAD", color: "#5cddff" }),
  yellow: Object.freeze({ assetId: "core-yellow", symbol: "◎", label: "SEEKER", color: "#ffe06a" }),
});

const PLAYER_WEAPONS = Object.freeze(["red", "blue", "yellow"]);

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}

function integer(value, name, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new TypeError(`${name} must be an integer of at least ${min}`);
  }
  return value;
}

function normalized(value, name) {
  finite(value, name);
  if (value < 0 || value > 1) throw new RangeError(`${name} must be from 0 to 1`);
  return value;
}

function actor(input, index) {
  if (!input || typeof input !== "object") throw new TypeError(`actors[${index}] is required`);
  if (typeof input.assetId !== "string" || input.assetId === "") {
    throw new TypeError(`actors[${index}].assetId is required`);
  }
  let reactor = null;
  let animation = null;
  if (input.animation !== undefined) {
    if (!input.animation || typeof input.animation !== "object") {
      throw new TypeError(`actors[${index}].animation is invalid`);
    }
    const states = ["move", "enter", "attack", "hit", "phase"];
    if (!states.includes(input.animation.state)) {
      throw new TypeError(`actors[${index}].animation.state is invalid`);
    }
    animation = Object.freeze({
      state: input.animation.state,
      progress: normalized(input.animation.progress, `actors[${index}].animation.progress`),
      variant: typeof input.animation.variant === "string" ? input.animation.variant : "default",
    });
  }
  if (input.reactor !== undefined) {
    if (input.tone !== "player" || !input.reactor || typeof input.reactor !== "object") {
      throw new TypeError(`actors[${index}].reactor requires a player actor`);
    }
    const primary = input.reactor.primary ?? null;
    if (primary !== null && !PLAYER_WEAPONS.includes(primary)) {
      throw new TypeError(`actors[${index}].reactor.primary is invalid`);
    }
    const level = integer(input.reactor.level, `actors[${index}].reactor.level`);
    if ((primary === null && level !== 0) || (primary !== null && (level < 1 || level > 3))) {
      throw new RangeError(`actors[${index}].reactor.level does not match its primary weapon`);
    }
    const supports = input.reactor.supports ?? [];
    if (!Array.isArray(supports)
      || supports.some((support) => !PLAYER_WEAPONS.includes(support) || support === primary)
      || new Set(supports).size !== supports.length) {
      throw new TypeError(`actors[${index}].reactor.supports is invalid`);
    }
    reactor = Object.freeze({
      primary,
      level,
      supports: Object.freeze([...supports]),
      invulnerable: input.reactor.invulnerable === true,
    });
  }
  return Object.freeze({
    id: input.id ?? `actor-${index}`,
    assetId: input.assetId,
    x: normalized(input.x, `actors[${index}].x`),
    y: normalized(input.y, `actors[${index}].y`),
    width: normalized(input.width, `actors[${index}].width`),
    height: normalized(input.height, `actors[${index}].height`),
    tone: input.tone ?? "neutral",
    reactor,
    animation,
  });
}

const PROJECTILE_KINDS = Object.freeze(["lance", "spread", "seeker"]);
const EFFECT_KINDS = Object.freeze(["hit", "damage", "destroy", "collect", "eject"]);
const HAZARD_PRESENTATION = Object.freeze({
  "closing-corridor": Object.freeze({ symbol: "↕", label: "圧縮通路" }),
  "alternating-current": Object.freeze({ symbol: "⇅", label: "上下気流" }),
  "shutter-cover": Object.freeze({ symbol: "▥", label: "開閉遮蔽" }),
  "charged-cloud": Object.freeze({ symbol: "⚡", label: "帯電域" }),
  "reactive-tissue": Object.freeze({ symbol: "◇", label: "反応組織" }),
  "growth-source": Object.freeze({ symbol: "+", label: "増殖源" }),
  "contracting-tissue": Object.freeze({ symbol: "↔", label: "収縮通路" }),
  "periodic-heatwave": Object.freeze({ symbol: "≋", label: "周期熱波" }),
  "coolant-refuge": Object.freeze({ symbol: "▽", label: "退避域" }),
  "destruction-safe-zone": Object.freeze({ symbol: "◎", label: "可変安全圏" }),
});

function projectile(input, index) {
  if (!input || typeof input !== "object") throw new TypeError(`projectiles[${index}] is required`);
  if (!PROJECTILE_KINDS.includes(input.kind)) throw new TypeError(`projectiles[${index}].kind is invalid`);
  return Object.freeze({
    id: input.id ?? `projectile-${index}`,
    x: normalized(input.x, `projectiles[${index}].x`),
    y: normalized(input.y, `projectiles[${index}].y`),
    kind: input.kind,
    level: integer(input.level, `projectiles[${index}].level`, 1),
    angle: finite(input.angle ?? 0, `projectiles[${index}].angle`),
  });
}

function effect(input, index) {
  if (!input || typeof input !== "object") throw new TypeError(`effects[${index}] is required`);
  if (!EFFECT_KINDS.includes(input.kind)) throw new TypeError(`effects[${index}].kind is invalid`);
  if (input.kind === "eject" && !PLAYER_WEAPONS.includes(input.core)) {
    throw new TypeError(`effects[${index}].core is invalid`);
  }
  const ageTicks = integer(input.ageTicks, `effects[${index}].ageTicks`);
  const lifetimeTicks = integer(input.lifetimeTicks, `effects[${index}].lifetimeTicks`, 1);
  if (ageTicks >= lifetimeTicks) throw new RangeError(`effects[${index}] has expired`);
  return Object.freeze({
    id: input.id ?? `effect-${index}`,
    kind: input.kind,
    x: normalized(input.x, `effects[${index}].x`),
    y: normalized(input.y, `effects[${index}].y`),
    progress: ageTicks / lifetimeTicks,
    ...(input.kind === "eject" ? { core: input.core } : {}),
  });
}

function hazardWarning(input, index) {
  if (!input || typeof input !== "object") throw new TypeError(`hazardWarnings[${index}] is required`);
  const presentation = HAZARD_PRESENTATION[input.behaviorId];
  if (!presentation) throw new TypeError(`hazardWarnings[${index}].behaviorId is invalid`);
  return Object.freeze({
    hazardId: input.hazardId,
    behaviorId: input.behaviorId,
    ticksUntilActive: integer(input.ticksUntilActive, `hazardWarnings[${index}].ticksUntilActive`, 1),
    ...presentation,
  });
}

function transition(input) {
  if (input === null || input === undefined) return null;
  if (!input || typeof input !== "object" || !["intro", "clear"].includes(input.kind)) {
    throw new TypeError("transition.kind is invalid");
  }
  return Object.freeze({
    kind: input.kind,
    progress: normalized(input.progress, "transition.progress"),
  });
}

function bossMeter(input) {
  if (input === null || input === undefined) return null;
  const current = integer(input.current, "boss.current");
  const maximum = integer(input.maximum, "boss.maximum", 1);
  if (current > maximum) throw new RangeError("boss.current cannot exceed boss.maximum");
  return Object.freeze({ current, maximum, ratio: current / maximum });
}

export function createStageViewModel(input) {
  if (!input || typeof input !== "object") throw new TypeError("view input is required");
  const stage = parseStageDefinition(input.stage);
  const tick = integer(input.tick ?? 0, "tick");
  if (tick > stage.durationTicks) throw new RangeError("tick exceeds stage duration");
  const reducedMotion = input.settings?.reducedMotion === true;
  const reducedFlashes = input.settings?.reducedFlashes === true;
  const highContrast = input.settings?.highContrast === true;
  const coreQueue = input.coreQueue ?? [];
  if (!Array.isArray(coreQueue) || coreQueue.length > 3 || coreQueue.some((id) => !CORE_PRESENTATION[id])) {
    throw new TypeError("coreQueue must contain at most three known cores");
  }
  const section = stage.sections.find(({ startTick, endTick }) => tick >= startTick && tick < endTick)
    ?? stage.sections.at(-1);
  const layers = stage.backgroundLayers.map((layer) => Object.freeze({
    id: layer.id,
    assetId: layer.assetId,
    offsetX: reducedMotion ? 0 : -((tick * layer.scrollFactor * 1.5) % GAME_WIDTH),
  }));
  const queue = coreQueue.map((id, index) => Object.freeze({
    id,
    ...CORE_PRESENTATION[id],
    order: index + 1,
    ejectedNext: index === 0 && coreQueue.length === 3,
  }));
  const weapon = input.weapon ?? { label: "LANCE", level: 1 };
  if (typeof weapon.label !== "string" || weapon.label === "") throw new TypeError("weapon.label is required");

  const hazardWarnings = Object.freeze((input.hazardWarnings ?? []).map(hazardWarning));
  return Object.freeze({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    stageId: stage.id,
    stageTitle: stage.title,
    sectionId: section.id,
    tick,
    progress: tick / stage.durationTicks,
    display: Object.freeze({ reducedMotion, reducedFlashes, highContrast }),
    layers: Object.freeze(layers),
    actors: Object.freeze((input.actors ?? []).map(actor)),
    projectiles: Object.freeze((input.projectiles ?? []).map(projectile)),
    effects: Object.freeze((input.effects ?? []).map(effect)),
    hazardWarnings,
    transition: transition(input.transition),
    hud: Object.freeze({
      score: integer(input.score ?? 0, "score"),
      lives: integer(input.lives ?? 3, "lives"),
      weapon: Object.freeze({ label: weapon.label, level: integer(weapon.level ?? 1, "weapon.level") }),
      coreQueue: Object.freeze(queue),
      boss: bossMeter(input.boss),
    }),
    accessibleSummary: `${stage.title}、${section.id}、スコア${input.score ?? 0}、残機${input.lives ?? 3}`
      + (hazardWarnings.length > 0
        ? `、危険予告 ${hazardWarnings.map(({ label }) => label).join("、")}` : ""),
  });
}
