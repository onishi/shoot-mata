import { visibleTerrain } from "../content/stage-01.mjs";
import { BACKGROUND_LAYERS, IMAGE_ASSETS } from "../content/assets.mjs";
import { bossShieldRects, bossWeakpoint, reactorLoadout } from "../core/game.mjs";

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
  drawBackground(ctx, game.scrollX);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, FIELD_HEIGHT);
  ctx.clip();

  if (game.screen === "title") drawTitle(ctx, game);
  else {
    drawTerrain(ctx, game);
    drawBullets(ctx, game);
    drawEnemyBullets(ctx, game);
    drawPickups(ctx, game);
    drawEnemies(ctx, game);
    drawPlayer(ctx, game);
    if (game.screen === "stage-intro") drawNotice(ctx, "STAGE 1", "ORBITAL WRECK");
    if (game.screen === "stage-result") drawResult(ctx, game);
    if (game.paused) drawNotice(ctx, "PAUSE", "PRESS P TO RESUME");
  }
  ctx.restore();
  drawHud(ctx, game);
  ctx.restore();
}

function drawBackground(ctx, scrollX) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
  gradient.addColorStop(0, "#071122");
  gradient.addColorStop(0.55, "#10213a");
  gradient.addColorStop(1, "#07101d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, FIELD_HEIGHT);

  for (const layer of BACKGROUND_LAYERS) drawCrossfadedLayer(ctx, images.get(layer.asset), scrollX, layer);

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
  for (const item of visibleTerrain(game.scrollX, game.destroyedTerrain)) {
    const x = item.screenX;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, item.y, item.width, item.height);
    ctx.clip();
    const gradient = ctx.createLinearGradient(x, item.y, x, item.y + item.height);
    gradient.addColorStop(0, item.kind === "destructible-wreck" ? "#a95c35" : "#617983");
    gradient.addColorStop(0.1, "#263947");
    gradient.addColorStop(0.55, "#111f2a");
    gradient.addColorStop(1, "#07111a");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, item.y, item.width, item.height);

    ctx.fillStyle = "rgba(118, 155, 169, 0.16)";
    for (let panelX = 12; panelX < item.width; panelX += 82) {
      ctx.fillRect(x + panelX, item.y + 14, 58, Math.max(18, item.height - 28));
      ctx.strokeStyle = "rgba(158, 216, 228, 0.23)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + panelX, item.y + 14, 58, Math.max(18, item.height - 28));
      ctx.fillStyle = panelX % 164 === 12 ? "#ff9c42" : "#5bb3c5";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillRect(x + panelX + 8, item.y + 23, 5, 5);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(118, 155, 169, 0.16)";
    }

    ctx.strokeStyle = item.kind === "destructible-wreck" ? "#b86238" : "#315a69";
    ctx.lineWidth = 5;
    for (let rib = 18; rib < item.width; rib += 64) {
      ctx.beginPath();
      ctx.moveTo(x + rib - 20, item.y);
      ctx.lineTo(x + rib + 20, item.y + item.height);
      ctx.stroke();
    }

    if (item.kind === "destructible-wreck") {
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

    ctx.strokeStyle = item.kind === "destructible-wreck" ? "#ffb35f" : "#9eeeff";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, item.y + 2, item.width - 4, item.height - 4);
    ctx.shadowBlur = 0;
  }
}

function drawEnemyBullets(ctx, game) {
  for (const bullet of game.enemyBullets) {
    ctx.save();
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
  }
  if (!game.boss || game.boss.dead) return;
  const boss = game.boss;
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
    ctx.fillText("WRECK WARDEN", 880, 744);
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
  ctx.fillStyle = "#eafcff";
  ctx.font = "bold 24px Arial";
  ctx.fillText("PRESS ENTER", WIDTH / 2, 505);
  ctx.fillStyle = "#83aabb";
  ctx.font = "bold 18px Arial";
  ctx.fillText("S  SOUND SETTINGS", WIDTH / 2, 552);
  if (game.audioSettingsOpen) drawAudioSettings(ctx, game);
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
  ctx.fillRect(330, 150, 620, 410);
  ctx.strokeStyle = "#65dcf5";
  ctx.lineWidth = 3;
  ctx.strokeRect(330, 150, 620, 410);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcf67";
  ctx.font = "bold 44px Arial";
  ctx.fillText("STAGE CLEAR", WIDTH / 2, 232);
  ctx.fillStyle = "#bdeeff";
  ctx.font = "22px monospace";
  ctx.fillText(`SCORE  ${String(game.score).padStart(8, "0")}`, WIDTH / 2, 322);
  ctx.fillText(`PULSE  ${game.pulseShots}`, WIDTH / 2, 368);
  ctx.fillStyle = "#7499aa";
  ctx.font = "18px Arial";
  ctx.fillText(`${reactorLoadout(game.cores).weapon} / ${game.coresCollected} CORES COLLECTED`, WIDTH / 2, 486);
  ctx.textAlign = "start";
}

function drawAsset(ctx, id, x, y, width, height, fallback) {
  const image = images.get(id);
  if (image?.complete && image.naturalWidth > 0) ctx.drawImage(image, x, y, width, height);
  else fallback?.();
}
