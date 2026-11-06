import "./style.css";
import { WIDTH, HEIGHT, FIXED_STEP, AIRSPACES, accessibleStatus, airspaceFor, createGame, downdraftAt, galeLiftAt, isSheltered, retry, soundGateAt, soundGateIsTuned, startGame, togglePause, update, windAt } from "./model.js";
import { DEFAULT_PREFERENCES, STORAGE_KEY, parsePreferences, serializePreferences, unlockAirspace } from "./preferences.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const live = document.querySelector("#live");
function loadPreferences() {
  try { return parsePreferences(localStorage.getItem(STORAGE_KEY), AIRSPACES.length - 1); }
  catch { return { ...DEFAULT_PREFERENCES }; }
}

let preferences = loadPreferences();
const game = createGame(preferences.unlockedAirspace);
const keys = new Set();
let last = performance.now();
let accumulator = 0;
let audio;
let lastAccessible = "";
let settingsOpen = false;
let selectedSetting = 0;

function savePreferences() {
  try { localStorage.setItem(STORAGE_KEY, serializePreferences(preferences)); } catch { /* Play remains available without storage. */ }
}

function ensureAudio() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") audio.resume();
}

function tone(frequency, duration = 0.12, volume = 0.05, delay = 0) {
  if (!audio || preferences.volume === 0) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.001, audio.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(volume * preferences.volume, audio.currentTime + delay + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(audio.currentTime + delay);
  oscillator.stop(audio.currentTime + delay + duration + 0.03);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "ribbon") tone([392, 523, 659][event.index], 0.3, 0.07);
    if (event.type === "gate") [523, 659].forEach((note, i) => tone(note, 0.24, 0.045, i * 0.07));
    if (event.type === "gate-blocked") tone(174, 0.18, 0.035);
    if (event.type === "lost") tone(110, 0.55, 0.08);
    if (event.type === "won") [392, 523, 659].forEach((note, i) => tone(note, 0.6, 0.06, i * 0.1));
  }
}

function openSettings() {
  keys.clear();
  if (game.mode === "playing") togglePause(game);
  settingsOpen = true;
}

function closeSettings() {
  settingsOpen = false;
  canvas.focus();
}

function adjustSetting(direction) {
  if (selectedSetting === 0) preferences = { ...preferences, volume: Math.max(0, Math.min(1, preferences.volume + direction * 0.25)) };
  else preferences = { ...preferences, reducedMotion: !preferences.reducedMotion };
  savePreferences();
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "Escape"].includes(event.code)) event.preventDefault();
  if (event.repeat && ["Enter", "Escape", "KeyR", "KeyS"].includes(event.code)) return;
  if (settingsOpen) {
    if (event.code === "Escape" || event.code === "KeyS") closeSettings();
    else if (event.code === "ArrowUp" || event.code === "ArrowDown") selectedSetting = selectedSetting === 0 ? 1 : 0;
    else if (event.code === "ArrowLeft") adjustSetting(-1);
    else if (event.code === "ArrowRight" || event.code === "Enter") adjustSetting(1);
    return;
  }
  if (event.code === "KeyS") { openSettings(); return; }
  keys.add(event.code);
  if (event.code === "Enter") {
    ensureAudio();
    const previousAirspace = game.airspace;
    startGame(game);
    if (game.airspace !== previousAirspace) { preferences = unlockAirspace(preferences, game.airspace); savePreferences(); }
    canvas.focus();
  }
  if (event.code === "Escape") togglePause(game);
  if (event.code === "KeyR") { ensureAudio(); retry(game); }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => { keys.clear(); if (game.mode === "playing") togglePause(game); });

function roundRect(x, y, w, h, radius, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#111a3a"); gradient.addColorStop(0.52, "#364a70"); gradient.addColorStop(1, "#d38b58");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#f8dda8"; ctx.beginPath(); ctx.arc(790, 112, 48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#17243b"; ctx.beginPath(); ctx.moveTo(0, 490); ctx.quadraticCurveTo(170, 448, 350, 490); ctx.quadraticCurveTo(620, 430, 960, 488); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();
}

