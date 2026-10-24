export function createRuntimeMonitor(options = {}) {
  const sampleWindowMs = options.sampleWindowMs ?? 5_000;
  if (!Number.isFinite(sampleWindowMs) || sampleWindowMs <= 0) {
    throw new TypeError("sampleWindowMs must be a positive finite number");
  }
  return {
    sampleWindowMs,
    previousFrameMs: null,
    elapsedMs: 0,
    frames: 0,
    frameIntervals: 0,
    longFrames: 0,
    maxFrameMs: 0,
    droppedMs: 0,
    completed: null,
  };
}

export function suspendRuntimeMonitor(monitor) {
  if (!monitor || typeof monitor !== "object") throw new TypeError("monitor is required");
  monitor.previousFrameMs = null;
}

export function recordRuntimeFrame(monitor, frameTimeMs, droppedMs = 0) {
  if (!monitor || typeof monitor !== "object") throw new TypeError("monitor is required");
  if (!Number.isFinite(frameTimeMs) || frameTimeMs < 0) throw new TypeError("frameTimeMs must be non-negative");
  if (!Number.isFinite(droppedMs) || droppedMs < 0) throw new TypeError("droppedMs must be non-negative");
  if (monitor.completed) return monitor.completed;

  if (monitor.previousFrameMs !== null) {
    const interval = frameTimeMs - monitor.previousFrameMs;
    if (interval < 0) throw new RangeError("frameTimeMs must be monotonic");
    monitor.elapsedMs += interval;
    monitor.frameIntervals += 1;
    monitor.maxFrameMs = Math.max(monitor.maxFrameMs, interval);
    if (interval > 50) monitor.longFrames += 1;
  }
  monitor.previousFrameMs = frameTimeMs;
  monitor.frames += 1;
  monitor.droppedMs += droppedMs;

  const elapsedMs = monitor.elapsedMs;
  if (elapsedMs >= monitor.sampleWindowMs) {
    monitor.completed = Object.freeze({
      elapsedMs,
      fps: elapsedMs === 0 ? 0 : (monitor.frameIntervals * 1_000) / elapsedMs,
      longFrames: monitor.longFrames,
      maxFrameMs: monitor.maxFrameMs,
      droppedMs: monitor.droppedMs,
    });
  }
  return monitor.completed;
}

export function auditRuntimeResources(entries, origin) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  if (typeof origin !== "string" || origin.length === 0) throw new TypeError("origin is required");
  const urls = entries.map(({ name }) => new URL(name));
  const externalOrigins = [...new Set(urls.filter((url) => url.origin !== origin).map((url) => url.origin))].sort();
  return Object.freeze({
    resourceCount: entries.length,
    encodedBytes: entries.reduce((sum, entry) => sum + (Number(entry.encodedBodySize) || 0), 0),
    transferBytes: entries.reduce((sum, entry) => sum + (Number(entry.transferSize) || 0), 0),
    externalOrigins,
  });
}
