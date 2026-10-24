import {
  BASIL_GROWTH_DURATION_MS,
  BASIL_HARVEST_PRICE,
  HOME_PLAYER_START,
  OPENING_POTHOS_SALE_PRICE,
  REPAIRED_POT_SALE_PRICE,
  RENTAL_BOND_COST,
  SHOP_PLAYER_START,
  START_POSITION,
  WINDOW_JOB_REWARD,
  getShopBuybackPrice,
  type ZoomMode,
} from './world';
import {
  BASIL_HARVEST_STOCK_ID,
  DEFAULT_SHOP_STOCK_QUALITY,
  DEFAULT_PROGRESS,
  OPENING_GOLDEN_POTHOS_INSTANCE_ID,
  SPECIAL_REPAIR_POT_INSTANCE_ID,
  sanitizeProgress,
  type ProgressState,
} from './progress';

export type DevCheckpointScene = 'street' | 'shop' | 'home';

export interface DevCheckpointSnapshot {
  id: string;
  label: string;
  order: number;
  scene: DevCheckpointScene;
  spawn: { x: number; y: number };
  zoom: ZoomMode;
  progress: ProgressState;
}

interface DevCheckpointDefinition extends Omit<DevCheckpointSnapshot, 'progress'> {
  build: () => ProgressState;
  crop: 'none' | 'growing' | 'mature';
}

const withState = (base: ProgressState, overrides: Partial<ProgressState>): ProgressState => sanitizeProgress({
  ...base,
  ...overrides,
  toolSlots: overrides.toolSlots ? [...overrides.toolSlots] : [...base.toolSlots],
});

const freshStart = (): ProgressState => sanitizeProgress(DEFAULT_PROGRESS);

const goldenPothosCollected = (): ProgressState => withState(freshStart(), {
  inventoryPot: 'ordinary',
  inventoryItem: 'small-golden-pothos',
  inventoryInstanceId: OPENING_GOLDEN_POTHOS_INSTANCE_ID,
  task: 'clean',
});

const firstPlantSold = (): ProgressState => withState(goldenPothosCollected(), {
  coins: OPENING_POTHOS_SALE_PRICE,
  inventoryPot: null,
  inventoryItem: null,
  inventoryInstanceId: null,
  saleComplete: true,
  shopGoldenPothosStock: true,
  shopStock: [{
    stockId: OPENING_GOLDEN_POTHOS_INSTANCE_ID,
    item: 'small-golden-pothos',
    quality: DEFAULT_SHOP_STOCK_QUALITY,
    condition: 'ordinary',
    quantity: 1,
    instanceIds: [OPENING_GOLDEN_POTHOS_INSTANCE_ID],
  }],
  task: 'clean',
});

const buybackStockReady = (): ProgressState => withState(firstPlantSold(), {
  coins: getShopBuybackPrice(OPENING_POTHOS_SALE_PRICE),
});

const windowJobAccepted = (): ProgressState => withState(firstPlantSold(), {
  windowJobAccepted: true,
  cleanerOwned: true,
  equippedTool: 'cleaner',
  toolSlots: ['cleaner', null, null],
  task: 'clean',
});

const windowJobComplete = (): ProgressState => withState(firstPlantSold(), {
  coins: OPENING_POTHOS_SALE_PRICE + WINDOW_JOB_REWARD,
  windowJobAccepted: false,
  windowCleaningProgress: 9,
  windowJobComplete: true,
  cleanerOwned: false,
  repairToolOwned: true,
  glueCharges: 1,
  equippedTool: 'repair',
  toolSlots: ['repair', null, null],
  brokenPotAvailable: true,
  brokenPotOwned: false,
  brokenPotPiecesRemaining: 3,
  task: 'repair',
});

const brokenSpecialPotCollected = (): ProgressState => withState(windowJobComplete(), {
  brokenPotAvailable: false,
  brokenPotOwned: true,
  brokenPotPiecesRemaining: 0,
  inventoryPot: 'broken',
  inventoryItem: 'special-repair-pot',
  inventoryInstanceId: SPECIAL_REPAIR_POT_INSTANCE_ID,
  repairStep: 0,
  task: 'repair',
});

