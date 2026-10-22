import { parseStageDefinition } from "../content/stage-schema.mjs";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

const CORE_PRESENTATION = Object.freeze({
  red: Object.freeze({ assetId: "core-red", symbol: "I", label: "LANCE", color: "#ff6871" }),
  blue: Object.freeze({ assetId: "core-blue", symbol: "+", label: "SPREAD", color: "#5cddff" }),
  yellow: Object.freeze({ assetId: "core-yellow", symbol: "◎", label: "SEEKER", color: "#ffe06a" }),
});

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
  return Object.freeze({
    id: input.id ?? `actor-${index}`,
    assetId: input.assetId,
    x: normalized(input.x, `actors[${index}].x`),
    y: normalized(input.y, `actors[${index}].y`),
    width: normalized(input.width, `actors[${index}].width`),
    height: normalized(input.height, `actors[${index}].height`),
    tone: input.tone ?? "neutral",
  });
}

const PROJECTILE_KINDS = Object.freeze(["lance", "spread", "seeker"]);
const EFFECT_KINDS = Object.freeze(["hit", "damage", "destroy", "collect"]);

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
  const ageTicks = integer(input.ageTicks, `effects[${index}].ageTicks`);
  const lifetimeTicks = integer(input.lifetimeTicks, `effects[${index}].lifetimeTicks`, 1);
  if (ageTicks >= lifetimeTicks) throw new RangeError(`effects[${index}] has expired`);
  return Object.freeze({
    id: input.id ?? `effect-${index}`,
    kind: input.kind,
    x: normalized(input.x, `effects[${index}].x`),
    y: normalized(input.y, `effects[${index}].y`),
    progress: ageTicks / lifetimeTicks,
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

  return Object.freeze({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    stageId: stage.id,
    stageTitle: stage.title,
    sectionId: section.id,
    tick,
    progress: tick / stage.durationTicks,
    display: Object.freeze({ reducedMotion, highContrast }),
    layers: Object.freeze(layers),
    actors: Object.freeze((input.actors ?? []).map(actor)),
    projectiles: Object.freeze((input.projectiles ?? []).map(projectile)),
    effects: Object.freeze((input.effects ?? []).map(effect)),
    hud: Object.freeze({
      score: integer(input.score ?? 0, "score"),
      lives: integer(input.lives ?? 3, "lives"),
      weapon: Object.freeze({ label: weapon.label, level: integer(weapon.level ?? 1, "weapon.level") }),
      coreQueue: Object.freeze(queue),
      boss: bossMeter(input.boss),
    }),
    accessibleSummary: `${stage.title}、${section.id}、スコア${input.score ?? 0}、残機${input.lives ?? 3}`,
  });
}
