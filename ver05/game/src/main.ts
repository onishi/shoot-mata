import './style.css';
import {
  FIRST_CHORD,
  FINAL_CADENCE,
  GLASS_RETURN,
  HELD_NOTE,
  LONG_MEASURE,
  LONG_TONE,
  MIRROR_ENTRY,
  NEGATIVE_SPACE,
  REST_MARK,
  SHIFTED_GATE,
  SHORT_MEASURE,
  ensemblePositions,
  keyOf,
  playAction,
  type Action,
  type BeatDoor,
  type Point,
  type Room,
} from './model';
import {
  changeSettings,
  completeRoom,
  defaultSave,
  loadSave,
  markHintSeen,
  storeSave,
} from './persistence';

type Screen = 'title' | 'settings' | 'playing' | 'paused' | 'hint' | 'won';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const live = document.querySelector<HTMLDivElement>('#live')!;
if (!canvas || !live) throw new Error('game surface missing');
const ctx = canvas.getContext('2d')!;
if (!ctx) throw new Error('2d canvas unavailable');

type RoomEntry = Readonly<{
  room: Room;
  name: string;
  objective: string;
  guidance: string;
  hints: readonly (readonly string[])[];
}>;
const rooms: readonly RoomEntry[] = [
  {
    room: FIRST_CHORD,
    name: 'FIRST CHORD',
    objective: '三人を同じ拍に、三枚の音盤へ',
    guidance: '8拍を終えると、その動きが次のフレーズで再演されます',
    hints: [
      ['一人で全部の音盤を踏む必要はありません。', '録音した奏者は、次のフレーズでも同じ拍に動きます。'],
      ['三方向の音盤は、始点からの距離が少しずつ違います。', '早く着く奏者には「待つ拍」を加えられます。'],
      ['二人分の到着時刻を先に記録し、', '最後の奏者で三つの到着拍を合わせてください。'],
    ],
  },
  {
    room: HELD_NOTE,
    name: 'HELD NOTE',
    objective: '起動盤を保ち、別の奏者を拍扉の向こうへ',
    guidance: '金の導線で結ばれた盤と扉は、同じ拍だけ応答します',
    hints: [
      ['扉を押し続けても開きません。', '別の奏者が金の導線の先へ乗る拍を作ります。'],
      ['起動役と扉役を、同じ拍にそれぞれの場所へ到着させます。', '壁に当たる入力も、その場で一拍を刻みます。'],
      ['扉を越えた奏者は、奥の音盤まであと二拍です。', '三人目の到着も、その拍へ揃えてください。'],
    ],
  },
  {
    room: LONG_TONE,
    name: 'LONG TONE',
    objective: '先に音盤へ着き、その音を保って拍扉を開く',
    guidance: '起動盤の奏者は、扉役が来るまでその場に留まれます',
    hints: [
      ['起動役は、扉役と同時に到着しなくても構いません。', '盤の上に居続ける限り、音は保たれます。'],
      ['左の起動盤には早く着けます。', '到着後の待機を録音し、遅い扉役を迎えてください。'],
      ['扉役は中央で間を取り、起動音が続く拍に上へ進みます。', '右の音盤へ向かう役が最後の拍を揃えます。'],
    ],
  },
  {
    room: FINAL_CADENCE,
    name: 'FINAL CADENCE',
    objective: '始点を一人に任せ、8拍目に三人を揃える',
    guidance: '右の音盤は上側からだけ入れます。8拍すべてを使ってください',
    hints: [
      ['音盤の一枚は始点そのものです。', '動かない8拍も、ひとつの有効なフレーズになります。'],
      ['左の音盤への道は8拍より短いため、', '着いた後に拍を保つ余裕があります。'],
      ['右の音盤は、いったん最上段へ上がってから回り込みます。', '三つのフレーズを8拍目に着地させてください。'],
    ],
  },
  {
    room: MIRROR_ENTRY,
    name: 'MIRROR ENTRY',
    objective: '反転床へ渡した譜面で、再演だけの進路を作る',
    guidance: '菱形の床を越えた過去奏者は、次の拍から左右を反転します',
    hints: [
      ['反転するのは録音中ではなく、その奏者が再演されるときです。', '床へ入った拍そのものは、譜面どおりに進みます。'],
      ['最初の奏者を右へ二拍進めると、', '再演では二拍目だけが左向きへ変わります。'],
      ['反転した奏者を中央上の盤へ導き、', '左右の奏者を同じ四拍目に待ち合わせてください。'],
    ],
  },
  {
    room: GLASS_RETURN,
    name: 'GLASS RETURN',
    objective: '二枚の反転床を渡り、譜面の向きを取り戻す',
    guidance: '過去奏者は反転床へ入るたび、次の拍から左右の向きが切り替わります',
    hints: [
      ['一枚目の床で反転した向きは、', '別の反転床へ入ると元へ戻ります。'],
      ['右へ渡った奏者は、反転した次の右入力で左へ戻れます。', 'そこから上へ進むと二枚目の床です。'],
      ['二枚目を越えた直後の右入力は、もう反転しません。', '上の盤と左右の盤を五拍目に揃えてください。'],
    ],
  },
  {
    room: REST_MARK,
    name: 'REST MARK',
    objective: '静寂帯へ渡した譜面から、再演の一拍だけを消す',
    guidance: '波紋の帯へ入った過去奏者は、次の入力を一拍の待機に変えます',
    hints: [
      ['静寂帯は録音中の奏者を止めません。', '再演されたとき、帯へ入った次の入力だけが消えます。'],
      ['上へ帯を渡り、続けて右へ二拍進む譜面は、', '再演では最初の右が待機になり、一マス手前へ着きます。'],
      ['静寂でずれた奏者を中央上の盤へ導き、', '左右の奏者を同じ四拍目に待ち合わせてください。'],
    ],
  },
  {
    room: NEGATIVE_SPACE,
    name: 'NEGATIVE SPACE',
    objective: '反転した譜面から一拍を消し、再演だけの余白へ',
    guidance: 'ガラスで向きを変え、波紋で次の一拍を休符にします',
    hints: [
      ['反転と静寂は同じ再演へ続けて作用します。', '静寂が一拍を消しても、左右の反転はそのまま続きます。'],
      ['まず右の反転床へ入り、反転した右入力で中央へ戻ります。', 'そこから上へ進むと静寂帯へ入れます。'],
      ['静寂の次の右を休符にし、もう一度右を反転させて左へ。', '上の盤と左右の盤を六拍目に揃えてください。'],
    ],
  },
  {
    room: SHORT_MEASURE,
    name: 'SHORT MEASURE',
    objective: '6拍の短い小節で、三つの経路を同時に閉じる',
    guidance: 'この部屋のフレーズは6拍です。拍表示の終端を確かめてください',
    hints: [
      ['この部屋では六拍目がフレーズの終端です。', '八拍のつもりで待つと、譜面は先に記憶されます。'],
      ['左と上の音盤には、一拍だけ音を保つ余裕があります。', '右上の音盤へ向かう役には余白がありません。'],
      ['左は横を先に、上は縦に、右上は縦横を三拍ずつ。', '三人を六拍目に着地させてください。'],
    ],
  },
  {
    room: LONG_MEASURE,
    name: 'LONG MEASURE',
    objective: '10拍の長い小節へ、二つの保持区間を織り込む',
    guidance: 'この部屋のフレーズは10拍です。移動の間にも音を保てます',
    hints: [
      ['十拍を最後にまとめて待つ必要はありません。', '一つのフレーズを、移動と複数の保持区間に分けられます。'],
      ['左と上の奏者は、道の途中と到着後に音を保てます。', '右の奏者は上側から入るポケットを目指します。'],
      ['右は上へ進む途中と、最上段を横切る途中で一拍ずつ保持。', '最後の下入力を十拍目に置いてください。'],
    ],
  },
  {
    room: SHIFTED_GATE,
    name: 'SHIFTED GATE',
    objective: '6拍の小節で起動音と扉の通過をずらして重ねる',
    guidance: '左の奏者が四拍目に起動盤へ着く瞬間だけ、中央の扉が応答します',
    hints: [
      ['六拍のうち、扉を越えた後には三歩が必要です。', '通過できる拍から逆算して、待機を手前へ置いてください。'],
      ['左の起動盤は四歩で届きます。', '中央の奏者は扉の手前へ一拍で着き、そこで二拍を保てます。'],
      ['四拍目に左の盤と中央の扉を同時に鳴らします。', '右の奏者も六拍目に音盤へ着地させてください。'],
    ],
  },
];
const scoreRoomCount = 12;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let save = loadSave(localStorage, rooms.length, defaultSave(prefersReducedMotion));
let titleRoomIndex = save.highestUnlockedRoom;
let settingsRow = 0;
let roomIndex = titleRoomIndex;
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
let hintLevel = 0;
let hintReturn: 'playing' | 'paused' = 'playing';

