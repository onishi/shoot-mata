import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXIT,
  LEVELS,
  MAX_FUEL,
  PHOSPHOR_TICKS,
  PLAYER_START,
  WARDEN_START,
  activeMirrorBeams,
  activePhosphors,
  advanceRoom,
  collectedCount,
  createGame,
  forceState,
  isBright,
  isExitOpen,
  isPointLit,
  isWall,
  movePlayer,
  retryGame,
  setBright,
  startGame,
  tickGame,
  togglePause,
  wardenIsHunting
} from '../src/model.js';
import { DEFAULT_PREFERENCES, SAVE_KEY, loadPreferences, savePreferences } from '../src/preferences.js';

test('starts, pauses, resumes, and retries the room', () => {
  let game = startGame(createGame());
  assert.equal(game.phase, 'playing');
  game = togglePause(game);
  assert.equal(game.phase, 'paused');
  assert.equal(togglePause(game).phase, 'playing');
  assert.deepEqual(retryGame().player, PLAYER_START);
});

test('walls reject movement while open cells accept it', () => {
  let game = startGame(createGame());
  game = movePlayer(game, -1, 0);
  assert.deepEqual(game.player, PLAYER_START);
  game = movePlayer(game, 1, 0);
  assert.deepEqual(game.player, { x: 2, y: 8 });
});

test('bright light consumes fuel and dim light recovers it', () => {
  let game = setBright(startGame(createGame()), true);
  game = tickGame(game);
  assert.equal(game.fuel, MAX_FUEL - 1);
  game = setBright(game, false);
  game = tickGame(game);
  assert.equal(game.fuel, MAX_FUEL);
});

test('empty fuel forces the bright light off', () => {
  let game = forceState(setBright(startGame(createGame()), true), { fuel: 1 });
  game = tickGame(game);
  assert.equal(game.fuel, 0);
  assert.equal(isBright(game), false);
  assert.equal(game.brightRequested, false);
  assert.equal(game.event, 'empty');
});

test('a seed can only be gathered in bright light', () => {
  let game = forceState(startGame(createGame()), { player: { x: 3, y: 7 } });
  game = movePlayer(game, 1, 0);
  assert.equal(collectedCount(game), 0);
  game = forceState(setBright(game, true), { player: { x: 3, y: 7 } });
  game = movePlayer(game, 1, 0);
  assert.equal(collectedCount(game), 1);
  assert.equal(game.event, 'seed');
});

test('warden patrols while dim and pursues while bright', () => {
  let dim = startGame(createGame());
  for (let index = 0; index < 4; index += 1) dim = tickGame(dim);
  assert.deepEqual({ x: dim.wardens[0].x, y: dim.wardens[0].y }, { x: 12, y: 8 });

  let bright = forceState(setBright(startGame(createGame()), true), { player: { x: 13, y: 4 } });
  for (let index = 0; index < 4; index += 1) bright = tickGame(bright);
  assert.deepEqual({ x: bright.wardens[0].x, y: bright.wardens[0].y }, { x: 13, y: 7 });
});

test('contact costs a life and resets positions while retaining seeds', () => {
  let game = startGame(createGame());
  const seeds = game.seeds.map((seed, index) => ({ ...seed, collected: index === 0 }));
  game = forceState(game, { player: { x: 12, y: 8 }, wardens: [{ ...game.wardens[0], x: 13, y: 8 }], seeds });
  game = movePlayer(game, 1, 0);
  assert.equal(game.lives, 2);
  assert.deepEqual(game.player, PLAYER_START);
  assert.deepEqual({ x: game.wardens[0].x, y: game.wardens[0].y }, WARDEN_START);
  assert.equal(collectedCount(game), 1);
});

test('third contact causes defeat', () => {
  const started = startGame(createGame());
  let game = forceState(started, { lives: 1, player: { x: 12, y: 8 }, wardens: [{ ...started.wardens[0], x: 13, y: 8 }] });
  game = movePlayer(game, 1, 0);
  assert.equal(game.phase, 'lost');
  assert.equal(game.lives, 0);
});

test('all seeds open the exit and entering it wins', () => {
  let game = startGame(createGame());
  game = forceState(game, {
    player: { x: EXIT.x - 1, y: EXIT.y },
    seeds: game.seeds.map((seed) => ({ ...seed, collected: true }))
  });
  assert.equal(isExitOpen(game), true);
  game = movePlayer(game, 1, 0);
  assert.equal(game.phase, 'won');
});

test('winning the first room advances to its distinct second-room data', () => {
  let game = forceState(startGame(createGame()), { phase: 'won' });
  game = advanceRoom(game);
  assert.equal(game.phase, 'playing');
  assert.equal(game.levelIndex, 1);
  assert.equal(LEVELS[game.levelIndex].name, 'PRISM WALK');
  assert.deepEqual(game.player, LEVELS[1].playerStart);
  assert.equal(isWall({ x: 2, y: 3 }, game), true);
  assert.equal(isWall({ x: 3, y: 2 }, game), false);
  assert.equal(retryGame(game).levelIndex, 1);
});

