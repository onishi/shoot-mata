import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ASSET_BUDGETS, DELIVERY_ASSETS } from "./delivery-asset-config.mjs";

export const BUILD_ID = "phase07-delivery-assets-20261022";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(SCRIPT_DIR, "..");
const VER02_DIR = resolve(GAME_DIR, "..");
const DEFAULT_OUTPUT = resolve(GAME_DIR, "dist");

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

  const groupBytes = {};
  for (const asset of DELIVERY_ASSETS) {
    const source = asset.kind === "webp"
      ? join(VER02_DIR, "assets", "delivery", asset.deliveryPath)
      : join(VER02_DIR, "assets", asset.sourcePath);
    if (!(await stat(source)).isFile()) throw new Error(`missing build asset: ${asset.deliveryPath}`);
    const destination = asset.kind === "webp"
      ? join(output, "assets", "delivery", asset.deliveryPath)
      : join(output, "assets", asset.deliveryPath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination);
    groupBytes[asset.group] = (groupBytes[asset.group] ?? 0) + (await stat(source)).size;
  }
  for (const [group, bytes] of Object.entries(groupBytes)) {
    if (bytes > ASSET_BUDGETS[group]) {
      throw new Error(`${group} assets are ${bytes} bytes; budget is ${ASSET_BUDGETS[group]}`);
    }
  }

  const manifest = await makeManifest(output);
  if (manifest.totalBytes > ASSET_BUDGETS.build) {
    throw new Error(`build is ${manifest.totalBytes} bytes; budget is ${ASSET_BUDGETS.build}`);
  }
  await writeFile(join(output, "build-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = await buildStatic();
  console.log(`built ${manifest.buildId}: ${manifest.files.length} files, ${manifest.totalBytes} bytes`);
}
