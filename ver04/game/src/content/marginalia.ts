import type { StageId } from '../core/types';

export type MarginaliaId = 'longhand' | 'rubric' | 'redaction';

export interface MarginaliaDefinition {
  id: MarginaliaId;
  name: string;
  family: 'STROKE' | 'ANNOTATION' | 'RECOVERY';
  benefit: string;
  cost: string;
}

export const MARGINALIA: Record<MarginaliaId, MarginaliaDefinition> = {
  longhand: {
    id: 'longhand', name: 'LONGHAND', family: 'STROKE',
    benefit: 'Wake lifetime +0.7 seconds', cost: 'Maximum gauge -10'
  },
  rubric: {
    id: 'rubric', name: 'RUBRIC', family: 'ANNOTATION',
    benefit: 'Annotated fire pierces marked enemies', cost: 'Ordinary fire cadence slows'
  },
  redaction: {
    id: 'redaction', name: 'REDACTION', family: 'RECOVERY',
    benefit: 'Capture limit +6', cost: 'Returned fire tracks less precisely'
  }
};

export const MARGINALIA_IDS = Object.keys(MARGINALIA) as MarginaliaId[];

const stageNumber = (stageId: StageId): number => Number(stageId.slice(-2));

export const marginaliaCandidates = (seed: number, stageId: StageId): MarginaliaId[] => {
  const offset = ((seed >>> 0) + stageNumber(stageId) * 5) % MARGINALIA_IDS.length;
  return MARGINALIA_IDS.map((_, index) => MARGINALIA_IDS[(index + offset) % MARGINALIA_IDS.length]);
};

export const marginaliaCount = (owned: readonly MarginaliaId[], id: MarginaliaId): number =>
  owned.filter((item) => item === id).length;

export const marginaliaEffects = (owned: readonly MarginaliaId[]) => ({
  trailLifetimeBonus: marginaliaCount(owned, 'longhand') * 0.7,
  gaugeCap: Math.max(40, 100 - marginaliaCount(owned, 'longhand') * 10),
  fireCooldown: 10 + marginaliaCount(owned, 'rubric') * 3,
  rubric: marginaliaCount(owned, 'rubric') > 0,
  captureLimit: 18 + marginaliaCount(owned, 'redaction') * 6,
  redaction: marginaliaCount(owned, 'redaction') > 0
});
