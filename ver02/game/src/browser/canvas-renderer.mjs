const HUD_BACKGROUND = "rgba(2, 7, 11, 0.9)";

function requireContext(context) {
  if (!context || typeof context.fillRect !== "function" || typeof context.drawImage !== "function") {
    throw new TypeError("a 2D canvas context is required");
  }
}

function actorTransform(actor, display) {
  const animation = actor.animation;
  if (!animation || display.reducedMotion) return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1 };
  const wave = Math.sin(animation.progress * Math.PI * 2);
  if (animation.state === "enter") {
    return { x: (1 - animation.progress) * 80, y: 0, scaleX: 0.72 + animation.progress * 0.28, scaleY: 1, rotation: 0, alpha: 0.45 + animation.progress * 0.55 };
  }
  if (animation.state === "attack") {
    return { x: -Math.sin(animation.progress * Math.PI) * 12, y: 0, scaleX: 1.08, scaleY: 0.94, rotation: 0, alpha: 1 };
  }
  if (animation.state === "hit") {
    return { x: wave * 7, y: 0, scaleX: 1, scaleY: 1, rotation: wave * 0.035, alpha: 0.62 };
  }
  if (animation.state === "phase") {
    return { x: 0, y: 0, scaleX: 1 + Math.sin(animation.progress * Math.PI) * 0.18, scaleY: 1 + Math.sin(animation.progress * Math.PI) * 0.18, rotation: wave * 0.04, alpha: 1 };
  }
  const organic = /regenerating|parasite|predator|feeding|carapace|heart/.test(animation.variant);
  const turret = /turret|crossfire|barrage|omni/.test(animation.variant);
  return {
    x: turret ? 0 : wave * 2,
    y: organic ? wave * 5 : wave * 2,
    scaleX: organic ? 1 + wave * 0.025 : 1,
    scaleY: organic ? 1 - wave * 0.025 : 1,
    rotation: turret ? wave * 0.012 : 0,
    alpha: 1,
  };
}

function drawAnimationCue(context, actor, width, height, display) {
  const animation = actor.animation;
  if (!animation || animation.state === "move") return;
  const x = actor.x * width;
  const y = actor.y * height;
  const radius = Math.min(actor.width * width, actor.height * height) * 0.52;
  context.save();
  context.translate(x, y);
  context.strokeStyle = display.highContrast ? "#fff" : "rgba(220, 247, 255, 0.9)";
  context.lineWidth = display.highContrast ? 5 : 3;
  context.beginPath();
  if (animation.state === "attack") {
    context.moveTo(radius * 0.55, -radius * 0.45);
    context.lineTo(radius, 0);
    context.lineTo(radius * 0.55, radius * 0.45);
  } else if (animation.state === "hit") {
    for (const side of [-1, 1]) {
      context.moveTo(side * radius, -radius * 0.45);
      context.lineTo(side * radius * 0.72, 0);
      context.lineTo(side * radius, radius * 0.45);
    }
  } else if (animation.state === "phase") {
    context.setLineDash([10, 7]);
    context.arc(0, 0, radius, 0, Math.PI * 2);
  } else {
    context.moveTo(-radius, -radius * 0.42);
    context.lineTo(-radius * 0.62, 0);
    context.lineTo(-radius, radius * 0.42);
  }
  context.stroke();
  context.setLineDash([]);
  context.restore();
}

function drawContained(context, image, actor, width, height, display) {
  const boxWidth = actor.width * width;
  const boxHeight = actor.height * height;
  const ratio = Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  const transform = actorTransform(actor, display);
  context.save();
  context.translate((actor.x * width) + transform.x, (actor.y * height) + transform.y);
  context.rotate(transform.rotation);
  context.scale(transform.scaleX, transform.scaleY);
  context.globalAlpha = transform.alpha;
  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();
}

function drawLayer(context, image, layer, width, height) {
  const firstX = layer.offsetX;
  context.drawImage(image, firstX, 0, width, height);
  context.drawImage(image, firstX + width, 0, width, height);
  if (firstX > 0) context.drawImage(image, firstX - width, 0, width, height);
}

const REACTOR_COLORS = Object.freeze({
  red: "#ff765f",
  blue: "#71e8ff",
  yellow: "#ffe36e",
});

export function reactorIndicatorAlpha(display, tick) {
  if (display?.reducedMotion === true || display?.reducedFlashes === true) return 0.95;
  return tick % 12 < 6 ? 0.82 : 1;
}

