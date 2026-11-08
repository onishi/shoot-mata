import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const distRoot = resolve(import.meta.dirname, "..", "dist");
const currentRoutes = [".", "v12.2"];
const preservedRoutes = ["v5", "v4.2", "v4.1", "v4.0", "v3.4", "v3.3", "v3.2", "v3.1", "v3"];

for (const route of [...currentRoutes, ...preservedRoutes]) {
  const index = await readFile(resolve(distRoot, route, "index.html"), "utf8");
  if (!index.includes("<title>")) throw new Error(`${route} has no document title`);
}

for (const route of currentRoutes) {
  const root = resolve(distRoot, route);
  const index = await readFile(resolve(root, "index.html"), "utf8");
  if (!index.includes("<title>LODESTAR FORGE</title>")) throw new Error(`${route} does not identify LODESTAR FORGE`);
  const metadata = JSON.parse(await readFile(resolve(root, "release.json"), "utf8"));
  if (metadata.product !== "LODESTAR FORGE" || metadata.version !== "v12.2" || !metadata.commit) {
    throw new Error(`${route} has invalid release metadata`);
  }
}

const v5 = await readFile(resolve(distRoot, "v5/index.html"), "utf8");
if (!v5.includes("CHORUS SHIFT")) throw new Error("/v5/ does not preserve the previous published product");

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const allowedExtensions = new Set([".html", ".js", ".css", ".json", ""]);
const currentFiles = await walk(resolve(distRoot, "v12.2"));
for (const file of currentFiles) {
  if (!allowedExtensions.has(extname(file))) throw new Error(`unexpected production asset type: ${file}`);
  if (![".html", ".js", ".css"].includes(extname(file))) continue;
  const content = await readFile(file, "utf8");
  const external = content.match(/(?:https?:)?\/\/[^\s\"'`)]+/g) ?? [];
  const nonNamespaceUrls = external.filter((url) => !url.includes("www.w3.org/2000/svg"));
  if (nonNamespaceUrls.length > 0) throw new Error(`external runtime URL in ${file}: ${nonNamespaceUrls.join(", ")}`);
}

const assetDirectory = await stat(resolve(distRoot, "v12.2/assets"));
if (!assetDirectory.isDirectory()) throw new Error("/v12.2/assets is not a directory");
const totalBytes = (await Promise.all(currentFiles.map(async (file) => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
if (totalBytes > 1_000_000) throw new Error(`v12.2 payload exceeds 1 MB: ${totalBytes} bytes`);

console.log(`Release artifact verified: /, /v12.2/, ${preservedRoutes.map((route) => `/${route}/`).join(", ")}; v12.2 payload ${totalBytes} bytes; no external runtime URLs`);
