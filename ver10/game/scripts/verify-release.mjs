import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = resolve(gameRoot, "..", "release", "signal-garden-v10.0");
const required = ["README.txt", "SHA256SUMS.txt", "index.html"];

for (const name of required) await access(resolve(releaseRoot, name));
const html = await readFile(resolve(releaseRoot, "index.html"), "utf8");
if (!html.includes("<title>SIGNAL GARDEN</title>")) throw new Error("Release title is missing.");
if (!html.match(/\.\/assets\/index-[^"']+\.js/)) throw new Error("Hashed JavaScript bundle is missing or is not local.");
if (!html.match(/\.\/assets\/index-[^"']+\.css/)) throw new Error("Hashed stylesheet is missing or is not local.");
if (/\b(?:src|href)=["'](?:https?:)?\/\//i.test(html)) throw new Error("Release HTML contains a remote dependency.");

const assets = await readdir(resolve(releaseRoot, "assets"));
if (!assets.some((name) => extname(name) === ".js")) throw new Error("No JavaScript asset found.");
if (!assets.some((name) => extname(name) === ".css")) throw new Error("No CSS asset found.");

const manifest = (await readFile(resolve(releaseRoot, "SHA256SUMS.txt"), "utf8")).trim().split("\n");
for (const line of manifest) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error(`Invalid manifest line: ${line}`);
  const data = await readFile(resolve(releaseRoot, match[2]));
  const actual = createHash("sha256").update(data).digest("hex");
  if (actual !== match[1]) throw new Error(`Checksum mismatch: ${match[2]}`);
}

async function totalBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    total += entry.isDirectory() ? await totalBytes(path) : (await stat(path)).size;
  }
  return total;
}

const bytes = await totalBytes(releaseRoot);
if (bytes > 500_000) throw new Error(`Release exceeds 500 KB: ${bytes} bytes.`);
console.log(`Release verified: ${manifest.length + 1} files, ${bytes} bytes, all checksums valid`);
