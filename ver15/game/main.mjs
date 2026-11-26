import { canReceiveThrow, createGame, step, gameLength, grabTarget, impactRadius, laneDistance, throwLane } from './rules.mjs';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const button = document.querySelector('button');
const status = document.querySelector('#status');
const keys = new Set();
let game = createGame();
let mode = 'title';
let grab = false;
let dodge = false;
let sparks = [];
let audio;
let previous = 0;
let remainder = 0;
const tick = 1 / 60;

function setMode(next) {
  mode = next;
  button.textContent = next === 'play' ? '一時停止' : next === 'pause' ? '再開' : next === 'result' ? '再挑戦' : '開始';
  status.textContent = next === 'result' ? game.over + ' · ' + game.score + ' 点'
    : next === 'pause' ? '一時停止中'
    : next === 'play' ? '暴走機をつかみ、別の機体に投げつけよう。' : status.textContent;
  grab = false;
  dodge = false;
}

function toggle() {
  if (mode === 'play') {
    setMode('pause');
    return;
  }
  audio ??= new AudioContext();
  audio.resume().catch(() => {});
  if (mode !== 'pause') {
    game = createGame();
    sparks = [];
    remainder = 0;
  }
  setMode('play');
}

button.addEventListener('click', toggle);
window.addEventListener('blur', () => {
  keys.clear();
  if (mode === 'play') setMode('pause');
});
window.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX', 'Escape', 'Enter'].includes(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'Enter' || (event.code === 'Escape' && ['play', 'pause'].includes(mode))) toggle();
  if (mode !== 'play') return;
  if (event.code === 'KeyZ') grab = true;
  if (event.code === 'KeyX') dodge = true;
});
window.addEventListener('keyup', event => keys.delete(event.code));

