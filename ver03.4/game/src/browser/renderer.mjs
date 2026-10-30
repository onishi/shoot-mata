import { stageById, visibleTerrainFor } from "../content/stages.mjs";
import { BACKGROUND_LAYERS, IMAGE_ASSETS, STAGE_02_BACKGROUND_LAYERS, STAGE_03_BACKGROUND_LAYERS, STAGE_04_BACKGROUND_LAYERS, STAGE_05_BACKGROUND_LAYERS, STAGE_06_BACKGROUND_LAYERS } from "../content/assets.mjs";
import { arkCoreWeakpoint, bossShieldRects, bossWeakpoint, bossWeakpointIsOpen, furnaceControllerWeakpoint, optionPositions, prismOracleWeakpoint, reactorLoadout, refineryValveWeakpoint, relaySovereignWeakpoint } from "../core/game.mjs";

const WIDTH = 1280;
const FIELD_HEIGHT = 720;
const images = new Map(Object.entries(IMAGE_ASSETS).map(([id, url]) => {
  const image = new Image();
  image.src = url;
  return [id, image];
}));

export function render(ctx, game) {
  ctx.save();
  ctx.clearRect(0, 0, WIDTH, 800);
  drawBackground(ctx, game);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, FIELD_HEIGHT);
  ctx.clip();

  if (game.screen === "title") drawTitle(ctx, game);
  else if (game.screen === "stage-select") drawStageSelect(ctx, game);
  else if (game.screen === "how-to-play") drawHowToPlay(ctx);
  else if (game.screen === "ending") drawEnding(ctx, game);
  else if (game.screen === "credits") drawCredits(ctx, game);
  else {
    if (game.shakeTicks > 0) ctx.translate(Math.sin(game.tick * 2.7) * 4, Math.cos(game.tick * 2.1) * 3);
    drawSetPieces(ctx, game);
    drawTerrain(ctx, game);
    drawBullets(ctx, game);
    drawEnemyBullets(ctx, game);
    drawPickups(ctx, game);
    drawEnemies(ctx, game);
    drawEffects(ctx, game);
    drawOptions(ctx, game);
    drawPlayer(ctx, game);
    if (game.screen === "stage-intro") {
      const intro = game.stageId === "stage-06" ? ["FINAL STAGE", "ZERO-POINT RELAY CORE"] : game.stageId === "stage-05" ? ["STAGE 5", "CRYSTAL COMPUTATION SEA"] : game.stageId === "stage-04" ? ["STAGE 4", "STELLAR FURNACE"] : game.stageId === "stage-03" ? ["STAGE 3", "LIVING ARK"] : game.stageId === "stage-02" ? ["STAGE 2", "CLOUD REFINERY"] : ["STAGE 1", "ORBITAL WRECK"];
      drawNotice(ctx, ...intro);
    }
    if (game.screen === "stage-result") drawResult(ctx, game);
    if (game.screen === "continue") drawContinue(ctx);
    if (game.screen === "playing" && game.sectionBannerTicks > 0) drawSectionChange(ctx, game);
    if (game.screen === "playing" && game.killChain >= 3 && game.chainTicks > 0) drawChain(ctx, game);
    if (game.paused) drawNotice(ctx, "PAUSE", "P: RESUME   ESC: TITLE");
  }
  ctx.restore();
  drawHud(ctx, game);
  ctx.restore();
}

function drawBackground(ctx, game) {
  const stageTwo = game.stageId === "stage-02";
  const stageThree = game.stageId === "stage-03";
  const stageFour = game.stageId === "stage-04";
  const stageFive = game.stageId === "stage-05";
  const stageSix = game.stageId === "stage-06";
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
  gradient.addColorStop(0, stageSix ? "#06081c" : stageFive ? "#06112d" : stageFour ? "#38100a" : stageThree ? "#251022" : stageTwo ? "#112735" : "#071122");
  gradient.addColorStop(0.55, stageSix ? "#19143a" : stageFive ? "#12385a" : stageFour ? "#6b2410" : stageThree ? "#4a1b39" : stageTwo ? "#284956" : "#10213a");
  gradient.addColorStop(1, stageSix ? "#030611" : stageFive ? "#040b20" : stageFour ? "#160806" : stageThree ? "#120917" : stageTwo ? "#0b1d2a" : "#07101d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, FIELD_HEIGHT);

  const layers = stageSix ? STAGE_06_BACKGROUND_LAYERS : stageFive ? STAGE_05_BACKGROUND_LAYERS : stageFour ? STAGE_04_BACKGROUND_LAYERS : stageThree ? STAGE_03_BACKGROUND_LAYERS : stageTwo ? STAGE_02_BACKGROUND_LAYERS : BACKGROUND_LAYERS;
  for (const layer of layers) drawCrossfadedLayer(ctx, images.get(layer.asset), game.scrollX, layer);

  ctx.fillStyle = "rgba(3, 12, 24, 0.16)";
  ctx.fillRect(0, 0, WIDTH, FIELD_HEIGHT);
}

function drawCrossfadedLayer(ctx, image, scrollX, { speed, overlap, opacity }) {
  if (!image?.complete || image.naturalWidth < 1) return;
  const tileWidth = WIDTH;
  const stride = tileWidth - overlap;
  const offset = ((scrollX * speed) % stride + stride) % stride;
  const firstX = -offset - stride;
  const stripWidth = 20;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, firstX, 0, tileWidth, FIELD_HEIGHT);
  for (let x = firstX + stride; x < WIDTH; x += stride) {
    ctx.drawImage(image, overlap, 0, tileWidth - overlap, image.naturalHeight, x + overlap, 0, tileWidth - overlap, FIELD_HEIGHT);
    for (let sourceX = 0; sourceX < overlap; sourceX += stripWidth) {
      const width = Math.min(stripWidth, overlap - sourceX);
      ctx.globalAlpha = opacity * Math.min(1, (sourceX + width) / overlap);
      ctx.drawImage(image, sourceX, 0, width, image.naturalHeight, x + sourceX, 0, width, FIELD_HEIGHT);
    }
    ctx.globalAlpha = opacity;
  }
  ctx.restore();
}

