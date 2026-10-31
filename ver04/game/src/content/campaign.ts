import type { StageId } from '../core/types';
import { STAGE_01_DURATION_TICKS, STAGE_01_ENTITY_LIMITS, STAGE_01_SPAWNS, type StageEnemySpawn } from './stage-01';
import { STAGE_02_DURATION_TICKS, STAGE_02_ENTITY_LIMITS, STAGE_02_SPAWNS } from './stage-02';
import { STAGE_03_DURATION_TICKS, STAGE_03_ENTITY_LIMITS, STAGE_03_SPAWNS } from './stage-03';

export interface StageDefinition {
  id: StageId;
  durationTicks: number;
  spawns: StageEnemySpawn[];
  entityLimits: { enemies: number; enemyBullets: number };
  boss: 'blank-bailiff' | 'crosswind-compiler' | null;
  environment: 'stable' | 'crosswind' | 'rain';
}

export const STAGES: Record<StageId, StageDefinition> = {
  'stage-01': {
    id: 'stage-01', durationTicks: STAGE_01_DURATION_TICKS, spawns: STAGE_01_SPAWNS,
    entityLimits: STAGE_01_ENTITY_LIMITS, boss: 'blank-bailiff', environment: 'stable'
  },
  'stage-02': {
    id: 'stage-02', durationTicks: STAGE_02_DURATION_TICKS, spawns: STAGE_02_SPAWNS,
    entityLimits: STAGE_02_ENTITY_LIMITS, boss: 'crosswind-compiler', environment: 'crosswind'
  },
  'stage-03': {
    id: 'stage-03', durationTicks: STAGE_03_DURATION_TICKS, spawns: STAGE_03_SPAWNS,
    entityLimits: STAGE_03_ENTITY_LIMITS, boss: null, environment: 'rain'
  }
};

export const stageDefinition = (id: StageId): StageDefinition => STAGES[id];
