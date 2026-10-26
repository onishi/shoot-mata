import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { auditProductionArtifact } from "../../scripts/production-artifact-audit-lib.mjs";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fixture() {
  const file = Buffer.from("accepted artifact");
  const manifest = Buffer.from(`${JSON.stringify({
    schemaVersion: 1,
    buildId: "accepted-build",
    entrypoint: "game/public/index.html",
    files: [{ path: "game/public/index.html", bytes: file.byteLength, sha256: digest(file) }],
    totalBytes: file.byteLength,
  }, null, 2)}\n`);
  const responses = new Map([
    ["https://example.test/base/build-manifest.json", manifest],
    ["https://example.test/base/game/public/index.html", file],
  ]);
  const fetchImplementation = async (url) => {
    const body = responses.get(url);
    return body
      ? new Response(body, { status: 200 })
      : new Response("missing", { status: 404 });
  };
  return {
    manifest,
    file,
    responses,
    fetchImplementation,
    expectedCandidate: {
      buildId: "accepted-build",
      manifestSha256: digest(manifest),
      fileCount: 1,
      totalBytes: file.byteLength,
    },
  };
}

test("Phase 11 production audit accepts the exact release candidate and every file hash", async () => {
  const data = fixture();
  const result = await auditProductionArtifact({
    baseUrl: "https://example.test/base/",
    expectedCandidate: data.expectedCandidate,
    fetchImplementation: data.fetchImplementation,
  });
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.checkedFiles, 1);
});

test("Phase 11 production audit rejects a changed deployed file", async () => {
  const data = fixture();
  data.responses.set("https://example.test/base/game/public/index.html", Buffer.from("changed artifact"));
  const result = await auditProductionArtifact({
    baseUrl: "https://example.test/base/",
    expectedCandidate: data.expectedCandidate,
    fetchImplementation: data.fetchImplementation,
  });
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /byte count differs|SHA-256 differs/);
});

test("Phase 11 production audit CLI imports the exported strict JSON parser", async () => {
  const [entrypoint, strictJson] = await Promise.all([
    readFile(new URL("../../scripts/audit-production-artifact.mjs", import.meta.url), "utf8"),
    import("../../scripts/strict-json.mjs"),
  ]);
  const importedName = entrypoint.match(/import \{ ([A-Za-z0-9_$]+) \} from "\.\/strict-json\.mjs";/)?.[1];
  assert.ok(importedName, "production audit CLI must import a named strict JSON parser");
  assert.equal(typeof strictJson[importedName], "function", `${importedName} must be exported by strict-json.mjs`);
});

test("Phase 11 deployment remains manual, confirms the target, and pins the rollback source", async () => {
  const workflow = await readFile(new URL("../../../../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(workflow, /test "\$SELECTED_RELEASE" = "\$CONFIRMATION"/);
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /path: ver02\/game\/dist/);
  assert.match(workflow, /ref: 9abf0248aa5b8e97749a2e2c380d9ad3e3b69b28/);
  assert.match(workflow, /path: phase-11-01\/dist/);
  assert.match(workflow, /cancel-in-progress: false/);
});
