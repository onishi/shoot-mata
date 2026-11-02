import './style.css';
import {
  FIRST_CHORD,
  FINAL_CADENCE,
  HELD_NOTE,
  LONG_TONE,
  ensemblePositions,
  keyOf,
  playAction,
  type Action,
  type BeatDoor,
  type Point,
  type Room,
} from './model';

type Screen = 'title' | 'playing' | 'paused' | 'won';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const live = document.querySelector<HTMLDivElement>('#live')!;
if (!canvas || !live) throw new Error('game surface missing');
const ctx = canvas.getContext('2d')!;
if (!ctx) throw new Error('2d canvas unavailable');

type RoomEntry = Readonly<{ room: Room; name: string; objective: string; guidance: string }>;
const rooms: readonly RoomEntry[] = [
  {
    room: FIRST_CHORD,
    name: 'FIRST CHORD',
    objective: '三人を同じ拍に、三枚の音盤へ',
    guidance: '8拍を終えると、その動きが次のフレーズで再演されます',
  },
  {
    room: HELD_NOTE,
    name: 'HELD NOTE',
    objective: '起動盤を保ち、別の奏者を拍扉の向こうへ',
    guidance: '金の導線で結ばれた盤と扉は、同じ拍だけ応答します',
  },
  {
    room: LONG_TONE,
    name: 'LONG TONE',
    objective: '先に音盤へ着き、その音を保って拍扉を開く',
    guidance: '起動盤の奏者は、扉役が来るまでその場に留まれます',
  },
  {
    room: FINAL_CADENCE,
    name: 'FINAL CADENCE',
    objective: '始点を一人に任せ、8拍目に三人を揃える',
    guidance: '右の音盤は上側からだけ入れます。8拍すべてを使ってください',
  },
];
let roomIndex = 0;
let room = rooms[roomIndex]!.room;
const palette = ['#ff896f', '#65d7c5', '#f3ca68'];
const dimPalette = ['#8d5148', '#397e77', '#927b43'];
const actionGlyph: Record<Action, string> = { up: '↑', down: '↓', left: '←', right: '→', wait: '·' };

let screen: Screen = 'title';
let tracks: readonly (readonly Action[])[] = [];
let currentActions: readonly Action[] = [];
let phraseNumber = 1;
let message = 'ENTER で調律を始める';
let messageUntil = 0;
let lastTime = 0;
let audio: AudioContext | null = null;

function beginRoom(index: number): void {
  roomIndex = index;
  room = rooms[roomIndex]!.room;
  tracks = [];
  currentActions = [];
  phraseNumber = 1;
  screen = 'playing';
  announce(`${rooms[roomIndex]!.name} — 第1フレーズ`);
  tone(220, 0.12, 0.04);
}

function announce(text: string, duration = 2200): void {
  message = text;
  messageUntil = performance.now() + duration;
  live.textContent = text;
}

function ensureAudio(): void {
  audio ??= new AudioContext();
  if (audio.state === 'suspended') void audio.resume();
}

