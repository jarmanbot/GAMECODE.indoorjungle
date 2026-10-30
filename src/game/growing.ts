import type { PlantSpecies, PlantStage } from './plants';

export type GrowingPotType = 'small-basic-plastic-pot' | 'special-repair-pot';
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

export type GrowSlotState = 'empty' | 'pot' | 'growing' | 'mature';

export function getGrowSlotState(pot: GrowingPotState | null, cropMature = false): GrowSlotState {
  if (!pot) return 'empty';
  if (!pot.crop) return 'pot';
  return cropMature || pot.crop.stage === 'mature' ? 'mature' : 'growing';
}

export const STARTER_GROWING_POT_ID = 'starter-growing-pot-1';
export const ADDITIONAL_GROWING_POT_IDS = ['growing-pot-2', 'growing-pot-3', 'growing-pot-4', 'growing-pot-5', 'growing-pot-6'] as const;
export const MAX_ADDITIONAL_GROWING_POTS = ADDITIONAL_GROWING_POT_IDS.length;
export const GROWING_TABLE_SLOT_COUNT = 6;

export function createEmptyGrowingPot(
  id: string,
  slot: number | null = null,
  type: GrowingPotType = 'small-basic-plastic-pot',
): GrowingPotState {
  return { id, type, medium: 'usable', slot, crop: null };
}
