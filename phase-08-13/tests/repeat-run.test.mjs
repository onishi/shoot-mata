import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, drainEvents, startGame, transitionGame, updateGame } from '../src/game.ts';
import { chooseBotInput } from '../src/bot.ts';

test('ten complete runs stay consistent across retry and title transitions', () => {
  let game = startGame();
  let firstResult;

  for (let run = 0; run < 10; run++) {
    let frames = 0;
    while (game.scene === 'play' && frames < 13000) {
      updateGame(game, chooseBotInput(game), 0.016);
      drainEvents(game);
      frames++;

      if (frames === 3000) {
        const elapsed = game.time;
        const score = game.score;
        transitionGame(game, 'pause');
        updateGame(game, { x: 0, y: 0, fire: true }, 1);
        assert.equal(game.time, elapsed);
        assert.equal(game.score, score);
        transitionGame(game, 'resume');
      }
    }

    assert.equal(game.scene, 'result', `run ${run + 1} did not finish`);
    assert.equal(game.outcome, 'clear', `run ${run + 1} did not clear`);
    const result = { frames, time: game.time, score: game.score, kills: game.kills, hits: game.hits };
    assert.ok(result.time >= 165 && result.time <= 190);
    assert.ok(result.kills > 100);
    assert.deepEqual(result, firstResult ?? result, `run ${run + 1} changed result`);
    firstResult ??= result;

    if (run % 2 === 0) {
      const previous = game;
      game = transitionGame(game, 'retry');
      assert.notEqual(game, previous);
      assert.deepEqual(game, startGame());
    } else {
      const title = transitionGame(game, 'title');
      assert.deepEqual(title, createGame());
      game = transitionGame(title, 'start');
      assert.deepEqual(game, startGame());
    }
  }
});
