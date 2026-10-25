import { createEmptyGrowingPot, MAX_ADDITIONAL_GROWING_POTS, STARTER_GROWING_POT_ID, type GrowingPotState } from './growing';
import { getPlantDefinition } from './plants';
import {
  BASIL_HARVEST_STOCK_ID,
  MINT_HARVEST_STOCK_ID,
  DEFAULT_SHOP_STOCK_QUALITY,
  DEFAULT_PROGRESS,
  OPENING_GOLDEN_POTHOS_INSTANCE_ID,
  sanitizeProgress,
  SPECIAL_REPAIR_POT_INSTANCE_ID,
  type ProgressState,
} from './progress';
import {
  BASIL_GROWTH_DURATION_MS,
  HOME_PLAYER_START,
  OPENING_POTHOS_SALE_PRICE,
  REPAIRED_POT_SALE_PRICE,
  RENTAL_BOND_COST,
  SECOND_RENTAL_MOVE_COST,
  SECOND_RENTAL_TOTAL_BOND,
  SHOP_PLAYER_START,
  START_POSITION,
  WINDOW_JOB_REWARD,
  getShopBuybackPrice,
  type ZoomMode,
} from './world';

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

const clonePots = (pots: GrowingPotState[]): GrowingPotState[] => pots.map((pot) => ({ ...pot, crop: pot.crop ? { ...pot.crop } : null }));
const withState = (base: ProgressState, overrides: Partial<ProgressState>): ProgressState => sanitizeProgress({
  ...base,
  ...overrides,
  growingPots: overrides.growingPots ? clonePots(overrides.growingPots) : clonePots(base.growingPots),
  seedQuantities: { ...base.seedQuantities, ...(overrides.seedQuantities ?? {}) },
  harvestQuantities: { ...base.harvestQuantities, ...(overrides.harvestQuantities ?? {}) },
  growingEvents: { ...base.growingEvents, ...(overrides.growingEvents ?? {}) },
  toolSlots: overrides.toolSlots ? [...overrides.toolSlots] : [...base.toolSlots],
  ownedPremiumPlants: overrides.ownedPremiumPlants ? [...overrides.ownedPremiumPlants] : [...base.ownedPremiumPlants],
});
const freshStart = (): ProgressState => sanitizeProgress(DEFAULT_PROGRESS);

const goldenPothosCollected = (): ProgressState => withState(freshStart(), {
  openingComplete: true,
  inventoryPot: 'ordinary', inventoryItem: 'small-golden-pothos', inventoryInstanceId: OPENING_GOLDEN_POTHOS_INSTANCE_ID, task: 'clean',
});

const bwShopSaleBeforeUpgrade = (): ProgressState => withState(goldenPothosCollected(), {
  task: 'sell',
});

const firstPlantSold = (): ProgressState => withState(goldenPothosCollected(), {
  coins: OPENING_POTHOS_SALE_PRICE, inventoryPot: null, inventoryItem: null, inventoryInstanceId: null, saleComplete: true, shopGoldenPothosStock: true,
  shopStock: [{ stockId: OPENING_GOLDEN_POTHOS_INSTANCE_ID, item: 'small-golden-pothos', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'ordinary', quantity: 1, instanceIds: [OPENING_GOLDEN_POTHOS_INSTANCE_ID] }], task: 'clean',
});

const buybackStockReady = (): ProgressState => withState(firstPlantSold(), { coins: getShopBuybackPrice(OPENING_POTHOS_SALE_PRICE) });

const windowJobAccepted = (): ProgressState => withState(firstPlantSold(), { windowJobAccepted: true, cleanerOwned: true, equippedTool: 'cleaner', toolSlots: ['cleaner', null, null], task: 'clean' });

const windowJobComplete = (): ProgressState => withState(firstPlantSold(), {
  coins: OPENING_POTHOS_SALE_PRICE + WINDOW_JOB_REWARD, windowJobAccepted: false, windowCleaningProgress: 9, windowJobComplete: true,
  cleanerOwned: false, repairToolOwned: true, glueCharges: 1, equippedTool: 'repair', toolSlots: ['repair', null, null], brokenPotAvailable: true, brokenPotOwned: false, brokenPotPiecesRemaining: 3, task: 'repair',
});

