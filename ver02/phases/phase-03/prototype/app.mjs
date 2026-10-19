import {
  COMPARISON_TARGET,
  CORE_INFO,
  CORE_TYPES,
  MODE_INFO,
  SUPPORT_INFO,
  collectCore,
  comparisonProgress,
  createSessionRecord,
  createPowerState,
  createWeaponProjectiles,
  enemyFireTick,
  getBuild,
  getSupportEffects,
  normalizeGameplayKey,
  previewCollection,
  recommendedMode,
  removeLastSessionRecord,
  restoreSessionRecords,
  sessionStepSeconds,
  summarizeComparison,
  weaponLabel,
} from "./model.mjs";

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start");
const countdown = document.querySelector("#countdown");
const reflectionForm = document.querySelector("#reflection-form");
const resultsBody = document.querySelector("#results-body");
const progress = document.querySelector("#comparison-progress");
const exportButton = document.querySelector("#export-results");
const undoButton = document.querySelector("#undo-result");
const clearButton = document.querySelector("#clear-results");
const nextSession = document.querySelector("#next-session");
const ui = Object.fromEntries(
  ["weapon", "level", "support", "slots", "next-core", "next-result", "collections", "switches", "tradeoffs", "kills", "hits", "level3", "mode-summary"]
    .map((id) => [id, document.querySelector(`#${id}`)]),
);

const SESSION_SECONDS = 45;
let selectedMode = "queue";
let running = false;
let lastTime = 0;
let accumulator = 0;
let elapsed = 0;
let spawnClock = 0;
let pickupClock = 0;
let shotClock = 0;
let idCounter = 0;
let power = createPowerState(selectedMode);
let stats = { kills: 0, hits: 0, level3: 0 };
let player = { x: 155, y: 270, radius: 16, invulnerable: 0 };
let enemies = [];
let pickups = [];
let projectiles = [];
let enemyShots = [];
const keys = new Set();
let pointerId = null;
let pointerTarget = null;
let pendingSession = null;
let records = loadRecords();

const colors = { red: "#ff4e5a", blue: "#4ba5ff", yellow: "#ffda3e" };

function reset() {
  power = createPowerState(selectedMode);
  stats = { kills: 0, hits: 0, level3: 0 };
  player = { x: 155, y: 270, radius: 16, invulnerable: 0 };
  enemies = [];
  pickups = [];
  projectiles = [];
  enemyShots = [];
  elapsed = 0;
  spawnClock = 0;
  pickupClock = 0;
  shotClock = 0;
  idCounter = 0;
  updateUI();
}

function loadRecords() {
  try {
    const value = JSON.parse(localStorage.getItem("shoot-mata-phase03-comparison") ?? "[]");
    return restoreSessionRecords(value);
  } catch {
    return [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem("shoot-mata-phase03-comparison", JSON.stringify(records));
  } catch {
    // The in-memory comparison remains usable when storage is blocked.
  }
}

function sessionMetrics() {
  return {
    collections: power.collections,
    switches: power.switches,
    tradeoffs: power.tradeoffs,
    kills: stats.kills,
    hits: stats.hits,
    level3: Number(stats.level3.toFixed(1)),
  };
}

function start() {
  reflectionForm.hidden = true;
  pendingSession = null;
  reset();
  running = true;
  startButton.hidden = true;
}

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    document.querySelectorAll(".mode").forEach((item) => item.classList.toggle("active", item === button));
    running = false;
    startButton.hidden = false;
    startButton.textContent = "45秒テストを開始";
    reset();
  });
});
startButton.addEventListener("click", start);

window.addEventListener("keydown", (event) => {
  const key = normalizeGameplayKey(event.key);
  if (!running || !key) return;
  event.preventDefault();
  keys.add(key);
});
window.addEventListener("keyup", (event) => {
  const key = normalizeGameplayKey(event.key);
  if (key) keys.delete(key);
});
window.addEventListener("blur", () => keys.clear());

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}
canvas.addEventListener("pointerdown", (event) => {
  if (pointerId !== null) return;
  pointerId = event.pointerId;
  pointerTarget = pointerPosition(event);
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === pointerId) pointerTarget = pointerPosition(event);
});
function releasePointer(event) {
  if (event.pointerId === pointerId) {
    pointerId = null;
    pointerTarget = null;
  }
}
canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);
canvas.addEventListener("lostpointercapture", releasePointer);

