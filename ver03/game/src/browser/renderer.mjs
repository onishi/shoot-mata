import { visibleTerrainFor } from "../content/stages.mjs";
import { BACKGROUND_LAYERS, IMAGE_ASSETS, STAGE_02_BACKGROUND_LAYERS, STAGE_03_BACKGROUND_LAYERS, STAGE_04_BACKGROUND_LAYERS, STAGE_05_BACKGROUND_LAYERS, STAGE_06_BACKGROUND_LAYERS } from "../content/assets.mjs";
import { arkCoreWeakpoint, bossShieldRects, bossWeakpoint, furnaceControllerWeakpoint, prismOracleWeakpoint, reactorLoadout, relaySovereignWeakpoint } from "../core/game.mjs";

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
    drawTerrain(ctx, game);
    drawBullets(ctx, game);
    drawEnemyBullets(ctx, game);
    drawPickups(ctx, game);
    drawEnemies(ctx, game);
    drawPlayer(ctx, game);
    if (game.screen === "stage-intro") {
      const intro = game.stageId === "stage-06" ? ["FINAL STAGE", "ZERO-POINT RELAY CORE"] : game.stageId === "stage-05" ? ["STAGE 5", "CRYSTAL COMPUTATION SEA"] : game.stageId === "stage-04" ? ["STAGE 4", "STELLAR FURNACE"] : game.stageId === "stage-03" ? ["STAGE 3", "LIVING ARK"] : game.stageId === "stage-02" ? ["STAGE 2", "CLOUD REFINERY"] : ["STAGE 1", "ORBITAL WRECK"];
      drawNotice(ctx, ...intro);
    }
    if (game.screen === "stage-result") drawResult(ctx, game);
    if (game.screen === "continue") drawContinue(ctx);
    if (game.paused) drawNotice(ctx, "PAUSE", "PRESS P TO RESUME");
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
    ctx.rect(x, item.y, item.width, item.height);
    ctx.clip();
    const gradient = ctx.createLinearGradient(x, item.y, x, item.y + item.height);
    gradient.addColorStop(0, relay ? "#abf7ff" : crystal ? "#a9ffff" : stellar ? "#ffc066" : living ? "#d7a8a0" : item.kind === "destructible-wreck" ? "#a95c35" : refinery ? "#d2c49f" : "#617983");
    gradient.addColorStop(0.1, relay ? "#4e4c8c" : crystal ? "#277d91" : stellar ? "#6f3322" : living ? "#743653" : refinery ? "#52696c" : "#263947");
    gradient.addColorStop(0.55, relay ? "#211938" : crystal ? "#17304e" : stellar ? "#291719" : living ? "#3b152c" : refinery ? "#1d363c" : "#111f2a");
    gradient.addColorStop(1, relay ? "#080817" : crystal ? "#080d27" : stellar ? "#10090b" : living ? "#180b18" : refinery ? "#0b2028" : "#07111a");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, item.y, item.width, item.height);

    ctx.fillStyle = living ? "rgba(246, 124, 170, 0.15)" : "rgba(118, 155, 169, 0.16)";
    for (let panelX = 12; panelX < item.width; panelX += 82) {
      ctx.fillRect(x + panelX, item.y + 14, 58, Math.max(18, item.height - 28));
      ctx.strokeStyle = living ? "rgba(255, 164, 191, 0.3)" : "rgba(158, 216, 228, 0.23)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + panelX, item.y + 14, 58, Math.max(18, item.height - 28));
      ctx.fillStyle = living ? (panelX % 164 === 12 ? "#ff9e57" : "#b151dc") : panelX % 164 === 12 ? "#ff9c42" : "#5bb3c5";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillRect(x + panelX + 8, item.y + 23, 5, 5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = living ? "rgba(246, 124, 170, 0.15)" : "rgba(118, 155, 169, 0.16)";
    }

    ctx.strokeStyle = item.kind === "destructible-cyst" ? "#bf4f77" : living ? "#6e294d" : item.kind === "destructible-wreck" ? "#b86238" : refinery ? "#9b613d" : "#315a69";
    ctx.lineWidth = 5;
    for (let rib = 18; rib < item.width; rib += 64) {
      ctx.beginPath();
      ctx.moveTo(x + rib - 20, item.y);
      ctx.lineTo(x + rib + 20, item.y + item.height);
      ctx.stroke();
    }

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

    ctx.strokeStyle = item.warning ? "#fff071" : relay ? (item.kind === "destructible-relay" ? "#ff9b4d" : item.kind === "phase-wall" ? "#c778ff" : "#59e9ff") : crystal ? (item.kind === "freeze-gate" ? "#a8ffff" : "#52e9e1") : item.kind === "heat-wave" ? "#ff472f" : item.kind === "destructible-shield" ? "#ffb95f" : stellar ? "#ff7147" : item.kind === "destructible-cyst" ? "#ff89c8" : living ? "#e779b5" : item.kind === "charged-wall" ? "#72f4ff" : item.kind === "destructible-wreck" ? "#ffb35f" : refinery ? "#ffc16a" : "#9eeeff";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = item.warning ? 22 : 10;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, item.y + 2, item.width - 4, item.height - 4);
    ctx.shadowBlur = 0;
    if (item.warning) {
      ctx.fillStyle = `rgba(255, 206, 70, ${0.12 + Math.sin(game.tick / 5) * 0.06})`;
      ctx.fillRect(x, item.y, item.width, item.height);
    }
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
    ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
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
  ctx.restore();
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
    ctx.shadowColor = pickup.color === "red" ? "#ff443f" : pickup.color === "blue" ? "#39aaff" : "#ffe24e";
    drawAsset(ctx, `core-${pickup.color}`, pickup.x - 25, pickup.y - 25 + bob, 50, 50);
    ctx.restore();
  }
}

