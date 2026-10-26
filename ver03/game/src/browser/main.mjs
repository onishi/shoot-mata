import { automaticInput, beginStage, createGame, snapshot, updateGame } from "../core/game.mjs";
import { render } from "./renderer.mjs";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const params = new URLSearchParams(location.search);
const autoplay = params.get("autoplay") === "1";
const speed = Math.max(1, Math.min(240, Number(params.get("speed")) || 1));
const keys = new Set();
const pressed = new Set();
const game = createGame();
let previous = performance.now();
let accumulator = 0;

addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
  if (event.code === "Enter" && game.screen === "title") beginStage(game);
});
addEventListener("keyup", (event) => keys.delete(event.code));

function keyboardInput() {
  return {
    up: keys.has("ArrowUp") || keys.has("KeyW"),
    down: keys.has("ArrowDown") || keys.has("KeyS"),
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    fire: keys.has("KeyZ") || keys.has("Space"),
    pausePressed: pressed.has("KeyP")
  };
}

function frame(now) {
  const elapsed = Math.min(100, now - previous);
  previous = now;
  accumulator += elapsed;
  const normalSteps = Math.min(5, Math.floor(accumulator / (1000 / 60)));
  if (normalSteps > 0) accumulator -= normalSteps * (1000 / 60);
  const steps = autoplay ? speed : normalSteps;
  for (let i = 0; i < steps; i += 1) updateGame(game, autoplay ? automaticInput(game) : keyboardInput());
  pressed.clear();
  render(ctx, game);
  requestAnimationFrame(frame);
}

window.__shootMata = {
  start: () => beginStage(game),
  state: () => snapshot(game),
  advance(ticks) {
    for (let i = 0; i < ticks; i += 1) updateGame(game, automaticInput(game));
    render(ctx, game);
    return snapshot(game);
  }
};

if (autoplay) beginStage(game);
render(ctx, game);
requestAnimationFrame(frame);
