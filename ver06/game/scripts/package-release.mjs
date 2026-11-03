import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(gameDirectory, "dist");
const releaseDirectory = resolve(gameDirectory, "../release/ripplekeep-v6.0");

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else files.push(path);
  }
  return files;
}

await rm(releaseDirectory, { recursive: true, force: true });
await mkdir(releaseDirectory, { recursive: true });
await cp(sourceDirectory, releaseDirectory, { recursive: true });
await writeFile(join(releaseDirectory, "README.txt"), [
  "RIPPLEKEEP v6.0 production artifact",
  "",
  "Serve this directory from an HTTP server and open index.html.",
  "The game makes no external runtime requests.",
  ""
].join("\n"));

const files = await filesBelow(releaseDirectory);
const manifest = {};
for (const file of files) {
  const data = await readFile(file);
  manifest[relative(releaseDirectory, file)] = {
    bytes: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex")
  };
}
await writeFile(join(releaseDirectory, "manifest.json"), `${JSON.stringify({ product: "RIPPLEKEEP", version: "6.0", files: manifest }, null, 2)}\n`);
