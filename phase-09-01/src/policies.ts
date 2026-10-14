import { activateBurst, toggleMode, type GameState, type Input } from './game.ts';
import { chooseBotInput } from './bot.ts';

export type PlaytestPolicy = 'balanced' | 'survival' | 'assault' | 'collector';
export const PLAYTEST_POLICIES: PlaytestPolicy[] = ['balanced', 'survival', 'assault', 'collector'];

/** Deterministic AI policies for comparing stage behavior, not human skill. */
export function choosePolicyInput(game: GameState, policy: PlaytestPolicy): Input {
  if (policy === 'balanced') return chooseBotInput(game);
  const player = game.player;
  const target = game.enemies.find(enemy => enemy.x < 950);
  const pickup = game.pickups.find(item => item.x > player.x - 20 && item.x < 500);
  const danger = game.enemyBullets.find(bullet => Math.abs(bullet.x - player.x) < 130 && Math.abs(bullet.y - player.y) < 65);

  const mode = policy === 'assault' || target?.kind === 'heavy' || target?.kind === 'boss' ? 'focus' : 'wide';
  if (game.mode !== mode) toggleMode(game);
  if (game.energy >= 5 && (policy === 'assault' || target?.kind === 'boss' || (policy === 'survival' && danger))) activateBurst(game);

  let wantedX = policy === 'survival' ? 170 : policy === 'assault' ? 360 : 300;
  let wantedY = target?.y ?? 270;
  if (policy === 'collector' && pickup) { wantedX = pickup.x; wantedY = pickup.y; }
  if (policy === 'survival' && danger) wantedY = player.y + (danger.y < player.y ? 90 : -90);

  return {
    x: Math.abs(wantedX - player.x) < 8 ? 0 : Math.sign(wantedX - player.x),
    y: Math.abs(wantedY - player.y) < 10 ? 0 : Math.sign(wantedY - player.y),
    fire: true,
  };
}
