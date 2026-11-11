import { RingwardAudio } from './audio.js';
import { angleForSlot, castHammer, createGame, drainAudioEvents, driveDemo, insertCoin, movePlayer, returnToAttract, startCredit, startDemo, startGuardian, startNextWave, step, WAVES } from './model.js';
import { keyLabel, loadSave, rebind, storeSave } from './storage.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
let game = createGame();
let paused = false;
let save = loadSave();
let menu = 'game';
let settingRow = 0;
let captureAction = null;
let previous = performance.now();
let cabinetElapsed = 0;
let demoControlElapsed = 0;
const audio = new RingwardAudio();
audio.setVolume(save.volume);
const settings = [
  { label: 'SOUND VOLUME', type: 'volume' },
  { label: 'REDUCED MOTION', type: 'motion' },
  { label: 'RUN COUNTER-CLOCKWISE', type: 'key', action: 'left' },
  { label: 'RUN CLOCKWISE', type: 'key', action: 'right' },
  { label: 'CAST ECHO', type: 'key', action: 'cast' },
  { label: 'RETURN TO CABINET', type: 'back' }
];
const WAVE_COUNT = WAVES.length;
const WAVE_BRIEFS = {
  1: {
    title: 'WAVE 2 — IRON PROCESSION',
    line1: 'CYAN GUARD STOPS THE OUTBOUND HIT', color1: '#9adbe8',
    line2: 'THE GOLD RETURN BREAKS THROUGH', color2: '#ffcf55'
  },
  2: {
    title: 'WAVE 3 — AMBER RUSH',
    line1: 'AMBER RUSHERS CLOSE TWICE AS FAST', color1: '#ffae55',
    line2: 'ONE CLEAN STRIKE STOPS EACH CHARGE', color2: '#f5e6b0'
  },
  3: {
    title: 'ACT II — LANTERN VORTEX',
    line1: 'VIOLET ORBITERS STEP ACROSS THE RING', color1: '#d09cff',
    line2: 'SIDE FLASH SHOWS THEIR NEXT MOVE', color2: '#80f0cf'
  },
  4: {
    title: 'WAVE 5 — CROSSING LINES',
    line1: 'HOLD ONE LINE OR LEAD THE MOVING MARK', color1: '#80f0cf',
    line2: 'THE RETURN CAN CATCH ITS NEW POSITION', color2: '#ffcf55'
  },
  5: {
    title: 'WAVE 6 — SECOND WATCH',
    line1: 'GUARD • RUSH • ORBIT IN ONE PROCESSION', color1: '#f1b2ff',
    line2: 'CHOOSE THE FIRST THREAT — THEN CATCH', color2: '#ffe29a'
  },
  6: {
    title: 'ACT III — SKY DANCE',
    line1: 'GREEN DANCERS STEP AS YOUR OUTBOUND HITS', color1: '#9af5a8',
    line2: 'FOLLOW ONE LINE AND STILL CATCH THE RETURN', color2: '#ffe29a'
  },
  7: {
    title: 'WAVE 8 — BROKEN RHYTHM',
    line1: 'DANCERS PULL YOUR AIM • GUARDS HOLD THEIR LINE', color1: '#9af5a8',
    line2: 'CATCH FIRST — THEN TURN TO THE NEW MARK', color2: '#ffcf55'
  },
  8: {
    title: 'WAVE 9 — THIRD WATCH',
    line1: 'SHIFT • ORBIT • RUSH • GUARD IN ONE STORM', color1: '#bdefff',
    line2: 'READ THE FIRST THREAT AND KEEP YOUR RHYTHM', color2: '#ffe29a'
  },
  9: {
    title: 'ACT IV — MIRROR FOUNDRY',
    line1: 'BLUE REFRACTORS STEP WHEN THE HAMMER TURNS', color1: '#9eeeff',
    line2: 'CAST AT THE CHEVRON — THE RETURN WILL MEET IT', color2: '#ffcf55'
  },
  10: {
    title: 'WAVE 11 — FRACTURED LINES',
    line1: 'YOUR TURN MOVES EVERY REFRACTOR AT ONCE', color1: '#9eeeff',
    line2: 'LEAD THE RETURN • THEN RECOVER THE CATCH', color2: '#ffe29a'
  },
  11: {
    title: 'WAVE 12 — FOURTH WATCH',
    line1: 'TURN • RUSH • GUARD • ORBIT • DANCE', color1: '#c4f5ff',
    line2: 'ONE CAST CHANGES THE WHOLE PROCESSION', color2: '#ffb36b'
  },
  12: {
    title: 'ACT V — MOON MIRROR',
    line1: 'WHITE MIRRORS COUNTERSTEP YOUR LEVER', color1: '#f2f5ff',
    line2: 'RUN INTO THE CROSSING LINE — THEN CAST', color2: '#ffcf55'
  },
  13: {
    title: 'WAVE 14 — CROSSED REFLECTIONS',
    line1: 'YOUR RUN MOVES MIRRORS • YOUR CAST MOVES OTHERS', color1: '#c6d8ff',
    line2: 'MAKE THE CROSSING BEFORE THE HAMMER FLIES', color2: '#9af5e5'
  },
  14: {
    title: 'WAVE 15 — FIFTH WATCH',
    line1: 'COUNTER • TURN • DANCE • ORBIT • RUSH • GUARD', color1: '#edf0ff',
    line2: 'CONTROL THE LEVER BEFORE YOU COMMIT THE CAST', color2: '#ffcf55'
  }
};

