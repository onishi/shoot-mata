import { visibleTerrain } from "../content/stage-01.mjs";

const WIDTH = 1280;
const FIELD_HEIGHT = 720;

export function render(ctx, game) {
  ctx.save();
  ctx.clearRect(0, 0, WIDTH, 800);
  drawBackground(ctx, game.scrollX);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, FIELD_HEIGHT);
  ctx.clip();

  if (game.screen === "title") drawTitle(ctx);
  else {
    drawTerrain(ctx, game);
    drawBullets(ctx, game);
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

  ctx.fillStyle = "#b8e9ff";
  for (let i = 0; i < 70; i += 1) {
    const x = ((i * 193 - scrollX * 0.08) % 1400 + 1400) % 1400 - 60;
    const y = 36 + ((i * 89) % 620);
    ctx.globalAlpha = 0.25 + (i % 4) * 0.12;
    ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 310 - scrollX * 0.23) % 1700 + 1700) % 1700 - 240;
    const y = 100 + (i * 137) % 480;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(i * 0.37);
    ctx.strokeStyle = "#2d5067";
    ctx.lineWidth = 13;
    ctx.strokeRect(-90, -28, 180, 56);
    ctx.strokeStyle = "#142b3e";
    ctx.lineWidth = 5;
    ctx.strokeRect(-68, -12, 136, 24);
    ctx.restore();
  }
}

function drawTerrain(ctx, game) {
  for (const item of visibleTerrain(game.scrollX)) {
    const x = item.screenX;
    const gradient = ctx.createLinearGradient(x, item.y, x, item.y + item.height);
    gradient.addColorStop(0, "#6f8d97");
    gradient.addColorStop(0.08, "#223d4b");
    gradient.addColorStop(0.7, "#122635");
    gradient.addColorStop(1, "#091722");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, item.y, item.width, item.height);
    ctx.strokeStyle = "#9eeeff";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, item.y + 2, item.width - 4, item.height - 4);
    ctx.strokeStyle = "#3e7888";
    ctx.lineWidth = 2;
    for (let rib = 26; rib < item.width; rib += 54) {
      ctx.beginPath();
      ctx.moveTo(x + rib - 16, item.y);
      ctx.lineTo(x + rib + 16, item.y + item.height);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx, game) {
  const { x, y, invulnerable } = game.player;
  if (invulnerable > 0 && Math.floor(invulnerable / 5) % 2 === 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#38e8ff";
  ctx.fillStyle = "#e8fbff";
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(-20, -18);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-32, 0);
  ctx.lineTo(-10, 5);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#25dfff";
  ctx.fillRect(-14, -5, 28, 10);
  ctx.fillStyle = "#ffdf61";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBullets(ctx, game) {
  ctx.fillStyle = "#8dffff";
  ctx.shadowBlur = 9;
  ctx.shadowColor = "#39e5ff";
  for (const bullet of game.bullets) ctx.fillRect(bullet.x, bullet.y - 2, bullet.width, bullet.height);
  ctx.shadowBlur = 0;
}

function drawEnemies(ctx, game) {
  for (const enemy of game.enemies) {
    ctx.fillStyle = "#ff8659";
    ctx.strokeStyle = "#ffd27a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
    ctx.lineTo(enemy.x + enemy.width * .65, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
    ctx.lineTo(enemy.x + enemy.width * .65, enemy.y + enemy.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (!game.boss || game.boss.dead) return;
  const boss = game.boss;
  ctx.fillStyle = "#812f38";
  ctx.strokeStyle = "#ffb760";
  ctx.lineWidth = 7;
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
  ctx.fillStyle = "#ffeb8a";
  ctx.beginPath();
  ctx.arc(boss.x + 30, boss.y + boss.height / 2, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(ctx, game) {
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
    ctx.strokeStyle = "#426477";
    ctx.lineWidth = 2;
    ctx.strokeRect(450 + i * 46, 760, 34, 24);
  }
  ctx.fillStyle = "#78f4ff";
  ctx.font = "bold 21px Arial";
  ctx.fillText("PULSE", 640, 770);
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

function drawTitle(ctx) {
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
  ctx.textAlign = "start";
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
  ctx.fillText("M1 FOUNDATION BUILD", WIDTH / 2, 486);
  ctx.textAlign = "start";
}
