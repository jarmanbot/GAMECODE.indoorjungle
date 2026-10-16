export type PotCondition = 'ordinary' | 'broken' | 'repaired';
export type EquippedTool = 'cleaner' | 'repair' | null;
export type TaskState = 'find' | 'sell' | 'clean' | 'repair' | 'sell-repaired' | 'complete';

export interface ProgressState {
  coins: number;
  inventoryPot: PotCondition | null;
  saleComplete: boolean;
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
}

export const DEFAULT_PROGRESS: ProgressState = {
  coins: 0,
  inventoryPot: null,
  saleComplete: false,
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
};

export function sanitizeProgress(value: unknown): ProgressState {
  const input = value && typeof value === 'object' ? value as Partial<ProgressState> : {};
  const condition = input.inventoryPot === 'ordinary' || input.inventoryPot === 'broken' || input.inventoryPot === 'repaired'
    ? input.inventoryPot : null;
  const tool = input.equippedTool === 'cleaner' || input.equippedTool === 'repair' ? input.equippedTool : null;
  const savedPieces = Number(input.brokenPotPiecesRemaining);
  const task: TaskState = input.task === 'sell' || input.task === 'clean' || input.task === 'repair'
    || input.task === 'sell-repaired' || input.task === 'complete' ? input.task : 'find';
  return {
    coins: Number.isFinite(input.coins) ? Math.max(0, Math.floor(input.coins as number)) : 0,
    inventoryPot: condition,
    saleComplete: Boolean(input.saleComplete),
    windowJobAccepted: Boolean(input.windowJobAccepted),
    windowCleaningProgress: Math.max(0, Math.min(8, Number(input.windowCleaningProgress) || 0)),
    windowJobComplete: Boolean(input.windowJobComplete),
    cleanerOwned: Boolean(input.cleanerOwned),
    repairToolOwned: Boolean(input.repairToolOwned),
    glueCharges: Math.max(0, Math.floor(Number(input.glueCharges) || 0)),
    brokenPotAvailable: Boolean(input.brokenPotAvailable),
    brokenPotOwned: Boolean(input.brokenPotOwned),
    brokenPotPiecesRemaining: Number.isFinite(savedPieces) ? Math.max(0, Math.min(3, Math.floor(savedPieces))) : 3,
    repairStep: Math.max(0, Math.min(10, Math.floor(Number(input.repairStep) || 0))),
    equippedTool: tool,
    task,
  };
}
