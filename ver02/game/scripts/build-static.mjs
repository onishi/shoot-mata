import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const BUILD_ID = "phase06-stage01-slice-20261022";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(SCRIPT_DIR, "..");
const VER02_DIR = resolve(GAME_DIR, "..");
const DEFAULT_OUTPUT = resolve(GAME_DIR, "dist");

const ASSET_PATHS = Object.freeze([
  "audio/reference/stage-01-rhythm-loop-v1.wav",
  "audio/reference/ui-confirm-v1.wav",
  "audio/reference/weapon-lance-shot-v1.wav",
  "game/backgrounds/stage-01/orbital-wreck-far-v1.png",
  "game/backgrounds/stage-01/orbital-wreck-mid-v1.png",
  "game/backgrounds/stage-01/orbital-wreck-fore-v1.png",
  "game/player/player-interceptor-v1.png",
  "game/enemies/stage-01/salvage-collector-v1.png",
  "game/enemies/stage-01/salvage-weaver-v1.png",
  "game/enemies/stage-01/wreck-bulwark-v1.png",
  "game/bosses/stage-01/wreck-warden-v1.png",
  "game/cores/reactor-core-red-v1.png",
  "game/cores/reactor-core-blue-v1.png",
  "game/cores/reactor-core-yellow-v1.png",
]);

async function listFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
  }
  return files;
}

async function makeManifest(outputDirectory) {
  const paths = (await listFiles(outputDirectory)).filter((path) => path !== "build-manifest.json");
  const files = [];
  for (const path of paths) {
    const content = await readFile(join(outputDirectory, path));
    files.push({
      path,
      bytes: content.byteLength,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  return {
    schemaVersion: 1,
    buildId: BUILD_ID,
    entrypoint: "game/public/index.html",
    files,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  };
}

export async function buildStatic(outputDirectory = DEFAULT_OUTPUT) {
  const output = resolve(outputDirectory);
  if (output === VER02_DIR || output === GAME_DIR || !output.startsWith(`${GAME_DIR}${sep}`)) {
    throw new Error(`output must be a child of ${GAME_DIR}`);
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, "game"), { recursive: true });
  await cp(join(GAME_DIR, "public"), join(output, "game", "public"), { recursive: true });
  await cp(join(GAME_DIR, "src"), join(output, "game", "src"), { recursive: true });

  for (const assetPath of ASSET_PATHS) {
    const source = join(VER02_DIR, "assets", assetPath);
    if (!(await stat(source)).isFile()) throw new Error(`missing build asset: ${assetPath}`);
    const destination = join(output, "assets", assetPath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
  }

  const manifest = await makeManifest(output);
  await writeFile(join(output, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = await buildStatic();
  console.log(`built ${manifest.buildId}: ${manifest.files.length} files, ${manifest.totalBytes} bytes`);
}
