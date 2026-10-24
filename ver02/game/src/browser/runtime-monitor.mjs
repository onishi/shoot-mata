export function createRuntimeMonitor(options = {}) {
  const sampleWindowMs = options.sampleWindowMs ?? 5_000;
  const metricIntervalMs = options.metricIntervalMs ?? Math.min(30_000, sampleWindowMs);
  const warmupMs = options.warmupMs ?? Math.min(60_000, sampleWindowMs / 2);
  if (!Number.isFinite(sampleWindowMs) || sampleWindowMs <= 0) {
    throw new TypeError("sampleWindowMs must be a positive finite number");
  }
  if (!Number.isFinite(metricIntervalMs) || metricIntervalMs <= 0) {
    throw new TypeError("metricIntervalMs must be a positive finite number");
  }
  if (!Number.isFinite(warmupMs) || warmupMs < 0 || warmupMs >= sampleWindowMs) {
    throw new TypeError("warmupMs must be non-negative and less than sampleWindowMs");
  }
  return {
    sampleWindowMs,
    metricIntervalMs,
    warmupMs,
    previousFrameMs: null,
    elapsedMs: 0,
    frames: 0,
    frameIntervals: 0,
    longFrames: 0,
    maxFrameMs: 0,
    droppedMs: 0,
    metricSamples: [],
    nextMetricSampleMs: 0,
    completed: null,
  };
}

export function suspendRuntimeMonitor(monitor) {
  if (!monitor || typeof monitor !== "object") throw new TypeError("monitor is required");
  monitor.previousFrameMs = null;
}

function normalizeMetrics(metrics) {
  if (metrics === undefined) return null;
  if (!metrics || typeof metrics !== "object") throw new TypeError("metrics must be an object");
  const normalized = {};
  for (const key of ["heapBytes", "resourceCount", "domNodes"]) {
    const value = metrics[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value < 0) throw new TypeError(`${key} must be non-negative`);
    normalized[key] = value;
  }
  return normalized;
}

function metricGrowth(samples, warmupMs, key) {
  const eligible = samples.filter((sample) => sample.elapsedMs >= warmupMs && sample[key] !== undefined);
  if (eligible.length < 2) return null;
  return eligible.at(-1)[key] - eligible[0][key];
}

export function recordRuntimeFrame(monitor, frameTimeMs, droppedMs = 0, metrics = undefined) {
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
  const normalizedMetrics = normalizeMetrics(metrics);
  if (normalizedMetrics && (elapsedMs >= monitor.nextMetricSampleMs || elapsedMs >= monitor.sampleWindowMs)) {
    monitor.metricSamples.push(Object.freeze({ elapsedMs, ...normalizedMetrics }));
    monitor.nextMetricSampleMs = elapsedMs + monitor.metricIntervalMs;
  }
  if (elapsedMs >= monitor.sampleWindowMs) {
    const metricSamples = Object.freeze([...monitor.metricSamples]);
    monitor.completed = Object.freeze({
      elapsedMs,
      fps: elapsedMs === 0 ? 0 : (monitor.frameIntervals * 1_000) / elapsedMs,
      longFrames: monitor.longFrames,
      maxFrameMs: monitor.maxFrameMs,
      droppedMs: monitor.droppedMs,
      metricSamples,
      heapGrowthBytes: metricGrowth(metricSamples, monitor.warmupMs, "heapBytes"),
      resourceGrowth: metricGrowth(metricSamples, monitor.warmupMs, "resourceCount"),
      domGrowth: metricGrowth(metricSamples, monitor.warmupMs, "domNodes"),
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