function tone(frequency: number, duration = 0.07, volume = 0.025, delay = 0): void {
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function actionFromKey(key: string): Action | null {
  const value = key.toLowerCase();
  if (value === 'arrowup' || value === 'w') return 'up';
  if (value === 'arrowdown' || value === 's') return 'down';
  if (value === 'arrowleft' || value === 'a') return 'left';
  if (value === 'arrowright' || value === 'd') return 'right';
  if (value === ' ') return 'wait';
  return null;
}

window.addEventListener('keydown', (event) => {
  const action = actionFromKey(event.key);
  if (action || ['Enter', 'Escape', 'Backspace'].includes(event.key) || event.key.toLowerCase() === 'r') {
    event.preventDefault();
  }

  ensureAudio();
  if (screen === 'title' && event.key === 'Enter') {
    beginRoom(0);
    return;
  }
  if (screen === 'won' && event.key === 'Enter') {
    beginRoom(roomIndex + 1 < rooms.length ? roomIndex + 1 : 0);
    return;
  }
  if (event.key === 'Escape' && screen === 'playing') {
    screen = 'paused';
    announce('一時停止');
    return;
  }
  if (event.key === 'Escape' && screen === 'paused') {
    screen = 'playing';
    announce('調律を再開');
    return;
  }
  if (screen !== 'playing') return;

  if (event.key === 'Backspace') {
    if (currentActions.length > 0) {
      currentActions = currentActions.slice(0, -1);
      announce(`拍 ${currentActions.length + 1} を録り直せます`, 1000);
      tone(150, 0.06, 0.018);
    }
    return;
  }
  if (event.key.toLowerCase() === 'r') {
    currentActions = [];
    announce(`第${phraseNumber}フレーズを最初から`, 1200);
    tone(140, 0.12, 0.02);
    return;
  }
  if (!action) return;

  const result = playAction(room, tracks, currentActions, action);
  currentActions = result.currentActions;
  tracks = result.tracks;
  tone(action === 'wait' ? 196 : 262 + result.beat * 9, 0.055, 0.018);

  if (result.won) {
    screen = 'won';
    announce('三和音がひらいた', 8000);
    [262, 330, 392, 523].forEach((frequency, index) => tone(frequency, 0.6, 0.035, index * 0.1));
  } else if (result.phraseCommitted) {
    phraseNumber += 1;
    announce(`フレーズを記憶しました。第${phraseNumber}フレーズ`, 1800);
    tone(palette.length > tracks.length ? 330 : 392, 0.18, 0.035);
  }
});

function roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function text(value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 500): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function drawBackdrop(time: number): void {
  const gradient = ctx.createRadialGradient(660, 360, 40, 660, 360, 760);
  gradient.addColorStop(0, '#102936');
  gradient.addColorStop(0.52, '#091923');
  gradient.addColorStop(1, '#040a12');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(118, 175, 158, 0.09)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i += 1) {
    const offset = Math.sin(time * 0.0002 + i) * 18;
    ctx.beginPath();
    ctx.moveTo(0, 70 + i * 68);
    ctx.bezierCurveTo(250, 15 + i * 70 + offset, 460, 135 + i * 52, 740, 70 + i * 64);
    ctx.bezierCurveTo(980, 15 + i * 70, 1110, 140 + i * 55 - offset, 1280, 80 + i * 66);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTitle(time: number): void {
  drawBackdrop(time);
  const pulse = 0.5 + Math.sin(time * 0.002) * 0.5;
  ctx.save();
  ctx.translate(640, 235);
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.strokeStyle = `${palette[ring]}${Math.round((0.35 + pulse * 0.2) * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 66 + ring * 24, -Math.PI * 0.78 + ring * 0.2, Math.PI * 0.72 + ring * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  text('CHORUS', 640, 386, 68, '#f3ead2', 'center', 260);
  text('SHIFT', 640, 448, 68, '#f3ca68', 'center', 720);
  text('過去の8手と、同じ拍を奏でる', 640, 520, 20, '#9ec4bd', 'center', 450);
  roundedRect(500, 575, 280, 54, 27);
  ctx.fillStyle = 'rgba(243, 202, 104, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(243, 202, 104, 0.55)';
  ctx.stroke();
  text('ENTER  調律を始める', 640, 602, 18, '#f7e8bc', 'center', 650);
  text('turn-based temporal puzzle · four-room score', 640, 675, 13, '#58787a', 'center', 500);
}

const board = { x: 128, y: 112, cell: 68 };

function cellCenter(point: Point): Point {
  return { x: board.x + point.x * board.cell + board.cell / 2, y: board.y + point.y * board.cell + board.cell / 2 };
}

function drawBoard(time: number): void {
  roundedRect(board.x - 18, board.y - 18, room.width * board.cell + 36, room.height * board.cell + 36, 22);
  ctx.fillStyle = 'rgba(3, 10, 16, 0.62)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 157, 92, 0.34)';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let y = 0; y < room.height; y += 1) {
    for (let x = 0; x < room.width; x += 1) {
      const wall = room.walls.has(`${x},${y}`);
      const px = board.x + x * board.cell;
      const py = board.y + y * board.cell;
      roundedRect(px + 3, py + 3, board.cell - 6, board.cell - 6, wall ? 8 : 13);
      ctx.fillStyle = wall ? '#0c2028' : 'rgba(29, 53, 59, 0.72)';
      ctx.fill();
      ctx.strokeStyle = wall ? 'rgba(171, 139, 77, 0.24)' : 'rgba(140, 188, 169, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (wall) {
        ctx.strokeStyle = 'rgba(198, 163, 92, 0.16)';
        ctx.beginPath();
        ctx.moveTo(px + 15, py + 50);
        ctx.bezierCurveTo(px + 25, py + 20, px + 44, py + 48, px + 54, py + 16);
        ctx.stroke();
      }
    }
  }

  const beat = currentActions.length;
  const phrases = [...tracks, currentActions];
  const points = ensemblePositions(room, phrases, beat);
  room.doors.forEach((door) => drawDoorLink(door));
  room.doors.forEach((door) => drawDoor(door, points, time));
  room.plates.forEach((plate, index) => drawPlate(plate, points.some((point) => keyOf(point) === keyOf(plate)), time + index * 520));

  phrases.forEach((_track, index) => {
    const path: Point[] = [room.start];
    for (let step = 1; step <= beat; step += 1) path.push(ensemblePositions(room, phrases, step)[index]!);
    drawTrail(path, palette[index] ?? palette[0]!);
    drawPerformer(points[index]!, index, index === phrases.length - 1, time);
  });
}

function drawDoorLink(door: BeatDoor): void {
  const from = cellCenter(door.trigger);
  const to = cellCenter(door.point);
  ctx.save();
  ctx.strokeStyle = 'rgba(243, 202, 104, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawDoor(door: BeatDoor, performers: readonly Point[], time: number): void {
  const center = cellCenter(door.point);
  const open = performers.some((point) => keyOf(point) === keyOf(door.trigger));
  const spread = open ? 24 + Math.sin(time * 0.006) * 2 : 7;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.strokeStyle = open ? '#f3ca68' : '#b17655';
  ctx.lineWidth = 5;
  ctx.shadowColor = open ? '#f3ca68' : '#a14f43';
  ctx.shadowBlur = open ? 14 : 5;
  for (const direction of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(direction * spread, -24);
    ctx.lineTo(direction * spread, 24);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = open ? '#f3ca68' : '#d68a62';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlate(point: Point, active: boolean, time: number): void {
  const center = cellCenter(point);
  const pulse = active ? 2 + Math.sin(time * 0.006) * 2 : 0;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.strokeStyle = active ? '#f3ca68' : 'rgba(218, 192, 128, 0.56)';
  ctx.lineWidth = active ? 3 : 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, 13 + i * 7 + pulse, -Math.PI * 0.8 + i * 0.22, Math.PI * 0.65 + i * 0.22);
    ctx.stroke();
  }
  if (active) {
    ctx.fillStyle = 'rgba(243, 202, 104, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 27 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTrail(path: readonly Point[], color: string): void {
  if (path.length < 2) return;
  ctx.strokeStyle = `${color}52`;
  ctx.lineWidth = 3;
  ctx.setLineDash([3, 8]);
  ctx.beginPath();
  path.forEach((point, index) => {
    const center = cellCenter(point);
    if (index === 0) ctx.moveTo(center.x, center.y);
    else ctx.lineTo(center.x, center.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPerformer(point: Point, index: number, current: boolean, time: number): void {
  const center = cellCenter(point);
  const color = palette[index] ?? palette[palette.length - 1]!;
  const breath = current ? Math.sin(time * 0.005) * 2 : 0;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = current ? 18 : 8;
  ctx.fillStyle = current ? color : '#102630';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (index % 3 === 0) {
    ctx.moveTo(0, -17); ctx.lineTo(17, 0); ctx.lineTo(0, 17); ctx.lineTo(-17, 0); ctx.closePath();
  } else if (index % 3 === 1) {
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
  } else {
    for (let i = 0; i < 6; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 3;
      const x = Math.cos(angle) * 18;
      const y = Math.sin(angle) * 18;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  if (current) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${color}77`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 25 + breath, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(time: number): void {
  const entry = rooms[roomIndex]!;
  text(`${String(roomIndex + 1).padStart(2, '0')}  ${entry.name}`, 128, 58, 15, '#739a95', 'left', 700);
  text(entry.objective, 128, 82, 22, '#eef1df', 'left', 550);

  const panelX = 790;
  roundedRect(panelX, 112, 380, 476, 20);
  ctx.fillStyle = 'rgba(6, 17, 25, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(112, 157, 146, 0.22)';
  ctx.stroke();

  text(`PHRASE ${phraseNumber}`, panelX + 32, 151, 14, palette[Math.min(tracks.length, 2)]!, 'left', 750);
  text(`${currentActions.length} / ${room.phraseLength} BEATS`, panelX + 348, 151, 14, '#91aaa5', 'right', 650);
  for (let i = 0; i < room.phraseLength; i += 1) {
    const cx = panelX + 40 + i * 43;
    ctx.fillStyle = i < currentActions.length ? palette[Math.min(tracks.length, 2)]! : 'rgba(129, 158, 150, 0.16)';
    ctx.beginPath();
    ctx.arc(cx, 188, i === currentActions.length ? 7 + Math.sin(time * 0.006) : 6, 0, Math.PI * 2);
    ctx.fill();
    const action = currentActions[i];
    if (action) text(actionGlyph[action], cx, 218, 17, '#dce8de', 'center', 650);
  }

  text('RECORDED VOICES', panelX + 32, 266, 12, '#66827f', 'left', 700);
  for (let row = 0; row < 2; row += 1) {
    roundedRect(panelX + 28, 286 + row * 58, 324, 44, 10);
    ctx.fillStyle = tracks[row] ? `${dimPalette[row]}44` : 'rgba(71, 91, 91, 0.10)';
    ctx.fill();
    const track = tracks[row];
    text(track ? `VOICE ${row + 1}` : '— empty —', panelX + 44, 308 + row * 58, 12, track ? palette[row]! : '#415a5a', 'left', 700);
    if (track) text(track.map((action) => actionGlyph[action]).join('  '), panelX + 330, 308 + row * 58, 15, '#b9cdc5', 'right', 500);
  }

  ctx.strokeStyle = 'rgba(116, 148, 141, 0.17)';
  ctx.beginPath(); ctx.moveTo(panelX + 28, 422); ctx.lineTo(panelX + 352, 422); ctx.stroke();
  text('MOVE', panelX + 32, 452, 11, '#66827f', 'left', 700);
  text('矢印 / WASD', panelX + 348, 452, 14, '#d9e3d8', 'right', 550);
  text('WAIT', panelX + 32, 480, 11, '#66827f', 'left', 700);
  text('SPACE', panelX + 348, 480, 14, '#d9e3d8', 'right', 550);
  text('UNDO / RESTART', panelX + 32, 508, 11, '#66827f', 'left', 700);
  text('BACKSPACE / R', panelX + 348, 508, 14, '#d9e3d8', 'right', 550);
  text('PAUSE', panelX + 32, 536, 11, '#66827f', 'left', 700);
  text('ESC', panelX + 348, 536, 14, '#d9e3d8', 'right', 550);

  if (performance.now() < messageUntil) {
    roundedRect(310, 622, 660, 46, 23);
    ctx.fillStyle = 'rgba(8, 21, 28, 0.92)'; ctx.fill();
    ctx.strokeStyle = 'rgba(243, 202, 104, 0.28)'; ctx.stroke();
    text(message, 640, 645, 16, '#f0dfb2', 'center', 600);
  } else {
    const guidance = tracks.length < 2 ? entry.guidance : '三人が別々の音盤へ乗る拍を探してください';
    text(guidance, 640, 645, 15, '#73928d', 'center', 500);
  }
}

function drawOverlay(title: string, body: string, action: string): void {
  ctx.fillStyle = 'rgba(2, 7, 11, 0.76)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundedRect(380, 220, 520, 280, 24);
  ctx.fillStyle = 'rgba(9, 27, 34, 0.96)'; ctx.fill();
  ctx.strokeStyle = 'rgba(243, 202, 104, 0.45)'; ctx.lineWidth = 2; ctx.stroke();
  text(title, 640, 292, 38, '#f3ca68', 'center', 700);
  text(body, 640, 352, 17, '#b7cbc1', 'center', 500);
  roundedRect(500, 406, 280, 50, 25);
  ctx.fillStyle = 'rgba(243, 202, 104, 0.11)'; ctx.fill();
  text(action, 640, 431, 15, '#f4e4ba', 'center', 700);
}

function render(time: number): void {
  lastTime = time;
  if (screen === 'title') drawTitle(time);
  else {
    drawBackdrop(time);
    drawBoard(time);
    drawHud(time);
    if (screen === 'paused') drawOverlay('PAUSED', '譜面はこの拍で止まっています', 'ESC で再開');
    if (screen === 'won') {
      const lastRoom = roomIndex === rooms.length - 1;
      drawOverlay(
        lastRoom ? 'SCORE COMPLETE' : 'CHORD FOUND',
        `第${phraseNumber}フレーズで三和音がひらきました`,
        lastRoom ? 'ENTER で最初から' : 'ENTER で次の部屋へ',
      );
    }
  }
  requestAnimationFrame(render);
}

canvas.dataset.gameState = screen;
new MutationObserver(() => undefined).observe(canvas, { attributes: true });
setInterval(() => {
  canvas.dataset.gameState = screen;
  canvas.dataset.beat = String(currentActions.length);
  canvas.dataset.tracks = String(tracks.length);
  canvas.dataset.room = String(roomIndex + 1);
}, 100);

requestAnimationFrame(render);

void lastTime;