function beginRoom(index: number): void {
  roomIndex = index;
  room = rooms[roomIndex]!.room;
  tracks = [];
  currentActions = [];
  phraseNumber = 1;
  hintLevel = 0;
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
  if (!audio || save.settings.volume === 0) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * save.settings.volume, start + 0.01);
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
  if (action || ['Enter', 'Escape', 'Backspace'].includes(event.key) || ['r', 'h'].includes(event.key.toLowerCase())) {
    event.preventDefault();
  }

  ensureAudio();
  if (screen === 'title') {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      titleRoomIndex = Math.max(0, titleRoomIndex - 1);
      announce(`${titleRoomIndex + 1} — ${rooms[titleRoomIndex]!.name}`, 1000);
      tone(220, 0.05, 0.018);
      return;
    }
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      titleRoomIndex = Math.min(save.highestUnlockedRoom, titleRoomIndex + 1);
      announce(`${titleRoomIndex + 1} — ${rooms[titleRoomIndex]!.name}`, 1000);
      tone(277, 0.05, 0.018);
      return;
    }
    if (event.key.toLowerCase() === 's') {
      screen = 'settings';
      announce('設定');
      return;
    }
    if (event.key === 'Enter') beginRoom(titleRoomIndex);
    return;
  }
  if (screen === 'settings') {
    if (event.key === 'Escape' || event.key === 'Enter') {
      screen = 'title';
      announce('設定を保存しました');
      return;
    }
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') settingsRow = Math.max(0, settingsRow - 1);
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') settingsRow = Math.min(1, settingsRow + 1);
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') updateSetting(-1);
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') updateSetting(1);
    return;
  }
  if (screen === 'won' && event.key === 'Enter') {
    beginRoom(roomIndex + 1 < rooms.length ? roomIndex + 1 : 0);
    return;
  }
  if (screen === 'hint') {
    if (event.key.toLowerCase() === 'h') {
      const hints = rooms[roomIndex]!.hints;
      hintLevel = (hintLevel + 1) % hints.length;
      announce(`ヒント ${hintLevel + 1} / ${hints.length}: ${hints[hintLevel]!.join(' ')}`, 8000);
      tone(240 + hintLevel * 40, 0.08, 0.018);
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      screen = hintReturn;
      announce(hintReturn === 'paused' ? '一時停止' : '調律を再開', 1000);
    }
    return;
  }
  if (event.key.toLowerCase() === 'h' && (screen === 'playing' || screen === 'paused')) {
    hintReturn = screen;
    screen = 'hint';
    save = markHintSeen(save, roomIndex, rooms.length);
    storeSave(localStorage, save);
    const hints = rooms[roomIndex]!.hints;
    announce(`ヒント ${hintLevel + 1} / ${hints.length}: ${hints[hintLevel]!.join(' ')}`, 8000);
    tone(220, 0.1, 0.018);
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
    save = completeRoom(save, roomIndex, rooms.length);
    titleRoomIndex = save.highestUnlockedRoom;
    storeSave(localStorage, save);
    announce('三和音がひらいた', 8000);
    [262, 330, 392, 523].forEach((frequency, index) => tone(frequency, 0.6, 0.035, index * 0.1));
  } else if (result.phraseCommitted) {
    phraseNumber += 1;
    announce(`フレーズを記憶しました。第${phraseNumber}フレーズ`, 1800);
    tone(palette.length > tracks.length ? 330 : 392, 0.18, 0.035);
  }
});

