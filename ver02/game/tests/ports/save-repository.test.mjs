import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultSaveData, updateSettings } from "../../src/core/save-data.mjs";
import { createSaveRepository, DEFAULT_SAVE_KEY } from "../../src/ports/save-repository.mjs";

function createStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) { entries.set(key, value); },
  };
}

test("PROG-04: 正常なローカル保存を別repositoryから復元する", () => {
  const storage = createStorage();
  const writer = createSaveRepository({ getStorage: () => storage });
  const data = updateSettings(createDefaultSaveData(), { difficulty: "assist" });
  assert.deepEqual(writer.save(data), { persisted: true, warning: null });

  const reader = createSaveRepository({ getStorage: () => storage });
  const loaded = reader.load();
  assert.equal(loaded.source, "storage");
  assert.equal(loaded.warning, null);
  assert.deepEqual(loaded.data, data);
});

test("PROG-05: storage取得・読込・書込失敗時もメモリ内で開始・継続する", () => {
  const unavailable = createSaveRepository({ getStorage: () => { throw new Error("denied"); } });
  assert.equal(unavailable.load().warning, "storage-unavailable");
  const changed = updateSettings(unavailable.getSnapshot(), { bgmMuted: true });
  assert.deepEqual(unavailable.save(changed), { persisted: false, warning: "storage-unavailable" });
  assert.equal(unavailable.getSnapshot().settings.bgmMuted, true);

  const readFailure = createSaveRepository({
    getStorage: () => ({ getItem() { throw new Error("denied"); }, setItem() {} }),
  });
  assert.equal(readFailure.load().warning, "storage-read-failed");

  const writeFailure = createSaveRepository({
    getStorage: () => ({ getItem() { return null; }, setItem() { throw new Error("full"); } }),
  });
  const writeResult = writeFailure.save(changed);
  assert.deepEqual(writeResult, { persisted: false, warning: "storage-write-failed" });
  assert.equal(writeFailure.getSnapshot().settings.bgmMuted, true);
});

test("PROG-05: 破損値を上書きせずrecoveryへ退避して初期値で開始する", () => {
  const storage = createStorage({ [DEFAULT_SAVE_KEY]: "broken-json" });
  const repository = createSaveRepository({ getStorage: () => storage });
  const loaded = repository.load();

  assert.equal(loaded.source, "default");
  assert.equal(loaded.warning, "invalid-json");
  assert.deepEqual(loaded.data, createDefaultSaveData());
  assert.equal(storage.entries.get(DEFAULT_SAVE_KEY), "broken-json");
  assert.equal(storage.entries.get(`${DEFAULT_SAVE_KEY}:recovery`), "broken-json");
});

test("PROG-05: 旧versionを移行して現versionとして書き戻す", () => {
  const legacy = JSON.stringify({
    version: 0,
    tutorialSeen: true,
    unlockedStage: 1,
    settings: { difficulty: "assist" },
  });
  const storage = createStorage({ [DEFAULT_SAVE_KEY]: legacy });
  const repository = createSaveRepository({ getStorage: () => storage });
  const loaded = repository.load();

  assert.equal(loaded.source, "migrated");
  assert.equal(loaded.warning, null);
  assert.equal(loaded.data.version, 1);
  assert.equal(JSON.parse(storage.entries.get(DEFAULT_SAVE_KEY)).version, 1);
});

test("PROG-05: 初期化は明示確認なしでは拒否し、確認後だけ永続化する", () => {
  const storage = createStorage();
  const repository = createSaveRepository({ getStorage: () => storage });
  repository.save(updateSettings(createDefaultSaveData(), { sfxMuted: true }));

  assert.throws(() => repository.reset(), /requires confirmation/);
  assert.equal(repository.getSnapshot().settings.sfxMuted, true);
  const reset = repository.reset({ confirmed: true });
  assert.equal(reset.persisted, true);
  assert.deepEqual(reset.data, createDefaultSaveData());
  assert.deepEqual(repository.getSnapshot(), createDefaultSaveData());
});

test("REL-03: 保存済み値は外部通信なしのstorage境界だけで復元される", () => {
  const storage = createStorage();
  const repository = createSaveRepository({ getStorage: () => storage });
  const data = updateSettings(createDefaultSaveData(), { highContrast: true });
  repository.save(data);
  assert.equal(repository.load().data.settings.highContrast, true);
  assert.deepEqual([...storage.entries.keys()], [DEFAULT_SAVE_KEY]);
});
