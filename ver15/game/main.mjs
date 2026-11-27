import { createGame, firstThrowContact, step, gameLength, grabTarget, impactRadius, rollerContactRadius, rollerRecovering, throwLane } from './rules.mjs';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const button = document.querySelector('button');
const practiceControl = document.querySelector('#practice');
const status = document.querySelector('#status');
const keys = new Set();
let game = createGame();
let mode = 'title';
let practice = false;
let grab = false;
let dodge = false;
let sparks = [];
let audio;
let driveAudio;
let motion = { x: 0, y: 0 };
let previous = 0;
let remainder = 0;
const tick = 1 / 60;

function setMode(next) {
  mode = next;
  practiceControl.disabled = next === 'play' || next === 'pause';
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
    practice = practiceControl.checked;
    game = createGame(practice);
    sparks = [];
    motion = { x: 0, y: 0 };
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
  const sounds = { grab: [230, 510], throw: [350, 100], impact: [120, 43], land: [95, 61], brake: [74, 39], scrap: [180, 95], hit: [210, 55], dodge: [270, 140], miss: [90, 70] };
  if (audio?.state === 'running' && sounds[kind]) {
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
  if (['grab', 'throw', 'impact', 'land', 'brake', 'scrap', 'hit', 'drop'].includes(kind)) {
    const color = kind === 'hit' ? '#ff6858' : kind === 'scrap' ? '#a69d96' : '#ffdd80';
    sparks.push({ x: entity.x, y: entity.y - (kind === 'land' || kind === 'brake' ? 0 : 18), age: 0, color, strong: kind === 'impact', dropped: kind === 'drop' });
  }
}

function updateDriveAudio(speed) {
  if (audio?.state !== 'running' || driveAudio?.speed === speed) return;
  const at = audio.currentTime;
  if (!driveAudio) {
    if (speed === 0) return;
    const motor = audio.createOscillator();
    const gain = audio.createGain();
    motor.type = 'triangle';
    gain.gain.value = 0;
    motor.connect(gain).connect(audio.destination);
    motor.start();
    driveAudio = { motor, gain };
  }
  driveAudio.speed = speed;
  driveAudio.motor.frequency.setTargetAtTime(48 + speed * 0.19, at, 0.035);
  driveAudio.gain.gain.setTargetAtTime(Math.min(0.035, speed * 0.00012), at, 0.03);
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
  for (const actor of game.enemies) {
    if (actor.chargeEndX == null || actor === game.grab) continue;
    const left = Math.min(actor.x, actor.chargeEndX) - rollerContactRadius;
    const right = Math.max(actor.x, actor.chargeEndX) + rollerContactRadius;
    rect(left, actor.y - rollerContactRadius, right - left, rollerContactRadius * 2, '#ff655947');
    rect(left, actor.y - rollerContactRadius, right - left, 2, '#ff8875');
    rect(left, actor.y + rollerContactRadius - 2, right - left, 2, '#ff8875');
    if (Math.abs(actor.chargeEndX - actor.x) > 5) {
      const direction = actor.chargeEndX < actor.x ? '‹' : '›';
      label(direction, (actor.x + actor.chargeEndX) / 2 - 5, actor.y + 6, 21, '#ffd7a6');
    }
  }
  const target = game.grab ? null : grabTarget(game);
  const lane = game.grab ? throwLane(game) : null;
  const foreman = game.enemies.find(actor => actor.kind === 'foreman' && actor.hp > 0);
  const contact = lane && firstThrowContact(game, game.grab, lane.start, lane.end, game.y);
  if (lane) {
    const { start } = lane;
    const end = contact ? start + game.facing * contact.distance : lane.end;
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
    const roller = actor.kind === 'roller';
    const flash = player ? game.invulnerable && Math.floor(game.time * 18) % 2 : actor.clock >= 1.55 && actor.clock < 2.55 && actor.kind !== 'runner';
    const width = boss ? 67 : player ? 42 : roller ? 48 : 29;
    const height = boss ? 57 : player ? 38 : roller ? 24 : 32;
    ctx.save();
    ctx.translate(actor.x, actor.y);
    ctx.fillStyle = '#322832';
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.65, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    if (actor === target) {
      ctx.strokeStyle = '#ffe0a1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (player) {
      const speed = Math.hypot(motion.x, motion.y);
      if (speed > 0) {
        ctx.strokeStyle = speed > 200 ? '#ffcb82' : '#8abba9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const tread of [-13, 13]) {
          ctx.moveTo(tread, 2);
          ctx.lineTo(tread - motion.x * 0.09, 2 - motion.y * 0.09);
        }
        ctx.stroke();
      }
    }
    if (actor.chargeEndX != null || (actor === target && rollerRecovering(actor))) {
      ctx.textAlign = 'center';
      rect(-40, -56, 80, 20, '#161a20');
      label(actor === target ? 'Zでつかむ' : '掴み不可', 0, -41, 14, actor === target ? '#ffedca' : '#ffab91');
    }
    const lift = actor.shift ? 28 * Math.sin(Math.PI * actor.shift.progress) : 0;
    ctx.translate(0, actor.flight ? -18 : -lift);
    if (player) ctx.transform(1, 0, -motion.x / 1100, 1 + motion.y / 2400, 0, 0);
    if (actor.flight) ctx.rotate(actor.flight * Math.PI * 4);
    if (actor.recoil > 0) ctx.rotate(actor.recoil * actor.recoilDirection);
    const bodyColor = actor.shift ? '#c59177' : actor.recoil > 0 || flash ? '#fff0be'
      : player ? '#49cfc6' : boss ? '#bd684b' : '#b58c6c';
    if (roller) {
      const direction = actor.chargeEndX != null ? actor.chargeFacing : Math.sign(game.x - actor.x) || 1;
      ctx.scale(direction, 1);
      rect(-24, -14, 48, 12, '#242b34');
      rect(-22, -24, 35, 14, bodyColor);
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(17, -13, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#242b34';
      ctx.beginPath();
      ctx.arc(17, -13, 6, 0, Math.PI * 2);
      ctx.fill();
      rect(-17, -20, 21, 4, '#672b2d');
    } else {
      rect(-width / 2, -height, width, height - (player || boss ? 4 : 8), bodyColor);
      rect(-width / 2 - 5, -height + 9, 10, 15, '#242b34');
      rect(width / 2 - 5, -height + 9, 10, 15, '#242b34');
      rect(-width / 4, -height + 5, width / 2, 7, player ? '#14363d' : '#672b2d');
      if (!player && !boss) {
        const stride = Math.round(Math.sin(actor.clock * Math.PI * 8) * 3);
        rect(-11, -9, 7, 7 + stride, bodyColor);
        rect(4, -9, 7, 7 - stride, bodyColor);
      }
    }
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
  if (contact) {
    const { actor } = contact;
    ctx.save();
    ctx.strokeStyle = '#ffe0a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(actor.x, actor.y + 5, actor.kind === 'foreman' ? 40 : 20, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (const spark of sparks) {
    if (spark.dropped) {
      label('落とした', spark.x - 29, spark.y - 27 - spark.age * 50, 15, '#ffdd80');
      continue;
    }
    for (let n = 0; n < 8; n++) {
      const angle = (n / 8) * Math.PI * 2;
      const radius = 9 + spark.age * (spark.strong ? 180 : 115);
      rect(spark.x + Math.cos(angle) * radius, spark.y + Math.sin(angle) * radius, spark.strong ? 8 : 5, spark.strong ? 5 : 3, spark.color);
    }
  }
  label('耐久 ' + game.hp, 24, 35, 20);
  label(String(Math.max(0, Math.ceil(gameLength - game.time))), 386, 35, 20);
  label('得点 ' + game.score, 650, 35, 20);
  label(practice ? '練習 · 監督機区画' : game.time < 23 ? '搬入口' : game.time < 64 ? '圧延床' : '監督機区画', 24, 431, 19, '#e8af77');
  if (mode === 'play' && foreman && (foreman.shift || lane)) {
    let cue = '監督機に射線を合わせる';
    if (foreman.shift) cue = '着地を待つ';
    else if (contact?.actor === foreman) cue = 'Zで投げる';
    else if (contact) cue = '手前に敵機 · 位置を変える';
    ctx.textAlign = 'center';
    label(cue, 470, 431, 19, foreman.shift ? '#ffc079' : '#ffedca');
    ctx.textAlign = 'left';
  }
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
      const { x, y } = game;
      step(game, {
        left: keys.has('ArrowLeft'), right: keys.has('ArrowRight'),
        up: keys.has('ArrowUp'), down: keys.has('ArrowDown'), grab, dodge,
      }, tick, effect);
      motion = { x: (game.x - x) / tick, y: (game.y - y) / tick };
      for (const spark of sparks) spark.age += tick;
      sparks = sparks.filter(spark => spark.age < 0.23);
      grab = false;
      dodge = false;
      remainder -= tick;
      if (game.over) setMode('result');
    }
  }
  updateDriveAudio(mode === 'play' ? Math.round(Math.hypot(motion.x, motion.y)) : 0);
  previous = now;
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
