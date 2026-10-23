const KEY_BINDINGS = Object.freeze({
  ArrowLeft: ["left", "held"],
  KeyA: ["left", "held"],
  ArrowRight: ["right", "held"],
  KeyD: ["right", "held"],
  ArrowUp: ["up", "held"],
  KeyW: ["up", "held"],
  ArrowDown: ["down", "held"],
  KeyS: ["down", "held"],
  KeyZ: ["fire", "held"],
  Space: ["fire", "held"],
  Enter: ["confirm", "pulse"],
  Escape: ["back", "pulse"],
  KeyP: ["pause", "pulse"],
});

export const POINTER_ROLES = Object.freeze(["move", "fire", "confirm", "back", "pause"]);

function assertState(state) {
  if (!state || !(state.keys instanceof Set) || !(state.pointers instanceof Map)) {
    throw new TypeError("invalid input state");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createInputState(options = {}) {
  const pointerRadius = options.pointerRadius ?? 48;
  if (!Number.isFinite(pointerRadius) || pointerRadius <= 0) {
    throw new TypeError("pointerRadius must be a positive finite number");
  }
  return {
    pointerRadius,
    keys: new Set(),
    pointers: new Map(),
    pulses: new Set(),
  };
}

export function isBoundKey(code) {
  return Object.hasOwn(KEY_BINDINGS, code);
}

export function setKey(state, code, pressed, options = {}) {
  assertState(state);
  if (typeof code !== "string" || typeof pressed !== "boolean") throw new TypeError("invalid key input");
  const binding = KEY_BINDINGS[code];
  if (!binding) return false;
  const [command, mode] = binding;
  if (pressed) {
    const wasPressed = state.keys.has(code);
    state.keys.add(code);
    if (mode === "pulse" && !wasPressed && options.repeat !== true) state.pulses.add(command);
  } else {
    state.keys.delete(code);
  }
  return true;
}

export function beginPointer(state, input) {
  assertState(state);
  if (!input || !Number.isInteger(input.pointerId)) throw new TypeError("pointerId must be an integer");
  if (!POINTER_ROLES.includes(input.role)) throw new TypeError("invalid pointer role");
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) throw new TypeError("invalid pointer position");
  if (state.pointers.has(input.pointerId)) return false;
  if (input.role === "move" && [...state.pointers.values()].some((pointer) => pointer.role === "move")) {
    return false;
  }
  state.pointers.set(input.pointerId, {
    role: input.role,
    originX: input.x,
    originY: input.y,
    x: input.x,
    y: input.y,
  });
  if (["confirm", "back", "pause"].includes(input.role)) state.pulses.add(input.role);
  return true;
}

export function movePointer(state, input) {
  assertState(state);
  const pointer = state.pointers.get(input?.pointerId);
  if (!pointer) return false;
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) throw new TypeError("invalid pointer position");
  pointer.x = input.x;
  pointer.y = input.y;
  return true;
}

export function endPointer(state, pointerId) {
  assertState(state);
  return state.pointers.delete(pointerId);
}

export function releaseAllInputs(state) {
  assertState(state);
  state.keys.clear();
  state.pointers.clear();
  state.pulses.clear();
}

function hasHeldKey(state, command) {
  return [...state.keys].some((code) => KEY_BINDINGS[code]?.[0] === command);
}

export function consumeInput(state) {
  assertState(state);
  const keyboardX = Number(hasHeldKey(state, "right")) - Number(hasHeldKey(state, "left"));
  const keyboardY = Number(hasHeldKey(state, "down")) - Number(hasHeldKey(state, "up"));
  const movePointerState = [...state.pointers.values()].find((pointer) => pointer.role === "move");
  const pointerX = movePointerState
    ? clamp((movePointerState.x - movePointerState.originX) / state.pointerRadius, -1, 1)
    : 0;
  const pointerY = movePointerState
    ? clamp((movePointerState.y - movePointerState.originY) / state.pointerRadius, -1, 1)
    : 0;
  const commands = {
    moveX: clamp(keyboardX + pointerX, -1, 1),
    moveY: clamp(keyboardY + pointerY, -1, 1),
    fire: hasHeldKey(state, "fire")
      || [...state.pointers.values()].some((pointer) => pointer.role === "fire"),
    confirm: state.pulses.has("confirm"),
    back: state.pulses.has("back"),
    pause: state.pulses.has("pause"),
  };
  state.pulses.clear();
  return commands;
}
