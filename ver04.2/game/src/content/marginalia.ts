import type { StageId } from '../core/types';

export type MarginaliaId =
  | 'longhand' | 'footnote' | 'cross-reference' | 'errata'
  | 'rubric' | 'gloss' | 'ligature' | 'underline'
  | 'redaction' | 'citation' | 'palinode' | 'afterword';

export interface MarginaliaDefinition {
  id: MarginaliaId;
  name: string;
  family: 'STROKE' | 'ANNOTATION' | 'RECOVERY';
  benefit: string;
  cost: string;
  repeat: string;
}

export const MARGINALIA: Record<MarginaliaId, MarginaliaDefinition> = {
  longhand: {
    id: 'longhand', name: 'LONGHAND', family: 'STROKE',
    benefit: 'Wake lifetime +0.7 seconds', cost: 'Maximum gauge -10',
    repeat: 'REPEAT: +0.7s wake / -10 max gauge'
  },
  footnote: {
    id: 'footnote', name: 'FOOTNOTE', family: 'STROKE',
    benefit: 'Small loops close at 5,200 px²', cost: 'Large-loop score is reduced',
    repeat: 'REPEAT: no additional effect'
  },
  'cross-reference': {
    id: 'cross-reference', name: 'CROSS-REFERENCE', family: 'STROKE',
    benefit: 'Keeps the wider of two recent loops', cost: 'Candidate window is shorter',
    repeat: 'REPEAT: no additional effect'
  },
  errata: {
    id: 'errata', name: 'ERRATA', family: 'STROKE',
    benefit: 'One empty loop preserves its wake', cost: 'Eight-second cooldown',
    repeat: 'REPEAT: no additional effect'
  },
  rubric: {
    id: 'rubric', name: 'RUBRIC', family: 'ANNOTATION',
    benefit: 'Annotated fire pierces marked enemies', cost: 'Ordinary fire cadence slows',
    repeat: 'REPEAT: no additional effect'
  },
  gloss: {
    id: 'gloss', name: 'GLOSS', family: 'ANNOTATION',
    benefit: 'Annotated hits split vertically', cost: 'Direct-hit damage is reduced',
    repeat: 'REPEAT: no additional effect'
  },
  ligature: {
    id: 'ligature', name: 'LIGATURE', family: 'ANNOTATION',
    benefit: 'Every second annotation becomes linked', cost: 'Link consumes extra wake',
    repeat: 'REPEAT: no additional effect'
  },
  underline: {
    id: 'underline', name: 'UNDERLINE', family: 'ANNOTATION',
    benefit: 'Annotated fire widens over distance', cost: 'Starts ten percent slower',
    repeat: 'REPEAT: no additional effect'
  },
  redaction: {
    id: 'redaction', name: 'REDACTION', family: 'RECOVERY',
    benefit: 'Six captures redact nearby fire and prime one guard', cost: 'Returned fire tracks less precisely',
    repeat: 'REPEAT: +6 capture capacity'
  },
  citation: {
    id: 'citation', name: 'CITATION', family: 'RECOVERY',
    benefit: 'Every four cumulative captures launch a heavy lance', cost: 'Only captured fire advances it',
    repeat: 'REPEAT: no additional effect'
  },
  palinode: {
    id: 'palinode', name: 'PALINODE', family: 'RECOVERY',
    benefit: 'Two COLLATEs prime a RETRACE closing loop', cost: 'RETRACE costs ten more gauge',
    repeat: 'REPEAT: no additional effect'
  },
  afterword: {
    id: 'afterword', name: 'AFTERWORD', family: 'RECOVERY',
    benefit: 'Three safe COLLATEs prime a post-hit long wake', cost: 'Damage spends the prepared draft',
    repeat: 'REPEAT: no additional effect'
  }
};

export const MARGINALIA_IDS = Object.keys(MARGINALIA) as MarginaliaId[];

const stageNumber = (stageId: StageId): number => Number(stageId.slice(-2));

export const marginaliaCandidates = (seed: number, stageId: StageId, moment: 'midpoint' | 'result' = 'result'): MarginaliaId[] => {
  const offer = (stageNumber(stageId) - 1) * 2 + (moment === 'result' ? 1 : 0);
  // Seed 404 keeps the established first result offer while subsequent
  // midpoint/result offers rotate through every member of each family.
  const familyOffset = ((seed >>> 0) + offer + 3) % 4;
  const families = [
    ['longhand', 'footnote', 'cross-reference', 'errata'],
    ['rubric', 'gloss', 'ligature', 'underline'],
    ['redaction', 'citation', 'palinode', 'afterword']
  ] as const;
  return families.map((family) => family[familyOffset]);
};

export const marginaliaCount = (owned: readonly MarginaliaId[], id: MarginaliaId): number =>
  owned.filter((item) => item === id).length;

export const marginaliaOwnedSummary = (owned: readonly MarginaliaId[]): string => {
  if (owned.length === 0) return 'CURRENT NOTES  none';
  const summary = MARGINALIA_IDS
    .map((id) => ({ id, count: marginaliaCount(owned, id) }))
    .filter(({ count }) => count > 0)
    .map(({ id, count }) => `${MARGINALIA[id].name}${count > 1 ? ` ×${count}` : ''}`)
    .join('  ·  ');
  return `CURRENT NOTES  ${summary}`;
};

export const marginaliaEffects = (owned: readonly MarginaliaId[]) => ({
  trailLifetimeBonus: marginaliaCount(owned, 'longhand') * 0.7,
  gaugeCap: Math.max(40, 100 - marginaliaCount(owned, 'longhand') * 10),
  fireCooldown: 10 + Math.min(1, marginaliaCount(owned, 'rubric')) * 3,
  rubric: marginaliaCount(owned, 'rubric') > 0,
  footnote: marginaliaCount(owned, 'footnote') > 0,
  crossReference: marginaliaCount(owned, 'cross-reference') > 0,
  errata: marginaliaCount(owned, 'errata') > 0,
  gloss: marginaliaCount(owned, 'gloss') > 0,
  ligature: marginaliaCount(owned, 'ligature') > 0,
  underline: marginaliaCount(owned, 'underline') > 0,
  captureLimit: 18 + marginaliaCount(owned, 'redaction') * 6,
  redaction: marginaliaCount(owned, 'redaction') > 0,
  citation: marginaliaCount(owned, 'citation') > 0,
  palinode: marginaliaCount(owned, 'palinode') > 0,
  afterword: marginaliaCount(owned, 'afterword') > 0
});
