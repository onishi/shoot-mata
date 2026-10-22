const HUD_BACKGROUND = "rgba(2, 7, 11, 0.9)";

function requireContext(context) {
  if (!context || typeof context.fillRect !== "function" || typeof context.drawImage !== "function") {
    throw new TypeError("a 2D canvas context is required");
  }
}

function drawContained(context, image, actor, width, height) {
  const boxWidth = actor.width * width;
  const boxHeight = actor.height * height;
  const ratio = Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  context.drawImage(
    image,
    (actor.x * width) - (drawWidth / 2),
    (actor.y * height) - (drawHeight / 2),
    drawWidth,
    drawHeight,
  );
}

function drawLayer(context, image, layer, width, height) {
  const firstX = layer.offsetX;
  context.drawImage(image, firstX, 0, width, height);
  context.drawImage(image, firstX + width, 0, width, height);
  if (firstX > 0) context.drawImage(image, firstX - width, 0, width, height);
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
  } else {
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
  for (const actor of view.actors) drawContained(context, assets[actor.assetId], actor, view.width, view.height);
  for (const projectile of view.projectiles) drawProjectile(context, projectile, view.width, view.height);
  for (const effect of view.effects) drawEffect(context, effect, view.width, view.height, view.display);
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
