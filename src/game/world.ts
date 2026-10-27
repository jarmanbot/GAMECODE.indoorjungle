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

export const BUY_SELL_NAME = "Birch's Buy'n Sell";
export const BUY_SELL_SIGN_NAME = "BIRCH'S BUY'N SELL";

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
  { key: 'starter-apartment', label: 'POVO APPARTMENTS', kind: 'apartment', x: 780, y: 555, width: 300, height: 275 },
  { key: 'buy-sell', label: BUY_SELL_SIGN_NAME, kind: 'shop', x: 1120, y: 505, width: 350, height: 325 },
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
export const HOMES_WINDOW = { x: 1530, y: 592, width: 246, height: 184 };
export const HOMES_WINDOW_CLEAN_ZONE = { x: 1530, y: 592, width: 246, height: 36 };
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
  { id: 'homes-left', x: 1530, y: 592, width: 116, height: 184, spraysRequired: 3 },
  { id: 'homes-right', x: 1660, y: 592, width: 116, height: 184, spraysRequired: 3 },
];
export const HOMES_LISTINGS: Array<{ key: PropertyListingKey; x: number; y: number; width: number; height: number }> = [
  { key: 'cheap-rental', x: 1550, y: 637, width: 112, height: 90 },
  { key: 'mid-rental', x: 1680, y: 637, width: 78, height: 90 },
  { key: 'high-property', x: 1773, y: 637, width: 78, height: 90 },
];
export const APARTMENT_DOOR_WIDTH = BUY_SELL_DOOR_WIDTH;
export const APARTMENT_DOOR_HEIGHT = BUY_SELL_DOOR_HEIGHT;
export const APARTMENT_DOOR_TOP = BUY_SELL_DOOR_TOP;
export const APARTMENT_DOOR_BOTTOM = BUY_SELL_DOOR_BOTTOM;
export const APARTMENT_ENTRANCE = { x: 1030, y: 864 };
export const REAL_ESTATE_ENTRANCE = { x: 1830, y: 864 };
export const REAL_ESTATE_DOOR_TOP = 726;
export const REAL_ESTATE_DOOR_BOTTOM = 830;
export const SECOND_RENTAL_ENTRANCE = { x: 2675, y: 864 };
export const SECOND_RENTAL_DOOR_TOP = 683;
export const SECOND_RENTAL_DOOR_BOTTOM = 769;
export const OPENING_TOWER = { x: 540, y: -1320, width: 500, height: 2210 };
export const OPENING_DROP_POINT = { x: 715, y: -1080 };
// The collectible sits on the lower edge of the front pavement: with its
// existing drawing scale, the pot base meets the road-edge line at y=944.
export const POT_POSITION = { x: 1080, y: 930 };
// Post-upgrade ordinary collectible at the far-right edge of the currently
// accessible starting neighbourhood.
export const RARE_BEGONIA_POSITION = { x: 2940, y: 930 };
export const START_POSITION = { x: 560, y: 890 };
export const BROKEN_POT_PIECES_SCALE = 2.268;

