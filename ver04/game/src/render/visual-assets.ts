export type SpriteId = 'player' | 'eraser-mite' | 'bracket-gull' | 'margin-skiff' | 'folio-hauler' | 'boss' | 'return';

export interface SpriteFrame { x: number; y: number; width: number; height: number }

const image = (path: string): HTMLImageElement => {
  const result = new Image();
  result.decoding = 'async';
  result.src = `${import.meta.env.BASE_URL}assets/stage-01/${path}`;
  return result;
};

export const visuals = {
  far: image('erased-harbor-far-v1.png'),
  mid: image('erased-harbor-mid-v1.png'),
  fore: image('erased-harbor-fore-v1.png'),
  sprites: image('stage-01-sprites-v1.png')
};

export const spriteFrames: Record<SpriteId, SpriteFrame> = {
  player: { x: 0, y: 0, width: 480, height: 360 },
  'eraser-mite': { x: 460, y: 65, width: 310, height: 300 },
  'bracket-gull': { x: 755, y: 0, width: 455, height: 360 },
  'margin-skiff': { x: 1170, y: 15, width: 604, height: 300 },
  'folio-hauler': { x: 0, y: 350, width: 980, height: 537 },
  boss: { x: 965, y: 220, width: 809, height: 667 },
  return: { x: 1500, y: 245, width: 274, height: 150 }
};

export const assetsReady = Promise.all(Object.values(visuals).map((asset) => asset.decode().catch(() => undefined)));

export const drawSprite = (
  ctx: CanvasRenderingContext2D,
  id: SpriteId,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1
): void => {
  if (!visuals.sprites.complete || visuals.sprites.naturalWidth === 0) return;
  const frame = spriteFrames[id];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(visuals.sprites, frame.x, frame.y, frame.width, frame.height, x - width / 2, y - height / 2, width, height);
  ctx.restore();
};
