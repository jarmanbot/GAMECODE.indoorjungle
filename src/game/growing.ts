import type { PlantSpecies, PlantStage } from './plants';

export type GrowingPotType = 'small-basic-plastic-pot';
export type GrowingPotMedium = 'usable';

export interface GrowingCropState {
  species: PlantSpecies;
  stage: PlantStage;
  wateredAt: number | null;
  growthStartedAt: number | null;
}

export interface GrowingPotState {
  id: string;
  type: GrowingPotType;
  medium: GrowingPotMedium;
  slot: number | null;
  crop: GrowingCropState | null;
}

export const STARTER_GROWING_POT_ID = 'starter-growing-pot-1';
export const ADDITIONAL_GROWING_POT_IDS = ['growing-pot-2', 'growing-pot-3', 'growing-pot-4', 'growing-pot-5', 'growing-pot-6'] as const;
export const MAX_ADDITIONAL_GROWING_POTS = ADDITIONAL_GROWING_POT_IDS.length;
export const GROWING_TABLE_SLOT_COUNT = 6;

export function createEmptyGrowingPot(id: string, slot: number | null = null): GrowingPotState {
  return { id, type: 'small-basic-plastic-pot', medium: 'usable', slot, crop: null };
}
