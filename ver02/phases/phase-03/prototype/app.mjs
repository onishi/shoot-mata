import {
  COMPARISON_BUILD,
  COMPARISON_PROTOCOL,
  COMPARISON_TARGET,
  CORE_INFO,
  MODE_INFO,
  SUPPORT_INFO,
  acquireSessionStorage,
  canIncludeSessionRecord,
  canDiscardPendingSession,
  canEditComparisonRecords,
  collectCore,
  canStartMode,
  comparisonProgress,
  clearInteractionState,
  createEnemySpawn,
  createInteractionState,
  createPickupSpawn,
  createSessionRecord,
  createPowerState,
  createWeaponProjectiles,
  enemyFireTick,
  getBuild,
  getSupportEffects,
  initializeSessionRecords,
  mergeSessionRecords,
  normalizeGameplayKey,
  parseComparisonExport,
  persistSessionRecords,
  previewCollection,
  recommendedMode,
  removeLastSessionRecord,
  removeSessionRecord,
  setSessionRecordInclusion,
  sessionStepSeconds,
  serializeComparisonExport,
  shouldWarnBeforeUnload,
  startButtonLabel,
  weaponLabel,
  summarizeEnvironmentCoverage,
} from "./model.mjs?v=20261021-environment-coverage-3";

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start");
const countdown = document.querySelector("#countdown");
const reflectionForm = document.querySelector("#reflection-form");
const reflectionWarning = document.querySelector("#reflection-warning");
const discardSessionButton = document.querySelector("#discard-session");
const resultsBody = document.querySelector("#results-body");
const progress = document.querySelector("#comparison-progress");
const environmentCoverage = document.querySelector("#environment-coverage");
const comparisonBuild = document.querySelector("#comparison-build");
const exportButton = document.querySelector("#export-results");
const downloadButton = document.querySelector("#download-results");
const importButton = document.querySelector("#import-results");
const importFile = document.querySelector("#import-file");
const importStatus = document.querySelector("#import-status");
const undoButton = document.querySelector("#undo-result");
const clearButton = document.querySelector("#clear-results");
const nextSession = document.querySelector("#next-session");
const storageWarning = document.querySelector("#storage-warning");
const modeButtons = [...document.querySelectorAll(".mode")];
const ui = Object.fromEntries(
  ["weapon", "level", "support", "slots", "next-core", "next-result", "collections", "switches", "tradeoffs", "kills", "hits", "level3", "mode-summary"]
    .map((id) => [id, document.querySelector(`#${id}`)]),
);

const SESSION_SECONDS = 45;
const COMPARISON_STORAGE_KEY = `shoot-mata-phase03-comparison-p${COMPARISON_PROTOCOL}-${COMPARISON_BUILD}`;
const comparisonStorage = acquireSessionStorage(() => window.localStorage);
let selectedMode = "queue";
let running = false;
let suspended = false;
let lastTime = 0;
let accumulator = 0;
let elapsed = 0;
let spawnClock = 0;
let pickupClock = 0;
let shotClock = 0;
let enemySpawnCount = 0;
let pickupSpawnCount = 0;
let power = createPowerState(selectedMode);
let stats = { kills: 0, hits: 0, level3: 0 };
let player = { x: 155, y: 270, radius: 16, invulnerable: 0 };
let enemies = [];
let pickups = [];
let projectiles = [];
let enemyShots = [];
let interaction = createInteractionState();
let pendingSession = null;
let sessionViewport = null;
const initialRecords = initializeSessionRecords(comparisonStorage, COMPARISON_STORAGE_KEY);
let records = initialRecords.records;
let recordsPersisted = initialRecords.persisted;

const colors = { red: "#ff4e5a", blue: "#4ba5ff", yellow: "#ffda3e" };
comparisonBuild.textContent = COMPARISON_BUILD;

function reset() {
  interaction = createInteractionState();
  accumulator = 0;
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
  enemySpawnCount = 0;
  pickupSpawnCount = 0;
  updateUI();
}

function saveRecords() {
  recordsPersisted = persistSessionRecords(comparisonStorage, COMPARISON_STORAGE_KEY, records);
  renderStorageStatus();
  return recordsPersisted;
}

