export type PotCondition = 'ordinary' | 'broken' | 'repaired';
export type InventoryItem = 'small-golden-pothos' | 'special-repair-pot';
export type EquippedTool = 'cleaner' | 'repair' | 'watering-can' | null;
export type BasilStage = 'empty' | 'planted' | 'seedling' | 'mature';
export type ShopStockItem = 'small-golden-pothos' | 'special-repair-pot' | 'basil-harvest';
export type ShopStockCondition = PotCondition | 'fresh';
export interface PlacedWorldItem {
  item: InventoryItem;
  condition: PotCondition;
  instanceId: string;
  x: number;
  y: number;
}
export interface ShopStockEntry {
  // Unique pots retain their instance id. Basil harvests use one stable stack
  // id per quality/condition combination.
  stockId: string;
  item: ShopStockItem;
  // Current items use the implicit standard quality. Keep this explicit so
  // future quality variants cannot merge into the wrong stack.
  quality: string;
  condition: ShopStockCondition;
  quantity: number;
  instanceIds: string[];
}

export const OPENING_GOLDEN_POTHOS_INSTANCE_ID = 'opening-golden-pothos-1';
export const SPECIAL_REPAIR_POT_INSTANCE_ID = 'special-repair-pot-1';
export const BASIL_HARVEST_STOCK_ID = 'basil-harvest';
export const DEFAULT_SHOP_STOCK_QUALITY = 'standard';

export type TaskState = 'find' | 'sell' | 'clean' | 'repair' | 'sell-repaired' | 'complete'
  | 'place-pot' | 'plant-basil' | 'water-basil' | 'grow-basil' | 'harvest-basil' | 'sell-basil' | 'buy-seeds';

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

