import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseJsonWithUniqueKeys } from "../../scripts/strict-json.mjs";

const scriptsUrl = new URL("../../scripts/", import.meta.url);

test("Phase 10 evidence JSON rejects duplicate object keys", () => {
  assert.throws(
    () => parseJsonWithUniqueKeys('{"target":{"platform":"iOS","platform":"Android"}}', "fixture.json"),
    /fixture\.json: duplicate key "platform" at \$\.target\.platform/,
  );
});

test("Phase 10 evidence JSON treats escaped equivalent keys as duplicates", () => {
  assert.throws(
    () => parseJsonWithUniqueKeys('{"platform":"iOS","plat\\u0066orm":"Android"}', "fixture.json"),
    /duplicate key "platform"/,
  );
});

test("Phase 10 evidence JSON accepts repeated names in separate objects", () => {
  assert.deepEqual(
    parseJsonWithUniqueKeys('{"targets":[{"status":"pass"},{"status":"not-run"}]}'),
    { targets: [{ status: "pass" }, { status: "not-run" }] },
  );
});

test("all direct Phase 10 audit JSON entry points use the duplicate-key rejecting parser", async () => {
  for (const script of ["audit-acceptance-evidence.mjs", "audit-final-acceptance.mjs", "audit-static.mjs"]) {
    const source = await readFile(new URL(script, scriptsUrl), "utf8");
    assert.match(source, /parseJsonWithUniqueKeys/);
    assert.doesNotMatch(source, /JSON\.parse\s*\(/);
  }
});