function renderStorageStatus() {
  storageWarning.hidden = recordsPersisted;
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

function sessionEnvironment() {
  const viewportWidth = sessionViewport?.viewportWidth ?? window.innerWidth;
  const viewportHeight = sessionViewport?.viewportHeight ?? window.innerHeight;
  const viewportEndWidth = window.innerWidth;
  const viewportEndHeight = window.innerHeight;
  return {
    viewportWidth,
    viewportHeight,
    viewportEndWidth,
    viewportEndHeight,
    viewportChanged: Boolean(sessionViewport?.changed)
      || viewportWidth !== viewportEndWidth
      || viewportHeight !== viewportEndHeight,
    inputMethods: [...interaction.inputMethods],
  };
}

function start() {
  if (!canStartMode(records, selectedMode)) return;
  reflectionForm.hidden = true;
  reflectionWarning.hidden = true;
  pendingSession = null;
  reset();
  sessionViewport = {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    changed: false,
  };
  suspended = false;
  running = true;
  startButton.hidden = true;
  modeButtons.forEach((button) => { button.disabled = true; });
  renderResults();
}

function selectMode(mode) {
  if (!MODE_INFO[mode]) return;
  selectedMode = mode;
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === selectedMode);
  });
  running = false;
  startButton.hidden = false;
  startButton.textContent = "45秒テストを開始";
  reset();
  renderResults();
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectMode(button.dataset.mode);
  });
});
startButton.addEventListener("click", start);

window.addEventListener("keydown", (event) => {
  const key = normalizeGameplayKey(event.key);
  if (!running || !key) return;
  event.preventDefault();
  interaction.inputMethods.add("keyboard");
  interaction.keys.add(key);
});
window.addEventListener("keyup", (event) => {
  const key = normalizeGameplayKey(event.key);
  if (key) interaction.keys.delete(key);
});
function suspendSession() {
  clearInteractionState(interaction);
  if (!running) return;
  suspended = true;
  updateUI();
}

function resumeSession() {
  if (!running || document.hidden) return;
  suspended = false;
  accumulator = 0;
  lastTime = performance.now();
  updateUI();
}

window.addEventListener("blur", suspendSession);
window.addEventListener("focus", resumeSession);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) suspendSession();
  else if (document.hasFocus()) resumeSession();
});
window.addEventListener("beforeunload", (event) => {
  if (!shouldWarnBeforeUnload(running, pendingSession !== null)) return;
  event.preventDefault();
  event.returnValue = true;
});
window.addEventListener("resize", () => {
  if (!running || !sessionViewport) return;
  sessionViewport.changed = sessionViewport.changed
    || window.innerWidth !== sessionViewport.viewportWidth
    || window.innerHeight !== sessionViewport.viewportHeight;
});

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}
canvas.addEventListener("pointerdown", (event) => {
  if (!running || interaction.pointerId !== null) return;
  interaction.pointerId = event.pointerId;
  interaction.pointerTarget = pointerPosition(event);
  interaction.inputMethods.add(["mouse", "touch", "pen"].includes(event.pointerType)
    ? event.pointerType
    : "pointer");
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId === interaction.pointerId) interaction.pointerTarget = pointerPosition(event);
});
function releasePointer(event) {
  if (event.pointerId === interaction.pointerId) {
    interaction.pointerId = null;
    interaction.pointerTarget = null;
  }
}
canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);
canvas.addEventListener("lostpointercapture", releasePointer);

function movePlayer(dt) {
  let dx = 0, dy = 0;
  if (interaction.keys.has("arrowleft") || interaction.keys.has("a")) dx -= 1;
  if (interaction.keys.has("arrowright") || interaction.keys.has("d")) dx += 1;
  if (interaction.keys.has("arrowup") || interaction.keys.has("w")) dy -= 1;
  if (interaction.keys.has("arrowdown") || interaction.keys.has("s")) dy += 1;
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    player.x += dx / length * 260 * dt;
    player.y += dy / length * 260 * dt;
  } else if (interaction.pointerTarget) {
    const px = interaction.pointerTarget.x - player.x;
    const py = interaction.pointerTarget.y - player.y;
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
  enemies.push(createEnemySpawn(enemySpawnCount, elapsed));
  enemySpawnCount += 1;
}

function spawnPickup() {
  pickups.push(createPickupSpawn(pickupSpawnCount, elapsed));
  pickupSpawnCount += 1;
}

