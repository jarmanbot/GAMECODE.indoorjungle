import { createEmptyGrowingPot, GROWING_TABLE_SLOT_COUNT, MAX_ADDITIONAL_GROWING_POTS, STARTER_GROWING_POT_ID, type GrowingCropState, type GrowingPotState } from './growing';
import {
  emptyPlantQuantities,
  getPlantDefinition,
  isPlantProductItem,
  isPlantSpecies,
  PLANT_SPECIES,
  type PlantProductItem,
  type PlantSpecies,
  type PlantStage,
} from './plants';
import { RENTAL_BOND_COST, SECOND_RENTAL_TOTAL_BOND } from './world';
import type { PropertyId } from './world';
import { isPremiumPlantId, type PremiumPlantId } from './shopCatalog';
import {
  BUILDING_GRAPHICS_ERAS,
  DEFAULT_BUILDING_PROGRESS,
  type BuildingGraphicsEra,
  type BuildingOperationalState,
  type BuildingProgressState,
} from './buildingProgress';

export type PotCondition = 'ordinary' | 'broken' | 'repaired';
export type InventoryItem = 'small-golden-pothos' | 'special-repair-pot' | 'rare-spotted-begonia';
export type EquippedTool = 'cleaner' | 'repair' | 'watering-can' | null;
export type AlexGraphics = 'atari-bw' | 'green-screen';
export type GraphicsUpgradeStage = 'none' | 'prompt' | 'installing' | 'acknowledgement';
export type BasilStage = 'empty' | 'planted' | 'seedling' | 'mature';
export type ShopStockItem = 'small-golden-pothos' | 'special-repair-pot' | 'rare-spotted-begonia' | PlantProductItem;
export type ShopStockCondition = PotCondition | 'fresh' | 'living';

export interface PlacedWorldItem {
  item: InventoryItem;
  condition: PotCondition;
  instanceId: string;
  x: number;
  y: number;
}

export interface ShopStockEntry {
  stockId: string;
  item: ShopStockItem;
  quality: string;
  condition: ShopStockCondition;
  quantity: number;
  instanceIds: string[];
}

export const OPENING_GOLDEN_POTHOS_INSTANCE_ID = 'opening-golden-pothos-1';
export const SPECIAL_REPAIR_POT_INSTANCE_ID = 'special-repair-pot-1';
export const RARE_SPOTTED_BEGONIA_INSTANCE_ID = 'rare-spotted-begonia-1';
export const BASIL_HARVEST_STOCK_ID = 'fresh-basil-leaves';
export const MINT_HARVEST_STOCK_ID = 'fresh-mint-leaves';
export const DWARF_MARIGOLD_STOCK_ID = 'potted-dwarf-marigold';
export const PEACE_LILY_STOCK_ID = 'potted-peace-lily';
export const DEFAULT_SHOP_STOCK_QUALITY = 'standard';
export type TaskState = 'find' | 'sell' | 'clean' | 'repair' | 'sell-repaired' | 'complete'
  | 'place-pot' | 'plant-basil' | 'water-basil' | 'grow-basil' | 'harvest-basil' | 'sell-basil'
  | 'plant-mint' | 'water-mint' | 'grow-mint' | 'harvest-mint' | 'sell-mint'
  | 'plant-dwarf-marigold' | 'water-dwarf-marigold' | 'grow-dwarf-marigold' | 'lift-dwarf-marigold' | 'sell-dwarf-marigold'
  | 'plant-peace-lily' | 'water-peace-lily' | 'grow-peace-lily' | 'lift-peace-lily' | 'sell-peace-lily'
  | 'buy-seeds' | 'move-rental';