function effect(kind, entity) {
  const sounds = { grab: [230, 510], throw: [350, 100], impact: [120, 43], land: [95, 61], scrap: [180, 95], hit: [210, 55], dodge: [270, 140], miss: [90, 70] };
  if (audio?.state === 'running') {
    const [start, end] = sounds[kind];
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const at = audio.currentTime;
    oscillator.type = kind === 'impact' ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(start, at);
    oscillator.frequency.exponentialRampToValueAtTime(end, at + 0.15);
    gain.gain.setValueAtTime(0.10, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.17);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(at + 0.18);
  }
  if (['grab', 'throw', 'impact', 'land', 'scrap', 'hit'].includes(kind)) {
    const color = kind === 'hit' ? '#ff6858' : kind === 'scrap' ? '#a69d96' : '#ffdd80';
    sparks.push({ x: entity.x, y: entity.y - (kind === 'land' ? 0 : 18), age: 0, color, strong: kind === 'impact' });
  }
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function label(value, x, y, size, color = '#ffedca') {
  ctx.font = 'bold ' + size + 'px system-ui';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function draw() {
  rect(0, 0, 800, 450, '#1d252c');
  rect(0, 140, 800, 258, '#544754');
  rect(0, 398, 800, 52, '#161a20');
  for (let x = 8; x < 800; x += 96) {
    rect(x, 56, 66, 75, '#10171c');
    rect(x + 4, 83, 58, 44, '#ae4e31');
    rect(x + 7, 105, 52, 19, '#fb9f52');
    rect(x + 35, 143, 8, 12, '#f2a74f');
  }
  for (let y = 177; y < 399; y += 42) rect(0, y, 800, 2, '#776273');
  const target = game.grab ? null : grabTarget(game);
  const lane = game.grab ? throwLane(game) : null;
  if (lane) {
    const { start, end } = lane;
    const width = Math.abs(end - start);
    rect(Math.min(start, end), game.y - impactRadius('runner'), width, impactRadius('runner') * 2, '#ffe0a126');
    ctx.strokeStyle = '#ffe0a1';
    ctx.setLineDash([8, 9]);
    ctx.beginPath();
    ctx.moveTo(start, game.y);
    ctx.lineTo(end, game.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const actor of game.enemies) {
    if (!actor.shift) continue;
    const { from, to, progress } = actor.shift;
    const direction = Math.sign(to - from);
    ctx.strokeStyle = '#ffc079';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(actor.x, to, 34, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let index = 1; index <= 3; index++) {
      const y = actor.y + (to - actor.y) * index / 4;
      ctx.beginPath();
      ctx.moveTo(actor.x - 8, y - 5 * direction);
      ctx.lineTo(actor.x, y);
      ctx.lineTo(actor.x + 8, y - 5 * direction);
      ctx.stroke();
    }
    rect(actor.x - 26, to + 14, 52, 4, '#302630');
    rect(actor.x - 26, to + 14, 52 * progress, 4, '#ffc079');
  }
  for (const actor of [...game.enemies, game].sort((a, b) => a.y - b.y)) {
    const player = actor === game;
    const boss = actor.kind === 'foreman';
    const flash = player ? game.invulnerable && Math.floor(game.time * 18) % 2 : actor.clock >= 1.55 && actor.clock < 2.55 && actor.kind !== 'runner';
    const width = boss ? 67 : player ? 42 : 29;
    const height = boss ? 57 : player ? 38 : 25;
    const inLane = lane && !player && actor !== game.grab && canReceiveThrow(actor) &&
      laneDistance(actor, lane.start, lane.end, game.y) < impactRadius(actor.kind);
    ctx.save();
    ctx.translate(actor.x, actor.y);
    ctx.fillStyle = '#322832';
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.65, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (actor === target || inLane) {
      ctx.strokeStyle = '#ffe0a1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const lift = actor.shift ? 28 * Math.sin(Math.PI * actor.shift.progress) : 0;
    ctx.translate(0, actor.flight ? -18 : -lift);
    if (actor.flight) ctx.rotate(actor.flight * Math.PI * 4);
    if (actor.recoil > 0) ctx.rotate(actor.recoil * actor.recoilDirection);
    const bodyColor = actor.shift ? '#c59177' : actor.recoil > 0 || flash ? '#fff0be'
      : player ? '#49cfc6' : boss ? '#bd684b' : '#b58c6c';
    rect(-width / 2, -height, width, height - 4, bodyColor);
    rect(-width / 2 - 5, -height + 9, 10, 15, '#242b34');
    rect(width / 2 - 5, -height + 9, 10, 15, '#242b34');
    rect(-width / 4, -height + 5, width / 2, 7, player ? '#14363d' : '#672b2d');
    if (player) {
      const claw = game.facing * 23;
      rect(claw - 7, -21, 14, 14, game.grab ? '#ffdb78' : '#bce7d8');
    }
    if (boss) {
      for (let n = 0; n < actor.hp; n++) rect(-20 + n * 15, -67, 11, 4, '#ffbe70');
      if (actor.shift) {
        ctx.textAlign = 'center';
        rect(-41, -88, 82, 18, '#161a20');
        label('投擲無効', 0, -74, 14, '#ffc079');
      }
    }
    ctx.restore();
  }
  for (const spark of sparks) {
    for (let n = 0; n < 8; n++) {
      const angle = (n / 8) * Math.PI * 2;
      const radius = 9 + spark.age * (spark.strong ? 180 : 115);
      rect(spark.x + Math.cos(angle) * radius, spark.y + Math.sin(angle) * radius, spark.strong ? 8 : 5, spark.strong ? 5 : 3, spark.color);
    }
  }
  label('耐久 ' + game.hp, 24, 35, 20);
  label(String(Math.max(0, Math.ceil(gameLength - game.time))), 386, 35, 20);
  label('得点 ' + game.score, 650, 35, 20);
  label(game.time < 23 ? '搬入口' : game.time < 64 ? '圧延床' : '監督機区画', 24, 431, 19, '#e8af77');
  if (mode !== 'play') {
    rect(100, 175, 600, 106, '#161a20');
    const heading = mode === 'title' ? 'FOUNDRY CLAMP' : mode === 'pause' ? '一時停止' : game.over;
    ctx.textAlign = 'center';
    label(heading, 400, 224, 32);
    label(mode === 'title' ? 'Zで暴走機をつかみ、もう一度Zで投げる' : 'Enter', 400, 256, 17);
    ctx.textAlign = 'left';
  }
}

function frame(now) {
  if (mode === 'play' && previous) {
    remainder += Math.min(0.1, (now - previous) / 1000);
    while (remainder >= tick && mode === 'play') {
      step(game, {
        left: keys.has('ArrowLeft'), right: keys.has('ArrowRight'),
        up: keys.has('ArrowUp'), down: keys.has('ArrowDown'), grab, dodge,
      }, tick, effect);
      for (const spark of sparks) spark.age += tick;
      sparks = sparks.filter(spark => spark.age < 0.23);
      grab = false;
      dodge = false;
      remainder -= tick;
      if (game.over) setMode('result');
    }
  }
  previous = now;
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