export function sanitizeProgress(value: unknown): ProgressState {
  const input = value && typeof value === 'object' ? value as Partial<ProgressState> : {};
  const condition = input.inventoryPot === 'ordinary' || input.inventoryPot === 'broken' || input.inventoryPot === 'repaired'
    ? input.inventoryPot : null;
  const tool = input.equippedTool === 'cleaner' || input.equippedTool === 'repair' || input.equippedTool === 'watering-can'
    ? input.equippedTool : null;
  const savedItem = input.inventoryItem === 'small-golden-pothos' || input.inventoryItem === 'special-repair-pot'
    ? input.inventoryItem : null;
  const inventoryItem: InventoryItem | null = savedItem
    ?? (condition === 'ordinary' ? 'small-golden-pothos' : condition === 'broken' || condition === 'repaired' ? 'special-repair-pot' : null);
  const savedInstanceId = typeof input.inventoryInstanceId === 'string' && input.inventoryInstanceId.trim().length > 0
    ? input.inventoryInstanceId.trim() : null;
  const inventoryInstanceId = condition === null
    ? null
    : savedInstanceId
      ?? (condition === 'ordinary' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID);
  const rawPlacedItem = input.placedWorldItem && typeof input.placedWorldItem === 'object'
    ? input.placedWorldItem as Partial<PlacedWorldItem> : null;
  const placedItem = rawPlacedItem
    && (rawPlacedItem.item === 'small-golden-pothos' || rawPlacedItem.item === 'special-repair-pot')
    && (rawPlacedItem.condition === 'ordinary' || rawPlacedItem.condition === 'broken' || rawPlacedItem.condition === 'repaired')
    && ((rawPlacedItem.item === 'small-golden-pothos' && rawPlacedItem.condition === 'ordinary')
      || (rawPlacedItem.item === 'special-repair-pot' && (rawPlacedItem.condition === 'broken' || rawPlacedItem.condition === 'repaired')))
    && typeof rawPlacedItem.instanceId === 'string' && rawPlacedItem.instanceId.trim().length > 0
    && Number.isFinite(rawPlacedItem.x) && Number.isFinite(rawPlacedItem.y)
    ? {
      item: rawPlacedItem.item,
      condition: rawPlacedItem.condition,
      instanceId: rawPlacedItem.instanceId.trim(),
      x: Number(rawPlacedItem.x),
      y: Number(rawPlacedItem.y),
    } as PlacedWorldItem : null;
  // Older builds could set the shop-stock flag and then overwrite
  // saleComplete with a stale scene mirror during save. Treat either legacy
  // delivered-stock evidence or real Pothos stock as proof of completion.
  const legacyPothosStock = Boolean(input.shopGoldenPothosStock) || Boolean(input.saleComplete);
  const savedPieces = Number(input.brokenPotPiecesRemaining);
  const task: TaskState = input.task === 'sell' || input.task === 'clean' || input.task === 'repair'
    || input.task === 'sell-repaired' || input.task === 'complete'
    || input.task === 'place-pot' || input.task === 'plant-basil' || input.task === 'water-basil'
    || input.task === 'grow-basil' || input.task === 'harvest-basil' || input.task === 'sell-basil'
    || input.task === 'buy-seeds' ? input.task : 'find';
  const cleanerOwned = Boolean(input.cleanerOwned);
  const repairToolOwned = Boolean(input.repairToolOwned);
  const wateringCanOwned = Boolean(input.wateringCanOwned);
  const validTool = (value: unknown): value is EquippedTool => value === 'cleaner' || value === 'repair' || value === 'watering-can';
  const savedToolSlots = Array.isArray(input.toolSlots)
    ? input.toolSlots.slice(0, 3).map((value) => validTool(value) ? value : null)
    : [];
  const toolSlots: EquippedTool[] = savedToolSlots.length === 3
    ? savedToolSlots
    : [cleanerOwned ? 'cleaner' : null, repairToolOwned ? 'repair' : null, wateringCanOwned ? 'watering-can' : null];
  const ownedTools: Exclude<EquippedTool, null>[] = [
    ...(cleanerOwned ? ['cleaner' as const] : []),
    ...(repairToolOwned ? ['repair' as const] : []),
    ...(wateringCanOwned ? ['watering-can' as const] : []),
  ];
  // Repair older saves that recorded ownership but still had a stale slot for
  // the borrowed cleaner after the window job was completed.
  for (let index = 0; index < toolSlots.length; index += 1) {
    if (toolSlots[index] && !ownedTools.includes(toolSlots[index] as Exclude<EquippedTool, null>)) toolSlots[index] = null;
  }
  ownedTools.forEach((ownedTool) => {
    if (toolSlots.includes(ownedTool)) return;
    const emptySlot = toolSlots.findIndex((slot) => slot === null);
    if (emptySlot >= 0) toolSlots[emptySlot] = ownedTool;
  });
  const growthValue = Number(input.basilGrowthStartedAt);
  const shopStock = sanitizeShopStock(input.shopStock, legacyPothosStock, condition);
  const saleComplete = Boolean(input.saleComplete)
    || legacyPothosStock
    || shopStock.some((entry) => entry.item === 'small-golden-pothos');
  const repairedPotSaleComplete = Boolean(input.repairedPotSaleComplete)
    || input.task === 'complete'
    || shopStock.some((entry) => entry.item === 'special-repair-pot');
  return {
    coins: Number.isFinite(input.coins) ? Math.max(0, Math.floor(input.coins as number)) : 0,
    inventoryPot: condition,
    inventoryItem,
    inventoryInstanceId,
    // A carried item wins if a damaged/older save accidentally contains both
    // representations; this prevents a duplicate pickup after migration.
    placedWorldItem: condition === null ? placedItem : null,
    saleComplete,
    repairedPotSaleComplete,
    shopGoldenPothosStock: Boolean(input.shopGoldenPothosStock) || saleComplete,
    shopStock,
    windowJobAccepted: Boolean(input.windowJobAccepted),
    // This is the total number of completed sprays across the configured
    // sections. The section definitions own their required counts so future
    // larger windows are not capped at the original prototype total.
    windowCleaningProgress: Math.max(0, Math.min(999, Number(input.windowCleaningProgress) || 0)),
    windowJobComplete: Boolean(input.windowJobComplete),
    cleanerOwned,
    repairToolOwned,
    glueCharges: Math.max(0, Math.floor(Number(input.glueCharges) || 0)),
    brokenPotAvailable: Boolean(input.brokenPotAvailable),
    brokenPotOwned: Boolean(input.brokenPotOwned),
    brokenPotPiecesRemaining: Number.isFinite(savedPieces) ? Math.max(0, Math.min(3, Math.floor(savedPieces))) : 3,
    repairStep: Math.max(0, Math.min(10, Math.floor(Number(input.repairStep) || 0))),
    equippedTool: tool,
    task,
    rentalBondPaid: Boolean(input.rentalBondPaid),
    starterKitClaimed: Boolean(input.starterKitClaimed),
    starterKitGranted: Boolean(input.starterKitGranted),
    starterPotPlaced: Boolean(input.starterPotPlaced),
    starterPotSlot: Math.max(0, Math.min(2, Math.floor(Number(input.starterPotSlot) || 1))),
    basilPlanted: Boolean(input.basilPlanted),
    basilSeeds: Math.max(0, Math.floor(Number(input.basilSeeds) || 0)),
    basilHarvests: Math.max(0, Math.floor(Number(input.basilHarvests) || 0)),
    basilGrowthStartedAt: Number.isFinite(growthValue) && growthValue > 0 ? growthValue : null,
    basilCycleCount: Math.max(0, Math.floor(Number(input.basilCycleCount) || 0)),
    basicFertilizerCharges: Math.max(0, Math.floor(Number(input.basicFertilizerCharges) || 0)),
    wateringCanOwned,
    toolSlots,
  };
}