function drawTerrain(ctx, game) {
  for (const item of visibleTerrainFor(game.stageId, game.scrollX, game.destroyedTerrain, game.tick)) {
    const x = item.screenX;
    const refinery = game.stageId === "stage-02";
    const living = game.stageId === "stage-03";
    const stellar = game.stageId === "stage-04";
    const crystal = game.stageId === "stage-05";
    const relay = game.stageId === "stage-06";
    ctx.save();
    ctx.beginPath();
    traceTerrainPath(ctx, item, x);
    ctx.clip();
    const textureId = game.stageId === "stage-01" ? "background-fore" : `background-${game.stageId}-fore`;
    const texture = images.get(textureId);
    if (texture?.complete && texture.naturalWidth > 0) drawCrossfadedLayer(ctx, texture, game.scrollX, { speed: 0.34, overlap: 200, opacity: 1 });
    ctx.fillStyle = relay ? "rgba(8,8,24,.48)" : crystal ? "rgba(4,24,38,.30)" : stellar ? "rgba(42,10,3,.32)" : living ? "rgba(55,8,34,.25)" : refinery ? "rgba(20,34,32,.34)" : "rgba(7,16,22,.38)";
    ctx.fillRect(x, item.y, item.width, item.height);

    drawNaturalTerrainDetail(ctx, game, item, x);

    if (item.kind === "destructible-wreck" || item.kind === "destructible-cyst") {
      ctx.strokeStyle = "#ff8b42";
      ctx.lineWidth = 3;
      for (let crack = 20; crack < item.height; crack += 38) {
        ctx.beginPath();
        ctx.moveTo(x + (crack * 3) % item.width, item.y + crack - 18);
        ctx.lineTo(x + (crack * 3 + 24) % item.width, item.y + crack);
        ctx.lineTo(x + (crack * 3 + 7) % item.width, item.y + crack + 19);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.strokeStyle = item.warning ? "rgba(255,235,130,.9)" : relay ? "rgba(125,185,220,.66)" : crystal ? "rgba(170,235,245,.7)" : stellar ? "rgba(255,149,82,.7)" : living ? "rgba(216,126,164,.72)" : refinery ? "rgba(205,177,121,.68)" : "rgba(142,173,180,.7)";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = item.warning ? 14 : 2;
    ctx.lineWidth = item.warning ? 3 : 2;
    ctx.beginPath(); traceTerrainPath(ctx, item, x); ctx.stroke();
    ctx.shadowBlur = 0;
    if (item.warning) {
      ctx.fillStyle = `rgba(255, 206, 70, ${0.12 + Math.sin(game.tick / 5) * 0.06})`;
      ctx.beginPath(); traceTerrainPath(ctx, item, x); ctx.fill();
    }
  }
}

function traceTerrainPath(ctx, item, x = item.screenX) {
  const points = item.localPoints ?? [{ x: 0, y: 0 }, { x: item.width, y: 0 }, { x: item.width, y: item.height }, { x: 0, y: item.height }];
  if (points.length < 3) return;
  const last = points.at(-1);
  const first = points[0];
  ctx.moveTo(x + (last.x + first.x) / 2, item.y + (last.y + first.y) / 2);
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    ctx.quadraticCurveTo(
      x + point.x,
      item.y + point.y,
      x + (point.x + next.x) / 2,
      item.y + (point.y + next.y) / 2,
    );
  }
  ctx.closePath();
}

function drawNaturalTerrainDetail(ctx, game, item, x) {
  let seed = [...item.id].reduce((value, char) => (value * 33 + char.charCodeAt(0)) % 104729, 19);
  const random = () => { seed = seed * 48271 % 2147483647; return seed / 2147483647; };
  const top = item.y;
  const bottom = item.y + item.height;
  for (let index = 0; index < Math.max(4, Math.floor(item.width / 100)); index += 1) {
    const px = x + random() * item.width;
    const py = top + random() * item.height;
    if (game.stageId === "stage-01") {
      ctx.fillStyle = `rgba(123,58,30,${0.12 + random() * 0.2})`;
      ctx.beginPath(); ctx.ellipse(px, py, 18 + random() * 52, 8 + random() * 24, random() * 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(180,166,137,.35)"; ctx.lineWidth = 2 + random() * 4;
      ctx.beginPath(); ctx.moveTo(px - 34, py - 18); ctx.lineTo(px + 8, py + 4); ctx.lineTo(px + 42, py - 12); ctx.stroke();
    } else if (game.stageId === "stage-02") {
      ctx.strokeStyle = `rgba(172,154,104,${0.3 + random() * 0.25})`; ctx.lineWidth = 7 + random() * 9;
      ctx.beginPath(); ctx.moveTo(px - 70, top - 10); ctx.bezierCurveTo(px + 35, py - 55, px - 35, py + 55, px + 70, bottom + 10); ctx.stroke();
      ctx.fillStyle = "rgba(55,68,64,.75)"; ctx.beginPath(); ctx.arc(px, py, 7 + random() * 11, 0, Math.PI * 2); ctx.fill();
    } else if (game.stageId === "stage-03") {
      ctx.strokeStyle = `rgba(193,67,109,${0.35 + random() * 0.28})`; ctx.lineWidth = 3 + random() * 8;
      ctx.beginPath(); ctx.moveTo(px, top - 8); ctx.bezierCurveTo(px + 60, py - 30, px - 55, py + 30, px + 15, bottom + 8); ctx.stroke();
      ctx.fillStyle = "rgba(226,130,119,.18)"; ctx.beginPath(); ctx.ellipse(px, py, 24 + random() * 34, 10 + random() * 26, random(), 0, Math.PI * 2); ctx.fill();
    } else if (game.stageId === "stage-04") {
      ctx.fillStyle = `rgba(18,8,5,${0.25 + random() * 0.3})`; ctx.beginPath(); ctx.arc(px, py, 16 + random() * 42, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,99,30,${0.28 + random() * 0.34})`; ctx.lineWidth = 2 + random() * 4;
      ctx.beginPath(); ctx.moveTo(px - 28, py + 35); ctx.lineTo(px - 5, py); ctx.lineTo(px + 8, py + 14); ctx.lineTo(px + 35, py - 30); ctx.stroke();
    } else if (game.stageId === "stage-05") {
      ctx.fillStyle = `rgba(92,196,205,${0.1 + random() * 0.2})`; ctx.strokeStyle = "rgba(190,242,238,.32)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px - 34, py + 28); ctx.lineTo(px - 8, py - 42 - random() * 30); ctx.lineTo(px + 16, py + 8); ctx.lineTo(px + 42, py + 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.strokeStyle = `rgba(93,185,210,${0.2 + random() * 0.3})`; ctx.lineWidth = 1 + random() * 4;
      ctx.beginPath(); ctx.moveTo(px - 48, py); ctx.bezierCurveTo(px - 12, py - 34, px + 10, py + 38, px + 48, py); ctx.stroke();
      ctx.fillStyle = "rgba(147,105,194,.3)"; ctx.beginPath(); ctx.arc(px + random() * 20, py, 3 + random() * 7, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawSetPieces(ctx, game) {
  for (const piece of game.setPieces ?? []) {
    ctx.save(); ctx.translate(piece.x, piece.y);
    if (piece.kind === "wreck-hangar") {
      const metal = ctx.createLinearGradient(-170, -90, 160, 90); metal.addColorStop(0, "#171b1c"); metal.addColorStop(.48, "#554739"); metal.addColorStop(1, "#111619");
      ctx.fillStyle = metal; ctx.strokeStyle = "rgba(195,151,92,.65)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-180,-55); ctx.lineTo(-70,-105); ctx.lineTo(158,-72); ctx.lineTo(186,38); ctx.lineTo(35,92); ctx.lineTo(-155,60); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#020405"; ctx.beginPath(); ctx.ellipse(18, 2, 92, 48, -.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,109,36,.65)"; for (let i=-2;i<=2;i+=1) ctx.fillRect(-15+i*30, 48, 13, 5);
    } else if (piece.kind === "worker-craft") {
      ctx.fillStyle = "#ba9c57"; ctx.strokeStyle = "#ead69a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-72,0); ctx.lineTo(-30,-28); ctx.lineTo(58,-18); ctx.lineTo(82,0); ctx.lineTo(45,24); ctx.lineTo(-34,28); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#82d8cf"; ctx.fillRect(-80,-12,18,24); ctx.fillStyle = "rgba(95,235,220,.5)"; ctx.fillRect(-104,-7,28,14);
    } else if (piece.kind === "survivor-pod") {
      ctx.fillStyle = "rgba(118,43,77,.82)"; ctx.strokeStyle = "rgba(222,126,158,.75)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0,0,82,57,.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(120,220,224,.35)"; ctx.beginPath(); ctx.ellipse(12,-4,31,22,-.3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "rgba(232,86,127,.55)"; for(let i=0;i<4;i+=1){ctx.beginPath();ctx.moveTo(-70+i*38,-35);ctx.bezierCurveTo(-30+i*25,0,-80+i*45,35,-42+i*36,48);ctx.stroke();}
    } else if (piece.kind === "coolant-train") {
      ctx.fillStyle = "#41352d"; ctx.strokeStyle = "#bc7750"; ctx.lineWidth = 4; ctx.fillRect(-190,-42,380,84); ctx.strokeRect(-190,-42,380,84);
      for(let i=-2;i<=2;i+=1){ctx.fillStyle="#17242a";ctx.beginPath();ctx.arc(i*68,0,24,0,Math.PI*2);ctx.fill();ctx.stroke();}
      ctx.fillStyle = "rgba(92,225,238,.65)"; ctx.fillRect(-175,-30,350,11);
    } else if (piece.kind === "signal-decoy") {
      for(let i=-1;i<=1;i+=1){ctx.globalAlpha = i === (piece.phase % 3) - 1 ? 0.9 : 0.25;ctx.fillStyle="#70bbc5";ctx.strokeStyle="#d5f2ee";ctx.beginPath();ctx.moveTo(i*88,-70);ctx.lineTo(i*88+48,10);ctx.lineTo(i*88,72);ctx.lineTo(i*88-38,8);ctx.closePath();ctx.fill();ctx.stroke();}
      ctx.globalAlpha=1;
    } else {
      ctx.strokeStyle = "rgba(112,203,211,.85)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0,0,66,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = "#d6b96b"; ctx.beginPath(); ctx.arc(0,0,13,0,Math.PI*2); ctx.fill();
      for(let i=0;i<3;i+=1){const a=i*Math.PI*2/3+piece.age/80;ctx.beginPath();ctx.moveTo(Math.cos(a)*18,Math.sin(a)*18);ctx.lineTo(Math.cos(a)*92,Math.sin(a)*92);ctx.stroke();}
    }
    ctx.restore();
  }
  if (game.acidLevel > 0) {
    const gradient = ctx.createLinearGradient(0, FIELD_HEIGHT-game.acidLevel, 0, FIELD_HEIGHT); gradient.addColorStop(0,"rgba(226,110,77,.42)"); gradient.addColorStop(1,"rgba(73,19,46,.78)");
    ctx.fillStyle=gradient; ctx.fillRect(0,FIELD_HEIGHT-game.acidLevel,WIDTH,game.acidLevel);
  }
}

function drawLandmarks(ctx, game) {
  const stage = stageById(game.stageId);
  for (const [index, event] of stage.storyEvents.entries()) {
    const x = event.worldX - game.scrollX;
    if (x < -360 || x > WIDTH + 360) continue;
    const hue = [28, 190, 330, 16, 178, 266][stage.number - 1];
    const y = 100 + (index % 3) * 170;
    ctx.save(); ctx.globalAlpha = 0.62; ctx.translate(x, y);
    ctx.fillStyle = `hsla(${hue}, 48%, 14%, .88)`; ctx.strokeStyle = `hsla(${hue + 24}, 92%, 68%, .85)`; ctx.lineWidth = 5;
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18;
    ctx.beginPath();
    const radius = 94 + (index % 2) * 28;
    traceLandmark(ctx, stage.number, radius, index);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawLandmarkDetails(ctx, stage.number, radius, index);
    ctx.shadowBlur = 0; ctx.fillStyle = "rgba(2,8,20,.82)"; ctx.fillRect(-118, radius + 12, 236, 28);
    ctx.fillStyle = "#e7fbff"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center"; ctx.fillText(event.landmark, 0, radius + 31);
    ctx.restore();
  }
}

function traceLandmark(ctx, stageNumber, radius, index) {
  if (stageNumber === 1) {
    ctx.moveTo(-radius, -radius * 0.28); ctx.lineTo(-radius * 0.36, -radius * 0.62); ctx.lineTo(radius * 0.7, -radius * 0.42);
    ctx.lineTo(radius, 0); ctx.lineTo(radius * 0.48, radius * 0.5); ctx.lineTo(-radius * 0.55, radius * 0.62); ctx.lineTo(-radius, radius * 0.2);
  } else if (stageNumber === 2) {
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
  } else if (stageNumber === 3) {
    ctx.moveTo(-radius, 0); ctx.bezierCurveTo(-radius * 0.85, -radius, -radius * 0.15, -radius * 0.75, 0, -radius * 0.36);
    ctx.bezierCurveTo(radius * 0.35, -radius, radius, -radius * 0.55, radius * 0.78, 0);
    ctx.bezierCurveTo(radius, radius * 0.72, radius * 0.22, radius, 0, radius * 0.42);
    ctx.bezierCurveTo(-radius * 0.35, radius, -radius, radius * 0.62, -radius, 0);
  } else if (stageNumber === 4) {
    ctx.moveTo(-radius, radius * 0.5); ctx.lineTo(-radius * 0.78, -radius * 0.55); ctx.lineTo(-radius * 0.3, -radius * 0.74);
    ctx.lineTo(-radius * 0.05, -radius * 0.28); ctx.lineTo(radius * 0.38, -radius * 0.72); ctx.lineTo(radius, -radius * 0.42);
    ctx.lineTo(radius * 0.78, radius * 0.55); ctx.lineTo(radius * 0.2, radius * 0.72); ctx.lineTo(-radius * 0.35, radius * 0.38);
  } else if (stageNumber === 5) {
    ctx.moveTo(-radius, radius * 0.68); ctx.lineTo(-radius * 0.58, -radius * 0.18); ctx.lineTo(-radius * 0.28, radius * 0.08);
    ctx.lineTo(0, -radius); ctx.lineTo(radius * 0.24, -radius * 0.05); ctx.lineTo(radius * 0.56, -radius * 0.42);
    ctx.lineTo(radius, radius * 0.68);
  } else {
    for (let point = 0; point < 6; point += 1) {
      const angle = Math.PI / 6 + point * Math.PI / 3;
      const px = Math.cos(angle) * radius * 0.82;
      const py = Math.sin(angle) * radius * 0.82;
      if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  }
}

function drawLandmarkDetails(ctx, stageNumber, radius, index) {
  ctx.shadowBlur = 5; ctx.lineWidth = 3;
  if (stageNumber === 1) {
    ctx.beginPath(); ctx.moveTo(-radius * 0.6, 0); ctx.lineTo(radius * 0.62, 0); ctx.moveTo(-radius * 0.25, -radius * 0.48); ctx.lineTo(-radius * 0.08, radius * 0.48); ctx.stroke();
  } else if (stageNumber === 2) {
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2); ctx.stroke();
    for (let spoke = 0; spoke < 6; spoke += 1) { const angle = spoke * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.stroke(); }
  } else if (stageNumber === 3) {
    ctx.beginPath(); ctx.moveTo(-radius * 0.68, 0); ctx.bezierCurveTo(-radius * 0.2, -radius * 0.52, radius * 0.18, radius * 0.55, radius * 0.7, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, radius * 0.18, radius * 0.32, index * 0.2, 0, Math.PI * 2); ctx.stroke();
  } else if (stageNumber === 4) {
    for (let vent = -1; vent <= 1; vent += 1) { ctx.beginPath(); ctx.moveTo(vent * radius * 0.38 - 12, radius * 0.45); ctx.lineTo(vent * radius * 0.38 + 14, -radius * 0.48); ctx.stroke(); }
  } else if (stageNumber === 5) {
    ctx.beginPath(); ctx.moveTo(-radius * 0.58, radius * 0.6); ctx.lineTo(0, -radius); ctx.lineTo(radius * 0.2, radius * 0.6); ctx.moveTo(0, -radius); ctx.lineTo(radius * 0.72, radius * 0.55); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2); ctx.stroke();
    for (let branch = 0; branch < 3; branch += 1) { const angle = branch * Math.PI * 2 / 3 + index * 0.15; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2); ctx.lineTo(Math.cos(angle) * radius * 0.72, Math.sin(angle) * radius * 0.72); ctx.stroke(); }
  }
}

function drawTerrainIdentity(ctx, game, item, x) {
  const top = item.y;
  const bottom = item.y + item.height;
  if (game.stageId === "stage-01") {
    for (let offset = -30; offset < item.width; offset += 94) {
      ctx.fillStyle = offset % 188 < 0 ? "#1b3342" : "#263f4c";
      ctx.strokeStyle = "rgba(157, 224, 238, 0.34)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + offset, top + 10); ctx.lineTo(x + offset + 78, top + 2); ctx.lineTo(x + offset + 66, bottom - 8); ctx.lineTo(x + offset - 10, bottom - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#ff9c42"; ctx.beginPath(); ctx.moveTo(x + offset + 18, top + 14); ctx.lineTo(x + offset + 48, bottom - 14); ctx.stroke();
    }
  } else if (game.stageId === "stage-02") {
    for (let offset = 18; offset < item.width; offset += 108) {
      ctx.strokeStyle = "#7da6a8"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x + offset, top); ctx.lineTo(x + offset, bottom); ctx.stroke();
      ctx.strokeStyle = "#263f45"; ctx.lineWidth = 7; ctx.stroke();
      ctx.fillStyle = "#d39a55"; ctx.beginPath(); ctx.arc(x + offset, top + item.height * 0.52, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#182e35"; ctx.beginPath(); ctx.arc(x + offset, top + item.height * 0.52, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "#d2c49f"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, top + item.height * 0.3); ctx.lineTo(x + item.width, top + item.height * 0.3); ctx.stroke();
  } else if (game.stageId === "stage-03") {
    for (let offset = 10; offset < item.width; offset += 70) {
      const pulse = 10 + Math.sin(game.tick / 18 + offset) * 4;
      ctx.fillStyle = "rgba(211, 75, 133, 0.35)"; ctx.beginPath(); ctx.ellipse(x + offset, top + item.height / 2, 30, Math.max(18, item.height * 0.34), 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e779b5"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + offset, top); ctx.bezierCurveTo(x + offset + 35, top + pulse, x + offset - 25, bottom - pulse, x + offset + 18, bottom); ctx.stroke();
      ctx.fillStyle = "#ff9e57"; ctx.beginPath(); ctx.arc(x + offset, top + item.height / 2, 5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (game.stageId === "stage-04") {
    for (let offset = 8; offset < item.width; offset += 58) {
      ctx.fillStyle = "#3b2020"; ctx.fillRect(x + offset, top + 8, 38, Math.max(16, item.height - 16));
      ctx.strokeStyle = "#8c4330"; ctx.lineWidth = 3; ctx.strokeRect(x + offset, top + 8, 38, Math.max(16, item.height - 16));
      ctx.strokeStyle = `rgba(255, 112, 45, ${0.45 + Math.sin(game.tick / 10 + offset) * 0.18})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + offset + 4, bottom - 14); ctx.lineTo(x + offset + 20, top + item.height * 0.55); ctx.lineTo(x + offset + 34, top + 18); ctx.stroke();
    }
  } else if (game.stageId === "stage-05") {
    for (let offset = -20; offset < item.width; offset += 72) {
      ctx.fillStyle = offset % 144 < 0 ? "rgba(77, 220, 225, 0.28)" : "rgba(99, 125, 224, 0.25)";
      ctx.strokeStyle = "rgba(169, 255, 255, 0.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + offset, bottom); ctx.lineTo(x + offset + 36, top); ctx.lineTo(x + offset + 72, bottom); ctx.lineTo(x + offset + 38, top + item.height * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else {
    for (let offset = 16; offset < item.width; offset += 86) {
      ctx.strokeStyle = "#59e9ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + offset, top); ctx.lineTo(x + offset, top + item.height * 0.45); ctx.lineTo(x + offset + 38, top + item.height * 0.62); ctx.lineTo(x + offset + 38, bottom); ctx.stroke();
      ctx.fillStyle = (offset / 86) % 2 ? "#c778ff" : "#ff9b4d"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x + offset + 38, top + item.height * 0.62, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
}

function drawEffects(ctx, game) {
  for (const effect of game.effects) {
    ctx.save(); ctx.globalAlpha = Math.min(1, effect.life / 12); ctx.fillStyle = effect.color; ctx.shadowColor = effect.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(effect.x, effect.y, 2 + effect.life / 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function drawEnemyBullets(ctx, game) {
  for (const bullet of game.enemyBullets) {
    ctx.save();
    if (bullet.kind === "phase-beam") {
      ctx.strokeStyle = "#ff9a3d"; ctx.shadowColor = "#ff5a28"; ctx.shadowBlur = 18; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y); ctx.lineTo(Math.max(0, bullet.x - 190), bullet.y - bullet.vy * 8); ctx.stroke();
    }
    const pulse = 1 + Math.sin(bullet.age / 6) * 0.16;
    ctx.translate(bullet.x, bullet.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = bullet.kind === "mine" ? "#ff4b20" : bullet.kind === "warden-shot" ? "#ff315f" : "#ff8a35";
    ctx.shadowBlur = bullet.kind === "mine" ? 18 : 11;
    ctx.fillStyle = bullet.kind === "mine" ? "#3a1a16" : bullet.kind === "warden-shot" ? "#ffcf4d" : "#ffb04f";
    ctx.strokeStyle = bullet.kind === "warden-shot" ? "#ff315f" : "#ff6b2c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (bullet.kind === "arrester-bolt") { ctx.moveTo(-18,-12);ctx.lineTo(-3,0);ctx.lineTo(-14,13);ctx.lineTo(18,0);ctx.closePath(); }
    else if (bullet.kind === "heat-trail") ctx.ellipse(0,0,bullet.radius*1.8,bullet.radius*.65,0,0,Math.PI*2);
    else if (["lattice-shot","vector-shot"].includes(bullet.kind)) { ctx.moveTo(0,-bullet.radius*1.6);ctx.lineTo(bullet.radius*1.4,0);ctx.lineTo(0,bullet.radius*1.6);ctx.lineTo(-bullet.radius*1.4,0);ctx.closePath(); }
    else ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (bullet.kind === "mine") {
      ctx.fillStyle = "#ffdf73";
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(Math.PI / 2); ctx.fillRect(bullet.radius - 1, -2, 7, 4);
      }
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, game) {
  if (game.respawnTicks > 0 || game.screen === "continue") return;
  const { x, y, invulnerable } = game.player;
  if (invulnerable > 0 && Math.floor(invulnerable / 5) % 2 === 0) return;
  ctx.save();
  ctx.shadowBlur = 13;
  ctx.shadowColor = "#38e8ff";
  drawAsset(ctx, "player", x - 42, y - 24, 86, 48, () => {
    ctx.fillStyle = "#e8fbff";
    ctx.beginPath();
    ctx.moveTo(x + 34, y); ctx.lineTo(x - 25, y - 19); ctx.lineTo(x - 14, y); ctx.lineTo(x - 25, y + 19); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = "#ffdf61";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  if (game.barrier > 0) {
    ctx.strokeStyle = "#83f6ff"; ctx.lineWidth = 3; ctx.globalAlpha = 0.65 + Math.sin(game.tick / 8) * 0.2;
    ctx.beginPath(); ctx.ellipse(x, y, 48, 30, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawOptions(ctx, game) {
  for (const [index, option] of optionPositions(game).entries()) {
    ctx.save();
    ctx.translate(option.x, option.y);
    ctx.rotate(game.tick / 20 * (index ? -1 : 1));
    ctx.shadowColor = game.optionFormation === "focus" ? "#ffcf57" : game.optionFormation === "wide" ? "#7db8ff" : "#74f4ff";
    ctx.shadowBlur = 14; ctx.fillStyle = "#eaffff"; ctx.strokeStyle = ctx.shadowColor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(0, -9); ctx.lineTo(-13, 0); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

function drawBullets(ctx, game) {
  for (const bullet of game.bullets) {
    ctx.save();
    if (bullet.kind === "lance") {
      ctx.fillStyle = "#ff7766"; ctx.shadowColor = "#ff382f"; ctx.shadowBlur = 13;
      ctx.beginPath(); ctx.moveTo(bullet.x + bullet.width, bullet.y + bullet.height / 2); ctx.lineTo(bullet.x + 8, bullet.y); ctx.lineTo(bullet.x, bullet.y + bullet.height / 2); ctx.lineTo(bullet.x + 8, bullet.y + bullet.height); ctx.closePath(); ctx.fill();
    } else if (bullet.kind === "spread") {
      ctx.strokeStyle = "#6ebcff"; ctx.lineWidth = 4; ctx.shadowColor = "#3198ff"; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y + bullet.height); ctx.lineTo(bullet.x + bullet.width / 2, bullet.y); ctx.lineTo(bullet.x + bullet.width, bullet.y + bullet.height); ctx.stroke();
    } else if (bullet.kind === "seeker") {
      ctx.strokeStyle = "#ffe74f"; ctx.lineWidth = 4; ctx.shadowColor = "#ffbe2f"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.ellipse(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, bullet.height / 2, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (bullet.kind === "option") {
      ctx.fillStyle = "#fff5a8"; ctx.shadowBlur = 12; ctx.shadowColor = "#64f4ff";
      ctx.beginPath(); ctx.ellipse(bullet.x + 8, bullet.y + 2, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = "#8dffff"; ctx.shadowBlur = 9; ctx.shadowColor = "#39e5ff";
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawPickups(ctx, game) {
  for (const pickup of game.pickups) {
    const bob = Math.sin(game.tick / 12 + pickup.x / 80) * 5;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = pickup.kind === "option" ? "#65f5ff" : pickup.kind === "barrier" ? "#8d86ff" : pickup.kind === "overdrive" ? "#ff9b46" : pickup.color === "red" ? "#ff443f" : pickup.color === "blue" ? "#39aaff" : "#ffe24e";
    if (pickup.kind === "core" || pickup.color) drawAsset(ctx, `core-${pickup.color}`, pickup.x - 25, pickup.y - 25 + bob, 50, 50);
    else {
      ctx.translate(pickup.x, pickup.y + bob); ctx.fillStyle = "#071522"; ctx.strokeStyle = ctx.shadowColor; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ctx.shadowColor; ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pickup.kind === "option" ? "O" : pickup.kind === "barrier" ? "B" : "R", 0, 1);
    }
    ctx.restore();
  }
}

function drawEnemies(ctx, game) {
  for (const enemy of game.enemies) {
    drawAsset(ctx, enemy.type, enemy.x, enemy.y, enemy.width, enemy.height, () => {
      const storyColors = ["#ff9b52", "#70e5ff", "#ff70b7", "#ffd35c", "#87fff0", "#bd8cff"];
      ctx.fillStyle = enemy.storyEnemy ? storyColors[Number(game.stageId.at(-1)) - 1] : "#ff8659";
      ctx.strokeStyle = enemy.storyEnemy ? "#fff4ba" : "#ffd0ae"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
      ctx.lineTo(enemy.x + enemy.width * 0.34, enemy.y);
      ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.22);
      ctx.lineTo(enemy.x + enemy.width * 0.76, enemy.y + enemy.height);
      ctx.lineTo(enemy.x + enemy.width * 0.25, enemy.y + enemy.height * 0.78);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    if (enemy.hitFlash > 0) {
      ctx.save(); ctx.globalAlpha = enemy.hitFlash / 4; ctx.strokeStyle = "#fff6bc"; ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 14; ctx.lineWidth = 3;
      ctx.strokeRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4); ctx.restore();
    }
    if (enemy.type === "relay-sniper") {
      const age = game.tick - enemy.spawnedTick;
      if (age > 0 && age % 420 < 111) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 112, 52, ${0.28 + Math.sin(age / 5) * 0.14})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y + enemy.height / 2); ctx.lineTo(0, game.player.y); ctx.stroke();
        ctx.restore();
      }
    }
    if (enemy.attackWarning && enemy.type === "strike-arrester") {
      ctx.save(); ctx.strokeStyle = `rgba(255,238,125,${0.3 + Math.sin(game.tick / 5) * 0.16})`; ctx.setLineDash([12,8]); ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(enemy.x + enemy.width/2, 0); ctx.lineTo(enemy.x + enemy.width/2, FIELD_HEIGHT); ctx.stroke(); ctx.restore();
    }
    if (enemy.attackWarning && enemy.type === "logic-binder") {
      ctx.save(); ctx.strokeStyle="rgba(155,240,245,.48)"; ctx.setLineDash([18,10]); ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(enemy.x,enemy.y+enemy.height*.25);ctx.lineTo(0,game.player.y-70);ctx.moveTo(enemy.x,enemy.y+enemy.height*.75);ctx.lineTo(0,game.player.y+70);ctx.stroke();ctx.restore();
    }
  }
  if (!game.boss || game.boss.dead) return;
  const boss = game.boss;
  if (boss.type === "relay-sovereign") {
    drawRelaySovereign(ctx, boss);
    return;
  }
  if (boss.type === "ark-core") {
    drawArkCore(ctx, boss);
    return;
  }
  if (boss.type === "furnace-controller") {
    drawFurnaceController(ctx, boss);
    return;
  }
  if (boss.type === "prism-oracle") {
    drawPrismOracle(ctx, boss);
    return;
  }
  if (boss.type === "refinery-guardian") {
    drawRefineryGuardian(ctx, boss);
    return;
  }
  ctx.save();
  ctx.shadowColor = "#ff713d"; ctx.shadowBlur = 18;
  drawAsset(ctx, "wreck-warden", boss.x, boss.y, boss.width, boss.height, () => {
    ctx.fillStyle = "#812f38"; ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  });
  const weakpoint = bossWeakpoint(boss);
  ctx.shadowColor = boss.attackWarning ? "#ff304f" : "#ffb13b";
  ctx.shadowBlur = boss.attackWarning ? 28 : 16;
  ctx.fillStyle = boss.attackWarning ? "#fff0a6" : "#ff6f38";
  ctx.beginPath(); ctx.arc(weakpoint.x, weakpoint.y, weakpoint.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#551b25";
  ctx.beginPath(); ctx.arc(weakpoint.x, weakpoint.y, 13, 0, Math.PI * 2); ctx.fill();
  for (const shield of bossShieldRects(boss).slice(boss.armorDestroyed ?? 0)) {
    const gradient = ctx.createLinearGradient(shield.x, shield.y, shield.x + shield.width, shield.y + shield.height);
    gradient.addColorStop(0, "#ffd17a"); gradient.addColorStop(0.18, "#843941"); gradient.addColorStop(1, "#321c2b");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#ff9c55";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shield.x + shield.width * .14, shield.y);
    ctx.lineTo(shield.x + shield.width * .88, shield.y + shield.height * .08);
    ctx.lineTo(shield.x + shield.width, shield.y + shield.height * .42);
    ctx.lineTo(shield.x + shield.width * .82, shield.y + shield.height);
    ctx.lineTo(shield.x + shield.width * .08, shield.y + shield.height * .88);
    ctx.lineTo(shield.x, shield.y + shield.height * .28);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,210,137,.42)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(shield.x + shield.width * .18, shield.y + shield.height * .22); ctx.lineTo(shield.x + shield.width * .74, shield.y + shield.height * .72); ctx.stroke();
  }
  if (boss.attackWarning) {
    ctx.strokeStyle = `rgba(255, 62, 77, ${0.35 + Math.sin(boss.age / 5) * 0.2})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, weakpoint.y); ctx.lineTo(weakpoint.x - 34, weakpoint.y); ctx.stroke();
  }
  ctx.restore();
}

function drawRelaySovereign(ctx, boss) {
  ctx.save();
  ctx.shadowColor = boss.attackWarning ? "#ff7a45" : "#745cff";
  ctx.shadowBlur = boss.attackWarning ? 30 : 18;
  drawAsset(ctx, "relay-sovereign", boss.x, boss.y, boss.width, boss.height, () => {
    ctx.fillStyle = "#34264f"; ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  });
  const nodes = [
    { x: boss.x + 62, y: boss.y + 26, width: 55, height: 86 },
    { x: boss.x + 158, y: boss.y + 8, width: 55, height: 94 },
    { x: boss.x + 254, y: boss.y + 42, width: 55, height: 88 }
  ];
  nodes.forEach((node, index) => {
    if (index < boss.nodesDestroyed) return;
    ctx.strokeStyle = index === boss.nodesDestroyed ? "#ffbc58" : "#65e8ff";
    ctx.fillStyle = index === boss.nodesDestroyed ? "rgba(255, 117, 45, 0.42)" : "rgba(83, 210, 255, 0.18)";
    ctx.lineWidth = index === boss.nodesDestroyed ? 5 : 3;
    const cx = node.x + node.width / 2;
    ctx.beginPath();
    ctx.moveTo(cx, node.y);
    ctx.bezierCurveTo(node.x + node.width * .92, node.y + node.height * .18, node.x + node.width, node.y + node.height * .65, cx, node.y + node.height);
    ctx.bezierCurveTo(node.x, node.y + node.height * .65, node.x + node.width * .08, node.y + node.height * .18, cx, node.y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, node.y + 10); ctx.lineTo(cx, node.y + node.height - 10); ctx.stroke();
  });
  const weakpoint = relaySovereignWeakpoint(boss);
  if (boss.nodesDestroyed >= 3) {
    ctx.fillStyle = boss.attackWarning ? "#fff09a" : "#c46aff";
    ctx.strokeStyle = "#65f2ff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(weakpoint.x + weakpoint.width / 2, weakpoint.y + weakpoint.height / 2, weakpoint.width * 0.42, weakpoint.height * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (boss.attackWarning) {
    ctx.strokeStyle = `rgba(255, 102, 62, ${0.4 + Math.sin(boss.age / 5) * 0.2})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, weakpoint.y + weakpoint.height / 2); ctx.lineTo(weakpoint.x, weakpoint.y + weakpoint.height / 2); ctx.stroke();
  }
  ctx.restore();
}

function drawPrismOracle(ctx, boss) {
  ctx.save();
  const cloneOffsets = [-190, 0, 190];
  cloneOffsets.forEach((offset, index) => {
    ctx.globalAlpha = index === boss.realIndex ? 1 : 0.28;
    const y = Math.max(40, Math.min(420, boss.y + offset));
    drawAsset(ctx, "prism-oracle", boss.x, y, boss.width, boss.height, () => {
      ctx.fillStyle = "#164b67"; ctx.fillRect(boss.x, y, boss.width, boss.height);
    });
  });
  ctx.globalAlpha = 1;
  const weakpoint = prismOracleWeakpoint(boss);
  ctx.shadowColor = boss.attackWarning ? "#fff071" : "#ff7a31";
  ctx.shadowBlur = boss.attackWarning ? 28 : 18;
  ctx.fillStyle = boss.attackWarning ? "#fff2a0" : "#ff7738";
  ctx.strokeStyle = "#7dffff"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(weakpoint.x, weakpoint.y + weakpoint.height / 2);
  ctx.lineTo(weakpoint.x + weakpoint.width / 2, weakpoint.y);
  ctx.lineTo(weakpoint.x + weakpoint.width, weakpoint.y + weakpoint.height / 2);
  ctx.lineTo(weakpoint.x + weakpoint.width / 2, weakpoint.y + weakpoint.height);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (boss.attackWarning) {
    ctx.strokeStyle = `rgba(255, 170, 55, ${0.45 + Math.sin(boss.age / 5) * 0.22})`;
    ctx.beginPath(); ctx.moveTo(0, weakpoint.y + weakpoint.height / 2); ctx.lineTo(weakpoint.x, weakpoint.y + weakpoint.height / 2); ctx.stroke();
  }
  ctx.restore();
}

function drawFurnaceController(ctx, boss) {
  ctx.save();
  ctx.shadowColor = boss.attackWarning ? "#fff071" : "#ff4d28";
  ctx.shadowBlur = boss.attackWarning ? 30 : 18;
  drawAsset(ctx, "furnace-controller", boss.x, boss.y, boss.width, boss.height, () => {
    ctx.fillStyle = "#6d281b"; ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  });
  const weakpoint = furnaceControllerWeakpoint(boss);
  ctx.fillStyle = boss.phase === 2 ? "#fff09a" : "#ff6b31";
  ctx.strokeStyle = "#ffd05d"; ctx.lineWidth = 4;
  const coreX = weakpoint.x + weakpoint.width / 2;
  const coreY = weakpoint.y + weakpoint.height / 2;
  ctx.beginPath();
  ctx.ellipse(coreX, coreY, weakpoint.width * 0.32, weakpoint.height * 0.36, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  if (boss.shieldClosed) {
    ctx.fillStyle = "rgba(45, 30, 31, 0.9)"; ctx.strokeStyle = "#ff8a45"; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(coreX - 8, coreY); ctx.lineTo(weakpoint.x - 10, weakpoint.y - 3); ctx.lineTo(weakpoint.x + weakpoint.width + 10, weakpoint.y - 3); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coreX - 8, coreY); ctx.lineTo(weakpoint.x - 10, weakpoint.y + weakpoint.height + 3); ctx.lineTo(weakpoint.x + weakpoint.width + 10, weakpoint.y + weakpoint.height + 3); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  if (boss.attackWarning) {
    ctx.strokeStyle = `rgba(255, 230, 92, ${0.45 + Math.sin(boss.age / 5) * 0.22})`;
    ctx.beginPath(); ctx.moveTo(0, weakpoint.y + weakpoint.height / 2); ctx.lineTo(weakpoint.x, weakpoint.y + weakpoint.height / 2); ctx.stroke();
  }
  ctx.restore();
}

function drawArkCore(ctx, boss) {
  ctx.save();
  ctx.shadowColor = boss.attackWarning ? "#ff5ca8" : "#a66bff";
  ctx.shadowBlur = boss.attackWarning ? 28 : 18;
  drawAsset(ctx, "ark-core", boss.x, boss.y, boss.width, boss.height, () => {
    ctx.fillStyle = "#6f234f"; ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  });
  const weakpoint = arkCoreWeakpoint(boss);
  ctx.fillStyle = boss.phase < 2 ? "rgba(255, 113, 188, 0.72)" : "rgba(183, 101, 255, 0.82)";
  ctx.strokeStyle = boss.attackWarning ? "#fff0a6" : "#ff9dd1";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(weakpoint.x + weakpoint.width / 2, weakpoint.y + weakpoint.height / 2, weakpoint.width / 2, weakpoint.height / 2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  if (boss.attackWarning) {
    ctx.strokeStyle = `rgba(255, 105, 174, ${0.42 + Math.sin(boss.age / 5) * 0.2})`;
    ctx.beginPath(); ctx.moveTo(0, weakpoint.y + weakpoint.height / 2); ctx.lineTo(weakpoint.x, weakpoint.y + weakpoint.height / 2); ctx.stroke();
  }
  ctx.restore();
}

function drawRefineryGuardian(ctx, boss) {
  ctx.save();
  ctx.shadowColor = boss.attackWarning ? "#ffe064" : "#ff713d";
  ctx.shadowBlur = boss.attackWarning ? 28 : 18;
  drawAsset(ctx, "refinery-guardian", boss.x, boss.y, boss.width, boss.height, () => {
    ctx.fillStyle = "#724735"; ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  });
  const coreX = boss.x + 64;
  const coreY = boss.y + boss.height / 2;
  ctx.fillStyle = boss.attackWarning ? "#fff0a6" : "#ff7b37";
  ctx.beginPath(); ctx.arc(coreX, coreY, 25, 0, Math.PI * 2); ctx.fill();
  if (boss.valvesOpened < 2) {
    const valve = refineryValveWeakpoint(boss);
    ctx.fillStyle = "rgba(76,188,205,.55)"; ctx.strokeStyle = "#d4f4e9"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(valve.x + valve.width/2, valve.y + valve.height/2, 24, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    for(let spoke=0;spoke<4;spoke+=1){ctx.save();ctx.translate(valve.x+valve.width/2,valve.y+valve.height/2);ctx.rotate(spoke*Math.PI/2+boss.age/35);ctx.fillRect(18,-3,18,6);ctx.restore();}
  }
  if (boss.shuttersClosed) {
    ctx.fillStyle = "#263b42";
    ctx.strokeStyle = "#ffc05b";
    ctx.lineWidth = 4;
    ctx.fillRect(boss.x + 18, boss.y + 6, 106, 46);
    ctx.strokeRect(boss.x + 18, boss.y + 6, 106, 46);
    ctx.fillRect(boss.x + 18, boss.y + boss.height - 52, 106, 46);
    ctx.strokeRect(boss.x + 18, boss.y + boss.height - 52, 106, 46);
  }
  if (boss.attackWarning) {
    ctx.strokeStyle = `rgba(255, 224, 82, ${0.45 + Math.sin(boss.age / 5) * 0.22})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, coreY); ctx.lineTo(coreX - 28, coreY); ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, game) {
  const loadout = reactorLoadout(game.cores);
  ctx.fillStyle = "#07101a";
  ctx.fillRect(0, FIELD_HEIGHT, WIDTH, 80);
  ctx.fillStyle = "#2b6073";
  ctx.fillRect(0, FIELD_HEIGHT, WIDTH, 3);
  ctx.fillStyle = "#bcefff";
  ctx.font = "bold 18px Arial";
  ctx.textBaseline = "middle";
  ctx.fillText("SCORE", 34, 744);
  ctx.fillText("HI-SCORE", 158, 744);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px monospace";
  ctx.fillText(String(game.score).padStart(8, "0"), 34, 774);
  ctx.fillStyle = "#ffcf67";
  ctx.fillText(String(game.highScore ?? 0).padStart(8, "0"), 158, 774);
  ctx.fillStyle = "#bcefff";
  ctx.font = "bold 18px Arial";
  ctx.fillText("LIVES", 302, 744);
  ctx.fillStyle = "#ffdf61";
  ctx.font = "bold 26px monospace";
  ctx.fillText(`× ${game.lives}`, 302, 774);
  ctx.fillStyle = "#bcefff";
  ctx.font = "bold 18px Arial";
  ctx.fillText("REACTOR", 450, 744);
  for (let i = 0; i < 3; i += 1) {
    const color = game.cores[i];
    ctx.fillStyle = color === "red" ? "#a82e31" : color === "blue" ? "#235f9b" : color === "yellow" ? "#a17e21" : "#0c1b25";
    ctx.fillRect(450 + i * 46, 758, 34, 27);
    ctx.strokeStyle = i === 0 && color ? "#f2fbff" : "#426477";
    ctx.lineWidth = 2;
    ctx.strokeRect(450 + i * 46, 758, 34, 27);
    if (color) {
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px Arial";
      ctx.fillText(color === "red" ? "I" : color === "blue" ? "+" : "◎", 461 + i * 46, 772);
    }
  }
  ctx.fillStyle = loadout.color === "red" ? "#ff8177" : loadout.color === "blue" ? "#6ebcff" : loadout.color === "yellow" ? "#ffe36e" : "#78f4ff";
  ctx.font = "bold 21px Arial";
  ctx.fillText(loadout.level ? `${loadout.weapon} Lv${loadout.level}` : "PULSE", 610, 770);
  ctx.fillStyle = "#bcefff"; ctx.font = "bold 14px Arial";
  ctx.fillText("OPTION", 755, 742);
  ctx.fillStyle = game.options ? "#fff08a" : "#58717c"; ctx.font = "bold 17px monospace";
  ctx.fillText(`${game.options} ${game.optionFormation.toUpperCase()}`, 755, 769);
  if (game.barrier > 0 || game.overdriveTicks > 0) {
    ctx.fillStyle = "#8ff7ff"; ctx.font = "bold 13px Arial";
    ctx.fillText(`${game.barrier ? `BARRIER×${game.barrier}` : ""}${game.barrier && game.overdriveTicks ? "  " : ""}${game.overdriveTicks ? "RAPID" : ""}`, 755, 789);
  }
  if (game.boss && !game.boss.dead) {
    ctx.fillStyle = "#bcefff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(game.boss.type === "relay-sovereign" ? "RELAY SOVEREIGN" : game.boss.type === "prism-oracle" ? "PRISM ORACLE" : game.boss.type === "furnace-controller" ? "FURNACE CONTROLLER" : game.boss.type === "ark-core" ? "ARK CORE" : game.boss.type === "refinery-guardian" ? "REFINERY GUARDIAN" : "WRECK WARDEN", 930, 744);
    ctx.fillStyle = "#162b35";
    ctx.fillRect(930, 762, 310, 18);
    ctx.fillStyle = "#ff724e";
    ctx.fillRect(930, 762, 310 * Math.max(0, game.boss.hp / game.boss.maxHp), 18);
    ctx.fillStyle = bossWeakpointIsOpen(game.boss) ? "#9fffb4" : "#ffcf67"; ctx.font = "bold 10px Arial";
    ctx.fillText(game.boss.strategy?.label ?? "FIND THE WEAKPOINT", 930, 794);
  } else if (["playing", "stage-intro"].includes(game.screen)) {
    ctx.fillStyle = "#ffcf67"; ctx.font = "bold 13px Arial"; ctx.fillText(game.sectionTitle, 930, 744);
    ctx.fillStyle = "#bcefff"; ctx.font = "13px Arial"; ctx.fillText(game.missionObjective, 930, 771);
  }
}

function drawTitle(ctx, game) {
  ctx.fillStyle = "#dffaff";
  ctx.textAlign = "center";
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#35dcff";
  ctx.font = "900 64px Arial Narrow, Arial";
  ctx.fillText("SHOOT MATA", WIDTH / 2, 265);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffb64f";
  ctx.font = "bold 31px Arial";
  ctx.fillText("R E L A Y   B R E A K E R   v3.4", WIDTH / 2, 315);
  ctx.fillStyle = "#94bccc";
  ctx.font = "20px Arial";
  ctx.fillText("A 90s ARCADE SIDE-SCROLLING SHOOTER", WIDTH / 2, 386);
  ctx.fillStyle = "#020814c9";
  ctx.fillRect(420, 448, 440, 200);
  ctx.strokeStyle = "#315b73";
  ctx.lineWidth = 2;
  ctx.strokeRect(420, 448, 440, 200);
  ctx.fillStyle = "#eafcff";
  ctx.font = "bold 24px Arial";
  ctx.fillText("PRESS ENTER", WIDTH / 2, 493);
  ctx.fillStyle = "#a9cfdd";
  ctx.font = "bold 18px Arial";
  ctx.fillText(`A  DIFFICULTY: ${game.difficulty === "assist" ? "ASSIST" : "STANDARD"}`, WIDTH / 2, 535);
  ctx.fillText("S  SOUND SETTINGS", WIDTH / 2, 575);
  ctx.fillText("T  STAGE SELECT", WIDTH / 2, 615);
  if (game.audioSettingsOpen) drawAudioSettings(ctx, game);
  ctx.textAlign = "start";
}

function drawStageSelect(ctx, game) {
  ctx.fillStyle = "#020814f2";
  ctx.fillRect(270, 70, 740, 580);
  ctx.strokeStyle = "#65dcf5";
  ctx.lineWidth = 3;
  ctx.strokeRect(270, 70, 740, 580);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcf67";
  ctx.font = "bold 40px Arial";
  ctx.fillText("STAGE SELECT", WIDTH / 2, 132);
  const names = ["ORBITAL WRECK", "CLOUD REFINERY", "LIVING ARK", "STELLAR FURNACE", "CRYSTAL COMPUTATION SEA", "ZERO-POINT RELAY CORE"];
  names.forEach((name, index) => {
    const unlocked = index < game.unlockedStage;
    const selected = index === game.selectedStageIndex;
    ctx.fillStyle = !unlocked ? "#3f5662" : selected ? "#ffcf67" : "#bdeeff";
    ctx.font = selected ? "bold 23px monospace" : "21px monospace";
    ctx.fillText(`${selected ? "▶" : " "} ${String(index + 1).padStart(2, "0")}  ${unlocked ? name : "LOCKED"}`, WIDTH / 2, 205 + index * 58);
  });
  ctx.fillStyle = "#8aabba";
  ctx.font = "17px Arial";
  ctx.fillText("↑↓ SELECT   ENTER PRACTICE   ESC BACK", WIDTH / 2, 590);
  ctx.textAlign = "start";
}

function drawAudioSettings(ctx, game) {
  const settings = game.audioSettings ?? { bgmVolume: 0.65, sfxVolume: 0.45 };
  ctx.fillStyle = "#020814f2";
  ctx.fillRect(350, 165, 580, 390);
  ctx.strokeStyle = "#65dcf5";
  ctx.lineWidth = 3;
  ctx.strokeRect(350, 165, 580, 390);
  ctx.fillStyle = "#e7fbff";
  ctx.font = "bold 34px Arial";
  ctx.fillText("SOUND SETTINGS", WIDTH / 2, 225);
  const rows = [["BGM", settings.bgmVolume], ["SFX", settings.sfxVolume]];
  rows.forEach(([label, volume], index) => {
    const y = 310 + index * 92;
    ctx.fillStyle = game.audioSettingRow === index ? "#ffcf67" : "#bdeeff";
    ctx.font = "bold 23px Arial";
    ctx.fillText(`${game.audioSettingRow === index ? "▶ " : "  "}${label}`, 445, y);
    ctx.fillStyle = "#173344";
    ctx.fillRect(550, y - 17, 270, 24);
    ctx.fillStyle = index === 0 ? "#48cbed" : "#ff9e4a";
    ctx.fillRect(550, y - 17, 270 * volume, 24);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 21px monospace";
    ctx.fillText(String(Math.round(volume * 100)).padStart(3, " "), 860, y);
  });
  ctx.fillStyle = "#8aabba";
  ctx.font = "17px Arial";
  ctx.fillText("↑↓ SELECT   ←→ ADJUST   ENTER / ESC BACK", WIDTH / 2, 500);
}

function drawNotice(ctx, title, subtitle) {
  ctx.fillStyle = "#020814d9";
  ctx.fillRect(0, 282, WIDTH, 150);
  ctx.textAlign = "center";
  ctx.fillStyle = "#e7fbff";
  ctx.font = "bold 42px Arial";
  ctx.fillText(title, WIDTH / 2, 345);
  ctx.fillStyle = "#ffbd61";
  ctx.font = "bold 22px Arial";
  ctx.fillText(subtitle, WIDTH / 2, 388);
  ctx.textAlign = "start";
}

function drawResult(ctx, game) {
  ctx.fillStyle = "#020814e8";
  ctx.fillRect(330, 95, 620, 540);
  ctx.strokeStyle = "#65dcf5";
  ctx.lineWidth = 3;
  ctx.strokeRect(330, 95, 620, 540);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcf67";
  ctx.font = "bold 44px Arial";
  ctx.fillText("STAGE CLEAR", WIDTH / 2, 165);
  ctx.fillStyle = "#bdeeff";
  ctx.font = "20px monospace";
  const rows = [
    ["DEFEAT", game.scoreBreakdown.defeat], ["CORE", game.scoreBreakdown.pickup],
    ["CHAIN", game.scoreBreakdown.chain], ["CLEAR", game.scoreBreakdown.clear],
    ["NO MISS", game.scoreBreakdown.noMiss]
  ];
  rows.forEach(([label, value], index) => ctx.fillText(`${label.padEnd(9, " ")} ${String(value).padStart(7, "0")}`, WIDTH / 2, 225 + index * 42));
  ctx.strokeStyle = "#386577";
  ctx.beginPath(); ctx.moveTo(440, 440); ctx.lineTo(840, 440); ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 25px monospace";
  ctx.fillText(`STAGE  ${String(game.score - game.stageStartScore).padStart(8, "0")}`, WIDTH / 2, 480);
  ctx.fillStyle = "#7499aa";
  ctx.font = "18px Arial";
  ctx.fillText(`RUN ${String(game.score).padStart(8, "0")}  /  MAX CHAIN ${game.maxKillChain}  /  ${game.coresCollected} CORES`, WIDTH / 2, 525);
  ctx.fillStyle = "#8defff"; ctx.font = "bold 16px Arial";
  ctx.fillText(`${game.storyEventsCompleted}/5 EVENTS  ·  ${game.storyOutcome}`, WIDTH / 2, 554);
  ctx.fillStyle = "#bdeeff";
  ctx.font = "bold 18px Arial";
  const nextLabel = game.practiceMode ? "ENTER / ESC  TITLE" : game.stageId === "stage-06" ? "ENTER  ENDING" : "ENTER  NEXT STAGE   ESC  TITLE";
  ctx.fillText(nextLabel, WIDTH / 2, 600);
  ctx.textAlign = "start";
}

function drawHowToPlay(ctx) {
  ctx.fillStyle = "#020814f2";
  ctx.fillRect(250, 85, 780, 550);
  ctx.strokeStyle = "#65dcf5";
  ctx.lineWidth = 3;
  ctx.strokeRect(250, 85, 780, 550);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcf67";
  ctx.font = "bold 42px Arial";
  ctx.fillText("HOW TO PLAY", WIDTH / 2, 155);
  ctx.fillStyle = "#e7fbff";
  ctx.font = "bold 23px Arial";
  ctx.fillText("MOVE", 350, 235); ctx.fillText("FIRE", 560, 235); ctx.fillText("FORMATION", 770, 235); ctx.fillText("PAUSE", 940, 235);
  ctx.fillStyle = "#8ddff0";
  ctx.font = "20px monospace";
  ctx.fillText("ARROWS / WASD", 350, 278); ctx.fillText("Z / SPACE", 560, 278); ctx.fillText("X / SHIFT", 770, 278); ctx.fillText("P", 940, 278);
  ctx.fillStyle = "#ff8a62";
  ctx.font = "bold 21px Arial";
  ctx.fillText("TERRAIN CONTACT COSTS ONE LIFE", WIDTH / 2, 355);
  ctx.fillStyle = "#bdeeff";
  ctx.font = "19px Arial";
  ctx.fillText("POWER-UPS AND REACTOR CORES CARRY INTO THE NEXT STAGE.", WIDTH / 2, 418);
  for (const [x, color, label] of [[530, "#e94b4b", "LANCE"], [640, "#3ca8ff", "SPREAD"], [750, "#f1d84c", "SEEKER"]]) {
    ctx.fillStyle = color; ctx.fillRect(x - 20, 455, 40, 32);
    ctx.fillStyle = "#dffaff"; ctx.font = "15px Arial"; ctx.fillText(label, x, 515);
  }
  ctx.fillStyle = "#8defff"; ctx.font = "bold 16px Arial";
  ctx.fillText("O: OPTION MAX 4   B: BARRIER   R: RAPID   ·   X: TRACE / WIDE / FOCUS", WIDTH / 2, 552);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText("ENTER  START   ESC  TITLE", WIDTH / 2, 605);
  ctx.textAlign = "start";
}

function drawSectionChange(ctx, game) {
  ctx.save(); ctx.globalAlpha = Math.min(1, game.sectionBannerTicks / 20);
  ctx.fillStyle = "rgba(2, 8, 20, 0.78)"; ctx.fillRect(350, 36, 580, 86);
  ctx.strokeStyle = "#66e7ff"; ctx.strokeRect(350, 36, 580, 86);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#8defff"; ctx.font = "bold 13px Arial"; ctx.fillText(`MISSION ${game.missionBeat}`, WIDTH / 2, 56);
  ctx.fillStyle = "#fff1a0"; ctx.font = "bold 23px Arial"; ctx.fillText(game.sectionTitle, WIDTH / 2, 81);
  ctx.fillStyle = "#dffaff"; ctx.font = "15px Arial"; ctx.fillText(game.missionObjective, WIDTH / 2, 106); ctx.restore();
}

function drawStoryEvent(ctx, game) {
  const fade = Math.min(1, game.eventBannerTicks / 18, (150 - game.eventBannerTicks + 1) / 12);
  ctx.save(); ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(2, 8, 20, .88)"; ctx.fillRect(48, 468, 650, 124);
  ctx.strokeStyle = "#ffce62"; ctx.lineWidth = 3; ctx.strokeRect(48, 468, 650, 124);
  ctx.fillStyle = "#ffce62"; ctx.font = "bold 14px Arial"; ctx.fillText(`${game.commSpeaker} // ${game.commTitle}`, 72, 497);
  ctx.fillStyle = "#f4fbff"; ctx.font = "bold 20px Arial"; ctx.fillText(game.commMessage, 72, 531);
  ctx.fillStyle = "#8defff"; ctx.font = "15px Arial"; ctx.fillText(`OBJECTIVE: ${game.missionObjective}`, 72, 563);
  ctx.restore();
}

function drawChain(ctx, game) {
  ctx.save(); ctx.textAlign = "right"; ctx.globalAlpha = Math.min(1, game.chainTicks / 25);
  ctx.fillStyle = "#fff29a"; ctx.shadowColor = "#ff7a32"; ctx.shadowBlur = 18;
  ctx.font = "900 34px Arial"; ctx.fillText(`${game.killChain} CHAIN`, 1230, 158);
  ctx.restore();
}

function drawContinue(ctx) {
  drawNotice(ctx, "CONTINUE?", "ENTER: RETRY STAGE   ESC: TITLE");
}

function drawEnding(ctx, game) {
  const glow = ctx.createRadialGradient(WIDTH / 2, 330, 30, WIDTH / 2, 330, 560);
  glow.addColorStop(0, "rgba(102, 242, 255, 0.36)"); glow.addColorStop(0.45, "rgba(105, 69, 204, 0.2)"); glow.addColorStop(1, "rgba(1, 5, 16, 0.94)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, FIELD_HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = "#eafcff"; ctx.shadowColor = "#5eeaff"; ctx.shadowBlur = 24; ctx.font = "900 46px Arial";
  ctx.fillText("THE RELAY IS SILENT", WIDTH / 2, 205);
  ctx.shadowBlur = 0; ctx.fillStyle = "#b9dce8"; ctx.font = "21px Arial";
  ctx.fillText("MATA-03 escapes as the broken route opens to the stars.", WIDTH / 2, 292);
  ctx.fillText("The defense network releases every world it held in isolation.", WIDTH / 2, 332);
  ctx.fillStyle = "#ffcf67"; ctx.font = "bold 24px monospace";
  ctx.fillText(`FINAL SCORE  ${String(game.score).padStart(8, "0")}`, WIDTH / 2, 425);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 19px Arial"; ctx.fillText("PRESS ENTER", WIDTH / 2, 545);
  ctx.textAlign = "start";
}

function drawCredits(ctx, game) {
  ctx.fillStyle = "rgba(2, 7, 20, 0.88)"; ctx.fillRect(0, 0, WIDTH, FIELD_HEIGHT);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcf67"; ctx.font = "bold 42px Arial"; ctx.fillText("RELAY BREAKER", WIDTH / 2, 145);
  ctx.fillStyle = "#dffaff"; ctx.font = "bold 24px Arial"; ctx.fillText("MISSION COMPLETE", WIDTH / 2, 210);
  ctx.fillStyle = "#8fc9da"; ctx.font = "19px Arial";
  ctx.fillText("DESIGN / CODE / ART DIRECTION / AUDIO", WIDTH / 2, 320);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 23px Arial"; ctx.fillText("SHOOT MATA AUTONOMOUS PRODUCTION", WIDTH / 2, 360);
  ctx.fillStyle = "#8fc9da"; ctx.font = "18px Arial"; ctx.fillText("ORIGINAL PRODUCTION · ARCHIVED V02 ASSETS REUSED WHERE DOCUMENTED", WIDTH / 2, 430);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 19px Arial"; ctx.fillText("ENTER / ESC  TITLE", WIDTH / 2, 565);
  ctx.textAlign = "start";
}

function drawAsset(ctx, id, x, y, width, height, fallback) {
  const image = images.get(id);
  if (image?.complete && image.naturalWidth > 0) ctx.drawImage(image, x, y, width, height);
  else fallback?.();
}
