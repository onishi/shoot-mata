import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SAMPLE_SIZE = 64;
const SAMPLE_PIXELS = SAMPLE_SIZE * SAMPLE_SIZE;

export const VISION_SIMULATIONS = Object.freeze({
  grayscale: "format=gray",
  protanopia: "colorchannelmixer=.567:.433:0:0:.558:.442:0:0:0:.242:.758:0,format=gray",
  deuteranopia: "colorchannelmixer=.625:.375:0:0:.7:.3:0:0:0:.3:.7:0,format=gray",
  tritanopia: "colorchannelmixer=.95:.05:0:0:0:.433:.567:0:0:.475:.525:0,format=gray",
});

export const MIN_MEAN_PIXEL_DIFFERENCE = 18;

export function assetPath(relativeUrl) {
  return fileURLToPath(new URL(relativeUrl, import.meta.url));
}

export function renderVisionSample(filePath, simulation) {
  const simulationFilter = VISION_SIMULATIONS[simulation];
  if (!simulationFilter) {
    throw new TypeError(`unknown vision simulation: ${simulation}`);
  }

  const filter = [
    `scale=${SAMPLE_SIZE}:${SAMPLE_SIZE}:force_original_aspect_ratio=decrease`,
    `pad=${SAMPLE_SIZE}:${SAMPLE_SIZE}:(ow-iw)/2:(oh-ih)/2:color=0x111827`,
    simulationFilter,
  ].join(",");

  const sample = execFileSync("ffmpeg", [
    "-v", "error", "-i", filePath, "-vf", filter,
    "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1",
  ]);
  if (sample.length !== SAMPLE_PIXELS) {
    throw new Error(`unexpected sample length for ${filePath}: ${sample.length}`);
  }
  return sample;
}

export function meanPixelDifference(left, right) {
  if (left.length !== right.length || left.length === 0) {
    throw new TypeError("samples must have the same non-zero length");
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference += Math.abs(left[index] - right[index]);
  }
  return difference / left.length;
}

export function horizontalEdgeDensity(sample, width = SAMPLE_SIZE) {
  if (sample.length === 0 || sample.length % width !== 0) {
    throw new TypeError("sample dimensions are invalid");
  }
  let difference = 0;
  let comparisons = 0;
  for (let row = 0; row < sample.length / width; row += 1) {
    for (let column = 1; column < width; column += 1) {
      const index = row * width + column;
      difference += Math.abs(sample[index] - sample[index - 1]);
      comparisons += 1;
    }
  }
  return difference / comparisons;
}