function drawClouds() {
  const clouds = airspaceFor(game).clouds;
  for (const cloud of clouds) {
    const gradient = ctx.createLinearGradient(cloud.x, cloud.y, cloud.x, cloud.y + cloud.height);
    gradient.addColorStop(0, "#d2e0e3"); gradient.addColorStop(1, "#687f92");
    ctx.fillStyle = gradient; ctx.strokeStyle = "#eef8f5dd"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cloud.x, cloud.y + 34, cloud.width, cloud.height - 60, 52);
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const x = cloud.x + 42 + i * 51;
      const y = cloud.y + 48 + (i % 2) * 18;
      ctx.beginPath(); ctx.arc(x, y, 38 + (i % 3) * 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#eef8f5"; ctx.font = "700 13px system-ui"; ctx.textAlign = "center";
    ctx.fillText("WIND SHADOW", cloud.x + cloud.width / 2, cloud.y + cloud.height - 16);
  }
}

function drawDowndrafts() {
  for (const draft of airspaceFor(game).downdrafts) {
    const gradient = ctx.createLinearGradient(draft.x, draft.y, draft.x + draft.width, draft.y);
    gradient.addColorStop(0, "#8fbac500"); gradient.addColorStop(0.2, "#8fbac529");
    gradient.addColorStop(0.8, "#8fbac529"); gradient.addColorStop(1, "#8fbac500");
    ctx.fillStyle = gradient; ctx.fillRect(draft.x, draft.y, draft.width, draft.height);
    ctx.save(); ctx.strokeStyle = "#c5edf0aa"; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const x = draft.x + 25 + i * 32;
      const visualTime = preferences.reducedMotion ? 0 : game.elapsed;
      const offset = (visualTime * 90 + i * 63) % (draft.height + 55);
      const y = draft.y - 25 + offset;
      ctx.beginPath(); ctx.moveTo(x - 7, y - 34); ctx.quadraticCurveTo(x + 8, y - 10, x, y + 18);
      ctx.lineTo(x - 8, y + 7); ctx.moveTo(x, y + 18); ctx.lineTo(x + 10, y + 5); ctx.stroke();
    }
    ctx.restore();
    if (game.messageTime <= 0) {
      ctx.fillStyle = "#d8f4f2"; ctx.font = "700 12px system-ui"; ctx.textAlign = "center";
      ctx.fillText("SINKING AIR", draft.x + draft.width / 2, draft.y + 18);
    }
  }
}

