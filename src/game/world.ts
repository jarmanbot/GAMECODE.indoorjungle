export type BuildingKind = 'shop' | 'homes' | 'plants' | 'apartment';

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
export const STARTING_WALKABLE_MAX_X = 2540;

export const BUILDINGS: Building[] = [
  { key: 'buy-sell', label: 'BUY / SELL', kind: 'shop', x: 880, y: 505, width: 350, height: 325 },
  { key: 'homes', label: 'HOMES', kind: 'homes', x: 1260, y: 490, width: 380, height: 340 },
  { key: 'plants', label: 'PLANTS', kind: 'plants', x: 1670, y: 510, width: 360, height: 320 },
  { key: 'starter-apartment', label: 'STARTER APARTMENT', kind: 'apartment', x: 2060, y: 465, width: 430, height: 365 },
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
    x: 2600,
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
CITY_MAP_SIZE.width += 80;
CITY_MAP_SIZE.height += 65;

export const BUY_SELL_ENTRANCE = { x: 1055, y: 885 };
export const POT_POSITION = { x: 785, y: 890 };
export const START_POSITION = { x: 635, y: 890 };
