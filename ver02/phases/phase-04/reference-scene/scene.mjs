import { ACTORS, PARALLAX_LAYERS, VFX_EVENTS } from "./scene-model.mjs";

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

for (const event of VFX_EVENTS) {
  const element = document.querySelector(`[data-vfx="${event.id}"]`);
  element.style.setProperty("--x", event.x);
  element.style.setProperty("--y", event.y);
}

const controls = [...document.querySelectorAll("[data-display-mode]")];

function setDisplayMode(mode) {
  stage.dataset.displayMode = mode;
  for (const control of controls) {
    control.setAttribute("aria-pressed", String(control.dataset.displayMode === mode));
  }
}

for (const control of controls) {
  control.addEventListener("click", () => setDisplayMode(control.dataset.displayMode));
}

function render(time) {
  const manuallyReduced = stage.dataset.displayMode === "reduced";
  const travel = reducedMotion.matches || manuallyReduced ? 0 : (time / 1000) * 12;
  stage.style.setProperty("--travel", `${travel}px`);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
