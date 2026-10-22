import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ASSET_BUDGETS, DELIVERY_ASSETS } from "./delivery-asset-config.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(SCRIPT_DIR, "..");
const VER02_DIR = resolve(GAME_DIR, "..");
const ASSET_ROOT = resolve(VER02_DIR, "assets");
const DEFAULT_OUTPUT_ROOT = resolve(ASSET_ROOT, "delivery");
const AUDIT_PATH = "asset-optimization-audit.json";

function parsePam(buffer) {
  const end = buffer.indexOf("ENDHDR\n");
  if (end < 0) throw new Error("invalid PAM: missing ENDHDR");
  const header = buffer.subarray(0, end).toString("ascii");
  const field = (name) => Number(header.match(new RegExp(`^${name} (\\d+)$`, "m"))?.[1]);
  const width = field("WIDTH");
  const height = field("HEIGHT");
  const depth = field("DEPTH");
  if (!width || !height || ![3, 4].includes(depth)) throw new Error("invalid PAM dimensions or depth");
  const pixels = buffer.subarray(end + "ENDHDR\n".length);
  if (pixels.length !== width * height * depth) throw new Error("invalid PAM pixel length");
  return { width, height, depth, pixels };
}

function comparePixels(reference, candidate) {
  if (reference.width !== candidate.width || reference.height !== candidate.height || reference.depth !== candidate.depth) {
    throw new Error("decoded image dimensions differ");
  }
  let rgbAbsolute = 0;
  let rgbSquared = 0;
  let rgbSamples = 0;
  let alphaAbsolute = 0;
  let alphaMaximum = 0;
  for (let offset = 0; offset < reference.pixels.length; offset += reference.depth) {
    const visible = reference.depth === 3 || reference.pixels[offset + 3] > 16 || candidate.pixels[offset + 3] > 16;
    if (visible) {
      for (let channel = 0; channel < 3; channel += 1) {
        const difference = Math.abs(reference.pixels[offset + channel] - candidate.pixels[offset + channel]);
        rgbAbsolute += difference;
        rgbSquared += difference ** 2;
        rgbSamples += 1;
      }
    }
    if (reference.depth === 4) {
      const difference = Math.abs(reference.pixels[offset + 3] - candidate.pixels[offset + 3]);
      alphaAbsolute += difference;
      alphaMaximum = Math.max(alphaMaximum, difference);
    }
  }
  const mse = rgbSquared / rgbSamples;
  return {
    meanAbsoluteRgbError: Number((rgbAbsolute / rgbSamples).toFixed(3)),
    rgbPsnrDb: mse === 0 ? 99 : Number((10 * Math.log10((255 ** 2) / mse)).toFixed(3)),
    meanAbsoluteAlphaError: Number((alphaAbsolute / (reference.width * reference.height)).toFixed(3)),
    maximumAlphaError: alphaMaximum,
  };
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function encodeAndAudit(spec, outputRoot, workDirectory) {
  const source = resolve(ASSET_ROOT, spec.sourcePath);
  const destination = resolve(outputRoot, spec.deliveryPath);
  await mkdir(dirname(destination), { recursive: true });
  const argumentsList = spec.lossless
    ? ["-quiet", "-lossless", "-m", "4", "-resize", String(spec.width), String(spec.height), source, "-o", destination]
    : ["-quiet", "-q", String(spec.quality), "-alpha_q", String(spec.alphaQuality),
      "-m", "4", "-resize", String(spec.width), String(spec.height), source, "-o", destination];
  await execFileAsync("cwebp", argumentsList);

  const stem = createHash("sha256").update(spec.deliveryPath).digest("hex").slice(0, 12);
  const referenceWebp = join(workDirectory, `${stem}-reference.webp`);
  const referencePam = join(workDirectory, `${stem}-reference.pam`);
  const candidatePam = join(workDirectory, `${stem}-candidate.pam`);
  await execFileAsync("cwebp", ["-quiet", "-lossless", "-m", "4", "-resize", String(spec.width), String(spec.height), source, "-o", referenceWebp]);
  await execFileAsync("dwebp", [referenceWebp, "-pam", "-o", referencePam]);
  await execFileAsync("dwebp", [destination, "-pam", "-o", candidatePam]);
  const comparison = comparePixels(parsePam(await readFile(referencePam)), parsePam(await readFile(candidatePam)));
  const details = await stat(destination);
  return {
    sourcePath: spec.sourcePath,
    deliveryPath: spec.deliveryPath,
    group: spec.group,
    width: spec.width,
    height: spec.height,
    quality: spec.quality,
    lossless: spec.lossless,
    bytes: details.size,
    sha256: await sha256(destination),
    ...comparison,
  };
}

export async function optimizeDeliveryAssets(outputRoot = DEFAULT_OUTPUT_ROOT) {
  const output = resolve(outputRoot);
  const workDirectory = await mkdtemp(join(tmpdir(), "shoot-mata-assets-"));
  try {
    const images = [];
    for (const spec of DELIVERY_ASSETS.filter(({ kind }) => kind === "webp")) {
      images.push(await encodeAndAudit(spec, output, workDirectory));
    }
    const groupBytes = Object.fromEntries(Object.keys(ASSET_BUDGETS)
      .filter((group) => group !== "build")
      .map((group) => [group, images.filter((image) => image.group === group).reduce((sum, image) => sum + image.bytes, 0)]));
    const audit = {
      schemaVersion: 1,
      encoder: "cwebp method=4; lossy backgrounds; lossless actors and cores; lossless alpha",
      qualityFloor: { rgbPsnrDb: 30, maximumAlphaError: 0 },
      budgets: ASSET_BUDGETS,
      groupImageBytes: groupBytes,
      images,
    };
    await mkdir(output, { recursive: true });
    await writeFile(resolve(output, AUDIT_PATH), `${JSON.stringify(audit, null, 2)}\n`);
    return audit;
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = await optimizeDeliveryAssets();
  console.log(`optimized ${audit.images.length} images: stage-01 ${audit.groupImageBytes["stage-01"]} bytes; shared ${audit.groupImageBytes.shared} bytes`);
}
