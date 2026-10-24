import { GAME_ASSETS } from "../content/asset-manifest.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../content/stages/stage-04-stellar-furnace.mjs";
import { createStageViewModel } from "../ui/stage-view-model.mjs";
import { reactorIndicatorAlpha, renderCanvasFrame } from "./canvas-renderer.mjs";

const STAGES = Object.freeze([
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
]);

export const VISUAL_DISPLAY_PROFILES = Object.freeze([
  Object.freeze({ id: "normal", settings: Object.freeze({}) }),
  Object.freeze({ id: "high-contrast", settings: Object.freeze({ highContrast: true }) }),
  Object.freeze({ id: "reduced-motion", settings: Object.freeze({ reducedMotion: true }) }),
  Object.freeze({ id: "reduced-flashes", settings: Object.freeze({ reducedFlashes: true }) }),
]);

const WEAPON_CONFIGURATIONS = Object.freeze([
  Object.freeze({ id: "unarmed-lv0", primary: null, level: 0, supports: [] }),
  ...["red", "blue", "yellow"].flatMap((primary) => [1, 2, 3].map((level) => Object.freeze({
    id: `${primary}-lv${level}`,
    primary,
    level,
    supports: [],
  }))),
]);

const PROJECTILES = Object.freeze(["lance", "spread", "seeker"].flatMap((kind, kindIndex) => (
  [1, 2, 3].map((level) => Object.freeze({
    id: `${kind}-lv${level}`,
    kind,
    level,
    x: 0.24 + ((kindIndex * 3 + level - 1) * 0.055),
    y: 0.56,
    angle: kindIndex === 1 ? -0.15 + level * 0.08 : 0,
  }))
)));

const EFFECTS = Object.freeze([
  Object.freeze({ id: "hit", kind: "hit", x: 0.28, y: 0.7, ageTicks: 4, lifetimeTicks: 20 }),
  Object.freeze({ id: "damage", kind: "damage", x: 0.39, y: 0.7, ageTicks: 4, lifetimeTicks: 20 }),
  Object.freeze({ id: "destroy", kind: "destroy", x: 0.5, y: 0.7, ageTicks: 4, lifetimeTicks: 20 }),
  Object.freeze({ id: "collect", kind: "collect", x: 0.61, y: 0.7, ageTicks: 4, lifetimeTicks: 20 }),
  Object.freeze({ id: "eject", kind: "eject", core: "blue", x: 0.72, y: 0.7, ageTicks: 4, lifetimeTicks: 20 }),
]);

function recordingContext() {
  const calls = [];
  const context = { calls };
  for (const method of [
    "save", "restore", "clearRect", "fillRect", "strokeRect", "fillText", "drawImage",
    "translate", "rotate", "scale", "beginPath", "moveTo", "lineTo", "closePath", "fill", "stroke", "arc",
    "setLineDash",
  ]) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  return context;
}

function auditAssets() {
  return Object.fromEntries(Object.keys(GAME_ASSETS).map((id) => [id, {
    id,
    naturalWidth: 512,
    naturalHeight: 288,
  }]));
}