export interface ProgressState {
  openingComplete: boolean;
  openingGoldenPothosCollected: boolean;
  rareBegoniaCollected: boolean;
  rareBegoniaSold: boolean;
  buildings: BuildingProgressState;
  graphicsUpgradeUnlocked: boolean;
  graphicsUpgradeInstalled: boolean;
  graphicsUpgradeStage: GraphicsUpgradeStage;
  alexGraphics: AlexGraphics;
  nurseryConstructionComplete: boolean;
  coins: number;
  inventoryPot: PotCondition | null;
  inventoryItem: InventoryItem | null;
  inventoryInstanceId: string | null;
  placedWorldItem: PlacedWorldItem | null;
  saleComplete: boolean;
  repairedPotSaleComplete: boolean;
  shopGoldenPothosStock: boolean;
  shopStock: ShopStockEntry[];
  ownedPremiumPlants: PremiumPlantId[];
  windowJobAccepted: boolean;
  windowCleaningProgress: number;
  windowJobComplete: boolean;
  cleanerOwned: boolean;
  repairToolOwned: boolean;
  glueCharges: number;
  brokenPotAvailable: boolean;
  brokenPotOwned: boolean;
  brokenPotPiecesRemaining: number;
  brokenPotPiecesOwned: number;
  repairStep: number;
  equippedTool: EquippedTool;
  task: TaskState;
  rentalBondPaid: boolean;
  rentalKeyOwned: boolean;
  activeProperty: PropertyId;
  rentalBondTotal: number;
  basilHarvestSaleRecorded: boolean;
  basilDeliveryComplete: boolean;
  mintHarvestSaleRecorded: boolean;
  starterKitClaimed: boolean;
  starterKitGranted: boolean;

  // Authoritative growing model. The legacy basil fields below are retained
  // as compatibility mirrors for old saves and older external tooling only.
  growingPots: GrowingPotState[];
  seedQuantities: Record<PlantSpecies, number>;
  harvestQuantities: Record<PlantSpecies, number>;
  growingEvents: Record<PlantSpecies, number>;
  additionalGrowingPotsPurchased: number;
  growingPotPurchaseSerial: number;

  // Compatibility mirrors for the pre multi-pot save schema.
  starterPotPlaced: boolean;
  starterPotSlot: number;
  basilPlanted: boolean;
  basilSeeds: number;
  basilHarvests: number;
  basilGrowthStartedAt: number | null;
  basilCycleCount: number;
  basicFertilizerCharges: number;
  wateringCanOwned: boolean;
  toolSlots: EquippedTool[];
}

export const DEFAULT_PROGRESS: ProgressState = {
  openingComplete: false,
  openingGoldenPothosCollected: false,
  rareBegoniaCollected: false,
  rareBegoniaSold: false,
  buildings: {
    'buy-sell': { ...DEFAULT_BUILDING_PROGRESS['buy-sell'] },
    'starter-apartment': { ...DEFAULT_BUILDING_PROGRESS['starter-apartment'] },
    'real-estate': { ...DEFAULT_BUILDING_PROGRESS['real-estate'] },
    nursery: { ...DEFAULT_BUILDING_PROGRESS.nursery },
  },
  graphicsUpgradeUnlocked: false,
  graphicsUpgradeInstalled: false,
  graphicsUpgradeStage: 'none',
  alexGraphics: 'atari-bw',
  nurseryConstructionComplete: false,
  coins: 0,
  inventoryPot: null,
  inventoryItem: null,
  inventoryInstanceId: null,
  placedWorldItem: null,
  saleComplete: false,
  repairedPotSaleComplete: false,
  shopGoldenPothosStock: false,
  shopStock: [],
  ownedPremiumPlants: [],
  windowJobAccepted: false,
  windowCleaningProgress: 0,
  windowJobComplete: false,
  cleanerOwned: false,
  repairToolOwned: false,
  glueCharges: 0,
  brokenPotAvailable: false,
  brokenPotOwned: false,
  brokenPotPiecesRemaining: 3,
  brokenPotPiecesOwned: 0,
  repairStep: 0,
  equippedTool: null,
  task: 'find',
  rentalBondPaid: false,
  rentalKeyOwned: false,
  activeProperty: 'none',
  rentalBondTotal: 0,
  basilHarvestSaleRecorded: false,
  basilDeliveryComplete: false,
  mintHarvestSaleRecorded: false,
  starterKitClaimed: false,
  starterKitGranted: false,
  growingPots: [],
  seedQuantities: emptyPlantQuantities(),
  harvestQuantities: emptyPlantQuantities(),
  growingEvents: emptyPlantQuantities(),
  additionalGrowingPotsPurchased: 0,
  growingPotPurchaseSerial: 0,
  starterPotPlaced: false,
  starterPotSlot: 1,
  basilPlanted: false,
  basilSeeds: 0,
  basilHarvests: 0,
  basilGrowthStartedAt: null,
  basilCycleCount: 0,
  basicFertilizerCharges: 0,
  wateringCanOwned: false,
  toolSlots: [null, null, null],
};

