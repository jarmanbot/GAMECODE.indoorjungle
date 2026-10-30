import type { GameScene } from '../game/GameScene';
import type { AudioController } from '../game/AudioController';
import { getDevCheckpointOptions } from '../game/devCheckpoints';
import {
  CITY_DISTRICTS,
  CITY_MAP_SIZE,
  CITY_ROADS,
  FRONT_PAVEMENT_MIN_Y,
  OPPOSITE_PAVEMENT_MAX_Y,
  START_POSITION,
  STARTING_WALKABLE_MAX_X,
  STARTING_WALKABLE_MIN_X,
  BASIL_HARVEST_PRICE,
  BASIL_DELIVERY_REWARD,
  BASIL_SEED_PRICE,
  BASIC_FERTILIZER_BOX_PRICE,
  BASIC_FERTILIZER_PELLETS_PER_BOX,
  BASIC_FERTILIZER_GROWTH_REDUCTION_MS,
  BUY_SELL_NAME,
  getShopBuybackPrice,
  HOMES_WINDOW_CLEAN_SECTIONS,
  OPENING_POTHOS_SALE_PRICE,
  OPENING_POTHOS_DELIVERY_REWARD,
  REPAIRED_POT_SALE_PRICE,
  RARE_BEGONIA_SALE_PRICE,
  WINDOW_JOB_REWARD,
  RENTAL_BOND_COST,
  SECOND_RENTAL_MOVE_COST,
  SECOND_RENTAL_TOTAL_BOND,
  SMALL_BASIC_PLASTIC_POT_PRICE,
  WORLD_WIDTH,
  type PropertyListingKey,
  type ZoomMode,
} from '../game/world';
import { DEFAULT_SHOP_STOCK_QUALITY } from '../game/progress';
import type { BasilStage, InventoryItem, PotCondition, ShopStockEntry, TaskState, EquippedTool, InterfaceTheme } from '../game/progress';
import type { AlexGraphics } from '../game/progress';
import type { PropertyId } from '../game/world';
import { emptyPlantQuantities, getPlantDefinition, getPlantDefinitionByProduct, isPlantProductItem, isPlantSpecies, PLANT_SPECIES, type PlantSpecies } from '../game/plants';
import { PREMIUM_PLANT_CATALOG, isPremiumPlantId, type PremiumPlantId } from '../game/shopCatalog';
import type { GrowingPotState } from '../game/growing';
import { BUILD_COMMIT, BUILD_DATE, PLAYTEST_CANDIDATE, SAVE_DATA_VERSION } from '../game/buildInfo';

const DEV_BUILD = import.meta.env.DEV;

export class HudController {
  private scene: GameScene | null = null;
  private readonly audio: AudioController;
  private zoomOutHandler: (() => void) | null = null;
  private zoomInHandler: (() => void) | null = null;
  private readonly coinCount = document.querySelector<HTMLElement>('#coin-count')!;
  private readonly objectiveText = document.querySelector<HTMLElement>('#objective-text')!;
  private readonly objectiveButton = document.querySelector<HTMLButtonElement>('#objective-button')!;
  private readonly housingObjectiveDropdown = document.querySelector<HTMLElement>('#housing-objective-dropdown')!;
  private readonly zoomToggleButton = document.querySelector<HTMLButtonElement>('#zoom-toggle')!;
  private readonly zoomGlyph = document.querySelector<HTMLElement>('#zoom-glyph')!;
  private readonly zoomCaption = document.querySelector<HTMLElement>('#zoom-caption')!;
  private readonly interactButton = document.querySelector<HTMLButtonElement>('#interact-button')!;
  private readonly interactLabel = document.querySelector<HTMLElement>('#interact-label')!;
  private readonly toast = document.querySelector<HTMLElement>('#toast')!;
  private readonly panelBackdrop = document.querySelector<HTMLElement>('#panel-backdrop')!;
  private readonly panelTitle = document.querySelector<HTMLElement>('#panel-title')!;
  private readonly panelBody = document.querySelector<HTMLElement>('#panel-body')!;
  private readonly toastMessage = document.querySelector<HTMLElement>('#toast-message')!;
  private readonly toastOk = document.querySelector<HTMLButtonElement>('#toast-ok')!;
  private readonly toastClose = document.querySelector<HTMLButtonElement>('#toast-close')!;
  private readonly mapCentreButton = document.querySelector<HTMLButtonElement>('#map-centre')!;
  private readonly rotateOverlay = document.querySelector<HTMLElement>('#rotate-overlay')!;
  private readonly joystick = document.querySelector<HTMLElement>('#joystick')!;
  private readonly joystickKnob = document.querySelector<HTMLElement>('#joystick-knob')!;
  private readonly controlPanel = document.querySelector<HTMLElement>('#phone-control-panel')!;
  private readonly arcadeA = document.querySelector<HTMLButtonElement>('#arcade-a')!;
  private readonly arcadeB = document.querySelector<HTMLButtonElement>('#arcade-b')!;
  private readonly toolSelector = document.querySelector<HTMLButtonElement>('#tool-selector')!;
  private readonly toolSelectorIcon = document.querySelector<HTMLElement>('#tool-selector-icon')!;
  private readonly toolPopupBackdrop = document.querySelector<HTMLElement>('#tool-popup-backdrop')!;
  private readonly toolPopupClose = document.querySelector<HTMLButtonElement>('#tool-popup-close')!;
  private readonly toolSlots = document.querySelector<HTMLElement>('#tool-slots')!;
  private readonly startScreen = document.querySelector<HTMLElement>('#start-screen')!;
  private readonly startContinue = document.querySelector<HTMLButtonElement>('#start-continue')!;
  private readonly startNew = document.querySelector<HTMLButtonElement>('#start-new')!;
  private readonly startConfirm = document.querySelector<HTMLElement>('#start-confirm')!;
  private readonly startTerminalStatus = document.querySelector<HTMLElement>('#start-terminal-status')!;
  private readonly graphicsUpgradeOverlay = document.querySelector<HTMLElement>('#graphics-upgrade-overlay')!;
  private readonly graphicsUpgradeCard = document.querySelector<HTMLElement>('#graphics-upgrade-card')!;
  private readonly graphicsUpgradeContent = document.querySelector<HTMLElement>('#graphics-upgrade-content')!;
  private readonly graphicsUpgradeOk = document.querySelector<HTMLButtonElement>('#graphics-upgrade-ok')!;
  private readonly playtestCompleteOverlay = document.querySelector<HTMLElement>('#playtest-complete-overlay')!;
  private readonly playtestCompleteActions = document.querySelector<HTMLElement>('#playtest-complete-actions')!;
  private readonly playtestRestartConfirm = document.querySelector<HTMLElement>('#playtest-restart-confirm')!;
  private readonly restartTerminalStatus = document.querySelector<HTMLElement>('#restart-terminal-status')!;
  private bootTransitionActive = false;
  private activeTask: TaskState = 'find';
  private activePanelKind: string | null = null;
  private shopTab: 'sell' | 'buy' | 'wanted' = 'wanted';
  private shopFeedback = '';
  private propertyFeedback = '';
  private basilFeedback = '';
  private coins = 0;
  private hasPot = false;
  private inventoryItem: InventoryItem | null = null;
  private potCondition: PotCondition | null = null;
  private equippedTool: EquippedTool = null;
  private repairToolOwned = false;
  private cleanerOwned = false;
  private wateringCanOwned = false;
  private assignedToolSlots: EquippedTool[] = [null, null, null];
  private glueCharges = 0;
  private brokenPotPieceSelected = false;
  private brokenPotPiecesOwned = 0;
  private canPlaceItem = false;
  private povoWelcomeGiftClaimed = false;
  private rentalBondPaid = false;
  private rentalKeyOwned = false;
  private activeProperty: PropertyId = 'none';
  private rentalBondTotal = 0;
  private basilHarvestSaleRecorded = false;
  private mintHarvestSaleRecorded = false;
  private hasCollectedSaleableItem = false;
  private saleComplete = false;
  private windowJobAccepted = false;
  private paidWorkComplete = false;
  private repairComplete = false;
  private foundPotCount = 0;
  private basicFertilizerCharges = 0;
  private seedQuantities: Record<PlantSpecies, number> = emptyPlantQuantities();
  private harvestQuantities: Record<PlantSpecies, number> = emptyPlantQuantities();
  private growingEvents: Record<PlantSpecies, number> = emptyPlantQuantities();
  private growingPots: GrowingPotState[] = [];
  private ownedPremiumPlants: PremiumPlantId[] = [];
  private mapPositionRatio = START_POSITION.x / WORLD_WIDTH;
  private mapPositionY = START_POSITION.y;
  private cityMapZoom = 0.72;
  private cityMapPanCleanup: (() => void) | null = null;
  private joystickPointerId: number | null = null;
  private phoneHybridLayout = false;
  private zoomMode: ZoomMode = 'normal';
  private toolPointerId: number | null = null;
  private joystickSide: 'left' | 'right' = this.loadJoystickSide();
  private arcadeAPointerId: number | null = null;
  private devTestMode = false;
  private devCheckpointId = getDevCheckpointOptions()[0]?.id ?? '';
  private devFeedback = '';
  private activeActionLabel: string | null = null;
  private actionHideTimer: number | null = null;
  private startContinueAction: (() => void) | null = null;
  private startNewAction: (() => void) | null = null;
  private toastDismissAction: (() => void) | null = null;
  private graphicsUpgradeAction: (() => void) | null = null;
  private graphicsUpgradeInstalled = false;
  private alexGraphics: AlexGraphics = 'atari-bw';
  private interfaceTheme: InterfaceTheme = 'auto';

