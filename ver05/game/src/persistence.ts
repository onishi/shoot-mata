export const SAVE_KEY = 'chorus-shift:v1';
export const SAVE_VERSION = 1;

export type Settings = Readonly<{
  volume: number;
  reducedMotion: boolean;
}>;

export type SaveData = Readonly<{
  version: typeof SAVE_VERSION;
  highestUnlockedRoom: number;
  completedRooms: readonly number[];
  hintsSeen: readonly number[];
  settings: Settings;
}>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function defaultSave(reducedMotion = false): SaveData {
  return {
    version: SAVE_VERSION,
    highestUnlockedRoom: 0,
    completedRooms: [],
    hintsSeen: [],
    settings: { volume: 0.5, reducedMotion },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function roomList(value: unknown, roomCount: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const rooms = value.filter(
    (room): room is number => Number.isInteger(room) && room >= 0 && room < roomCount,
  );
  return [...new Set(rooms)].sort((a, b) => a - b);
}

export function parseSave(value: string | null, roomCount: number, fallback = defaultSave()): SaveData {
  if (!value) return fallback;
  try {
    const candidate: unknown = JSON.parse(value);
    if (!isRecord(candidate) || candidate.version !== SAVE_VERSION || !isRecord(candidate.settings)) return fallback;
    const highest = candidate.highestUnlockedRoom;
    const volume = candidate.settings.volume;
    const completedRooms = roomList(candidate.completedRooms, roomCount);
    const hintsSeen = roomList(candidate.hintsSeen, roomCount);
    if (
      !Number.isInteger(highest) || (highest as number) < 0 || (highest as number) >= roomCount
      || typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 1
      || typeof candidate.settings.reducedMotion !== 'boolean'
      || !completedRooms || !hintsSeen
    ) return fallback;
    return {
      version: SAVE_VERSION,
      highestUnlockedRoom: highest as number,
      completedRooms,
      hintsSeen,
      settings: { volume, reducedMotion: candidate.settings.reducedMotion },
    };
  } catch {
    return fallback;
  }
}

export function loadSave(storage: StorageLike, roomCount: number, fallback = defaultSave()): SaveData {
  try {
    return parseSave(storage.getItem(SAVE_KEY), roomCount, fallback);
  } catch {
    return fallback;
  }
}

export function storeSave(storage: StorageLike, save: SaveData): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function completeRoom(save: SaveData, roomIndex: number, roomCount: number): SaveData {
  const completedRooms = [...new Set([...save.completedRooms, roomIndex])].sort((a, b) => a - b);
  return {
    ...save,
    completedRooms,
    highestUnlockedRoom: Math.max(save.highestUnlockedRoom, Math.min(roomIndex + 1, roomCount - 1)),
  };
}

export function changeSettings(save: SaveData, settings: Settings): SaveData {
  return { ...save, settings };
}

export function markHintSeen(save: SaveData, roomIndex: number, roomCount: number): SaveData {
  if (!Number.isInteger(roomIndex) || roomIndex < 0 || roomIndex >= roomCount) return save;
  return {
    ...save,
    hintsSeen: [...new Set([...save.hintsSeen, roomIndex])].sort((a, b) => a - b),
  };
}