const isPlantStage = (value: unknown): value is PlantStage => value === 'planted' || value === 'seedling' || value === 'mature';
const finiteTimestamp = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const quantity = (value: unknown): number => Math.max(0, Math.floor(Number(value) || 0));

function sanitizeCrop(value: unknown, fallbackSpecies: PlantSpecies = 'basil'): GrowingCropState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<GrowingCropState>;
  const species = isPlantSpecies(raw.species) ? raw.species : fallbackSpecies;
  const stage = isPlantStage(raw.stage) ? raw.stage : 'planted';
  const growthStartedAt = finiteTimestamp(raw.growthStartedAt);
  return { species, stage, wateredAt: finiteTimestamp(raw.wateredAt), growthStartedAt: stage === 'planted' ? null : growthStartedAt };
}

function sanitizeGrowingPots(input: Partial<ProgressState>): GrowingPotState[] {
  const result: GrowingPotState[] = [];
  const ids = new Set<string>();
  const slots = new Set<number>();
  const source = Array.isArray(input.growingPots) ? input.growingPots : [];
  for (const candidate of source) {
    if (!candidate || typeof candidate !== 'object') continue;
    const raw = candidate as Partial<GrowingPotState>;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
    if (!id || ids.has(id)) continue;
    const rawSlot = raw.slot === null || raw.slot === undefined ? null : Math.floor(Number(raw.slot));
    const slot = rawSlot !== null && Number.isFinite(rawSlot) && rawSlot >= 0 && rawSlot < GROWING_TABLE_SLOT_COUNT && !slots.has(rawSlot) ? rawSlot : null;
    ids.add(id);
    if (slot !== null) slots.add(slot);
    const type = raw.type === 'special-repair-pot' ? 'special-repair-pot' : 'small-basic-plastic-pot';
    result.push({ id, type, medium: 'usable', slot, crop: sanitizeCrop(raw.crop) });
  }

  // Legacy saves had one starter pot represented by flat basil fields. Convert
  // that state once, retaining its slot, crop, and growth timing.
  if (result.length === 0 && input.starterKitGranted) {
    const slot = input.starterPotPlaced
      ? Math.max(0, Math.min(GROWING_TABLE_SLOT_COUNT - 1, Math.floor(Number(input.starterPotSlot) || 1)))
      : null;
    const basilPlanted = Boolean(input.basilPlanted);
    const growthStartedAt = finiteTimestamp(input.basilGrowthStartedAt);
    const crop = basilPlanted
      ? { species: 'basil' as const, stage: growthStartedAt === null ? 'planted' as const : 'seedling' as const, wateredAt: growthStartedAt, growthStartedAt }
      : null;
    result.push({ ...createEmptyGrowingPot(STARTER_GROWING_POT_ID, slot), crop });
  }
  return result;
}

function syncLegacyMirrors(state: ProgressState): ProgressState {
  const starter = state.growingPots.find((pot) => pot.id === STARTER_GROWING_POT_ID);
  const crop = starter?.crop?.species === 'basil' ? starter.crop : null;
  state.starterPotPlaced = starter?.slot !== null && starter?.slot !== undefined;
  state.starterPotSlot = starter?.slot ?? 1;
  state.basilPlanted = Boolean(crop);
  state.basilSeeds = state.seedQuantities.basil;
  state.basilHarvests = state.harvestQuantities.basil;
  state.basilGrowthStartedAt = crop?.growthStartedAt ?? null;
  state.basilCycleCount = state.growingEvents.basil;
  return state;
}

