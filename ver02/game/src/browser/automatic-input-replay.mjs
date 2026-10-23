const MODES = Object.freeze(["keyboard", "touch"]);
const KEY_COMMANDS = Object.freeze({
  up: "ArrowUp",
  down: "ArrowDown",
  fire: "Space",
});

function createEvent(type, fields) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  for (const [key, value] of Object.entries(fields)) {
    Object.defineProperty(event, key, { configurable: true, enumerable: true, value });
  }
  return event;
}

export function createAutomaticInputReplay(options = {}) {
  const mode = options.mode;
  const keyboardTarget = options.keyboardTarget;
  const pointerTarget = options.pointerTarget;
  const activatePrimary = options.activatePrimary;
  if (!MODES.includes(mode)) throw new TypeError("mode must be keyboard or touch");
  if (!keyboardTarget?.dispatchEvent) throw new TypeError("keyboardTarget must be an event target");
  if (!pointerTarget?.dispatchEvent) throw new TypeError("pointerTarget must be an event target");
  if (typeof activatePrimary !== "function") throw new TypeError("activatePrimary must be a function");

  const heldKeys = new Set();
  const heldPointers = new Set();
  const evidence = {
    mode,
    keyboardEvents: 0,
    pointerEvents: 0,
    primaryActivations: 0,
    gameplayFrames: 0,
  };

  function dispatchKey(type, code) {
    keyboardTarget.dispatchEvent(createEvent(type, { code, repeat: false }));
    evidence.keyboardEvents += 1;
  }

  function syncKey(name, held) {
    const code = KEY_COMMANDS[name];
    if (held && !heldKeys.has(code)) {
      heldKeys.add(code);
      dispatchKey("keydown", code);
    } else if (!held && heldKeys.delete(code)) {
      dispatchKey("keyup", code);
    }
  }

  function dispatchPointer(type, pointerId, role, x, y) {
    pointerTarget.dispatchEvent(createEvent(type, {
      pointerId,
      inputRole: role,
      clientX: x,
      clientY: y,
    }));
    evidence.pointerEvents += 1;
  }

  function syncPointer(role, pointerId, held, x = 0, y = 0) {
    if (held && !heldPointers.has(pointerId)) {
      heldPointers.add(pointerId);
      dispatchPointer("pointerdown", pointerId, role, 0, 0);
    }
    if (held && role === "move") dispatchPointer("pointermove", pointerId, role, x, y);
    if (!held && heldPointers.delete(pointerId)) {
      dispatchPointer("pointerup", pointerId, role, x, y);
    }
  }

  function releaseGameplay() {
    syncKey("up", false);
    syncKey("down", false);
    syncKey("fire", false);
    syncPointer("move", 7001, false);
    syncPointer("fire", 7002, false);
  }

  return Object.freeze({
    apply(command = {}, context = {}) {
      let primaryActivated = false;
      const playing = context.playing === true;
      if (!playing) releaseGameplay();
      if (mode === "keyboard") {
        syncKey("up", playing && command.moveY < 0);
        syncKey("down", playing && command.moveY > 0);
        syncKey("fire", playing && command.fire === true);
        if (command.confirm === true || command.advance === true) {
          dispatchKey("keydown", "Enter");
          dispatchKey("keyup", "Enter");
        }
      } else if (playing) {
        const moveY = Number.isFinite(command.moveY) ? command.moveY : 0;
        syncPointer("move", 7001, moveY !== 0, 0, moveY * 48);
        syncPointer("fire", 7002, command.fire === true);
      } else if (command.confirm === true || command.advance === true) {
        evidence.primaryActivations += 1;
        primaryActivated = true;
        activatePrimary();
      }
      if (playing) evidence.gameplayFrames += 1;
      return Object.freeze({ primaryActivated });
    },

    getEvidence() {
      return Object.freeze({ ...evidence });
    },

    dispose() {
      releaseGameplay();
    },
  });
}
