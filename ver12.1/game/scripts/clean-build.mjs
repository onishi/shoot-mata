import { createHash } from "node:crypto";
import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
const evidence = new URL("../../docs/evidence/m4-release-manifest.json", import.meta.url);

await rm(dist, { recursive: true, force: true });
const vite = new URL("../node_modules/vite/bin/vite.js", import.meta.url);
const build = spawnSync(process.execPath, [vite.pathname, "build"], {
  cwd: root,
  stdio: "inherit"
});
if (build.status !== 0) process.exit(build.status ?? 1);

async function filesBelow(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) files.push(...await filesBelow(url, relative));
    else files.push({ relative, url });
  }
  return files;
}

const files = [];
for (const file of await filesBelow(dist)) {
  const contents = await readFile(file.url);
  const details = await stat(file.url);
  files.push({
    path: file.relative,
    bytes: details.size,
    sha256: createHash("sha256").update(contents).digest("hex")
  });
}
if (!files.some((file) => file.path === "index.html")) throw new Error("clean build did not create index.html");

const manifest = {
  version: "v12.1",
  buildCommand: "npm run build:clean",
  cleanBuild: true,
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  files
};
await writeFile(evidence, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Recorded ${files.length} files (${manifest.totalBytes} bytes) in ${evidence.pathname}`);