function sanitizeShopStock(value: unknown, legacyPothosStock: boolean, inventoryPot: PotCondition | null): ShopStockEntry[] {
  const hasNewStockField = Array.isArray(value);
  const source = hasNewStockField ? value : [];
  const normalized: ShopStockEntry[] = [];
  const uniqueIds = new Set<string>();

  for (const candidate of source) {
    if (!candidate || typeof candidate !== 'object') continue;
    const raw = candidate as Partial<ShopStockEntry>;
    const item = raw.item === 'small-golden-pothos' || raw.item === 'special-repair-pot' || raw.item === 'basil-harvest'
      ? raw.item : null;
    if (!item) continue;
    const expectedCondition: ShopStockCondition = item === 'basil-harvest' ? 'fresh' : item === 'small-golden-pothos' ? 'ordinary' : 'repaired';
    const quality = typeof raw.quality === 'string' && raw.quality.trim().length > 0
      ? raw.quality.trim() : DEFAULT_SHOP_STOCK_QUALITY;
    const condition: ShopStockCondition = raw.condition === 'ordinary' || raw.condition === 'broken' || raw.condition === 'repaired' || raw.condition === 'fresh'
      ? raw.condition : expectedCondition;
    if (condition !== expectedCondition) continue;
    const rawQuantity = Number(raw.quantity);
    const quantity = Number.isFinite(rawQuantity)
      ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(rawQuantity))) : 0;
    if (quantity < 1) continue;

    if (item === 'basil-harvest') {
      const existing = normalized.find((entry) => entry.item === item && entry.quality === quality && entry.condition === condition);
      if (existing) existing.quantity += quantity;
      else normalized.push({ stockId: quality === DEFAULT_SHOP_STOCK_QUALITY ? BASIL_HARVEST_STOCK_ID : `${BASIL_HARVEST_STOCK_ID}:${quality}`, item, quality, condition, quantity, instanceIds: [] });
      continue;
    }

    const candidateIds = Array.isArray(raw.instanceIds)
      ? raw.instanceIds.filter((instanceId): instanceId is string => typeof instanceId === 'string' && instanceId.trim().length > 0)
      : [];
    const fallbackId = typeof raw.stockId === 'string' && raw.stockId.trim().length > 0
      ? raw.stockId.trim()
      : item === 'small-golden-pothos' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID;
    const instanceIds = candidateIds.length > 0 ? candidateIds.map((instanceId) => instanceId.trim()) : [fallbackId];
    instanceIds.forEach((instanceId) => {
      if (!instanceId || uniqueIds.has(instanceId)) return;
      uniqueIds.add(instanceId);
      normalized.push({ stockId: instanceId, item, quality, condition, quantity: 1, instanceIds: [instanceId] });
    });
  }

  // Migrate the old boolean Golden Pothos shelf state exactly once. An explicit
  // empty shopStock array means the item was bought back, so it must stay empty.
  if (!hasNewStockField && legacyPothosStock && inventoryPot !== 'ordinary'
    && !normalized.some((entry) => entry.item === 'small-golden-pothos')) {
    normalized.push({
      stockId: OPENING_GOLDEN_POTHOS_INSTANCE_ID,
      item: 'small-golden-pothos',
      quality: DEFAULT_SHOP_STOCK_QUALITY,
      condition: 'ordinary',
      quantity: 1,
      instanceIds: [OPENING_GOLDEN_POTHOS_INSTANCE_ID],
    });
  }
  return normalized;
}
