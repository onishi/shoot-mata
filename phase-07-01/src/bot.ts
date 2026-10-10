import { activateBurst, toggleMode, type GameState, type Input } from './game.ts';

/** Development-only scripted pilot for repeatable visual review. */
export function chooseBotInput(game: GameState): Input {
  const player = game.player;
  const target = game.enemies.find(enemy => enemy.x < 950) ?? { y: 270 };
  const pickup = game.pickups.find(item => item.x > player.x - 20 && item.x < 440);
  const danger = game.enemyBullets.find(bullet => Math.abs(bullet.x - player.x) < 90 && Math.abs(bullet.y - player.y) < 45);
  const wantedY = danger ? player.y + (danger.y < player.y ? 75 : -75) : pickup ? pickup.y : target.y;
  const wantedX = pickup ? pickup.x : 300;
  const mode = 'kind' in target && (target.kind === 'heavy' || target.kind === 'boss') ? 'focus' : 'wide';
  if (game.mode !== mode) toggleMode(game);
  if (game.energy >= 5) activateBurst(game);
  return {
    x: Math.abs(wantedX - player.x) < 8 ? 0 : Math.sign(wantedX - player.x),
    y: Math.abs(wantedY - player.y) < 10 ? 0 : Math.sign(wantedY - player.y),
    fire: true,
  };
}
