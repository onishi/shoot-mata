import {
  beginPointer,
  createInputState,
  endPointer,
  movePointer,
  POINTER_ROLES,
  releaseAllInputs,
  setKey,
} from "../core/input-state.mjs";

export function createBrowserInputAdapter(options = {}) {
  const keyboardTarget = options.keyboardTarget;
  const gameTarget = options.gameTarget;
  const state = options.state ?? createInputState();
  const resolvePointerRole = options.resolvePointerRole
    ?? ((event) => event.target?.dataset?.inputRole ?? null);
  if (!keyboardTarget?.addEventListener || !keyboardTarget?.removeEventListener) {
    throw new TypeError("keyboardTarget must be an event target");
  }
  if (!gameTarget?.addEventListener || !gameTarget?.removeEventListener) {
    throw new TypeError("gameTarget must be an event target");
  }
  let gameplayActive = false;

  const isInteractiveActivation = (event) => {
    if (!["Enter", "Space"].includes(event.code)) return false;
    const tagName = event.target?.tagName?.toLowerCase?.();
    return ["button", "a", "input", "select", "textarea"].includes(tagName);
  };

  const onKeyDown = (event) => {
    if (isInteractiveActivation(event)) return;
    const handled = setKey(state, event.code, true, { repeat: event.repeat === true });
    if (handled && gameplayActive) event.preventDefault();
  };
  const onKeyUp = (event) => {
    const handled = setKey(state, event.code, false);
    if (handled && gameplayActive) event.preventDefault();
  };
  const onPointerDown = (event) => {
    const role = resolvePointerRole(event);
    if (!POINTER_ROLES.includes(role)) return;
    const began = beginPointer(state, {
      pointerId: event.pointerId, role, x: event.clientX, y: event.clientY,
    });
    if (!began) return;
    try {
      gameTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Capture拒否後もup/cancelまたはblurで必ず解放する。
    }
    event.preventDefault();
  };
  const onPointerMove = (event) => {
    if (movePointer(state, { pointerId: event.pointerId, x: event.clientX, y: event.clientY })) {
      event.preventDefault();
    }
  };
  const onPointerEnd = (event) => {
    if (endPointer(state, event.pointerId)) event.preventDefault();
  };
  const onBlur = () => releaseAllInputs(state);

  keyboardTarget.addEventListener("keydown", onKeyDown);
  keyboardTarget.addEventListener("keyup", onKeyUp);
  keyboardTarget.addEventListener("blur", onBlur);
  gameTarget.addEventListener("pointerdown", onPointerDown);
  gameTarget.addEventListener("pointermove", onPointerMove);
  gameTarget.addEventListener("pointerup", onPointerEnd);
  gameTarget.addEventListener("pointercancel", onPointerEnd);
  gameTarget.addEventListener("lostpointercapture", onPointerEnd);

  return {
    state,
    setGameplayActive(active) {
      if (typeof active !== "boolean") throw new TypeError("active must be boolean");
      gameplayActive = active;
    },
    dispose() {
      keyboardTarget.removeEventListener("keydown", onKeyDown);
      keyboardTarget.removeEventListener("keyup", onKeyUp);
      keyboardTarget.removeEventListener("blur", onBlur);
      gameTarget.removeEventListener("pointerdown", onPointerDown);
      gameTarget.removeEventListener("pointermove", onPointerMove);
      gameTarget.removeEventListener("pointerup", onPointerEnd);
      gameTarget.removeEventListener("pointercancel", onPointerEnd);
      gameTarget.removeEventListener("lostpointercapture", onPointerEnd);
      releaseAllInputs(state);
    },
  };
}
