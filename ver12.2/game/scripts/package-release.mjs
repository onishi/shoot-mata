import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(gameRoot, "../..");
const distRoot = resolve(gameRoot, "dist");
const previousReleaseRoot = resolve(repositoryRoot, "ver05.1/game/dist");
const snapshotRoot = await mkdtemp(resolve(tmpdir(), "lodestar-forge-release-"));
const preservedRoutes = ["v5", "v4.2", "v4.1", "v4.0", "v3.4", "v3.3", "v3.2", "v3.1", "v3"];

function currentCommit() {
  if (process.env.RELEASE_COMMIT) return process.env.RELEASE_COMMIT;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function requireFile(path, description) {
  try {
    await readFile(path);
  } catch {
    throw new Error(`${description} is missing: ${path}`);
  }
}

await requireFile(resolve(distRoot, "index.html"), "v12.2 production build");
for (const route of preservedRoutes) {
  await requireFile(resolve(previousReleaseRoot, route, "index.html"), `preserved ${route} build`);
}

try {
  await cp(distRoot, snapshotRoot, { recursive: true });
  await cp(snapshotRoot, resolve(distRoot, "v12.2"), { recursive: true });
  for (const route of preservedRoutes) {
    await cp(resolve(previousReleaseRoot, route), resolve(distRoot, route), { recursive: true });
  }

  const metadata = `${JSON.stringify({
    product: "LODESTAR FORGE",
    version: "v12.2",
    commit: currentCommit()
  }, null, 2)}\n`;
  await Promise.all([
    writeFile(resolve(distRoot, "release.json"), metadata),
    writeFile(resolve(distRoot, "v12.2/release.json"), metadata),
    writeFile(resolve(distRoot, ".nojekyll"), "")
  ]);
} finally {
  await rm(snapshotRoot, { recursive: true, force: true });
}

console.log(`Packaged v12.2 at / and /v12.2/; preserved ${preservedRoutes.map((route) => `/${route}/`).join(", ")}`);
