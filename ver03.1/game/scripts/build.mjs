import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const legacyRoot = path.resolve(root, "../../ver03/game");

async function copyGame(source, target) {
  await mkdir(target, { recursive: true });
  await Promise.all([
    cp(path.join(source, "index.html"), path.join(target, "index.html")),
    cp(path.join(source, "styles.css"), path.join(target, "styles.css")),
    cp(path.join(source, "src"), path.join(target, "src"), { recursive: true }),
    cp(path.join(source, "assets"), path.join(target, "assets"), { recursive: true })
  ]);
}

await rm(dist, { recursive: true, force: true });
await copyGame(root, dist);
await Promise.all([
  copyGame(root, path.join(dist, "v3.1")),
  copyGame(legacyRoot, path.join(dist, "v3"))
]);
console.log("Built v3.1 at / and /v3.1; preserved v3 at /v3");
