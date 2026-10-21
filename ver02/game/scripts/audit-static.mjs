import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(SCRIPT_DIR, "..", "dist");
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".css", ".html", ".json", ".mjs", ".png", ".wav"]);

const manifest = JSON.parse(await readFile(resolve(DIST_DIR, "build-manifest.json"), "utf8"));
const failures = [];

if (manifest.totalBytes > MAX_TOTAL_BYTES) {
  failures.push(`artifact is ${manifest.totalBytes} bytes; budget is ${MAX_TOTAL_BYTES}`);
}

for (const file of manifest.files) {
  const path = resolve(DIST_DIR, file.path);
  const actual = await stat(path);
  if (actual.size !== file.bytes) failures.push(`${file.path}: size differs from manifest`);
  const content = await readFile(path);
  const sha256 = createHash("sha256").update(content).digest("hex");
  if (sha256 !== file.sha256) failures.push(`${file.path}: sha256 differs from manifest`);
  if (!ALLOWED_EXTENSIONS.has(extname(file.path))) failures.push(`${file.path}: unexpected file type`);
  if ([".css", ".html", ".mjs"].includes(extname(file.path))) {
    const source = content.toString("utf8");
    if (/\b(?:https?:)?\/\//i.test(source)) failures.push(`${file.path}: external URL found`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`static audit passed: ${manifest.files.length} files, ${manifest.totalBytes} / ${MAX_TOTAL_BYTES} bytes, external URLs 0`);
}
