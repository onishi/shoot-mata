import {
  createDefaultSaveData,
  decodeSaveData,
  encodeSaveData,
  validateSaveData,
} from "../core/save-data.mjs";

export const DEFAULT_SAVE_KEY = "shoot-mata:v02:save";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSaveRepository(options = {}) {
  const key = options.key ?? DEFAULT_SAVE_KEY;
  const recoveryKey = `${key}:recovery`;
  const getStorage = options.getStorage ?? (() => globalThis.localStorage);
  let memory = createDefaultSaveData();
  let storage = null;
  let storageAvailable = true;

  try {
    storage = getStorage();
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new TypeError("storage API is unavailable");
    }
  } catch {
    storageAvailable = false;
  }

  function persist(data) {
    memory = clone(data);
    if (!storageAvailable) return { persisted: false, warning: "storage-unavailable" };
    try {
      storage.setItem(key, encodeSaveData(data));
      return { persisted: true, warning: null };
    } catch {
      storageAvailable = false;
      return { persisted: false, warning: "storage-write-failed" };
    }
  }

  function preserveInvalid(serialized) {
    if (!storageAvailable) return false;
    try {
      if (storage.getItem(recoveryKey) === null) storage.setItem(recoveryKey, serialized);
      return true;
    } catch {
      storageAvailable = false;
      return false;
    }
  }

  return {
    load() {
      if (!storageAvailable) {
        return { data: clone(memory), source: "memory", warning: "storage-unavailable" };
      }

      let serialized;
      try {
        serialized = storage.getItem(key);
      } catch {
        storageAvailable = false;
        return { data: clone(memory), source: "memory", warning: "storage-read-failed" };
      }
      if (serialized === null) {
        memory = createDefaultSaveData();
        return { data: clone(memory), source: "default", warning: null };
      }

      const decoded = decodeSaveData(serialized);
      if (!decoded.ok) {
        preserveInvalid(serialized);
        memory = createDefaultSaveData();
        return { data: clone(memory), source: "default", warning: decoded.reason };
      }

      memory = clone(decoded.data);
      if (!decoded.migrated) return { data: clone(memory), source: "storage", warning: null };
      const migrationWrite = persist(memory);
      return {
        data: clone(memory),
        source: "migrated",
        warning: migrationWrite.persisted ? null : migrationWrite.warning,
      };
    },

    save(data) {
      if (!validateSaveData(data)) throw new TypeError("invalid save data");
      return persist(data);
    },

    reset(options = {}) {
      if (options.confirmed !== true) throw new Error("save reset requires confirmation");
      const data = createDefaultSaveData();
      return { data: clone(data), ...persist(data) };
    },

    getSnapshot() {
      return clone(memory);
    },
  };
}
