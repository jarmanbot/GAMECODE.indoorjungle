export type PremiumPlantId = 'snake-plant' | 'monstera' | 'variegated-pothos';

export interface PremiumPlantDefinition {
  id: PremiumPlantId;
  label: string;
  shortLabel: string;
  price: number;
  shelfSlot: number;
}

export const PREMIUM_PLANT_CATALOG: readonly PremiumPlantDefinition[] = [
  { id: 'snake-plant', label: 'Tall Snake Plant', shortLabel: 'SNAKE', price: 250, shelfSlot: 0 },
  { id: 'monstera', label: 'Large Monstera', shortLabel: 'MONSTERA', price: 750, shelfSlot: 1 },
  { id: 'variegated-pothos', label: 'Rare Variegated Pothos', shortLabel: 'RARE', price: 2000, shelfSlot: 2 },
] as const;

export function isPremiumPlantId(value: unknown): value is PremiumPlantId {
  return PREMIUM_PLANT_CATALOG.some((plant) => plant.id === value);
}

export function getPremiumPlantDefinition(id: PremiumPlantId): PremiumPlantDefinition {
  return PREMIUM_PLANT_CATALOG.find((plant) => plant.id === id)!;
}