const brokenSpecialPotCollected = (): ProgressState => withState(windowJobComplete(), {
  brokenPotAvailable: false, brokenPotOwned: true, brokenPotPiecesRemaining: 0, inventoryPot: 'broken', inventoryItem: 'special-repair-pot', inventoryInstanceId: SPECIAL_REPAIR_POT_INSTANCE_ID, repairStep: 0, task: 'repair',
});

const repairPartlyComplete = (): ProgressState => withState(brokenSpecialPotCollected(), { repairStep: 5, task: 'repair' });
const repairOneActionBeforeCompletion = (): ProgressState => withState(brokenSpecialPotCollected(), { repairStep: 9, task: 'repair' });
const specialPotRepaired = (): ProgressState => withState(brokenSpecialPotCollected(), { repairStep: 10, glueCharges: 0, task: 'repair' });
const repairedSpecialPotCollected = (): ProgressState => withState(specialPotRepaired(), {
  inventoryPot: 'repaired', inventoryItem: 'special-repair-pot', inventoryInstanceId: SPECIAL_REPAIR_POT_INSTANCE_ID, task: 'sell-repaired',
});
const upgradePromptPending = (): ProgressState => withState(repairedSpecialPotCollected(), {
  graphicsUpgradeUnlocked: true, graphicsUpgradeInstalled: false, graphicsUpgradeStage: 'prompt', alexGraphics: 'atari-bw', nurseryConstructionComplete: false,
});
const upgradeInstalledAcknowledged = (): ProgressState => withState(repairedSpecialPotCollected(), {
  graphicsUpgradeUnlocked: true, graphicsUpgradeInstalled: true, graphicsUpgradeStage: 'none', alexGraphics: 'green-screen', nurseryConstructionComplete: true,
});

const repairedPotSold = (): ProgressState => withState(upgradeInstalledAcknowledged(), {
  coins: OPENING_POTHOS_SALE_PRICE + WINDOW_JOB_REWARD + REPAIRED_POT_SALE_PRICE, inventoryPot: null, inventoryItem: null, inventoryInstanceId: null, repairedPotSaleComplete: true,
  shopStock: [...specialPotRepaired().shopStock, { stockId: SPECIAL_REPAIR_POT_INSTANCE_ID, item: 'special-repair-pot', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'repaired', quantity: 1, instanceIds: [SPECIAL_REPAIR_POT_INSTANCE_ID] }], task: 'complete',
});

const upgradedShopItemsReadyToSell = (): ProgressState => withState(repairedPotSold(), {
  starterKitClaimed: true,
  starterKitGranted: true,
  wateringCanOwned: true,
  toolSlots: ['repair', 'watering-can', null],
  harvestQuantities: { basil: 2, mint: 2 },
  task: 'sell-basil',
});

const upgradedShopStockReadyToBuy = (): ProgressState => withState(repairedPotSold(), {
  coins: getShopBuybackPrice(REPAIRED_POT_SALE_PRICE) + getShopBuybackPrice(OPENING_POTHOS_SALE_PRICE),
  task: 'buy-seeds',
});

const multipleMatchingHarvestUnits = (): ProgressState => {
  const base = upgradedShopItemsReadyToSell();
  return withState(base, {
    harvestQuantities: { basil: 0, mint: 0 },
    shopStock: [
      ...base.shopStock,
      { stockId: BASIL_HARVEST_STOCK_ID, item: 'fresh-basil-leaves', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'fresh', quantity: 7, instanceIds: [] },
      { stockId: MINT_HARVEST_STOCK_ID, item: 'fresh-mint-leaves', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'fresh', quantity: 7, instanceIds: [] },
    ],
    task: 'buy-seeds',
  });
};

const apartmentRented = (): ProgressState => withState(repairedPotSold(), {
  coins: OPENING_POTHOS_SALE_PRICE + WINDOW_JOB_REWARD + REPAIRED_POT_SALE_PRICE - RENTAL_BOND_COST, rentalBondPaid: true, rentalKeyOwned: true, starterKitClaimed: false, starterKitGranted: false, growingPots: [], task: 'complete',
});

const starterKitClaimed = (): ProgressState => withState(apartmentRented(), {
  starterKitClaimed: true, starterKitGranted: true, wateringCanOwned: true, toolSlots: ['repair', 'watering-can', null],
  seedQuantities: { basil: 1, mint: 1 }, basicFertilizerCharges: 1, growingPots: [createEmptyGrowingPot(STARTER_GROWING_POT_ID)], task: 'place-pot',
});

