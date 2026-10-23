export const DEFAULT_FIXED_STEP_MS = 1000 / 60;
export const DEFAULT_MAX_FRAME_DELTA_MS = 250;
export const DEFAULT_MAX_UPDATES_PER_FRAME = 8;

function assertPositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive finite number`);
  }
}

export function createFixedStepClock(options = {}) {
  const stepMs = options.stepMs ?? DEFAULT_FIXED_STEP_MS;
  const maxFrameDeltaMs = options.maxFrameDeltaMs ?? DEFAULT_MAX_FRAME_DELTA_MS;
  const maxUpdatesPerFrame = options.maxUpdatesPerFrame ?? DEFAULT_MAX_UPDATES_PER_FRAME;

  assertPositiveFinite(stepMs, "stepMs");
  assertPositiveFinite(maxFrameDeltaMs, "maxFrameDeltaMs");
  if (!Number.isInteger(maxUpdatesPerFrame) || maxUpdatesPerFrame <= 0) {
    throw new TypeError("maxUpdatesPerFrame must be a positive integer");
  }

  return {
    stepMs,
    maxFrameDeltaMs,
    maxUpdatesPerFrame,
    accumulatorMs: 0,
    previousFrameTimeMs: null,
    simulationTimeMs: 0,
    totalDroppedMs: 0,
    updateCount: 0,
    frameCount: 0,
    suspended: false,
  };
}

export function setClockSuspended(clock, suspended) {
  if (!clock || typeof clock !== "object") throw new TypeError("clock is required");
  if (typeof suspended !== "boolean") throw new TypeError("suspended must be boolean");
  if (clock.suspended === suspended) return;

  clock.suspended = suspended;
  clock.previousFrameTimeMs = null;
  clock.accumulatorMs = 0;
}

function emptyFrameResult(clock) {
  return {
    updates: 0,
    acceptedDeltaMs: 0,
    droppedDeltaMs: 0,
    alpha: clock.accumulatorMs / clock.stepMs,
    simulationTimeMs: clock.simulationTimeMs,
  };
}

export function advanceFixedStep(clock, frameTimeMs, update) {
  if (!clock || typeof clock !== "object") throw new TypeError("clock is required");
  if (!Number.isFinite(frameTimeMs) || frameTimeMs < 0) {
    throw new TypeError("frameTimeMs must be a non-negative finite number");
  }
  if (typeof update !== "function") throw new TypeError("update must be a function");

  clock.frameCount += 1;
  if (clock.suspended) return emptyFrameResult(clock);

  if (clock.previousFrameTimeMs === null) {
    clock.previousFrameTimeMs = frameTimeMs;
    return emptyFrameResult(clock);
  }

  const rawDeltaMs = frameTimeMs - clock.previousFrameTimeMs;
  if (rawDeltaMs < 0) throw new RangeError("frameTimeMs must be monotonic");
  clock.previousFrameTimeMs = frameTimeMs;

  const acceptedDeltaMs = Math.min(rawDeltaMs, clock.maxFrameDeltaMs);
  let droppedDeltaMs = rawDeltaMs - acceptedDeltaMs;
  clock.accumulatorMs += acceptedDeltaMs;

  let updates = 0;
  const epsilon = clock.stepMs * 1e-9;
  while (clock.accumulatorMs + epsilon >= clock.stepMs
    && updates < clock.maxUpdatesPerFrame) {
    update(clock.stepMs / 1000, clock.updateCount);
    clock.accumulatorMs -= clock.stepMs;
    if (clock.accumulatorMs < epsilon) clock.accumulatorMs = 0;
    clock.simulationTimeMs += clock.stepMs;
    clock.updateCount += 1;
    updates += 1;
  }

  if (clock.accumulatorMs + epsilon >= clock.stepMs) {
    const retainedMs = clock.accumulatorMs % clock.stepMs;
    droppedDeltaMs += clock.accumulatorMs - retainedMs;
    clock.accumulatorMs = retainedMs;
  }
  clock.totalDroppedMs += droppedDeltaMs;

  return {
    updates,
    acceptedDeltaMs,
    droppedDeltaMs,
    alpha: clock.accumulatorMs / clock.stepMs,
    simulationTimeMs: clock.simulationTimeMs,
  };
}
