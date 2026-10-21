export const STAGE_ASPECT_RATIO = 16 / 9;

export const FLIGHT_CORRIDOR = Object.freeze({ top: 0.24, bottom: 0.78 });

export const PARALLAX_LAYERS = Object.freeze([
  { id: "far", speed: 0.08, asset: "orbital-wreck-far-v1.png" },
  { id: "mid", speed: 0.22, asset: "orbital-wreck-mid-v1.png" },
  { id: "fore", speed: 0.46, asset: "orbital-wreck-fore-v1.png" },
]);

export const ACTORS = Object.freeze([
  { id: "player", x: 0.23, y: 0.52, width: 0.27, height: 0.27 },
  { id: "enemy", x: 0.80, y: 0.46, width: 0.17, height: 0.25 },
  { id: "core-red", x: 0.49, y: 0.42, width: 0.055, height: 0.098 },
  { id: "core-blue", x: 0.58, y: 0.55, width: 0.055, height: 0.098 },
  { id: "core-yellow", x: 0.67, y: 0.38, width: 0.055, height: 0.098 },
]);

export const REACTOR_QUEUE = Object.freeze([
  { id: "red", symbol: "I", label: "LANCE", order: 1 },
  { id: "blue", symbol: "+", label: "SPREAD", order: 2 },
  { id: "yellow", symbol: "◎", label: "SEEKER", order: 3, ejectedNext: true },
]);

export const HUD_REGIONS = Object.freeze([
  { id: "reactor-queue", left: 0.015, top: 0.79, width: 0.365, height: 0.19 },
  { id: "loadout-preview", left: 0.735, top: 0.79, width: 0.25, height: 0.19 },
]);

export const HUD_MAX_OCCLUSION = 0.12;
export const MIN_TEXT_SIZE_PX = 12;
export const MIN_TOUCH_TARGET_PX = 44;

export const VISUAL_CUES = Object.freeze([
  { id: "core-red", silhouette: "diamond", interior: "bar-i", motion: "drift" },
  { id: "core-blue", silhouette: "circle", interior: "cross-plus", motion: "drift" },
  { id: "core-yellow", silhouette: "triangle", interior: "double-ring", motion: "drift" },
  { id: "friendly-projectile", silhouette: "arrow-right", interior: "solid", motion: "right" },
  { id: "enemy-projectile", silhouette: "closed-ring", interior: "solid-disc", motion: "left" },
  { id: "enemy", silhouette: "radial-round", interior: "single-eye", motion: "left" },
  { id: "background", silhouette: "open-corridor", interior: "low-edge-texture", motion: "parallax" },
]);

export const MOTION_LIMITS = Object.freeze({
  maxFlashesPerSecond: 3,
  maxCameraShakeX: 0.015,
  maxCameraShakeY: 0.01,
  maxCameraShakeDurationMs: 350,
  reducedMotionCameraShakeX: 0,
  reducedMotionCameraShakeY: 0,
});

export const VFX_EVENTS = Object.freeze([
  { id: "hit", x: 0.71, y: 0.46, cue: "burst-cross", durationMs: 900, luminancePulses: 1 },
  { id: "damage", x: 0.35, y: 0.57, cue: "broken-ring", durationMs: 1600, luminancePulses: 0 },
  { id: "collect", x: 0.58, y: 0.55, cue: "inward-chevrons", durationMs: 1100, luminancePulses: 1 },
]);

export function totalArea(regions) {
  return regions.reduce((sum, region) => sum + region.width * region.height, 0);
}

export function queueAfterPickup(queue, pickedId) {
  if (!Array.isArray(queue) || queue.length !== 3) {
    throw new TypeError("queue must contain exactly three reactor cores");
  }

  return [...queue.slice(1), pickedId];
}

export function actorBounds(actor) {
  return {
    left: actor.x - actor.width / 2,
    right: actor.x + actor.width / 2,
    top: actor.y - actor.height / 2,
    bottom: actor.y + actor.height / 2,
  };
}

export function isInsideStage(actor) {
  const bounds = actorBounds(actor);
  return bounds.left >= 0 && bounds.right <= 1 && bounds.top >= 0 && bounds.bottom <= 1;
}

export function isInsideFlightCorridor(actor) {
  const bounds = actorBounds(actor);
  return bounds.top >= FLIGHT_CORRIDOR.top && bounds.bottom <= FLIGHT_CORRIDOR.bottom;
}
