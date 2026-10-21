import test from "node:test";
import assert from "node:assert/strict";
import { AUDIO_ASSETS, loadBrowserAudioAssets } from "../../src/browser/audio-assets.mjs";

test("AV-06/REL-02: 音声assetは相対URLだけを使い、欠落しても残りを読み込む", async () => {
  assert.ok(AUDIO_ASSETS.every(({ url }) => url.startsWith("../../assets/") && !url.includes("://")));
  const loaded = [];
  const audio = {
    async loadSound(id, group, encoded) {
      loaded.push({ id, group, bytes: encoded.byteLength });
      return { loaded: true, warning: null };
    },
  };
  const results = await loadBrowserAudioAssets(audio, {
    fetchResource: async (url) => url.includes("ui-confirm")
      ? { ok: false, status: 404 }
      : { ok: true, async arrayBuffer() { return new ArrayBuffer(4); } },
  });

  assert.equal(results.length, AUDIO_ASSETS.length);
  assert.equal(results.find(({ id }) => id === "audio-ref-ui-confirm").warning, "audio-source-load-failed");
  assert.equal(loaded.length, AUDIO_ASSETS.length - 1);
});