function updateSetting(direction: -1 | 1): void {
  if (settingsRow === 0) {
    const volume = Math.max(0, Math.min(1, Math.round((save.settings.volume + direction * 0.25) * 4) / 4));
    save = changeSettings(save, { ...save.settings, volume });
    if (volume > 0) tone(330, 0.07, 0.03);
    announce(`音量 ${Math.round(volume * 100)}%`, 900);
  } else {
    save = changeSettings(save, { ...save.settings, reducedMotion: direction > 0 });
    announce(save.settings.reducedMotion ? '動きの軽減 オン' : '動きの軽減 オフ', 900);
  }
  storeSave(localStorage, save);
}

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
  text('過去のフレーズと、同じ拍を奏でる', 640, 505, 20, '#9ec4bd', 'center', 450);
  const selected = rooms[titleRoomIndex]!;
  const selection = `${titleRoomIndex + 1} / ${rooms.length}  ${selected.name}`;
  text(`◀  ${selection}  ▶`, 640, 550, 15, '#d6c994', 'center', 650);
  roundedRect(500, 582, 280, 54, 27);
  ctx.fillStyle = 'rgba(243, 202, 104, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(243, 202, 104, 0.55)';
  ctx.stroke();
  text(save.completedRooms.includes(titleRoomIndex) ? 'ENTER  この部屋を再演' : 'ENTER  調律を始める', 640, 609, 18, '#f7e8bc', 'center', 650);
  text('← → 部屋選択    S 設定', 640, 663, 13, '#6f9090', 'center', 600);
  text('turn-based temporal puzzle · twelve-room score in progress', 640, 690, 12, '#58787a', 'center', 500);
}