const starterPotWithCrop = (species: 'basil' | 'mint', stage: 'planted' | 'seedling' | 'mature', startedAt: number | null): ProgressState => {
  const base = starterKitClaimed();
  const pot = createEmptyGrowingPot(STARTER_GROWING_POT_ID, 1);
  pot.crop = { species, stage, wateredAt: startedAt, growthStartedAt: startedAt };
  return withState(base, {
    growingPots: [pot], seedQuantities: { basil: species === 'basil' ? 0 : 1, mint: species === 'mint' ? 0 : 1 },
    growingEvents: { basil: species === 'basil' ? 1 : 0, mint: 0 }, task: species === 'basil' ? stage === 'planted' ? 'water-basil' : stage === 'mature' ? 'harvest-basil' : 'grow-basil' : 'water-mint',
  });
};

const basilPlanted = (): ProgressState => starterPotWithCrop('basil', 'planted', null);
const basilGrowing = (): ProgressState => starterPotWithCrop('basil', 'seedling', Date.now());
const basilMature = (): ProgressState => starterPotWithCrop('basil', 'mature', Date.now() - BASIL_GROWTH_DURATION_MS - 1);
const basilHarvested = (): ProgressState => withState(basilPlanted(), {
  growingPots: [createEmptyGrowingPot(STARTER_GROWING_POT_ID, 1)], harvestQuantities: { basil: 1, mint: 0 }, task: 'sell-basil',
});
const firstBasilSaleComplete = (): ProgressState => withState(basilHarvested(), {
  coins: apartmentRented().coins + getPlantDefinition('basil').harvestPrice, harvestQuantities: { basil: 0, mint: 0 },
  shopStock: [...basilHarvested().shopStock, { stockId: BASIL_HARVEST_STOCK_ID, item: 'fresh-basil-leaves', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'fresh', quantity: 1, instanceIds: [] }], task: 'buy-seeds',
  basilHarvestSaleRecorded: true,
});

const secondRentalEligibleBase = (): ProgressState => withState(starterKitClaimed(), {
  coins: SECOND_RENTAL_MOVE_COST,
  basilHarvestSaleRecorded: true,
  mintHarvestSaleRecorded: true,
  growingEvents: { basil: 1, mint: 1 },
  task: 'move-rental',
});

const secondRentalEligibleInsufficient = (): ProgressState => withState(secondRentalEligibleBase(), { coins: 20 });
const secondRentalEligibleSufficient = (): ProgressState => secondRentalEligibleBase();

const readyToMoveMixedPots = (): ProgressState => {
  const base = secondRentalEligibleSufficient();
  const basil = createEmptyGrowingPot(STARTER_GROWING_POT_ID, 0);
  basil.crop = { species: 'basil', stage: 'seedling', wateredAt: Date.now(), growthStartedAt: Date.now() };
  const mint = createEmptyGrowingPot('growing-pot-2', 1);
  mint.crop = { species: 'mint', stage: 'mature', wateredAt: Date.now() - getPlantDefinition('mint').growthDurationMs - 1, growthStartedAt: Date.now() - getPlantDefinition('mint').growthDurationMs - 1 };
  return withState(base, { growingPots: [basil, mint, createEmptyGrowingPot('growing-pot-3', 2)] });
};

const secondRentalOccupied = (): ProgressState => withState(readyToMoveMixedPots(), {
  coins: 0,
  activeProperty: 'second-rental',
  rentalBondTotal: SECOND_RENTAL_TOTAL_BOND,
  task: 'complete',
});

const sixGrowingPositionsMixed = (): ProgressState => withState(secondRentalOccupied(), {
  growingPots: [
    readyToMoveMixedPots().growingPots[0],
    readyToMoveMixedPots().growingPots[1],
    createEmptyGrowingPot('growing-pot-3', 2),
    createEmptyGrowingPot('growing-pot-4', 3),
    createEmptyGrowingPot('growing-pot-5', 4),
    createEmptyGrowingPot('growing-pot-6', 5),
  ],
});

const threePotsReady = (): ProgressState => withState(starterKitClaimed(), {
  coins: apartmentRented().coins, additionalGrowingPotsPurchased: MAX_ADDITIONAL_GROWING_POTS,
  growingPots: [createEmptyGrowingPot(STARTER_GROWING_POT_ID, 0), createEmptyGrowingPot('growing-pot-2', 1), createEmptyGrowingPot('growing-pot-3', 2)],
  seedQuantities: { basil: 1, mint: 2 }, task: 'plant-basil',
});