function polar(slot, radius) {
  const angle = angleForSlot(slot);
  return [320 + Math.cos(angle) * radius, 258 + Math.sin(angle) * radius];
}

function combatRadius(distance) {
  return 66 + distance * 68;
}

function text(value, x, y, size = 16, color = '#f5e6b0', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function drawBell() {
  ctx.save();
  ctx.translate(320, 258);
  ctx.fillStyle = '#1a0d17'; ctx.fillRect(-57, 43, 114, 10);
  ctx.fillStyle = '#6f2d28'; ctx.fillRect(-48, 35, 96, 9);
  ctx.fillStyle = '#29151c'; ctx.fillRect(-34, -62, 68, 13);
  ctx.fillStyle = '#b65d35'; ctx.fillRect(-28, -59, 56, 6);
  const brass = ctx.createLinearGradient(-42, 0, 42, 0);
  brass.addColorStop(0, '#704126'); brass.addColorStop(0.28, '#d49a42');
  brass.addColorStop(0.55, game.bell === 1 ? '#d85a38' : '#ffe18a'); brass.addColorStop(1, '#7e4728');
  ctx.fillStyle = brass; ctx.strokeStyle = '#ffe7a5'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-39, 34); ctx.quadraticCurveTo(-46, 13, -34, -18);
  ctx.quadraticCurveTo(-28, -43, -17, -50); ctx.lineTo(17, -50);
  ctx.quadraticCurveTo(28, -43, 34, -18); ctx.quadraticCurveTo(46, 13, 39, 34); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7a3e26'; ctx.lineWidth = 3;
  for (const y of [-20, 7, 27]) { ctx.beginPath(); ctx.moveTo(-35, y); ctx.quadraticCurveTo(0, y + 7, 35, y); ctx.stroke(); }
  ctx.fillStyle = '#29151c'; ctx.fillRect(-47, 31, 94, 10);
  ctx.fillStyle = '#ffd66d'; ctx.beginPath(); ctx.arc(0, 43, 8, 0, Math.PI * 2); ctx.fill();
  if (game.bell < 3) {
    ctx.strokeStyle = '#ff7b4b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(-4, 2); ctx.lineTo(7, 12); ctx.lineTo(-2, 28); ctx.stroke();
  }
  ctx.restore();
}