export function sanitizeProgress(value: unknown): ProgressState {
  const input = value && typeof value === 'object'
    ? value as Partial<ProgressState> & { buildingGraphics?: Record<string, unknown> }
    : {};
  const alexGraphics: AlexGraphics = input.alexGraphics === 'green-screen' ? 'green-screen' : 'atari-bw';
  const graphicsUpgradeInstalled = Boolean(input.graphicsUpgradeInstalled);
  const condition = input.inventoryPot === 'ordinary' || input.inventoryPot === 'broken' || input.inventoryPot === 'repaired' ? input.inventoryPot : null;
  const validTool = (candidate: unknown): candidate is Exclude<EquippedTool, null> => candidate === 'cleaner' || candidate === 'repair' || candidate === 'watering-can';
  const tool = validTool(input.equippedTool) ? input.equippedTool : null;
  const savedItem = input.inventoryItem === 'small-golden-pothos' || input.inventoryItem === 'special-repair-pot' || input.inventoryItem === 'rare-spotted-begonia' ? input.inventoryItem : null;
  const inventoryItem: InventoryItem | null = condition === null
    ? null
    : savedItem ?? (condition === 'ordinary' ? 'small-golden-pothos' : 'special-repair-pot');
  const savedInstanceId = typeof input.inventoryInstanceId === 'string' && input.inventoryInstanceId.trim() ? input.inventoryInstanceId.trim() : null;
  const inventoryInstanceId = condition === null ? null : savedInstanceId ?? (inventoryItem === 'rare-spotted-begonia' ? RARE_SPOTTED_BEGONIA_INSTANCE_ID : condition === 'ordinary' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID);
  const rawPlacedItem = input.placedWorldItem && typeof input.placedWorldItem === 'object' ? input.placedWorldItem as Partial<PlacedWorldItem> : null;
  const placedItem = rawPlacedItem
    && (rawPlacedItem.item === 'small-golden-pothos' || rawPlacedItem.item === 'special-repair-pot' || rawPlacedItem.item === 'rare-spotted-begonia')
    && (rawPlacedItem.condition === 'ordinary' || rawPlacedItem.condition === 'broken' || rawPlacedItem.condition === 'repaired')
    && ((rawPlacedItem.item === 'small-golden-pothos' && rawPlacedItem.condition === 'ordinary')
      || (rawPlacedItem.item === 'rare-spotted-begonia' && rawPlacedItem.condition === 'ordinary')
      || (rawPlacedItem.item === 'special-repair-pot' && (rawPlacedItem.condition === 'broken' || rawPlacedItem.condition === 'repaired')))
    && typeof rawPlacedItem.instanceId === 'string' && rawPlacedItem.instanceId.trim()
    && Number.isFinite(rawPlacedItem.x) && Number.isFinite(rawPlacedItem.y)
    ? { item: rawPlacedItem.item, condition: rawPlacedItem.condition, instanceId: rawPlacedItem.instanceId.trim(), x: Number(rawPlacedItem.x), y: Number(rawPlacedItem.y) } as PlacedWorldItem : null;

  const legacyPothosStock = Boolean(input.shopGoldenPothosStock) || Boolean(input.saleComplete);
  const shopStock = sanitizeShopStock(input.shopStock, legacyPothosStock, condition);
  const saleComplete = typeof input.saleComplete === 'boolean'
    ? input.saleComplete
    : legacyPothosStock || shopStock.some((entry) => entry.item === 'small-golden-pothos');
  // This explicit milestone is authoritative for new saves. Older saves are
  // migrated from durable ownership, placement, sale and later-upgrade facts;
  // current inventory alone is never used after this migration is persisted.
  const savedBuildings = input.buildings && typeof input.buildings === 'object'
    ? input.buildings as Partial<BuildingProgressState> : {};
  const legacyBuildingGraphics = input.buildingGraphics && typeof input.buildingGraphics === 'object'
    ? input.buildingGraphics as Record<string, unknown> : {};
  const savedBuySellEra = savedBuildings['buy-sell']?.graphicsEra;
  const openingGoldenPothosCollected = Boolean(input.openingGoldenPothosCollected)
    || inventoryItem === 'small-golden-pothos'
    || placedItem?.item === 'small-golden-pothos'
    || saleComplete
    || shopStock.some((entry) => entry.item === 'small-golden-pothos')
    || savedBuySellEra === 'green-crt'
    || savedBuySellEra === 'atari-colour'
    || legacyBuildingGraphics.buySell === 'atari-colour'
    || graphicsUpgradeInstalled;
  const graphicsEra = (value: unknown, fallback: BuildingGraphicsEra): BuildingGraphicsEra =>
    BUILDING_GRAPHICS_ERAS.includes(value as BuildingGraphicsEra) ? value as BuildingGraphicsEra : fallback;
  const operationalState = (value: unknown, fallback: BuildingOperationalState): BuildingOperationalState =>
    value === 'operational' || value === 'vacant' || value === 'locked' || value === 'under-construction' ? value : fallback;
  const savedNurseryState = savedBuildings.nursery?.operationalState;
  // `locked` was the legacy name for the initial empty lot. Nursery visuals
  // now follow this saved state exclusively; the global graphics upgrade no
  // longer advances or selects Nursery artwork.
  const nurseryOperationalState: BuildingOperationalState = savedNurseryState === 'operational'
    ? 'operational'
    : savedNurseryState === 'under-construction'
      ? 'under-construction'
      : savedNurseryState === 'vacant' || savedNurseryState === 'locked'
        ? 'vacant'
        : Boolean(input.nurseryConstructionComplete) ? 'operational' : 'vacant';
  const nurseryGraphicsEra: BuildingGraphicsEra = nurseryOperationalState === 'operational'
    ? 'atari-colour'
    : nurseryOperationalState === 'under-construction' ? 'green-crt' : 'atari-bw';
  const savedOrMigratedBuySellEra = graphicsEra(savedBuySellEra,
    legacyBuildingGraphics.buySell === 'atari-colour' || graphicsUpgradeInstalled
      ? 'atari-colour'
      : openingGoldenPothosCollected ? 'green-crt' : 'atari-bw');
  // The repaired-pot installation is the next approved Buy/Sell upgrade. It
  // advances Green CRT to Atari Colour while preserving an existing Colour
  // save and never downgrading a building.
  const migratedBuySellEra: BuildingGraphicsEra = graphicsUpgradeInstalled
    && savedOrMigratedBuySellEra !== 'atari-colour'
    ? 'atari-colour'
    : savedOrMigratedBuySellEra;
  const buildings: BuildingProgressState = {
    'buy-sell': {
      operationalState: operationalState(savedBuildings['buy-sell']?.operationalState, DEFAULT_BUILDING_PROGRESS['buy-sell'].operationalState),
      graphicsEra: migratedBuySellEra,
    },
    'starter-apartment': {
      operationalState: operationalState(savedBuildings['starter-apartment']?.operationalState, DEFAULT_BUILDING_PROGRESS['starter-apartment'].operationalState),
      graphicsEra: graphicsEra(savedBuildings['starter-apartment']?.graphicsEra ?? legacyBuildingGraphics.apartment, 'atari-bw'),
    },
    'real-estate': {
      operationalState: operationalState(savedBuildings['real-estate']?.operationalState, DEFAULT_BUILDING_PROGRESS['real-estate'].operationalState),
      graphicsEra: graphicsUpgradeInstalled
        ? 'green-crt'
        : graphicsEra(savedBuildings['real-estate']?.graphicsEra ?? legacyBuildingGraphics.realEstate, 'atari-bw'),
    },
    nursery: {
      operationalState: nurseryOperationalState,
      graphicsEra: nurseryGraphicsEra,
    },
  };
  const repairedPotSaleComplete = Boolean(input.repairedPotSaleComplete) || input.task === 'complete' || shopStock.some((entry) => entry.item === 'special-repair-pot');
  const rareBegoniaSold = Boolean(input.rareBegoniaSold) || shopStock.some((entry) => entry.item === 'rare-spotted-begonia');
  const rareBegoniaCollected = Boolean(input.rareBegoniaCollected)
    || inventoryItem === 'rare-spotted-begonia'
    || placedItem?.item === 'rare-spotted-begonia'
    || rareBegoniaSold;
  // Repair completion leaves the pot on the ground. The graphics upgrade is
  // deliberately unlocked only after that repaired pot has been picked up
  // (or a later saved state proves that it was picked up/sold).
  const repairedPotPickedUp = condition === 'repaired'
    || placedItem?.item === 'special-repair-pot' && placedItem.condition === 'repaired'
    || repairedPotSaleComplete;
  const graphicsUpgradeUnlocked = Boolean(input.graphicsUpgradeUnlocked) || graphicsUpgradeInstalled || repairedPotPickedUp;
  const graphicsUpgradeStage: GraphicsUpgradeStage = input.graphicsUpgradeStage === 'installing' || input.graphicsUpgradeStage === 'acknowledgement' || input.graphicsUpgradeStage === 'prompt'
    ? input.graphicsUpgradeStage
    : graphicsUpgradeUnlocked && !graphicsUpgradeInstalled ? 'prompt' : 'none';
  const rawTask = input.task;
  const task: TaskState = rawTask === 'sell' || rawTask === 'clean' || rawTask === 'repair' || rawTask === 'sell-repaired' || rawTask === 'complete'
    || rawTask === 'place-pot' || rawTask === 'plant-basil' || rawTask === 'water-basil' || rawTask === 'grow-basil' || rawTask === 'harvest-basil' || rawTask === 'sell-basil'
    || rawTask === 'plant-mint' || rawTask === 'water-mint' || rawTask === 'grow-mint' || rawTask === 'harvest-mint' || rawTask === 'sell-mint'
    || rawTask === 'plant-dwarf-marigold' || rawTask === 'water-dwarf-marigold' || rawTask === 'grow-dwarf-marigold' || rawTask === 'lift-dwarf-marigold' || rawTask === 'sell-dwarf-marigold'
    || rawTask === 'plant-peace-lily' || rawTask === 'water-peace-lily' || rawTask === 'grow-peace-lily' || rawTask === 'lift-peace-lily' || rawTask === 'sell-peace-lily'
    || rawTask === 'buy-seeds' || rawTask === 'move-rental' ? rawTask : 'find';
  const cleanerOwned = Boolean(input.cleanerOwned);
  const repairToolOwned = Boolean(input.repairToolOwned);
  const wateringCanOwned = Boolean(input.wateringCanOwned);
  const savedToolSlots = Array.isArray(input.toolSlots) ? input.toolSlots.slice(0, 3).map((candidate) => validTool(candidate) ? candidate : null) : [];
  const toolSlots: EquippedTool[] = savedToolSlots.length === 3 ? savedToolSlots : [cleanerOwned ? 'cleaner' : null, repairToolOwned ? 'repair' : null, wateringCanOwned ? 'watering-can' : null];
  const ownedTools: Exclude<EquippedTool, null>[] = [
    ...(cleanerOwned ? ['cleaner' as const] : []), ...(repairToolOwned ? ['repair' as const] : []), ...(wateringCanOwned ? ['watering-can' as const] : []),
  ];
  for (let index = 0; index < toolSlots.length; index += 1) if (toolSlots[index] && !ownedTools.includes(toolSlots[index] as Exclude<EquippedTool, null>)) toolSlots[index] = null;
  ownedTools.forEach((ownedTool) => {
    if (toolSlots.includes(ownedTool)) return;
    const emptySlot = toolSlots.findIndex((slot) => slot === null);
    if (emptySlot >= 0) toolSlots[emptySlot] = ownedTool;
  });

  const seeds = emptyPlantQuantities();
  const harvests = emptyPlantQuantities();
  const events = emptyPlantQuantities();
  for (const species of PLANT_SPECIES) {
    const sourceSeeds = input.seedQuantities && typeof input.seedQuantities === 'object' ? input.seedQuantities[species] : undefined;
    const sourceHarvests = input.harvestQuantities && typeof input.harvestQuantities === 'object' ? input.harvestQuantities[species] : undefined;
    const sourceEvents = input.growingEvents && typeof input.growingEvents === 'object' ? input.growingEvents[species] : undefined;
    seeds[species] = quantity(sourceSeeds ?? (species === 'basil' ? input.basilSeeds : 0));
    harvests[species] = quantity(sourceHarvests ?? (species === 'basil' ? input.basilHarvests : 0));
    events[species] = quantity(sourceEvents ?? (species === 'basil' ? input.basilCycleCount : 0));
  }
  const piecesRemaining = Number.isFinite(Number(input.brokenPotPiecesRemaining))
    ? Math.max(0, Math.min(3, Math.floor(Number(input.brokenPotPiecesRemaining))))
    : 3;
  const piecesOwned = Number.isFinite(Number(input.brokenPotPiecesOwned))
    ? Math.max(0, Math.min(3, Math.floor(Number(input.brokenPotPiecesOwned))))
    : (Boolean(input.brokenPotOwned) || condition === 'broken' ? 0 : Math.max(0, 3 - piecesRemaining));
  const legacyProgressExists = Boolean(input.coins)
    || condition !== null
    || Boolean(input.saleComplete)
    || Boolean(input.windowJobAccepted)
    || Boolean(input.windowJobComplete)
    || Boolean(input.rentalBondPaid)
    || Boolean(input.starterKitClaimed)
    || Boolean(input.placedWorldItem)
    || (Array.isArray(input.growingPots) && input.growingPots.length > 0);
  const openingComplete = typeof input.openingComplete === 'boolean' ? input.openingComplete : legacyProgressExists;
  const rentalBondPaid = Boolean(input.rentalBondPaid);
  const requestedProperty = input.activeProperty === 'second-rental' || input.activeProperty === 'starter-apartment' ? input.activeProperty : null;
  const activeProperty: PropertyId = rentalBondPaid ? (requestedProperty ?? 'starter-apartment') : 'none';
  const rentalBondTotal = rentalBondPaid ? (activeProperty === 'second-rental' ? SECOND_RENTAL_TOTAL_BOND : RENTAL_BOND_COST) : 0;
  const shopHasBasilSaleEvidence = shopStock.some((entry) => entry.item === 'fresh-basil-leaves');
  const shopHasMintSaleEvidence = shopStock.some((entry) => entry.item === 'fresh-mint-leaves');
  const basilHarvestSaleRecorded = Boolean(input.basilHarvestSaleRecorded) || shopHasBasilSaleEvidence;
  // Before dedicated delivery state existed, the first recorded basil sale
  // also cleared the request. Preserve that completed state for old saves;
  // explicit false remains authoritative for new ordinary sales.
  const basilDeliveryComplete = typeof input.basilDeliveryComplete === 'boolean'
    ? input.basilDeliveryComplete
    : basilHarvestSaleRecorded;
  const ownedPremiumPlants = Array.isArray(input.ownedPremiumPlants)
    ? [...new Set(input.ownedPremiumPlants.filter(isPremiumPlantId))]
    : [];
  const progress: ProgressState = {
    openingComplete,
    openingGoldenPothosCollected,
    rareBegoniaCollected,
    rareBegoniaSold,
    buildings,
    graphicsUpgradeUnlocked,
    graphicsUpgradeInstalled,
    graphicsUpgradeStage: graphicsUpgradeInstalled ? (graphicsUpgradeStage === 'acknowledgement' ? 'acknowledgement' : 'none') : graphicsUpgradeStage,
    alexGraphics: graphicsUpgradeInstalled ? alexGraphics : 'atari-bw',
    nurseryConstructionComplete: buildings.nursery.operationalState === 'operational',
    coins: Number.isFinite(input.coins) ? Math.max(0, Math.floor(input.coins as number)) : 0,
    inventoryPot: condition, inventoryItem, inventoryInstanceId, placedWorldItem: condition === null ? placedItem : null,
    saleComplete, repairedPotSaleComplete, shopGoldenPothosStock: Boolean(input.shopGoldenPothosStock) || saleComplete, shopStock, ownedPremiumPlants,
    windowJobAccepted: Boolean(input.windowJobAccepted), windowCleaningProgress: Math.max(0, Math.min(999, quantity(input.windowCleaningProgress))), windowJobComplete: Boolean(input.windowJobComplete),
    cleanerOwned, repairToolOwned, glueCharges: quantity(input.glueCharges), brokenPotAvailable: Boolean(input.brokenPotAvailable), brokenPotOwned: Boolean(input.brokenPotOwned),
    brokenPotPiecesRemaining: piecesRemaining, brokenPotPiecesOwned: piecesOwned,
    repairStep: Math.max(0, Math.min(10, quantity(input.repairStep))), equippedTool: tool, task,
    rentalBondPaid, rentalKeyOwned: Boolean(input.rentalKeyOwned) || rentalBondPaid, activeProperty, rentalBondTotal,
    basilHarvestSaleRecorded,
    basilDeliveryComplete,
    mintHarvestSaleRecorded: Boolean(input.mintHarvestSaleRecorded) || shopHasMintSaleEvidence,
    starterKitClaimed: Boolean(input.starterKitClaimed), starterKitGranted: Boolean(input.starterKitGranted),
    growingPots: sanitizeGrowingPots(input), seedQuantities: seeds, harvestQuantities: harvests, growingEvents: events,
    additionalGrowingPotsPurchased: Math.max(0, Math.min(MAX_ADDITIONAL_GROWING_POTS, quantity(input.additionalGrowingPotsPurchased))),
    growingPotPurchaseSerial: Math.max(
      quantity(input.growingPotPurchaseSerial),
      ...sanitizeGrowingPots(input).map((pot) => Number(pot.id.match(/growing-pot-(\d+)$/)?.[1] ?? 1) - 1),
      quantity(input.additionalGrowingPotsPurchased),
    ),
    starterPotPlaced: false, starterPotSlot: 1, basilPlanted: false, basilSeeds: 0, basilHarvests: 0, basilGrowthStartedAt: null, basilCycleCount: 0,
    basicFertilizerCharges: quantity(input.basicFertilizerCharges), wateringCanOwned, toolSlots,
  };
  syncLegacyMirrors(progress);
  return progress;
}

