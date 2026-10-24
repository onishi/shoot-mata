import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildStatic, BUILD_ID } from "../../scripts/build-static.mjs";

const GAME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = resolve(GAME_DIR, ".rc-test-dist");
const candidateUrl = new URL("../../../phases/phase-10/release-candidate.json", import.meta.url);

test("Phase 10 release candidate identity matches a fresh reproducible build", async (context) => {
  context.after(() => rm(OUTPUT, { recursive: true, force: true }));
  const candidate = JSON.parse(await readFile(candidateUrl, "utf8"));
  const manifest = await buildStatic(OUTPUT);
  const manifestBytes = await readFile(resolve(OUTPUT, "build-manifest.json"));
  const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");

  assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.buildId, BUILD_ID);
  assert.equal(manifest.buildId, candidate.buildId);
  assert.equal(manifest.files.length, candidate.manifest.fileCount);
  assert.equal(manifest.totalBytes, candidate.manifest.totalBytes);
  assert.ok(manifest.totalBytes <= candidate.manifest.budgetBytes);
  assert.equal(manifestSha256, candidate.manifest.sha256);
  assert.equal(candidate.status, "candidate");
  assert.equal(candidate.accepted, false);
});
