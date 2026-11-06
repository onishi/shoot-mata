import "./style.css";
import { WIDTH, HEIGHT, FIXED_STEP, RIBBONS, accessibleStatus, createGame, retry, startGame, togglePause, update, windAt } from "./model.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const live = document.querySelector("#live");
const game = createGame();
const keys = new Set();
let last = performance.now();
let accumulator = 0;
let audio;
let lastAccessible = "";

function ensureAudio() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") audio.resume();
}

function tone(frequency, duration = 0.12, volume = 0.05, delay = 0) {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.001, audio.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + delay + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + delay + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(audio.currentTime + delay);
  oscillator.stop(audio.currentTime + delay + duration + 0.03);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "ribbon") tone([392, 523, 659][event.index], 0.3, 0.07);
    if (event.type === "lost") tone(110, 0.55, 0.08);
    if (event.type === "won") [392, 523, 659].forEach((note, i) => tone(note, 0.6, 0.06, i * 0.1));
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "Space", "Enter", "Escape"].includes(event.code)) event.preventDefault();
  if (event.repeat && ["Enter", "Escape", "KeyR"].includes(event.code)) return;
  keys.add(event.code);
  if (event.code === "Enter") { ensureAudio(); startGame(game); canvas.focus(); }
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

function drawWind() {
  const wind = windAt(game.elapsed);
  if (game.mode === "title") return;
  const alpha = wind.phase === "calm" ? 0.16 : wind.phase === "warning" ? 0.42 : 0.8;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = wind.phase === "gust" ? "#fff0c0" : "#cce8ee"; ctx.lineWidth = wind.phase === "gust" ? 4 : 2;
  for (let i = 0; i < 7; i++) {
    const offset = ((game.elapsed * (wind.phase === "gust" ? 210 : 55) + i * 149) % 1080) - 60;
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
  const pulse = 1 + Math.sin(game.elapsed * 3 + index) * 0.07;
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
  if (game.ribbons.every(Boolean)) { ctx.textAlign = "center"; ctx.fillStyle = "#fff0c7"; ctx.font = "600 15px system-ui"; ctx.fillText("RELEASE SPACE · RETURN TO THE LANDING GLOW", WIDTH / 2, 506); }
  ctx.fillStyle = "#f6dc93aa"; ctx.fillRect(402, 500, 156, 6);
}

function overlay(title, subtitle, prompt) {
  ctx.fillStyle = "#071022cc"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = "center"; ctx.fillStyle = "#f5e6bc"; ctx.font = "700 54px Georgia, serif"; ctx.fillText(title, WIDTH / 2, 205);
  ctx.fillStyle = "#c8d6df"; ctx.font = "400 18px system-ui"; ctx.fillText(subtitle, WIDTH / 2, 247);
  ctx.fillStyle = "#ffe09a"; ctx.font = "700 15px system-ui"; ctx.fillText(prompt, WIDTH / 2, 306);
}

function draw() {
  drawSky(); drawWind();
  RIBBONS.forEach((r, i) => drawRibbon(r, game.ribbons[i], i));
  if (game.mode !== "title") { drawKite(); drawHud(); }
  if (game.mode === "title") overlay("GALE THREAD", "read the gust · mind the thread · bring three chimes home", "PRESS ENTER TO LAUNCH");
  if (game.mode === "paused") overlay("WIND HELD", "the thread waits with you", "ESC TO CONTINUE · R TO RETRY");
  if (game.mode === "lost") overlay("THREAD PARTED", "the gale took the line, not the lesson", "ENTER OR R TO TRY AGAIN");
  if (game.mode === "won") overlay("THE SKY ANSWERS", "three chimes return on one unbroken thread", "ENTER TO FLY AGAIN");
}

function frame(now) {
  accumulator += Math.min((now - last) / 1000, 0.1); last = now;
  while (accumulator >= FIXED_STEP) {
    const steer = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    handleEvents(update(game, { steer, reel: keys.has("Space") }, FIXED_STEP));
    accumulator -= FIXED_STEP;
  }
  draw();
  const status = accessibleStatus(game);
  canvas.setAttribute("aria-label", status);
  if (status !== lastAccessible && (game.mode !== "playing" || Math.floor(game.elapsed) % 3 === 0)) { live.textContent = status; lastAccessible = status; }
  window.__GALE_THREAD__ = { snapshot: () => structuredClone(game) };
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