function drawCoreGlyph(context, core, x, y, size, filled) {
  context.save();
  context.translate(x, y);
  context.fillStyle = filled ? REACTOR_COLORS[core] : "rgba(8, 17, 25, 0.82)";
  context.strokeStyle = filled ? "#fffbd0" : "#8295a3";
  context.lineWidth = Math.max(2, size * 0.14);
  context.beginPath();
  if (core === "red") {
    context.moveTo(size, 0);
    context.lineTo(0, size * 0.72);
    context.lineTo(-size, 0);
    context.lineTo(0, -size * 0.72);
    context.closePath();
  } else if (core === "blue") {
    const arm = size * 0.32;
    context.moveTo(-arm, -size);
    context.lineTo(arm, -size);
    context.lineTo(arm, -arm);
    context.lineTo(size, -arm);
    context.lineTo(size, arm);
    context.lineTo(arm, arm);
    context.lineTo(arm, size);
    context.lineTo(-arm, size);
    context.lineTo(-arm, arm);
    context.lineTo(-size, arm);
    context.lineTo(-size, -arm);
    context.lineTo(-arm, -arm);
    context.closePath();
  } else {
    context.arc(0, 0, size * 0.82, 0, Math.PI * 2);
  }
  context.fill();
  context.stroke();
  if (filled) {
    context.strokeStyle = "#07111a";
    context.lineWidth = Math.max(2, size * 0.18);
    context.beginPath();
    if (core === "red") {
      context.moveTo(0, -size * 0.42);
      context.lineTo(0, size * 0.42);
    } else if (core === "blue") {
      context.moveTo(-size * 0.38, 0);
      context.lineTo(size * 0.38, 0);
      context.moveTo(0, -size * 0.38);
      context.lineTo(0, size * 0.38);
    } else {
      context.arc(0, 0, size * 0.32, 0, Math.PI * 2);
    }
    context.stroke();
  }
  context.restore();
}

function drawTransition(context, transition, width, height, display) {
  if (!transition) return;
  context.save();
  const progress = display.reducedMotion ? 1 : transition.progress;
  context.fillStyle = transition.kind === "clear" ? "rgba(3, 20, 28, 0.72)" : "rgba(2, 7, 11, 0.58)";
  context.fillRect(0, height * 0.38, width, height * 0.24);
  context.strokeStyle = display.highContrast ? "#fff" : "#9ff6ff";
  context.lineWidth = 4;
  const spread = 90 + progress * 180;
  context.beginPath();
  context.moveTo(width / 2 - spread, height * 0.43);
  context.lineTo(width / 2 - spread - 34, height / 2);
  context.lineTo(width / 2 - spread, height * 0.57);
  context.moveTo(width / 2 + spread, height * 0.43);
  context.lineTo(width / 2 + spread + 34, height / 2);
  context.lineTo(width / 2 + spread, height * 0.57);
  context.stroke();
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 54px ui-monospace, monospace";
  context.fillText(transition.kind === "clear" ? "STAGE CLEAR" : "SORTIE", width / 2, height / 2);
  context.restore();
}

