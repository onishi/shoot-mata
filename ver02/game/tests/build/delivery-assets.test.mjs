import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ASSET_BUDGETS, DELIVERY_ASSETS } from "../../scripts/delivery-asset-config.mjs";

const GAME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DELIVERY_ROOT = resolve(GAME_DIR, "..", "assets", "delivery");

test("Phase 07 delivery images preserve alpha and stay within measured quality and size budgets", async () => {
  const audit = JSON.parse(await readFile(resolve(DELIVERY_ROOT, "asset-optimization-audit.json"), "utf8"));
  assert.equal(audit.schemaVersion, 1);
  assert.deepEqual(audit.budgets, ASSET_BUDGETS);
  assert.equal(audit.images.length, DELIVERY_ASSETS.filter(({ kind }) => kind === "webp").length);

  const actualGroupBytes = { "stage-01": 0, shared: 0 };
  for (const image of audit.images) {
    const path = resolve(DELIVERY_ROOT, image.deliveryPath);
    const content = await readFile(path);
    assert.equal((await stat(path)).size, image.bytes);
    assert.equal(createHash("sha256").update(content).digest("hex"), image.sha256);
    assert.ok(image.rgbPsnrDb >= audit.qualityFloor.rgbPsnrDb, `${image.deliveryPath}: RGB PSNR`);
    assert.equal(image.maximumAlphaError, audit.qualityFloor.maximumAlphaError, `${image.deliveryPath}: alpha`);
    actualGroupBytes[image.group] += image.bytes;
  }
  assert.deepEqual(audit.groupImageBytes, actualGroupBytes);
  assert.ok(actualGroupBytes["stage-01"] <= ASSET_BUDGETS["stage-01"]);
  assert.ok(actualGroupBytes.shared <= ASSET_BUDGETS.shared);
});
