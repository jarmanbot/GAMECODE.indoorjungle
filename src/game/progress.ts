import { createEmptyGrowingPot, GROWING_TABLE_SLOT_COUNT, MAX_ADDITIONAL_GROWING_POTS, STARTER_GROWING_POT_ID, type GrowingCropState, type GrowingPotState } from './growing';
import { emptyPlantQuantities, PLANT_SPECIES, type PlantSpecies, type PlantStage } from './plants';

export type PotCondition = 'ordinary' | 'broken' | 'repaired';
export type InventoryItem = 'small-golden-pothos' | 'special-repair-pot';
export type EquippedTool = 'cleaner' | 'repair' | 'watering-can' | null;
export type BasilStage = 'empty' | 'planted' | 'seedling' | 'mature';
export type ShopStockItem = 'small-golden-pothos' | 'special-repair-pot' | 'fresh-basil-leaves' | 'fresh-mint-leaves';
export type ShopStockCondition = PotCondition | 'fresh';

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
export const BASIL_HARVEST_STOCK_ID = 'fresh-basil-leaves';
export const MINT_HARVEST_STOCK_ID = 'fresh-mint-leaves';
export const DEFAULT_SHOP_STOCK_QUALITY = 'standard';

export type TaskState = 'find' | 'sell' | 'clean' | 'repair' | 'sell-repaired' | 'complete'
  | 'place-pot' | 'plant-basil' | 'water-basil' | 'grow-basil' | 'harvest-basil' | 'sell-basil'
  | 'plant-mint' | 'water-mint' | 'grow-mint' | 'harvest-mint' | 'sell-mint' | 'buy-seeds';

export interface ProgressState {
  coins: number;
  inventoryPot: PotCondition | null;
  inventoryItem: InventoryItem | null;
  inventoryInstanceId: string | null;
  placedWorldItem: PlacedWorldItem | null;
  saleComplete: boolean;
  repairedPotSaleComplete: boolean;
  shopGoldenPothosStock: boolean;
  shopStock: ShopStockEntry[];
  windowJobAccepted: boolean;
  windowCleaningProgress: number;
  windowJobComplete: boolean;
  cleanerOwned: boolean;
  repairToolOwned: boolean;
  glueCharges: number;
  brokenPotAvailable: boolean;
  brokenPotOwned: boolean;
  brokenPotPiecesRemaining: number;
  repairStep: number;
  equippedTool: EquippedTool;
  task: TaskState;
  rentalBondPaid: boolean;
  starterKitClaimed: boolean;
  starterKitGranted: boolean;

  // Authoritative growing model. The legacy basil fields below are retained
  // as compatibility mirrors for old saves and older external tooling only.
  growingPots: GrowingPotState[];
  seedQuantities: Record<PlantSpecies, number>;
  harvestQuantities: Record<PlantSpecies, number>;
  growingEvents: Record<PlantSpecies, number>;
  additionalGrowingPotsPurchased: number;

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
  coins: 0,
  inventoryPot: null,
  inventoryItem: null,
  inventoryInstanceId: null,
  placedWorldItem: null,
  saleComplete: false,
  repairedPotSaleComplete: false,
  shopGoldenPothosStock: false,
  shopStock: [],
  windowJobAccepted: false,
  windowCleaningProgress: 0,
  windowJobComplete: false,
  cleanerOwned: false,
  repairToolOwned: false,
  glueCharges: 0,
  brokenPotAvailable: false,
  brokenPotOwned: false,
  brokenPotPiecesRemaining: 3,
  repairStep: 0,
  equippedTool: null,
  task: 'find',
  rentalBondPaid: false,
  starterKitClaimed: false,
  starterKitGranted: false,
  growingPots: [],
  seedQuantities: emptyPlantQuantities(),
  harvestQuantities: emptyPlantQuantities(),
  growingEvents: emptyPlantQuantities(),
  additionalGrowingPotsPurchased: 0,
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

const isPlantSpecies = (value: unknown): value is PlantSpecies => PLANT_SPECIES.includes(value as PlantSpecies);
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
    result.push({ id, type: 'small-basic-plastic-pot', medium: 'usable', slot, crop: sanitizeCrop(raw.crop) });
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
  const input = value && typeof value === 'object' ? value as Partial<ProgressState> : {};
  const condition = input.inventoryPot === 'ordinary' || input.inventoryPot === 'broken' || input.inventoryPot === 'repaired' ? input.inventoryPot : null;
  const validTool = (candidate: unknown): candidate is Exclude<EquippedTool, null> => candidate === 'cleaner' || candidate === 'repair' || candidate === 'watering-can';
  const tool = validTool(input.equippedTool) ? input.equippedTool : null;
  const savedItem = input.inventoryItem === 'small-golden-pothos' || input.inventoryItem === 'special-repair-pot' ? input.inventoryItem : null;
  const inventoryItem: InventoryItem | null = savedItem ?? (condition === 'ordinary' ? 'small-golden-pothos' : condition === 'broken' || condition === 'repaired' ? 'special-repair-pot' : null);
  const savedInstanceId = typeof input.inventoryInstanceId === 'string' && input.inventoryInstanceId.trim() ? input.inventoryInstanceId.trim() : null;
  const inventoryInstanceId = condition === null ? null : savedInstanceId ?? (condition === 'ordinary' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID);
  const rawPlacedItem = input.placedWorldItem && typeof input.placedWorldItem === 'object' ? input.placedWorldItem as Partial<PlacedWorldItem> : null;
  const placedItem = rawPlacedItem
    && (rawPlacedItem.item === 'small-golden-pothos' || rawPlacedItem.item === 'special-repair-pot')
    && (rawPlacedItem.condition === 'ordinary' || rawPlacedItem.condition === 'broken' || rawPlacedItem.condition === 'repaired')
    && ((rawPlacedItem.item === 'small-golden-pothos' && rawPlacedItem.condition === 'ordinary') || (rawPlacedItem.item === 'special-repair-pot' && (rawPlacedItem.condition === 'broken' || rawPlacedItem.condition === 'repaired')))
    && typeof rawPlacedItem.instanceId === 'string' && rawPlacedItem.instanceId.trim()
    && Number.isFinite(rawPlacedItem.x) && Number.isFinite(rawPlacedItem.y)
    ? { item: rawPlacedItem.item, condition: rawPlacedItem.condition, instanceId: rawPlacedItem.instanceId.trim(), x: Number(rawPlacedItem.x), y: Number(rawPlacedItem.y) } as PlacedWorldItem : null;

