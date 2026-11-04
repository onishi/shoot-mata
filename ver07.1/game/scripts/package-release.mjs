import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const builtGame = join(gameRoot, "dist");
const artifactRoot = resolve(gameRoot, "../release/palimpsest-post-v7.1");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(entryPath));
    else result.push(entryPath);
  }
  return result;
}

await rm(artifactRoot, { force: true, recursive: true });
await mkdir(artifactRoot, { recursive: true });
await cp(builtGame, artifactRoot, { recursive: true });
await writeFile(join(artifactRoot, "README.txt"), [
  "PALIMPSEST POST v7.1 production artifact",
  "",
  "Serve this directory over HTTP, then open index.html in Google Chrome.",
  "Keyboard required: arrows/WASD move, Space waits, Enter files an echo, Z undoes, Escape pauses.",
  "No network service or external runtime asset is required.",
  "",
].join("\n"));

const manifestFiles = {};
for (const filePath of await listFiles(artifactRoot)) {
  const contents = await readFile(filePath);
  manifestFiles[relative(artifactRoot, filePath)] = {
    bytes: contents.byteLength,
    sha256: createHash("sha256").update(contents).digest("hex"),
  };
}

await writeFile(join(artifactRoot, "manifest.json"), `${JSON.stringify({
  product: "PALIMPSEST POST",
  version: "7.1",
  files: manifestFiles,
}, null, 2)}\n`);