function drawArena() {
  const sky = ctx.createLinearGradient(0, 58, 0, 266);
  const actTwo = game.wave >= 3;
  const actThree = game.wave >= 6;
  const actFour = game.wave >= 9;
  const actFive = game.wave >= 12;
  sky.addColorStop(0, actFive ? '#06091f' : actFour ? '#210b24' : actThree ? '#071f2c' : actTwo ? '#120c2e' : '#080d2a');
  sky.addColorStop(0.58, actFive ? '#243b68' : actFour ? '#6d2133' : actThree ? '#17606b' : actTwo ? '#31305f' : '#273358');
  sky.addColorStop(1, actFive ? '#75a2b5' : actFour ? '#e2763b' : actThree ? '#82b36b' : actTwo ? '#2d817e' : '#b45147');
  ctx.fillStyle = sky; ctx.fillRect(0, 58, 640, 210);
  ctx.fillStyle = actFive ? '#eef4ff' : actFour ? '#fff0a0' : actThree ? '#e7f3a6' : actTwo ? '#a7e4c6' : '#d46b4d'; ctx.beginPath(); ctx.arc(320, 210, actFive ? 47 : 39, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#11162b';
  ctx.beginPath(); ctx.moveTo(0, 226); ctx.lineTo(72, 173); ctx.lineTo(130, 224); ctx.lineTo(205, 157); ctx.lineTo(275, 227); ctx.lineTo(366, 162); ctx.lineTo(438, 224); ctx.lineTo(529, 171); ctx.lineTo(640, 229); ctx.lineTo(640, 280); ctx.lineTo(0, 280); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#171426'; ctx.fillRect(0, 238, 640, 200);

  // Shrine eaves and lanterns frame the combat ring without obscuring it.
  ctx.fillStyle = '#3a171d'; ctx.fillRect(0, 92, 145, 13); ctx.fillRect(495, 92, 145, 13);
  ctx.fillStyle = '#9d3b31'; ctx.fillRect(19, 100, 16, 180); ctx.fillRect(605, 100, 16, 180);
  ctx.fillStyle = '#e05b3e'; ctx.fillRect(9, 96, 37, 10); ctx.fillRect(594, 96, 37, 10);
  for (const x of [57, 583]) {
    ctx.strokeStyle = '#5b302b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, 107); ctx.lineTo(x, 153); ctx.stroke();
    ctx.fillStyle = '#f6b64f'; ctx.fillRect(x - 9, 153, 18, 27); ctx.fillStyle = '#7d2925'; ctx.fillRect(x - 11, 150, 22, 5); ctx.fillRect(x - 11, 179, 22, 5);
  }

  if (actFive) {
    // Moonlit reflecting pools and paired silver gates make lever movement
    // itself visible as the fifth watch's governing motif.
    ctx.fillStyle = '#14284b'; ctx.fillRect(35, 122, 82, 128); ctx.fillRect(523, 122, 82, 128);
    ctx.strokeStyle = '#b9d9ef'; ctx.lineWidth = 5;
    for (const x of [76, 564]) {
      ctx.strokeRect(x - 34, 116, 68, 136);
      ctx.beginPath(); ctx.arc(x, 179, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 22, 179); ctx.lineTo(x + 22, 179); ctx.stroke();
    }
    ctx.fillStyle = '#7fb4c4'; ctx.fillRect(126, 231, 388, 12);
    ctx.strokeStyle = '#d6edff'; ctx.lineWidth = 2;
    for (let x = 145; x < 510; x += 42) { ctx.beginPath(); ctx.moveTo(x, 231); ctx.lineTo(x + 18, 243); ctx.stroke(); }
  } else if (actFour) {
    // Twin furnaces, suspended chains, and molten troughs give the fourth
    // watch a dense industrial silhouette distinct from the open sky court.
    for (const x of [75, 565]) {
      ctx.fillStyle = '#351425'; ctx.fillRect(x - 34, 112, 68, 132);
      ctx.strokeStyle = '#c85d43'; ctx.lineWidth = 5; ctx.strokeRect(x - 34, 112, 68, 132);
      ctx.fillStyle = '#ffb34f'; ctx.beginPath(); ctx.arc(x, 210, 20, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#a6e9ef'; ctx.lineWidth = 3;
      for (let y = 100; y < 202; y += 22) { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.strokeStyle = '#7dd9df'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(142, 126); ctx.lineTo(250, 163); ctx.lineTo(390, 122); ctx.lineTo(498, 160); ctx.stroke();
    ctx.fillStyle = '#f0713f'; ctx.fillRect(130, 232, 380, 10);
  } else if (actThree) {
    // Tall wind banners and stepped cloud rails make the third watch read as
    // an open, high-altitude court instead of another recolored shrine.
    for (const x of [76, 564]) {
      ctx.strokeStyle = '#d9f3cf'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, 105); ctx.lineTo(x, 231); ctx.stroke();
      ctx.fillStyle = '#2f9b83'; ctx.beginPath(); ctx.moveTo(x + 3, 113); ctx.lineTo(x + (x < 320 ? 34 : -34), 127); ctx.lineTo(x + 3, 151); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d7e86f'; ctx.beginPath(); ctx.moveTo(x + 3, 157); ctx.lineTo(x + (x < 320 ? 27 : -27), 171); ctx.lineTo(x + 3, 191); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#9ad9c2'; ctx.lineWidth = 5;
    for (const y of [214, 229]) { ctx.beginPath(); ctx.moveTo(116, y); ctx.bezierCurveTo(202, y - 30, 438, y + 24, 524, y - 8); ctx.stroke(); }
  } else if (actTwo) {
    ctx.strokeStyle = '#65d7bd'; ctx.lineWidth = 3;
    for (const x of [92, 548]) {
      ctx.beginPath(); ctx.arc(x, 205, 29, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, 205, 17, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#d391ff'; ctx.fillRect(x - 4, 174, 8, 62);
    }
  }

  const floor = ctx.createRadialGradient(320, 258, 55, 320, 258, 285);
  floor.addColorStop(0, '#47323c'); floor.addColorStop(0.5, '#29223a'); floor.addColorStop(1, '#111324');
  ctx.fillStyle = floor; ctx.beginPath(); ctx.ellipse(320, 274, 310, 174, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a86b3b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(320, 258, 190, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#4e4560'; ctx.lineWidth = 2;
  for (const radius of [82, 132, 166]) { ctx.beginPath(); ctx.arc(320, 258, radius, 0, Math.PI * 2); ctx.stroke(); }
  for (let slot = 0; slot < 16; slot++) {
    const [x1, y1] = polar(slot, 68); const [x2, y2] = polar(slot, 205);
    ctx.strokeStyle = slot % 4 === 0 ? '#8b5b52' : '#35314c';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (slot % 4 === 0) {
      const [mx, my] = polar(slot, 190); ctx.fillStyle = '#e4ad52';
      ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawEnemy(enemy, x, y) {
  const bob = Math.sin(game.tick * 0.2 + enemy.id * 1.7) * 2;
  ctx.save(); ctx.translate(x, y + bob); ctx.rotate(angleForSlot(enemy.slot) + Math.PI / 2);
  if (enemy.guardian) {
    const vortex = enemy.kind === 'vortexRegent';
    const gale = enemy.kind === 'galeSovereign';
    const prism = enemy.kind === 'prismEmperor';
    const tide = enemy.kind === 'tideOracle';
    const pulse = 1 + Math.sin(game.tick * (vortex ? 0.24 : gale ? 0.3 : prism ? 0.34 : tide ? 0.38 : 0.14)) * 0.06;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = enemy.flash ? '#ffffff' : tide ? '#e9f4ff' : prism ? '#aef6ff' : gale ? '#dff69a' : vortex ? '#e0a5ff' : '#ffe29a';
    ctx.fillStyle = tide ? '#17385a' : prism ? '#67263e' : gale ? '#155a56' : vortex ? '#35164d' : '#502028';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (tide) {
      ctx.moveTo(0, -44); ctx.lineTo(11, -25); ctx.lineTo(34, -30); ctx.lineTo(27, -7);
      ctx.lineTo(40, 12); ctx.lineTo(17, 14); ctx.lineTo(0, 35); ctx.lineTo(-17, 14);
      ctx.lineTo(-40, 12); ctx.lineTo(-27, -7); ctx.lineTo(-34, -30); ctx.lineTo(-11, -25);
    } else if (prism) {
      ctx.moveTo(0, -43); ctx.lineTo(12, -23); ctx.lineTo(38, -9); ctx.lineTo(22, 4);
      ctx.lineTo(29, 31); ctx.lineTo(0, 20); ctx.lineTo(-29, 31); ctx.lineTo(-22, 4);
      ctx.lineTo(-38, -9); ctx.lineTo(-12, -23);
    } else if (gale) {
      ctx.moveTo(0, -40); ctx.lineTo(13, -23); ctx.lineTo(35, -17); ctx.lineTo(23, 2);
      ctx.lineTo(32, 27); ctx.lineTo(8, 19); ctx.lineTo(0, 33); ctx.lineTo(-8, 19);
      ctx.lineTo(-32, 27); ctx.lineTo(-23, 2); ctx.lineTo(-35, -17); ctx.lineTo(-13, -23);
    } else if (vortex) {
      ctx.moveTo(0, -37); ctx.quadraticCurveTo(33, -27, 27, 8); ctx.lineTo(14, 29);
      ctx.lineTo(0, 20); ctx.lineTo(-14, 29); ctx.lineTo(-27, 8); ctx.quadraticCurveTo(-33, -27, 0, -37);
    } else {
      ctx.moveTo(0, -38); ctx.lineTo(24, -25); ctx.lineTo(31, 11); ctx.lineTo(17, 31);
      ctx.lineTo(0, 23); ctx.lineTo(-17, 31); ctx.lineTo(-31, 11); ctx.lineTo(-24, -25);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tide ? '#dff4ff' : prism ? '#7de1e8' : gale ? '#e3ef72' : vortex ? '#71e1c4' : '#e98545';
    ctx.beginPath(); ctx.arc(0, -6, 10 + enemy.phase * 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff3bd'; ctx.lineWidth = 3;
    for (let seal = 0; seal < enemy.phases; seal++) {
      const angle = -0.75 + seal * 0.75;
      const open = seal < enemy.phase - 1;
      ctx.globalAlpha = open ? 0.3 : 1;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * 24, 9 + Math.sin(angle) * 17, open ? 4 : 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (enemy.armor > 0) {
      ctx.strokeStyle = enemy.blocked ? '#ffffff' : '#80eaff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -4, 34, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    }
    if (enemy.orbitWarning) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
      const side = enemy.orbitDirection ?? 1;
      ctx.beginPath(); ctx.moveTo(side * 24, -4); ctx.lineTo(side * 43, 8); ctx.lineTo(side * 29, 19); ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const color = enemy.flash ? '#ffffff' : enemy.kind === 'bulwark' ? '#8d63c8' : enemy.kind === 'rusher' ? '#ed7d32' : enemy.kind === 'orbiter' ? '#b86be0' : enemy.kind === 'dancer' ? '#4fbd79' : enemy.kind === 'refractor' ? '#55b9cc' : enemy.kind === 'mirror' ? '#dbe9ff' : '#bc4054';
  ctx.strokeStyle = '#170d20'; ctx.lineWidth = 3;
  ctx.fillStyle = '#32152a'; ctx.beginPath(); ctx.ellipse(0, 8, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  if (enemy.kind === 'bulwark') {
    ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(12, -12); ctx.lineTo(15, 10); ctx.lineTo(7, 18); ctx.lineTo(-7, 18); ctx.lineTo(-15, 10); ctx.lineTo(-12, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#332147'; ctx.fillRect(-7, -9, 14, 16);
    if (enemy.armor > 0) {
      ctx.fillStyle = '#4cb8d4'; ctx.strokeStyle = enemy.blocked ? '#ffffff' : '#a5f1ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-17, -13); ctx.lineTo(0, -22); ctx.lineTo(17, -13); ctx.lineTo(14, 5); ctx.lineTo(0, 13); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (enemy.kind === 'rusher') {
    ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(9, -8); ctx.lineTo(7, 15); ctx.lineTo(0, 9); ctx.lineTo(-7, 15); ctx.lineTo(-9, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffcf55'; ctx.fillRect(-3, -13, 6, 8);
    ctx.strokeStyle = '#ffd875'; ctx.lineWidth = 3;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 8, -2); ctx.lineTo(side * 18, 5); ctx.lineTo(side * 10, 11); ctx.stroke(); }
  } else if (enemy.kind === 'orbiter') {
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(17, -8, 9, 16); ctx.lineTo(0, 9); ctx.lineTo(-9, 16); ctx.quadraticCurveTo(-17, -8, 0, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#72e2c2'; ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = enemy.orbitWarning ? '#ffffff' : '#72e2c2'; ctx.lineWidth = enemy.orbitWarning ? 4 : 2;
    const side = enemy.orbitDirection ?? 1;
    ctx.beginPath(); ctx.moveTo(side * 7, 1); ctx.lineTo(side * 20, 8); ctx.lineTo(side * 12, 14); ctx.stroke();
  } else if (enemy.kind === 'dancer') {
    const side = enemy.sidestepDirection ?? 1;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(10, -6); ctx.lineTo(17, 11); ctx.lineTo(4, 7); ctx.lineTo(0, 20); ctx.lineTo(-4, 7); ctx.lineTo(-17, 11); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e7ef79'; ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#dff69a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(side * 7, 2); ctx.lineTo(side * 21, -3); ctx.lineTo(side * 16, 8); ctx.stroke();
  } else if (enemy.kind === 'refractor') {
    const side = enemy.turnDirection ?? 1;
    ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(15, -7); ctx.lineTo(9, 18); ctx.lineTo(0, 10); ctx.lineTo(-9, 18); ctx.lineTo(-15, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e5fbff'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(7, -3); ctx.lineTo(0, 9); ctx.lineTo(-7, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b8f7ff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(side * 8, -2); ctx.lineTo(side * 24, 5); ctx.lineTo(side * 15, 14); ctx.stroke();
  } else if (enemy.kind === 'mirror') {
    ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(14, -10); ctx.lineTo(12, 16); ctx.lineTo(0, 21); ctx.lineTo(-12, 16); ctx.lineTo(-14, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#234567'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(8, -3); ctx.lineTo(0, 11); ctx.lineTo(-8, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f3f7ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, -2); ctx.lineTo(-11, 7); ctx.lineTo(-19, 14); ctx.moveTo(20, -2); ctx.lineTo(11, 7); ctx.lineTo(19, 14); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(12, -6); ctx.lineTo(10, 16); ctx.lineTo(0, 10); ctx.lineTo(-10, 16); ctx.lineTo(-12, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0a64c'; ctx.fillRect(-5, -11, 10, 7);
    ctx.strokeStyle = '#e2735b'; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-18, 8); ctx.moveTo(11, 0); ctx.lineTo(18, 8); ctx.stroke();
  }
  ctx.fillStyle = '#e9b85c'; ctx.fillRect(-10, 14, 7, 6); ctx.fillRect(3, 14, 7, 6);
  ctx.restore();
}

function drawEffects() {
  for (const effect of game.effects) {
    const [x, y] = polar(effect.slot, combatRadius(effect.distance));
    const progress = 1 - effect.life / effect.duration;
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.max(0, 1 - progress);
    const color = effect.kind === 'guard' ? '#72e5ff' : effect.kind === 'bell' ? '#ff6547' : effect.kind === 'catch' ? '#ffe06f' : effect.kind === 'phase' ? '#dca0ff' : effect.kind === 'sidestep' ? '#9af5a8' : effect.kind === 'refract' ? '#a9f7ff' : effect.kind === 'mirror' ? '#e4efff' : '#fff1ae';
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = effect.kind === 'break' ? 4 : 3;
    const radius = 8 + progress * (effect.kind === 'catch' ? 38 : 27);
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    const rays = effect.kind === 'break' ? 8 : 4;
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 7, Math.sin(angle) * 7); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawActors() {
  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    const [x, y] = polar(enemy.slot, combatRadius(enemy.distance));
    drawEnemy(enemy, x, y);
  }

  if (game.hammer) {
    const [sx, sy] = polar(game.hammer.slot, 82);
    const [hx, hy] = polar(game.hammer.slot, combatRadius(game.hammer.distance));
    ctx.strokeStyle = game.hammer.phase === 'out' ? '#64dfff' : '#ffcf55';
    ctx.lineWidth = game.hammer.phase === 'out' ? 4 : 8; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.globalAlpha = 1; ctx.save(); ctx.translate(hx, hy); ctx.rotate(game.tick * 0.18);
    ctx.fillStyle = game.hammer.phase === 'out' ? '#b9f5ff' : '#ffe69a'; ctx.strokeStyle = '#1b264b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, -7); ctx.lineTo(7, -9); ctx.lineTo(13, 0); ctx.lineTo(7, 9); ctx.lineTo(-12, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#854235'; ctx.fillRect(-3, 7, 6, 13); ctx.restore();
  }

  const [px, py] = polar(game.playerSlot, 96);
  ctx.save(); ctx.translate(px, py); ctx.rotate(angleForSlot(game.playerSlot) + Math.PI / 2);
  ctx.fillStyle = '#f2d49a'; ctx.beginPath(); ctx.arc(0, -10, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5ccdb8'; ctx.strokeStyle = '#081b25'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(12, 13); ctx.lineTo(4, 19); ctx.lineTo(0, 10); ctx.lineTo(-4, 19); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e7eee1'; ctx.fillRect(-3, -5, 6, 17);
  ctx.fillStyle = '#d45243'; ctx.fillRect(-12, 12, 24, 5);
  ctx.restore();
  drawEffects();
}

function drawSettings() {
  ctx.fillStyle = '#080d20'; ctx.fillRect(0, 58, 640, 380);
  text('OPERATOR ACCESSIBILITY', 320, 105, 24, '#ffe29a', 'center');
  text('SETTING', 120, 140, 13, '#9adbe8');
  text('VALUE', 520, 140, 13, '#9adbe8', 'right');
  settings.forEach((item, index) => {
    const y = 180 + index * 40;
    if (index === settingRow) {
      ctx.fillStyle = '#49324f'; ctx.fillRect(92, y - 25, 456, 34);
      text('▶', 104, y, 16, '#ffcf55');
    }
    text(item.label, 126, y, 15, index === settingRow ? '#ffffff' : '#d6d9ec');
    let value = '';
    if (item.type === 'volume') value = `${save.volume * 10}%`;
    if (item.type === 'motion') value = save.reducedMotion ? 'ON' : 'OFF';
    if (item.type === 'key') value = captureAction === item.action ? 'PRESS A KEY' : keyLabel(save.keys[item.action]);
    text(value, 520, y, 16, captureAction === item.action ? '#ffcf55' : '#77e4ca', 'right');
  });
  text(captureAction ? 'ESC CANCEL' : '↑↓ SELECT   ←→ CHANGE   ENTER SET   ESC BACK', 320, 418, 13, '#f2c8ba', 'center');
}

function render() {
  ctx.fillStyle = '#080d20'; ctx.fillRect(0, 0, 640, 480);
  ctx.fillStyle = '#481f32'; ctx.fillRect(0, 0, 640, 58); ctx.fillRect(0, 438, 640, 42);
  text('RINGWARD', 18, 37, 30, '#ffe29a');
  text('v13.0  M3', 620, 35, 14, '#9adbe8', 'right');
  drawArena(); drawBell();
  if (menu === 'settings') {
    drawSettings();
  } else if (game.mode === 'playing' || ['waveBrief', 'guardianBrief', 'waveClear', 'gameOver'].includes(game.mode)) drawActors();
  text(`SCORE ${String(game.score).padStart(6, '0')}`, 18, 82, 16);
  const guardian = game.enemies.find(enemy => enemy.alive && enemy.guardian);
  text(guardian ? `GUARDIAN  SEAL ${guardian.phase}/${guardian.phases}  CHAIN ×${game.chain}` : `WAVE ${game.wave + 1}/${WAVE_COUNT}  CHAIN ×${game.chain}`, 320, 82, 16, '#77e4ca', 'center');
  text(`BELL ${'◆'.repeat(game.bell)}${'◇'.repeat(3 - game.bell)}`, 622, 82, 16, game.bell === 1 ? '#ff6b62' : '#ffe29a', 'right');
  if (menu === 'game') text(game.message, 320, 418, ['attract', 'startWait'].includes(game.mode) ? 24 : 18, game.mode === 'gameOver' ? '#ff6b62' : '#ffe29a', 'center');
  if (menu === 'game' && ['attract', 'startWait'].includes(game.mode)) {
    text('ONE HAMMER. TWO STRIKES. CATCH THE RETURN.', 320, 200, 17, '#9adbe8', 'center');
    text(`${keyLabel(save.keys.left)} ${keyLabel(save.keys.right)} RUN THE RING`, 320, 252, 17, '#d6d9ec', 'center');
    text(`${keyLabel(save.keys.cast)} CAST ECHO`, 320, 282, 17, '#d6d9ec', 'center');
    if (game.mode === 'attract') text('PRESS C — INSERT COIN', 320, 326, 18, '#ffcf55', 'center');
    else if (save.highestWave > 0) text(`ENTER CONTINUE WAVE ${save.highestWave + 1}    N NEW RUN`, 320, 326, 14, '#77e4ca', 'center');
    else text('PRESS ENTER — START', 320, 326, 18, '#77e4ca', 'center');
    text('S SETTINGS', 320, 358, 14, '#f2c8ba', 'center');
  }
  if (menu === 'game' && game.demo) {
    ctx.fillStyle = '#481f32dd'; ctx.fillRect(194, 91, 252, 34);
    text('DEMONSTRATION', 320, 115, 18, '#ffe29a', 'center');
    text('ALIGN • CAST • CATCH', 320, 148, 14, '#9adbe8', 'center');
  }
  if (menu === 'game' && game.mode === 'waveBrief') {
    ctx.fillStyle = '#080d20df'; ctx.fillRect(92, 167, 456, 172);
    const brief = WAVE_BRIEFS[game.wave + 1];
    text(brief.title, 320, 208, 22, '#ffe29a', 'center');
    text(brief.line1, 320, 251, 15, brief.color1, 'center');
    text(brief.line2, 320, 280, 15, brief.color2, 'center');
    text(`PRESS ${keyLabel(save.keys.cast)}`, 320, 320, 18, '#f5e6b0', 'center');
  }
  if (menu === 'game' && game.mode === 'guardianBrief') {
    const second = game.wave === 5;
    const third = game.wave === 8;
    const fourth = game.wave === 11;
    const fifth = game.wave === 14;
    ctx.fillStyle = '#080d20e8'; ctx.fillRect(78, 148, 484, 210);
    text(fifth ? 'ACT V GUARDIAN — TIDE ORACLE' : fourth ? 'ACT IV GUARDIAN — PRISM EMPEROR' : third ? 'ACT III GUARDIAN — GALE SOVEREIGN' : second ? 'ACT II GUARDIAN — VORTEX REGENT' : 'ACT I GUARDIAN — DAWN WARDEN', 320, 193, 21, fifth ? '#e9f4ff' : fourth ? '#aef6ff' : third ? '#dff69a' : second ? '#d9a2ff' : '#ffe29a', 'center');
    text('OUTBOUND OPENS EACH RETURN SEAL', 320, 238, 15, '#80eaff', 'center');
    text(fifth ? 'THE MIRROR CROWN ACCELERATES AFTER EACH BREAK' : fourth ? 'THE PRISM CROWN ACCELERATES AFTER EACH BREAK' : third ? 'THE WIND CROWN TURNS FASTER AFTER EACH BREAK' : second ? 'THE CROWN ORBITS FASTER AFTER EACH BREAK' : 'IT CHANGES LINE AND PACE AFTER EACH BREAK', 320, 269, 14, '#ffcf55', 'center');
    text('THREE SEALS • ONE BELL', 320, 300, 16, '#f2c8ba', 'center');
    text(`PRESS ${keyLabel(save.keys.cast)}`, 320, 338, 18, '#ffffff', 'center');
  }
  if (menu === 'game' && paused) { ctx.fillStyle = '#080d20cc'; ctx.fillRect(120, 195, 400, 110); text('PAUSED', 320, 245, 30, '#ffe29a', 'center'); text('S SETTINGS', 320, 278, 14, '#9adbe8', 'center'); }
  text(`8-WAY LEVER　 ECHO BUTTON　 START　 CREDIT ${game.credits}`, 320, 466, 13, '#f2c8ba', 'center');
  const selectedSetting = settings[settingRow];
  const settingValue = selectedSetting.type === 'volume' ? `${save.volume * 10}%`
    : selectedSetting.type === 'motion' ? (save.reducedMotion ? 'on' : 'off')
      : selectedSetting.type === 'key' ? keyLabel(save.keys[selectedSetting.action]) : '';
  canvas.setAttribute('aria-label', menu === 'settings'
    ? `RINGWARD operator accessibility. ${selectedSetting.label}. ${settingValue}`
    : `RINGWARD ${game.mode}. ${game.demo ? 'Demonstration. ' : ''}Credit ${game.credits}. Score ${game.score}. Chain ${game.chain}. Bell ${game.bell}. ${game.message}`);
}

function persist() {
  storeSave(save);
}

function closeSettings() {
  captureAction = null;
  menu = 'game';
}

function handleSettings(event) {
  event.preventDefault();
  if (captureAction) {
    if (event.code === 'Escape') captureAction = null;
    else if (rebind(save, captureAction, event.code)) { captureAction = null; persist(); }
    return;
  }
  if (event.code === 'Escape' || event.code === 'KeyS') { closeSettings(); return; }
  if (event.code === 'ArrowUp') settingRow = (settingRow + settings.length - 1) % settings.length;
  if (event.code === 'ArrowDown') settingRow = (settingRow + 1) % settings.length;
  const item = settings[settingRow];
  if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && item.type === 'volume') {
    save.volume = Math.max(0, Math.min(10, save.volume + (event.code === 'ArrowLeft' ? -1 : 1))); audio.setVolume(save.volume); persist();
  } else if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'Enter') && item.type === 'motion') {
    save.reducedMotion = !save.reducedMotion; persist();
  } else if (event.code === 'Enter' && item.type === 'key') captureAction = item.action;
  else if (event.code === 'Enter' && item.type === 'back') closeSettings();
}

addEventListener('keydown', event => {
  audio.unlock();
  if (menu === 'settings') { handleSettings(event); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', ...Object.values(save.keys)].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyC') { insertCoin(game); paused = false; cabinetElapsed = 0; return; }
  if (event.code === 'KeyS' && (['attract', 'startWait'].includes(game.mode) || paused)) { menu = 'settings'; return; }
  if (event.code === 'Enter' && game.mode === 'startWait') startCredit(game, save.highestWave);
  else if (event.code === 'KeyN' && game.mode === 'startWait') startCredit(game, 0);
  else if (event.code === save.keys.cast && game.mode === 'waveBrief') startNextWave(game);
  else if (event.code === save.keys.cast && game.mode === 'guardianBrief') startGuardian(game);
  else if (event.code === 'KeyR' && ['gameOver', 'waveClear'].includes(game.mode)) { returnToAttract(game); paused = false; cabinetElapsed = 0; }
  else if (event.code === 'KeyP' && game.mode === 'playing') paused = !paused;
  else if (!paused && game.mode === 'playing') {
    if (event.code === save.keys.left) movePlayer(game, -1);
    if (event.code === save.keys.right) movePlayer(game, 1);
    if (event.code === save.keys.cast) castHammer(game);
  }
});

function frame(now) {
  const elapsed = Math.min(0.05, (now - previous) / 1000); previous = now;
  const previousMode = game.mode;
  if (!paused && menu === 'game') {
    if (game.mode === 'attract') {
      cabinetElapsed += elapsed;
      if (cabinetElapsed >= 4.5) { startDemo(game); demoControlElapsed = 0; }
    } else if (game.demo) {
      game.demoTime += elapsed;
      demoControlElapsed += elapsed;
      if (demoControlElapsed >= 0.1) { driveDemo(game); demoControlElapsed = 0; }
      step(game, elapsed);
      if (game.demoTime >= 11 || game.mode !== 'playing') { returnToAttract(game); cabinetElapsed = 0; }
    } else step(game, elapsed);
  }
  for (const cue of drainAudioEvents(game)) audio.play(cue);
  audio.update(menu === 'game' ? game.mode : 'settings', paused);
  if (previousMode === 'playing' && game.mode === 'waveBrief' && game.wave + 1 > save.highestWave) {
    save.highestWave = game.wave + 1; persist();
  }
  render(); requestAnimationFrame(frame);
}
canvas.focus(); requestAnimationFrame(frame);
