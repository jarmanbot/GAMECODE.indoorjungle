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

export type ZoomMode = 'close' | 'normal' | 'overview';

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

export const ZOOM_LEVELS: Record<ZoomMode, number> = {
  close: 1.48,
  normal: 0.8,
  overview: 0.45,
};

// Camera offsets keep the same world geometry framed differently at each level.
// Phaser subtracts this offset from the followed target position.
export const CAMERA_FOLLOW_OFFSETS: Record<ZoomMode, { x: number; y: number }> = {
  close: { x: -120, y: 190 },
  normal: { x: -70, y: 90 },
  overview: { x: 0, y: 0 },
};

export const BUILDINGS: Building[] = [
  { key: 'buy-sell', label: 'BUY / SELL', kind: 'shop', x: 880, y: 505, width: 350, height: 325 },
  { key: 'homes', label: 'HOMES', kind: 'homes', x: 1260, y: 490, width: 380, height: 340 },
  { key: 'plants', label: 'PLANTS', kind: 'plants', x: 1670, y: 510, width: 360, height: 320 },
  { key: 'starter-apartment', label: 'STARTER APARTMENT', kind: 'apartment', x: 2060, y: 465, width: 430, height: 365 },
];

export const BUY_SELL_ENTRANCE = { x: 1055, y: 885 };
export const POT_POSITION = { x: 785, y: 890 };
export const START_POSITION = { x: 635, y: 890 };