const mintGrowing = (): ProgressState => {
  const base = threePotsReady();
  const mintPot = createEmptyGrowingPot('growing-pot-2', 1);
  mintPot.crop = { species: 'mint', stage: 'seedling', wateredAt: Date.now(), growthStartedAt: Date.now() };
  return withState(base, { growingPots: [base.growingPots[0], mintPot, base.growingPots[2]], seedQuantities: { basil: 1, mint: 1 }, growingEvents: { basil: 0, mint: 1 }, task: 'grow-mint' });
};

const mintMature = (): ProgressState => {
  const base = mintGrowing();
  const mintPot = base.growingPots.find((pot) => pot.id === 'growing-pot-2');
  if (mintPot?.crop) mintPot.crop.growthStartedAt = Date.now() - getPlantDefinition('mint').growthDurationMs - 1;
  return withState(base, { task: 'harvest-mint' });
};

const definitions: DevCheckpointDefinition[] = [
  { id: 'fresh-start', label: 'Fresh start', order: 10, scene: 'street', spawn: START_POSITION, zoom: 'close', crop: 'none', build: freshStart },
  { id: 'golden-pothos-collected', label: 'Golden Pothos collected', order: 20, scene: 'street', spawn: START_POSITION, zoom: 'close', crop: 'none', build: goldenPothosCollected },
  { id: 'bw-shop-sale-before-upgrade', label: 'B&W shop sale before graphics upgrade', order: 25, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: bwShopSaleBeforeUpgrade },
  { id: 'first-plant-sold', label: 'First plant sold', order: 30, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: firstPlantSold },
  { id: 'buyback-stock-ready', label: 'Buyback stock ready', order: 35, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: buybackStockReady },
  { id: 'window-job-accepted', label: 'Window-cleaning job accepted', order: 40, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: windowJobAccepted },
  { id: 'window-job-complete', label: 'Window-cleaning job complete', order: 50, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: windowJobComplete },
  { id: 'broken-special-pot-collected', label: 'Broken special pot collected', order: 60, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: brokenSpecialPotCollected },
  { id: 'repair-partly-complete', label: 'Repair partly complete', order: 70, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: repairPartlyComplete },
  { id: 'repair-one-action-before-completion', label: 'Repair one action before completion', order: 75, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: repairOneActionBeforeCompletion },
  { id: 'special-pot-repaired', label: 'Special pot repaired', order: 80, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: specialPotRepaired },
  { id: 'graphics-upgrade-prompt-pending', label: 'Graphics upgrade prompt pending', order: 85, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: upgradePromptPending },
  { id: 'graphics-upgrade-installed', label: 'Graphics upgrade installed and acknowledged', order: 87, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: upgradeInstalledAcknowledged },
  { id: 'repaired-pot-sold', label: 'Repaired pot sold', order: 90, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: repairedPotSold },
  { id: 'upgraded-shop-items-ready-to-sell', label: 'Upgraded shop · items ready to sell', order: 92, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: upgradedShopItemsReadyToSell },
  { id: 'upgraded-shop-stock-ready-to-buy', label: 'Upgraded shop stock ready to buy back', order: 93, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: upgradedShopStockReadyToBuy },
  { id: 'multiple-matching-harvest-units', label: 'Multiple matching harvest units', order: 94, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: multipleMatchingHarvestUnits },
  { id: 'apartment-rented', label: 'Apartment rented · starter kit unclaimed', order: 100, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: apartmentRented },
  { id: 'starter-kit-claimed', label: 'Starter kit claimed', order: 110, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: starterKitClaimed },
  { id: 'three-growing-pots-ready', label: 'Three growing pots ready', order: 115, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: threePotsReady },
  { id: 'mint-growing', label: 'Mint growing in the second pot', order: 125, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'growing', build: mintGrowing },
  { id: 'mint-mature', label: 'Mint mature', order: 135, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'mature', build: mintMature },
  { id: 'basil-planted', label: 'Basil planted · needs water', order: 120, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: basilPlanted },
  { id: 'basil-growing', label: 'Basil growing', order: 130, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'growing', build: basilGrowing },
  { id: 'basil-mature', label: 'Basil mature', order: 140, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'mature', build: basilMature },
  { id: 'basil-harvested', label: 'Basil harvested · ready to sell', order: 150, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: basilHarvested },
  { id: 'first-basil-sale', label: 'First basil sale complete · ready to buy seeds', order: 160, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: firstBasilSaleComplete },
  { id: 'second-rental-eligible-insufficient', label: 'Second rental eligible · insufficient coins', order: 170, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: secondRentalEligibleInsufficient },
  { id: 'second-rental-eligible-sufficient', label: 'Second rental eligible · sufficient coins', order: 171, scene: 'street', spawn: START_POSITION, zoom: 'normal', crop: 'none', build: secondRentalEligibleSufficient },
  { id: 'ready-to-move-mixed-pots', label: 'Ready to move · mixed empty, growing and mature pots', order: 172, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'growing', build: readyToMoveMixedPots },
  { id: 'second-rental-occupied', label: 'Second rental occupied', order: 173, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: secondRentalOccupied },
  { id: 'six-growing-positions-mixed', label: 'Six growing positions · mixed basil and mint', order: 174, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: sixGrowingPositionsMixed },
];