function drawSettings(time: number): void {
  drawBackdrop(time);
  text('SETTINGS', 640, 130, 42, '#f3ca68', 'center', 720);
  text('変更はこの端末へ自動保存されます', 640, 180, 15, '#7fa49e', 'center', 500);
  const entries = [
    { label: 'MASTER VOLUME', value: `${Math.round(save.settings.volume * 100)}%` },
    { label: 'REDUCED MOTION', value: save.settings.reducedMotion ? 'ON' : 'OFF' },
  ];
  entries.forEach((entry, index) => {
    const y = 260 + index * 100;
    roundedRect(370, y, 540, 72, 18);
    ctx.fillStyle = index === settingsRow ? 'rgba(243, 202, 104, 0.13)' : 'rgba(8, 24, 31, 0.82)';
    ctx.fill();
    ctx.strokeStyle = index === settingsRow ? 'rgba(243, 202, 104, 0.62)' : 'rgba(109, 151, 142, 0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(entry.label, 405, y + 36, 14, index === settingsRow ? '#f2dfac' : '#89a49e', 'left', 700);
    text(`◀   ${entry.value}   ▶`, 875, y + 36, 17, '#e8eee0', 'right', 700);
  });
  text('↑ ↓ 項目    ← → 変更    ENTER / ESC 戻る', 640, 515, 15, '#91ada6', 'center', 550);
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
  const points = ensemblePositions(room, phrases, beat, tracks.length);
  room.inversionFloors.forEach((floor) => drawInversionFloor(floor, time));
  room.silenceFloors.forEach((floor) => drawSilenceFloor(floor, time));
  room.doors.forEach((door) => drawDoorLink(door));
  room.doors.forEach((door) => drawDoor(door, points, time));
  room.plates.forEach((plate, index) => drawPlate(plate, points.some((point) => keyOf(point) === keyOf(plate)), time + index * 520));

  phrases.forEach((_track, index) => {
    const path: Point[] = [room.start];
    for (let step = 1; step <= beat; step += 1) path.push(ensemblePositions(room, phrases, step, tracks.length)[index]!);
    drawTrail(path, palette[index] ?? palette[0]!);
    drawPerformer(points[index]!, index, index === phrases.length - 1, time);
  });
}