function fire() {
  const build = getBuild(power);
  const support = getSupportEffects(power);
  projectiles.push(...createWeaponProjectiles(build, player, support));
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function update(dt) {
  if (!running) return;
  const step = sessionStepSeconds(elapsed, dt, SESSION_SECONDS, suspended);
  if (step === 0) return;
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
    pendingSession = {
      mode: selectedMode,
      metrics: sessionMetrics(),
      environment: sessionEnvironment(),
    };
    modeButtons.forEach((button) => { button.disabled = true; });
    reflectionForm.hidden = false;
    reflectionForm.querySelector("legend").textContent = `${MODE_INFO[selectedMode].label} — 完走直後の記録`;
    renderResults();
    reflectionForm.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  updateUI();
}


reflectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingSession) return;
  const data = new FormData(reflectionForm);
  const record = createSessionRecord({
    mode: pendingSession.mode,
    metrics: pendingSession.metrics,
    environment: pendingSession.environment,
    included: data.get("exclude") !== "on",
    reflection: {
      prediction: Number(data.get("prediction")),
      choice: Number(data.get("choice")),
      retry: Number(data.get("retry")),
      note: data.get("note"),
    },
  });
  if (record.included && !canIncludeSessionRecord(record)) {
    reflectionWarning.hidden = false;
    reflectionWarning.textContent = "正式比較に含めるには、セッション中にキーボードまたはポインターで操作してください。導線確認だけの場合はQA除外を選べます。";
    return;
  }
  reflectionWarning.hidden = true;
  records.push(record);
  saveRecords();
  pendingSession = null;
  reflectionForm.reset();
  reflectionForm.hidden = true;
  reflectionWarning.hidden = true;
  modeButtons.forEach((button) => { button.disabled = false; });
  const nextMode = recommendedMode(records);
  if (nextMode) selectMode(nextMode);
  else {
    startButton.hidden = false;
    renderResults();
  }
});

discardSessionButton.addEventListener("click", () => {
  if (!canDiscardPendingSession(running, pendingSession !== null)) return;
  if (!confirm("この完走は比較記録へ保存されません。破棄しますか？")) return;
  pendingSession = null;
  reflectionForm.reset();
  reflectionForm.hidden = true;
  modeButtons.forEach((button) => { button.disabled = false; });
  selectMode(recommendedMode(records) ?? selectedMode);
});

function comparisonExport() {
  return serializeComparisonExport(records);
}

