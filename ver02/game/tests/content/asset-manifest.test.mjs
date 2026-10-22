import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { GAME_ASSETS } from "../../src/content/asset-manifest.mjs";

test("AV-01/TECH-06: Canvas manifestの全素材が同一repository内に存在する", async () => {
  assert.equal(Object.keys(GAME_ASSETS).length, 26);
  for (const [id, relativeUrl] of Object.entries(GAME_ASSETS)) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!relativeUrl.startsWith("http"), `${id} must not use external communication`);
    assert.match(relativeUrl, /\.webp$/, `${id} must use a delivery WebP`);
    const assetUrl = new URL(`../../public/${relativeUrl}`, import.meta.url);
    await access(fileURLToPath(assetUrl));
  }
});