function drawEnemies(ctx, game) {
  for (const enemy of game.enemies) {
    drawAsset(ctx, enemy.type, enemy.x, enemy.y, enemy.width, enemy.height, () => {
      ctx.fillStyle = "#ff8659"; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
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
  for (const shield of bossShieldRects(boss)) {
    const gradient = ctx.createLinearGradient(shield.x, shield.y, shield.x + shield.width, shield.y + shield.height);
    gradient.addColorStop(0, "#ffd17a"); gradient.addColorStop(0.18, "#843941"); gradient.addColorStop(1, "#321c2b");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#ff9c55";
    ctx.lineWidth = 4;
    ctx.fillRect(shield.x, shield.y, shield.width, shield.height);
    ctx.strokeRect(shield.x, shield.y, shield.width, shield.height);
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
    ctx.fillRect(node.x, node.y, node.width, node.height);
    ctx.strokeRect(node.x, node.y, node.width, node.height);
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
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px monospace";
  ctx.fillText(String(game.score).padStart(8, "0"), 34, 774);
  ctx.fillStyle = "#bcefff";
  ctx.font = "bold 18px Arial";
  ctx.fillText("LIVES", 270, 744);
  ctx.fillStyle = "#ffdf61";
  ctx.font = "bold 26px monospace";
  ctx.fillText(`× ${game.lives}`, 270, 774);
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
  if (game.boss && !game.boss.dead) {
    ctx.fillStyle = "#bcefff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(game.boss.type === "relay-sovereign" ? "RELAY SOVEREIGN" : game.boss.type === "prism-oracle" ? "PRISM ORACLE" : game.boss.type === "furnace-controller" ? "FURNACE CONTROLLER" : game.boss.type === "ark-core" ? "ARK CORE" : game.boss.type === "refinery-guardian" ? "REFINERY GUARDIAN" : "WRECK WARDEN", 880, 744);
    ctx.fillStyle = "#162b35";
    ctx.fillRect(880, 762, 360, 18);
    ctx.fillStyle = "#ff724e";
    ctx.fillRect(880, 762, 360 * Math.max(0, game.boss.hp / game.boss.maxHp), 18);
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
  ctx.fillText("R E L A Y   B R E A K E R", WIDTH / 2, 315);
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
  ctx.fillStyle = "#bdeeff";
  ctx.font = "bold 18px Arial";
  const nextLabel = game.practiceMode ? "ENTER / ESC  TITLE" : game.stageId === "stage-06" ? "ENTER  ENDING" : "ENTER  NEXT STAGE   ESC  TITLE";
  ctx.fillText(nextLabel, WIDTH / 2, 585);
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
  ctx.fillText("MOVE", 410, 235); ctx.fillText("FIRE", 640, 235); ctx.fillText("PAUSE", 870, 235);
  ctx.fillStyle = "#8ddff0";
  ctx.font = "20px monospace";
  ctx.fillText("ARROWS / WASD", 410, 278); ctx.fillText("Z / SPACE", 640, 278); ctx.fillText("P", 870, 278);
  ctx.fillStyle = "#ff8a62";
  ctx.font = "bold 21px Arial";
  ctx.fillText("TERRAIN CONTACT COSTS ONE LIFE", WIDTH / 2, 355);
  ctx.fillStyle = "#bdeeff";
  ctx.font = "19px Arial";
  ctx.fillText("PULSE ALWAYS FIRES. COLLECT UP TO 3 CORES.", WIDTH / 2, 418);
  for (const [x, color, label] of [[530, "#e94b4b", "LANCE"], [640, "#3ca8ff", "SPREAD"], [750, "#f1d84c", "SEEKER"]]) {
    ctx.fillStyle = color; ctx.fillRect(x - 20, 455, 40, 32);
    ctx.fillStyle = "#dffaff"; ctx.font = "15px Arial"; ctx.fillText(label, x, 515);
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Arial";
  ctx.fillText("ENTER  START   ESC  TITLE", WIDTH / 2, 585);
  ctx.textAlign = "start";
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
