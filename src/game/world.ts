export type BuildingKind = 'shop' | 'homes' | 'plants' | 'apartment';
export type PropertyListingKey = 'cheap-rental' | 'mid-rental' | 'high-property';
export type PropertyId = 'none' | 'starter-apartment' | 'second-rental';

export interface Building {
  key: string;
  label: string;
  kind: BuildingKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ZoomMode = 'close' | 'normal';

export const WORLD_WIDTH = 4200;
export const WORLD_HEIGHT = 1800;
export const PAVEMENT_Y = 830;
export const PAVEMENT_HEIGHT = 112;
export const FRONT_PAVEMENT_MIN_Y = 850;
export const FRONT_PAVEMENT_MAX_Y = 932;
export const OPPOSITE_PAVEMENT_MIN_Y = 1188;
export const OPPOSITE_PAVEMENT_MAX_Y = 1240;
export const CROSSING_START_X = 1406;
export const CROSSING_END_X = 1666;
export const STARTING_WALKABLE_MIN_X = 540;
export const STARTING_WALKABLE_MAX_X = 3000;

export const BUILDINGS: Building[] = [
  { key: 'starter-apartment', label: 'STARTER APARTMENT', kind: 'apartment', x: 620, y: 465, width: 430, height: 365 },
  { key: 'buy-sell', label: 'BUY / SELL', kind: 'shop', x: 1120, y: 505, width: 350, height: 325 },
  { key: 'homes', label: 'REAL ESTATE AGENT', kind: 'homes', x: 1510, y: 490, width: 380, height: 340 },
  { key: 'plants', label: 'NURSERY COMING SOON', kind: 'plants', x: 1940, y: 510, width: 360, height: 320 },
  { key: 'second-rental', label: 'TWO-ROOM RENTAL', kind: 'apartment', x: 2460, y: 465, width: 430, height: 365 },
];

export interface FutureZone {
  key: string;
  label: string;
  condition: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FUTURE_ZONES: FutureZone[] = [
  {
    key: 'willow-reserve',
    label: 'WILLOW RESERVE',
    condition: 'Provisional housing district',
    x: 100,
    y: 520,
    width: 650,
    height: 270,
  },
  {
    key: 'east-gardens',
    label: 'EAST GARDENS',
    condition: 'Provisional garden district',
    x: 3060,
    y: 520,
    width: 690,
    height: 270,
  },
  {
    key: 'north-works',
    label: 'NORTH WORKS',
    condition: 'Provisional construction zone',
    x: 3380,
    y: 485,
    width: 600,
    height: 305,
  },
  {
    key: 'south-plots',
    label: 'SOUTH PLOTS',
    condition: 'Provisional expansion plots',
    x: 110,
    y: 1284,
    width: 3910,
    height: 330,
  },
];

export interface CityDistrict {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  unlocked: boolean;
  roadConnections: string[];
}

export interface CityRoad {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
}

export const CITY_DISTRICTS: CityDistrict[] = [
  {
    id: 'starting-neighbourhood',
    label: 'STARTING NEIGHBOURHOOD',
    x: 260,
    y: 180,
    width: 520,
    height: 150,
    unlocked: true,
    roadConnections: ['main-road', 'central-avenue'],
  },
  {
    id: 'willow-reserve',
    label: 'WILLOW RESERVE',
    x: 40,
    y: 45,
    width: 210,
    height: 105,
    unlocked: false,
    roadConnections: ['west-road'],
  },
  {
    id: 'east-gardens',
    label: 'EAST GARDENS',
    x: 850,
    y: 55,
    width: 250,
    height: 110,
    unlocked: false,
    roadConnections: ['east-road'],
  },
  {
    id: 'north-works',
    label: 'NORTH WORKS',
    x: 950,
    y: 205,
    width: 190,
    height: 105,
    unlocked: false,
    roadConnections: ['east-road', 'main-road'],
  },
  {
    id: 'south-plots',
    label: 'SOUTH PLOTS',
    x: 120,
    y: 445,
    width: 1000,
    height: 110,
    unlocked: false,
    roadConnections: ['main-road'],
  },
];

export const CITY_ROADS: CityRoad[] = [
  { id: 'main-road', x: 0, y: 325, width: 1200, height: 44 },
  { id: 'central-avenue', x: 540, y: 0, width: 32, height: 620 },
  { id: 'west-road', x: 90, y: 135, width: 260, height: 22, angle: -8 },
  { id: 'east-road', x: 760, y: 145, width: 350, height: 22, angle: 7 },
];

export const CITY_MAP_SIZE = CITY_DISTRICTS.reduce(
  (bounds, district) => ({
    width: Math.max(bounds.width, district.x + district.width),
    height: Math.max(bounds.height, district.y + district.height),
  }),
  { width: 0, height: 0 },
);
CITY_MAP_SIZE.width += 140;
CITY_MAP_SIZE.height += 105;

export const BUY_SELL_DOOR_WIDTH = 64;
export const BUY_SELL_DOOR_HEIGHT = 104;
export const BUY_SELL_DOOR_TOP = 726;
export const BUY_SELL_DOOR_BOTTOM = 830;
export const BUY_SELL_ENTRANCE = { x: 1405, y: 864 };
export const BUY_SELL_WINDOW = { x: 1135, y: 590, width: 222, height: 190 };
export const HOMES_WINDOW = { x: 1530, y: 592, width: 340, height: 184 };
export const HOMES_WINDOW_CLEAN_ZONE = { x: 1530, y: 592, width: 340, height: 36 };
export interface WindowCleanSection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spraysRequired: number;
}

// Keep section effort in the world definition so larger future windows can
// use more sprays per section without changing the cleaning system.
export const HOMES_WINDOW_CLEAN_SECTIONS: WindowCleanSection[] = [
  { id: 'homes-left', x: 1530, y: 592, width: 104, height: 184, spraysRequired: 3 },
  { id: 'homes-centre', x: 1648, y: 592, width: 104, height: 184, spraysRequired: 3 },
  { id: 'homes-right', x: 1766, y: 592, width: 104, height: 184, spraysRequired: 3 },
];
export const HOMES_LISTINGS: Array<{ key: PropertyListingKey; x: number; y: number; width: number; height: number }> = [
  { key: 'cheap-rental', x: 1550, y: 637, width: 112, height: 90 },
  { key: 'mid-rental', x: 1680, y: 637, width: 78, height: 90 },
  { key: 'high-property', x: 1773, y: 637, width: 78, height: 90 },
];
export const APARTMENT_DOOR_WIDTH = 60;
export const APARTMENT_DOOR_TOP = 683;
export const APARTMENT_DOOR_BOTTOM = 769;
export const APARTMENT_ENTRANCE = { x: 835, y: 864 };
export const SECOND_RENTAL_ENTRANCE = { x: 2675, y: 864 };
export const SECOND_RENTAL_DOOR_TOP = 683;
export const SECOND_RENTAL_DOOR_BOTTOM = 769;
export const OPENING_TOWER = { x: 540, y: -1320, width: 500, height: 2210 };
export const OPENING_DROP_POINT = { x: 715, y: -1080 };
// The collectible sits on the lower edge of the front pavement: with its
// existing drawing scale, the pot base meets the road-edge line at y=944.
export const POT_POSITION = { x: 1080, y: 930 };
export const START_POSITION = { x: 560, y: 890 };

export const SHOP_WORLD_WIDTH = 1200;
export const SHOP_WORLD_HEIGHT = 900;
export const SHOP_PLAYER_START = { x: 260, y: 690 };
export const SHOP_COUNTER = { x: 390, y: 500 };
export const SHOP_COUNTER_APPROACH = { x: 390, y: 640 };
// The interior exit sits in the bottom wall, farther right and close to the
// room's lower edge so it reads as a real way out rather than a floating door.
export const SHOP_EXIT = { x: 760, y: 840 };
export const SHOP_EXIT_DOOR_TOP = SHOP_EXIT.y - BUY_SELL_DOOR_HEIGHT;
export const SHOP_EXIT_DOOR_BOTTOM = SHOP_EXIT.y;
export const SHOP_HANDOVER_POINT = { x: 650, y: 620 };
export const HOME_WORLD_WIDTH = 900;
export const HOME_WORLD_HEIGHT = 700;
export const HOME_PLAYER_START = { x: 220, y: 560 };
export const HOME_EXIT = { x: 115, y: 560 };
export const HOME_STARTER_KIT = { x: 250, y: 300 };
export const HOME_GROWING_SPOTS = [
  { x: 380, y: 470 },
  { x: 495, y: 470 },
  { x: 610, y: 470 },
] as const;
export const SECOND_HOME_GROWING_SPOTS = [
  { x: 170, y: 470 },
  { x: 300, y: 470 },
  { x: 430, y: 470 },
  { x: 560, y: 470 },
  { x: 690, y: 470 },
  { x: 800, y: 470 },
] as const;
// Backwards-compatible centre reference for callers that do not need slot
// selection. The active pot uses HOME_GROWING_SPOTS[starterPotSlot].
export const HOME_GROWING_SPOT = HOME_GROWING_SPOTS[1];
// Match the HOMES window's 96-world-unit interaction lane so contextual
// popups use a consistent distance from their target. The approach point is
// placed at the edge of this ring beside the pot.
export const BASIL_POT_INTERACTION_RADIUS = 96;
export const BASIL_GROWTH_DURATION_MS = 30_000;
export const BASIL_HARVEST_PRICE = 5;
export const BASIL_SEED_PRICE = 2;
export const SMALL_BASIC_PLASTIC_POT_PRICE = 10;
export const OPENING_POTHOS_SALE_PRICE = 5;
export const WINDOW_JOB_REWARD = 9;
export const REPAIRED_POT_SALE_PRICE = 75;
export const RENTAL_BOND_COST = 60;
// Pass 5 prototype values. These are intentionally provisional and are not
// a rent/bills system: the starter bond transfers and only the difference is
// paid when moving to the second rental.
export const SECOND_RENTAL_TOTAL_BOND = 120;
export const SECOND_RENTAL_MOVE_COST = 60;
export const SHOP_BUYBACK_MARKUP_NUMERATOR = 140;
export const SHOP_BUYBACK_MARKUP_DENOMINATOR = 100;

export function getShopBuybackPrice(normalShopPrice: number): number {
  const price = Math.max(0, Math.floor(normalShopPrice));
  return Math.floor((price * SHOP_BUYBACK_MARKUP_NUMERATOR + SHOP_BUYBACK_MARKUP_DENOMINATOR - 1)
    / SHOP_BUYBACK_MARKUP_DENOMINATOR);
}