function drawPlayerReactorState(context, actor, width, height, display, tick) {
  const reactor = actor.reactor;
  if (!reactor) return;
  const x = actor.x * width;
  const y = actor.y * height;
  const scale = Math.min(actor.width * width, actor.height * height);
  context.save();
  context.globalAlpha = reactorIndicatorAlpha(display, tick);

  if (reactor.primary === null) {
    context.strokeStyle = display.highContrast ? "#fff" : "#9aabb5";
    context.lineWidth = Math.max(3, scale * 0.035);
    context.setLineDash([scale * 0.08, scale * 0.06]);
    context.beginPath();
    context.arc(x - scale * 0.22, y, scale * 0.25, 0, Math.PI * 2);
    context.moveTo(x - scale * 0.36, y - scale * 0.14);
    context.lineTo(x - scale * 0.08, y + scale * 0.14);
    context.moveTo(x - scale * 0.08, y - scale * 0.14);
    context.lineTo(x - scale * 0.36, y + scale * 0.14);
    context.stroke();
    context.setLineDash([]);
  } else {
    const cellSize = scale * 0.075;
    for (let index = 0; index < 3; index += 1) {
      drawCoreGlyph(
        context,
        reactor.primary,
        x - scale * 0.31 + index * scale * 0.16,
        y + scale * 0.29,
        cellSize,
        index < reactor.level,
      );
    }
  }

  reactor.supports.forEach((support, index) => {
    drawCoreGlyph(
      context,
      support,
      x - scale * 0.3 + index * scale * 0.15,
      y - scale * 0.31,
      scale * 0.045,
      true,
    );
  });

  if (reactor.invulnerable) {
    context.strokeStyle = display.highContrast ? "#fff" : "#b6f5ff";
    context.lineWidth = Math.max(3, scale * 0.026);
    context.setLineDash([scale * 0.11, scale * 0.065]);
    for (const radius of [0.48, 0.56]) {
      context.beginPath();
      context.arc(x, y, scale * radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.setLineDash([]);
  }
  context.restore();
}

function drawProjectile(context, projectile, width, height) {
  const x = projectile.x * width;
  const y = projectile.y * height;
  context.save();
  context.translate(x, y);
  context.rotate(projectile.angle);
  context.lineWidth = 2 + projectile.level;
  if (projectile.kind === "lance") {
    const length = 16 + projectile.level * 10;
    const halfHeight = 2 + projectile.level * 1.5;
    context.fillStyle = "#ff765f";
    context.strokeStyle = "#fff0c2";
    context.beginPath();
    context.moveTo(length, 0);
    context.lineTo(0, halfHeight);
    context.lineTo(-6, 0);
    context.lineTo(0, -halfHeight);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (projectile.kind === "spread") {
    const size = 5 + projectile.level * 2;
    context.strokeStyle = "#71e8ff";
    context.beginPath();
    context.moveTo(-size, -size);
    context.lineTo(size, 0);
    context.lineTo(-size, size);
    context.stroke();
  } else {
    const radius = 4 + projectile.level * 1.5;
    context.fillStyle = "#ffe36e";
    context.strokeStyle = "#fffbd0";
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(-radius - 5, 0);
    context.lineTo(-radius - 1, 0);
    context.stroke();
  }
  context.restore();
}

function drawEffect(context, effect, width, height, display) {
  const x = effect.x * width;
  const y = effect.y * height;
  const progress = display.reducedMotion ? 0.35 : effect.progress;
  const highContrast = display.highContrast;
  context.save();
  context.translate(x, y);
  context.globalAlpha = Math.max(0.25, 1 - progress);
  context.lineWidth = highContrast ? 5 : 3;

  if (effect.kind === "hit") {
    const radius = 8 + progress * 18;
    context.strokeStyle = highContrast ? "#fff" : "#fff3a6";
    context.beginPath();
    context.moveTo(-radius, 0);
    context.lineTo(radius, 0);
    context.moveTo(0, -radius);
    context.lineTo(0, radius);
    context.stroke();
  } else if (effect.kind === "damage") {
    const radius = 22 + progress * 30;
    context.strokeStyle = highContrast ? "#fff" : "#ff765f";
    context.setLineDash([10, 7]);
    for (const offset of [0, 9]) {
      context.beginPath();
      context.arc(0, 0, radius + offset, 0, Math.PI * 2);
      context.stroke();
    }
    context.setLineDash([]);
  } else if (effect.kind === "destroy") {
    const radius = 16 + progress * 42;
    context.strokeStyle = highContrast ? "#fff" : "#ff9b5f";
    context.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const inner = radius * 0.45;
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    context.stroke();
  } else if (effect.kind === "collect") {
    const radius = 28 - progress * 12;
    context.strokeStyle = highContrast ? "#fff" : "#79efff";
    context.beginPath();
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const tip = radius * 0.45;
      const spread = 7;
      context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      context.lineTo(Math.cos(angle) * tip + Math.cos(angle + Math.PI / 2) * spread,
        Math.sin(angle) * tip + Math.sin(angle + Math.PI / 2) * spread);
      context.lineTo(Math.cos(angle) * tip + Math.cos(angle - Math.PI / 2) * spread,
        Math.sin(angle) * tip + Math.sin(angle - Math.PI / 2) * spread);
      context.closePath();
    }
    context.stroke();
  } else {
    const core = ["red", "blue", "yellow"].includes(effect.core) ? effect.core : "red";
    const travel = display.reducedMotion ? 12 : 12 + progress * 34;
    drawCoreGlyph(context, core, -travel, -travel * 0.55, 8, true);
    context.strokeStyle = highContrast ? "#fff" : REACTOR_COLORS[core];
    context.beginPath();
    context.moveTo(-travel + 12, -travel * 0.55 + 7);
    context.lineTo(-travel + 22, -travel * 0.55 + 13);
    context.stroke();
  }
  context.restore();
}

function drawHudPanel(context, x, y, width, height, highContrast) {
  context.fillStyle = highContrast ? "#000" : HUD_BACKGROUND;
  context.fillRect(x, y, width, height);
  context.strokeStyle = highContrast ? "#fff" : "#9bb7c8";
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
}

function drawHud(context, view) {
  const highContrast = view.display.highContrast;
  drawHudPanel(context, 20, 566, 460, 132, highContrast);
  drawHudPanel(context, 956, 566, 304, 132, highContrast);
  context.textBaseline = "top";
  context.font = "22px ui-monospace, monospace";
  context.fillStyle = "#a9bfcc";
  context.fillText("REACTOR / FIFO", 38, 582);
  context.fillText("SCORE", 976, 582);
  context.font = "bold 30px ui-monospace, monospace";
  context.fillStyle = "#fff";
  context.fillText(String(view.hud.score).padStart(8, "0"), 976, 612);
  context.font = "20px ui-monospace, monospace";
  context.fillText(`LIFE ${view.hud.lives}  ${view.hud.weapon.label} Lv${view.hud.weapon.level}`, 976, 660);

  for (let index = 0; index < 3; index += 1) {
    const core = view.hud.coreQueue[index];
    const x = 38 + (index * 116);
    context.fillStyle = "#101b25";
    context.fillRect(x, 620, 92, 58);
    context.strokeStyle = core?.color ?? "#52616d";
    context.lineWidth = index === 0 && core ? 4 : 2;
    context.strokeRect(x, 620, 92, 58);
    context.fillStyle = core?.color ?? "#71808b";
    context.font = "bold 30px ui-monospace, monospace";
    context.fillText(core?.symbol ?? "—", x + 34, 633);
  }
  if (view.hud.boss) {
    context.fillStyle = "#16090b";
    context.fillRect(436, 28, 408, 28);
    context.fillStyle = "#ff6c4b";
    context.fillRect(440, 32, 400 * view.hud.boss.ratio, 20);
    context.strokeStyle = "#fff";
    context.lineWidth = 2;
    context.strokeRect(436, 28, 408, 28);
  }
}

function drawHazardWarnings(context, view) {
  if (view.hazardWarnings.length === 0) return;
  const labels = view.hazardWarnings.map(({ symbol, label }) => `${symbol} ${label}`).join("  /  ");
  const urgent = Math.min(...view.hazardWarnings.map(({ ticksUntilActive }) => ticksUntilActive)) <= 30;
  context.save();
  context.fillStyle = view.display.highContrast ? "#000" : "rgba(28, 6, 4, 0.9)";
  context.fillRect(310, 78, 660, 74);
  context.strokeStyle = view.display.highContrast ? "#fff" : urgent ? "#fff06a" : "#ff9b5f";
  context.lineWidth = urgent ? 6 : 4;
  context.strokeRect(310, 78, 660, 74);
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 24px ui-monospace, monospace";
  context.fillText(`CAUTION  ${labels}`, 640, 115);
  context.restore();
}

export function missingAssetIds(view, assets) {
  if (!view || typeof view !== "object") throw new TypeError("view is required");
  const needed = new Set([
    ...view.layers.map(({ assetId }) => assetId),
    ...view.actors.map(({ assetId }) => assetId),
  ]);
  return Object.freeze([...needed].filter((id) => !assets?.[id]));
}

export function renderCanvasFrame(context, view, assets) {
  requireContext(context);
  if (!view || typeof view !== "object") throw new TypeError("view is required");
  const missing = missingAssetIds(view, assets);
  if (missing.length > 0) throw new Error(`missing canvas assets: ${missing.join(", ")}`);

  context.save();
  context.clearRect(0, 0, view.width, view.height);
  context.fillStyle = "#071426";
  context.fillRect(0, 0, view.width, view.height);
  for (const layer of view.layers) drawLayer(context, assets[layer.assetId], layer, view.width, view.height);
  if (view.display.highContrast) {
    context.fillStyle = "rgba(0, 0, 0, 0.34)";
    context.fillRect(0, 0, view.width, view.height);
  }
  for (const actor of view.actors) {
    drawContained(context, assets[actor.assetId], actor, view.width, view.height, view.display);
    drawAnimationCue(context, actor, view.width, view.height, view.display);
    if (actor.tone === "player") {
      drawPlayerReactorState(context, actor, view.width, view.height, view.display, view.tick);
    }
  }
  for (const projectile of view.projectiles) drawProjectile(context, projectile, view.width, view.height);
  for (const effect of view.effects) drawEffect(context, effect, view.width, view.height, view.display);
  drawHazardWarnings(context, view);
  drawTransition(context, view.transition, view.width, view.height, view.display);
  drawHud(context, view);
  context.restore();
  return Object.freeze({ drawnAssets: view.layers.length + view.actors.length, missingAssets: missing });
}

export async function loadCanvasAssets(manifest, options = {}) {
  if (!manifest || typeof manifest !== "object") throw new TypeError("asset manifest is required");
  const createImage = options.createImage ?? (() => new Image());
  const entries = await Promise.all(Object.entries(manifest).map(([id, url]) => new Promise((resolve, reject) => {
    const image = createImage();
    image.addEventListener("load", () => resolve([id, image]), { once: true });
    image.addEventListener("error", () => reject(new Error(`failed to load asset ${id}: ${url}`)), { once: true });
    image.src = url;
  })));
  return Object.freeze(Object.fromEntries(entries));
}