function drawGaleLifts() {
  const wind = windAt(game.elapsed);
  for (const lift of airspaceFor(game).galeLifts) {
    const forecast = wind.direction === lift.direction && (wind.phase === "warning" || wind.phase === "gust");
    const active = wind.phase === "gust" && wind.direction === lift.direction;
    const gradient = ctx.createLinearGradient(lift.x, lift.y, lift.x + lift.width, lift.y);
    gradient.addColorStop(0, "#e9cb7200");
    gradient.addColorStop(0.28, active ? "#ffe99a42" : forecast ? "#e5d9a827" : "#9ba9be13");
    gradient.addColorStop(0.72, active ? "#ffe99a42" : forecast ? "#e5d9a827" : "#9ba9be13");
    gradient.addColorStop(1, "#e9cb7200");
    ctx.fillStyle = gradient; ctx.fillRect(lift.x, lift.y, lift.width, lift.height);
    ctx.save();
    ctx.strokeStyle = active ? "#ffe89ddd" : forecast ? "#f0df9a99" : "#b2c2d355";
    ctx.fillStyle = active ? "#fff1b8" : "#b9c6d0";
    ctx.lineWidth = active ? 3 : 2;
    ctx.setLineDash(active ? [] : [7, 8]);
    const visualTime = preferences.reducedMotion ? 0 : game.elapsed;
    for (let i = 0; i < 4; i++) {
      const x = lift.x + 56 + i * 46;
      const offset = active ? (visualTime * 96 + i * 74) % (lift.height - 60) : i * 82;
      const y = lift.y + lift.height - 30 - offset;
      ctx.beginPath(); ctx.moveTo(x - 10, y + 12); ctx.lineTo(x, y); ctx.lineTo(x + 10, y + 12); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (game.messageTime <= 0) {
      ctx.textAlign = "center"; ctx.font = "700 12px system-ui";
      ctx.fillText(`${lift.direction > 0 ? "→" : "←"} GALE LIFT`, lift.x + lift.width / 2, lift.y + lift.height - 14);
    }
    ctx.restore();
  }
}

function drawSoundGates() {
  for (const gate of airspaceFor(game).soundGates) {
    const nearby = Math.abs(game.x - gate.x) <= 54 && game.y >= gate.y && game.y <= gate.y + gate.height;
    const tuned = nearby && soundGateIsTuned(game, gate);
    const color = tuned ? "#fff0a8" : nearby ? "#ff997d" : "#b9d7d8";
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = tuned ? "#fff0a824" : "#9bc8cc14"; ctx.lineWidth = tuned ? 5 : 3;
    ctx.setLineDash(tuned ? [] : [8, 9]);
    ctx.fillRect(gate.x - 18, gate.y, 36, gate.height);
    ctx.beginPath(); ctx.moveTo(gate.x, gate.y); ctx.lineTo(gate.x, gate.y + gate.height); ctx.stroke();
    ctx.setLineDash([]);
    for (let y = gate.y + 82; y < gate.y + gate.height; y += 54) {
      ctx.beginPath(); ctx.arc(gate.x, y, tuned ? 13 : 9, 0, Math.PI * 2); ctx.stroke();
    }
    if (game.messageTime <= 0) {
      ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = color;
      ctx.fillText("32–68% · SOUND GATE", gate.x, gate.y + 18);
    }
    ctx.restore();
  }
}

function drawWind() {
  const wind = windAt(game.elapsed);
  if (game.mode === "title") return;
  const alpha = wind.phase === "calm" ? 0.16 : wind.phase === "warning" ? 0.42 : 0.8;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = wind.phase === "gust" ? "#fff0c0" : "#cce8ee"; ctx.lineWidth = wind.phase === "gust" ? 4 : 2;
  for (let i = 0; i < 7; i++) {
    const visualTime = preferences.reducedMotion ? 0 : game.elapsed;
    const offset = ((visualTime * (wind.phase === "gust" ? 210 : 55) + i * 149) % 1080) - 60;
    const x = wind.direction > 0 ? offset : WIDTH - offset;
    const y = 86 + i * 54;
    ctx.beginPath(); ctx.moveTo(x - wind.direction * 80, y); ctx.quadraticCurveTo(x, y - 10, x + wind.direction * 85, y + 2); ctx.stroke();
  }
  ctx.restore();
  if (wind.phase === "warning") {
    ctx.fillStyle = "#eef7f5"; ctx.font = "600 15px system-ui"; ctx.textAlign = "center";
    ctx.fillText(`${wind.direction > 0 ? "→" : "←"} GALE IN ${wind.remaining.toFixed(1)}s`, WIDTH / 2, 72);
  }
}

function drawRibbon(ribbon, collected, index) {
  if (collected) return;
  const pulse = preferences.reducedMotion ? 1 : 1 + Math.sin(game.elapsed * 3 + index) * 0.07;
  ctx.save(); ctx.translate(ribbon.x, ribbon.y); ctx.scale(pulse, pulse);
  ctx.strokeStyle = "#ffd57c"; ctx.fillStyle = "#6c4d31"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI * 0.15, Math.PI * 1.85); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, -4); ctx.lineTo(0, 24); ctx.lineTo(16, -4); ctx.fill();
  ctx.fillStyle = "#fff1bd"; ctx.beginPath(); ctx.arc(0, -3, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawKite() {
  const danger = game.tension >= 0.78;
  ctx.strokeStyle = danger ? "#ff735f" : "#f3dfb5"; ctx.lineWidth = 2 + game.tension * 2;
  ctx.beginPath(); ctx.moveTo(480, 505); ctx.quadraticCurveTo((480 + game.x) / 2 + game.vx * 0.12, (505 + game.y) / 2 + 26, game.x, game.y); ctx.stroke();
  ctx.save(); ctx.translate(game.x, game.y); ctx.rotate(game.vx * 0.0015);
  ctx.fillStyle = "#f4ead1"; ctx.strokeStyle = "#a6373e"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(31, 0); ctx.lineTo(0, 35); ctx.lineTo(-31, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(0, 34); ctx.moveTo(-29, 0); ctx.lineTo(29, 0); ctx.stroke();
  ctx.strokeStyle = "#f4d48a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 34); ctx.quadraticCurveTo(-18, 48, 4, 60); ctx.stroke();
  ctx.restore();
}

function drawHud() {
  roundRect(28, 24, 220, 58, 9, "#091126b8", "#d9e1e244");
  ctx.textAlign = "left"; ctx.fillStyle = "#dbe7eb"; ctx.font = "600 13px system-ui"; ctx.fillText("THREAD TENSION", 44, 46);
  ctx.fillStyle = "#39455c"; ctx.fillRect(44, 56, 184, 10);
  ctx.fillStyle = game.tension >= .78 ? "#ff735f" : "#f2d789"; ctx.fillRect(44, 56, 184 * Math.min(1, game.tension), 10);
  ctx.fillStyle = "#dbe7eb"; ctx.font = "600 14px system-ui"; ctx.fillText(`${game.ribbons.filter(Boolean).length} / 3 CHIMES`, 785, 48);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = game.ribbons[i] ? "#ffd57c" : "#53617a"; ctx.beginPath(); ctx.arc(804 + i * 28, 66, 7, 0, Math.PI * 2); ctx.fill(); }
  if (game.messageTime > 0) { ctx.textAlign = "center"; ctx.fillStyle = "#fff0c7"; ctx.font = "700 18px system-ui"; ctx.fillText(game.message, WIDTH / 2, 104); }
  ctx.textAlign = "center"; ctx.fillStyle = isSheltered(game) ? "#f4fbff" : "#aebed0"; ctx.font = "700 12px system-ui";
  const gate = soundGateAt(game);
  const condition = isSheltered(game) ? " · SHELTERED" : downdraftAt(game) ? " · SINKING" : galeLiftAt(game) ? " · LIFTING" : gate ? soundGateIsTuned(game, gate) ? " · IN TUNE" : " · OUT OF TUNE" : "";
  ctx.fillText(`${airspaceFor(game).name}${condition}`, WIDTH / 2, 38);
  if (game.ribbons.every(Boolean)) { ctx.textAlign = "center"; ctx.fillStyle = "#fff0c7"; ctx.font = "600 15px system-ui"; ctx.fillText("RELEASE SPACE · RETURN TO THE LANDING GLOW", WIDTH / 2, 506); }
  ctx.fillStyle = "#f6dc93aa"; ctx.fillRect(402, 500, 156, 6);
}

function overlay(title, subtitle, prompt) {
  ctx.fillStyle = "#071022cc"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center"; ctx.fillStyle = "#f5e6bc"; ctx.font = "700 54px Georgia, serif"; ctx.fillText(title, WIDTH / 2, 205);
  ctx.fillStyle = "#c8d6df"; ctx.font = "400 18px system-ui"; ctx.fillText(subtitle, WIDTH / 2, 247);
  ctx.fillStyle = "#ffe09a"; ctx.font = "700 15px system-ui"; ctx.fillText(prompt, WIDTH / 2, 306);
}

function drawSettings() {
  ctx.fillStyle = "#071022ee"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center"; ctx.fillStyle = "#f5e6bc"; ctx.font = "700 46px Georgia, serif"; ctx.fillText("WIND TUNING", WIDTH / 2, 142);
  ctx.fillStyle = "#9fb1c5"; ctx.font = "500 15px system-ui"; ctx.fillText("ARROWS CHANGE · S OR ESC CLOSE", WIDTH / 2, 176);
  const rows = [
    { label: "SOUND VOLUME", value: preferences.volume === 0 ? "MUTED" : `${Math.round(preferences.volume * 100)}%` },
    { label: "REDUCED MOTION", value: preferences.reducedMotion ? "ON" : "OFF" },
  ];
  rows.forEach((row, index) => {
    const y = 244 + index * 88;
    roundRect(250, y - 34, 460, 64, 8, selectedSetting === index ? "#273c58" : "#101d35", selectedSetting === index ? "#ffe09a" : "#52647b");
    ctx.textAlign = "left"; ctx.fillStyle = "#d7e2e7"; ctx.font = "650 16px system-ui"; ctx.fillText(row.label, 278, y + 6);
    ctx.textAlign = "right"; ctx.fillStyle = selectedSetting === index ? "#ffe09a" : "#b9c7d2"; ctx.fillText(`‹  ${row.value}  ›`, 680, y + 6);
  });
  ctx.textAlign = "center"; ctx.fillStyle = "#91a5b8"; ctx.font = "400 14px system-ui";
  ctx.fillText("Progress and settings save automatically on this device.", WIDTH / 2, 438);
}

function draw() {
  drawSky(); drawGaleLifts(); drawSoundGates(); drawWind(); drawDowndrafts(); drawClouds();
  airspaceFor(game).ribbons.forEach((r, i) => drawRibbon(r, game.ribbons[i], i));
  if (game.mode !== "title") { drawKite(); drawHud(); }
  if (game.mode === "title") overlay("GALE THREAD", `continue from ${airspaceFor(game).name.toLowerCase()} · bring three chimes home`, "ENTER TO LAUNCH · S SETTINGS");
  if (game.mode === "paused") overlay("WIND HELD", "the thread waits with you", "ESC CONTINUE · S SETTINGS · R RETRY");
  if (game.mode === "lost") overlay("THREAD PARTED", "the gale took the line, not the lesson", "ENTER OR R TO TRY AGAIN");
  if (game.mode === "won" && game.airspace === 0) overlay("FIRST CHIMES RETURN", "the silver cloud waits beyond the open wind", "ENTER TO CROSS INTO CLOUD LEE");
  if (game.mode === "won" && game.airspace === 1) overlay("TWO SKIES ANSWER", "a falling seam divides the final sky", "ENTER TO CROSS INTO FALLING WEFT");
  if (game.mode === "won" && game.airspace === 2) overlay("THREE SKIES ANSWER", "the next gale can carry an open thread upward", "ENTER TO CROSS INTO TURNING TACK");
  if (game.mode === "won" && game.airspace === 3) overlay("FOUR SKIES ANSWER", "the sounding pass asks the thread to hold its note", "ENTER TO CROSS INTO RESONANT PASS");
  if (game.mode === "won" && game.airspace === AIRSPACES.length - 1) overlay("FIVE SKIES ANSWER", "fifteen chimes return on five unbroken threads", "ENTER TO FLY RESONANT PASS AGAIN");
  if (settingsOpen) drawSettings();
}

function frame(now) {
  accumulator += Math.min((now - last) / 1000, 0.1); last = now;
  while (accumulator >= FIXED_STEP) {
    const steer = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    if (!settingsOpen) handleEvents(update(game, { steer, reel: keys.has("Space") }, FIXED_STEP));
    accumulator -= FIXED_STEP;
  }
  draw();
  const status = settingsOpen
    ? `Settings. ${selectedSetting === 0 ? "Sound volume" : "Reduced motion"} selected. Sound volume ${Math.round(preferences.volume * 100)} percent. Reduced motion ${preferences.reducedMotion ? "on" : "off"}. Use arrow keys to change. Press S or Escape to close.`
    : accessibleStatus(game);
  canvas.setAttribute("aria-label", status);
  if (status !== lastAccessible && (game.mode !== "playing" || Math.floor(game.elapsed) % 3 === 0)) { live.textContent = status; lastAccessible = status; }
  window.__GALE_THREAD__ = { snapshot: () => structuredClone({ ...game, preferences, settingsOpen, selectedSetting }) };
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