function sanitizeShopStock(value: unknown, legacyPothosStock: boolean, inventoryPot: PotCondition | null): ShopStockEntry[] {
  const hasNewStockField = Array.isArray(value);
  const normalized: ShopStockEntry[] = [];
  const uniqueIds = new Set<string>();
  const source = hasNewStockField ? value : [];
  for (const candidate of source) {
    if (!candidate || typeof candidate !== 'object') continue;
    const raw = candidate as Partial<ShopStockEntry> & { item?: string };
    const item = raw.item === 'small-golden-pothos' || raw.item === 'special-repair-pot' || raw.item === 'rare-spotted-begonia' || isPlantProductItem(raw.item)
      ? raw.item : raw.item === 'basil-harvest' ? 'fresh-basil-leaves' : null;
    if (!item) continue;
    const plantDefinition = isPlantProductItem(item)
      ? getPlantDefinition(PLANT_SPECIES.find((species) => getPlantDefinition(species).harvestItem === item) ?? 'basil')
      : null;
    const expectedCondition: ShopStockCondition = plantDefinition
      ? plantDefinition.yieldMode === 'whole-plant' ? 'living' : 'fresh'
      : item === 'small-golden-pothos' || item === 'rare-spotted-begonia' ? 'ordinary' : 'repaired';
    const quality = typeof raw.quality === 'string' && raw.quality.trim() ? raw.quality.trim() : DEFAULT_SHOP_STOCK_QUALITY;
    const condition = raw.condition === 'ordinary' || raw.condition === 'broken' || raw.condition === 'repaired' || raw.condition === 'fresh' || raw.condition === 'living' ? raw.condition : expectedCondition;
    if (condition !== expectedCondition) continue;
    const amount = Math.min(Number.MAX_SAFE_INTEGER, quantity(raw.quantity));
    if (amount < 1) continue;
    if (isPlantProductItem(item)) {
      const existing = normalized.find((entry) => entry.item === item && entry.quality === quality && entry.condition === condition);
      if (existing) existing.quantity += amount;
      else normalized.push({ stockId: quality === DEFAULT_SHOP_STOCK_QUALITY ? item : `${item}:${quality}`, item, quality, condition, quantity: amount, instanceIds: [] });
      continue;
    }
    const candidateIds = Array.isArray(raw.instanceIds) ? raw.instanceIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim()) : [];
    const fallbackId = typeof raw.stockId === 'string' && raw.stockId.trim()
      ? raw.stockId.trim()
      : item === 'small-golden-pothos' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID
        : item === 'rare-spotted-begonia' ? RARE_SPOTTED_BEGONIA_INSTANCE_ID
          : SPECIAL_REPAIR_POT_INSTANCE_ID;
    const instanceIds = candidateIds.length > 0 ? candidateIds : [fallbackId];
    instanceIds.forEach((instanceId) => {
      if (uniqueIds.has(instanceId)) return;
      uniqueIds.add(instanceId);
      normalized.push({ stockId: instanceId, item, quality, condition, quantity: 1, instanceIds: [instanceId] });
    });
  }
  if (!hasNewStockField && legacyPothosStock && inventoryPot !== 'ordinary' && !normalized.some((entry) => entry.item === 'small-golden-pothos')) normalized.push({ stockId: OPENING_GOLDEN_POTHOS_INSTANCE_ID, item: 'small-golden-pothos', quality: DEFAULT_SHOP_STOCK_QUALITY, condition: 'ordinary', quantity: 1, instanceIds: [OPENING_GOLDEN_POTHOS_INSTANCE_ID] });
  return normalized;
}

export function syncProgressLegacyMirrors(progress: ProgressState): ProgressState {
  return syncLegacyMirrors(progress);
}