  constructor(audio: AudioController) {
    this.audio = audio;
    document.querySelectorAll<HTMLButtonElement>('[data-panel]').forEach((button) => {
      this.bindButtonActivation(button, () => this.openPanel(button.dataset.panel ?? 'more'));
    });
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#settings-button')!, () => this.openPanel('settings'));
    this.bindButtonActivation(this.objectiveButton, () => this.toggleHousingObjective());
    this.housingObjectiveDropdown.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-close-housing-objective]')) return;
      event.preventDefault();
      event.stopPropagation();
      this.closeHousingObjective();
    });
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#close-panel')!, () => this.closePanel());
    this.bindButtonActivation(this.toastOk, () => this.dismissActionToast());
    this.bindButtonActivation(this.toastClose, () => this.dismissActionToast());
    this.bindButtonActivation(this.mapCentreButton, () => this.centreCityMap());
    this.panelBackdrop.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target === this.panelBackdrop && this.activePanelKind !== 'shop') this.closePanel();
    });
    this.bindButtonActivation(this.zoomToggleButton, () => this.toggleZoom());
    this.bindButtonActivation(this.toolSelector, () => this.toggleToolPopup());
    this.bindButtonActivation(this.toolPopupClose, () => this.closeToolPopup());
    this.toolPopupBackdrop.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target === this.toolPopupBackdrop) this.closeToolPopup();
    }, { passive: false });
    this.toolPopupBackdrop.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target === this.toolPopupBackdrop) this.closeToolPopup();
    });
    this.bindButtonActivation(this.interactButton, () => this.scene?.tryInteract());
    this.bindButtonActivation(this.startContinue, () => this.runBootTransition(this.startTerminalStatus, 'RESTORING SESSION...', () => this.startContinueAction?.()));
    this.bindButtonActivation(this.startNew, () => this.runBootTransition(this.startTerminalStatus, 'INITIALISING NEW SESSION...', () => this.startNewAction?.()));
    this.bindButtonActivation(this.graphicsUpgradeOk, () => this.graphicsUpgradeAction?.());
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#playtest-continue')!, () => this.hidePlaytestComplete());
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#playtest-close')!, () => this.hidePlaytestComplete());
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#playtest-restart')!, () => {
      this.playtestCompleteActions.hidden = true;
      this.playtestRestartConfirm.hidden = false;
    });
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#playtest-restart-cancel')!, () => {
      this.playtestRestartConfirm.hidden = true;
      this.playtestCompleteActions.hidden = false;
    });
    this.bindButtonActivation(document.querySelector<HTMLButtonElement>('#playtest-restart-confirm-button')!, () => {
      this.runBootTransition(this.restartTerminalStatus, 'INITIALISING NEW SESSION...', () => {
        this.hidePlaytestComplete();
        this.scene?.restartPlaytest();
      });
    });
    this.bindJoystickControls();
    this.bindArcadeControls();
    this.applyJoystickSide();
    window.addEventListener('resize', () => {
      this.refreshCityMapLayout();
      this.refreshPhoneLayout();
    });
    window.visualViewport?.addEventListener('resize', () => {
      this.refreshCityMapLayout();
      this.refreshPhoneLayout();
    });
    window.addEventListener('orientationchange', () => {
      this.resetHeldInputs();
      this.refreshPhoneLayout();
    });
    window.addEventListener('blur', () => this.resetHeldInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetHeldInputs();
    });
  }

  bindScene(scene: GameScene): void {
    this.scene = scene;
    this.refreshPhoneLayout();
  }

  showStartScreen(hasContinue: boolean, continueAction: () => void, newGameAction: () => void): void {
    this.bootTransitionActive = false;
    this.startTerminalStatus.hidden = true;
    this.startContinueAction = continueAction;
    this.startNewAction = newGameAction;
    this.startContinue.hidden = !hasContinue;
    this.startNew.hidden = false;
    this.startConfirm.hidden = !hasContinue;
    this.startScreen.hidden = false;
  }

  private runBootTransition(status: HTMLElement, message: string, action: () => void): void {
    if (this.bootTransitionActive) return;
    this.bootTransitionActive = true;
    const controls = Array.from(status.closest('section')?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    controls.forEach((button) => { button.disabled = true; });
    status.textContent = `> ${message}`;
    status.hidden = false;
    window.setTimeout(() => {
      controls.forEach((button) => { button.disabled = false; });
      action();
      this.bootTransitionActive = false;
      status.hidden = true;
    }, 450);
  }

  hideStartScreen(): void {
    this.startScreen.hidden = true;
    this.startContinueAction = null;
    this.startNewAction = null;
  }

  showPlaytestComplete(): void {
    this.bootTransitionActive = false;
    this.restartTerminalStatus.hidden = true;
    this.resetHeldInputs();
    this.closeToolPopup();
    this.playtestRestartConfirm.hidden = true;
    this.playtestCompleteActions.hidden = false;
    this.playtestCompleteOverlay.hidden = false;
    this.scene?.setModalOpen(true);
  }

  hidePlaytestComplete(): void {
    this.playtestCompleteOverlay.hidden = true;
    this.playtestRestartConfirm.hidden = true;
    this.playtestCompleteActions.hidden = false;
    this.scene?.setModalOpen(false);
  }

  showGraphicsUpgradePrompt(action: () => void): void {
    this.graphicsUpgradeAction = action;
    this.graphicsUpgradeCard.classList.remove('is-installing', 'is-complete');
    this.graphicsUpgradeContent.innerHTML = '<h2 id="graphics-upgrade-title">GRAPHICS MODULE PACKAGE DETECTED</h2><p>INSTALL?</p>';
    this.graphicsUpgradeOk.hidden = false;
    this.graphicsUpgradeOk.textContent = 'OK';
    this.graphicsUpgradeOverlay.hidden = false;
  }

  showGraphicsInstallation(): void {
    this.graphicsUpgradeAction = null;
    this.graphicsUpgradeCard.classList.remove('is-complete');
    this.graphicsUpgradeCard.classList.add('is-installing');
    this.graphicsUpgradeContent.innerHTML = '<h2 id="graphics-upgrade-title">GRAPHICS INSTALLATION</h2><div class="graphics-module-list"><span>ALEX MONOCHROME RASTER ........ LOADED</span><span>GAMEJOY MONOCHROME RASTER ..... LOADED</span><span>BUY/SELL COLOUR PALETTE ....... LOADED</span><span>NURSERY CONSTRUCTION PLAN ..... ONLINE</span></div><p id="graphics-upgrade-status">LOADING MODULES<span class="graphics-upgrade-dots">...</span></p><div class="graphics-upgrade-progress" id="graphics-upgrade-progress">[..........] 0%</div><div class="graphics-upgrade-bar" aria-hidden="true"><span id="graphics-upgrade-bar-fill"></span></div>';
    this.graphicsUpgradeOk.hidden = true;
    this.graphicsUpgradeOverlay.hidden = false;
  }

  updateGraphicsInstallation(progress: number, complete = false): void {
    const value = Math.max(0, Math.min(1, progress));
    const percent = Math.round(value * 100);
    const filled = Math.round(value * 10);
    const indicator = `[${'#'.repeat(filled)}${'.'.repeat(10 - filled)}] ${percent}%`;
    const progressText = this.graphicsUpgradeContent.querySelector<HTMLElement>('#graphics-upgrade-progress');
    const bar = this.graphicsUpgradeContent.querySelector<HTMLElement>('#graphics-upgrade-bar-fill');
    const status = this.graphicsUpgradeContent.querySelector<HTMLElement>('#graphics-upgrade-status');
    if (progressText) progressText.textContent = indicator;
    if (bar) bar.style.width = `${percent}%`;
    if (status) status.innerHTML = complete ? 'GRAPHICS MODULES LOADED' : `LOADING MODULES<span class="graphics-upgrade-dots">${'.'.repeat((Math.floor(value * 12) % 3) + 1)}</span>`;
  }

  showGraphicsAcknowledgement(action: () => void): void {
    this.graphicsUpgradeAction = action;
    this.graphicsUpgradeCard.classList.remove('is-installing');
    this.graphicsUpgradeCard.classList.add('is-complete');
    this.graphicsUpgradeContent.innerHTML = '<h2 id="graphics-upgrade-title">GRAPHICS MODULES LOADED</h2><p>Installation complete.</p>';
    this.graphicsUpgradeOk.hidden = false;
    this.graphicsUpgradeOk.textContent = 'OK';
    this.graphicsUpgradeOverlay.hidden = false;
  }

  hideGraphicsUpgrade(): void {
    this.graphicsUpgradeAction = null;
    this.graphicsUpgradeCard.classList.remove('is-installing', 'is-complete');
    this.graphicsUpgradeOverlay.hidden = true;
  }

  setPhoneHybridLayout(enabled: boolean): void {
    if (this.phoneHybridLayout !== enabled) {
      this.phoneHybridLayout = enabled;
      document.documentElement.classList.toggle('phone-hybrid', enabled);
      if (!enabled) this.resetHeldInputs();
    }
    this.refreshPhoneLayout();
  }

  resetJoystick(): void {
    const pointerId = this.joystickPointerId;
    this.joystickPointerId = null;
    if (pointerId !== null) this.joystick.releasePointerCapture?.(pointerId);
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.scene?.setJoystickInput(0, 0, false);
  }

  resetHeldInputs(): void {
    this.resetJoystick();
    const aPointerId = this.arcadeAPointerId;
    this.arcadeAPointerId = null;
    if (aPointerId !== null) this.arcadeA.releasePointerCapture?.(aPointerId);
    const pointerId = this.toolPointerId;
    this.toolPointerId = null;
    if (pointerId !== null) this.arcadeB.releasePointerCapture?.(pointerId);
    this.arcadeB.classList.remove('is-held');
    this.scene?.cancelActiveToolAction();
  }

  setPhoneOrientationBlocked(blocked: boolean): void {
    this.rotateOverlay.hidden = !blocked;
  }

  setDevTestMode(active: boolean, checkpointId: string | null): void {
    this.devTestMode = DEV_BUILD && active;
    if (checkpointId) this.devCheckpointId = checkpointId;
  }

  showDevFeedback(message: string): void {
    this.devFeedback = message;
    const feedback = this.panelBody.querySelector<HTMLElement>('[data-dev-feedback]');
    if (feedback) feedback.textContent = message;
    const finishCrop = this.panelBody.querySelector<HTMLButtonElement>('[data-dev-finish-crop]');
    if (finishCrop) finishCrop.disabled = !this.scene?.canFinishCurrentCrop();
  }

  bindZoomControls(zoomOut: () => void, zoomIn: () => void): void {
    this.zoomOutHandler = zoomOut;
    this.zoomInHandler = zoomIn;
  }

  setGameState(state: { coins: number; inventoryHasPot: boolean; inventoryPotCondition?: PotCondition | null; inventoryItem?: InventoryItem | null; task: TaskState; equippedTool?: EquippedTool; repairToolOwned?: boolean; cleanerOwned?: boolean; wateringCanOwned?: boolean; toolSlots?: EquippedTool[]; glueCharges?: number; brokenPotPieceSelected?: boolean; brokenPotPiecesOwned?: number; canPlaceItem?: boolean; povoWelcomeGiftClaimed?: boolean; rentalBondPaid?: boolean; rentalKeyOwned?: boolean; activeProperty?: PropertyId; rentalBondTotal?: number; basilHarvestSaleRecorded?: boolean; mintHarvestSaleRecorded?: boolean; hasCollectedSaleableItem?: boolean; saleComplete?: boolean; windowJobAccepted?: boolean; paidWorkComplete?: boolean; repairComplete?: boolean; foundPotCount?: number; basicFertilizerCharges?: number; seedQuantities?: Record<PlantSpecies, number>; harvestQuantities?: Record<PlantSpecies, number>; growingEvents?: Record<PlantSpecies, number>; growingPots?: GrowingPotState[]; graphicsUpgradeInstalled?: boolean; alexGraphics?: AlexGraphics; interfaceTheme?: InterfaceTheme; ownedPremiumPlants?: PremiumPlantId[] }): void {
    this.coins = state.coins;
    this.coinCount.textContent = String(state.coins);
    this.hasPot = state.inventoryHasPot;
    this.potCondition = state.inventoryPotCondition ?? (state.inventoryHasPot ? 'ordinary' : null);
    this.inventoryItem = state.inventoryItem ?? (this.potCondition === 'ordinary' ? 'small-golden-pothos' : this.potCondition ? 'special-repair-pot' : null);
    this.brokenPotPieceSelected = state.brokenPotPieceSelected ?? false;
    this.brokenPotPiecesOwned = state.brokenPotPiecesOwned ?? 0;
    this.canPlaceItem = state.canPlaceItem ?? false;
    this.setEquippedTool(state.equippedTool ?? null);
    this.repairToolOwned = state.repairToolOwned ?? this.repairToolOwned;
    this.cleanerOwned = state.cleanerOwned ?? this.cleanerOwned;
    this.wateringCanOwned = state.wateringCanOwned ?? this.wateringCanOwned;
    this.assignedToolSlots = state.toolSlots?.slice(0, 3) ?? this.assignedToolSlots;
    this.glueCharges = state.glueCharges ?? this.glueCharges;
    this.activeTask = state.task;
    this.povoWelcomeGiftClaimed = state.povoWelcomeGiftClaimed ?? this.povoWelcomeGiftClaimed;
    this.rentalBondPaid = state.rentalBondPaid ?? this.rentalBondPaid;
    this.rentalKeyOwned = state.rentalKeyOwned ?? this.rentalKeyOwned;
    this.activeProperty = state.activeProperty ?? this.activeProperty;
    this.rentalBondTotal = state.rentalBondTotal ?? this.rentalBondTotal;
    this.basilHarvestSaleRecorded = state.basilHarvestSaleRecorded ?? this.basilHarvestSaleRecorded;
    this.mintHarvestSaleRecorded = state.mintHarvestSaleRecorded ?? this.mintHarvestSaleRecorded;
    this.hasCollectedSaleableItem = state.hasCollectedSaleableItem ?? this.hasCollectedSaleableItem;
    this.saleComplete = state.saleComplete ?? this.saleComplete;
    this.windowJobAccepted = state.windowJobAccepted ?? this.windowJobAccepted;
    this.paidWorkComplete = state.paidWorkComplete ?? this.paidWorkComplete;
    this.repairComplete = state.repairComplete ?? this.repairComplete;
    this.foundPotCount = state.foundPotCount ?? this.foundPotCount;
    this.basicFertilizerCharges = state.basicFertilizerCharges ?? this.basicFertilizerCharges;
    this.seedQuantities = state.seedQuantities ? { ...this.seedQuantities, ...state.seedQuantities } : this.seedQuantities;
    this.harvestQuantities = state.harvestQuantities ? { ...this.harvestQuantities, ...state.harvestQuantities } : this.harvestQuantities;
    this.growingEvents = state.growingEvents ? { ...this.growingEvents, ...state.growingEvents } : this.growingEvents;
    this.growingPots = state.growingPots?.map((pot) => ({ ...pot, crop: pot.crop ? { ...pot.crop } : null })) ?? this.growingPots;
    this.ownedPremiumPlants = state.ownedPremiumPlants ? [...state.ownedPremiumPlants] : this.ownedPremiumPlants;
    this.graphicsUpgradeInstalled = state.graphicsUpgradeInstalled ?? this.graphicsUpgradeInstalled;
    this.alexGraphics = state.alexGraphics ?? this.alexGraphics;
    this.interfaceTheme = state.interfaceTheme ?? this.interfaceTheme;
    const greenInterface = this.interfaceTheme === 'green-crt' || (this.interfaceTheme === 'auto' && !this.graphicsUpgradeInstalled);
    document.documentElement.classList.toggle('interface-green-crt', greenInterface);
    document.documentElement.classList.toggle('graphics-upgrade-installed', this.graphicsUpgradeInstalled);
    this.refreshToolPopup();
    const labels: Record<TaskState, string> = {
      find: 'Find a Small Golden Pothos',
      sell: `Sell the Small Golden Pothos at ${BUY_SELL_NAME}`,
      clean: 'Clean both windows of the Real Estate Agent and they might open',
      repair: this.potCondition === 'broken'
        ? 'Head to Bag and put down the broken pieces to repair the pot'
        : 'Find the broken pot pieces',
      'sell-repaired': `Sell the repaired pot at ${BUY_SELL_NAME}`,
      complete: 'Prototype task complete',
      'place-pot': this.povoWelcomeGiftClaimed ? 'Place an owned pot on an empty grow-table slot' : 'Enter the apartment and claim the welcome gift',
      'plant-basil': 'Plant basil in your starter pot',
      'water-basil': this.growingEvents.basil > 1 ? 'Water and grow basil' : 'Water the planted basil',
      'grow-basil': 'Wait for the basil to grow',
      'harvest-basil': 'Harvest the mature basil',
      'sell-basil': `Sell the basil harvest at ${BUY_SELL_NAME}`,
      'buy-seeds': 'Buy seeds for another grow-table crop',
      'plant-mint': 'Plant mint in an empty grow-table pot',
      'water-mint': 'Water the planted mint',
      'grow-mint': 'Wait for the mint to grow',
      'harvest-mint': 'Harvest the mature mint',
      'sell-mint': `Sell the mint harvest at ${BUY_SELL_NAME}`,
      'plant-dwarf-marigold': 'Plant Dwarf Marigold in a basic pot',
      'water-dwarf-marigold': 'Water the planted Dwarf Marigold',
      'grow-dwarf-marigold': 'Wait for the Dwarf Marigold to grow',
      'lift-dwarf-marigold': 'Lift the mature Dwarf Marigold into the Bag',
      'sell-dwarf-marigold': `Sell the potted Dwarf Marigold at ${BUY_SELL_NAME}`,
      'plant-peace-lily': 'Plant Peace Lily in a basic pot',
      'water-peace-lily': 'Water the planted Peace Lily',
      'grow-peace-lily': 'Wait for the Peace Lily to grow',
      'lift-peace-lily': 'Lift the mature Peace Lily into the Bag',
      'sell-peace-lily': `Sell the potted Peace Lily at ${BUY_SELL_NAME}`,
      'move-rental': 'Move into a bigger rental',
    };
    this.objectiveText.textContent = this.rentalBondPaid ? (this.povoWelcomeGiftClaimed ? labels[state.task] : 'Enter the apartment and claim the welcome gift') : 'Find a place to live';
    this.objectiveButton.classList.toggle('is-housing-objective', !this.rentalBondPaid);
    this.objectiveButton.setAttribute('aria-expanded', String(!this.housingObjectiveDropdown.hidden && !this.rentalBondPaid));
    this.renderHousingObjective();
  }

  setEquippedTool(tool: EquippedTool): void {
    this.equippedTool = tool;
    const label = tool === 'cleaner' ? 'CLEANER' : tool === 'repair' ? 'REPAIR TOOL' : tool === 'watering-can' ? 'WATERING CAN' : 'NO TOOL EQUIPPED';
    this.toolSelectorIcon.textContent = tool === 'cleaner' ? '▱' : tool === 'repair' ? '⚒' : tool === 'watering-can' ? '≈' : '⚒';
    this.toolSelector.classList.toggle('is-equipped', Boolean(tool));
    this.toolSelector.setAttribute('aria-label', tool ? `Open tool selector. Equipped ${label.toLowerCase()}` : 'Open tool selector. No tool equipped');
    this.arcadeB.disabled = !tool && !this.brokenPotPieceSelected && !this.canPlaceItem;
    this.arcadeB.setAttribute('aria-label', this.brokenPotPieceSelected ? 'Pick up selected broken pot piece' : this.canPlaceItem ? 'Put down item on selected pavement square' : tool ? `Use ${label.toLowerCase()}` : 'No tool equipped');
    this.refreshToolPopup();
  }

  private toggleHousingObjective(): void {
    if (this.rentalBondPaid) return;
    this.renderHousingObjective();
    this.housingObjectiveDropdown.hidden = !this.housingObjectiveDropdown.hidden;
    this.objectiveButton.setAttribute('aria-expanded', String(!this.housingObjectiveDropdown.hidden));
  }

  private closeHousingObjective(): void {
    this.housingObjectiveDropdown.hidden = true;
    this.objectiveButton.setAttribute('aria-expanded', 'false');
  }

  private renderHousingObjective(): void {
    if (this.rentalBondPaid) {
      this.housingObjectiveDropdown.hidden = true;
      this.objectiveButton.setAttribute('aria-expanded', 'false');
      return;
    }
    const coinProgress = this.coins >= RENTAL_BOND_COST
      ? `${this.coins} coins · ENOUGH FOR BOND`
      : `${this.coins} / ${RENTAL_BOND_COST} coins`;
    const rows = [
      ['Collect a saleable item', this.hasCollectedSaleableItem],
      ['Sell an item', this.saleComplete],
      ['Complete paid work', this.paidWorkComplete],
      [`Find 3 pots (${Math.min(3, this.foundPotCount)} / 3)`, this.foundPotCount >= 3],
      ['Repair one item', this.repairComplete],
      [`Have ${RENTAL_BOND_COST} coins for the bond`, this.coins >= RENTAL_BOND_COST || this.rentalBondPaid],
      ['Rent the apartment', this.rentalBondPaid],
      ['Receive the rental key', this.rentalKeyOwned],
    ].map(([label, complete]) => `<li class="housing-check ${complete ? 'is-complete' : ''}"><span>${complete ? '✓' : '○'}</span><strong>${label}</strong></li>`).join('');
    this.housingObjectiveDropdown.innerHTML = `<button class="housing-objective-close" type="button" aria-label="Close objective details" data-close-housing-objective>×</button><strong>Need ${RENTAL_BOND_COST} coins to rent an apartment.</strong><small>Find items, sell for coins, and find work in ${BUY_SELL_NAME}.</small><div class="housing-coin-progress">COINS <b>${coinProgress}</b></div><ul>${rows}</ul>`;
  }

  setJoystickSide(side: 'left' | 'right'): void {
    this.joystickSide = side;
    this.applyJoystickSide();
    this.resetHeldInputs();
    try { localStorage.setItem('indoor-jungle-controls', JSON.stringify({ joystickSide: side })); } catch { /* storage can be unavailable */ }
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-joystick-side]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.joystickSide === side);
    });
  }

  setAction(label: string | null): void {
    if (this.actionHideTimer !== null) {
      window.clearTimeout(this.actionHideTimer);
      this.actionHideTimer = null;
    }
    if (label === this.activeActionLabel) return;
    this.activeActionLabel = label;
    if (label) {
      this.interactLabel.textContent = label;
      this.interactButton.hidden = false;
      requestAnimationFrame(() => {
        if (this.activeActionLabel === label) this.interactButton.classList.add('is-visible');
      });
      return;
    }
    this.interactButton.classList.remove('is-visible');
    this.actionHideTimer = window.setTimeout(() => {
      this.actionHideTimer = null;
      if (this.activeActionLabel === null) this.interactButton.hidden = true;
    }, 180);
  }

  highlightBag(): void {
    const bagButton = document.querySelector<HTMLButtonElement>('[data-panel="bag"]');
    if (!bagButton) return;
    bagButton.classList.add('is-highlighted');
    window.setTimeout(() => bagButton.classList.remove('is-highlighted'), 1200);
  }

  highlightToolSelector(): void {
    this.toolSelector.classList.add('is-highlighted');
    window.setTimeout(() => this.toolSelector.classList.remove('is-highlighted'), 2200);
  }

  refreshShopPanel(feedback = ''): void {
    if (feedback) this.shopFeedback = feedback;
    if (this.activePanelKind !== 'shop') return;
    this.panelBody.innerHTML = this.shopPanelMarkup();
    this.bindShopPanel();
  }

  refreshPropertyPanel(feedback = ''): void {
    if (feedback) this.propertyFeedback = feedback;
    if (!this.activePanelKind?.startsWith('property-')) return;
    const listing = this.activePanelKind.slice('property-'.length) as PropertyListingKey;
    this.panelBody.innerHTML = this.propertyPanelMarkup(listing);
    this.bindPropertyPanel();
  }

  openPropertyDetails(listing: PropertyListingKey): void {
    this.openPanel(`property-${listing}`);
  }

  openRealEstatePanel(): void {
    this.openPanel('real-estate');
  }

  refreshBasilPanel(feedback = ''): void {
    if (feedback) this.basilFeedback = feedback;
    if (this.activePanelKind !== 'basil') return;
    this.panelBody.innerHTML = this.basilPanelMarkup();
    this.bindBasilPanel();
  }

  openBasilPanel(): void {
    this.openPanel('basil');
  }

  setZoomMode(mode: ZoomMode): void {
    this.zoomMode = mode;
    const zoomingIn = mode === 'normal';
    const glyph = zoomingIn ? '＋' : '−';
    const caption = zoomingIn ? 'IN' : 'OUT';
    const label = zoomingIn ? 'Zoom in (period key)' : 'Zoom out (comma key)';
    this.zoomGlyph.textContent = glyph;
    this.zoomCaption.textContent = caption;
    this.zoomToggleButton.setAttribute('aria-label', label);
    this.zoomToggleButton.classList.toggle('is-zoom-in', zoomingIn);
    this.zoomToggleButton.classList.toggle('is-zoom-out', !zoomingIn);
  }

  setMapPosition(ratio: number, worldY = this.mapPositionY): void {
    this.mapPositionRatio = ratio;
    this.mapPositionY = worldY;
    const mapPlayer = document.querySelector<HTMLElement>('#map-player');
    if (!mapPlayer) return;
    const startingDistrict = CITY_DISTRICTS.find((district) => district.id === 'starting-neighbourhood');
    if (!startingDistrict) return;
    const streetX = ratio * WORLD_WIDTH;
    const progress = Math.max(0, Math.min(1,
      (streetX - STARTING_WALKABLE_MIN_X) / (STARTING_WALKABLE_MAX_X - STARTING_WALKABLE_MIN_X),
    ));
    mapPlayer.style.left = `${startingDistrict.x + progress * startingDistrict.width}px`;
    const verticalProgress = Math.max(0, Math.min(1,
      (worldY - FRONT_PAVEMENT_MIN_Y) / (OPPOSITE_PAVEMENT_MAX_Y - FRONT_PAVEMENT_MIN_Y),
    ));
    mapPlayer.style.top = `${startingDistrict.y + startingDistrict.height * (0.48 + verticalProgress * 0.34)}px`;
  }

  showToast(message: string): void {
    this.toastDismissAction = null;
    this.toastMessage.textContent = message;
    this.toast.classList.remove('is-dismissible', 'is-opening-intro', 'is-welcome-gift', 'is-property-handover', 'is-completion');
    this.toastOk.hidden = true;
    this.toastClose.hidden = true;
    this.toast.classList.toggle('is-visible', Boolean(message));
  }

  showDismissibleToast(message: string): void {
    this.toastDismissAction = null;
    this.toastMessage.textContent = message;
    this.toast.classList.remove('is-opening-intro', 'is-welcome-gift', 'is-property-handover', 'is-completion');
    this.toast.classList.add('is-dismissible');
    this.toastOk.hidden = true;
    this.toastClose.hidden = false;
    this.toast.classList.add('is-visible');
  }

  showOpeningIntro(message: string, action: () => void): void {
    this.toastDismissAction = action;
    this.toastMessage.textContent = message;
    this.toast.classList.remove('is-welcome-gift', 'is-property-handover');
    this.toast.classList.add('is-dismissible', 'is-opening-intro');
    this.toastOk.hidden = false;
    this.toastClose.hidden = true;
    this.toast.classList.add('is-visible');
  }

  showConfirmationToast(message: string): void {
    this.toastDismissAction = null;
    this.toastMessage.textContent = message;
    this.toast.classList.remove('is-opening-intro', 'is-welcome-gift', 'is-property-handover');
    this.toast.classList.add('is-dismissible', 'is-completion');
    this.toastOk.hidden = false;
    this.toastClose.hidden = true;
    this.toast.classList.add('is-visible');
  }

  showPropertyHandover(message: string, action: () => void): void {
    this.toastDismissAction = action;
    this.toastMessage.textContent = message;
    this.toast.classList.remove('is-opening-intro', 'is-completion');
    this.toast.classList.add('is-dismissible', 'is-welcome-gift', 'is-property-handover');
    this.toastOk.hidden = false;
    this.toastClose.hidden = true;
    this.toast.classList.add('is-visible');
  }

  showAcknowledgement(message: string, action: () => void): void {
    this.toastDismissAction = action;
    this.toastMessage.textContent = message;
    this.toast.classList.remove('is-opening-intro', 'is-welcome-gift', 'is-property-handover');
    this.toast.classList.add('is-dismissible', 'is-completion');
    this.toastOk.hidden = false;
    this.toastClose.hidden = true;
    this.toast.classList.add('is-visible');
  }

  private dismissActionToast(): void {
    this.scene?.suppressWorldInput();
    const action = this.toastDismissAction;
    this.toastDismissAction = null;
    this.showToast('');
    action?.();
  }

  private bindButtonActivation(button: HTMLButtonElement, action: () => void): void {
    let lastActivationAt = 0;
    const activate = (event: Event): void => {
      const now = performance.now();
      if (now - lastActivationAt < 350) return;
      lastActivationAt = now;
      event.preventDefault();
      event.stopPropagation();
      this.audio.unlock();
      action();
    };
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('pointerup', activate);
    button.addEventListener('click', activate);
  }

  private toggleZoom(): void {
    if (this.zoomMode === 'normal') this.zoomInHandler?.();
    else this.zoomOutHandler?.();
  }

  private toggleToolPopup(): void {
    if (this.scene?.isShopTransactionBusy()) return;
    if (this.toolPopupBackdrop.hidden) this.openToolPopup();
    else this.closeToolPopup();
  }

  private openToolPopup(): void {
    this.resetHeldInputs();
    this.refreshToolPopup();
    this.toolPopupBackdrop.hidden = false;
    this.toolPopupBackdrop.classList.add('is-open');
    this.toolSelector.setAttribute('aria-expanded', 'true');
    this.scene?.setModalOpen(true, true);
  }

  private closeToolPopup(): void {
    if (this.toolPopupBackdrop.hidden) return;
    this.toolPopupBackdrop.classList.remove('is-open');
    this.toolPopupBackdrop.hidden = true;
    this.toolSelector.setAttribute('aria-expanded', 'false');
    this.scene?.setModalOpen(false, true);
  }

  private refreshToolPopup(): void {
    if (!this.toolSlots) return;
    const definitions: Record<Exclude<EquippedTool, null>, { label: string; icon: string; owned: boolean }> = {
      cleaner: { label: 'CLEANER', icon: '▱', owned: this.cleanerOwned },
      repair: { label: 'REPAIR TOOL', icon: '⚒', owned: this.repairToolOwned },
      'watering-can': { label: 'WATERING CAN', icon: '≈', owned: this.wateringCanOwned },
    };
    const slots = this.assignedToolSlots.length === 3 ? this.assignedToolSlots : [null, null, null];
    const slotMarkup = slots.map((slot) => {
      const definition = slot ? definitions[slot] : null;
      const active = slot !== null && slot === this.equippedTool;
      const owned = Boolean(definition?.owned);
      const disabled = owned ? '' : ' disabled';
      const classes = `tool-slot${owned ? ' is-owned' : ''}${active ? ' is-active' : ''}`;
      const key = slot && owned ? ` data-tool="${slot}"` : '';
      const label = owned && definition ? definition.label : 'EMPTY';
      const icon = owned && definition ? definition.icon : '—';
      return `<button class="${classes}" type="button"${key}${disabled} aria-label="${owned ? `Equip ${label.toLowerCase()}` : 'Empty tool slot'}"><strong>${icon}</strong><span>${active ? 'ACTIVE' : label}</span></button>`;
    }).join('');
    const glueMarkup = this.glueCharges > 0
      ? `<div class="tool-supply"><strong>GLUE</strong><span>${this.glueCharges} CHARGE${this.glueCharges === 1 ? '' : 'S'}</span></div>`
      : '';
    const removeMarkup = `<button class="tool-slot tool-slot-remove" type="button" data-unequip-tool${this.equippedTool ? '' : ' disabled'} aria-label="Remove equipped tool from Alex"><strong>×</strong><span>${this.equippedTool ? 'REMOVE TOOL' : 'NO TOOL EQUIPPED'}</span></button>`;
    this.toolSlots.innerHTML = `${slotMarkup}${glueMarkup}${removeMarkup}`;
    this.toolSlots.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const tool = button.dataset.tool;
        if (tool !== 'cleaner' && tool !== 'repair' && tool !== 'watering-can') return;
        this.scene?.equipTool(tool);
        this.closeToolPopup();
      });
    });
    const removeButton = this.toolSlots.querySelector<HTMLButtonElement>('[data-unequip-tool]');
    if (removeButton) this.bindButtonActivation(removeButton, () => {
      this.scene?.unequipTool();
      this.closeToolPopup();
    });
  }

  private loadJoystickSide(): 'left' | 'right' {
    try {
      const raw = localStorage.getItem('indoor-jungle-controls');
      const value = raw ? JSON.parse(raw) as { joystickSide?: string } : {};
      return value.joystickSide === 'right' ? 'right' : 'left';
    } catch {
      return 'left';
    }
  }

  private applyJoystickSide(): void {
    this.controlPanel.classList.toggle('is-joystick-right', this.joystickSide === 'right');
    requestAnimationFrame(() => this.alignJoystickToMapTab());
  }

  private bindArcadeControls(): void {
    const pressA = (event: PointerEvent): void => {
      if (this.arcadeAPointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      this.arcadeAPointerId = event.pointerId;
      this.arcadeA.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
      this.scene?.pressHop();
    };
    const releaseA = (event: PointerEvent): void => {
      if (this.arcadeAPointerId !== event.pointerId) return;
      this.arcadeAPointerId = null;
      this.arcadeA.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };
    this.arcadeA.addEventListener('pointerdown', pressA, { passive: false });
    this.arcadeA.addEventListener('pointerup', releaseA, { passive: false });
    this.arcadeA.addEventListener('pointercancel', releaseA, { passive: false });
    this.arcadeA.addEventListener('lostpointercapture', releaseA, { passive: false });

    const pressB = (event: PointerEvent): void => {
      if (this.toolPointerId !== null || this.arcadeB.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      this.toolPointerId = event.pointerId;
      this.arcadeB.setPointerCapture?.(event.pointerId);
      this.arcadeB.classList.add('is-held');
      event.preventDefault();
      event.stopPropagation();
      this.scene?.pressTool();
    };
    const releaseB = (event: PointerEvent): void => {
      if (this.toolPointerId !== event.pointerId) return;
      this.toolPointerId = null;
      this.arcadeB.releasePointerCapture?.(event.pointerId);
      this.arcadeB.classList.remove('is-held');
      event.preventDefault();
      event.stopPropagation();
      this.scene?.releaseTool();
    };
    this.arcadeB.addEventListener('pointerdown', pressB, { passive: false });
    this.arcadeB.addEventListener('pointerup', releaseB, { passive: false });
    this.arcadeB.addEventListener('pointercancel', releaseB, { passive: false });
    this.arcadeB.addEventListener('lostpointercapture', releaseB, { passive: false });
  }

  private bindJoystickControls(): void {
    const updateJoystick = (event: PointerEvent): void => {
      if (this.joystickPointerId !== event.pointerId) return;
      const rect = this.joystick.getBoundingClientRect();
      const centreX = rect.left + rect.width / 2;
      const centreY = rect.top + rect.height / 2;
      const dx = event.clientX - centreX;
      const dy = event.clientY - centreY;
      const distance = Math.hypot(dx, dy);
      const radius = Math.max(1, rect.width / 2 - 17);
      const deadZone = radius * 0.2;
      const active = distance > deadZone;
      const visualDistance = Math.min(distance, radius);
      const visualX = active ? dx / distance * visualDistance : 0;
      const visualY = active ? dy / distance * visualDistance : 0;
      this.joystickKnob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
      this.scene?.setJoystickInput(active ? dx / distance : 0, active ? dy / distance : 0, true);
      event.preventDefault();
      event.stopPropagation();
    };
    const endJoystick = (event: PointerEvent): void => {
      if (this.joystickPointerId !== event.pointerId) return;
      this.resetJoystick();
      event.preventDefault();
      event.stopPropagation();
    };

    this.joystick.addEventListener('pointerdown', (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0) return;
      if (this.joystickPointerId !== null) {
        pointerEvent.preventDefault();
        pointerEvent.stopPropagation();
        return;
      }
      this.joystickPointerId = pointerEvent.pointerId;
      this.audio.unlock();
      this.joystick.setPointerCapture?.(pointerEvent.pointerId);
      updateJoystick(pointerEvent);
    }, { passive: false });
    this.joystick.addEventListener('pointermove', (event) => updateJoystick(event as PointerEvent), { passive: false });
    this.joystick.addEventListener('pointerup', (event) => endJoystick(event as PointerEvent), { passive: false });
    this.joystick.addEventListener('pointercancel', (event) => endJoystick(event as PointerEvent), { passive: false });
    this.joystick.addEventListener('lostpointercapture', (event) => endJoystick(event as PointerEvent), { passive: false });
  }

  private refreshPhoneLayout(): void {
    const shell = document.querySelector<HTMLElement>('#app-shell');
    const stage = document.querySelector<HTMLElement>('#game-stage');
    if (!shell || !stage) return;
    if (!this.phoneHybridLayout) {
      stage.style.removeProperty('width');
      stage.style.removeProperty('height');
      this.controlPanel.style.removeProperty('--joystick-align-shift');
      requestAnimationFrame(() => this.scene?.resizeViewportToStage());
      return;
    }

    const topHud = document.querySelector<HTMLElement>('.hud-top');
    const controlPanel = document.querySelector<HTMLElement>('#phone-control-panel');
    const bottomHud = document.querySelector<HTMLElement>('.hud-bottom');
    const viewportHeight = Math.min(
      shell.getBoundingClientRect().height,
      window.visualViewport?.height ?? window.innerHeight,
    );
    const reservedHeight = (topHud?.getBoundingClientRect().height ?? 0)
      + (controlPanel?.getBoundingClientRect().height ?? 0)
      + (bottomHud?.getBoundingClientRect().height ?? 0);
    const availableHeight = Math.max(1, viewportHeight - reservedHeight);
    const size = Math.max(1, Math.min(shell.getBoundingClientRect().width, availableHeight));
    stage.style.width = `${Math.round(size)}px`;
    stage.style.height = `${Math.round(size)}px`;
    requestAnimationFrame(() => {
      this.scene?.resizeViewportToStage();
      this.alignJoystickToMapTab();
    });
  }

  private alignJoystickToMapTab(): void {
    if (!this.phoneHybridLayout || this.joystickSide !== 'left') {
      this.controlPanel.style.removeProperty('--joystick-align-shift');
      return;
    }
    const mapButton = document.querySelector<HTMLElement>('.nav-button[data-panel="map"]');
    const console = this.controlPanel.querySelector<HTMLElement>('.control-console');
    if (!mapButton || !console) return;
    const panelRect = this.controlPanel.getBoundingClientRect();
    const joystickRect = this.joystick.getBoundingClientRect();
    const mapRect = mapButton.getBoundingClientRect();
    const consoleRect = console.getBoundingClientRect();
    const halfJoystick = joystickRect.width / 2;
    const desiredCenter = mapRect.left + mapRect.width / 2 + Math.min(14, mapRect.width * 0.3);
    const minimumCenter = panelRect.left + halfJoystick + 8;
    const maximumCenter = consoleRect.left - halfJoystick - 10;
    const safeCenter = maximumCenter >= minimumCenter
      ? Math.max(minimumCenter, Math.min(maximumCenter, desiredCenter))
      : joystickRect.left + halfJoystick;
    this.controlPanel.style.setProperty('--joystick-align-shift', `${safeCenter - (joystickRect.left + halfJoystick)}px`);
  }

  openPanel(kind: string): void {
    if (this.scene?.isShopTransactionBusy()) return;
    this.housingObjectiveDropdown.hidden = true;
    this.objectiveButton.setAttribute('aria-expanded', 'false');
    this.closeToolPopup();
    this.cityMapPanCleanup?.();
    this.cityMapPanCleanup = null;
    this.activePanelKind = kind;
    if (kind === 'shop') {
      this.shopTab = 'wanted';
      this.shopFeedback = '';
    }
    if (kind.startsWith('property-')) this.propertyFeedback = '';
    if (kind === 'basil') this.basilFeedback = '';
    if (kind === 'settings') this.devFeedback = '';
    const content = this.panelContent(kind);
    this.panelTitle.textContent = content.title;
    this.panelBody.innerHTML = content.body;
    if (kind === 'map') {
      this.bindCityMapPan();
      this.setMapPosition(this.mapPositionRatio);
    }
    if (kind === 'shop') this.bindShopPanel();
    if (kind === 'real-estate') {
      this.panelBody.querySelectorAll<HTMLButtonElement>('[data-property-listing]').forEach((button) => {
        this.bindButtonActivation(button, () => {
          const listing = button.dataset.propertyListing;
          if (listing === 'cheap-rental' || listing === 'mid-rental' || listing === 'high-property') this.openPropertyDetails(listing);
        });
      });
    }
    if (kind.startsWith('property-')) this.bindPropertyPanel();
    if (kind === 'basil') this.bindBasilPanel();
    if (kind === 'settings') this.bindSettingsPanel();
    if (kind === 'bag') {
      const repairButton = this.panelBody.querySelector<HTMLButtonElement>('[data-repair-pot]');
      if (repairButton) this.bindButtonActivation(repairButton, () => {
        this.closePanel();
        this.scene?.beginPortableRepair();
      });
      const putDownButton = this.panelBody.querySelector<HTMLButtonElement>('[data-put-down-item]');
      if (putDownButton) this.bindButtonActivation(putDownButton, () => {
        this.closePanel();
        this.scene?.putDownCarriedItem();
      });
      this.panelBody.querySelectorAll<HTMLButtonElement>('[data-equip-tool]').forEach((button) => {
        this.bindButtonActivation(button, () => {
          const tool = button.dataset.equipTool;
          if (tool === 'repair' || tool === 'watering-can' || tool === 'cleaner') this.scene?.equipTool(tool);
        });
      });
    }
    this.panelBackdrop.classList.toggle('is-city-map', kind === 'map');
    this.panelBackdrop.classList.toggle('is-shop', kind === 'shop');
    this.panelBackdrop.classList.toggle('is-global-panel', ['bag', 'map', 'tasks', 'home', 'more', 'settings'].includes(kind));
    const shopEra = kind === 'shop' ? this.scene?.getShopPanelState().buySellGraphicsEra : null;
    this.panelBackdrop.classList.toggle('is-green-crt-shop', shopEra === 'green-crt');
    this.panelBackdrop.classList.toggle('is-colour-shop', shopEra === 'atari-colour');
    const povoPanel = kind === 'property-cheap-rental';
    this.panelBackdrop.classList.toggle('is-green-crt-property', povoPanel
      || ((kind === 'real-estate' || kind.startsWith('property-')) && this.scene?.getRealEstateGraphicsEra() === 'green-crt'));
    this.panelBackdrop.classList.toggle('is-colour-property', !povoPanel
      && (kind === 'real-estate' || kind.startsWith('property-')) && this.scene?.getRealEstateGraphicsEra() === 'atari-colour');
    this.mapCentreButton.hidden = kind !== 'map';
    this.panelBackdrop.hidden = false;
    requestAnimationFrame(() => this.panelBackdrop.classList.add('is-open'));
    this.scene?.setModalOpen(true, kind === 'map');
    this.panelBody.querySelector<HTMLButtonElement>('[data-restart]')?.addEventListener('click', () => {
      this.scene?.restartPrototype();
      this.closePanel();
    });
  }

  closePanel(): void {
    this.cityMapPanCleanup?.();
    this.cityMapPanCleanup = null;
    this.panelBackdrop.classList.remove('is-city-map');
    this.panelBackdrop.classList.remove('is-shop');
    this.panelBackdrop.classList.remove('is-green-crt-property');
    this.mapCentreButton.hidden = true;
    this.activePanelKind = null;
    this.panelBackdrop.classList.remove('is-open');
    window.setTimeout(() => { this.panelBackdrop.hidden = true; }, 160);
    this.scene?.setModalOpen(false);
  }

  private bindCityMapPan(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const layer = frame.querySelector<HTMLElement>('.city-map-layer');
    if (!layer) return;
    this.renderCityMapZoom();

    const pointers = new Map<number, { x: number; y: number }>();
    let lastPoint: { x: number; y: number } | null = null;
    let pinchStartDistance = 0;
    let pinchStartZoom = this.cityMapZoom;
    let pinchWorldPoint = { x: 0, y: 0 };

    const midpoint = (): { x: number; y: number } => {
      const values = [...pointers.values()];
      return {
        x: (values[0].x + values[1].x) / 2,
        y: (values[0].y + values[1].y) / 2,
      };
    };
    const distance = (): number => {
      const values = [...pointers.values()];
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('button')) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      frame.setPointerCapture?.(event.pointerId);
      if (pointers.size === 1) {
        lastPoint = { x: event.clientX, y: event.clientY };
        frame.classList.add('is-panning');
      } else if (pointers.size === 2) {
        const centre = midpoint();
        const rect = frame.getBoundingClientRect();
        pinchStartDistance = Math.max(1, distance());
        pinchStartZoom = this.cityMapZoom;
        pinchWorldPoint = {
          x: (frame.scrollLeft + centre.x - rect.left) / this.cityMapZoom,
          y: (frame.scrollTop + centre.y - rect.top) / this.cityMapZoom,
        };
        lastPoint = null;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const centre = midpoint();
        const nextZoom = pinchStartZoom * (distance() / pinchStartDistance);
        this.setCityMapZoom(nextZoom, { clientX: centre.x, clientY: centre.y, worldPoint: pinchWorldPoint });
      } else if (lastPoint) {
        frame.scrollLeft -= event.clientX - lastPoint.x;
        frame.scrollTop -= event.clientY - lastPoint.y;
        lastPoint = { x: event.clientX, y: event.clientY };
        this.clampCityMapScroll(frame);
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const endPointer = (event: PointerEvent): void => {
      pointers.delete(event.pointerId);
      frame.releasePointerCapture?.(event.pointerId);
      if (pointers.size === 1) {
        const remaining = [...pointers.values()][0];
        lastPoint = { x: remaining.x, y: remaining.y };
      } else if (pointers.size === 0) {
        lastPoint = null;
        frame.classList.remove('is-panning');
      }
      event.preventDefault();
      event.stopPropagation();
    };
    const onWheel = (event: WheelEvent): void => {
      const rect = frame.getBoundingClientRect();
      const anchor = {
        clientX: event.clientX,
        clientY: event.clientY,
        worldPoint: {
          x: (frame.scrollLeft + event.clientX - rect.left) / this.cityMapZoom,
          y: (frame.scrollTop + event.clientY - rect.top) / this.cityMapZoom,
        },
      };
      this.setCityMapZoom(this.cityMapZoom * (event.deltaY > 0 ? 0.9 : 1.1), anchor);
      event.preventDefault();
      event.stopPropagation();
    };
    const zoomOut = (): void => this.adjustCityMapZoom(0.9);
    const zoomIn = (): void => this.adjustCityMapZoom(1.1);
    const zoomOutButton = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="out"]');
    const zoomInButton = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="in"]');
    zoomOutButton?.addEventListener('click', zoomOut);
    zoomInButton?.addEventListener('click', zoomIn);
    frame.addEventListener('pointerdown', onPointerDown, { passive: false });
    frame.addEventListener('pointermove', onPointerMove, { passive: false });
    frame.addEventListener('pointerup', endPointer, { passive: false });
    frame.addEventListener('pointercancel', endPointer, { passive: false });
    frame.addEventListener('wheel', onWheel, { passive: false });

    this.cityMapPanCleanup = () => {
      zoomOutButton?.removeEventListener('click', zoomOut);
      zoomInButton?.removeEventListener('click', zoomIn);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', endPointer);
      frame.removeEventListener('pointercancel', endPointer);
      frame.removeEventListener('wheel', onWheel);
      frame.classList.remove('is-panning');
      pointers.clear();
    };

    requestAnimationFrame(() => this.centreCityDistrict());
  }

  private renderCityMapZoom(): void {
    const layer = this.panelBody.querySelector<HTMLElement>('.city-map-layer');
    const world = this.panelBody.querySelector<HTMLElement>('.city-map-world');
    if (!layer || !world) return;
    layer.style.width = `${CITY_MAP_SIZE.width * this.cityMapZoom}px`;
    layer.style.height = `${CITY_MAP_SIZE.height * this.cityMapZoom}px`;
    world.style.transform = `scale(${this.cityMapZoom})`;
  }

  private setCityMapZoom(
    zoom: number,
    anchor?: { clientX: number; clientY: number; worldPoint: { x: number; y: number } },
  ): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const oldZoom = this.cityMapZoom;
    const localX = anchor ? anchor.clientX - rect.left : frame.clientWidth / 2;
    const localY = anchor ? anchor.clientY - rect.top : frame.clientHeight / 2;
    const worldPoint = anchor?.worldPoint ?? {
      x: (frame.scrollLeft + localX) / oldZoom,
      y: (frame.scrollTop + localY) / oldZoom,
    };
    this.cityMapZoom = Math.max(0.26, Math.min(1.45, zoom));
    this.renderCityMapZoom();
    frame.scrollLeft = worldPoint.x * this.cityMapZoom - localX;
    frame.scrollTop = worldPoint.y * this.cityMapZoom - localY;
    this.clampCityMapScroll(frame);
    this.updateCityMapZoomButtons();
  }

  private adjustCityMapZoom(multiplier: number): void {
    this.setCityMapZoom(this.cityMapZoom * multiplier);
  }

  private clampCityMapScroll(frame: HTMLElement): void {
    frame.scrollLeft = Math.max(0, Math.min(frame.scrollWidth - frame.clientWidth, frame.scrollLeft));
    frame.scrollTop = Math.max(0, Math.min(frame.scrollHeight - frame.clientHeight, frame.scrollTop));
  }

  private updateCityMapZoomButtons(): void {
    const zoomOut = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="out"]');
    const zoomIn = this.panelBody.querySelector<HTMLButtonElement>('[data-map-zoom="in"]');
    if (zoomOut) zoomOut.disabled = this.cityMapZoom <= 0.26;
    if (zoomIn) zoomIn.disabled = this.cityMapZoom >= 1.45;
  }

  private refreshCityMapLayout(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    this.renderCityMapZoom();
    this.clampCityMapScroll(frame);
  }

  private centreCityMap(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    if (!frame) return;
    const startingDistrict = CITY_DISTRICTS.find((district) => district.id === 'starting-neighbourhood');
    if (!startingDistrict) return;
    const streetX = this.mapPositionRatio * WORLD_WIDTH;
    const progress = Math.max(0, Math.min(1,
      (streetX - STARTING_WALKABLE_MIN_X) / (STARTING_WALKABLE_MAX_X - STARTING_WALKABLE_MIN_X),
    ));
    const mapX = startingDistrict.x + progress * startingDistrict.width;
    const verticalProgress = Math.max(0, Math.min(1,
      (this.mapPositionY - FRONT_PAVEMENT_MIN_Y) / (OPPOSITE_PAVEMENT_MAX_Y - FRONT_PAVEMENT_MIN_Y),
    ));
    const mapY = startingDistrict.y + startingDistrict.height * (0.48 + verticalProgress * 0.34);
    frame.scrollLeft = mapX * this.cityMapZoom - frame.clientWidth / 2;
    frame.scrollTop = mapY * this.cityMapZoom - frame.clientHeight / 2;
    this.clampCityMapScroll(frame);
  }

  private centreCityDistrict(): void {
    const frame = this.panelBody.querySelector<HTMLElement>('.city-map-frame');
    const district = CITY_DISTRICTS.find((candidate) => candidate.id === 'starting-neighbourhood');
    if (!frame || !district) return;
    frame.scrollLeft = (district.x + district.width / 2) * this.cityMapZoom - frame.clientWidth / 2;
    frame.scrollTop = (district.y + district.height / 2) * this.cityMapZoom - frame.clientHeight / 2;
    this.clampCityMapScroll(frame);
    this.updateCityMapZoomButtons();
  }

  private panelContent(kind: string): { title: string; body: string } {
    if (kind === 'bag') {
      const potLabel = this.potCondition === 'broken'
        ? 'Broken special collectible pot'
        : this.potCondition === 'repaired' ? 'Repaired special collectible pot'
          : this.inventoryItem === 'rare-spotted-begonia' ? 'Rare Spotted Begonia' : 'Small Golden Pothos';
      const potNote = this.potCondition === 'broken'
        ? 'Collect the pieces, then repair this special empty pot.'
        : this.potCondition === 'repaired'
          ? `Empty and ready to sell at ${BUY_SELL_NAME} for ${REPAIRED_POT_SALE_PRICE} coins.`
          : this.inventoryItem === 'rare-spotted-begonia'
            ? `${BUY_SELL_NAME} is currently buying it for ${RARE_BEGONIA_SALE_PRICE} coins.`
            : `Opening delivery. Sell it at ${BUY_SELL_NAME} for ${OPENING_POTHOS_SALE_PRICE} coins.`;
      const repairButton = this.potCondition === 'broken'
        ? '<div class="inventory-actions"><button class="inventory-action" type="button" data-repair-pot>REPAIR</button></div>'
        : '';
      const putDownButton = this.hasPot && this.scene?.canPutDownCarriedItem()
        ? '<div class="inventory-actions"><button class="inventory-action" type="button" data-put-down-item>PUT DOWN</button></div>'
        : '';
      const toolNote = [
        this.cleanerOwned ? `<div class="inventory-item"><span class="inventory-art">▱</span><div><strong>Borrowed cleaner</strong><small>${this.equippedTool === 'cleaner' ? 'Press B once per spray.' : 'Equip it near the REAL ESTATE AGENT window.'}</small></div><div class="inventory-actions"><button class="inventory-action" type="button" data-equip-tool="cleaner">${this.equippedTool === 'cleaner' ? 'EQUIPPED' : 'EQUIP'}</button></div></div>` : '',
        this.repairToolOwned ? `<div class="inventory-item"><span class="inventory-art">⚒</span><div><strong>Repair tool</strong><small>${this.glueCharges} glue charge${this.glueCharges === 1 ? '' : 's'} remaining. Tap B 10 times beside a broken pot.</small></div><div class="inventory-actions"><button class="inventory-action" type="button" data-equip-tool="repair">${this.equippedTool === 'repair' ? 'EQUIPPED' : 'EQUIP'}</button></div></div>` : '',
        this.wateringCanOwned ? `<div class="inventory-item"><span class="inventory-art">≈</span><div><strong>Basic watering can</strong><small>Reusable and essential. Select a planted pot, then press B.</small></div><div class="inventory-actions"><button class="inventory-action" type="button" data-equip-tool="watering-can">${this.equippedTool === 'watering-can' ? 'EQUIPPED' : 'EQUIP'}</button></div></div>` : '',
      ].join('');
      const itemBlocks = [
        this.hasPot ? `<div class="inventory-item"><span class="inventory-art">${this.potCondition === 'broken' ? '◈' : '▱'}</span><div><strong>${potLabel}</strong><small>${potNote}</small></div>${repairButton}${putDownButton}</div>` : '',
        this.brokenPotPiecesOwned > 0 ? `<div class="inventory-item"><span class="inventory-art">◈</span><div><strong>Broken pot pieces ×${this.brokenPotPiecesOwned}</strong><small>Collected piece${this.brokenPotPiecesOwned === 1 ? '' : 's'} added to the Bag. Find the remaining pieces.</small></div></div>` : '',
        this.povoWelcomeGiftClaimed && this.growingPots.filter((pot) => pot.slot === null).length > 0 ? `<div class="inventory-item"><span class="inventory-art">▱</span><div><strong>Small basic plastic pots ×${this.growingPots.filter((pot) => pot.slot === null).length}</strong><small>Usable medium. Place each on an empty grow-table slot.</small></div></div>` : '',
        ...PLANT_SPECIES.map((species) => this.seedQuantities[species] > 0 ? `<div class="inventory-item"><span class="inventory-art">·</span><div><strong>${getPlantDefinition(species).seedLabel} ×${this.seedQuantities[species]}</strong><small>Plant one in any empty placed pot.</small></div></div>` : ''),
        this.rentalKeyOwned ? `<div class="inventory-item"><span class="inventory-art">⚿</span><div><strong>${this.activeProperty === 'second-rental' ? 'Two-room rental key' : 'Starter apartment key'}</strong><small>Permanent access key. Not for sale or consumption.</small></div></div>` : '',
        this.basicFertilizerCharges > 0 ? `<div class="inventory-item"><span class="inventory-art">✚</span><div><strong>Basic fertiliser pellets ×${this.basicFertilizerCharges}</strong><small>Each pellet removes ${BASIC_FERTILIZER_GROWTH_REDUCTION_MS / 1000} seconds from a growing crop.</small></div></div>` : '',
        ...PLANT_SPECIES.map((species) => {
          const definition = getPlantDefinition(species);
          return this.harvestQuantities[species] > 0 ? `<div class="inventory-item"><span class="inventory-art">${definition.yieldMode === 'whole-plant' ? '♣' : '✦'}</span><div><strong>${definition.harvestLabel} ×${this.harvestQuantities[species]}</strong><small>${definition.yieldMode === 'whole-plant' ? 'Includes one small basic plastic pot. ' : ''}Sell each at ${BUY_SELL_NAME} for ${definition.harvestPrice} coins.</small></div></div>` : '';
        }),
        ...this.ownedPremiumPlants.map((id) => {
          const plant = PREMIUM_PLANT_CATALOG.find((candidate) => candidate.id === id)!;
          return `<div class="inventory-item"><span class="inventory-art">♣</span><div><strong>${plant.label}</strong><small>Premium shop plant · purchased for ${plant.price} coins.</small></div></div>`;
        }),
      ].filter(Boolean).join('');
      return {
        title: 'Bag',
        body: `${itemBlocks || '<div class="empty-state"><span class="empty-mark">—</span><strong>Empty</strong></div>'}${toolNote}`,
      };
    }
    if (kind === 'map') {
      return {
        title: 'City map',
        body: this.cityMapMarkup(),
      };
    }
    if (kind === 'shop') {
      return {
        title: BUY_SELL_NAME,
        body: this.shopPanelMarkup(),
      };
    }
    if (kind === 'real-estate') {
      return {
        title: 'ROSE · REAL ESTATE',
        body: `<div class="property-details"><div class="property-heading">PROPERTY MENU <span>SELECT A LISTING</span></div><div class="settings-list"><button class="property-action" type="button" data-property-listing="cheap-rental">STARTER APARTMENT · ${RENTAL_BOND_COST} COINS</button><button class="property-action" type="button" data-property-listing="mid-rental">TWO-ROOM RENTAL</button><button class="property-secondary-action" type="button" data-property-listing="high-property">FUTURE PROPERTY · UNAVAILABLE</button></div></div>`,
      };
    }
    if (kind === 'tasks') {
      const complete = this.activeTask === 'complete';
      const taskLabel: Record<TaskState, string> = {
        find: 'Find a Small Golden Pothos', sell: `Sell the Small Golden Pothos at ${BUY_SELL_NAME}`, clean: 'Clean both windows of the Real Estate Agent and they might open',
        repair: this.potCondition === 'broken'
          ? 'Head to Bag and put down the broken pieces to repair the pot'
          : 'Find the broken pot pieces', 'sell-repaired': `Sell the repaired pot at ${BUY_SELL_NAME}`, complete: 'Prototype jobs complete',
        'place-pot': this.povoWelcomeGiftClaimed ? 'Place an owned pot on an empty grow-table slot' : 'Enter the apartment and claim the welcome gift', 'plant-basil': 'Plant basil in a grow-table pot',
        'water-basil': this.growingEvents.basil > 1 ? 'Water and grow basil' : 'Water the planted basil',
        'grow-basil': 'Wait for the basil to grow', 'harvest-basil': 'Harvest the mature basil',
        'sell-basil': `Sell the basil harvest at ${BUY_SELL_NAME}`, 'buy-seeds': 'Buy seeds for another grow-table crop',
        'plant-mint': 'Plant mint in an empty grow-table pot', 'water-mint': 'Water the planted mint',
        'grow-mint': 'Wait for the mint to grow', 'harvest-mint': 'Harvest the mature mint', 'sell-mint': `Sell the mint harvest at ${BUY_SELL_NAME}`,
        'plant-dwarf-marigold': 'Plant Dwarf Marigold in a basic pot', 'water-dwarf-marigold': 'Water the planted Dwarf Marigold',
        'grow-dwarf-marigold': 'Wait for the Dwarf Marigold to grow', 'lift-dwarf-marigold': 'Lift the mature Dwarf Marigold into the Bag', 'sell-dwarf-marigold': `Sell the potted Dwarf Marigold at ${BUY_SELL_NAME}`,
        'plant-peace-lily': 'Plant Peace Lily in a basic pot', 'water-peace-lily': 'Water the planted Peace Lily',
        'grow-peace-lily': 'Wait for the Peace Lily to grow', 'lift-peace-lily': 'Lift the mature Peace Lily into the Bag', 'sell-peace-lily': `Sell the potted Peace Lily at ${BUY_SELL_NAME}`,
        'move-rental': 'Move into a bigger rental',
      };
      const rental = this.scene?.getPropertyPanelState();
      const moveChecklist = this.activeTask === 'move-rental' && rental ? `<div class="housing-checklist"><div class="housing-check ${rental.basilHarvestSaleRecorded ? 'is-complete' : ''}"><span>${rental.basilHarvestSaleRecorded ? '✓' : '○'}</span>Sell a basil harvest</div><div class="housing-check ${rental.mintHarvestSaleRecorded ? 'is-complete' : ''}"><span>${rental.mintHarvestSaleRecorded ? '✓' : '○'}</span>Sell a mint harvest</div><div class="housing-check ${rental.coins >= SECOND_RENTAL_MOVE_COST || rental.activeProperty === 'second-rental' ? 'is-complete' : ''}"><span>${rental.coins >= SECOND_RENTAL_MOVE_COST || rental.activeProperty === 'second-rental' ? '✓' : '○'}</span>Save the additional ${SECOND_RENTAL_MOVE_COST} coins</div><div class="housing-check ${rental.activeProperty === 'second-rental' ? 'is-complete' : ''}"><span>${rental.activeProperty === 'second-rental' ? '✓' : '○'}</span>Arrange the move at the Real Estate Agent</div><div class="housing-check ${rental.activeProperty === 'second-rental' ? 'is-complete' : ''}"><span>${rental.activeProperty === 'second-rental' ? '✓' : '○'}</span>Enter the new rental</div></div>` : '';
      const taskInstruction = this.activeTask === 'clean'
        ? this.windowJobAccepted
          ? `Face the building and press B to spray window cleaner. Clean the ${HOMES_WINDOW_CLEAN_SECTIONS.length} windows.`
          : `Accept the Casual Window Washer job from the Wanted menu at ${BUY_SELL_NAME}.`
        : this.activeTask === 'move-rental'
          ? 'A larger rental keeps the starter bond and adds growing space.'
          : complete ? 'The opening jobs are complete.' : 'The next objective updates as Alex works.';
      return {
        title: 'Tasks',
        body: `<div class="task-card ${complete ? 'is-complete' : ''}"><span class="task-check">${complete ? '✓' : '○'}</span><div><strong>${taskLabel[this.activeTask]}</strong><small>${taskInstruction}</small></div></div>${moveChecklist}`,
      };
    }
    if (kind === 'home') {
    const rental = this.scene?.getRentalState() ?? { rentalBondPaid: false, rentalKeyOwned: false, povoWelcomeGiftClaimed: false, activeProperty: 'none' as PropertyId, rentalBondTotal: 0 };
      return {
        title: 'Home',
        body: rental.rentalBondPaid
          ? `<div class="home-card"><span class="home-outline">⌂</span><strong>${rental.activeProperty === 'second-rental' ? 'YOUR TWO-ROOM RENTAL' : 'YOUR STARTER RENTAL'}</strong><small>Key: ${rental.rentalKeyOwned ? 'received and stored in Bag.' : 'not received yet.'}</small><small>Bond recorded: ${rental.rentalBondTotal} coins.</small><small>Access: use the ${rental.activeProperty === 'second-rental' ? 'TWO-ROOM RENTAL' : 'STARTER APARTMENT'} door on the street.</small><small>${rental.activeProperty === 'second-rental' ? 'Two rooms · six growing positions. Rental space does not include six free pots.' : rental.povoWelcomeGiftClaimed ? 'Welcome Gift claimed: pot, used medium, basil seeds, watering can and one basic fertiliser pellet.' : 'Welcome Gift ready inside: pot, used medium, basil seeds, watering can and one basic fertiliser pellet.'}</small></div>`
          : `<div class="empty-state"><span class="home-outline">⌂</span><strong>Alex has not rented a home yet</strong><small>Tap the cheap TO RENT listing at the REAL ESTATE AGENT to review the ${RENTAL_BOND_COST}-coin bond and access details.</small></div>`,
      };
    }
    if (kind.startsWith('property-')) {
      return {
        title: 'REAL ESTATE',
        body: this.propertyPanelMarkup(kind.slice('property-'.length) as PropertyListingKey),
      };
    }
    if (kind === 'basil') {
      return {
        title: 'GROWING POT',
        body: this.basilPanelMarkup(),
      };
    }
    if (kind === 'settings') {
      const musicOn = this.audio.musicEnabled;
      const sfxOn = this.audio.sfxEnabled;
      const alexChoices = this.graphicsUpgradeInstalled
        ? `<div class="settings-choice"><strong>Alex graphics</strong><small>Choose an unlocked Alex appearance.</small><div class="settings-choice-row"><button type="button" data-alex-graphics="green-screen" class="${this.alexGraphics === 'green-screen' ? 'is-selected' : ''}">GREEN CRT</button><button type="button" data-alex-graphics="atari-bw" class="${this.alexGraphics === 'atari-bw' ? 'is-selected' : ''}">ATARI B&amp;W</button></div></div>`
        : '<div class="settings-choice"><strong>Alex graphics</strong><small>GREEN CRT · initial appearance</small></div>';
      const interfaceChoices = `<div class="settings-choice"><strong>Interface graphics</strong><small>Auto uses the highest progression-approved style.</small><div class="settings-choice-row"><button type="button" data-interface-theme="auto" class="${this.interfaceTheme === 'auto' ? 'is-selected' : ''}">AUTO</button><button type="button" data-interface-theme="green-crt" class="${this.interfaceTheme === 'green-crt' ? 'is-selected' : ''}">GREEN CRT</button>${this.graphicsUpgradeInstalled ? `<button type="button" data-interface-theme="atari-bw" class="${this.interfaceTheme === 'atari-bw' ? 'is-selected' : ''}">ATARI B&amp;W</button>` : ''}</div></div>`;
      return {
        title: 'Settings',
        body: `<div class="settings-list"><div class="settings-choice"><strong>Joystick position</strong><small>Choose which side holds the joystick. Switching sides clears held input.</small><div class="settings-choice-row"><button type="button" data-joystick-side="left" class="${this.joystickSide === 'left' ? 'is-selected' : ''}">LEFT</button><button type="button" data-joystick-side="right" class="${this.joystickSide === 'right' ? 'is-selected' : ''}">RIGHT</button></div></div><div class="settings-choice"><strong>Music</strong><small>Toggle the looping arcade soundtrack.</small><div class="settings-choice-row"><button type="button" data-audio="music-on" class="${musicOn ? 'is-selected' : ''}">ON</button><button type="button" data-audio="music-off" class="${!musicOn ? 'is-selected' : ''}">OFF</button></div></div><div class="settings-choice"><strong>Sound effects</strong><small>Toggle jump and tool-use sounds.</small><div class="settings-choice-row"><button type="button" data-audio="sfx-on" class="${sfxOn ? 'is-selected' : ''}">ON</button><button type="button" data-audio="sfx-off" class="${!sfxOn ? 'is-selected' : ''}">OFF</button></div></div>${alexChoices}${interfaceChoices}<div><strong>Controls</strong><small>WASD / arrows to walk · A / Space to hop · B / Q to use the equipped tool · tap or click pavement to walk · mouse wheel, −/+, comma, or period to zoom</small></div><div><strong>Display</strong><small>Explicit Green CRT and Atari raster progression · crisp pixel edges · responsive viewport</small></div><div class="build-information"><strong>${PLAYTEST_CANDIDATE}</strong><small>Build ${BUILD_DATE} · commit ${BUILD_COMMIT} · save data v${SAVE_DATA_VERSION}</small></div>${DEV_BUILD ? this.devToolsMarkup() : ''}</div>`,
      };
    }
    return {
      title: 'More',
      body: '<div class="settings-list"><div><strong>Prototype help</strong><small>Stay on the pavement and use the contextual action button when Alex is close enough.</small></div><div><strong>Future features</strong><small>More crops, pests, upgrades, bills, and additional districts are intentionally not implemented.</small></div><button class="restart-button" type="button" data-restart>RESTART PROTOTYPE</button></div>',
    };
  }

  private bindShopPanel(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-tab]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const tab = button.dataset.shopTab;
        this.shopTab = tab === 'buy' || tab === 'wanted' ? tab : 'sell';
        this.refreshShopPanel();
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-sell]').forEach((sellButton) => {
      this.bindButtonActivation(sellButton, () => {
        const quantity = Number(sellButton.closest<HTMLElement>('.shop-offer')?.querySelector<HTMLInputElement>('[data-shop-quantity]')?.value ?? '1');
        if (sellButton.dataset.shopSell === 'repaired') this.scene?.sellRepairedPot();
        else if (sellButton.dataset.shopSell === 'rare-spotted-begonia') this.scene?.sellRareSpottedBegonia();
        else if (isPlantSpecies(sellButton.dataset.shopSell)) this.scene?.sellPlantHarvest(sellButton.dataset.shopSell, quantity);
        else this.scene?.sellOpeningPot();
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-deliver]').forEach((deliveryButton) => {
      this.bindButtonActivation(deliveryButton, () => {
        if (deliveryButton.dataset.shopDeliver === 'small-golden-pothos') this.scene?.deliverOpeningPothos();
        if (deliveryButton.dataset.shopDeliver === 'basil') this.scene?.deliverBasilHarvest();
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-buy-stock]').forEach((buyButton) => {
      this.bindButtonActivation(buyButton, () => {
        const quantity = Number(buyButton.closest<HTMLElement>('.shop-offer')?.querySelector<HTMLInputElement>('[data-shop-quantity]')?.value ?? '1');
        const stockId = buyButton.dataset.shopBuyStock;
        if (stockId) this.scene?.buyShopStock(stockId, quantity);
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-buy-premium]').forEach((buyButton) => {
      this.bindButtonActivation(buyButton, () => {
        const id = buyButton.dataset.shopBuyPremium;
        if (isPremiumPlantId(id)) this.scene?.buyPremiumPlant(id);
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-buy]').forEach((buyButton) => {
      this.bindButtonActivation(buyButton, () => {
        const quantity = Number(buyButton.closest<HTMLElement>('.shop-offer')?.querySelector<HTMLInputElement>('[data-shop-quantity]')?.value ?? '1');
        const seedSpecies = buyButton.dataset.shopBuy?.replace('seed-', '');
        if (isPlantSpecies(seedSpecies)) this.scene?.buyPlantSeed(seedSpecies, quantity);
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-buy-growing-pot]').forEach((buyButton) => {
      this.bindButtonActivation(buyButton, () => {
        const quantity = Number(buyButton.closest<HTMLElement>('.shop-offer')?.querySelector<HTMLInputElement>('[data-shop-quantity]')?.value ?? '1');
        this.scene?.buyAdditionalGrowingPot(quantity);
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-shop-buy-fertilizer]').forEach((buyButton) => {
      this.bindButtonActivation(buyButton, () => this.scene?.buyBasicFertilizerBox());
    });
    this.panelBody.querySelectorAll<HTMLInputElement>('[data-shop-quantity]').forEach((quantityInput) => {
      const updateTotal = (): void => {
        const row = quantityInput.closest<HTMLElement>('.shop-offer');
        const total = row?.querySelector<HTMLElement>('[data-shop-total]');
        if (!total) return;
        const maximum = Number(quantityInput.max) || Number.MAX_SAFE_INTEGER;
        const quantity = Math.max(1, Math.min(maximum, Math.floor(Number(quantityInput.value) || 1)));
        const unitPrice = Number(quantityInput.dataset.unitPrice) || 0;
        total.textContent = `${quantityInput.dataset.transaction === 'sell' ? 'SELL' : 'BUY'} FOR ${unitPrice * quantity} COINS`;
      };
      quantityInput.addEventListener('input', updateTotal);
      quantityInput.addEventListener('change', updateTotal);
    });
    const acceptJob = this.panelBody.querySelector<HTMLButtonElement>('[data-accept-window-job]');
    if (acceptJob) this.bindButtonActivation(acceptJob, () => this.scene?.acceptWindowJob());
  }

  private bindPropertyPanel(): void {
    const payBond = this.panelBody.querySelector<HTMLButtonElement>('[data-pay-bond]');
    if (payBond) this.bindButtonActivation(payBond, () => {
      if (this.scene?.payRentalBond()) this.closePanel();
    });
    const reviewMove = this.panelBody.querySelector<HTMLButtonElement>('[data-review-second-rental]');
    if (reviewMove) this.bindButtonActivation(reviewMove, () => this.scene?.reviewSecondRentalMove());
    const confirmMove = this.panelBody.querySelector<HTMLButtonElement>('[data-confirm-second-rental]');
    if (confirmMove) this.bindButtonActivation(confirmMove, () => {
      if (this.scene?.confirmSecondRentalMove()) this.closePanel();
    });
    const cancelMove = this.panelBody.querySelector<HTMLButtonElement>('[data-cancel-second-rental]');
    if (cancelMove) this.bindButtonActivation(cancelMove, () => this.scene?.cancelSecondRentalMove());
  }

  private bindBasilPanel(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-plant-species]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const species = button.dataset.plantSpecies;
        if (isPlantSpecies(species)) this.scene?.plantSelectedCrop(species);
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-select-growing-pot]').forEach((button) => {
      this.bindButtonActivation(button, () => { const id = button.dataset.selectGrowingPot; if (id) this.scene?.selectGrowingPot(id); });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-place-growing-pot]').forEach((button) => this.bindButtonActivation(button, () => this.scene?.placeSelectedGrowingPot()));
    const waterButton = this.panelBody.querySelector<HTMLButtonElement>('[data-water-crop]');
    if (waterButton) this.bindButtonActivation(waterButton, () => this.scene?.waterSelectedCrop());
    const fertilizerButton = this.panelBody.querySelector<HTMLButtonElement>('[data-use-basic-fertilizer]');
    if (fertilizerButton) this.bindButtonActivation(fertilizerButton, () => this.scene?.useBasicFertilizer());
    const harvestButton = this.panelBody.querySelector<HTMLButtonElement>('[data-harvest-crop]');
    if (harvestButton) this.bindButtonActivation(harvestButton, () => this.scene?.harvestSelectedCrop());
  }

  private bindSettingsPanel(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-joystick-side]').forEach((button) => {
      this.bindButtonActivation(button, () => this.setJoystickSide(button.dataset.joystickSide === 'right' ? 'right' : 'left'));
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-audio]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const setting = button.dataset.audio;
        if (setting === 'music-on' || setting === 'music-off') this.audio.setMusicEnabled(setting === 'music-on');
        if (setting === 'sfx-on' || setting === 'sfx-off') this.audio.setSfxEnabled(setting === 'sfx-on');
        this.refreshAudioSettingsButtons();
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-alex-graphics]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const style = button.dataset.alexGraphics;
        if (style === 'atari-bw' || style === 'green-screen') this.scene?.setAlexGraphics(style);
      });
    });
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-interface-theme]').forEach((button) => {
      this.bindButtonActivation(button, () => {
        const theme = button.dataset.interfaceTheme;
        if (theme === 'auto' || theme === 'green-crt' || theme === 'atari-bw') this.scene?.setInterfaceTheme(theme);
      });
    });
    if (!DEV_BUILD) return;
    const checkpointSelect = this.panelBody.querySelector<HTMLSelectElement>('[data-dev-checkpoint]');
    const rememberCheckpoint = (): void => {
      if (!checkpointSelect) return;
      const id = checkpointSelect.value;
      if (getDevCheckpointOptions().some((checkpoint) => checkpoint.id === id)) this.devCheckpointId = id;
    };
    checkpointSelect?.addEventListener('input', rememberCheckpoint);
    checkpointSelect?.addEventListener('change', rememberCheckpoint);
    const bindDev = (selector: string, action: () => void): void => {
      const button = this.panelBody.querySelector<HTMLButtonElement>(selector);
      if (button) this.bindButtonActivation(button, action);
    };
    bindDev('[data-dev-load-checkpoint]', () => {
      // Read the live control at activation time as well as tracking events.
      // This covers native mobile selects that commit their value immediately
      // before the click reaches the Load button.
      rememberCheckpoint();
      this.scene?.loadDevCheckpoint(this.devCheckpointId);
    });
    bindDev('[data-dev-reset-save]', () => this.scene?.resetDevTestSave());
    bindDev('[data-dev-return-normal]', () => this.scene?.returnToNormalSave());
    bindDev('[data-dev-add-coins="10"]', () => this.scene?.addDevCoins(10));
    bindDev('[data-dev-add-coins="100"]', () => this.scene?.addDevCoins(100));
    bindDev('[data-dev-finish-crop]', () => this.scene?.finishCurrentCrop());
  }

  private refreshAudioSettingsButtons(): void {
    this.panelBody.querySelectorAll<HTMLButtonElement>('[data-audio]').forEach((button) => {
      const setting = button.dataset.audio;
      const selected = setting === 'music-on' ? this.audio.musicEnabled
        : setting === 'music-off' ? !this.audio.musicEnabled
          : setting === 'sfx-on' ? this.audio.sfxEnabled
            : !this.audio.sfxEnabled;
      button.classList.toggle('is-selected', selected);
    });
  }

  private shopPanelMarkup(): string {
    const shop = this.scene?.getShopPanelState() ?? {
      inventoryPot: this.potCondition,
      inventoryItem: this.inventoryItem,
      saleComplete: false,
      basilHarvestSaleRecorded: false,
      basilDeliveryComplete: false,
      buySellGraphicsEra: 'atari-bw' as const,
      windowJobAccepted: false,
      windowCleaningProgress: 0,
      windowJobComplete: false,
      seedQuantities: { ...this.seedQuantities },
      harvestQuantities: { ...this.harvestQuantities },
      additionalGrowingPotsAvailable: 0,
      basicFertilizerCharges: this.basicFertilizerCharges,
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      shopStock: [] as ShopStockEntry[],
      ownedPremiumPlants: [...this.ownedPremiumPlants],
    };
    const windowSprayTotal = HOMES_WINDOW_CLEAN_SECTIONS.reduce((total, section) => total + section.spraysRequired, 0);
    const sectionSprays = new Set(HOMES_WINDOW_CLEAN_SECTIONS.map((section) => section.spraysRequired));
    const windowRequirement = sectionSprays.size === 1
      ? `${HOMES_WINDOW_CLEAN_SECTIONS.length} sections · ${HOMES_WINDOW_CLEAN_SECTIONS[0].spraysRequired} sprays each`
      : `${HOMES_WINDOW_CLEAN_SECTIONS.length} sections · ${windowSprayTotal} sprays total`;
    const quantityControl = (maximum: number, unitPrice: number, transaction: 'buy' | 'sell'): string => maximum > 1
      ? `<div class="shop-quantity-row"><label>QUANTITY <input type="number" min="1" max="${maximum}" value="1" inputmode="numeric" data-shop-quantity data-unit-price="${unitPrice}" data-transaction="${transaction}"></label><strong data-shop-total>${transaction === 'sell' ? 'SELL' : 'BUY'} FOR ${unitPrice} COINS</strong></div>`
      : `<div class="shop-quantity-row is-single"><strong data-shop-total>${transaction === 'sell' ? 'SELL' : 'BUY'} FOR ${unitPrice} COINS</strong></div>`;
    const stockName = (entry: ShopStockEntry): string => entry.item === 'small-golden-pothos'
      ? 'Small Golden Pothos'
      : entry.item === 'rare-spotted-begonia' ? 'Rare Spotted Begonia'
      : entry.item === 'special-repair-pot' ? 'Empty repaired pot'
        : getPlantDefinitionByProduct(entry.item).harvestLabel;
    const stockCondition = (entry: ShopStockEntry): string => isPlantProductItem(entry.item)
      ? getPlantDefinitionByProduct(entry.item).yieldMode === 'whole-plant' ? 'Living potted plant stack' : 'Fresh harvest stack'
      : entry.condition === 'repaired' ? 'Repaired · empty' : 'Ordinary condition';
    const stockQuality = (entry: ShopStockEntry): string => entry.quality === DEFAULT_SHOP_STOCK_QUALITY ? '' : ` · ${this.escapeHtml(entry.quality)}`;
    const sellOffers = [
      shop.inventoryPot === 'ordinary' && shop.inventoryItem === 'small-golden-pothos' ? `<div class="shop-offer"><div class="inventory-art">▱</div><div class="shop-offer-copy"><strong>Small Golden Pothos</strong><small>Sell for ${OPENING_POTHOS_SALE_PRICE} coins · Buy back for ${getShopBuybackPrice(OPENING_POTHOS_SALE_PRICE)} coins</small></div>${quantityControl(1, OPENING_POTHOS_SALE_PRICE, 'sell')}<button class="shop-sell-button" type="button" data-shop-sell="ordinary">SELL FOR ${OPENING_POTHOS_SALE_PRICE} COINS</button></div>` : '',
      shop.inventoryPot === 'ordinary' && shop.inventoryItem === 'rare-spotted-begonia' ? `<div class="shop-offer"><div class="inventory-art">♣</div><div class="shop-offer-copy"><strong>Rare Spotted Begonia</strong><small>Ordinary wanted purchase · Sell for ${RARE_BEGONIA_SALE_PRICE} coins · Buy back for ${getShopBuybackPrice(RARE_BEGONIA_SALE_PRICE)} coins</small></div>${quantityControl(1, RARE_BEGONIA_SALE_PRICE, 'sell')}<button class="shop-sell-button" type="button" data-shop-sell="rare-spotted-begonia">SELL FOR ${RARE_BEGONIA_SALE_PRICE} COINS</button></div>` : '',
      shop.inventoryPot === 'repaired' ? `<div class="shop-offer"><div class="inventory-art">◈</div><div class="shop-offer-copy"><strong>Empty repaired pot</strong><small>Sell for ${REPAIRED_POT_SALE_PRICE} coins · Buy back for ${getShopBuybackPrice(REPAIRED_POT_SALE_PRICE)} coins</small></div>${quantityControl(1, REPAIRED_POT_SALE_PRICE, 'sell')}<button class="shop-sell-button" type="button" data-shop-sell="repaired">SELL FOR ${REPAIRED_POT_SALE_PRICE} COINS</button></div>` : '',
      ...PLANT_SPECIES.map((species) => {
        const definition = getPlantDefinition(species);
        const amount = shop.harvestQuantities[species] ?? 0;
        return amount > 0 ? `<div class="shop-offer"><div class="inventory-art">${definition.yieldMode === 'whole-plant' ? '♣' : '✦'}</div><div class="shop-offer-copy"><strong>${definition.harvestLabel} ×${amount}</strong><small>${definition.yieldMode === 'whole-plant' ? 'Whole plant with basic pot' : 'Fresh stack'} · Sell for ${definition.harvestPrice} coins each · Buy back for ${getShopBuybackPrice(definition.harvestPrice)} coins each</small></div>${quantityControl(amount, definition.harvestPrice, 'sell')}<button class="shop-sell-button" type="button" data-shop-sell="${species}">SELL SELECTED</button></div>` : '';
      }),
    ].filter(Boolean).join('');
    const sellContent = `<div class="shop-content-heading">SELL</div>${sellOffers || '<div class="empty-state"><span class="empty-mark">—</span><strong>No eligible items</strong><small>Collect or grow an item before selling.</small></div>'}`;
    const stockOffers = shop.shopStock.map((entry) => {
      const unitPrice = getShopBuybackPrice(entry.item === 'small-golden-pothos'
        ? OPENING_POTHOS_SALE_PRICE
        : entry.item === 'rare-spotted-begonia'
          ? RARE_BEGONIA_SALE_PRICE
        : entry.item === 'special-repair-pot'
          ? REPAIRED_POT_SALE_PRICE
          : getPlantDefinitionByProduct(entry.item).harvestPrice);
      const quantity = entry.quantity > 1 ? ` ×${entry.quantity}` : '';
      return `<div class="shop-offer" data-stock-id="${this.escapeHtml(entry.stockId)}"><div class="inventory-art">${entry.item === 'small-golden-pothos' ? '▱' : entry.item === 'rare-spotted-begonia' ? '♣' : entry.item === 'special-repair-pot' ? '◈' : isPlantProductItem(entry.item) && getPlantDefinitionByProduct(entry.item).yieldMode === 'whole-plant' ? '♣' : '✦'}</div><div class="shop-offer-copy"><strong>${stockName(entry)}${quantity}</strong><small>${stockCondition(entry)}${stockQuality(entry)} · ${unitPrice} coins each</small></div>${quantityControl(entry.quantity, unitPrice, 'buy')}<button class="shop-sell-button" type="button" data-shop-buy-stock="${this.escapeHtml(entry.stockId)}">BUY SELECTED</button></div>`;
    }).join('');
    const premiumOffers = PREMIUM_PLANT_CATALOG.filter((plant) => !shop.ownedPremiumPlants.includes(plant.id)).map((plant) =>
      `<div class="shop-offer"><div class="inventory-art">♣</div><div class="shop-offer-copy"><strong>${plant.label}</strong><small>Premium potted plant · one available · ${plant.price} coins</small></div>${quantityControl(1, plant.price, 'buy')}<button class="shop-sell-button" type="button" data-shop-buy-premium="${plant.id}">BUY FOR ${plant.price} COINS</button></div>`,
    ).join('');
    const premiumContent = `<div class="shop-section-label">PREMIUM PLANTS</div>${premiumOffers || '<div class="empty-state"><span class="empty-mark">✓</span><strong>Premium shelf purchased</strong><small>All current premium plants are in your Bag.</small></div>'}`;
    const seedContent = shop.povoWelcomeGiftClaimed
      ? `<div class="shop-section-label">SEED PACKS</div>${PLANT_SPECIES.map((species) => { const definition = getPlantDefinition(species); const packPrice = definition.seedPrice * definition.seedPackQuantity; return `<div class="shop-offer"><div class="inventory-art">·</div><div class="shop-offer-copy"><strong>${definition.seedLabel} ×${definition.seedPackQuantity}</strong><small>One pack · ${packPrice} coins</small></div>${quantityControl(Number.MAX_SAFE_INTEGER, packPrice, 'buy')}<button class="shop-sell-button" type="button" data-shop-buy="seed-${species}">BUY PACK</button></div>`; }).join('')}`
      : '<div class="shop-section-label">SEEDS</div><div class="empty-state"><span class="empty-mark">—</span><strong>No stock available yet</strong><small>Claim the welcome gift before buying seeds.</small></div>';
    const potContent = shop.povoWelcomeGiftClaimed && shop.additionalGrowingPotsAvailable > 0 ? `<div class="shop-section-label">GROWING POTS</div><div class="shop-offer"><div class="inventory-art">▱</div><div class="shop-offer-copy"><strong>Small basic plastic pot</strong><small>Usable medium · ${shop.additionalGrowingPotsAvailable} available · ${SMALL_BASIC_PLASTIC_POT_PRICE} coins each</small></div>${quantityControl(shop.additionalGrowingPotsAvailable, SMALL_BASIC_PLASTIC_POT_PRICE, 'buy')}<button class="shop-sell-button" type="button" data-shop-buy-growing-pot>BUY SELECTED</button></div>` : '';
    const fertilizerContent = shop.povoWelcomeGiftClaimed
      ? `<div class="shop-section-label">GROWING SUPPLIES</div><div class="shop-offer"><div class="inventory-art">✚</div><div class="shop-offer-copy"><strong>Basic Fertiliser · box of ${BASIC_FERTILIZER_PELLETS_PER_BOX} pellets</strong><small>Owned: ${shop.basicFertilizerCharges} · Each pellet shortens active growth by ${BASIC_FERTILIZER_GROWTH_REDUCTION_MS / 1000} seconds</small></div>${quantityControl(1, BASIC_FERTILIZER_BOX_PRICE, 'buy')}<button class="shop-sell-button" type="button" data-shop-buy-fertilizer>BUY BOX FOR ${BASIC_FERTILIZER_BOX_PRICE} COINS</button></div>`
      : '';
    const buyContent = `<div class="shop-content-heading">BUY</div>${premiumContent}<div class="shop-section-label">PLAYER-SOLD STOCK</div>${stockOffers || '<div class="empty-state"><span class="empty-mark">—</span><strong>No player-sold stock available</strong><small>Sell an eligible item before it appears here.</small></div>'}${seedContent}${fertilizerContent}${potContent}`;
    const goldenPothosDelivery = shop.saleComplete
      ? ''
      : `<div class="shop-request is-special-delivery${shop.inventoryItem === 'small-golden-pothos' ? ' is-ready' : ''}"><div class="delivery-summary"><strong>★ SPECIAL DELIVERY</strong><span>GOLDEN POTHOS</span><small>Reward: ${OPENING_POTHOS_DELIVERY_REWARD} coins · ${shop.inventoryItem === 'small-golden-pothos' ? 'Ready to deliver' : 'Find one and bring it here'}</small></div>${shop.inventoryItem === 'small-golden-pothos' ? `<button class="shop-sell-button delivery-action" type="button" data-shop-deliver="small-golden-pothos">DELIVER · +${OPENING_POTHOS_DELIVERY_REWARD}</button>` : ''}</div>`;
    const basilDelivery = shop.buySellGraphicsEra === 'atari-colour' && !shop.basilDeliveryComplete
      ? `<div class="shop-request is-special-delivery${shop.harvestQuantities.basil > 0 ? ' is-ready' : ''}"><div class="delivery-summary"><strong>★ SPECIAL DELIVERY</strong><span>FRESH BASIL</span><small>Reward: ${BASIL_DELIVERY_REWARD} coins · ${shop.harvestQuantities.basil > 0 ? 'Ready to deliver' : 'Grow and harvest one bunch'}</small></div>${shop.harvestQuantities.basil > 0 ? `<button class="shop-sell-button delivery-action" type="button" data-shop-deliver="basil">DELIVER · +${BASIL_DELIVERY_REWARD}</button>` : ''}</div>`
      : '';
    const jobContent = shop.windowJobAccepted || shop.windowJobComplete
      ? ''
      : `<div class="job-card is-available current-wanted-job"><strong>Wanted: Casual Window Washer</strong><div class="shop-detail-list"><span>LOCATION <b>REAL ESTATE</b></span><span>REWARD <b>${WINDOW_JOB_REWARD} COINS + TOOLS</b></span><span>REQUIREMENTS <b>${windowRequirement.toUpperCase()}</b></span><span>STATUS <b>AVAILABLE NOW</b></span></div><button class="shop-sell-button" type="button" data-accept-window-job>ACCEPT JOB</button></div>`;
    const futureJob = (title: string, role: string): string => `<div class="job-card is-locked"><strong>${title}</strong><div class="shop-detail-list"><span>ROLE <b>${role}</b></span><span>REWARD <b>NOT SET</b></span><span>REQUIREMENTS <b>FUTURE JOB</b></span><span>STATUS <b>LOCKED</b></span></div><small>Not accessible yet. This role will be available in a future update.</small></div>`;
    const futureJobs = `${futureJob('Wanted: Full-time cleaner', 'FULL-TIME CLEANER')}${futureJob('Wanted: Cleaning contract', 'CLEANING CONTRACT')}${futureJob('Wanted: Service robot nursery worker', 'NURSERY WORKER')}`;
    const actionableWanted = !shop.saleComplete || Boolean(basilDelivery) || (!shop.windowJobAccepted && !shop.windowJobComplete);
    const currentRequests = `${goldenPothosDelivery}${basilDelivery}${jobContent}` || '<div class="empty-state current-requests-empty"><span class="empty-mark">—</span><strong>COME BACK LATER</strong><small>There are no current requests or available jobs.</small></div>';
    const wantedSellOffers = sellOffers || '<div class="empty-state"><span class="empty-mark">—</span><strong>No eligible items to sell</strong><small>Collect or grow an item before selling.</small></div>';
    const wantedContent = `<div class="shop-content-heading">WANTED</div><div class="shop-section-label">CURRENT REQUESTS</div>${currentRequests}<div class="shop-section-label">WE ARE CURRENTLY BUYING</div><div class="wanted-sell-list">${wantedSellOffers}</div><div class="shop-section-label">FUTURE OPPORTUNITIES</div>${futureJobs}`;
    const tab = (key: 'buy' | 'sell' | 'wanted', label: string): string => `<button type="button" data-shop-tab="${key}" class="${this.shopTab === key ? 'is-active' : ''}${key === 'wanted' && actionableWanted && this.shopTab !== 'wanted' ? ' is-attention' : ''}" role="tab" aria-selected="${this.shopTab === key}" aria-controls="shop-panel-content">${label}</button>`;
    const content = this.shopTab === 'sell' ? sellContent : this.shopTab === 'buy' ? buyContent : wantedContent;
    return `<div class="shop-tabs" role="tablist" aria-label="Buy and Sell tabs">${tab('buy', 'BUY')}${tab('sell', 'SELL')}${tab('wanted', 'WANTED')}</div><div id="shop-panel-content" class="shop-panel-content">${content}</div><p class="shop-feedback ${this.shopFeedback ? 'is-visible' : ''}" aria-live="polite">${this.escapeHtml(this.shopFeedback)}</p>`;
  }

  private propertyPanelMarkup(listing: PropertyListingKey): string {
    const state = this.scene?.getPropertyPanelState() ?? {
      coins: this.coins,
      rentalBondPaid: false,
      rentalKeyOwned: false,
      povoWelcomeGiftClaimed: false,
      activeProperty: 'none' as PropertyId,
      rentalBondTotal: 0,
      basilHarvestSaleRecorded: false,
      mintHarvestSaleRecorded: false,
      secondRentalMoveConfirmation: false,
      repairComplete: false,
      foundPotCount: 0,
    };
    if (listing === 'mid-rental') {
      const eligible = state.basilHarvestSaleRecorded && state.mintHarvestSaleRecorded;
      const occupied = state.activeProperty === 'second-rental';
      const checklist = `<div class="property-details-list"><span>BASIL HARVEST SOLD <b>${state.basilHarvestSaleRecorded ? 'COMPLETE' : 'REQUIRED'}</b></span><span>MINT HARVEST SOLD <b>${state.mintHarvestSaleRecorded ? 'COMPLETE' : 'REQUIRED'}</b></span><span>GROWING POSITIONS <b>6</b></span><span>TOTAL REFUNDABLE BOND <b>${SECOND_RENTAL_TOTAL_BOND} COINS</b></span><span>EXISTING BOND TRANSFERRED <b>${RENTAL_BOND_COST} COINS</b></span><span>ADDITIONAL PAYMENT <b>${SECOND_RENTAL_MOVE_COST} COINS</b></span></div>`;
      const moveContent = occupied
        ? '<div class="property-status is-unlocked">YOUR TWO-ROOM RENTAL · ACCESS UNLOCKED</div><p class="property-note">The starter apartment was returned. Pots and crops moved with Alex; extra positions do not create free pots.</p>'
        : !eligible
          ? '<p class="property-warning">Complete one genuine basil harvest sale and one genuine mint harvest sale before arranging the move.</p>'
          : state.secondRentalMoveConfirmation
            ? `<div class="property-confirmation"><strong>CONFIRM MOVE</strong><p class="property-note">The existing ${RENTAL_BOND_COST}-coin bond transfers. Pay ${SECOND_RENTAL_MOVE_COST} additional coins. Pots and plants move with Alex, and the old apartment is returned.</p><button class="property-action" type="button" data-confirm-second-rental>CONFIRM MOVE · ${SECOND_RENTAL_MOVE_COST} COINS</button><button class="property-secondary-action" type="button" data-cancel-second-rental>CANCEL</button></div>`
            : `<p class="property-note">The starter bond transfers. Save ${SECOND_RENTAL_MOVE_COST} additional coins to move.</p><button class="property-action" type="button" data-review-second-rental>ARRANGE MOVE</button>`;
      return `<div class="property-details"><div class="property-heading">TO RENT <span>TWO-ROOM RENTAL</span></div><div class="property-preview" aria-label="Two-room rental preview"><span>LIVING<br>ROOM</span><span>GROWING<br>ROOM</span><span>6<br>SLOTS</span></div>${checklist}${moveContent}<p class="property-feedback ${this.propertyFeedback ? 'is-visible' : ''}" aria-live="polite">${this.escapeHtml(this.propertyFeedback)}</p></div>`;
    }
    if (listing === 'high-property') {
      return '<div class="property-details"><div class="property-heading">FOR SALE <span>FUTURE GOAL</span></div><div class="property-preview" aria-label="Future property preview"><span>HOUSE</span><span>LAND</span><span>COMING<br>LATER</span></div><div class="property-details-list"><span>TYPE <b>High-level property</b></span><span>STATUS <b>VIEWABLE UNAVAILABLE</b></span></div><p class="property-note">A future property listing. Price, unlock conditions and interior access are not available in this prototype.</p></div>';
    }
    const shortfall = Math.max(0, RENTAL_BOND_COST - state.coins);
    const openingChecklistComplete = state.repairComplete && state.foundPotCount >= 3;
    const openingChecklist = `<div class="property-details-list"><span>POTS FOUND <b>${Math.min(3, state.foundPotCount)} / 3</b></span><span>ITEM REPAIRED <b>${state.repairComplete ? 'COMPLETE' : 'REQUIRED'}</b></span></div>`;
    const rentalContent = state.rentalBondPaid
      ? `<div class="property-status is-unlocked">YOUR RENTAL · ACCESS UNLOCKED</div><p class="property-note">Apartment key ${state.rentalKeyOwned ? 'received and stored in the Bag.' : 'will be restored from this rental.'} Use the STARTER APARTMENT door on the street to enter.</p><div class="property-kit-note">WELCOME GIFT<br><small>Pot · used medium · basil seeds · basic watering can · 1 basic fertiliser pellet</small></div>`
      : `<div class="property-balance">AVAILABLE COINS <strong>${state.coins}</strong></div>${!openingChecklistComplete ? '<p class="property-warning">Complete the found-pot and repair requirements before renting.</p>' : shortfall > 0 ? `<p class="property-warning">Need ${shortfall} more coin${shortfall === 1 ? '' : 's'}. No coins will be deducted.</p>` : `<p class="property-note">The ${RENTAL_BOND_COST}-coin bond unlocks the apartment and its one-time welcome gift together.</p>`}<button class="property-action" type="button" data-pay-bond>PAY ${RENTAL_BOND_COST}-COIN BOND</button>`;
    return `<div class="property-details"><div class="property-heading">TO RENT <span>STARTER APARTMENT</span></div><div class="property-preview" aria-label="Sparse starter apartment interior preview"><span>WINDOW</span><span>GROWING<br>SPACE</span><span>EXIT</span></div><div class="property-details-list"><span>TYPE <b>Small Green CRT apartment</b></span><span>BOND <b>${RENTAL_BOND_COST} COINS</b></span><span>INCLUDED <b>First rental period</b></span><span>SUPPLIES <b>Starter growing supplies</b></span></div>${openingChecklist}${rentalContent}<p class="property-feedback ${this.propertyFeedback ? 'is-visible' : ''}" aria-live="polite">${this.escapeHtml(this.propertyFeedback)}</p></div>`;
  }

  private basilPanelMarkup(): string {
    const state = this.scene?.getBasilPanelState() ?? {
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      slotState: 'empty' as const,
      stage: 'empty' as BasilStage,
      timeRemainingMs: 0,
      wateringCanOwned: this.wateringCanOwned,
      basicFertilizerCharges: this.basicFertilizerCharges,
      selectedPotId: null,
      growingPots: this.growingPots,
      seedQuantities: this.seedQuantities,
      harvestQuantities: this.harvestQuantities,
    };
    const selectedPot = state.growingPots.find((pot) => pot.id === state.selectedPotId) ?? null;
    const selectedDefinition = selectedPot?.crop ? getPlantDefinition(selectedPot.crop.species) : null;
    const stageLabels: Record<BasilStage, string> = {
      empty: state.slotState === 'pot' ? 'POT READY' : 'EMPTY SLOT', planted: 'NEEDS WATER', seedling: 'GROWING', mature: selectedDefinition?.yieldMode === 'whole-plant' ? 'READY TO LIFT' : 'READY TO HARVEST',
    };
    const minutes = Math.floor(state.timeRemainingMs / 60000);
    const seconds = Math.ceil((state.timeRemainingMs % 60000) / 1000);
    const timeLabel = state.timeRemainingMs > 0 ? `${minutes}:${String(seconds).padStart(2, '0')} remaining` : '';
    const potName = 'Small basic plastic pot';
    const speciesLabel = selectedPot?.crop ? getPlantDefinition(selectedPot.crop.species).label : '';
    let status = '';
    let action = '';
    if (!state.povoWelcomeGiftClaimed) {
      status = 'Claim the welcome gift inside your rental first.';
    } else if (!selectedPot) {
      status = 'No pot selected.';
    } else if (state.stage === 'empty') {
      const availableSpecies = PLANT_SPECIES.filter((species) => (state.seedQuantities[species] ?? 0) > 0);
      status = availableSpecies.length > 0 ? 'Choose a seed type.' : '';
      const seedButtons = availableSpecies.map((species) => {
        const definition = getPlantDefinition(species);
        const available = state.seedQuantities[species] ?? 0;
        return `<button class="basil-action" type="button" data-plant-species="${species}">PLANT ${definition.label.toUpperCase()} <small>×${available}</small></button>`;
      }).join('');
      action = availableSpecies.length > 0 ? `<div class="seed-choice-row">${seedButtons}</div>` : '';
    } else if (state.stage === 'planted') {
      action = state.wateringCanOwned
        ? '<button class="basil-action" type="button" data-water-crop>WATER CROP</button>'
        : '';
    } else if (state.stage === 'seedling') {
      status = timeLabel;
      action = state.basicFertilizerCharges > 0
        ? `<button class="basil-action" type="button" data-use-basic-fertilizer>FERTILISE CROP <small>×${state.basicFertilizerCharges}</small></button>`
        : '';
    } else {
      action = selectedDefinition?.yieldMode === 'whole-plant'
        ? `<button class="basil-action" type="button" data-harvest-crop>LIFT ${selectedDefinition.label.toUpperCase()} INTO BAG</button>`
        : '<button class="basil-action" type="button" data-harvest-crop>HARVEST CROP</button>';
    }
    return `<div class="basil-panel"><div class="basil-pot-header"><span class="basil-stage-art">${state.stage === 'mature' ? '♣' : state.stage === 'seedling' ? '⌁' : '▱'}</span><div><strong>${potName.toUpperCase()}</strong>${speciesLabel ? `<small>${this.escapeHtml(speciesLabel)}</small>` : ''}<b>${stageLabels[state.stage]}</b>${status ? `<small>${this.escapeHtml(status)}</small>` : ''}</div></div>${action}<p class="basil-feedback ${this.basilFeedback ? 'is-visible' : ''}" aria-live="polite">${this.escapeHtml(this.basilFeedback)}</p></div>`;
  }

  private devToolsMarkup(): string {
    const options = getDevCheckpointOptions();
    const optionsMarkup = options.map((checkpoint) => `<option value="${this.escapeHtml(checkpoint.id)}"${checkpoint.id === this.devCheckpointId ? ' selected' : ''}>${this.escapeHtml(checkpoint.label)}</option>`).join('');
    const testDisabled = this.devTestMode ? '' : ' disabled';
    const cropDisabled = this.scene?.canFinishCurrentCrop() ? '' : ' disabled';
    return `<section class="dev-tools" aria-label="Developer tools"><div class="dev-tools-heading"><strong>DEVELOPER TOOLS</strong><span class="dev-save-badge">DEV ONLY</span></div><p class="dev-tools-note">Development builds only. Checkpoints use a separate test save and never alter the normal save.</p><label class="dev-checkpoint-label" for="dev-checkpoint">CHECKPOINT<select id="dev-checkpoint" data-dev-checkpoint>${optionsMarkup}</select></label><div class="dev-action-grid"><button type="button" data-dev-load-checkpoint>LOAD CHECKPOINT</button><button type="button" data-dev-reset-save>RESET TEST SAVE</button><button type="button" data-dev-return-normal${testDisabled}>RETURN TO NORMAL SAVE</button></div><div class="dev-action-grid dev-small-actions"><button type="button" data-dev-add-coins="10"${testDisabled}>+10 COINS</button><button type="button" data-dev-add-coins="100"${testDisabled}>+100 COINS</button><button type="button" data-dev-finish-crop${cropDisabled}>FINISH CURRENT CROP</button></div><p class="dev-feedback" data-dev-feedback aria-live="polite">${this.escapeHtml(this.devFeedback)}</p>${this.devTestMode ? '<p class="dev-active-state">DEV TEST SAVE ACTIVE</p>' : '<p class="dev-inactive-state">NORMAL SAVE ACTIVE</p>'}</section>`;
  }

  private cityMapMarkup(): string {
    const roadMarkup = CITY_ROADS.map((road) => {
      const angle = road.angle ? ` transform:rotate(${road.angle}deg);` : '';
      return `<span class="city-map-road" style="left:${road.x}px;top:${road.y}px;width:${road.width}px;height:${road.height}px;${angle}"></span>`;
    }).join('');
    const districtMarkup = CITY_DISTRICTS.map((district) => `<div class="city-map-district ${district.unlocked ? 'starting-district' : 'locked-district'}" data-district="${this.escapeHtml(district.id)}" style="left:${district.x}px;top:${district.y}px;width:${district.width}px;height:${district.height}px"><strong>${this.escapeHtml(district.label)}</strong><small>${district.unlocked ? 'YOU ARE HERE' : '▣ LOCKED'}</small></div>`).join('');
    const detailMarkup = [
      [285, 75, 150, 52, 'PARK'], [640, 68, 150, 42, 'VACANT BLOCK'], [300, 385, 180, 38, 'UNDEVELOPED'],
      [715, 385, 180, 38, 'CONSTRUCTION'], [1010, 365, 84, 32, 'PARK'], [80, 230, 120, 34, 'LOTS'],
    ].map(([x, y, width, height, label]) => `<span class="city-map-detail" style="left:${x}px;top:${y}px;width:${width}px;height:${height}px">${label}</span>`).join('');
    return `<div class="city-map-stage"><div class="city-map-frame" role="application" aria-label="City map. Drag to pan, pinch or use the controls to zoom."><div class="city-map-layer"><div class="city-map-world" style="width:${CITY_MAP_SIZE.width}px;height:${CITY_MAP_SIZE.height}px">${roadMarkup}${detailMarkup}${districtMarkup}<span id="map-player" class="city-map-player" aria-label="Alex"></span><span class="city-map-north">N</span></div></div></div><div class="city-map-controls" aria-label="Map controls"><button type="button" data-map-zoom="out" aria-label="Map zoom out">−</button><button type="button" data-map-zoom="in" aria-label="Map zoom in">＋</button></div><div class="city-map-hint">DRAG TO PAN · PINCH OR WHEEL TO ZOOM</div></div>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character] ?? character));
  }
}