const repairPartlyComplete = (): ProgressState => withState(brokenSpecialPotCollected(), {
  repairStep: 5,
  task: 'repair',
});

const specialPotRepaired = (): ProgressState => withState(brokenSpecialPotCollected(), {
  repairStep: 10,
  glueCharges: 0,
  task: 'repair',
});

const repairedPotSold = (): ProgressState => withState(specialPotRepaired(), {
  coins: OPENING_POTHOS_SALE_PRICE + WINDOW_JOB_REWARD + REPAIRED_POT_SALE_PRICE,
  inventoryPot: null,
  inventoryItem: null,
  inventoryInstanceId: null,
  repairedPotSaleComplete: true,
  shopStock: [
    ...specialPotRepaired().shopStock,
    {
      stockId: SPECIAL_REPAIR_POT_INSTANCE_ID,
      item: 'special-repair-pot',
      quality: DEFAULT_SHOP_STOCK_QUALITY,
      condition: 'repaired',
      quantity: 1,
      instanceIds: [SPECIAL_REPAIR_POT_INSTANCE_ID],
    },
  ],
  task: 'complete',
});

const apartmentRented = (): ProgressState => withState(repairedPotSold(), {
  coins: OPENING_POTHOS_SALE_PRICE + WINDOW_JOB_REWARD + REPAIRED_POT_SALE_PRICE - RENTAL_BOND_COST,
  rentalBondPaid: true,
  starterKitClaimed: false,
  starterKitGranted: false,
  task: 'complete',
});

const starterKitClaimed = (): ProgressState => withState(apartmentRented(), {
  starterKitClaimed: true,
  starterKitGranted: true,
  wateringCanOwned: true,
  toolSlots: ['repair', 'watering-can', null],
  basilSeeds: 1,
  basicFertilizerCharges: 1,
  task: 'place-pot',
});

const basilPlanted = (): ProgressState => withState(starterKitClaimed(), {
  starterPotPlaced: true,
  basilPlanted: true,
  basilSeeds: 0,
  basilGrowthStartedAt: null,
  basilCycleCount: 1,
  equippedTool: 'watering-can',
  task: 'water-basil',
});

const basilGrowing = (): ProgressState => withState(basilPlanted(), {
  basilGrowthStartedAt: Date.now(),
  task: 'grow-basil',
});

const basilMature = (): ProgressState => withState(basilGrowing(), {
  task: 'harvest-basil',
});

const basilHarvested = (): ProgressState => withState(basilPlanted(), {
  basilPlanted: false,
  basilGrowthStartedAt: null,
  basilHarvests: 1,
  task: 'sell-basil',
});

const firstBasilSaleComplete = (): ProgressState => withState(basilHarvested(), {
  coins: apartmentRented().coins + BASIL_HARVEST_PRICE,
  basilHarvests: 0,
  shopStock: [
    ...basilHarvested().shopStock,
    {
      stockId: BASIL_HARVEST_STOCK_ID,
      item: 'basil-harvest',
      quality: DEFAULT_SHOP_STOCK_QUALITY,
      condition: 'fresh',
      quantity: 1,
      instanceIds: [],
    },
  ],
  task: 'buy-seeds',
});