  const legacyPothosStock = Boolean(input.shopGoldenPothosStock) || Boolean(input.saleComplete);
  const shopStock = sanitizeShopStock(input.shopStock, legacyPothosStock, condition);
  const saleComplete = Boolean(input.saleComplete) || legacyPothosStock || shopStock.some((entry) => entry.item === 'small-golden-pothos');
  const repairedPotSaleComplete = Boolean(input.repairedPotSaleComplete) || input.task === 'complete' || shopStock.some((entry) => entry.item === 'special-repair-pot');
  const rawTask = input.task;
  const task: TaskState = rawTask === 'sell' || rawTask === 'clean' || rawTask === 'repair' || rawTask === 'sell-repaired' || rawTask === 'complete'
    || rawTask === 'place-pot' || rawTask === 'plant-basil' || rawTask === 'water-basil' || rawTask === 'grow-basil' || rawTask === 'harvest-basil' || rawTask === 'sell-basil'
    || rawTask === 'plant-mint' || rawTask === 'water-mint' || rawTask === 'grow-mint' || rawTask === 'harvest-mint' || rawTask === 'sell-mint' || rawTask === 'buy-seeds' ? rawTask : 'find';
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
  const progress: ProgressState = {
    coins: Number.isFinite(input.coins) ? Math.max(0, Math.floor(input.coins as number)) : 0,
    inventoryPot: condition, inventoryItem, inventoryInstanceId, placedWorldItem: condition === null ? placedItem : null,
    saleComplete, repairedPotSaleComplete, shopGoldenPothosStock: Boolean(input.shopGoldenPothosStock) || saleComplete, shopStock,
    windowJobAccepted: Boolean(input.windowJobAccepted), windowCleaningProgress: Math.max(0, Math.min(999, quantity(input.windowCleaningProgress))), windowJobComplete: Boolean(input.windowJobComplete),
    cleanerOwned, repairToolOwned, glueCharges: quantity(input.glueCharges), brokenPotAvailable: Boolean(input.brokenPotAvailable), brokenPotOwned: Boolean(input.brokenPotOwned),
    brokenPotPiecesRemaining: Number.isFinite(Number(input.brokenPotPiecesRemaining)) ? Math.max(0, Math.min(3, Math.floor(Number(input.brokenPotPiecesRemaining)))) : 3,
    repairStep: Math.max(0, Math.min(10, quantity(input.repairStep))), equippedTool: tool, task,
    rentalBondPaid: Boolean(input.rentalBondPaid), starterKitClaimed: Boolean(input.starterKitClaimed), starterKitGranted: Boolean(input.starterKitGranted),
    growingPots: sanitizeGrowingPots(input), seedQuantities: seeds, harvestQuantities: harvests, growingEvents: events,
    additionalGrowingPotsPurchased: Math.max(0, Math.min(MAX_ADDITIONAL_GROWING_POTS, quantity(input.additionalGrowingPotsPurchased))),
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
    const item = raw.item === 'small-golden-pothos' || raw.item === 'special-repair-pot' || raw.item === 'fresh-basil-leaves' || raw.item === 'fresh-mint-leaves'
      ? raw.item : raw.item === 'basil-harvest' ? 'fresh-basil-leaves' : null;
    if (!item) continue;
    const expectedCondition: ShopStockCondition = item === 'fresh-basil-leaves' || item === 'fresh-mint-leaves' ? 'fresh' : item === 'small-golden-pothos' ? 'ordinary' : 'repaired';
    const quality = typeof raw.quality === 'string' && raw.quality.trim() ? raw.quality.trim() : DEFAULT_SHOP_STOCK_QUALITY;
    const condition = raw.condition === 'ordinary' || raw.condition === 'broken' || raw.condition === 'repaired' || raw.condition === 'fresh' ? raw.condition : expectedCondition;
    if (condition !== expectedCondition) continue;
    const amount = Math.min(Number.MAX_SAFE_INTEGER, quantity(raw.quantity));
    if (amount < 1) continue;
    if (item === 'fresh-basil-leaves' || item === 'fresh-mint-leaves') {
      const existing = normalized.find((entry) => entry.item === item && entry.quality === quality && entry.condition === condition);
      if (existing) existing.quantity += amount;
      else normalized.push({ stockId: item === 'fresh-basil-leaves' && quality === DEFAULT_SHOP_STOCK_QUALITY ? BASIL_HARVEST_STOCK_ID : item === 'fresh-mint-leaves' && quality === DEFAULT_SHOP_STOCK_QUALITY ? MINT_HARVEST_STOCK_ID : `${item}:${quality}`, item, quality, condition, quantity: amount, instanceIds: [] });
      continue;
    }
    const candidateIds = Array.isArray(raw.instanceIds) ? raw.instanceIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim()) : [];
    const fallbackId = typeof raw.stockId === 'string' && raw.stockId.trim() ? raw.stockId.trim() : item === 'small-golden-pothos' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID;
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