function downloadComparison(payload) {
  const blob = new Blob([payload], { type: "application/json" });
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = `phase-03-comparison-${COMPARISON_BUILD}.json`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

exportButton.addEventListener("click", async () => {
  const payload = comparisonExport();
  try {
    await navigator.clipboard.writeText(payload);
    exportButton.textContent = "JSONをコピー済み";
    importStatus.textContent = "現在の条件IDを含むJSONをクリップボードへコピーしました。";
    importStatus.hidden = false;
  } catch {
    importStatus.textContent = "クリップボードへコピーできませんでした。「JSONを保存」を使ってください。";
    importStatus.hidden = false;
  }
});

downloadButton.addEventListener("click", () => {
  downloadComparison(comparisonExport());
  importStatus.textContent = `条件ID ${COMPARISON_BUILD} のJSONファイルを保存しました。`;
  importStatus.hidden = false;
});

importButton.addEventListener("click", () => {
  if (!canEditComparisonRecords(running, pendingSession !== null)) return;
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const [file] = importFile.files;
  importFile.value = "";
  if (!file || !canEditComparisonRecords(running, pendingSession !== null)) return;
  try {
    const imported = parseComparisonExport(await file.text());
    const merged = mergeSessionRecords(records, imported);
    records = merged.records;
    saveRecords();
    importStatus.textContent = `${merged.added}件を追加しました（重複 ${merged.duplicates}件、正式比較の方式上限による除外 ${merged.excess}件）。`;
    importStatus.hidden = false;
    renderResults();
  } catch {
    importStatus.textContent = "読込に失敗しました。現在の条件IDで書き出した未編集のJSONを選んでください。";
    importStatus.hidden = false;
  }
});

undoButton.addEventListener("click", () => {
  if (!canEditComparisonRecords(running, pendingSession !== null)) return;
  const lastRecord = records.at(-1);
  if (!lastRecord) return;
  if (!confirm(`${MODE_INFO[lastRecord.mode].label} の直前記録だけを取り消しますか？`)) return;
  records = removeLastSessionRecord(records);
  saveRecords();
  renderResults();
});

clearButton.addEventListener("click", () => {
  if (!canEditComparisonRecords(running, pendingSession !== null)) return;
  if (!confirm("保存した比較記録をすべて消去しますか？")) return;
  records = [];
  saveRecords();
  renderResults();
});

function renderResults() {
  const coverage = comparisonProgress(records);
  const evidence = summarizeEnvironmentCoverage(records);
  const nextMode = recommendedMode(records);
  const controlsLocked = !canEditComparisonRecords(running, pendingSession !== null);
  progress.textContent = Object.entries(coverage)
    .map(([mode, state]) => `${MODE_INFO[mode].label} ${state.count}/${COMPARISON_TARGET}`)
    .join(" / ");
  environmentCoverage.textContent = [
    `PC ${evidence.pc ? "済" : "未"}`,
    `縦長320〜390px ${evidence.portrait ? "済" : "未"}`,
    `スマホ横長 ${evidence.landscape ? "済" : "未"}`,
    `キーボード ${evidence.keyboard ? "済" : "未"}`,
    `実タッチ ${evidence.touch ? "済" : "未"}`,
  ].join(" / ");
  nextSession.textContent = nextMode
    ? `次の推奨: ${MODE_INFO[nextMode].label}（順序による慣れ・疲労の偏りを減らすため、3セットで開始方式をずらします）`
    : evidence.complete
      ? "必要な9完走と環境証拠が揃いました。JSONを出力して、人の観察と数値を分けてレビューしてください。"
      : "必要な9完走は揃いましたが、環境証拠が未達です。未確認の画面・入力条件で追加確認し、正式3件が上限ならQA除外で保存してください。";
  modeButtons.forEach((button) => {
    button.classList.toggle("recommended", button.dataset.mode === nextMode);
    button.disabled = controlsLocked || coverage[button.dataset.mode].complete;
  });
  const selectedComplete = coverage[selectedMode].complete;
  startButton.disabled = controlsLocked || selectedComplete;
  if (!controlsLocked) startButton.textContent = startButtonLabel(records, selectedMode);
  undoButton.disabled = controlsLocked || records.length === 0;
  clearButton.disabled = controlsLocked || records.length === 0;
  importButton.disabled = controlsLocked;
  resultsBody.replaceChildren(...records.map((record, index) => {
    const row = document.createElement("tr");
    const environment = record.environment
      ? `${record.environment.viewportWidth}×${record.environment.viewportHeight}${record.environment.viewportChanged
        ? ` → ${record.environment.viewportEndWidth}×${record.environment.viewportEndHeight}（途中変更）`
        : ""} / ${record.environment.inputMethods.join("+") || "入力記録なし"}`
      : "旧記録 / 環境なし";
    const handling = record.legacyExcluded
      ? "旧記録除外"
      : record.included === false ? "QA除外" : "正式";
    const values = [index + 1, handling, MODE_INFO[record.mode].label, environment, record.metrics.collections,
      record.metrics.switches, record.metrics.tradeoffs, record.metrics.kills,
      record.metrics.hits, record.metrics.level3.toFixed(1), record.reflection.prediction,
      record.reflection.choice, record.reflection.retry, record.reflection.note || "—"];
    const cells = values.map((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      return cell;
    });
    const actionCell = document.createElement("td");
    const inclusionButton = document.createElement("button");
    inclusionButton.type = "button";
    inclusionButton.className = "record-inclusion";
    inclusionButton.textContent = record.included === false ? "正式に含める" : "QAとして除外";
    inclusionButton.setAttribute("aria-label", `${index + 1}件目を${record.included === false ? "正式比較に含める" : "QA記録として除外"}`);
    const inclusionLimitReached = record.included === false && coverage[record.mode].complete;
    const missingInputEvidence = record.included === false && !canIncludeSessionRecord(record);
    inclusionButton.disabled = controlsLocked || inclusionLimitReached || missingInputEvidence;
    if (inclusionLimitReached) {
      inclusionButton.title = "この方式の正式比較は3/3完了しています";
    } else if (missingInputEvidence) {
      inclusionButton.title = "操作入力の記録がないため正式比較には含められません";
    }
    inclusionButton.addEventListener("click", () => {
      if (!canEditComparisonRecords(running, pendingSession !== null)) return;
      const included = record.included === false;
      const action = included ? "正式比較へ含め" : "QA記録として進捗・集計から除外し";
      if (!confirm(`${index + 1}件目を${action}ますか？`)) return;
      records = setSessionRecordInclusion(records, index, included);
      saveRecords();
      renderResults();
    });
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "record-delete";
    removeButton.textContent = "削除";
    removeButton.setAttribute("aria-label", `${index + 1}件目、${MODE_INFO[record.mode].label}の記録を削除`);
    removeButton.disabled = controlsLocked;
    removeButton.addEventListener("click", () => {
      if (!canEditComparisonRecords(running, pendingSession !== null)) return;
      if (!confirm(`${index + 1}件目の ${MODE_INFO[record.mode].label} の記録を削除しますか？`)) return;
      records = removeSessionRecord(records, index);
      saveRecords();
      renderResults();
    });
    actionCell.append(inclusionButton, removeButton);
    row.replaceChildren(...cells, actionCell);
    return row;
  }));
  document.querySelector("#comparison-results").classList.toggle("empty", records.length === 0);
  renderStorageStatus();
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
  countdown.textContent = suspended
    ? "PAUSED"
    : running ? `${Math.ceil(SESSION_SECONDS - elapsed)} SEC` : elapsed ? "RESULT" : "READY";
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
