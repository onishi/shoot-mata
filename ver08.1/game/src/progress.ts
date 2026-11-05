export interface CampaignProgress {
  highestUnlocked: number;
  completed: boolean;
}

export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PROGRESS_KEY = "duskloom.progress.v1";

export const DEFAULT_PROGRESS: CampaignProgress = {
  highestUnlocked: 0,
  completed: false,
};

export function normalizeProgress(value: unknown, levelCount: number): CampaignProgress {
  if (typeof value !== "object" || value === null || levelCount < 1) return { ...DEFAULT_PROGRESS };
  const candidate = value as Partial<CampaignProgress>;
  const highestUnlocked = typeof candidate.highestUnlocked === "number" && Number.isInteger(candidate.highestUnlocked)
    ? Math.max(0, Math.min(levelCount - 1, candidate.highestUnlocked))
    : 0;
  const completed = candidate.completed === true && highestUnlocked === levelCount - 1;
  return { highestUnlocked, completed };
}

export function loadProgress(storage: ProgressStorage, levelCount: number): CampaignProgress {
  try {
    const saved = storage.getItem(PROGRESS_KEY);
    return saved === null ? { ...DEFAULT_PROGRESS } : normalizeProgress(JSON.parse(saved), levelCount);
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(storage: ProgressStorage, progress: CampaignProgress, levelCount: number): void {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(normalizeProgress(progress, levelCount)));
  } catch {
    // Progress persistence must never prevent play when storage is unavailable or full.
  }
}

export function recordWin(progress: CampaignProgress, levelIndex: number, levelCount: number): CampaignProgress {
  const safe = normalizeProgress(progress, levelCount);
  if (levelIndex < 0 || levelIndex >= levelCount) return safe;
  const finalLevel = levelIndex === levelCount - 1;
  return {
    highestUnlocked: Math.max(safe.highestUnlocked, Math.min(levelIndex + 1, levelCount - 1)),
    completed: safe.completed || finalLevel,
  };
}