function drawSilenceFloor(point: Point, time: number): void {
  const center = cellCenter(point);
  const hush = 0.52 + Math.sin(time * 0.003) * 0.12;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.fillStyle = `rgba(94, 112, 145, ${hush * 0.24})`;
  ctx.strokeStyle = `rgba(178, 190, 221, ${hush})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#8e9fc7';
  ctx.shadowBlur = 10;
  roundedRect(-25, -18, 50, 36, 18);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.globalAlpha = 0.75 - ring * 0.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 + ring * 7, 4 + ring * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#d9e0f2';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawInversionFloor(point: Point, time: number): void {
  const center = cellCenter(point);
  const shimmer = 0.55 + Math.sin(time * 0.004) * 0.18;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = `rgba(122, 185, 201, ${shimmer * 0.28})`;
  ctx.strokeStyle = `rgba(163, 228, 231, ${shimmer})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#78cdd3';
  ctx.shadowBlur = 12;
  roundedRect(-22, -22, 44, 44, 7);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
  ctx.moveTo(5, -7); ctx.lineTo(12, 0); ctx.lineTo(5, 7);
  ctx.moveTo(-5, -7); ctx.lineTo(-12, 0); ctx.lineTo(-5, 7);
  ctx.stroke();
  ctx.restore();
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
  const beatSpacing = room.phraseLength > 1 ? Math.min(43, 300 / (room.phraseLength - 1)) : 0;
  for (let i = 0; i < room.phraseLength; i += 1) {
    const cx = panelX + 40 + i * beatSpacing;
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
  text('ESC', panelX + 190, 536, 14, '#d9e3d8', 'right', 550);
  text('HINT', panelX + 222, 536, 11, '#66827f', 'left', 700);
  text('H', panelX + 348, 536, 14, save.hintsSeen.includes(roomIndex) ? '#f3ca68' : '#d9e3d8', 'right', 650);

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

function drawHint(): void {
  const hints = rooms[roomIndex]!.hints;
  const lines = hints[hintLevel]!;
  ctx.fillStyle = 'rgba(2, 7, 11, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundedRect(330, 188, 620, 344, 24);
  ctx.fillStyle = 'rgba(9, 27, 34, 0.98)'; ctx.fill();
  ctx.strokeStyle = 'rgba(243, 202, 104, 0.5)'; ctx.lineWidth = 2; ctx.stroke();
  text('LISTEN CLOSER', 640, 242, 14, '#769b94', 'center', 750);
  text(`HINT ${hintLevel + 1} / ${hints.length}`, 640, 286, 31, '#f3ca68', 'center', 720);
  lines.forEach((line, index) => text(line, 640, 354 + index * 38, 18, '#d5e1d6', 'center', 520));
  for (let index = 0; index < hints.length; index += 1) {
    ctx.fillStyle = index === hintLevel ? '#f3ca68' : 'rgba(126, 157, 149, 0.28)';
    ctx.beginPath(); ctx.arc(620 + index * 20, 446, 5, 0, Math.PI * 2); ctx.fill();
  }
  text('H  次のヒント     ENTER / ESC  譜面へ戻る', 640, 490, 14, '#9fb7af', 'center', 600);
}

function render(time: number): void {
  lastTime = time;
  const visualTime = save.settings.reducedMotion ? 0 : time;
  if (screen === 'title') drawTitle(visualTime);
  else if (screen === 'settings') drawSettings(visualTime);
  else {
    drawBackdrop(visualTime);
    drawBoard(visualTime);
    drawHud(visualTime);
    if (screen === 'paused') drawOverlay('PAUSED', '譜面はこの拍で止まっています', 'ESC で再開');
    if (screen === 'hint') drawHint();
    if (screen === 'won') {
      const finalRoom = roomIndex === scoreRoomCount - 1;
      const lastAvailableRoom = roomIndex === rooms.length - 1;
      const chapterBoundary = roomIndex === 3 || roomIndex === 7;
      drawOverlay(
        finalRoom ? 'SCORE COMPLETE' : chapterBoundary ? 'CHAPTER COMPLETE' : 'CHORD FOUND',
        `第${phraseNumber}フレーズで三和音がひらきました`,
        finalRoom || lastAvailableRoom ? 'ENTER で最初から' : 'ENTER で次の部屋へ',
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
  canvas.dataset.unlockedRoom = String(save.highestUnlockedRoom + 1);
  canvas.dataset.reducedMotion = String(save.settings.reducedMotion);
  canvas.dataset.hint = screen === 'hint' ? String(hintLevel + 1) : '0';
}, 100);

requestAnimationFrame(render);

void lastTime;
