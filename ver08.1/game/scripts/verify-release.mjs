import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = resolve(gameRoot, "../release/duskloom-v8.1");
const manifest = JSON.parse(await readFile(join(artifactRoot, "manifest.json"), "utf8"));

if (manifest.product !== "DUSKLOOM" || manifest.version !== "8.1") {
  throw new Error("Release manifest identifies the wrong product or version.");
}

for (const [relativePath, expected] of Object.entries(manifest.files)) {
  const contents = await readFile(join(artifactRoot, relativePath));
  const sha256 = createHash("sha256").update(contents).digest("hex");
  if (contents.byteLength !== expected.bytes || sha256 !== expected.sha256) {
    throw new Error(`Release file failed integrity check: ${relativePath}`);
  }
}

const index = await readFile(join(artifactRoot, "index.html"), "utf8");
for (const match of index.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const reference = match[1].replace(/^\.\//, "").replace(/^\//, "");
  if (reference && !reference.includes(":") && !reference.startsWith("#")) {
    await access(join(artifactRoot, reference));
  }
}

const topLevel = await readdir(artifactRoot);
for (const required of ["assets", "favicon.svg", "index.html", "manifest.json", "README.txt"]) {
  if (!topLevel.includes(required)) throw new Error(`Release artifact is missing ${required}.`);
}

console.log(`Verified ${Object.keys(manifest.files).length} release files and all index references.`);
