export type SpriteId = 'player' | 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler' | 'boss' | 'return'
  | 'index-kite' | 'vane-scribe' | 'cross-reference-pair' | 'tab-binder' | 'compiler' | 'compiler-seam'
  | 'drip-scribe' | 'gutter-frog' | 'basin-bell' | 'reed-needle' | 'eel-head' | 'eel-segment' | 'eel-segment-marked';

export interface SpriteFrame { x: number; y: number; width: number; height: number }

const image = (stage: 'stage-01' | 'stage-02' | 'stage-03', path: string): HTMLImageElement => {
  const result = new Image();
  result.decoding = 'async';
  result.src = `${import.meta.env.BASE_URL}assets/${stage}/${path}`;
  return result;
};

export const visuals = {
  'stage-01': {
    far: image('stage-01', 'erased-harbor-far-v1.png'),
    mid: image('stage-01', 'erased-harbor-mid-v1.png'),
    fore: image('stage-01', 'erased-harbor-fore-v1.png'),
    sprites: image('stage-01', 'stage-01-sprites-v1.png')
  },
  'stage-02': {
    far: image('stage-02', 'crosswind-index-far-v1.png'),
    mid: image('stage-02', 'crosswind-index-mid-v1.png'),
    fore: image('stage-02', 'crosswind-index-fore-v1.png'),
    sprites: image('stage-02', 'stage-02-sprites-v1.png')
  },
  'stage-03': {
    far: image('stage-03', 'rain-margin-far-v1.png'),
    mid: image('stage-03', 'rain-margin-mid-v1.png'),
    fore: image('stage-03', 'rain-margin-fore-v1.png'),
    sprites: image('stage-03', 'stage-03-sprites-v1.png')
  }
};

export const spriteFrames: Record<SpriteId, SpriteFrame & { stage: 'stage-01' | 'stage-02' | 'stage-03' }> = {
  player: { stage: 'stage-01', x: 0, y: 0, width: 480, height: 360 },
  'eraser-mite': { stage: 'stage-01', x: 460, y: 65, width: 310, height: 300 },
  'bracket-gull': { stage: 'stage-01', x: 755, y: 0, width: 455, height: 360 },
  'margin-skiff': { stage: 'stage-01', x: 1170, y: 15, width: 604, height: 300 },
  'folio-hauler': { stage: 'stage-01', x: 0, y: 350, width: 980, height: 537 },
  boss: { stage: 'stage-01', x: 965, y: 220, width: 809, height: 667 },
  return: { stage: 'stage-01', x: 1500, y: 245, width: 274, height: 150 },
  'index-kite': { stage: 'stage-02', x: 0, y: 0, width: 665, height: 390 },
  'vane-scribe': { stage: 'stage-02', x: 650, y: 0, width: 575, height: 395 },
  'cross-reference-pair': { stage: 'stage-02', x: 1210, y: 0, width: 564, height: 405 },
  'tab-binder': { stage: 'stage-02', x: 0, y: 390, width: 790, height: 497 },
  compiler: { stage: 'stage-02', x: 770, y: 400, width: 820, height: 487 },
  'compiler-seam': { stage: 'stage-02', x: 1550, y: 410, width: 224, height: 350 },
  'drip-scribe': { stage: 'stage-03', x: 0, y: 0, width: 330, height: 450 },
  'gutter-frog': { stage: 'stage-03', x: 220, y: 60, width: 540, height: 400 },
  'basin-bell': { stage: 'stage-03', x: 680, y: 0, width: 620, height: 490 },
  'reed-needle': { stage: 'stage-03', x: 1150, y: 20, width: 624, height: 450 },
  'eel-head': { stage: 'stage-03', x: 0, y: 460, width: 690, height: 427 },
  'eel-segment': { stage: 'stage-03', x: 620, y: 470, width: 610, height: 417 },
  'eel-segment-marked': { stage: 'stage-03', x: 1160, y: 460, width: 614, height: 427 }
};

export const assetsReady = Promise.all(Object.values(visuals).flatMap((stage) => Object.values(stage)).map((asset) => asset.decode().catch(() => undefined)));

export const drawSprite = (
  ctx: CanvasRenderingContext2D,
  id: SpriteId,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1,
  flipY = false
): void => {
  const frame = spriteFrames[id];
  const sheet = visuals[frame.stage].sprites;
  if (!sheet.complete || sheet.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flipY) ctx.scale(1, -1);
  ctx.drawImage(sheet, frame.x, frame.y, frame.width, frame.height, -width / 2, -height / 2, width, height);
  ctx.restore();
};
