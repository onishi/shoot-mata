import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonWithUniqueKeys } from "../../scripts/strict-json.mjs";

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
