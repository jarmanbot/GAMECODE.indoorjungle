import type { PropertyId } from './world';

export type WelcomeGiftItem = 'small-basic-plastic-pot' | 'watering-can' | 'basil-seeds' | 'mint-seeds' | 'basic-fertilizer';

export interface WelcomeGiftContent {
  item: WelcomeGiftItem;
  quantity: number;
}

export interface PropertyWelcomeGiftDefinition {
  propertyId: PropertyId;
  propertyDisplayName: string;
  contents: readonly WelcomeGiftContent[];
  message?: string;
}

export const PROPERTY_WELCOME_GIFTS: Partial<Record<PropertyId, PropertyWelcomeGiftDefinition>> = {
  'starter-apartment': {
    propertyId: 'starter-apartment',
    propertyDisplayName: 'POVO Apartments',
    contents: [
      { item: 'small-basic-plastic-pot', quantity: 1 },
      { item: 'watering-can', quantity: 1 },
      { item: 'basil-seeds', quantity: 1 },
      { item: 'mint-seeds', quantity: 1 },
      { item: 'basic-fertilizer', quantity: 1 },
    ],
    message: "Here’s your room key to POVO Apartments.\nWe left a welcome gift for you.",
  },
};

export function getPropertyWelcomeGift(propertyId: PropertyId): PropertyWelcomeGiftDefinition | null {
  return PROPERTY_WELCOME_GIFTS[propertyId] ?? null;
}
