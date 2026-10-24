export type PlantSpecies = 'basil' | 'mint';

export type PlantStage = 'planted' | 'seedling' | 'mature';

export interface PlantDefinition {
  species: PlantSpecies;
  label: string;
  seedLabel: string;
  harvestLabel: string;
  seedItem: 'basil-seeds' | 'mint-seeds';
  harvestItem: 'fresh-basil-leaves' | 'fresh-mint-leaves';
  growthDurationMs: number;
  seedPrice: number;
  harvestPrice: number;
}

export const PLANT_DEFINITIONS: Record<PlantSpecies, PlantDefinition> = {
  basil: {
    species: 'basil',
    label: 'Basil',
    seedLabel: 'Basil seed portions',
    harvestLabel: 'Fresh basil leaves',
    seedItem: 'basil-seeds',
    harvestItem: 'fresh-basil-leaves',
    growthDurationMs: 60_000,
    seedPrice: 2,
    harvestPrice: 5,
  },
  mint: {
    species: 'mint',
    label: 'Mint',
    seedLabel: 'Mint seed portions',
    harvestLabel: 'Fresh mint leaves',
    seedItem: 'mint-seeds',
    harvestItem: 'fresh-mint-leaves',
    growthDurationMs: 60_000,
    seedPrice: 2,
    harvestPrice: 5,
  },
};

export const PLANT_SPECIES: readonly PlantSpecies[] = ['basil', 'mint'];

export const emptyPlantQuantities = (): Record<PlantSpecies, number> => ({ basil: 0, mint: 0 });

export function getPlantDefinition(species: PlantSpecies): PlantDefinition {
  return PLANT_DEFINITIONS[species];
}