export const SHOP_WORLD_WIDTH = 900;
export const SHOP_WORLD_HEIGHT = 900;
// Spawn just inside the bottom doorway, in the clear gap beside the counter.
// Held movement is reset during entry so this does not immediately retrigger
// the exit threshold.
export const SHOP_PLAYER_START = { x: 620, y: 700 };
export const SHOP_COUNTER = { x: 450, y: 620 };
export const SHOP_COUNTER_APPROACH = { x: 450, y: 745 };
export const SHOP_COUNTER_WIDTH = 260;
export const SHOP_COUNTER_HEIGHT = 104;
export const SHOP_SHELVES = [
  { x: 120, y: 180, width: 170, height: 250 },
  { x: 610, y: 180, width: 170, height: 250 },
  { x: 365, y: 180, width: 170, height: 250 },
] as const;
// Every shop-owned or player-sold item uses these shared positions. The first
// three are reserved for the opening premium catalogue; later slots are used
// by persistent player-sold stock in stable list order.
export const SHOP_SHELF_SLOTS = [
  { x: 205, y: 238 }, { x: 695, y: 238 },
  { x: 205, y: 306 }, { x: 695, y: 306 },
  { x: 205, y: 374 }, { x: 695, y: 374 },
  { x: 205, y: 430 }, { x: 695, y: 430 },
  { x: 450, y: 238 }, { x: 450, y: 306 },
  { x: 450, y: 374 }, { x: 450, y: 430 },
] as const;
// The interior exit sits in the bottom wall, farther right and close to the
// room's lower edge so it reads as a real way out rather than a floating door.
// Alex is about 74 world units tall. A 1.15 scale makes this doorway roughly
// 1.6 Alex heights: compact within the room, but still clearly usable.
// Its interaction area remains separate and generous for touch input.
export const SHOP_EXIT_DOOR_SCALE = 1.15;
export const SHOP_EXIT_DOOR_WIDTH = Math.round(BUY_SELL_DOOR_WIDTH * SHOP_EXIT_DOOR_SCALE);
export const SHOP_EXIT_DOOR_HEIGHT = Math.round(BUY_SELL_DOOR_HEIGHT * SHOP_EXIT_DOOR_SCALE);
export const SHOP_EXIT = { x: 700, y: 850 };
export const SHOP_EXIT_DOOR_TOP = SHOP_EXIT.y - SHOP_EXIT_DOOR_HEIGHT;
export const SHOP_EXIT_DOOR_BOTTOM = SHOP_EXIT.y;
export const SHOP_EXIT_ACTIVATION_HALF_WIDTH = 112;
export const SHOP_EXIT_ACTIVATION_TOP = SHOP_EXIT_DOOR_BOTTOM - 270;
export const SHOP_EXIT_ACTIVATION_BOTTOM = SHOP_EXIT_DOOR_BOTTOM + 28;
export const SHOP_EXIT_MOVEMENT_TRIGGER_Y = SHOP_EXIT_DOOR_BOTTOM - 58;
export const SHOP_HANDOVER_POINT = { x: 570, y: 735 };
export const HOME_WORLD_WIDTH = 900;
export const HOME_WORLD_HEIGHT = 900;
export const SECOND_HOME_WORLD_WIDTH = 1200;
export const SECOND_HOME_WORLD_HEIGHT = 900;
// Enter near the shared bottom exit, but outside its activation lane so held
// input cannot immediately send Alex back to the street.
export const HOME_PLAYER_START = { x: 560, y: 720 };
export const SECOND_HOME_PLAYER_START = { x: 560, y: 720 };
export const HOME_EXIT = { ...SHOP_EXIT };
export const HOME_EXIT_DOOR_WIDTH = SHOP_EXIT_DOOR_WIDTH;
export const HOME_EXIT_DOOR_HEIGHT = SHOP_EXIT_DOOR_HEIGHT;
export const HOME_EXIT_DOOR_TOP = HOME_EXIT.y - HOME_EXIT_DOOR_HEIGHT;
export const HOME_EXIT_DOOR_BOTTOM = HOME_EXIT.y;
export const HOME_EXIT_ACTIVATION_HALF_WIDTH = 84;
export const HOME_EXIT_ACTIVATION_TOP = HOME_EXIT_DOOR_TOP - 30;
export const HOME_EXIT_ACTIVATION_BOTTOM = HOME_EXIT_DOOR_BOTTOM + 18;
export const HOME_EXIT_MOVEMENT_TRIGGER_Y = HOME_EXIT_DOOR_BOTTOM - 58;
export const HOME_STARTER_KIT = { x: 250, y: 300 };
export const HOME_GROWING_SPOTS = [
  { x: 380, y: 580 },
  { x: 495, y: 580 },
  { x: 610, y: 580 },
] as const;
export const SECOND_HOME_GROWING_SPOTS = [
  { x: 190, y: 580 },
  { x: 365, y: 580 },
  { x: 540, y: 580 },
  { x: 715, y: 580 },
  { x: 890, y: 580 },
  { x: 1065, y: 580 },
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
export const BASIC_FERTILIZER_BOX_PRICE = 20;
export const BASIC_FERTILIZER_PELLETS_PER_BOX = 10;
export const BASIC_FERTILIZER_GROWTH_REDUCTION_MS = 30_000;
export const OPENING_POTHOS_SALE_PRICE = 5;
export const OPENING_POTHOS_DELIVERY_REWARD = 15;
export const BASIL_DELIVERY_REWARD = 9;
export const WINDOW_JOB_REWARD = 4;
export const REPAIRED_POT_SALE_PRICE = 75;
export const RARE_BEGONIA_SALE_PRICE = 300;
export const RENTAL_BOND_COST = 60;
// Pass 5 prototype values. These are intentionally provisional and are not
// a rent/bills system: the starter bond transfers and only the difference is
// paid when moving to the second rental.
export const SECOND_RENTAL_TOTAL_BOND = 600;
export const SECOND_RENTAL_MOVE_COST = SECOND_RENTAL_TOTAL_BOND - RENTAL_BOND_COST;
export const SHOP_BUYBACK_MARKUP_NUMERATOR = 140;
export const SHOP_BUYBACK_MARKUP_DENOMINATOR = 100;

export function getShopBuybackPrice(normalShopPrice: number): number {
  const price = Math.max(0, Math.floor(normalShopPrice));
  return Math.floor((price * SHOP_BUYBACK_MARKUP_NUMERATOR + SHOP_BUYBACK_MARKUP_DENOMINATOR - 1)
    / SHOP_BUYBACK_MARKUP_DENOMINATOR);
}
