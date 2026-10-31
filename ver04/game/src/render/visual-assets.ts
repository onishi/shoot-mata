export type SpriteId = 'player' | 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler' | 'boss' | 'return'
  | 'index-kite' | 'vane-scribe' | 'cross-reference-pair' | 'tab-binder' | 'compiler' | 'compiler-seam';

export interface SpriteFrame { x: number; y: number; width: number; height: number }

const image = (stage: 'stage-01' | 'stage-02', path: string): HTMLImageElement => {
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
  }
};

export const spriteFrames: Record<SpriteId, SpriteFrame & { stage: 'stage-01' | 'stage-02' }> = {
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
  'compiler-seam': { stage: 'stage-02', x: 1550, y: 410, width: 224, height: 350 }
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