function hashCalls(calls) {
  let hash = 0x811c9dc5;
  const value = JSON.stringify(calls);
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function expectedStageAssets(stage) {
  return [
    "player-interceptor",
    "core-red",
    "core-blue",
    "core-yellow",
    ...stage.backgroundLayers.map(({ assetId }) => assetId),
    ...stage.enemyTypes.map(({ assetId }) => assetId),
    stage.boss.assetId,
  ];
}

function actorPlate(stage, reactor) {
  const animationStates = ["enter", "attack", "hit"];
  return [
    {
      id: "player", assetId: "player-interceptor", x: 0.14, y: 0.36, width: 0.11, height: 0.14,
      tone: "player", reactor: { ...reactor, invulnerable: true },
      animation: { state: "move", progress: 0.5, variant: "player-interceptor" },
    },
    ...stage.enemyTypes.map((enemy, index) => ({
      id: enemy.id,
      assetId: enemy.assetId,
      x: 0.42 + index * 0.13,
      y: 0.28 + index * 0.09,
      width: 0.1,
      height: 0.13,
      tone: "enemy",
      animation: { state: animationStates[index], progress: 0.5, variant: enemy.behaviorId },
    })),
    {
      id: stage.boss.id,
      assetId: stage.boss.assetId,
      x: 0.86,
      y: 0.4,
      width: 0.2,
      height: 0.31,
      tone: "boss",
      animation: { state: "phase", progress: 0.5, variant: stage.boss.phases[1].behaviorId },
    },
    ...["red", "blue", "yellow"].map((core, index) => ({
      id: `core-${core}`,
      assetId: `core-${core}`,
      x: 0.35 + index * 0.12,
      y: 0.15,
      width: 0.045,
      height: 0.07,
      tone: "core",
      animation: { state: index === 0 ? "enter" : "move", progress: 0.5, variant: core },
    })),
  ];
}

function fullPlate(stage, profile, stageIndex) {
  const configuration = WEAPON_CONFIGURATIONS[(stageIndex * 3 + 3) % WEAPON_CONFIGURATIONS.length];
  return createStageViewModel({
    stage,
    tick: Math.min(607, stage.durationTicks - 1),
    score: 123456,
    lives: 3,
    coreQueue: ["red", "blue", "yellow"],
    weapon: { label: configuration.primary?.toUpperCase() ?? "UNARMED", level: configuration.level },
    settings: profile.settings,
    boss: { current: 120, maximum: 240 },
    actors: actorPlate(stage, configuration),
    projectiles: PROJECTILES,
    effects: EFFECTS,
    hazardWarnings: stage.hazards.length > 0 ? [{
      hazardId: stage.hazards[0].id,
      behaviorId: stage.hazards[0].behaviorId,
      ticksUntilActive: 30,
    }] : [],
    transition: { kind: "clear", progress: 1 },
  });
}

function weaponSignature(stage, profile, configuration) {
  const view = createStageViewModel({
    stage,
    tick: 7,
    weapon: { label: "AUDIT", level: 0 },
    settings: profile.settings,
    actors: [{
      id: "player", assetId: "player-interceptor", x: 0.2, y: 0.4, width: 0.12, height: 0.15,
      tone: "player", reactor: { ...configuration, invulnerable: false },
    }],
  });
  const context = recordingContext();
  renderCanvasFrame(context, view, auditAssets());
  return hashCalls(context.calls.filter(([method]) => !["drawImage", "fillText"].includes(method)));
}

export function auditVisualStates() {
  const violations = [];
  const assets = auditAssets();
  const stages = STAGES.map((stage, stageIndex) => {
    const expectedAssets = expectedStageAssets(stage);
    const missingAssets = expectedAssets.filter((id) => !GAME_ASSETS[id]);
    if (missingAssets.length > 0) {
      violations.push({ stageId: stage.id, reason: "missing-product-assets", assetIds: missingAssets });
    }
    const profiles = VISUAL_DISPLAY_PROFILES.map((profile) => {
      const view = fullPlate(stage, profile, stageIndex);
      const context = recordingContext();
      renderCanvasFrame(context, view, assets);
      const weaponSignatures = WEAPON_CONFIGURATIONS.map((configuration) => ({
        id: configuration.id,
        signature: weaponSignature(stage, profile, configuration),
      }));
      const uniqueWeaponSignatures = new Set(weaponSignatures.map(({ signature }) => signature)).size;
      if (uniqueWeaponSignatures !== WEAPON_CONFIGURATIONS.length) {
        violations.push({ stageId: stage.id, profile: profile.id, reason: "weapon-state-signature-collision" });
      }
      if (profile.settings.reducedMotion === true && view.layers.some(({ offsetX }) => offsetX !== 0)) {
        violations.push({ stageId: stage.id, profile: profile.id, reason: "parallax-not-frozen" });
      }
      return {
        id: profile.id,
        commandSignature: hashCalls(context.calls),
        weaponSignatures,
        uniqueWeaponSignatures,
        actorAnimationStates: [...new Set(view.actors.map(({ animation }) => animation?.state).filter(Boolean))].sort(),
        projectileStates: view.projectiles.map(({ kind, level }) => `${kind}-lv${level}`),
        effectStates: view.effects.map(({ kind }) => kind),
        coreQueueSymbols: view.hud.coreQueue.map(({ symbol }) => symbol),
        transition: view.transition.kind,
        parallaxFrozen: view.layers.every(({ offsetX }) => offsetX === 0),
      };
    });
    return {
      stageId: stage.id,
      expectedAssets,
      missingAssets,
      profiles,
    };
  });

  const normalPulse = [5, 7].map((tick) => reactorIndicatorAlpha({}, tick));
  const reducedFlashPulse = [5, 7].map((tick) => reactorIndicatorAlpha({ reducedFlashes: true }, tick));
  if (normalPulse[0] === normalPulse[1]) violations.push({ reason: "normal-reactor-pulse-is-static" });
  if (reducedFlashPulse[0] !== reducedFlashPulse[1]) violations.push({ reason: "reduced-flash-reactor-pulse-varies" });

  return {
    stageCount: stages.length,
    displayProfiles: VISUAL_DISPLAY_PROFILES.map(({ id }) => id),
    thresholds: {
      weaponConfigurations: WEAPON_CONFIGURATIONS.length,
      projectileStates: PROJECTILES.length,
      effectStates: EFFECTS.length,
      coreSymbols: 3,
    },
    flashCheck: { normalPulse, reducedFlashPulse },
    stages,
    violations,
  };
}