test('the second-room prism turns bright light toward a distant seed', () => {
  let game = startGame(createGame(), 1);
  const distantSeed = LEVELS[1].seeds[0];
  assert.ok(Math.hypot(distantSeed.x - game.player.x, distantSeed.y - game.player.y) > 5.4);
  assert.equal(isPointLit(game, distantSeed), false);

  game = setBright(game, true);
  const beams = activeMirrorBeams(game);
  assert.equal(beams.length, 1);
  assert.deepEqual(beams[0].cells.at(-1), { x: 5, y: 1 });
  assert.equal(isPointLit(game, distantSeed), true);

  game = setBright(game, false);
  assert.equal(activeMirrorBeams(game).length, 0);
  assert.equal(isPointLit(game, distantSeed), false);
});

test('winning the second room advances to the phosphor room', () => {
  let game = forceState(startGame(createGame(), 1), { phase: 'won' });
  game = advanceRoom(game);
  assert.equal(game.phase, 'playing');
  assert.equal(game.levelIndex, 2);
  assert.equal(LEVELS[2].name, 'AFTERGLOW GALLERY');
  assert.equal(game.phosphors.length, LEVELS[2].phosphors.length);
});

test('phosphor tiles preserve a fading pool of light after the lamp dims', () => {
  let game = setBright(startGame(createGame(), 2), true);
  game = tickGame(game);
  assert.ok(activePhosphors(game).length > 0);
  assert.equal(Math.max(...activePhosphors(game).map((tile) => tile.charge)), PHOSPHOR_TICKS);

  const rememberedPoint = { x: 4, y: 6 };
  game = setBright(game, false);
  assert.equal(isPointLit(game, rememberedPoint), true);
  for (let index = 0; index < PHOSPHOR_TICKS; index += 1) game = tickGame(game);
  assert.equal(activePhosphors(game).length, 0);
  assert.equal(isPointLit(game, rememberedPoint), false);
});

test('winning the third room advances to the twin vigil', () => {
  let game = forceState(startGame(createGame(), 2), { phase: 'won' });
  game = advanceRoom(game);
  assert.equal(game.phase, 'playing');
  assert.equal(game.levelIndex, 3);
  assert.equal(LEVELS[3].name, 'TWIN VIGIL');
  assert.equal(game.wardens.length, 2);
});

test('twin wardens trade pursuit when the lamp changes', () => {
  let dim = startGame(createGame(), 3);
  assert.equal(wardenIsHunting(dim, dim.wardens[0]), false);
  assert.equal(wardenIsHunting(dim, dim.wardens[1]), true);
  const dimStarts = dim.wardens.map(({ x, y }) => ({ x, y }));
  for (let index = 0; index < 4; index += 1) dim = tickGame(dim);
  assert.notDeepEqual({ x: dim.wardens[1].x, y: dim.wardens[1].y }, dimStarts[1]);

  let bright = setBright(startGame(createGame(), 3), true);
  assert.equal(wardenIsHunting(bright, bright.wardens[0]), true);
  assert.equal(wardenIsHunting(bright, bright.wardens[1]), false);
  const brightStarts = bright.wardens.map(({ x, y }) => ({ x, y }));
  for (let index = 0; index < 4; index += 1) bright = tickGame(bright);
  assert.notDeepEqual({ x: bright.wardens[0].x, y: bright.wardens[0].y }, brightStarts[0]);
});

test('finishing the available fourth room returns to the title', () => {
  let game = forceState(startGame(createGame(), 3), { phase: 'won' });
  game = advanceRoom(game);
  assert.equal(game.phase, 'title');
  assert.equal(game.levelIndex, 3);
});

test('preferences round-trip progress and accessibility settings', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const preferences = { maxUnlockedLevel: 2, volume: 1, screenShake: false, reduceFlashes: true };
  assert.equal(savePreferences(storage, preferences), true);
  assert.deepEqual(loadPreferences(storage, LEVELS.length), preferences);
  assert.match(values.get(SAVE_KEY), /\"version\":1/);
});

test('missing, malformed, out-of-range, and blocked saves use safe defaults', () => {
  const from = (value) => loadPreferences({ getItem: () => value }, LEVELS.length);
  assert.deepEqual(from(null), DEFAULT_PREFERENCES);
  assert.deepEqual(from('{bad json'), DEFAULT_PREFERENCES);
  assert.deepEqual(from('[]'), DEFAULT_PREFERENCES);
  assert.deepEqual(from(JSON.stringify({ version: 1, maxUnlockedLevel: 99, volume: 2, screenShake: 'yes', reduceFlashes: false })), DEFAULT_PREFERENCES);
  assert.deepEqual(loadPreferences({ getItem: () => { throw new Error('blocked'); } }, LEVELS.length), DEFAULT_PREFERENCES);
  assert.equal(savePreferences({ setItem: () => { throw new Error('blocked'); } }, DEFAULT_PREFERENCES), false);
});
