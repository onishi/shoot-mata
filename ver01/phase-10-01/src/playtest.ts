import { drainEvents, startGame, updateGame, type GameState } from './game.ts';
import { choosePolicyInput, type PlaytestPolicy } from './policies.ts';

export interface PlaytestSnapshot { time: number; score: number; kills: number; hits: number; energy: number }
export interface PlaytestResult {
  policy: PlaytestPolicy; outcome: GameState['outcome']; frames: number; time: number;
  score: number; kills: number; hits: number; collections: number; bursts: number; switches: number;
  timeline: PlaytestSnapshot[];
}

function snapshot(game: GameState): PlaytestSnapshot {
  return { time: Number(game.time.toFixed(2)), score: game.score, kills: game.kills, hits: game.hits, energy: game.energy };
}

export function runPlaytest(policy: PlaytestPolicy): PlaytestResult {
  const game = startGame();
  const timeline: PlaytestSnapshot[] = [];
  let frames = 0, collections = 0, bursts = 0, switches = 0, nextSnapshot = 30;
  while (game.scene === 'play' && frames < 13000) {
    const input = choosePolicyInput(game, policy);
    updateGame(game, input, 0.016);
    for (const event of drainEvents(game)) {
      if (event.kind === 'collect') collections++;
      if (event.kind === 'burst') bursts++;
      if (event.kind === 'switch') switches++;
    }
    frames++;
    if (game.time >= nextSnapshot) { timeline.push(snapshot(game)); nextSnapshot += 30; }
  }
  timeline.push(snapshot(game));
  return { policy, outcome: game.outcome, frames, time: Number(game.time.toFixed(2)), score: game.score,
    kills: game.kills, hits: game.hits, collections, bursts, switches, timeline };
}