function movePlayer(dt) {
  let dx = 0, dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    player.x += dx / length * 260 * dt;
    player.y += dy / length * 260 * dt;
  } else if (pointerTarget) {
    const px = pointerTarget.x - player.x;
    const py = pointerTarget.y - player.y;
    const distance = Math.hypot(px, py);
    if (distance > 4) {
      const amount = Math.min(distance, 340 * dt);
      player.x += px / distance * amount;
      player.y += py / distance * amount;
    }
  }
  player.x = Math.max(32, Math.min(620, player.x));
  player.y = Math.max(28, Math.min(canvas.height - 28, player.y));
}

function spawnEnemy() {
  const band = idCounter % 5;
  enemies.push({
    id: idCounter++, x: 990, y: 70 + band * 100 + Math.sin(idCounter * 2.1) * 20,
    radius: 18, hp: 2 + Math.floor(elapsed / 15), phase: idCounter * .7,
    lastFireTick: null,
  });
}

function spawnPickup() {
  const type = CORE_TYPES[idCounter % CORE_TYPES.length];
  const lane = (idCounter * 2 + Math.floor(elapsed / 9)) % 5;
  pickups.push({ id: idCounter++, type, x: 990, y: 70 + lane * 100, radius: 17 });
}

function fire() {
  const build = getBuild(power);
  const support = getSupportEffects(power);
  projectiles.push(...createWeaponProjectiles(build, player, support));
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function update(dt) {
  if (!running) return;
  const step = sessionStepSeconds(elapsed, dt, SESSION_SECONDS);
  elapsed += step;
  movePlayer(step);
  player.invulnerable = Math.max(0, player.invulnerable - step);
  spawnClock += step;
  pickupClock += step;
  shotClock += step;
  if (spawnClock >= .85) { spawnClock -= .85; spawnEnemy(); }
  if (pickupClock >= 2.4) { pickupClock -= 2.4; spawnPickup(); }
  if (shotClock >= .16) { shotClock -= .16; fire(); }

  if (getBuild(power).level === 3) stats.level3 += step;

  enemies.forEach((enemy) => {
    enemy.x -= (105 + elapsed * .7) * step;
    enemy.y += Math.sin(elapsed * 2 + enemy.phase) * 18 * step;
    const fireTick = enemyFireTick(enemy.id, elapsed, enemy.lastFireTick);
    if (fireTick !== null) {
      enemy.lastFireTick = fireTick;
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemyShots.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 170, vy: Math.sin(angle) * 170, radius: 6 });
    }
  });
  pickups.forEach((pickup) => { pickup.x -= 120 * step; });
  projectiles.forEach((shot) => {
    if (shot.seeking && enemies.length) {
      const target = enemies.reduce((best, enemy) => distance(shot, enemy) < distance(shot, best) ? enemy : best, enemies[0]);
      shot.vy += Math.sign(target.y - shot.y) * 520 * step;
      shot.vy = Math.max(-190, Math.min(190, shot.vy));
    }
    shot.x += shot.vx * step; shot.y += shot.vy * step;
  });
  enemyShots.forEach((shot) => { shot.x += shot.vx * step; shot.y += shot.vy * step; });

  for (const shot of projectiles) {
    for (const enemy of enemies) {
      if (!shot.dead && !enemy.dead && !shot.hitIds.has(enemy.id) && distance(shot, enemy) < shot.radius + enemy.radius) {
        shot.hitIds.add(enemy.id);
        enemy.hp -= shot.damage;
        if (shot.pierce > 0) shot.pierce -= 1;
        else shot.dead = true;
        if (enemy.hp <= 0) { enemy.dead = true; stats.kills += 1; }
      }
    }
  }
  const support = getSupportEffects(power);
  for (const pickup of pickups) {
    if (!pickup.dead && distance(player, pickup) < player.radius + pickup.radius + support.collectionRadiusBonus) {
      collectCore(power, pickup.type); pickup.dead = true;
    }
  }
  for (const shot of enemyShots) {
    if (!shot.dead && player.invulnerable === 0 && distance(player, shot) < player.radius + shot.radius) {
      shot.dead = true; player.invulnerable = support.invulnerabilitySeconds; stats.hits += 1;
    }
  }

  enemies = enemies.filter((item) => !item.dead && item.x > -50);
  pickups = pickups.filter((item) => !item.dead && item.x > -50);
  projectiles = projectiles.filter((item) => !item.dead && item.x < 1020 && item.y > -30 && item.y < 570);
  enemyShots = enemyShots.filter((item) => !item.dead && item.x > -30 && item.y > -30 && item.y < 570);
  if (elapsed >= SESSION_SECONDS) {
    running = false;
    startButton.hidden = true;
    startButton.textContent = "同じ方式でもう一度";
    pendingSession = { mode: selectedMode, metrics: sessionMetrics() };
    document.querySelectorAll(".mode").forEach((button) => { button.disabled = true; });
    reflectionForm.hidden = false;
    reflectionForm.querySelector("legend").textContent = `${MODE_INFO[selectedMode].label} — 完走直後の記録`;
    reflectionForm.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  updateUI();
}


reflectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingSession) return;
  const data = new FormData(reflectionForm);
  records.push(createSessionRecord({
    mode: pendingSession.mode,
    metrics: pendingSession.metrics,
    reflection: {
      prediction: Number(data.get("prediction")),
      choice: Number(data.get("choice")),
      retry: Number(data.get("retry")),
      note: data.get("note"),
    },
  }));
  saveRecords();
  pendingSession = null;
  reflectionForm.reset();
  reflectionForm.hidden = true;
  startButton.hidden = false;
  document.querySelectorAll(".mode").forEach((button) => { button.disabled = false; });
  renderResults();
});

exportButton.addEventListener("click", async () => {
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    summary: summarizeComparison(records),
    records,
  }, null, 2);
  try {
    await navigator.clipboard.writeText(payload);
    exportButton.textContent = "JSONをコピー済み";
  } catch {
    const blob = new Blob([payload], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "phase-03-comparison.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
});

undoButton.addEventListener("click", () => {
  const lastRecord = records.at(-1);
  if (!lastRecord) return;
  if (!confirm(`${MODE_INFO[lastRecord.mode].label} の直前記録だけを取り消しますか？`)) return;
  records = removeLastSessionRecord(records);
  saveRecords();
  renderResults();
});

clearButton.addEventListener("click", () => {
  if (!confirm("保存した比較記録をすべて消去しますか？")) return;
  records = [];
  saveRecords();
  renderResults();
});

function renderResults() {
  const coverage = comparisonProgress(records);
  const nextMode = recommendedMode(records);
  progress.textContent = Object.entries(coverage)
    .map(([mode, state]) => `${MODE_INFO[mode].label} ${state.count}/${COMPARISON_TARGET}`)
    .join(" / ");
  nextSession.textContent = nextMode
    ? `次の推奨: ${MODE_INFO[nextMode].label}（順序による慣れ・疲労の偏りを減らすため、3セットで開始方式をずらします）`
    : "必要な9完走が揃いました。JSONを出力して、人の観察と数値を分けてレビューしてください。";
  document.querySelectorAll(".mode").forEach((button) => {
    button.classList.toggle("recommended", button.dataset.mode === nextMode);
  });
  undoButton.disabled = records.length === 0;
  clearButton.disabled = records.length === 0;
  resultsBody.replaceChildren(...records.map((record, index) => {
    const row = document.createElement("tr");
    const values = [index + 1, MODE_INFO[record.mode].label, record.metrics.collections,
      record.metrics.switches, record.metrics.tradeoffs, record.metrics.kills,
      record.metrics.hits, record.metrics.level3.toFixed(1), record.reflection.prediction,
      record.reflection.choice, record.reflection.retry, record.reflection.note || "—"];
    row.replaceChildren(...values.map((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      return cell;
    }));
    return row;
  }));
  document.querySelector("#comparison-results").classList.toggle("empty", records.length === 0);
}

function updateUI() {
  const build = getBuild(power);
  ui.weapon.textContent = weaponLabel(build.weapon);
  ui.level.textContent = `LV ${build.level}`;
  ui.support.textContent = build.supports.length
    ? build.supports.map((type) => SUPPORT_INFO[type].label).join(" + ")
    : "なし";
  ui["mode-summary"].textContent = MODE_INFO[selectedMode].summary;
  ui.collections.textContent = power.collections;
  ui.switches.textContent = power.switches;
  ui.tradeoffs.textContent = power.tradeoffs;
  ui.kills.textContent = stats.kills;
  ui.hits.textContent = stats.hits;
  ui.level3.textContent = stats.level3.toFixed(1);
  countdown.textContent = running ? `${Math.ceil(SESSION_SECONDS - elapsed)} SEC` : elapsed ? "RESULT" : "READY";
  ui.slots.replaceChildren();
  if (selectedMode === "armory") {
    build.slots.forEach(({ core, level }) => addSlot(core, `${CORE_INFO[core].glyph}${level}`, core === build.weapon));
  } else {
    for (let i = 0; i < 3; i++) {
      const core = build.slots[i];
      addSlot(core, core ? CORE_INFO[core].glyph : "—", i === 0 && Boolean(core));
    }
  }
  updatePickupPreview();
}

