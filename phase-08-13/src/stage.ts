export interface StageWave {
  at: number;
  y: number;
  kind: 'light' | 'heavy';
  section: 1 | 2 | 3;
}

export const BOSS_TIME = 164;
export const STAGE_SECTIONS = [
  { start: 0, label: 'APPROACH' },
  { start: 56, label: 'CROSS CURRENT' },
  { start: 110, label: 'FINAL APPROACH' },
] as const;

const openingLanes = [270, 190, 350, 270, 270, 130, 410];
const crossLanes = [130, 410, 190, 350, 270, 410, 130];
const finalLanes = [270, 220, 320, 145, 395, 270];

function makeStage(): StageWave[] {
  const waves: StageWave[] = [];
  let at = 0;
  let index = 0;
  while (at < 54) {
    waves.push({ at: Number(at.toFixed(2)), y: openingLanes[index % openingLanes.length], kind: index % 5 === 4 ? 'heavy' : 'light', section: 1 });
    at += at < 10 ? 1.7 : 1.1;
    index++;
  }
  index = 0;
  for (at = 56; at < 108; at += 1.35) {
    waves.push({ at: Number(at.toFixed(2)), y: crossLanes[index % crossLanes.length], kind: index % 5 === 3 ? 'heavy' : 'light', section: 2 });
    index++;
  }
  index = 0;
  for (at = 110; at < 160; at += 1.25) {
    waves.push({ at: Number(at.toFixed(2)), y: finalLanes[index % finalLanes.length], kind: index % 4 === 3 ? 'heavy' : 'light', section: 3 });
    index++;
  }
  return waves;
}

export const STAGE_WAVES = makeStage();
