import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = resolve(gameRoot, "..", "release", "gale-thread-v11.0");

for (const file of ["index.html", "README.txt", "SHA256SUMS.txt"]) {
  await access(resolve(releaseRoot, file));
}

const html = await readFile(resolve(releaseRoot, "index.html"), "utf8");
if (!html.includes("<title>GALE THREAD</title>")) throw new Error("Release title is missing.");
if (!html.match(/\.\/assets\/index-[^"']+\.js/)) throw new Error("Local hashed JavaScript bundle is missing.");
if (!html.match(/\.\/assets\/index-[^"']+\.css/)) throw new Error("Local hashed stylesheet is missing.");
if (/\b(?:src|href)=["'](?:https?:)?\/\//i.test(html)) throw new Error("Release HTML has a remote runtime dependency.");

const assets = await readdir(resolve(releaseRoot, "assets"));
if (!assets.some((name) => extname(name) === ".js")) throw new Error("JavaScript asset is missing.");
if (!assets.some((name) => extname(name) === ".css")) throw new Error("CSS asset is missing.");

const manifest = (await readFile(resolve(releaseRoot, "SHA256SUMS.txt"), "utf8")).trim().split("\n");
for (const line of manifest) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error(`Malformed checksum entry: ${line}`);
  const digest = createHash("sha256").update(await readFile(resolve(releaseRoot, match[2]))).digest("hex");
  if (digest !== match[1]) throw new Error(`Checksum mismatch: ${match[2]}`);
}

async function directoryBytes(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    bytes += entry.isDirectory() ? await directoryBytes(path) : (await stat(path)).size;
  }
  return bytes;
}

const bytes = await directoryBytes(releaseRoot);
if (bytes > 500_000) throw new Error(`Release exceeds 500 KB: ${bytes} bytes.`);
console.log(`Release verified: ${manifest.length + 1} files, ${bytes} bytes, all checksums valid`);