function updatePickupPreview() {
  const nextPickup = pickups.reduce(
    (next, pickup) => !pickup.dead && (!next || pickup.x < next.x) ? pickup : next,
    null,
  );
  if (!nextPickup) {
    ui["next-core"].textContent = "待機中";
    ui["next-result"].textContent = "取得後の構成を表示";
    return;
  }
  const preview = previewCollection(power, nextPickup.type);
  const support = preview.supports.length
    ? ` / 補助 ${preview.supports.map((type) => SUPPORT_INFO[type].label).join(" + ")}`
    : " / 補助なし";
  ui["next-core"].textContent = `${CORE_INFO[nextPickup.type].glyph} ${weaponLabel(nextPickup.type)}コア`;
  ui["next-result"].textContent = `${weaponLabel(preview.weapon)} LV ${preview.level}${support}`;
}

function addSlot(core, text, front) {
  const slot = document.createElement("span");
  slot.className = `slot ${core ?? "empty"} ${front ? "front" : ""}`;
  slot.textContent = text;
  ui.slots.append(slot);
}

function drawCore(x, y, type, radius) {
  const info = CORE_INFO[type];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colors[type];
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (info.shape === "diamond") {
    ctx.moveTo(0, -radius); ctx.lineTo(radius, 0); ctx.lineTo(0, radius); ctx.lineTo(-radius, 0); ctx.closePath();
  } else if (info.shape === "circle") {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  } else {
    ctx.moveTo(0, -radius); ctx.lineTo(radius, radius); ctx.lineTo(-radius, radius); ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#07101e";
  ctx.font = `900 ${Math.round(radius * 1.15)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(info.glyph, 0, 1);
  ctx.restore();
}

function draw() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#071126"); gradient.addColorStop(1, "#150b25");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(126, 197, 255, .4)";
  for (let i = 0; i < 36; i++) {
    const x = (i * 149 - elapsed * (16 + i % 3) * 8) % 1020;
    const y = (i * 83) % 540;
    ctx.fillRect(x, y, 2, 2);
  }

  pickups.forEach((pickup) => drawCore(pickup.x, pickup.y, pickup.type, pickup.radius));
  enemies.forEach((enemy) => {
    ctx.fillStyle = "#cf72ff"; ctx.strokeStyle = "#ffd4ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(enemy.x - 18, enemy.y); ctx.lineTo(enemy.x + 16, enemy.y - 14); ctx.lineTo(enemy.x + 10, enemy.y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  projectiles.forEach((shot) => { ctx.fillStyle = shot.supportPiercing ? "#ff9ca2" : "#dffaff"; ctx.fillRect(shot.x - 3, shot.y - 2, 13, 4); });
  enemyShots.forEach((shot) => { ctx.fillStyle = "#ff72bd"; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill(); });

  ctx.save();
  ctx.translate(player.x, player.y);
  const support = getSupportEffects(power);
  if (support.collectionRadiusBonus > 0) {
    ctx.strokeStyle = "rgba(255, 226, 109, .55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, player.radius + support.collectionRadiusBonus, 0, Math.PI * 2); ctx.stroke();
  }
  if (support.invulnerabilitySeconds > .8) {
    ctx.strokeStyle = "rgba(114, 186, 255, .8)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, player.radius + 8, 0, Math.PI * 2); ctx.stroke();
  }
  if (player.invulnerable && Math.floor(player.invulnerable * 12) % 2) ctx.globalAlpha = .25;
  ctx.fillStyle = "#7ef3ff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-15, -13); ctx.lineTo(-8, 0); ctx.lineTo(-15, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  const build = getBuild(power);
  if (build.weapon) { ctx.fillStyle = colors[build.weapon]; ctx.fillRect(-19, -5, 8, 10); }
  ctx.restore();

  if (!running) {
    ctx.fillStyle = "rgba(1, 4, 12, .42)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function frame(time) {
  const delta = Math.min(.1, (time - lastTime) / 1000 || 0);
  lastTime = time;
  accumulator += delta;
  while (accumulator >= 1 / 60) { update(1 / 60); accumulator -= 1 / 60; }
  draw();
  requestAnimationFrame(frame);
}

reset();
renderResults();
requestAnimationFrame(frame);