const definitions: DevCheckpointDefinition[] = [
  { id: 'fresh-start', label: 'Fresh start', order: 10, scene: 'street', spawn: START_POSITION, zoom: 'close', crop: 'none', build: freshStart },
  { id: 'golden-pothos-collected', label: 'Golden Pothos collected', order: 20, scene: 'street', spawn: START_POSITION, zoom: 'close', crop: 'none', build: goldenPothosCollected },
  { id: 'first-plant-sold', label: 'First plant sold', order: 30, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: firstPlantSold },
  { id: 'buyback-stock-ready', label: 'Buyback stock ready', order: 35, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: buybackStockReady },
  { id: 'window-job-accepted', label: 'Window-cleaning job accepted', order: 40, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: windowJobAccepted },
  { id: 'window-job-complete', label: 'Window-cleaning job complete', order: 50, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: windowJobComplete },
  { id: 'broken-special-pot-collected', label: 'Broken special pot collected', order: 60, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: brokenSpecialPotCollected },
  { id: 'repair-partly-complete', label: 'Repair partly complete', order: 70, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: repairPartlyComplete },
  { id: 'special-pot-repaired', label: 'Special pot repaired', order: 80, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: specialPotRepaired },
  { id: 'repaired-pot-sold', label: 'Repaired pot sold', order: 90, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: repairedPotSold },
  { id: 'apartment-rented', label: 'Apartment rented · starter kit unclaimed', order: 100, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: apartmentRented },
  { id: 'starter-kit-claimed', label: 'Starter kit claimed', order: 110, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: starterKitClaimed },
  { id: 'basil-planted', label: 'Basil planted · needs water', order: 120, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: basilPlanted },
  { id: 'basil-growing', label: 'Basil growing', order: 130, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'growing', build: basilGrowing },
  { id: 'basil-mature', label: 'Basil mature', order: 140, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'mature', build: basilMature },
  { id: 'basil-harvested', label: 'Basil harvested · ready to sell', order: 150, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: basilHarvested },
  { id: 'first-basil-sale', label: 'First basil sale complete · ready to buy seeds', order: 160, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: firstBasilSaleComplete },
];

function validateCheckpoint(id: string, progress: ProgressState): ProgressState {
  const result = sanitizeProgress(progress);
  if (result.coins < 0) throw new Error(`Developer checkpoint ${id} has negative coins.`);
  if (result.starterKitGranted && !result.starterKitClaimed) throw new Error(`Developer checkpoint ${id} grants an unclaimed kit.`);
  if (result.starterPotPlaced && !result.starterKitClaimed) throw new Error(`Developer checkpoint ${id} places an unavailable pot.`);
  if (result.basilPlanted && !result.starterPotPlaced) throw new Error(`Developer checkpoint ${id} plants an unplaced pot.`);
  if (result.basilGrowthStartedAt !== null && !result.basilPlanted) throw new Error(`Developer checkpoint ${id} grows an unplanted crop.`);
  if (result.equippedTool === 'cleaner' && !result.cleanerOwned) throw new Error(`Developer checkpoint ${id} equips an unavailable cleaner.`);
  if (result.equippedTool === 'repair' && !result.repairToolOwned) throw new Error(`Developer checkpoint ${id} equips an unavailable repair tool.`);
  if (result.equippedTool === 'watering-can' && !result.wateringCanOwned) throw new Error(`Developer checkpoint ${id} equips an unavailable watering can.`);
  const stockInstanceIds = new Set<string>();
  for (const entry of result.shopStock) {
    if (entry.quantity < 1) throw new Error(`Developer checkpoint ${id} contains empty shop stock.`);
    for (const instanceId of entry.instanceIds) {
      if (stockInstanceIds.has(instanceId)) throw new Error(`Developer checkpoint ${id} duplicates stock instance ${instanceId}.`);
      stockInstanceIds.add(instanceId);
    }
  }
  if (result.inventoryInstanceId && stockInstanceIds.has(result.inventoryInstanceId)) {
    throw new Error(`Developer checkpoint ${id} owns an instance also present in shop stock.`);
  }
  return result;
}

export const DEV_CHECKPOINTS: readonly DevCheckpointDefinition[] = definitions;

export function createDevCheckpoint(id: string): DevCheckpointSnapshot | null {
  const definition = definitions.find((candidate) => candidate.id === id);
  if (!definition) return null;
  const progress = validateCheckpoint(id, definition.build());
  if (definition.crop === 'growing') {
    progress.basilGrowthStartedAt = Date.now() - Math.max(1, BASIL_GROWTH_DURATION_MS / 2);
  } else if (definition.crop === 'mature') {
    progress.basilGrowthStartedAt = Date.now() - BASIL_GROWTH_DURATION_MS - 1;
  }
  return {
    id: definition.id,
    label: definition.label,
    order: definition.order,
    scene: definition.scene,
    spawn: { ...definition.spawn },
    zoom: definition.zoom,
    progress: validateCheckpoint(id, progress),
  };
}

export function getDevCheckpointOptions(): readonly Pick<DevCheckpointSnapshot, 'id' | 'label' | 'order'>[] {
  return definitions.map(({ id, label, order }) => ({ id, label, order }));
}