function validateCheckpoint(id: string, progress: ProgressState): ProgressState {
  const result = sanitizeProgress(progress);
  if (result.coins < 0) throw new Error(`Developer checkpoint ${id} has negative coins.`);
  if (result.rentalBondPaid && !result.rentalKeyOwned) throw new Error(`Developer checkpoint ${id} rents an apartment without its key.`);
  if (result.activeProperty === 'second-rental' && result.rentalBondTotal !== SECOND_RENTAL_TOTAL_BOND) throw new Error(`Developer checkpoint ${id} has an invalid second-rental bond.`);
  if (result.starterKitGranted && !result.starterKitClaimed) throw new Error(`Developer checkpoint ${id} grants an unclaimed kit.`);
  const ids = new Set<string>(); const slots = new Set<number>();
  for (const pot of result.growingPots) {
    if (ids.has(pot.id)) throw new Error(`Developer checkpoint ${id} duplicates pot ${pot.id}.`);
    ids.add(pot.id);
    if (pot.slot !== null && slots.has(pot.slot)) throw new Error(`Developer checkpoint ${id} overlaps growing slots.`);
    if (pot.slot !== null) slots.add(pot.slot);
    if (pot.crop && pot.crop.stage !== 'planted' && pot.crop.growthStartedAt === null) throw new Error(`Developer checkpoint ${id} has an unwatered growing crop.`);
  }
  if (result.equippedTool === 'cleaner' && !result.cleanerOwned) throw new Error(`Developer checkpoint ${id} equips an unavailable cleaner.`);
  if (result.equippedTool === 'repair' && !result.repairToolOwned) throw new Error(`Developer checkpoint ${id} equips an unavailable repair tool.`);
  if (result.equippedTool === 'watering-can' && !result.wateringCanOwned) throw new Error(`Developer checkpoint ${id} equips an unavailable watering can.`);
  const stockIds = new Set<string>();
  for (const entry of result.shopStock) for (const instanceId of entry.instanceIds) { if (stockIds.has(instanceId)) throw new Error(`Developer checkpoint ${id} duplicates stock instance ${instanceId}.`); stockIds.add(instanceId); }
  if (result.inventoryInstanceId && stockIds.has(result.inventoryInstanceId)) throw new Error(`Developer checkpoint ${id} owns stock instance ${result.inventoryInstanceId}.`);
  return result;
}

export const DEV_CHECKPOINTS: readonly DevCheckpointDefinition[] = definitions;

export function createDevCheckpoint(id: string): DevCheckpointSnapshot | null {
  const definition = definitions.find((candidate) => candidate.id === id);
  if (!definition) return null;
  const progress = validateCheckpoint(id, definition.build());
  const crop = progress.growingPots.find((pot) => pot.crop?.growthStartedAt !== null)?.crop;
  if (crop && definition.crop === 'growing') crop.growthStartedAt = Date.now() - Math.max(1, getPlantDefinition(crop.species).growthDurationMs / 2);
  if (crop && definition.crop === 'mature') crop.growthStartedAt = Date.now() - getPlantDefinition(crop.species).growthDurationMs - 1;
  return { id: definition.id, label: definition.label, order: definition.order, scene: definition.scene, spawn: { ...definition.spawn }, zoom: definition.zoom, progress: validateCheckpoint(id, progress) };
}

export function getDevCheckpointOptions(): readonly Pick<DevCheckpointSnapshot, 'id' | 'label' | 'order'>[] { return definitions.map(({ id, label, order }) => ({ id, label, order })); }
