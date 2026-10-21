import { ACTORS, PARALLAX_LAYERS } from "./scene-model.mjs";

const stage = document.querySelector("[data-stage]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const layer of PARALLAX_LAYERS) {
  const element = document.querySelector(`[data-layer="${layer.id}"]`);
  element.style.setProperty("--parallax-speed", layer.speed);
}

for (const actor of ACTORS) {
  const element = document.querySelector(`[data-actor="${actor.id}"]`);
  element.style.setProperty("--x", actor.x);
  element.style.setProperty("--y", actor.y);
  element.style.setProperty("--width", actor.width);
  element.style.setProperty("--height", actor.height);
}

function render(time) {
  const travel = reducedMotion.matches ? 0 : (time / 1000) * 12;
  stage.style.setProperty("--travel", `${travel}px`);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
