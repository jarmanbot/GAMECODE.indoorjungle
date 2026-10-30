export type PlantSpecies = 'basil' | 'mint' | 'dwarf-marigold' | 'peace-lily';

export type PlantSeedItem = 'basil-seeds' | 'mint-seeds' | 'dwarf-marigold-seeds' | 'peace-lily-seeds';
export type PlantProductItem = 'fresh-basil-leaves' | 'fresh-mint-leaves' | 'potted-dwarf-marigold' | 'potted-peace-lily';
export type PlantYieldMode = 'harvest' | 'whole-plant';

export type PlantStage = 'planted' | 'seedling' | 'mature';

export interface PlantDefinition {
  species: PlantSpecies;
  label: string;
  seedLabel: string;
  harvestLabel: string;
  seedItem: PlantSeedItem;
  harvestItem: PlantProductItem;
  yieldMode: PlantYieldMode;
  growthDurationMs: number;
  seedPrice: number;
  seedPackQuantity: number;
  harvestPrice: number;
}

export const PLANT_DEFINITIONS: Record<PlantSpecies, PlantDefinition> = {
  basil: {
    species: 'basil',
    label: 'Basil',
    seedLabel: 'Basil seeds',
    harvestLabel: 'Fresh basil leaves',
    seedItem: 'basil-seeds',
    harvestItem: 'fresh-basil-leaves',
    yieldMode: 'harvest',
    growthDurationMs: 30_000,
    seedPrice: 2,
    seedPackQuantity: 10,
    harvestPrice: 5,
  },
  mint: {
    species: 'mint',
    label: 'Mint',
    seedLabel: 'Mint seeds',
    harvestLabel: 'Fresh mint leaves',
    seedItem: 'mint-seeds',
    harvestItem: 'fresh-mint-leaves',
    yieldMode: 'harvest',
    growthDurationMs: 60_000,
    seedPrice: 2,
    seedPackQuantity: 5,
    harvestPrice: 8,
  },
  'dwarf-marigold': {
    species: 'dwarf-marigold',
    label: 'Dwarf Marigold',
    seedLabel: 'Dwarf Marigold seeds',
    harvestLabel: 'Potted Dwarf Marigold',
    seedItem: 'dwarf-marigold-seeds',
    harvestItem: 'potted-dwarf-marigold',
    yieldMode: 'whole-plant',
    growthDurationMs: 90_000,
    seedPrice: 8,
    seedPackQuantity: 2,
    harvestPrice: 35,
  },
  'peace-lily': {
    species: 'peace-lily',
    label: 'Peace Lily',
    seedLabel: 'Peace Lily seeds',
    harvestLabel: 'Potted Peace Lily',
    seedItem: 'peace-lily-seeds',
    harvestItem: 'potted-peace-lily',
    yieldMode: 'whole-plant',
    growthDurationMs: 150_000,
    seedPrice: 15,
    seedPackQuantity: 2,
    harvestPrice: 60,
  },
};

export const PLANT_SPECIES: readonly PlantSpecies[] = ['basil', 'mint', 'dwarf-marigold', 'peace-lily'];

export const emptyPlantQuantities = (): Record<PlantSpecies, number> => ({
  basil: 0,
  mint: 0,
  'dwarf-marigold': 0,
  'peace-lily': 0,
});

export function getPlantDefinition(species: PlantSpecies): PlantDefinition {
  return PLANT_DEFINITIONS[species];
}

export function getSeedPackPrice(species: PlantSpecies): number {
  const definition = getPlantDefinition(species);
  return definition.seedPrice * definition.seedPackQuantity;
}

export function getPlantDefinitionByProduct(item: PlantProductItem): PlantDefinition {
  return PLANT_DEFINITIONS[PLANT_SPECIES.find((species) => PLANT_DEFINITIONS[species].harvestItem === item) ?? 'basil'];
}

export function isPlantSpecies(value: unknown): value is PlantSpecies {
  return typeof value === 'string' && PLANT_SPECIES.includes(value as PlantSpecies);
}

export function isPlantProductItem(value: unknown): value is PlantProductItem {
  return typeof value === 'string' && PLANT_SPECIES.some((species) => PLANT_DEFINITIONS[species].harvestItem === value);
}
