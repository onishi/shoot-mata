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

test("AV-05: 第2面の3音楽層と導入・クリア通知を製品loaderへ登録する", () => {
  const stage02 = AUDIO_ASSETS.filter(({ id }) => id.startsWith("audio-stg02-"));
  assert.deepEqual(stage02.map(({ id }) => id), [
    "audio-stg02-rhythm",
    "audio-stg02-melody",
    "audio-stg02-danger",
    "audio-stg02-intro",
    "audio-stg02-clear",
  ]);
  assert.deepEqual(stage02.map(({ group }) => group), ["bgm", "bgm", "bgm", "sfx", "sfx"]);
});

test("AV-05: 第3面の3音楽層と導入・クリア通知を製品loaderへ登録する", () => {
  const stage03 = AUDIO_ASSETS.filter(({ id }) => id.startsWith("audio-stg03-"));
  assert.deepEqual(stage03.map(({ id }) => id), [
    "audio-stg03-rhythm",
    "audio-stg03-melody",
    "audio-stg03-danger",
    "audio-stg03-intro",
    "audio-stg03-clear",
  ]);
  assert.deepEqual(stage03.map(({ group }) => group), ["bgm", "bgm", "bgm", "sfx", "sfx"]);
});

test("AV-05: 第4面の3音楽層と導入・クリア通知を製品loaderへ登録する", () => {
  const stage04 = AUDIO_ASSETS.filter(({ id }) => id.startsWith("audio-stg04-"));
  assert.deepEqual(stage04.map(({ id }) => id), [
    "audio-stg04-rhythm",
    "audio-stg04-melody",
    "audio-stg04-danger",
    "audio-stg04-intro",
    "audio-stg04-clear",
  ]);
  assert.deepEqual(stage04.map(({ group }) => group), ["bgm", "bgm", "bgm", "sfx", "sfx"]);
});
