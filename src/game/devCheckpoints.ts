import { createEmptyGrowingPot, MAX_ADDITIONAL_GROWING_POTS, STARTER_GROWING_POT_ID, type GrowingPotState } from './growing';
import { getPlantDefinition, type PlantSpecies } from './plants';
import {
  BASIL_HARVEST_STOCK_ID,
  MINT_HARVEST_STOCK_ID,
  DEFAULT_SHOP_STOCK_QUALITY,
  DEFAULT_PROGRESS,
  OPENING_GOLDEN_POTHOS_INSTANCE_ID,
  RARE_SPOTTED_BEGONIA_INSTANCE_ID,
  sanitizeProgress,
  SPECIAL_REPAIR_POT_INSTANCE_ID,
  type ProgressState,
} from './progress';
import {
  BASIL_GROWTH_DURATION_MS,
  BASIL_DELIVERY_REWARD,
  BASIC_FERTILIZER_BOX_PRICE,
  HOME_PLAYER_START,
  SECOND_HOME_PLAYER_START,
  OPENING_POTHOS_SALE_PRICE,
  OPENING_POTHOS_DELIVERY_REWARD,
  POT_POSITION,
  RARE_BEGONIA_POSITION,
  RARE_BEGONIA_SALE_PRICE,
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

type ProgressOverrides = Omit<Partial<ProgressState>, 'seedQuantities' | 'harvestQuantities' | 'growingEvents'> & {
  seedQuantities?: Partial<Record<PlantSpecies, number>>;
  harvestQuantities?: Partial<Record<PlantSpecies, number>>;
  growingEvents?: Partial<Record<PlantSpecies, number>>;
};

const clonePots = (pots: GrowingPotState[]): GrowingPotState[] => pots.map((pot) => ({ ...pot, crop: pot.crop ? { ...pot.crop } : null }));
const cloneBuildings = (buildings: ProgressState['buildings']): ProgressState['buildings'] => ({
  'buy-sell': { ...buildings['buy-sell'] },
  'starter-apartment': { ...buildings['starter-apartment'] },
  'real-estate': { ...buildings['real-estate'] },
  nursery: { ...buildings.nursery },
});
const withState = (base: ProgressState, overrides: ProgressOverrides): ProgressState => sanitizeProgress({
  ...base,
  ...overrides,
  buildings: {
    'buy-sell': { ...base.buildings['buy-sell'], ...overrides.buildings?.['buy-sell'] },
    'starter-apartment': { ...base.buildings['starter-apartment'], ...overrides.buildings?.['starter-apartment'] },
    'real-estate': { ...base.buildings['real-estate'], ...overrides.buildings?.['real-estate'] },
    nursery: { ...base.buildings.nursery, ...overrides.buildings?.nursery },
  },
  growingPots: overrides.growingPots ? clonePots(overrides.growingPots) : clonePots(base.growingPots),
  seedQuantities: { ...base.seedQuantities, ...(overrides.seedQuantities ?? {}) },
  harvestQuantities: { ...base.harvestQuantities, ...(overrides.harvestQuantities ?? {}) },
  growingEvents: { ...base.growingEvents, ...(overrides.growingEvents ?? {}) },
  toolSlots: overrides.toolSlots ? [...overrides.toolSlots] : [...base.toolSlots],
  ownedPremiumPlants: overrides.ownedPremiumPlants ? [...overrides.ownedPremiumPlants] : [...base.ownedPremiumPlants],
});
// Keep this fixture explicitly before the opening milestone so its next
// action exercises the intro popup followed by Alex's descent.
const freshStart = (): ProgressState => sanitizeProgress({ ...DEFAULT_PROGRESS, openingComplete: false });

const goldenPothosReadyToCollect = (): ProgressState => withState(freshStart(), {
  openingComplete: true,
  openingGoldenPothosCollected: false,
  buildings: cloneBuildings(DEFAULT_PROGRESS.buildings),
  task: 'find',
});

const goldenPothosCollected = (): ProgressState => withState(goldenPothosReadyToCollect(), {
  openingComplete: true,
  openingGoldenPothosCollected: true,
  buildings: {
    ...cloneBuildings(DEFAULT_PROGRESS.buildings),
    'buy-sell': { operationalState: 'operational', graphicsEra: 'green-crt' },
  },
  inventoryPot: 'ordinary', inventoryItem: 'small-golden-pothos', inventoryInstanceId: OPENING_GOLDEN_POTHOS_INSTANCE_ID, task: 'clean',
});

const greenCrtShopSaleBeforeRepairedUpgrade = (): ProgressState => withState(goldenPothosCollected(), {
  task: 'sell',
});

const firstPlantSold = (): ProgressState => withState(goldenPothosCollected(), {
  coins: OPENING_POTHOS_DELIVERY_REWARD, inventoryPot: null, inventoryItem: null, inventoryInstanceId: null, saleComplete: true, shopGoldenPothosStock: true,
  shopStock: [{ stockId: OPENING_GOLDEN_POTHOS_INSTANCE_ID, item: 'small-golden-pothos', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'ordinary', quantity: 1, instanceIds: [OPENING_GOLDEN_POTHOS_INSTANCE_ID] }], task: 'clean',
});

const buybackStockReady = (): ProgressState => withState(firstPlantSold(), { coins: getShopBuybackPrice(OPENING_POTHOS_SALE_PRICE) });

const windowJobAccepted = (): ProgressState => withState(firstPlantSold(), { windowJobAccepted: true, cleanerOwned: true, equippedTool: 'cleaner', toolSlots: ['cleaner', null, null], task: 'clean' });

const windowJobComplete = (): ProgressState => withState(firstPlantSold(), {
  coins: OPENING_POTHOS_DELIVERY_REWARD + WINDOW_JOB_REWARD, windowJobAccepted: false, windowCleaningProgress: 6, windowJobComplete: true,
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
  graphicsUpgradeUnlocked: true, graphicsUpgradeInstalled: true, graphicsUpgradeStage: 'none', alexGraphics: 'green-screen', nurseryConstructionComplete: false,
  buildings: {
    ...cloneBuildings(repairedSpecialPotCollected().buildings),
    'buy-sell': { operationalState: 'operational', graphicsEra: 'atari-colour' },
    nursery: { operationalState: 'vacant', graphicsEra: 'atari-bw' },
  },
});
const nurseryVacantView = (): ProgressState => withState(upgradeInstalledAcknowledged(), {
  nurseryConstructionComplete: false,
  buildings: { ...cloneBuildings(upgradeInstalledAcknowledged().buildings), nursery: { operationalState: 'vacant', graphicsEra: 'atari-bw' } },
});
const nurseryConstructionView = (): ProgressState => withState(upgradeInstalledAcknowledged(), {
  nurseryConstructionComplete: false,
  buildings: { ...cloneBuildings(upgradeInstalledAcknowledged().buildings), nursery: { operationalState: 'under-construction', graphicsEra: 'green-crt' } },
});
const nurseryOpenView = (): ProgressState => withState(upgradeInstalledAcknowledged(), {
  nurseryConstructionComplete: true,
  buildings: { ...cloneBuildings(upgradeInstalledAcknowledged().buildings), nursery: { operationalState: 'operational', graphicsEra: 'atari-colour' } },
});

const repairedPotSold = (): ProgressState => withState(upgradeInstalledAcknowledged(), {
  coins: OPENING_POTHOS_DELIVERY_REWARD + WINDOW_JOB_REWARD + REPAIRED_POT_SALE_PRICE, inventoryPot: null, inventoryItem: null, inventoryInstanceId: null, repairedPotSaleComplete: true,
  shopStock: [...specialPotRepaired().shopStock, { stockId: SPECIAL_REPAIR_POT_INSTANCE_ID, item: 'special-repair-pot', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'repaired', quantity: 1, instanceIds: [SPECIAL_REPAIR_POT_INSTANCE_ID] }], task: 'complete',
});

const rareBegoniaReady = (): ProgressState => withState(repairedPotSold(), {
  rareBegoniaCollected: false,
  rareBegoniaSold: false,
});

const rareBegoniaCollected = (): ProgressState => withState(rareBegoniaReady(), {
  rareBegoniaCollected: true,
  inventoryPot: 'ordinary',
  inventoryItem: 'rare-spotted-begonia',
  inventoryInstanceId: RARE_SPOTTED_BEGONIA_INSTANCE_ID,
});

const rareBegoniaSold = (): ProgressState => {
  const base = rareBegoniaReady();
  return withState(base, {
    coins: base.coins + RARE_BEGONIA_SALE_PRICE,
    rareBegoniaCollected: true,
    rareBegoniaSold: true,
    inventoryPot: null,
    inventoryItem: null,
    inventoryInstanceId: null,
    shopStock: [...base.shopStock, {
      stockId: RARE_SPOTTED_BEGONIA_INSTANCE_ID,
      item: 'rare-spotted-begonia',
      quality: DEFAULT_SHOP_STOCK_QUALITY,
      condition: 'ordinary',
      quantity: 1,
      instanceIds: [RARE_SPOTTED_BEGONIA_INSTANCE_ID],
    }],
  });
};

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

const apartmentRented = (): ProgressState => withState(rareBegoniaSold(), {
  coins: rareBegoniaSold().coins - RENTAL_BOND_COST, rentalBondPaid: true, rentalKeyOwned: true, starterKitClaimed: false, starterKitGranted: false, growingPots: [], task: 'complete',
});

const starterKitClaimed = (): ProgressState => withState(apartmentRented(), {
  starterKitClaimed: true, starterKitGranted: true, wateringCanOwned: true, toolSlots: ['repair', 'watering-can', null],
  seedQuantities: { basil: 1, mint: 1 }, basicFertilizerCharges: 1, growingPots: [createEmptyGrowingPot(STARTER_GROWING_POT_ID)], task: 'place-pot',
});

const fertilizerBoxReadyToBuy = (): ProgressState => withState(starterKitClaimed(), {
  coins: BASIC_FERTILIZER_BOX_PRICE,
  basicFertilizerCharges: 0,
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
  coins: apartmentRented().coins + BASIL_DELIVERY_REWARD, harvestQuantities: { basil: 0, mint: 0 },
  shopStock: [...basilHarvested().shopStock, { stockId: BASIL_HARVEST_STOCK_ID, item: 'fresh-basil-leaves', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'fresh', quantity: 1, instanceIds: [] }], task: 'buy-seeds',
  basilHarvestSaleRecorded: true, basilDeliveryComplete: true,
});

const secondRentalEligibleBase = (): ProgressState => withState(starterKitClaimed(), {
  coins: SECOND_RENTAL_MOVE_COST,
  basilHarvestSaleRecorded: true,
  basilDeliveryComplete: true,
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

const wholePlantWithCrop = (species: 'dwarf-marigold' | 'peace-lily', stage: 'seedling' | 'mature'): ProgressState => {
  const base = secondRentalOccupied();
  const pot = createEmptyGrowingPot('whole-plant-test-pot', 0);
  const startedAt = stage === 'mature'
    ? Date.now() - getPlantDefinition(species).growthDurationMs - 1
    : Date.now();
  pot.crop = { species, stage, wateredAt: startedAt, growthStartedAt: startedAt };
  return withState(base, {
    growingPots: [pot, createEmptyGrowingPot('whole-plant-spare-pot', 1)],
    seedQuantities: { [species]: 0 },
    growingEvents: { [species]: 1 },
    task: stage === 'mature'
      ? species === 'dwarf-marigold' ? 'lift-dwarf-marigold' : 'lift-peace-lily'
      : species === 'dwarf-marigold' ? 'grow-dwarf-marigold' : 'grow-peace-lily',
  });
};

const dwarfMarigoldMature = (): ProgressState => wholePlantWithCrop('dwarf-marigold', 'mature');
const peaceLilyMature = (): ProgressState => wholePlantWithCrop('peace-lily', 'mature');
const wholePlantLifted = (species: 'dwarf-marigold' | 'peace-lily'): ProgressState => withState(wholePlantWithCrop(species, 'mature'), {
  growingPots: [createEmptyGrowingPot('whole-plant-spare-pot', 1)],
  harvestQuantities: { [species]: 1 },
  task: species === 'dwarf-marigold' ? 'sell-dwarf-marigold' : 'sell-peace-lily',
});
const dwarfMarigoldLifted = (): ProgressState => wholePlantLifted('dwarf-marigold');
const peaceLilyLifted = (): ProgressState => wholePlantLifted('peace-lily');
const fertilizerThirtySecondTest = (): ProgressState => withState(wholePlantWithCrop('peace-lily', 'seedling'), {
  basicFertilizerCharges: 1,
});

const definitions: DevCheckpointDefinition[] = [
  { id: 'fresh-start', label: 'Fresh start · opening intro', order: 10, scene: 'street', spawn: START_POSITION, zoom: 'close', crop: 'none', build: freshStart },
  { id: 'golden-pothos-ready-to-collect', label: 'Golden Pothos · ready to collect', order: 15, scene: 'street', spawn: { x: POT_POSITION.x - 90, y: POT_POSITION.y }, zoom: 'close', crop: 'none', build: goldenPothosReadyToCollect },
  { id: 'golden-pothos-collected', label: 'Golden Pothos collected', order: 20, scene: 'street', spawn: START_POSITION, zoom: 'close', crop: 'none', build: goldenPothosCollected },
  { id: 'green-crt-shop-sale-before-repaired-upgrade', label: 'Green CRT shop sale before repaired-pot upgrade', order: 25, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: greenCrtShopSaleBeforeRepairedUpgrade },
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
  { id: 'nursery-vacant-view', label: 'Nursery artwork · vacant Atari B&W', order: 88, scene: 'street', spawn: { x: 2050, y: 875 }, zoom: 'normal', crop: 'none', build: nurseryVacantView },
  { id: 'nursery-construction-view', label: 'Nursery artwork · Green CRT construction', order: 89, scene: 'street', spawn: { x: 2050, y: 875 }, zoom: 'normal', crop: 'none', build: nurseryConstructionView },
  { id: 'nursery-open-view', label: 'Nursery artwork · open Atari Colour', order: 90, scene: 'street', spawn: { x: 2050, y: 875 }, zoom: 'normal', crop: 'none', build: nurseryOpenView },
  { id: 'repaired-pot-sold', label: 'Repaired pot sold', order: 91, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: repairedPotSold },
  { id: 'upgraded-shop-items-ready-to-sell', label: 'Upgraded shop · items ready to sell', order: 92, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: upgradedShopItemsReadyToSell },
  { id: 'upgraded-shop-stock-ready-to-buy', label: 'Upgraded shop stock ready to buy back', order: 93, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: upgradedShopStockReadyToBuy },
  { id: 'multiple-matching-harvest-units', label: 'Multiple matching harvest units', order: 94, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: multipleMatchingHarvestUnits },
  { id: 'rare-begonia-ready', label: 'Rare Spotted Begonia · ready to find', order: 95, scene: 'street', spawn: { x: RARE_BEGONIA_POSITION.x - 100, y: RARE_BEGONIA_POSITION.y }, zoom: 'close', crop: 'none', build: rareBegoniaReady },
  { id: 'rare-begonia-collected', label: 'Rare Spotted Begonia collected · ready to sell', order: 96, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: rareBegoniaCollected },
  { id: 'rare-begonia-sold', label: 'Rare Spotted Begonia sold', order: 97, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: rareBegoniaSold },
  { id: 'apartment-rented', label: 'Apartment rented · starter kit unclaimed', order: 100, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: apartmentRented },
  { id: 'starter-kit-claimed', label: 'Starter kit claimed', order: 110, scene: 'home', spawn: HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: starterKitClaimed },
  { id: 'fertilizer-box-ready-to-buy', label: 'Basic Fertiliser box · ready to buy', order: 112, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: fertilizerBoxReadyToBuy },
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
  { id: 'second-rental-occupied', label: 'Second rental occupied', order: 173, scene: 'home', spawn: SECOND_HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: secondRentalOccupied },
  { id: 'six-growing-positions-mixed', label: 'Six growing positions · mixed basil and mint', order: 174, scene: 'home', spawn: SECOND_HOME_PLAYER_START, zoom: 'normal', crop: 'none', build: sixGrowingPositionsMixed },
  { id: 'dwarf-marigold-mature', label: 'Dwarf Marigold mature · ready to lift', order: 180, scene: 'home', spawn: SECOND_HOME_PLAYER_START, zoom: 'normal', crop: 'mature', build: dwarfMarigoldMature },
  { id: 'dwarf-marigold-lifted', label: 'Potted Dwarf Marigold · ready to sell', order: 181, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: dwarfMarigoldLifted },
  { id: 'peace-lily-mature', label: 'Peace Lily mature · ready to lift', order: 182, scene: 'home', spawn: SECOND_HOME_PLAYER_START, zoom: 'normal', crop: 'mature', build: peaceLilyMature },
  { id: 'peace-lily-lifted', label: 'Potted Peace Lily · ready to sell', order: 183, scene: 'shop', spawn: SHOP_PLAYER_START, zoom: 'normal', crop: 'none', build: peaceLilyLifted },
  { id: 'fertilizer-thirty-second-test', label: 'Peace Lily growing · test 30-second fertiliser', order: 184, scene: 'home', spawn: SECOND_HOME_PLAYER_START, zoom: 'normal', crop: 'growing', build: fertilizerThirtySecondTest },
];

function validateCheckpoint(id: string, progress: ProgressState): ProgressState {
  const result = sanitizeProgress(progress);
  if (result.openingGoldenPothosCollected && result.buildings['buy-sell'].graphicsEra === 'atari-bw') throw new Error(`Developer checkpoint ${id} collected the opening Pothos without upgrading Buy/Sell.`);
  if (result.graphicsUpgradeInstalled && result.buildings['buy-sell'].graphicsEra !== 'atari-colour') throw new Error(`Developer checkpoint ${id} installed the repaired-pot upgrade without advancing Buy/Sell to Atari Colour.`);
  if (result.graphicsUpgradeInstalled && result.buildings['real-estate'].graphicsEra !== 'green-crt') throw new Error(`Developer checkpoint ${id} installed the graphics upgrade without advancing Real Estate to Green CRT.`);
  const nursery = result.buildings.nursery;
  const validNurseryState = (nursery.operationalState === 'vacant' && nursery.graphicsEra === 'atari-bw')
    || (nursery.operationalState === 'under-construction' && nursery.graphicsEra === 'green-crt')
    || (nursery.operationalState === 'operational' && nursery.graphicsEra === 'atari-colour');
  if (!validNurseryState) throw new Error(`Developer checkpoint ${id} has an inconsistent Nursery state.`);
  if (result.basilDeliveryComplete && !result.basilHarvestSaleRecorded) throw new Error(`Developer checkpoint ${id} completed the basil delivery without recording the sale.`);
  if (result.coins < 0) throw new Error(`Developer checkpoint ${id} has negative coins.`);
  if (result.rentalBondPaid && !result.rentalKeyOwned) throw new Error(`Developer checkpoint ${id} rents an apartment without its key.`);
  if (result.rentalBondPaid && (!result.openingGoldenPothosCollected || !result.brokenPotOwned || !result.rareBegoniaCollected || result.repairStep < 10)) throw new Error(`Developer checkpoint ${id} rents the starter apartment without completing the housing item requirements.`);
  if (result.activeProperty === 'second-rental' && result.rentalBondTotal !== SECOND_RENTAL_TOTAL_BOND) throw new Error(`Developer checkpoint ${id} has an invalid second-rental bond.`);
  if (result.starterKitGranted && !result.starterKitClaimed) throw new Error(`Developer checkpoint ${id} grants an unclaimed kit.`);
  if (id === 'fertilizer-box-ready-to-buy' && (result.coins !== BASIC_FERTILIZER_BOX_PRICE || result.basicFertilizerCharges !== 0)) throw new Error(`Developer checkpoint ${id} cannot test the configured fertiliser box purchase.`);
  if (id === 'fertilizer-thirty-second-test' && result.basicFertilizerCharges !== 1) throw new Error(`Developer checkpoint ${id} must provide exactly one test pellet.`);
  const ids = new Set<string>(); const slots = new Set<number>();
  for (const pot of result.growingPots) {
    if (ids.has(pot.id)) throw new Error(`Developer checkpoint ${id} duplicates pot ${pot.id}.`);
    ids.add(pot.id);
    if (pot.slot !== null && slots.has(pot.slot)) throw new Error(`Developer checkpoint ${id} overlaps growing slots.`);
    if (pot.slot !== null) slots.add(pot.slot);
    if (pot.crop && pot.crop.stage !== 'planted' && pot.crop.growthStartedAt === null) throw new Error(`Developer checkpoint ${id} has an unwatered growing crop.`);
    if (pot.type === 'special-repair-pot' && pot.crop && getPlantDefinition(pot.crop.species).yieldMode === 'whole-plant') throw new Error(`Developer checkpoint ${id} uses the repaired special pot for a whole-plant crop.`);
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
