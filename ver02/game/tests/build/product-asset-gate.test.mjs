import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AUDIO_ASSETS } from "../../src/browser/audio-assets.mjs";
import { GAME_ASSETS, assetIdsForStage } from "../../src/content/asset-manifest.mjs";
import { STAGE_01_ORBITAL_WRECK } from "../../src/content/stages/stage-01-orbital-wreck.mjs";
import { STAGE_02_CLOUD_REFINERY } from "../../src/content/stages/stage-02-cloud-refinery.mjs";
import { STAGE_03_LIVING_ARK } from "../../src/content/stages/stage-03-living-ark.mjs";
import { STAGE_04_STELLAR_FURNACE } from "../../src/content/stages/stage-04-stellar-furnace.mjs";
import { DELIVERY_ASSETS } from "../../scripts/delivery-asset-config.mjs";
import { buildStatic } from "../../scripts/build-static.mjs";

const GAME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VER02_DIR = resolve(GAME_DIR, "..");
const ASSET_DIR = resolve(VER02_DIR, "assets");
const STAGES = [
  STAGE_01_ORBITAL_WRECK,
  STAGE_02_CLOUD_REFINERY,
  STAGE_03_LIVING_ARK,
  STAGE_04_STELLAR_FURNACE,
];
const DISALLOWED_STATUS = /(?:placeholder|planned|draft)/i;

const unique = (values) => [...new Set(values)].sort();
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const imagePathFromUrl = (url) => url.replace("../../assets/delivery/", "");
const audioPathFromUrl = (url) => url.replace("../../assets/", "");

test("AV-01/03/05: 4面の製品経路はfinal素材だけを完全参照する", () => {
  const serializedProductPath = JSON.stringify({ STAGES, GAME_ASSETS, AUDIO_ASSETS });
  assert.doesNotMatch(serializedProductPath, DISALLOWED_STATUS);

  const stageImageIds = unique(STAGES.flatMap(assetIdsForStage));
  const requiredImageIds = unique([
    ...stageImageIds,
    "player-interceptor",
    "core-red",
    "core-blue",
    "core-yellow",
  ]);
  for (const id of requiredImageIds) assert.ok(GAME_ASSETS[id], `missing Canvas asset ${id}`);

  const stageAudioIds = unique(STAGES.flatMap((stage) => [
    ...stage.audio.stageLayerAssetIds,
    ...stage.audio.bossLayerAssetIds,
    stage.audio.introAssetId,
    stage.audio.clearAssetId,
  ]));
  const audioIds = new Set(AUDIO_ASSETS.map(({ id }) => id));
  for (const id of stageAudioIds) assert.ok(audioIds.has(id), `missing audio asset ${id}`);
});

test("AV-01/05/07: runtime manifestと配信台帳、原本、生成証拠、権利状態が一致する", async () => {
  const runtimeImages = unique(Object.values(GAME_ASSETS).map(imagePathFromUrl));
  const runtimeAudio = unique(AUDIO_ASSETS.map(({ url }) => audioPathFromUrl(url)));
  const deliveredImages = unique(DELIVERY_ASSETS.filter(({ kind }) => kind === "webp").map(({ deliveryPath }) => deliveryPath));
  const deliveredAudio = unique(DELIVERY_ASSETS.filter(({ kind }) => kind === "copy").map(({ deliveryPath }) => deliveryPath));
  assert.deepEqual(runtimeImages, deliveredImages);
  assert.deepEqual(runtimeAudio, deliveredAudio);

  const optimizationAudit = JSON.parse(await readFile(resolve(ASSET_DIR, "delivery", "asset-optimization-audit.json"), "utf8"));
  assert.deepEqual(unique(optimizationAudit.images.map(({ deliveryPath }) => deliveryPath)), deliveredImages);

  const audioManifests = new Map();
  for (const asset of DELIVERY_ASSETS) {
    assert.equal(asset.status, "final", `${asset.deliveryPath}: non-final status`);
    assert.doesNotMatch(JSON.stringify(asset), DISALLOWED_STATUS);
    assert.equal(asset.reviewedOn, "2026-10-24");
    await access(resolve(ASSET_DIR, asset.sourcePath));

    if (asset.kind === "webp") {
      assert.equal(asset.origin, "openai-image-generation");
      assert.match(asset.rights, /^output-owned-by-user/);
      assert.match(asset.termsUrl, /^https:\/\/openai\.com\/policies\/terms-of-use\/$/);
      await access(resolve(ASSET_DIR, asset.promptPath));
      await access(resolve(ASSET_DIR, "delivery", asset.deliveryPath));
      continue;
    }

    assert.equal(asset.origin, "project-authored-deterministic-synthesis");
    assert.equal(asset.rights, "project-authored; no third-party samples");
    if (!audioManifests.has(asset.manifestPath)) {
      audioManifests.set(asset.manifestPath, JSON.parse(await readFile(resolve(ASSET_DIR, asset.manifestPath), "utf8")));
    }
    const content = await readFile(resolve(ASSET_DIR, asset.sourcePath));
    const entry = audioManifests.get(asset.manifestPath).find(({ file }) => asset.sourcePath.endsWith(`/${file}`));
    assert.ok(entry, `${asset.sourcePath}: missing audio manifest entry`);
    assert.equal(entry.bytes, content.byteLength);
    assert.equal(entry.sha256, sha256(content));
    assert.equal(entry.rights, asset.rights);
  }
});

test("REL-01/02: 配布物に権利情報を同梱し外部runtime依存を持たない", async (context) => {
  const output = resolve(GAME_DIR, ".test-rights-dist");
  context.after(() => rm(output, { recursive: true, force: true }));
  const manifest = await buildStatic(output);
  const noticePath = "game/public/THIRD_PARTY_NOTICES.html";
  const notice = await readFile(resolve(output, noticePath), "utf8");
  const packageJson = JSON.parse(await readFile(resolve(GAME_DIR, "package.json"), "utf8"));
  assert.ok(manifest.files.some(({ path }) => path === noticePath));
  assert.match(notice, /外部音源、サンプル、録音素材は使用していません/);
  assert.match(notice, /生成物は一意とは限らず/);
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  assert.deepEqual(packageJson.devDependencies ?? {}, {});
});
