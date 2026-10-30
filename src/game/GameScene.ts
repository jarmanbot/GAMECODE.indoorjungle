import Phaser from 'phaser';
import { drawBuySellBuilding, drawNeighborhood, drawPot, drawGoldenPothos, drawRareSpottedBegonia, drawBrokenPot, drawBrokenPotPieces, drawGrowingCrop, drawMatchingDoor, drawStarterApartmentDoor, drawRealEstateDoor, setBuySellDoorOpen, setStarterApartmentDoorOpen, setRealEstateDoorOpen, type BasilVisualStage, type BuySellArtwork } from './art';
import { AudioController } from './AudioController';
import { PHONE_HYBRID_CONTROLS } from './config';
import { createDevCheckpoint, type DevCheckpointScene } from './devCheckpoints';
import {
  DEFAULT_SHOP_STOCK_QUALITY,
  DEFAULT_PROGRESS,
  OPENING_GOLDEN_POTHOS_INSTANCE_ID,
  RARE_SPOTTED_BEGONIA_INSTANCE_ID,
  sanitizeProgress,
  SPECIAL_REPAIR_POT_INSTANCE_ID,
  type BasilStage,
  type AlexGraphics,
  type EquippedTool,
  type InventoryItem,
  type PotCondition,
  type PlacedWorldItem,
  type ProgressState,
  type ShopStockCondition,
  type ShopStockEntry,
  type ShopStockItem,
  type TaskState,
} from './progress';
import { GROWING_TABLE_SLOT_COUNT, MAX_ADDITIONAL_GROWING_POTS, STARTER_GROWING_POT_ID, createEmptyGrowingPot, getGrowSlotState, type GrowSlotState, type GrowingPotState } from './growing';
import {
  getPlantDefinition,
  getPlantDefinitionByProduct,
  isPlantProductItem,
  isPlantSpecies,
  PLANT_SPECIES,
  type PlantSeedItem,
  type PlantSpecies,
} from './plants';
import { getPremiumPlantDefinition, PREMIUM_PLANT_CATALOG, type PremiumPlantId } from './shopCatalog';
import { getPropertyWelcomeGift } from './welcomeGifts';
import {
  BUILDINGS,
  APARTMENT_DOOR_BOTTOM,
  APARTMENT_DOOR_TOP,
  APARTMENT_DOOR_WIDTH,
  APARTMENT_ENTRANCE,
  BUY_SELL_DOOR_BOTTOM,
  BUY_SELL_DOOR_HEIGHT,
  BUY_SELL_DOOR_TOP,
  BUY_SELL_DOOR_WIDTH,
  BUY_SELL_ENTRANCE,
  BUY_SELL_NAME,
  BUY_SELL_SIGN_NAME,
  BUY_SELL_WINDOW,
  BROKEN_POT_PIECE_COUNT,
  BROKEN_POT_PIECE_IDS,
  BROKEN_POT_PIECE_OFFSETS,
  BROKEN_POT_PIECES_CENTRE,
  BROKEN_POT_PIECES_SCALE,
  CROSSING_END_X,
  CROSSING_START_X,
  FRONT_PAVEMENT_MAX_Y,
  FRONT_PAVEMENT_MIN_Y,
  HOME_EXIT,
  HOME_EXIT_ACTIVATION_BOTTOM,
  HOME_EXIT_ACTIVATION_HALF_WIDTH,
  HOME_EXIT_ACTIVATION_TOP,
  HOME_EXIT_DOOR_BOTTOM,
  HOME_EXIT_DOOR_HEIGHT,
  HOME_EXIT_DOOR_TOP,
  HOME_EXIT_DOOR_WIDTH,
  HOME_EXIT_MOVEMENT_TRIGGER_Y,
  HOME_GROWING_SPOTS,
  SECOND_HOME_GROWING_SPOTS,
  HOME_PLAYER_START,
  HOME_WELCOME_GIFT,
  HOME_WORLD_HEIGHT,
  HOME_WORLD_WIDTH,
  SECOND_HOME_PLAYER_START,
  SECOND_HOME_WORLD_HEIGHT,
  SECOND_HOME_WORLD_WIDTH,
  SECOND_RENTAL_ENTRANCE,
  SECOND_RENTAL_DOOR_TOP,
  SECOND_RENTAL_DOOR_BOTTOM,
  OPENING_TOWER,
  OPENING_DROP_POINT,
  BASIL_GROWTH_DURATION_MS,
  BASIL_POT_INTERACTION_RADIUS,
  BASIL_HARVEST_PRICE,
  BASIL_DELIVERY_REWARD,
  BASIL_SEED_PRICE,
  BASIC_FERTILIZER_BOX_PRICE,
  BASIC_FERTILIZER_PELLETS_PER_BOX,
  BASIC_FERTILIZER_GROWTH_REDUCTION_MS,
  SMALL_BASIC_PLASTIC_POT_PRICE,
  getShopBuybackPrice,
  OPENING_POTHOS_DELIVERY_REWARD,
  OPENING_POTHOS_SALE_PRICE,
  WINDOW_JOB_REWARD,
  REPAIRED_POT_SALE_PRICE,
  RARE_BEGONIA_SALE_PRICE,
  RENTAL_BOND_COST,
  SECOND_RENTAL_TOTAL_BOND,
  SECOND_RENTAL_MOVE_COST,
  HOMES_LISTINGS,
  HOMES_WINDOW,
  HOMES_WINDOW_CLEAN_SECTIONS,
  REAL_ESTATE_DOOR_BOTTOM,
  REAL_ESTATE_DOOR_TOP,
  REAL_ESTATE_ENTRANCE,
  OPPOSITE_PAVEMENT_MAX_Y,
  OPPOSITE_PAVEMENT_MIN_Y,
  PAVEMENT_Y,
  POT_POSITION,
  RARE_BEGONIA_POSITION,
  HEAVY_POT_POSITION,
  SHOP_COUNTER,
  SHOP_COUNTER_APPROACH,
  SHOP_COUNTER_HEIGHT,
  SHOP_COUNTER_WIDTH,
  SHOP_EXIT,
  SHOP_EXIT_ACTIVATION_BOTTOM,
  SHOP_EXIT_ACTIVATION_HALF_WIDTH,
  SHOP_EXIT_ACTIVATION_TOP,
  SHOP_EXIT_DOOR_BOTTOM,
  SHOP_EXIT_DOOR_HEIGHT,
  SHOP_EXIT_DOOR_TOP,
  SHOP_EXIT_DOOR_WIDTH,
  SHOP_EXIT_MOVEMENT_TRIGGER_Y,
  SHOP_HANDOVER_POINT,
  SHOP_PLAYER_START,
  SHOP_SHELF_SLOTS,
  SHOP_SHELVES,
  SHOP_WORLD_HEIGHT,
  SHOP_WORLD_WIDTH,
  START_POSITION,
  STARTING_WALKABLE_MAX_X,
  STARTING_WALKABLE_MIN_X,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type PropertyId,
  type PropertyListingKey,
  type ZoomMode,
} from './world';
import type { HudController } from '../ui/HudController';

interface Car {
  graphics: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
}

type PendingInteraction = 'pickup' | 'pickup-begonia' | 'pickup-placed-item' | 'select-broken-piece' | 'pickup-repaired' | 'window-clean' | 'enter-shop' | 'counter' | 'exit-shop' | 'enter-real-estate' | 'exit-real-estate' | 'enter-home' | 'exit-home' | 'place-starter-pot' | 'select-basil-pot' | 'place-growing-pot' | 'select-growing-pot' | 'gardening-action';
type PlayerFacing = 'front' | 'back' | 'left' | 'right';
type GardeningActionType = 'plant' | 'water' | 'fertilize' | 'harvest';
interface GardeningAction {
  potId: string;
  type: GardeningActionType;
  species?: PlantSpecies;
  requiredTool?: EquippedTool;
}
type ShopPresentationItem = ShopStockItem | PremiumPlantId | PlantSeedItem | 'small-basic-plastic-pot' | 'basic-fertilizer-box';
type ShopTransactionDirection = 'buy' | 'sell';
const SHOP_LABEL_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
interface PendingShopkeeperTransaction {
  item: ShopPresentationItem;
  quantity: number;
  direction: ShopTransactionDirection;
  source: Phaser.Math.Vector2;
  feedback: string;
}
type DevSessionMeta = { checkpointId: string; scene: DevCheckpointScene; spawn: { x: number; y: number }; zoom: ZoomMode };
const DEV_BUILD = import.meta.env.DEV;
// Broken fragments are intentionally drawn much larger than their anchor
// points. This range covers the complete visible fragment plus Alex's feet so
// standing beside or over a piece always counts as close enough.
const BROKEN_POT_PIECE_PICKUP_RANGE = 145;

const PLANT_TASKS: Record<PlantSpecies, {
  plant: TaskState;
  water: TaskState;
  grow: TaskState;
  mature: TaskState;
  sell: TaskState;
}> = {
  basil: { plant: 'plant-basil', water: 'water-basil', grow: 'grow-basil', mature: 'harvest-basil', sell: 'sell-basil' },
  mint: { plant: 'plant-mint', water: 'water-mint', grow: 'grow-mint', mature: 'harvest-mint', sell: 'sell-mint' },
  'dwarf-marigold': { plant: 'plant-dwarf-marigold', water: 'water-dwarf-marigold', grow: 'grow-dwarf-marigold', mature: 'lift-dwarf-marigold', sell: 'sell-dwarf-marigold' },
  'peace-lily': { plant: 'plant-peace-lily', water: 'water-peace-lily', grow: 'grow-peace-lily', mature: 'lift-peace-lily', sell: 'sell-peace-lily' },
};

export class GameScene extends Phaser.Scene {
  private readonly zoomOrder: ZoomMode[] = ['normal', 'close'];
  private readonly hud: HudController;
  private readonly audio: AudioController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
  private rareBegonia!: Phaser.GameObjects.Graphics;
  private heavyPot!: Phaser.GameObjects.Graphics;
  private placedItemDisplay?: Phaser.GameObjects.Graphics;
  private brokenPot!: Phaser.GameObjects.Graphics;
  private windowDirtOverlay!: Phaser.GameObjects.Graphics;
  private sprayEffect!: Phaser.GameObjects.Graphics;
  private repairPotDisplay?: Phaser.GameObjects.Graphics;
  private repairPickupPrompt?: Phaser.GameObjects.Text;
  private buySellDoor?: Phaser.GameObjects.Graphics;
  private buySellArtworkObjects: Phaser.GameObjects.GameObject[] = [];
  private buySellUpgradeAnimating = false;
  private starterApartmentDoor?: Phaser.GameObjects.Graphics;
  private cars: Car[] = [];
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private hopKey!: Phaser.Input.Keyboard.Key;
  private toolKey!: Phaser.Input.Keyboard.Key;
  private toolKeyHeld = false;
  private target: Phaser.Math.Vector2 | null = null;
  private targetQueue: Phaser.Math.Vector2[] = [];
  private joystickInput = new Phaser.Math.Vector2();
  private joystickPointerHeld = false;
  private joystickSteering = false;
  private zoomMode: ZoomMode = 'close';
  private inventoryHasPot = false;
  private inventoryPot: PotCondition | null = null;
  private inventoryInstanceId: string | null = null;
  private saleComplete = false;
  private coins = 0;
  private progress: ProgressState = sanitizeProgress(DEFAULT_PROGRESS);
  private readonly normalProgressKey = 'indoor-jungle-progress-v3';
  private readonly devProgressKey = 'indoor-jungle-progress-dev-test-v3';
  private readonly devModeKey = 'indoor-jungle-dev-test-mode-v1';
  private readonly devSessionKey = 'indoor-jungle-dev-test-session-v1';
  private readonly displayPreferencesKey = 'indoor-jungle-display-preferences';
  private testSaveMode = false;
  private devSessionMeta: DevSessionMeta | null = null;
  private modalOpen = false;
  private mapMovementAllowed = false;
  private shopInterior = false;
  private realEstateInterior = false;
  private homeInterior = false;
  private shopTransitioning = false;
  private movementReleaseRequired = false;
  private streetZoomMode: ZoomMode = 'close';
  private pendingInteraction: PendingInteraction | null = null;
  private streetPosition = new Phaser.Math.Vector2(START_POSITION.x, START_POSITION.y);
  private destinationMarker!: Phaser.GameObjects.Graphics;
  private interactionHighlight!: Phaser.GameObjects.Graphics;
  private thoughtBubble?: Phaser.GameObjects.Container;
  private thoughtBubbleBackdrop?: Phaser.GameObjects.Graphics;
  private thoughtBubbleText?: Phaser.GameObjects.Text;
  private thoughtBubbleRemainingMs = 0;
  private thoughtBubbleIsAutomatic = false;
  private mintLowSuppliesTimer?: Phaser.Time.TimerEvent;
  private housingThoughtElapsedMs = 0;
  private placementHighlight!: Phaser.GameObjects.Graphics;
  private placementOptionsHighlight!: Phaser.GameObjects.Graphics;
  private itemPlacementMode = false;
  private placementTarget: Phaser.Math.Vector2 | null = null;
  private placementOptionTargets: Phaser.Math.Vector2[] = [];
  private streetObjects: Phaser.GameObjects.GameObject[] = [];
  private streetArtworkObjects: Phaser.GameObjects.GameObject[] = [];
  private shopObjects: Phaser.GameObjects.GameObject[] = [];
  private homeObjects: Phaser.GameObjects.GameObject[] = [];
  private homeWelcomeGiftObjects: Phaser.GameObjects.GameObject[] = [];
  private basilPot?: Phaser.GameObjects.Graphics;
  private growingPotDisplays = new Map<string, Phaser.GameObjects.Graphics>();
  private basilWaterEffect?: Phaser.GameObjects.Graphics;
  private toastTimer?: Phaser.Time.TimerEvent;
  private lastWorldInputAt = 0;
  private portraitFollowCentered = false;
  private closeFollowCentered = false;
  private phoneLandscapeBlocked = false;
  private phoneOrientation: 'portrait' | 'landscape' | 'other' | null = null;
  private toolHeld = false;
  private toolFeedbackAt = 0;
  private lastSavedCleaningStage = 0;
  private sprayTimer?: Phaser.Time.TimerEvent;
  private sprayAnimating = false;
  private sprayElapsed = 0;
  private readonly sprayDuration = 1000;
  private wantedSignBackdrop?: Phaser.GameObjects.Graphics;
  private wantedSignText?: Phaser.GameObjects.Text;
  private wantedSignPulse?: Phaser.Tweens.Tween;
  private realEstateStatusBackdrop?: Phaser.GameObjects.Graphics;
  private realEstateStatusText?: Phaser.GameObjects.Text;
  private shopGoldenPothosDisplay: Phaser.GameObjects.GameObject[] = [];
  private shopPremiumPlantDisplay: Phaser.GameObjects.GameObject[] = [];
  private shopkeeper?: Phaser.GameObjects.Graphics;
  private shopExitDoor?: Phaser.GameObjects.Graphics;
  private homeExitDoor?: Phaser.GameObjects.Graphics;
  private realEstateDoor?: Phaser.GameObjects.Graphics;
  private shopkeeperCarry?: Phaser.GameObjects.Graphics;
  private shopkeeperCarryLabel?: Phaser.GameObjects.Text;
  private shopkeeperTransactionTween?: Phaser.Tweens.Tween;
  private shopTransactionBusy = false;
  private pendingShopkeeperTransactions: PendingShopkeeperTransaction[] = [];
  private hopActive = false;
  private hopElapsed = 0;
  private readonly hopDuration = 520;
  private hopVisualOffset = 0;
  private lastFacing = new Phaser.Math.Vector2(0, 1);
  private playerFacing: PlayerFacing = 'front';
  private windowFacingLocked = false;
  private windowFacePromptRequired = false;
  private selectedWindowSectionIndex: number | null = null;
  private repairPresentationActive = false;
  private repairPickupReady = false;
  private repairAnimating = false;
  private brokenPotPieceSelected = false;
  private selectedBrokenPotPieceIndex: number | null = null;
  private pendingBrokenPotPieceIndex: number | null = null;
  private rentalBondPaid = false;
  private rentalKeyOwned = false;
  private activeProperty: PropertyId = 'none';
  private rentalBondTotal = 0;
  private secondRentalMoveConfirmation = false;
  private get povoWelcomeGiftClaimed(): boolean { return this.progress.welcomeGiftsClaimed['starter-apartment'] === true; }
  private rentalFeedbackAt = 0;
  private basilPotSelected = false;
  private selectedGrowingSpotIndex: number | null = null;
  private basilWaterAnimating = false;
  private basilWaterElapsed = 0;
  private readonly basilWaterDuration = 720;
  private basilStageCache: BasilStage = 'empty';
  private selectedGrowingPotId: string | null = null;
  private growingSlotReadyToPlace = false;
  private pendingGardeningAction: GardeningAction | null = null;
  private activeGardeningAction: GardeningAction | null = null;
  private gardeningActionElapsed = 0;
  private gardeningActionApplied = false;
  private readonly gardeningActionDuration = 760;
  private gardeningPanelRefreshAt = 0;
  private openingSequenceActive = false;
  private openingSequenceTween?: Phaser.Tweens.Tween;
  private openingKick?: Phaser.GameObjects.Graphics;
  private openingFallThoughtTimer?: Phaser.Time.TimerEvent;
  private openingZoomDemoActive = false;
  private openingZoomDemoTimer?: Phaser.Time.TimerEvent;
  private graphicsUpgradePresentationActive = false;
  private graphicsUpgradeInstallElapsed = 0;
  private readonly graphicsUpgradeInstallDuration = 2300;
  private readonly graphicsUpgradePickupDelay = 2300;
  private graphicsUpgradePromptDelay?: Phaser.Time.TimerEvent;

  constructor(hud: HudController, audio: AudioController) {
    super('game-scene');
    this.hud = hud;
    this.audio = audio;
  }

  preload(): void {
    this.load.image('buy-sell-facade-green-crt', '/assets/storefronts/buy-sell-facade-green-crt.png');
    this.load.image('nursery-vacant-atari-bw', '/assets/buildings/nursery-vacant-atari-bw.png');
    this.load.image('nursery-construction-green-crt', '/assets/buildings/nursery-construction-green-crt.png');
    this.load.image('nursery-open-atari-colour', '/assets/buildings/nursery-open-atari-colour.png');
  }

  create(): void {
    this.textures.get('buy-sell-facade-green-crt').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('nursery-vacant-atari-bw').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('nursery-construction-green-crt').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('nursery-open-atari-colour').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.testSaveMode = this.readDevTestMode();
    this.loadProgress();
    const buySellArtwork = drawNeighborhood(this, this.progress.rentalBondPaid, this.progress.graphicsUpgradeInstalled, this.activeProperty, this.progress.buildings['buy-sell'].graphicsEra, this.progress.buildings.nursery, this.progress.buildings['real-estate'].graphicsEra);
    this.setBuySellArtwork(buySellArtwork);
    this.starterApartmentDoor = drawStarterApartmentDoor(this);
    this.realEstateDoor = drawRealEstateDoor(this, this.progress.buildings['real-estate'].graphicsEra);
    this.streetArtworkObjects = [...this.children.list];
    this.createWantedSign();
    this.createRealEstateStatusSign();
    this.createWindowDirtOverlay();
    this.createCars();
    this.createPlayer();
    this.createPot();
    this.createRareBegonia();
    this.createHeavyPot();
    this.createBrokenPot();
    this.createPlacedItem();
    this.createSprayEffect();
    this.createDestinationMarker();
    this.createInteractionHighlight();
    this.createPlacementHighlight();
    // Migrate an older accepted job that already completed the new total
    // number of configured sprays without replaying the cleaning actions.
    if (this.progress.windowJobAccepted
      && !this.progress.windowJobComplete
      && this.progress.windowCleaningProgress >= this.getTotalWindowSprays()) {
      this.progress.windowCleaningProgress = this.getTotalWindowSprays();
      this.completeWindowJob();
    }
    this.streetObjects = [...this.children.list];
    this.createThoughtBubble();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.applyZoom(this.zoomMode);
    // Keep camera scroll fractional so continuous joystick movement does not
    // advance in visible one-pixel jumps. Pixel-art rendering remains crisp
    // through the renderer and canvas CSS settings.
    this.cameras.main.roundPixels = false;

    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.hopKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.toolKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.game.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown, { passive: false, capture: true });
    this.game.canvas.addEventListener('pointerup', this.handleCanvasPointerUp, { passive: false, capture: true });
    this.game.canvas.addEventListener('pointercancel', this.handleCanvasPointerCancel, { passive: false, capture: true });
    this.game.canvas.addEventListener('click', this.handleCanvasClick, { passive: false, capture: true });
    this.game.canvas.addEventListener('wheel', this.handleCanvasWheel, { passive: false });
    window.addEventListener('keydown', this.handleZoomKeyDown);
    this.scale.on('resize', () => {
      if (this.shopInterior) {
        this.setShopCamera();
      } else if (this.homeInterior) {
        this.setHomeCamera();
      } else {
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.applyZoom(this.zoomMode);
      }
      this.updatePhoneOrientationState();
    });

    this.hud.setZoomMode(this.zoomMode);
    this.syncHudState();
    this.updateProgressVisuals();
    this.updateApartmentRentalSign();
    this.updatePhoneOrientationState();
    if (this.testSaveMode && this.devSessionMeta && this.devSessionMeta.scene !== 'street') {
      this.restoreDevSessionScene(this.devSessionMeta);
    } else if (this.testSaveMode && this.devSessionMeta) {
      this.player.setPosition(this.devSessionMeta.spawn.x, this.devSessionMeta.spawn.y);
      this.zoomMode = this.devSessionMeta.zoom;
      this.streetZoomMode = this.devSessionMeta.zoom;
      this.applyZoom(this.zoomMode);
    }
    this.hud.setDevTestMode(this.testSaveMode, this.devSessionMeta?.checkpointId ?? null);
    this.updateInteraction();
    if (!this.testSaveMode) {
      this.hud.showStartScreen(this.hasNormalSave(), () => this.continueNormalGame(), () => this.beginNewGame());
    } else if (!this.progress.openingComplete) {
      this.startOpeningSequence();
    } else {
      this.startHousingThoughtReminder();
      this.presentGraphicsUpgradeIfNeeded();
    }
  }

  update(time: number, delta: number): void {
    this.updateCars(delta);
    this.updateGrowingCrops();
    this.updateGrowingWatering(delta);
    this.updateGardeningAction(delta);
    this.updateWindowSpray(delta);
    this.updateThoughtBubble(delta);

    if (this.graphicsUpgradePresentationActive && this.progress.graphicsUpgradeStage === 'installing') {
      this.graphicsUpgradeInstallElapsed += delta;
      const installProgress = Math.min(1, this.graphicsUpgradeInstallElapsed / this.graphicsUpgradeInstallDuration);
      this.hud.updateGraphicsInstallation(installProgress, installProgress >= 1);
      if (installProgress >= 1) this.finishGraphicsUpgradeInstallation();
    }

    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive) {
      this.updateInteraction();
      return;
    }

    if (this.modalOpen && time - this.gardeningPanelRefreshAt >= 500) {
      this.gardeningPanelRefreshAt = time;
      this.hud.refreshBasilPanel();
    }

    if (this.modalOpen && !this.mapMovementAllowed) {
      this.updateInteraction();
      return;
    }
    if (this.phoneLandscapeBlocked) {
      this.updateInteraction();
      return;
    }
    if (this.shopTransitioning) {
      this.updateInteraction();
      return;
    }
    if (this.shopTransactionBusy) {
      this.updateInteraction();
      return;
    }
    if (this.activeGardeningAction) {
      this.updateInteraction();
      return;
    }
    if (this.movementReleaseRequired) {
      const movementHeld = this.joystickPointerHeld || this.joystickSteering
        || this.cursorKeys.left.isDown || this.cursorKeys.right.isDown
        || this.cursorKeys.up.isDown || this.cursorKeys.down.isDown
        || this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown;
      if (movementHeld) {
        this.updateInteraction();
        return;
      }
      this.movementReleaseRequired = false;
    }
    if (Phaser.Input.Keyboard.JustDown(this.hopKey)) this.pressHop();
    if (Phaser.Input.Keyboard.JustDown(this.toolKey)) {
      this.toolKeyHeld = true;
      this.pressTool();
    }
    if (Phaser.Input.Keyboard.JustUp(this.toolKey)) {
      this.toolKeyHeld = false;
      this.releaseTool();
    }
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.handleKeyboardInteraction();
      if (this.modalOpen) {
        this.updateInteraction();
        return;
      }
    }
    if (!this.shopInterior && !this.homeInterior) this.updateCloseVerticalFollow();

    const direction = new Phaser.Math.Vector2(
      this.mapMovementAllowed ? 0 : Number(this.cursorKeys.left.isDown || this.keys.A.isDown) * -1 + Number(this.cursorKeys.right.isDown || this.keys.D.isDown),
      this.mapMovementAllowed ? 0 : Number(this.cursorKeys.up.isDown || this.keys.W.isDown) * -1 + Number(this.cursorKeys.down.isDown || this.keys.S.isDown),
    );
    const hasKeyboardInput = direction.lengthSq() > 0;
    const hasJoystickInput = this.joystickSteering;
    if (hasKeyboardInput || hasJoystickInput) this.cancelToolUse(false);
    if (!this.shopInterior && !this.homeInterior && (hasKeyboardInput || hasJoystickInput || this.target)) this.updatePortraitFollow();
    if (hasKeyboardInput) {
      direction.normalize();
      this.cancelTapWalk();
      this.selectedGrowingSpotIndex = null;
      this.clearItemPlacement();
    } else if (hasJoystickInput) {
      direction.copy(this.joystickInput);
      this.cancelTapWalk();
      this.selectedGrowingSpotIndex = null;
      this.clearItemPlacement();
    } else if (this.target) {
      direction.set(this.target.x - this.player.x, this.target.y - this.player.y);
      if (direction.length() < 8) {
        this.target = this.targetQueue.shift() ?? null;
        if (!this.target) {
          this.destinationMarker.setVisible(false);
          direction.set(0, 0);
          this.completePendingInteraction();
        } else {
          direction.set(this.target.x - this.player.x, this.target.y - this.player.y);
          direction.normalize();
        }
      } else {
        direction.normalize();
      }
    }

    if (direction.lengthSq() > 0) {
      // A stalled browser frame should not turn into a large teleport. This
      // is especially noticeable while a captured phone pointer is steering
      // the joystick and the camera is following Alex.
      const movementDelta = Math.min(delta, 32);
      const speed = hasKeyboardInput || hasJoystickInput ? 235 : 190;
      const minX = this.shopInterior ? 82 : this.homeInterior ? 72 : STARTING_WALKABLE_MIN_X;
      const maxX = this.shopInterior ? SHOP_WORLD_WIDTH - 82 : this.homeInterior ? this.getActiveHomeWorldWidth() - 72 : STARTING_WALKABLE_MAX_X;
      const minY = this.shopInterior ? 160 : this.homeInterior ? 90 : FRONT_PAVEMENT_MIN_Y;
      const maxY = this.shopInterior ? SHOP_WORLD_HEIGHT - 72 : this.homeInterior ? this.getActiveHomeWorldHeight() - 72 : OPPOSITE_PAVEMENT_MAX_Y;
      const previousX = this.player.x;
      const previousY = this.player.y;
      const nextX = Phaser.Math.Clamp(
        this.player.x + direction.x * speed * movementDelta / 1000,
        minX,
        maxX,
      );
      const nextY = Phaser.Math.Clamp(this.player.y + direction.y * speed * movementDelta / 1000, minY, maxY);
      this.moveOnWalkableGround(nextX, nextY);
      if (this.tryActivateMovementDoor(direction, previousX, previousY)) {
        this.updateInteraction();
        return;
      }
      const didMove = Math.abs(this.player.x - previousX) > 0.01 || Math.abs(this.player.y - previousY) > 0.01;
      if (didMove) this.updateFacing(direction);
      else if (!this.windowFacingLocked && this.playerFacing !== 'front'
        && !(this.playerFacing === 'back' && this.lastFacing.y < 0)) this.faceDirection(new Phaser.Math.Vector2(0, 1));
      this.updateRepairInterruption();
      this.drawPlayer();
      if (!this.shopInterior && !this.homeInterior) this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    }

    // Alex faces the player whenever movement has ended. The window-cleaning
    // task is the one deliberate exception: Alex must keep their back to the
    // player while working on the REAL ESTATE AGENT display.
    const keepUpwardFacingOnRelease = this.playerFacing === 'back' && this.lastFacing.y < 0;
    if (direction.lengthSq() === 0 && !this.windowFacingLocked && this.playerFacing !== 'front' && !keepUpwardFacingOnRelease) {
      this.faceDirection(new Phaser.Math.Vector2(0, 1));
    }

    this.updateHop(delta);
    this.updateInteraction();
  }

  setModalOpen(isOpen: boolean, preserveDestination = false): void {
    this.modalOpen = isOpen;
    // Map panels may preserve a pending destination for after close, but no
    // modal is allowed to keep Alex moving while it is open.
    this.mapMovementAllowed = false;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    if (isOpen) this.clearItemPlacement();
    if (isOpen && !preserveDestination) this.cancelTapWalk();
    if (!isOpen && this.pendingShopkeeperTransactions.length > 0) {
      // The HUD uses a short close transition. Do not let Birch start moving
      // behind a panel that is still visibly fading away.
      this.shopTransitioning = true;
      this.time.delayedCall(170, () => {
        this.shopTransitioning = false;
        this.beginNextPendingShopkeeperTransaction();
      });
    }
  }

  cancelActiveToolAction(): void {
    this.cancelToolUse(false);
  }

  resizeViewportToStage(): void {
    const canvas = this.game?.canvas;
    if (!canvas) return;
    const stage = canvas.parentElement;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width > 0 && height > 0 && (this.scale.width !== width || this.scale.height !== height)) {
      this.scale.resize(width, height);
    }
  }

  zoomBy(direction: 1 | -1): void {
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive || this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning) return;
    const index = this.zoomOrder.indexOf(this.zoomMode);
    const nextIndex = Phaser.Math.Clamp(index + direction, 0, this.zoomOrder.length - 1);
    this.applyZoom(this.zoomOrder[nextIndex]);
  }

  setZoom(mode: ZoomMode): void {
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive || this.phoneLandscapeBlocked || this.shopTransitioning) return;
    this.applyZoom(mode);
  }

  tryInteract(): void {
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive || this.modalOpen || this.phoneLandscapeBlocked) return;
    if (this.itemPlacementMode) {
      this.showToast(this.placementTarget ? 'Press B to put the item down.' : 'Tap a clear pavement square first.', 1500);
      return;
    }
    if (this.growingSlotReadyToPlace) {
      this.placeSelectedGrowingPot();
      return;
    }
    if (this.pendingInteraction && !this.target) this.completePendingInteraction();
    else if (this.realEstateInterior && this.isNearShopExit(new Phaser.Math.Vector2(this.player.x, this.player.y))) this.selectPendingInteraction('exit-real-estate', new Phaser.Math.Vector2(SHOP_EXIT.x, SHOP_EXIT_DOOR_BOTTOM - 22));
    else if (this.realEstateInterior && this.isWithinShopCounterRange()) this.hud.openRealEstatePanel();
    else if (this.shopInterior && this.isWithinShopCounterRange()) this.openShopPanel();
    else if (this.homeInterior && this.isNearHomeExit()) this.selectPendingInteraction('exit-home', new Phaser.Math.Vector2(HOME_EXIT.x, HOME_EXIT_DOOR_BOTTOM - 22));
    else if (this.homeInterior && this.isNearGrowingSpotPlayer()) {
      if (!this.povoWelcomeGiftClaimed) this.showToast('Claim the welcome gift first.', 1500);
      else if (!this.getSelectedGrowingPot()) {
        const nearbyPot = this.progress.growingPots.find((pot) => pot.slot !== null && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y) <= BASIL_POT_INTERACTION_RADIUS);
        if (nearbyPot) this.selectGrowingPot(nearbyPot.id);
        else if (this.progress.growingPots.some((pot) => pot.slot === null)) this.placeSelectedGrowingPot();
      }
      else if (this.basilPotSelected && this.getSelectedGrowingPot() && this.getCropStage(this.getSelectedGrowingPot()!) === 'planted') this.startGrowingWatering();
      else this.hud.openPanel('basil');
    }
    else if (!this.shopInterior && !this.homeInterior && this.isPlayerNearBuySellEntrance()) this.selectPendingInteraction(
      'enter-shop',
      new Phaser.Math.Vector2(BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y),
    );
    else if (!this.shopInterior && !this.homeInterior && this.progress.windowJobAccepted && this.isNearWindowApproach()) {
      this.windowFacePromptRequired = false;
      this.windowFacingLocked = true;
      this.faceDirection(new Phaser.Math.Vector2(0, -1));
      this.showToast('Press B to clean window.', 1700);
    }
  }

  setJoystickInput(x: number, y: number, pointerHeld: boolean): void {
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive) {
      this.joystickPointerHeld = false;
      this.joystickInput.set(0, 0);
      this.joystickSteering = false;
      return;
    }
    if (this.activeGardeningAction) {
      this.joystickPointerHeld = pointerHeld;
      this.joystickInput.set(0, 0);
      this.joystickSteering = false;
      return;
    }
    this.joystickPointerHeld = pointerHeld;
    if (!pointerHeld) {
      this.joystickInput.set(0, 0);
      this.joystickSteering = false;
      return;
    }
    const magnitude = Math.hypot(x, y);
    if (magnitude <= 0.0001) {
      this.joystickInput.set(0, 0);
      this.joystickSteering = false;
      return;
    }
    this.joystickInput.set(x, y).normalize();
    if (!this.joystickSteering) {
      this.cancelTapWalk();
      this.clearItemPlacement();
    }
    this.cancelToolUse(false);
    this.joystickSteering = true;
  }

  suppressWorldInput(): void {
    // A UI button may disappear during touch release. Ignore the synthetic
    // click that follows so dismissing a message cannot become a walk tap.
    this.lastWorldInputAt = performance.now();
  }

  canPutDownCarriedItem(): boolean {
    return this.inventoryHasPot && !this.shopInterior && !this.homeInterior && !this.shopTransitioning;
  }

  putDownCarriedItem(): void {
    if (!this.canPutDownCarriedItem()) {
      this.showToast(this.shopInterior || this.homeInterior ? 'Put items down on the street.' : 'There is nothing in the Bag to put down.', 1500);
      return;
    }
    if (!this.itemPlacementMode) {
      this.itemPlacementMode = true;
      this.placementTarget = null;
      this.placementOptionTargets = this.getItemPlacementOptions();
      this.updatePlacementHighlight();
      this.syncHudState();
      this.showToast('Choose a highlighted square or tap clear pavement, then press B.', 2200);
      return;
    }
    if (!this.placementTarget) {
      this.showToast('Tap a clear pavement square first.', 1700);
      return;
    }
    if (!this.inventoryPot || !this.inventoryInstanceId || !this.progress.inventoryItem) return;
    const placement = this.placementTarget;
    const placed: PlacedWorldItem = {
      item: this.progress.inventoryItem,
      condition: this.inventoryPot,
      instanceId: this.inventoryInstanceId,
      x: placement.x,
      y: placement.y,
    };
    this.progress.placedWorldItem = placed;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.inventoryInstanceId = null;
    this.progress.inventoryPot = null;
    this.progress.inventoryItem = null;
    this.progress.inventoryInstanceId = null;
    this.repairPickupReady = false;
    this.clearItemPlacement();
    this.updateProgressVisuals();
    this.saveProgress();
    this.syncHudState();
    this.showToast(`${this.getPlacedItemLabel(placed)} put down.`, 1600);
  }

  pressHop(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.shopTransactionBusy || this.hopActive || this.activeGardeningAction) return;
    this.clearItemPlacement();
    this.audio.unlock();
    this.audio.playJump();
    if (this.repairPresentationActive) this.cancelRepairPresentation();
    this.releaseTool();
    this.stopSprayEffect();
    this.hopActive = true;
    this.hopElapsed = 0;
    this.hopVisualOffset = 0;
    this.drawPlayer();
  }

  pressTool(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.shopTransactionBusy || this.hopActive || this.activeGardeningAction) return;
    if (this.toolHeld) return;
    this.toolHeld = true;
    this.audio.unlock();
    if (this.itemPlacementMode) {
      if (this.placementTarget) this.putDownCarriedItem();
      else this.showToast('Tap a clear pavement square first.', 1500);
      return;
    }
    if (this.brokenPotPieceSelected) {
      this.collectBrokenPotPiece();
      return;
    }
    if (this.homeInterior) {
      if (this.progress.equippedTool !== 'watering-can') {
        this.showToast('Equip the watering can, then select a growing pot.', 1500);
        return;
      }
      this.startBasilWatering();
      return;
    }
    if (!this.progress.equippedTool) {
      this.showToast('No tool equipped.', 1300);
      return;
    }
    if (this.progress.equippedTool === 'cleaner') {
      this.advanceWindowCleaningTap();
      return;
    }
    this.advanceRepairStep();
  }

  equipTool(tool: Exclude<EquippedTool, null>): void {
    if (tool === 'cleaner' && !this.progress.cleanerOwned) return;
    if (tool === 'repair' && !this.progress.repairToolOwned) return;
    if (tool === 'watering-can' && !this.progress.wateringCanOwned) return;
    this.cancelToolUse(false);
    this.progress.equippedTool = tool;
    this.assignToolToSlot(tool);
    this.saveProgress();
    this.syncHudState();
    this.drawPlayer();
    const label = tool === 'cleaner' ? 'Cleaner' : tool === 'repair' ? 'Repair tool' : 'Watering can';
    this.hud.refreshShopPanel(`${label} equipped.`);
    this.showToast(`${label} equipped.`, 1200);
  }

  unequipTool(): void {
    if (!this.progress.equippedTool) return;
    this.cancelToolUse(true);
    this.progress.equippedTool = null;
    this.saveProgress();
    this.syncHudState();
    this.drawPlayer();
    this.hud.refreshShopPanel('No tool equipped.');
    this.showToast('Tool removed from Alex.', 1200);
  }

  releaseTool(): void {
    this.toolHeld = false;
  }

  getShopPanelState(): { inventoryPot: PotCondition | null; inventoryItem: InventoryItem | null; saleComplete: boolean; basilHarvestSaleRecorded: boolean; basilDeliveryComplete: boolean; buySellGraphicsEra: 'atari-bw' | 'green-crt' | 'atari-colour'; windowJobAccepted: boolean; windowCleaningProgress: number; windowJobComplete: boolean; seedQuantities: Record<PlantSpecies, number>; harvestQuantities: Record<PlantSpecies, number>; additionalGrowingPotsAvailable: number; basicFertilizerCharges: number; povoWelcomeGiftClaimed: boolean; shopStock: ShopStockEntry[]; ownedPremiumPlants: PremiumPlantId[] } {
    return {
      inventoryPot: this.inventoryPot,
      inventoryItem: this.progress.inventoryItem,
      saleComplete: this.saleComplete,
      basilHarvestSaleRecorded: this.progress.basilHarvestSaleRecorded,
      basilDeliveryComplete: this.progress.basilDeliveryComplete,
      buySellGraphicsEra: this.progress.buildings['buy-sell'].graphicsEra,
      windowJobAccepted: this.progress.windowJobAccepted,
      windowCleaningProgress: this.progress.windowCleaningProgress,
      windowJobComplete: this.progress.windowJobComplete,
      seedQuantities: { ...this.progress.seedQuantities },
      harvestQuantities: { ...this.progress.harvestQuantities },
      additionalGrowingPotsAvailable: Math.max(0, this.getActiveGrowingSpots().length - this.progress.growingPots.length),
      basicFertilizerCharges: this.progress.basicFertilizerCharges,
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      shopStock: this.progress.shopStock.map((entry) => ({ ...entry, instanceIds: [...entry.instanceIds] })),
      ownedPremiumPlants: [...this.progress.ownedPremiumPlants],
    };
  }

  public isShopTransactionBusy(): boolean {
    return this.shopTransactionBusy;
  }

  getBasilPanelState(): { povoWelcomeGiftClaimed: boolean; slotState: GrowSlotState; stage: BasilStage; timeRemainingMs: number; wateringCanOwned: boolean; basicFertilizerCharges: number; selectedPotId: string | null; growingPots: GrowingPotState[]; seedQuantities: Record<PlantSpecies, number>; harvestQuantities: Record<PlantSpecies, number> } {
    const selected = this.getSelectedGrowingPot();
    const selectedStage = selected?.crop ? this.getCropStage(selected) : 'empty';
    return {
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      slotState: getGrowSlotState(selected, selectedStage === 'mature'),
      stage: selectedStage,
      timeRemainingMs: selected ? this.getCropTimeRemaining(selected) : this.getBasilTimeRemaining(),
      wateringCanOwned: this.progress.wateringCanOwned,
      basicFertilizerCharges: this.progress.basicFertilizerCharges,
      seedQuantities: { ...this.progress.seedQuantities },
      harvestQuantities: { ...this.progress.harvestQuantities },
      growingPots: this.progress.growingPots.map((pot) => ({ ...pot, crop: pot.crop ? { ...pot.crop } : null })),
      selectedPotId: this.selectedGrowingPotId,
    };
  }

  getPropertyPanelState(): { coins: number; rentalBondPaid: boolean; rentalKeyOwned: boolean; povoWelcomeGiftClaimed: boolean; activeProperty: PropertyId; rentalBondTotal: number; basilHarvestSaleRecorded: boolean; mintHarvestSaleRecorded: boolean; secondRentalMoveConfirmation: boolean; repairComplete: boolean; foundPotCount: number } {
    return {
      coins: this.coins,
      rentalBondPaid: this.rentalBondPaid,
      rentalKeyOwned: this.rentalKeyOwned,
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      activeProperty: this.activeProperty,
      rentalBondTotal: this.rentalBondTotal,
      basilHarvestSaleRecorded: this.progress.basilHarvestSaleRecorded,
      mintHarvestSaleRecorded: this.progress.mintHarvestSaleRecorded,
      secondRentalMoveConfirmation: this.secondRentalMoveConfirmation,
      repairComplete: this.progress.repairStep >= 10,
      foundPotCount: Number(this.progress.openingGoldenPothosCollected)
        + Number(this.progress.brokenPotOwned)
        + Number(this.progress.rareBegoniaCollected),
    };
  }

  getRentalState(): { rentalBondPaid: boolean; rentalKeyOwned: boolean; povoWelcomeGiftClaimed: boolean; activeProperty: PropertyId; rentalBondTotal: number } {
    return {
      rentalBondPaid: this.rentalBondPaid,
      rentalKeyOwned: this.rentalKeyOwned,
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      activeProperty: this.activeProperty,
      rentalBondTotal: this.rentalBondTotal,
    };
  }

  getRealEstateGraphicsEra(): 'atari-bw' | 'green-crt' | 'atari-colour' {
    return this.progress.buildings['real-estate'].graphicsEra;
  }

  private syncHudState(): void {
    this.hud.setGameState({
      coins: this.coins,
      inventoryHasPot: this.inventoryHasPot,
      inventoryPotCondition: this.inventoryPot,
      inventoryItem: this.progress.inventoryItem,
      task: this.progress.task,
      equippedTool: this.progress.equippedTool,
      repairToolOwned: this.progress.repairToolOwned,
      cleanerOwned: this.progress.cleanerOwned,
      wateringCanOwned: this.progress.wateringCanOwned,
      toolSlots: this.progress.toolSlots,
      glueCharges: this.progress.glueCharges,
      brokenPotPieceSelected: this.brokenPotPieceSelected,
      brokenPotPiecesOwned: this.progress.brokenPotPiecesOwned,
      canPlaceItem: this.itemPlacementMode && Boolean(this.placementTarget),
      povoWelcomeGiftClaimed: this.povoWelcomeGiftClaimed,
      rentalBondPaid: this.rentalBondPaid,
      rentalKeyOwned: this.rentalKeyOwned,
      activeProperty: this.activeProperty,
      rentalBondTotal: this.rentalBondTotal,
      basilHarvestSaleRecorded: this.progress.basilHarvestSaleRecorded,
      mintHarvestSaleRecorded: this.progress.mintHarvestSaleRecorded,
      hasCollectedSaleableItem: this.inventoryHasPot || this.saleComplete || Boolean(this.progress.placedWorldItem) || this.progress.repairedPotSaleComplete,
      saleComplete: this.saleComplete || this.progress.repairedPotSaleComplete,
      windowJobAccepted: this.progress.windowJobAccepted,
      paidWorkComplete: this.progress.windowJobComplete,
      repairComplete: this.progress.repairStep >= 10,
      foundPotCount: Number(this.progress.openingGoldenPothosCollected)
        + Number(this.progress.brokenPotOwned)
        + Number(this.progress.rareBegoniaCollected),
      growingEvents: { ...this.progress.growingEvents },
      basicFertilizerCharges: this.progress.basicFertilizerCharges,
      seedQuantities: this.progress.seedQuantities,
      harvestQuantities: this.progress.harvestQuantities,
      growingPots: this.progress.growingPots,
      graphicsUpgradeInstalled: this.progress.graphicsUpgradeInstalled,
      alexGraphics: this.progress.alexGraphics,
      interfaceTheme: this.progress.interfaceTheme,
      ownedPremiumPlants: this.progress.ownedPremiumPlants,
    });
  }

  public setAlexGraphics(style: AlexGraphics): void {
    if (!this.progress.graphicsUpgradeInstalled) return;
    this.progress.alexGraphics = style;
    this.saveProgress();
    this.drawPlayer();
    this.syncHudState();
    this.hud.closePanel();
    this.hud.openPanel('settings');
  }

  public setInterfaceTheme(theme: 'auto' | 'green-crt' | 'atari-bw'): void {
    if (theme === 'atari-bw' && !this.progress.graphicsUpgradeInstalled) return;
    this.progress.interfaceTheme = theme;
    try { localStorage.setItem(this.displayPreferencesKey, JSON.stringify({ interfaceTheme: theme })); } catch { /* storage can be unavailable */ }
    this.saveProgress();
    this.syncHudState();
    this.hud.closePanel();
    this.hud.openPanel('settings');
  }

  private loadProgress(): void {
    let rentalKeyWasSaved = false;
    let buildingProgressWasSaved = false;
    let hadSavedProgress = false;
    try {
      // Save schema v2 intentionally starts progression fresh. Preferences use
      // separate keys and are not removed here.
      localStorage.removeItem('indoor-jungle-progress-v1');
      localStorage.removeItem('indoor-jungle-progress-dev-test-v1');
      localStorage.removeItem('indoor-jungle-progress-v2');
      localStorage.removeItem('indoor-jungle-progress-dev-test-v2');
      const raw = localStorage.getItem(this.getProgressStorageKey());
      const saved = raw ? JSON.parse(raw) as Partial<ProgressState> : null;
      hadSavedProgress = saved !== null;
      rentalKeyWasSaved = saved?.rentalKeyOwned === true;
      buildingProgressWasSaved = Boolean(saved?.buildings && typeof saved.buildings === 'object');
      this.progress = sanitizeProgress(saved ?? DEFAULT_PROGRESS);
    } catch {
      this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    }
    try {
      const preferences = JSON.parse(localStorage.getItem(this.displayPreferencesKey) ?? '{}') as { interfaceTheme?: unknown };
      if (preferences.interfaceTheme === 'auto' || preferences.interfaceTheme === 'green-crt'
        || (preferences.interfaceTheme === 'atari-bw' && this.progress.graphicsUpgradeInstalled)) {
        this.progress.interfaceTheme = preferences.interfaceTheme;
      }
    } catch { /* malformed or unavailable preferences use the progression-safe default */ }
    this.devSessionMeta = this.testSaveMode ? this.readDevSessionMeta() : null;
    this.coins = this.progress.coins;
    this.inventoryPot = this.progress.inventoryPot;
    this.inventoryInstanceId = this.progress.inventoryInstanceId;
    this.inventoryHasPot = this.inventoryPot !== null;
    this.saleComplete = this.progress.saleComplete;
    this.rentalBondPaid = this.progress.rentalBondPaid;
    this.rentalKeyOwned = this.progress.rentalKeyOwned;
    this.activeProperty = this.progress.activeProperty;
    this.rentalBondTotal = this.progress.rentalBondTotal;
    if ((this.rentalBondPaid && !rentalKeyWasSaved) || (hadSavedProgress && !buildingProgressWasSaved)) this.saveProgress();
    this.updateSecondRentalObjective();
    this.repairPickupReady = this.inventoryPot === 'broken' && this.progress.repairStep >= 10;
    // Older saves can retain the repair objective without the newer ground
    // item flag. Restore that item from the completed window-job state rather
    // than requiring a progress reset.
    if (this.inventoryPot === 'broken') {
      this.progress.brokenPotOwned = true;
      this.progress.brokenPotAvailable = false;
    } else if ((this.progress.task === 'repair' || this.progress.windowJobComplete)
      && this.inventoryPot !== 'repaired' && !this.progress.brokenPotOwned) {
      // Repair is the authoritative objective state for the ground item. It
      // also repairs saves created before brokenPotAvailable was persisted.
      this.progress.brokenPotOwned = false;
      this.progress.brokenPotAvailable = true;
      if (this.progress.brokenPotPiecesRemaining <= 0) this.progress.brokenPotPiecesRemaining = BROKEN_POT_PIECE_COUNT;
    }
    // Recover an interrupted/older prototype save that exposed the ground
    // item with no remaining piece count.
    if (this.progress.brokenPotAvailable && !this.progress.brokenPotOwned && this.progress.brokenPotPiecesRemaining <= 0) {
      this.progress.brokenPotPiecesRemaining = BROKEN_POT_PIECE_COUNT;
    }
    if (this.inventoryPot === 'ordinary' && (this.progress.task === 'find' || this.progress.task === 'sell')) this.progress.task = 'clean';
    this.lastSavedCleaningStage = Math.floor(this.progress.windowCleaningProgress);
    this.basilStageCache = this.getBasilStage();
    // A crop can mature while the game is closed. Promote the saved objective
    // on load without granting a harvest until the player explicitly picks it.
    const maturePotOnLoad = this.progress.growingPots.find((pot) => pot.crop && this.getCropStage(pot) === 'mature');
    if (maturePotOnLoad?.crop && this.progress.task !== PLANT_TASKS[maturePotOnLoad.crop.species].mature) {
      this.progress.task = PLANT_TASKS[maturePotOnLoad.crop.species].mature;
      this.saveProgress();
    }
  }

  private hasNormalSave(): boolean {
    try {
      const raw = localStorage.getItem(this.normalProgressKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as unknown;
      return Boolean(parsed && typeof parsed === 'object');
    } catch {
      return false;
    }
  }

  private continueNormalGame(): void {
    this.hud.hideStartScreen();
    if (this.rentalBondPaid && !this.progress.propertyHandoversAcknowledged['starter-apartment']) {
      this.time.delayedCall(0, () => this.presentPovoHandover());
    }
    if (this.progress.buySellRasterUpgradePending && this.progress.windowJobAccepted) {
      this.enterShopNow();
      return;
    }
    if (this.progress.openingComplete) {
      this.startHousingThoughtReminder();
      this.presentGraphicsUpgradeIfNeeded();
      this.presentPlaytestCompletionIfNeeded();
      return;
    }
    this.startOpeningSequence();
  }

  private beginNewGame(): void {
    this.hud.hideStartScreen();
    this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    this.coins = 0;
    this.inventoryPot = null;
    this.inventoryHasPot = false;
    this.inventoryInstanceId = null;
    this.saleComplete = false;
    this.rentalBondPaid = false;
    this.rentalKeyOwned = false;
    this.activeProperty = 'none';
    this.rentalBondTotal = 0;
    this.secondRentalMoveConfirmation = false;
    this.clearItemPlacement();
    this.cancelTapWalk();
    this.hud.resetHeldInputs();
    this.player.setAlpha(1).setVisible(true);
    this.updateProgressVisuals();
    this.refreshWantedSign();
    this.updateApartmentRentalSign();
    this.saveProgress();
    this.startOpeningSequence();
  }

  private startOpeningSequence(): void {
    this.openingSequenceTween?.stop();
    this.openingFallThoughtTimer?.remove(false);
    this.openingFallThoughtTimer = undefined;
    this.openingZoomDemoTimer?.remove(false);
    this.openingZoomDemoTimer = undefined;
    this.openingZoomDemoActive = false;
    this.openingSequenceActive = true;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.cancelToolUse(true);
    this.modalOpen = false;
    this.shopTransitioning = false;
    this.progress.openingComplete = false;
    this.saveProgress();
    this.thoughtBubble?.setVisible(false);
    this.zoomMode = 'normal';
    this.streetZoomMode = 'normal';
    this.player.setPosition(OPENING_DROP_POINT.x, OPENING_DROP_POINT.y).setAlpha(1).setVisible(true);
    this.drawPlayer();
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, OPENING_TOWER.y - 160, WORLD_WIDTH, WORLD_HEIGHT - OPENING_TOWER.y + 160);
    this.applyZoom(this.zoomMode);
    // applyZoom restores ordinary street bounds; reinstate the negative-Y
    // opening bounds so Alex and the tower roof are not clipped away.
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, OPENING_TOWER.y - 160, WORLD_WIDTH, WORLD_HEIGHT - OPENING_TOWER.y + 160);
    this.hud.setZoomMode(this.zoomMode);
    this.openingKick?.destroy();
    this.openingKick = undefined;
    if (this.toastTimer) this.toastTimer.remove(false);
    this.toastTimer = undefined;
    this.cameras.main.centerOn(OPENING_DROP_POINT.x, OPENING_DROP_POINT.y - 120);
    this.hud.showOpeningIntro(
      'Alex the plant care service robot is considered obsolete. They are about to be tossed to the scrap heap.',
      () => this.beginOpeningDescent(),
    );
  }

  private beginOpeningDescent(): void {
    if (!this.openingSequenceActive || this.openingSequenceTween) return;
    // Begin from the exact tower drop point and keep Alex below the camera
    // centre so the roof and upper doorway remain visible as the fall starts.
    this.player.setPosition(OPENING_DROP_POINT.x, OPENING_DROP_POINT.y).setRotation(0);
    this.drawPlayer();
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, OPENING_TOWER.y - 160, WORLD_WIDTH, WORLD_HEIGHT - OPENING_TOWER.y + 160);
    this.cameras.main.centerOn(OPENING_DROP_POINT.x, OPENING_DROP_POINT.y - 120);
    this.openingKick = this.add.graphics().setDepth(32);
    this.openingKick.fillStyle(0x111416, 1).fillRect(-8, -7, 54, 18);
    this.openingKick.fillStyle(0xf6f7f3, 1).fillRect(34, -4, 18, 12);
    this.openingKick.lineStyle(3, 0x111416, 1).strokeRect(-8, -7, 60, 18);
    this.openingKick.setPosition(OPENING_DROP_POINT.x + 20, OPENING_DROP_POINT.y + 18);
    this.tweens.add({ targets: this.openingKick, x: OPENING_DROP_POINT.x + 82, duration: 850, ease: 'Power2', onComplete: () => this.openingKick?.setVisible(false) });
    // The opening is a world-space cinematic. Follow Alex tightly so the
    // long descent cannot sit inside the normal movement deadzone and then
    // snap from the tower to the pavement.
    this.cameras.main.startFollow(this.player, false, 1, 1, 0, 120);
    this.cameras.main.setDeadzone(0, 0);
    this.openingFallThoughtTimer = this.time.delayedCall(1800, () => {
      this.openingFallThoughtTimer = undefined;
      if (!this.openingSequenceActive) return;
      this.showThought("Ahhh! I'm falling!", false, '22px');
      this.thoughtBubbleRemainingMs = 3200;
    });
    this.openingSequenceTween = this.tweens.add({
      targets: this.player,
      y: START_POSITION.y,
      duration: 4000,
      ease: 'Cubic.easeIn',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = tween.progress;
        const straightFallFraction = 2000 / 4000;
        if (progress <= straightFallFraction) {
          this.player.setX(OPENING_DROP_POINT.x).setRotation(0);
        } else {
          const unstableProgress = (progress - straightFallFraction) / (1 - straightFallFraction);
          const drift = Phaser.Math.Linear(OPENING_DROP_POINT.x, START_POSITION.x, unstableProgress);
          const wobbleEnvelope = Math.sin(unstableProgress * Math.PI);
          const wobble = Math.sin(unstableProgress * Math.PI * 6) * 10 * wobbleEnvelope;
          this.player.setX(drift + wobble).setRotation(Math.sin(unstableProgress * Math.PI * 5) * 0.06 * wobbleEnvelope);
        }
        this.drawPlayer();
        this.updateThoughtBubblePosition();
      },
      onComplete: () => {
        if (!this.openingSequenceActive) return;
        this.player.setPosition(START_POSITION.x, START_POSITION.y).setRotation(0);
        this.thoughtBubble?.setVisible(false);
        this.thoughtBubbleRemainingMs = 0;
        this.runOpeningGroundBounce(0);
      },
    });
  }

  private runOpeningGroundBounce(index: number): void {
    if (!this.openingSequenceActive) return;
    // This method is entered at each ground contact: the initial crash and
    // the two progressively smaller bounce landings.
    this.audio.playCrash(index === 0 ? 1 : index === 1 ? 0.72 : 0.48);
    if (index >= 2) {
      this.player.setRotation(0);
      this.finishOpeningSequence();
      return;
    }
    // The first impact throws Alex back to the starter apartment window
    // height. The second rises twice the normal 50-unit player hop.
    const height = index === 0 ? 260 : 100;
    const riseDuration = index === 0 ? 450 : 240;
    const fallDuration = index === 0 ? 500 : 280;
    const rotation = index === 0 ? -0.16 : 0.1;
    this.openingSequenceTween = this.tweens.add({
      targets: this.player,
      y: START_POSITION.y - height,
      rotation,
      duration: riseDuration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.drawPlayer();
        this.updateThoughtBubblePosition();
      },
      onComplete: () => {
        if (!this.openingSequenceActive) return;
        this.openingSequenceTween = this.tweens.add({
          targets: this.player,
          y: START_POSITION.y,
          rotation: 0,
          duration: fallDuration,
          ease: 'Sine.easeIn',
          onUpdate: () => {
            this.drawPlayer();
            this.updateThoughtBubblePosition();
          },
          onComplete: () => this.runOpeningGroundBounce(index + 1),
        });
      },
    });
  }

  private finishOpeningSequence(): void {
    if (!this.openingSequenceActive) return;
    this.openingSequenceTween?.stop();
    this.openingSequenceTween = undefined;
    this.openingFallThoughtTimer?.remove(false);
    this.openingFallThoughtTimer = undefined;
    this.openingKick?.destroy();
    this.openingKick = undefined;
    this.openingSequenceActive = false;
    this.thoughtBubble?.setVisible(false);
    this.thoughtBubbleRemainingMs = 0;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    // Keep Alex and the camera exactly where the final bounce leaves them.
    this.player.setRotation(0).setAlpha(1).setVisible(true);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.zoomMode = 'normal';
    this.streetZoomMode = 'normal';
    this.hud.setZoomMode(this.zoomMode);
    this.progress.openingComplete = true;
    this.saveProgress();
    this.drawPlayer();
    this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    // Hold the landing composition briefly, then make one smooth move into
    // Close without resetting Alex or snapping the camera to a new centre.
    this.openingZoomDemoActive = true;
    this.openingZoomDemoTimer = this.time.delayedCall(1200, () => this.runOpeningZoomIn());
  }

  private runOpeningZoomIn(): void {
    if (!this.openingZoomDemoActive) return;
    const frame = this.getCameraFrame('close');
    const portrait = this.isPortraitPhoneViewport() || this.scale.height > this.scale.width;
    this.zoomMode = 'close';
    this.streetZoomMode = 'close';
    this.portraitFollowCentered = portrait;
    this.closeFollowCentered = false;
    this.cameras.main.setFollowOffset(portrait ? 0 : frame.offsetX, frame.offsetY);
    this.cameras.main.setLerp(0.2, 0.2);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
    this.cameras.main.zoomTo(frame.zoom, 800, 'Sine.easeInOut', true);
    this.hud.setZoomMode('close');
    this.openingZoomDemoTimer = this.time.delayedCall(800, () => {
      this.openingZoomDemoActive = false;
      this.openingZoomDemoTimer = undefined;
      this.updateInteraction();
      this.startHousingThoughtReminder();
      this.showThought('I need a place to live', true);
    });
  }

  private saveProgress(): void {
    this.progress.coins = this.coins;
    this.progress.inventoryPot = this.inventoryPot;
    const carriedItem = this.inventoryPot
      ? this.progress.inventoryItem ?? (this.inventoryPot === 'ordinary' ? 'small-golden-pothos' : 'special-repair-pot')
      : null;
    this.progress.inventoryItem = carriedItem;
    this.progress.inventoryInstanceId = this.inventoryPot
      ? this.inventoryInstanceId ?? (carriedItem === 'rare-spotted-begonia'
        ? RARE_SPOTTED_BEGONIA_INSTANCE_ID
        : this.inventoryPot === 'ordinary' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID)
      : null;
    this.progress.saleComplete = this.saleComplete;
    this.progress.rentalBondPaid = this.rentalBondPaid;
    this.progress.rentalKeyOwned = this.rentalKeyOwned;
    this.progress.activeProperty = this.activeProperty;
    this.progress.rentalBondTotal = this.rentalBondTotal;
    this.progress.brokenPotOwned = this.inventoryPot === 'broken' || this.progress.brokenPotOwned;
    try { localStorage.setItem(this.getProgressStorageKey(), JSON.stringify(this.progress)); } catch { /* private browsing may deny storage */ }
    if (this.testSaveMode && this.player) this.writeDevSessionMeta({
      checkpointId: this.devSessionMeta?.checkpointId ?? 'active-test-save',
      scene: this.shopInterior ? 'shop' : this.homeInterior ? 'home' : 'street',
      spawn: { x: this.player.x, y: this.player.y },
      zoom: this.zoomMode,
    });
  }

  private updateSecondRentalObjective(): void {
    if (this.activeProperty !== 'starter-apartment' || !this.povoWelcomeGiftClaimed) return;
    if (this.progress.basilHarvestSaleRecorded && this.progress.mintHarvestSaleRecorded
      && this.progress.growingEvents.basil > 0 && this.progress.growingEvents.mint > 0
      && this.progress.task === 'buy-seeds') this.progress.task = 'move-rental';
  }

  public loadDevCheckpoint(id: string): void {
    if (!DEV_BUILD) return;
    const snapshot = createDevCheckpoint(id);
    if (!snapshot) return;
    this.hud.closePanel();
    this.setDevTestMode(true);
    this.clearSceneForDevLoad();
    this.applyProgressState(snapshot.progress);
    this.devSessionMeta = {
      checkpointId: snapshot.id,
      scene: snapshot.scene,
      spawn: { ...snapshot.spawn },
      zoom: snapshot.zoom,
    };
    this.restoreDevSessionScene(this.devSessionMeta);
    this.updateProgressVisuals();
    if (this.repairPickupReady && this.progress.inventoryPot === 'broken') this.createRepairPickupPresentation();
    this.refreshWantedSign();
    this.updateApartmentRentalSign();
    this.saveProgress();
    this.syncHudState();
    this.hud.setDevTestMode(true, snapshot.id);
    this.persistDevSession();
    this.showToast(`Loaded checkpoint: ${snapshot.label}.`, 2200);
    this.updateInteraction();
    this.startHousingThoughtReminder();
    this.presentGraphicsUpgradeIfNeeded();
    if (snapshot.id === 'apartment-rented') this.time.delayedCall(0, () => this.presentPovoHandover());
    if (snapshot.queuedPresentationCount) {
      this.queueShopkeeperTransaction('fresh-basil-leaves', 1, 'sell', this.getShopItemShelfPosition('fresh-basil-leaves'), 'Basil sale presentation complete.');
      if (snapshot.queuedPresentationCount > 1) this.queueShopkeeperTransaction('mint-seeds', 1, 'buy', new Phaser.Math.Vector2(695, 557), 'Mint seed-pack presentation complete.');
    }
    if (snapshot.shopPanelOpen) this.time.delayedCall(0, () => this.hud.openPanel('shop'));
    if (snapshot.showMintThought) this.time.delayedCall(0, () => this.showThought('I should let the mint grow', true));
  }

  public resetDevTestSave(): void {
    if (!DEV_BUILD) return;
    this.loadDevCheckpoint('fresh-start');
  }

  public returnToNormalSave(): void {
    if (!DEV_BUILD) return;
    this.hud.closePanel();
    this.clearSceneForDevLoad();
    this.setDevTestMode(false);
    this.devSessionMeta = null;
    this.loadProgress();
    this.player.setPosition(START_POSITION.x, START_POSITION.y).setAlpha(1).setVisible(true);
    this.zoomMode = 'close';
    this.streetZoomMode = 'close';
    this.updateProgressVisuals();
    this.refreshWantedSign();
    this.applyZoom(this.zoomMode);
    this.syncHudState();
    this.hud.setDevTestMode(false, null);
    this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    this.showToast('Returned to the normal save.', 1800);
    this.updateInteraction();
  }

  public addDevCoins(amount: 10 | 100): void {
    if (!DEV_BUILD || !this.testSaveMode) return;
    this.coins += amount;
    this.progress.coins = this.coins;
    this.saveProgress();
    this.syncHudState();
    this.hud.showDevFeedback(`Added ${amount} coins to the test save.`);
    this.showToast(`Test save: +${amount} coins.`, 1400);
  }

  public canFinishCurrentCrop(): boolean {
    const pot = this.getSelectedGrowingPot() ?? this.progress.growingPots.find((candidate) => candidate.crop?.growthStartedAt !== null && this.getCropStage(candidate) === 'seedling');
    return DEV_BUILD && this.testSaveMode && Boolean(pot?.crop?.growthStartedAt !== null && pot?.crop && this.getCropStage(pot) === 'seedling');
  }

  public finishCurrentCrop(): void {
    if (!this.canFinishCurrentCrop()) return;
    const pot = this.getSelectedGrowingPot() ?? this.progress.growingPots.find((candidate) => candidate.crop?.growthStartedAt !== null && this.getCropStage(candidate) === 'seedling');
    if (!pot?.crop) return;
    pot.crop.growthStartedAt = Date.now() - getPlantDefinition(pot.crop.species).growthDurationMs - 1;
    pot.crop.stage = 'seedling';
    // Let the normal growth-completion path promote the objective and visual;
    // this never grants the harvest itself.
    this.updateGrowingCrops();
    this.hud.showDevFeedback('Current crop is mature and ready to harvest.');
  }

  private applyProgressState(progress: ProgressState): void {
    this.buySellUpgradeAnimating = false;
    this.graphicsUpgradePromptDelay?.remove(false);
    this.graphicsUpgradePromptDelay = undefined;
    this.progress = sanitizeProgress(progress);
    this.coins = this.progress.coins;
    this.inventoryPot = this.progress.inventoryPot;
    this.inventoryInstanceId = this.progress.inventoryInstanceId;
    this.inventoryHasPot = this.inventoryPot !== null;
    this.saleComplete = this.progress.saleComplete;
    this.rentalBondPaid = this.progress.rentalBondPaid;
    this.rentalKeyOwned = this.progress.rentalKeyOwned;
    this.activeProperty = this.progress.activeProperty;
    this.rentalBondTotal = this.progress.rentalBondTotal;
    this.secondRentalMoveConfirmation = false;
    this.repairPickupReady = this.inventoryPot === 'broken' && this.progress.repairStep >= 10;
    this.lastSavedCleaningStage = Math.floor(this.progress.windowCleaningProgress);
    this.basilStageCache = this.getBasilStage();
    this.graphicsUpgradePresentationActive = this.progress.graphicsUpgradeStage === 'prompt'
      || this.progress.graphicsUpgradeStage === 'installing'
      || this.progress.graphicsUpgradeStage === 'acknowledgement';
  }

  private clearSceneForDevLoad(): void {
    this.buySellUpgradeAnimating = false;
    this.openingSequenceActive = false;
    this.openingZoomDemoActive = false;
    this.openingZoomDemoTimer?.remove(false);
    this.openingZoomDemoTimer = undefined;
    this.openingFallThoughtTimer?.remove(false);
    this.openingFallThoughtTimer = undefined;
    this.graphicsUpgradePresentationActive = false;
    this.graphicsUpgradePromptDelay?.remove(false);
    this.graphicsUpgradePromptDelay = undefined;
    this.hud.hideGraphicsUpgrade();
    this.shopkeeperTransactionTween?.stop();
    this.shopkeeperTransactionTween = undefined;
    this.clearShopkeeperCarry();
    this.shopTransactionBusy = false;
    this.pendingShopkeeperTransactions = [];
    this.shopkeeper = undefined;
    this.shopExitDoor = undefined;
    this.homeExitDoor = undefined;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.cancelToolUse(true);
    this.tweens.killAll();
    this.shopTransitioning = false;
    this.movementReleaseRequired = false;
    this.hopActive = false;
    this.hopElapsed = 0;
    this.hopVisualOffset = 0;
    this.windowFacePromptRequired = false;
    this.windowFacingLocked = false;
    this.repairPresentationActive = false;
    this.repairAnimating = false;
    this.repairPickupReady = false;
    this.repairPotDisplay?.destroy();
    this.repairPotDisplay = undefined;
    this.repairPickupPrompt?.destroy();
    this.repairPickupPrompt = undefined;
    this.shopObjects.forEach((object) => object.destroy());
    this.homeObjects.forEach((object) => object.destroy());
    this.shopObjects = [];
    this.homeObjects = [];
    this.homeWelcomeGiftObjects = [];
    this.shopGoldenPothosDisplay = [];
    this.shopPremiumPlantDisplay = [];
    this.shopInterior = false;
    this.realEstateInterior = false;
    this.homeInterior = false;
    this.basilPot = undefined;
    this.basilWaterEffect = undefined;
    this.growingPotDisplays.clear();
    this.selectedGrowingPotId = null;
    this.setObjectsVisible(this.streetObjects, true);
    if (this.buySellDoor) setBuySellDoorOpen(this.buySellDoor, false, this.progress.buildings['buy-sell'].graphicsEra);
    if (this.starterApartmentDoor) setStarterApartmentDoorOpen(this.starterApartmentDoor, false);
    if (this.realEstateDoor) setRealEstateDoorOpen(this.realEstateDoor, false, this.progress.buildings['real-estate'].graphicsEra);
    this.player.setAlpha(1).setVisible(true);
    this.cameras.main.stopFollow().resetFX();
    this.sprayEffect.clear().setVisible(false);
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
  }

  private restoreDevSessionScene(meta: DevSessionMeta): void {
    this.zoomMode = meta.zoom;
    this.streetZoomMode = meta.zoom;
    if (meta.scene === 'shop') {
      this.shopInterior = false;
      this.enterShopNow();
    } else if (meta.scene === 'home') {
      this.homeInterior = false;
      this.enterHomeNow();
    } else {
      this.player.setPosition(meta.spawn.x, meta.spawn.y).setAlpha(1).setVisible(true);
      this.applyZoom(meta.zoom);
    }
    this.player.setPosition(meta.spawn.x, meta.spawn.y).setAlpha(1).setVisible(true);
    if (meta.scene === 'shop') this.setShopCamera();
    if (meta.scene === 'home') this.setHomeCamera();
  }

  private setDevTestMode(active: boolean): void {
    this.testSaveMode = active && DEV_BUILD;
    try {
      if (this.testSaveMode) localStorage.setItem(this.devModeKey, '1');
      else localStorage.removeItem(this.devModeKey);
    } catch { /* private browsing may deny storage */ }
    this.hud.setDevTestMode(this.testSaveMode, this.devSessionMeta?.checkpointId ?? null);
  }

  private readDevTestMode(): boolean {
    if (!DEV_BUILD) return false;
    try { return localStorage.getItem(this.devModeKey) === '1'; } catch { return false; }
  }

  private getProgressStorageKey(): string {
    return this.testSaveMode ? this.devProgressKey : this.normalProgressKey;
  }

  private readDevSessionMeta(): DevSessionMeta | null {
    try {
      const raw = localStorage.getItem(this.devSessionKey);
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<DevSessionMeta>;
      if ((value.scene !== 'street' && value.scene !== 'shop' && value.scene !== 'home')
        || !value.spawn || !Number.isFinite(value.spawn.x) || !Number.isFinite(value.spawn.y)
        || (value.zoom !== 'close' && value.zoom !== 'normal')
        || typeof value.checkpointId !== 'string') return null;
      return { checkpointId: value.checkpointId, scene: value.scene, spawn: { x: value.spawn.x, y: value.spawn.y }, zoom: value.zoom };
    } catch { return null; }
  }

  private writeDevSessionMeta(meta: DevSessionMeta): void {
    if (!DEV_BUILD) return;
    try { localStorage.setItem(this.devSessionKey, JSON.stringify(meta)); } catch { /* private browsing may deny storage */ }
  }

  private persistDevSession(): void {
    if (!DEV_BUILD || !this.testSaveMode || !this.player) return;
    this.writeDevSessionMeta({
      checkpointId: this.devSessionMeta?.checkpointId ?? 'active-test-save',
      scene: this.shopInterior ? 'shop' : this.homeInterior ? 'home' : 'street',
      spawn: { x: this.player.x, y: this.player.y },
      zoom: this.zoomMode,
    });
  }

  private grantPropertyWelcomeGift(propertyId: PropertyId): boolean {
    const definition = getPropertyWelcomeGift(propertyId);
    const ownsProperty = this.rentalBondPaid && (this.activeProperty === propertyId
      || propertyId === 'starter-apartment' && this.activeProperty === 'second-rental');
    if (!definition || !ownsProperty || this.progress.welcomeGiftsClaimed[propertyId]) return false;
    for (const content of definition.contents) {
      if (content.item === 'small-basic-plastic-pot') {
        if (!this.progress.growingPots.some((pot) => pot.id === STARTER_GROWING_POT_ID)) {
          this.progress.growingPots.push(createEmptyGrowingPot(STARTER_GROWING_POT_ID));
        }
      } else if (content.item === 'watering-can') {
        this.progress.wateringCanOwned = true;
        this.assignToolToSlot('watering-can');
      } else if (content.item === 'basil-seeds') this.progress.seedQuantities.basil += content.quantity;
      else if (content.item === 'mint-seeds') this.progress.seedQuantities.mint += content.quantity;
      else if (content.item === 'basic-fertilizer') this.progress.basicFertilizerCharges += content.quantity;
    }
    this.progress.welcomeGiftsClaimed[propertyId] = true;
    return true;
  }

  private assignToolToSlot(tool: Exclude<EquippedTool, null>): void {
    const slots = this.progress.toolSlots.length === 3 ? this.progress.toolSlots : [null, null, null];
    if (slots.includes(tool)) return;
    const emptySlot = slots.findIndex((slot) => slot === null);
    // If every slot is assigned, replace only the slot assignment. Ownership
    // flags remain untouched, so no previously owned tool is deleted.
    slots[emptySlot >= 0 ? emptySlot : 0] = tool;
    this.progress.toolSlots = slots;
  }

  private updateProgressVisuals(): void {
    if (this.pot) this.pot.setVisible(!this.progress.openingGoldenPothosCollected && this.progress.inventoryItem !== 'small-golden-pothos');
    if (this.rareBegonia) {
      this.rareBegonia.clear();
      drawRareSpottedBegonia(this.rareBegonia, 0, 0, 0.82, this.progress.graphicsUpgradeInstalled);
      this.rareBegonia.setVisible(!this.progress.rareBegoniaCollected);
    }
    // The broken pieces remain visible even while the opening pot is still in
    // the Bag. Selling is no longer the next required objective, so hiding
    // the ground item here made the repair pickup appear to be missing.
    if (this.brokenPot) {
      const shouldShowBrokenPot = this.progress.brokenPotAvailable && !this.progress.brokenPotOwned;
      if (shouldShowBrokenPot) {
        if (this.progress.brokenPotPiecesRemaining <= 0) this.progress.brokenPotPiecesRemaining = BROKEN_POT_PIECE_COUNT;
        const piecesRemaining = this.progress.brokenPotPiecesRemaining;
        this.brokenPot.clear();
        drawBrokenPotPieces(this.brokenPot, 0, 0, BROKEN_POT_PIECES_SCALE, piecesRemaining, BROKEN_POT_PIECE_OFFSETS, this.getCollectedBrokenPotPieceIndices());
      }
      this.brokenPot.setVisible(shouldShowBrokenPot);
    }
    this.updatePlacedItemVisual();
    if (this.windowDirtOverlay) {
      this.windowDirtOverlay.setVisible(this.progress.windowJobAccepted && !this.progress.windowJobComplete);
      this.refreshWindowDirtOverlay();
    }
  }

  private updateHop(delta: number): void {
    if (!this.hopActive) return;
    this.hopElapsed += delta;
    const progress = Math.min(1, this.hopElapsed / this.hopDuration);
    this.hopVisualOffset = Math.sin(progress * Math.PI) * 50;
    if (progress >= 1) {
      this.hopActive = false;
      this.hopVisualOffset = 0;
    }
    this.drawPlayer();
  }

  private updateFacing(direction: Phaser.Math.Vector2): void {
    if (direction.lengthSq() <= 0.001) return;
    this.lastFacing.copy(direction).normalize();
    if (Math.abs(this.lastFacing.x) > Math.abs(this.lastFacing.y)) {
      this.playerFacing = this.lastFacing.x < 0 ? 'left' : 'right';
    } else {
      this.playerFacing = this.lastFacing.y < 0 ? 'back' : 'front';
    }
  }

  private faceDirection(direction: Phaser.Math.Vector2): void {
    this.updateFacing(direction);
    this.drawPlayer();
  }

  private cancelToolUse(cancelRepair: boolean): void {
    this.releaseTool();
    this.stopSprayEffect();
    this.stopBasilWatering();
    if (this.activeGardeningAction) this.cancelGardeningAction('Gardening action cancelled.');
    if (cancelRepair && this.repairPresentationActive) this.cancelRepairPresentation();
  }

  private updateRepairInterruption(): void {
    if (!this.repairPresentationActive || !this.repairPotDisplay) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.repairPotDisplay.x, this.repairPotDisplay.y) > 115) {
      this.cancelRepairPresentation();
    }
  }

  private getWindowSectionProgress(sectionIndex: number): number {
    const section = HOMES_WINDOW_CLEAN_SECTIONS[sectionIndex];
    if (!section) return 0;
    return Phaser.Math.Clamp(this.progress.windowCleaningSections[section.id] ?? 0, 0, section.spraysRequired);
  }

  private getTotalWindowSprays(): number {
    return HOMES_WINDOW_CLEAN_SECTIONS.reduce((total, section) => total + section.spraysRequired, 0);
  }

  private getSelectedWindowSectionIndex(): number {
    const selected = this.selectedWindowSectionIndex;
    if (selected !== null && this.getWindowSectionProgress(selected) < HOMES_WINDOW_CLEAN_SECTIONS[selected].spraysRequired) return selected;
    const dirtySections = HOMES_WINDOW_CLEAN_SECTIONS
      .map((section, index) => ({ section, index }))
      .filter(({ section, index }) => this.getWindowSectionProgress(index) < section.spraysRequired);
    if (dirtySections.length === 0) return 0;
    return dirtySections.reduce((nearest, candidate) => {
      const nearestX = nearest.section.x + nearest.section.width / 2;
      const candidateX = candidate.section.x + candidate.section.width / 2;
      return Math.abs(this.player.x - candidateX) < Math.abs(this.player.x - nearestX) ? candidate : nearest;
    }).index;
  }

  private getWindowInteractionPoint(sectionIndex = this.getSelectedWindowSectionIndex()): Phaser.Math.Vector2 {
    const section = HOMES_WINDOW_CLEAN_SECTIONS[sectionIndex] ?? HOMES_WINDOW_CLEAN_SECTIONS[0];
    // This is a walkable point directly below the selected HOMES display
    // section, so Alex must move along the pavement between sections.
    return new Phaser.Math.Vector2(section.x + section.width / 2, FRONT_PAVEMENT_MIN_Y + 10);
  }

  private getWindowDisplayPoint(sectionIndex = this.getSelectedWindowSectionIndex()): Phaser.Math.Vector2 {
    const section = HOMES_WINDOW_CLEAN_SECTIONS[sectionIndex] ?? HOMES_WINDOW_CLEAN_SECTIONS[0];
    return new Phaser.Math.Vector2(section.x + section.width / 2, section.y + section.height / 2);
  }

  private isNearWindowApproach(): boolean {
    const point = this.getWindowInteractionPoint();
    // The contextual action belongs to the facade, not the whole approach
    // route. Alex's head is about 43 world units above the player origin, so
    // the action becomes available only when that head reaches the shop edge.
    const headTouchingFacade = this.player.y - 43 <= PAVEMENT_Y + 4;
    const withinWindowLane = Math.abs(this.player.x - point.x) <= 96;
    return headTouchingFacade && withinWindowLane;
  }

  private isWindowDisplayPoint(point: Phaser.Math.Vector2): boolean {
    return HOMES_WINDOW_CLEAN_SECTIONS.some((section) => point.x >= section.x
      && point.x <= section.x + section.width
      && point.y >= section.y
      && point.y <= section.y + section.height);
  }

  private getWindowSectionIndexAtPoint(point: Phaser.Math.Vector2): number | null {
    const index = HOMES_WINDOW_CLEAN_SECTIONS.findIndex((section) => point.x >= section.x
      && point.x <= section.x + section.width
      && point.y >= section.y
      && point.y <= section.y + section.height);
    return index >= 0 ? index : null;
  }

  private getPropertyListingAtPoint(point: Phaser.Math.Vector2): PropertyListingKey | null {
    const listing = HOMES_LISTINGS.find((candidate) => point.x >= candidate.x
      && point.x <= candidate.x + candidate.width
      && point.y >= candidate.y
      && point.y <= candidate.y + candidate.height);
    return listing?.key ?? null;
  }

  private isNearApartmentDoor(point: Phaser.Math.Vector2): boolean {
    return Math.abs(point.x - APARTMENT_ENTRANCE.x) <= APARTMENT_DOOR_WIDTH / 2 + 18
      && point.y >= APARTMENT_DOOR_TOP - 18
      && point.y <= APARTMENT_DOOR_BOTTOM + 14;
  }

  private isNearSecondRentalDoor(point: Phaser.Math.Vector2): boolean {
    return Math.abs(point.x - SECOND_RENTAL_ENTRANCE.x) <= APARTMENT_DOOR_WIDTH / 2 + 18
      && point.y >= SECOND_RENTAL_DOOR_TOP - 18
      && point.y <= SECOND_RENTAL_DOOR_BOTTOM + 14;
  }

  private getApartmentApproachPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(APARTMENT_ENTRANCE.x, APARTMENT_ENTRANCE.y);
  }

  private getActiveHomeEntrance(): { x: number; y: number } {
    return this.activeProperty === 'second-rental' ? SECOND_RENTAL_ENTRANCE : APARTMENT_ENTRANCE;
  }

  private isFacingWindow(): boolean {
    const point = this.getWindowDisplayPoint();
    const toward = new Phaser.Math.Vector2(point.x - this.player.x, point.y - this.player.y).normalize();
    return this.lastFacing.dot(toward) > 0.72;
  }

  private advanceWindowCleaningTap(): void {
    if (this.hopActive || this.sprayAnimating || !this.progress.windowJobAccepted || this.progress.windowJobComplete || this.progress.equippedTool !== 'cleaner') return;
    const selectedSection = this.getSelectedWindowSectionIndex();
    if (this.getWindowSectionProgress(selectedSection) >= HOMES_WINDOW_CLEAN_SECTIONS[selectedSection].spraysRequired) {
      this.showToast('Already clean. Move to another dirty window.', 1400);
      return;
    }
    const inRange = this.isNearWindowApproach();
    if (!inRange || !this.isFacingWindow()) {
      const now = performance.now();
      if (now - this.toolFeedbackAt > 700) {
        this.toolFeedbackAt = now;
        this.showToast(!inRange ? 'Clean the next window.' : 'Face the REAL ESTATE AGENT window, then press B once per spray.', 1300);
      }
      return;
    }

    this.audio.playToolUse();
    this.sprayTimer?.remove(false);
    this.sprayTimer = undefined;
    this.sprayAnimating = true;
    this.sprayElapsed = 0;
    this.drawWindowSpray(0);
    this.showToast('SPRAYING WINDOW…', 1100);
  }

  private stopSprayEffect(): void {
    this.sprayTimer?.remove(false);
    this.sprayTimer = undefined;
    this.sprayAnimating = false;
    this.sprayElapsed = 0;
    this.sprayEffect?.clear().setVisible(false);
  }

  private updateWindowSpray(delta: number): void {
    if (!this.sprayAnimating) return;
    const movementHeld = this.joystickSteering
      || this.cursorKeys?.left.isDown || this.cursorKeys?.right.isDown
      || this.cursorKeys?.up.isDown || this.cursorKeys?.down.isDown
      || this.keys?.W.isDown || this.keys?.A.isDown || this.keys?.S.isDown || this.keys?.D.isDown;
    const stillValid = !this.modalOpen && !this.phoneLandscapeBlocked && !this.shopTransitioning
      && !this.hopActive && !this.target && !movementHeld
      && this.progress.windowJobAccepted && !this.progress.windowJobComplete
      && this.progress.equippedTool === 'cleaner'
      && this.isNearWindowApproach() && this.isFacingWindow();
    if (!stillValid) {
      this.stopSprayEffect();
      return;
    }

    this.sprayElapsed = Math.min(this.sprayDuration, this.sprayElapsed + Math.min(delta, 32));
    const progress = this.sprayElapsed / this.sprayDuration;
    this.drawWindowSpray(progress);
    if (progress < 1) return;

    this.sprayAnimating = false;
    const sprayedSectionIndex = this.getSelectedWindowSectionIndex();
    const sprayedSection = HOMES_WINDOW_CLEAN_SECTIONS[sprayedSectionIndex];
    this.progress.windowCleaningSections[sprayedSection.id] = Math.min(
      sprayedSection.spraysRequired,
      this.getWindowSectionProgress(sprayedSectionIndex) + 1,
    );
    this.progress.windowCleaningProgress = HOMES_WINDOW_CLEAN_SECTIONS.reduce(
      (total, section) => total + (this.progress.windowCleaningSections[section.id] ?? 0), 0,
    );
    this.lastSavedCleaningStage = this.progress.windowCleaningProgress;
    this.selectedWindowSectionIndex = null;
    this.refreshWindowDirtOverlay();
    this.saveProgress();
    const sectionProgress = this.getWindowSectionProgress(sprayedSectionIndex);
    this.showToast(`SECTION ${sprayedSectionIndex + 1}/${HOMES_WINDOW_CLEAN_SECTIONS.length} · SPRAY ${sectionProgress}/${sprayedSection.spraysRequired}`, 1000);
    if (this.progress.windowCleaningProgress >= this.getTotalWindowSprays()) {
      this.completeWindowJob();
      this.stopSprayEffect();
      return;
    }
    if (sectionProgress >= sprayedSection.spraysRequired) {
      this.windowFacePromptRequired = true;
      this.windowFacingLocked = false;
      this.faceDirection(new Phaser.Math.Vector2(0, 1));
      this.showToast('Already clean. Move to the other window.', 1800);
    }
    this.sprayTimer?.remove(false);
    this.sprayTimer = this.time.delayedCall(180, () => this.stopSprayEffect());
  }

  private drawWindowSpray(progress: number): void {
    if (!this.sprayEffect) return;
    const approach = this.getWindowInteractionPoint();
    const display = this.getWindowDisplayPoint();
    const sourceX = approach.x;
    const sourceY = approach.y - 52;
    const targetX = display.x;
    const targetY = display.y + 48;
    const travel = Math.min(1, progress / 0.82);
    const lerp = (start: number, end: number, amount: number): number => start + (end - start) * amount;

    this.sprayEffect.clear();
    this.sprayEffect.lineStyle(3, 0xd8dddc, 0.76);
    this.sprayEffect.lineBetween(sourceX, sourceY, targetX - 30, targetY);
    this.sprayEffect.lineBetween(sourceX, sourceY, targetX + 30, targetY);
    this.sprayEffect.fillStyle(0xf6f7f3, 0.98).fillCircle(sourceX, sourceY, 10);
    for (let index = 0; index < 9; index += 1) {
      const offset = (index % 3 - 1) * 12;
      const dropletProgress = Math.max(0, Math.min(1, travel - (index % 5) * 0.07));
      const x = lerp(sourceX, targetX + offset, dropletProgress);
      const y = lerp(sourceY, targetY + offset * 0.35, dropletProgress);
      this.sprayEffect.fillStyle(index % 2 === 0 ? 0xf6f7f3 : 0xbfc5c3, 0.96);
      this.sprayEffect.fillCircle(x, y, 4 + (index % 2));
    }
    if (progress >= 0.82) {
      const splashProgress = Math.min(1, (progress - 0.82) / 0.18);
      const splashRadius = 8 + splashProgress * 16;
      this.sprayEffect.lineStyle(3, 0xf6f7f3, 0.95);
      this.sprayEffect.strokeCircle(targetX, targetY, splashRadius);
      this.sprayEffect.lineBetween(targetX - splashRadius - 7, targetY, targetX - splashRadius / 2, targetY);
      this.sprayEffect.lineBetween(targetX + splashRadius / 2, targetY, targetX + splashRadius + 7, targetY);
      this.sprayEffect.lineBetween(targetX, targetY - splashRadius - 7, targetX, targetY - splashRadius / 2);
    }
    this.sprayEffect.setVisible(true);
  }

  private completeWindowJob(): void {
    if (this.progress.windowJobComplete) return;
    this.progress.windowJobAccepted = false;
    this.progress.windowJobComplete = true;
    this.progress.cleanerOwned = false;
    this.progress.repairToolOwned = true;
    this.progress.glueCharges = Math.max(1, this.progress.glueCharges);
    this.progress.toolSlots = this.progress.toolSlots.map((tool) => tool === 'cleaner' ? null : tool);
    this.assignToolToSlot('repair');
    this.progress.equippedTool = 'repair';
    this.progress.brokenPotAvailable = true;
    this.progress.brokenPotPiecesRemaining = BROKEN_POT_PIECE_COUNT;
    this.progress.brokenPotPiecesOwned = 0;
    this.progress.brokenPotPiecesCollected = [];
    this.progress.task = 'repair';
    this.selectedWindowSectionIndex = null;
    this.windowFacePromptRequired = false;
    this.windowFacingLocked = false;
    this.faceDirection(new Phaser.Math.Vector2(0, 1));
    this.coins += WINDOW_JOB_REWARD;
    this.progress.coins = this.coins;
    this.sprayEffect.setVisible(false);
    this.updateProgressVisuals();
    this.refreshRealEstateStatusSign();
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightToolSelector();
    this.hud.highlightBag();
    this.toastTimer?.remove(false);
    this.toastTimer = undefined;
    this.hud.showConfirmationToast('Window cleaning complete. You found some glue and a repair tool.');
  }

  beginPortableRepair(): void {
    if (this.shopInterior || this.homeInterior) {
      this.showToast('Repair the pot outside on the street.', 1600);
      return;
    }
    if (this.inventoryPot === 'broken' && (this.repairPickupReady || this.progress.repairStep >= 10)) {
      this.repairPickupReady = true;
      this.createRepairPickupPresentation();
      this.showToast('The pot is repaired. Tap or click it to put it in the Bag.', 2200);
      return;
    }
    if (!this.progress.repairToolOwned || this.progress.glueCharges < 1 || this.inventoryPot !== 'broken') {
      this.showToast('Repair needs the repair tool, glue and a broken pot.', 1600);
      return;
    }
    const candidate = this.getRepairPlacement();
    if (!candidate) {
      this.showToast('There is no clear ground beside Alex to repair the pot.', 1800);
      return;
    }
    this.repairPotDisplay?.destroy();
    this.repairPotDisplay = this.add.graphics().setDepth(24).setPosition(candidate.x, candidate.y);
    this.drawRepairPresentation();
    this.repairPresentationActive = true;
    this.repairPickupReady = false;
    this.repairPickupPrompt?.destroy();
    this.repairPickupPrompt = undefined;
    this.progress.equippedTool = 'repair';
    this.hud.setEquippedTool('repair');
    this.showToast('Repair: tap B 10 times while Alex is beside the pot.', 2600);
  }

  private createRepairPickupPresentation(): void {
    if (!this.repairPotDisplay) {
      const candidate = this.getRepairPlacement();
      if (!candidate) return;
      this.repairPotDisplay = this.add.graphics().setDepth(24).setPosition(candidate.x, candidate.y);
    }
    this.repairPotDisplay.setVisible(true);
    this.drawRepairPresentation();
    this.repairPickupPrompt?.destroy();
    // Pickup remains click/tap-driven, without a persistent label covering the
    // repaired pot or nearby pavement.
    this.repairPickupPrompt = undefined;
  }

  private drawRepairPresentation(): void {
    if (!this.repairPotDisplay) return;
    const stage = Phaser.Math.Clamp(this.progress.repairStep, 0, 10);
    const completed = this.repairPickupReady || stage >= 10;
    const display = this.repairPotDisplay;
    display.clear();

    // Keep the repair target grounded and conspicuous without changing its
    // collision footprint or turning it into a second collectible. Once the
    // repair is complete, leave only the pot visible so it reads as an
    // ordinary tappable world item rather than an active repair station.
    display.fillStyle(0x111416, 0.55).fillEllipse(0, 25, 116, 22);
    if (!completed) display.lineStyle(3, 0xf6f7f3, 0.9).strokeEllipse(0, 22, 142, 38);
    drawBrokenPot(display, 0, 0, 2.415, stage, this.progress.graphicsUpgradeInstalled);

    if (!completed) {
      // Ten chunky segments make the required taps visible at a glance.
      for (let index = 0; index < 10; index += 1) {
        const x = -54 + index * 12;
        display.fillStyle(index < stage ? 0xf6f7f3 : 0x3b4244, 1).fillRect(x, 43, 9, 8);
        display.lineStyle(1, 0xbfc5c3, 0.9).strokeRect(x, 43, 9, 8);
      }
    }
  }

  private advanceRepairStep(): void {
    if (this.repairPickupReady) {
      this.showToast('The pot is repaired. Tap or click it to put it in the Bag.', 1600);
      return;
    }
    if (!this.repairPresentationActive || this.repairAnimating || this.hopActive || this.inventoryPot !== 'broken') return;
    if (!this.repairPotDisplay || Phaser.Math.Distance.Between(this.player.x, this.player.y, this.repairPotDisplay.x, this.repairPotDisplay.y) > 125) {
      this.showToast('Stand beside the pot before repairing it.', 1600);
      return;
    }
    this.audio.playToolUse();
    this.repairAnimating = true;
    const labels = [
      'Align pieces', 'Seat the rim', 'Stabilise the base', 'Join the left crack',
      'Join the right crack', 'Seal the seam', 'Smooth the edge', 'Check the rim',
      'Polish the repair', 'Finish repair',
    ];
    const stage = Phaser.Math.Clamp(this.progress.repairStep, 0, 9);
    this.showToast(`${labels[stage]} · ${stage + 1} / 10`, 800);
    this.time.delayedCall(360, () => {
      if (!this.repairPresentationActive) {
        this.repairAnimating = false;
        return;
      }
      this.progress.repairStep = Math.min(10, this.progress.repairStep + 1);
      this.drawRepairPresentation();
      this.repairAnimating = false;
      this.saveProgress();
      if (this.progress.repairStep >= 10) this.completeRepair();
    });
  }

  private completeRepair(): void {
    if (this.inventoryPot !== 'broken' || this.progress.glueCharges < 1) return;
    this.progress.glueCharges -= 1;
    this.repairPresentationActive = false;
    this.repairPickupReady = true;
    // Keep the repair tool owned in its slot, but remove it from Alex's hand
    // once the repair is complete so the finished pot is no longer in an
    // active-tool state.
    this.progress.equippedTool = null;
    this.releaseTool();
    this.drawRepairPresentation();
    this.createRepairPickupPresentation();
    this.drawPlayer();
    this.saveProgress();
    this.syncHudState();
    this.showToast('Pot fully repaired. Tap or click it to put it in the Bag.', 2400);
  }

  private presentGraphicsUpgradeIfNeeded(): void {
    const repairedPotPickedUp = this.progress.inventoryPot === 'repaired'
      || (this.progress.placedWorldItem?.item === 'special-repair-pot' && this.progress.placedWorldItem.condition === 'repaired')
      || this.progress.repairedPotSaleComplete;
    if (!this.progress.graphicsUpgradeUnlocked && repairedPotPickedUp) {
      this.progress.graphicsUpgradeUnlocked = true;
      this.progress.graphicsUpgradeStage = 'prompt';
      this.saveProgress();
    }
    if (this.progress.graphicsUpgradeStage === 'acknowledgement') {
      this.graphicsUpgradePresentationActive = true;
      this.hud.resetHeldInputs();
      this.cancelTapWalk();
      this.thoughtBubble?.setVisible(false);
      this.hud.showGraphicsAcknowledgement(() => this.acknowledgeGraphicsUpgrade());
      return;
    }
    if (!this.progress.graphicsUpgradeUnlocked || this.progress.graphicsUpgradeInstalled) return;
    this.graphicsUpgradePresentationActive = true;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.cancelToolUse(true);
    this.thoughtBubble?.setVisible(false);
    if (this.progress.graphicsUpgradeStage === 'installing') {
      this.graphicsUpgradeInstallElapsed = 0;
      this.hud.showGraphicsInstallation();
      return;
    }
    this.progress.graphicsUpgradeStage = 'prompt';
    this.hud.showGraphicsUpgradePrompt(() => this.beginGraphicsUpgradeInstallation());
  }

  private scheduleGraphicsUpgradeAfterRepairedPickup(): void {
    if (this.progress.graphicsUpgradeInstalled) return;
    if (!this.progress.graphicsUpgradeUnlocked) {
      this.progress.graphicsUpgradeUnlocked = true;
      this.progress.graphicsUpgradeStage = 'prompt';
      this.saveProgress();
    }
    this.graphicsUpgradePromptDelay?.remove(false);
    this.graphicsUpgradePromptDelay = this.time.delayedCall(this.graphicsUpgradePickupDelay, () => {
      this.graphicsUpgradePromptDelay = undefined;
      if (!this.progress.graphicsUpgradeInstalled && this.progress.graphicsUpgradeStage === 'prompt') {
        this.presentGraphicsUpgradeIfNeeded();
      }
    });
  }

  private beginGraphicsUpgradeInstallation(): void {
    if (!this.graphicsUpgradePresentationActive || this.progress.graphicsUpgradeStage !== 'prompt') return;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.progress.graphicsUpgradeStage = 'installing';
    this.graphicsUpgradeInstallElapsed = 0;
    this.saveProgress();
    this.hud.showGraphicsInstallation();
  }

  private finishGraphicsUpgradeInstallation(): void {
    if (!this.graphicsUpgradePresentationActive || this.progress.graphicsUpgradeStage !== 'installing') return;
    this.progress.graphicsUpgradeInstalled = true;
    this.progress.graphicsUpgradeStage = 'acknowledgement';
    this.progress.buildings['buy-sell'].graphicsEra = 'atari-colour';
    this.progress.buildings['real-estate'].graphicsEra = 'atari-colour';
    if (this.progress.buildings.nursery.operationalState !== 'operational') {
      this.progress.buildings.nursery = { operationalState: 'under-construction', graphicsEra: 'green-crt' };
    }
    this.progress.alexGraphics = 'atari-bw';
    this.saveProgress();
    this.applyInstalledGraphics();
    this.hud.updateGraphicsInstallation(1, true);
    this.hud.showGraphicsAcknowledgement(() => this.acknowledgeGraphicsUpgrade());
  }

  private acknowledgeGraphicsUpgrade(): void {
    if (this.progress.graphicsUpgradeStage !== 'acknowledgement') return;
    this.progress.graphicsUpgradeStage = 'none';
    this.graphicsUpgradePresentationActive = false;
    this.hud.hideGraphicsUpgrade();
    this.saveProgress();
    this.syncHudState();
    this.updateInteraction();
    this.startHousingThoughtReminder();
  }

  private applyInstalledGraphics(): void {
    if (!this.progress.graphicsUpgradeInstalled) return;
    // Rebuild only to refresh merchandise that belongs to the global
    // pot/plant upgrade; the facade style remains independently persisted.
    if (!this.shopInterior && !this.homeInterior) this.rebuildBuySellArtwork();
    this.drawPlayer();
    this.refreshWantedSign();
    this.refreshRealEstateStatusSign();
    this.updateProgressVisuals();
  }

  private cancelRepairPresentation(): void {
    if (!this.repairPresentationActive) return;
    this.repairPresentationActive = false;
    this.repairAnimating = false;
    this.repairPotDisplay?.setVisible(false);
    this.releaseTool();
    this.showToast('Repair paused. Completed steps were kept in the Bag.', 1500);
  }

  private getRepairPlacement(): Phaser.Math.Vector2 | null {
    const facing = this.lastFacing.clone().normalize();
    const side = new Phaser.Math.Vector2(-facing.y, facing.x);
    const candidates = [side, side.clone().scale(-1)];
    for (const offset of candidates) {
      const candidate = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(this.player.x + offset.x * 92, STARTING_WALKABLE_MIN_X + 34, STARTING_WALKABLE_MAX_X - 34),
        Phaser.Math.Clamp(this.player.y + offset.y * 92, FRONT_PAVEMENT_MIN_Y + 28, OPPOSITE_PAVEMENT_MAX_Y - 18),
      );
      if (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.x, candidate.y) >= 64
        && this.isWalkablePosition(candidate.x, candidate.y)
        && !this.isNearBuySellDoor(candidate)
      ) {
        return candidate;
      }
    }
    return null;
  }

  private getItemPlacementAtPoint(point: Phaser.Math.Vector2): Phaser.Math.Vector2 | null {
    const onFrontPavement = point.y >= FRONT_PAVEMENT_MIN_Y + 22 && point.y <= FRONT_PAVEMENT_MAX_Y - 16;
    const onOppositePavement = point.y >= OPPOSITE_PAVEMENT_MIN_Y + 16 && point.y <= OPPOSITE_PAVEMENT_MAX_Y - 16;
    if (!onFrontPavement && !onOppositePavement) return null;

    const grid = 24;
    const candidate = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(Math.round(point.x / grid) * grid, STARTING_WALKABLE_MIN_X + 58, STARTING_WALKABLE_MAX_X - 58),
      Math.round(point.y / grid) * grid,
    );
    const existingPositions = [
      POT_POSITION,
      ...(this.progress.brokenPotAvailable && !this.progress.brokenPotOwned
        ? BROKEN_POT_PIECE_IDS.map((id, index) => this.progress.brokenPotPiecesCollected.includes(id) ? null : this.getBrokenPotPiecePosition(index))
        : []),
      this.progress.placedWorldItem,
    ].filter((position): position is { x: number; y: number } => Boolean(position));
    const clear = existingPositions.every((position) => Phaser.Math.Distance.Between(candidate.x, candidate.y, position.x, position.y) > 112);
    if (
      clear
      && this.isWalkablePosition(candidate.x, candidate.y)
      && this.getTapPath(candidate.x, candidate.y)
      && !this.isNearBuySellDoor(candidate)
      && !this.isNearApartmentDoor(candidate)
    ) {
      return candidate;
    }
    return null;
  }

  private getItemPlacementOptions(): Phaser.Math.Vector2[] {
    const laneY = this.player.y >= OPPOSITE_PAVEMENT_MIN_Y
      ? (OPPOSITE_PAVEMENT_MIN_Y + OPPOSITE_PAVEMENT_MAX_Y) / 2
      : (FRONT_PAVEMENT_MIN_Y + FRONT_PAVEMENT_MAX_Y) / 2;
    const options: Phaser.Math.Vector2[] = [];
    [-240, -120, 120, 240].forEach((offset) => {
      const option = this.getItemPlacementAtPoint(new Phaser.Math.Vector2(this.player.x + offset, laneY));
      if (option && !options.some((existing) => Phaser.Math.Distance.Between(existing.x, existing.y, option.x, option.y) < 1)) {
        options.push(option);
      }
    });
    return options;
  }

  private setRepairPickupPresentationVisible(visible: boolean): void {
    this.repairPotDisplay?.setVisible(visible);
    this.repairPickupPrompt?.setVisible(visible);
  }

  private handleKeyboardInteraction(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
    if (this.growingSlotReadyToPlace) {
      this.placeSelectedGrowingPot();
      return;
    }
    if (this.realEstateInterior && this.isWithinShopCounterRange()) {
      this.hud.openRealEstatePanel();
      return;
    }
    if (this.shopInterior && this.isWithinShopCounterRange()) {
      this.openShopPanel();
      return;
    }
    if (this.homeInterior && this.isNearHomeExit()) {
      this.exitHome();
      return;
    }
    if (this.homeInterior && this.isNearGrowingSpotPlayer()) {
      if (!this.povoWelcomeGiftClaimed) this.showToast('Claim the welcome gift first.', 1500);
      else if (!this.getSelectedGrowingPot()) {
        const nearbyPot = this.progress.growingPots.find((pot) => pot.slot !== null && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y) <= BASIL_POT_INTERACTION_RADIUS);
        if (nearbyPot) this.selectGrowingPot(nearbyPot.id);
        else if (this.progress.growingPots.some((pot) => pot.slot === null)) this.placeSelectedGrowingPot();
      }
      else if (this.basilPotSelected && this.getSelectedGrowingPot() && this.getCropStage(this.getSelectedGrowingPot()!) === 'planted') this.startGrowingWatering();
      else this.hud.openPanel('basil');
      return;
    }
    if (!this.shopInterior && !this.homeInterior && this.progress.placedWorldItem
      && this.placedItemDisplay?.visible
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.progress.placedWorldItem.x, this.progress.placedWorldItem.y) <= 110) {
      this.collectPlacedItem();
      return;
    }
    if (!this.shopInterior && !this.homeInterior && this.isPlayerNearBuySellEntrance()) {
      this.selectPendingInteraction(
        'enter-shop',
        new Phaser.Math.Vector2(BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y),
      );
    }
  }

  private getShopStockEntry(stockId: string): ShopStockEntry | null {
    return this.progress.shopStock.find((entry) => entry.stockId === stockId && entry.quantity > 0) ?? null;
  }

  private getShopSalePrice(item: ShopStockItem): number {
    if (item === 'small-golden-pothos') return OPENING_POTHOS_SALE_PRICE;
    if (item === 'rare-spotted-begonia') return RARE_BEGONIA_SALE_PRICE;
    if (item === 'special-repair-pot') return REPAIRED_POT_SALE_PRICE;
    return getPlantDefinitionByProduct(item).harvestPrice;
  }

  private getShopBuyPrice(item: ShopStockItem): number {
    return getShopBuybackPrice(this.getShopSalePrice(item));
  }

  private normalizeTransactionQuantity(value: number, maximum: number): number {
    if (!Number.isFinite(value)) return 0;
    const quantity = Math.floor(value);
    return quantity >= 1 && quantity <= maximum ? quantity : 0;
  }

  private addShopStock(item: ShopStockItem, condition: ShopStockCondition, quantity: number, instanceId?: string, quality = DEFAULT_SHOP_STOCK_QUALITY): boolean {
    const amount = this.normalizeTransactionQuantity(quantity, Number.MAX_SAFE_INTEGER);
    if (!amount) return false;
    if (isPlantProductItem(item)) {
      const existing = this.progress.shopStock.find((entry) => entry.item === item && entry.quality === quality && entry.condition === condition);
      const stockId = item;
      if (existing) existing.quantity += amount;
      else this.progress.shopStock.push({ stockId: quality === DEFAULT_SHOP_STOCK_QUALITY ? stockId : `${stockId}:${quality}`, item, quality, condition, quantity: amount, instanceIds: [] });
      return true;
    }

    const id = instanceId?.trim() || (item === 'small-golden-pothos'
      ? OPENING_GOLDEN_POTHOS_INSTANCE_ID
      : item === 'rare-spotted-begonia' ? RARE_SPOTTED_BEGONIA_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID);
    if (this.progress.shopStock.some((entry) => entry.item === item && entry.instanceIds.includes(id))) return false;
    this.progress.shopStock.push({ stockId: id, item, quality, condition, quantity: 1, instanceIds: [id] });
    return true;
  }

  private removeShopStock(stockId: string, quantity: number): ShopStockEntry | null {
    const index = this.progress.shopStock.findIndex((entry) => entry.stockId === stockId);
    if (index < 0) return null;
    const entry = this.progress.shopStock[index];
    const amount = this.normalizeTransactionQuantity(quantity, entry.quantity);
    if (!amount) return null;
    const removed: ShopStockEntry = { ...entry, quantity: amount, instanceIds: [...entry.instanceIds] };
    entry.quantity -= amount;
    if (entry.quantity <= 0) this.progress.shopStock.splice(index, 1);
    return removed;
  }

  private refreshShopStockDisplay(): void {
    const shelfObjects = [...this.shopGoldenPothosDisplay, ...this.shopPremiumPlantDisplay];
    shelfObjects.forEach((object) => object.destroy());
    const displaySet = new Set(shelfObjects);
    this.shopObjects = this.shopObjects.filter((object) => !displaySet.has(object));
    this.shopGoldenPothosDisplay = [];
    this.shopPremiumPlantDisplay = [];
    this.createShopFutureDisplayItems();
    this.createShopGoldenPothosDisplay();
  }

  sellOpeningPot(): void {
    this.transactOpeningPothos(false);
  }

  deliverOpeningPothos(): void {
    this.transactOpeningPothos(true);
  }

  private transactOpeningPothos(delivery: boolean): void {
    if (!this.shopInterior || this.shopTransactionBusy || this.inventoryPot !== 'ordinary' || this.progress.inventoryItem !== 'small-golden-pothos') return;
    if (delivery && this.saleComplete) return;
    const instanceId = this.inventoryInstanceId ?? OPENING_GOLDEN_POTHOS_INSTANCE_ID;
    if (!this.addShopStock('small-golden-pothos', 'ordinary', 1, instanceId)) return;
    const reward = delivery ? OPENING_POTHOS_DELIVERY_REWARD : OPENING_POTHOS_SALE_PRICE;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.inventoryInstanceId = null;
    this.coins += reward;
    this.progress.inventoryPot = null;
    this.progress.inventoryItem = null;
    this.progress.inventoryInstanceId = null;
    this.progress.coins = this.coins;
    this.progress.shopGoldenPothosStock = true;
    if (delivery) {
      this.saleComplete = true;
      this.progress.saleComplete = true;
      this.progress.task = 'clean';
      this.refreshWantedSign();
    }
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(delivery
      ? `Small Golden Pothos delivered. +${reward} coins. Close the menu when ready for Birch to shelve it.`
      : `Small Golden Pothos sold for ${reward} coins. The Wanted delivery remains open.`);
    const source = this.getShopShelfPosition(instanceId);
    const feedback = `Small Golden Pothos ${delivery ? 'delivered' : 'sold'} for ${reward} coins.`;
    if (delivery) this.queueShopkeeperTransaction('small-golden-pothos', 1, 'sell', source, feedback);
    else this.startShopkeeperTransaction('small-golden-pothos', 1, 'sell', source, feedback);
  }

  sellRareSpottedBegonia(): void {
    if (!this.shopInterior || this.shopTransactionBusy || this.inventoryPot !== 'ordinary' || this.progress.inventoryItem !== 'rare-spotted-begonia') return;
    const instanceId = this.inventoryInstanceId ?? RARE_SPOTTED_BEGONIA_INSTANCE_ID;
    if (!this.addShopStock('rare-spotted-begonia', 'ordinary', 1, instanceId)) return;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.inventoryInstanceId = null;
    this.progress.inventoryPot = null;
    this.progress.inventoryItem = null;
    this.progress.inventoryInstanceId = null;
    this.progress.rareBegoniaCollected = true;
    this.progress.rareBegoniaSold = true;
    this.coins += RARE_BEGONIA_SALE_PRICE;
    this.progress.coins = this.coins;
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`Rare Spotted Begonia sold for ${RARE_BEGONIA_SALE_PRICE} coins.`);
    this.startShopkeeperTransaction(
      'rare-spotted-begonia',
      1,
      'sell',
      this.getShopShelfPosition(instanceId),
      `Rare Spotted Begonia sold for ${RARE_BEGONIA_SALE_PRICE} coins.`,
    );
  }

  sellRepairedPot(): void {
    if (!this.shopInterior || this.shopTransactionBusy || this.inventoryPot !== 'repaired') return;
    const instanceId = this.inventoryInstanceId ?? SPECIAL_REPAIR_POT_INSTANCE_ID;
    if (!this.addShopStock('special-repair-pot', 'repaired', 1, instanceId)) return;
    const firstSale = !this.progress.repairedPotSaleComplete;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.inventoryInstanceId = null;
    this.progress.inventoryItem = null;
    this.progress.inventoryInstanceId = null;
    this.coins += REPAIRED_POT_SALE_PRICE;
    this.progress.inventoryPot = null;
    this.progress.coins = this.coins;
    this.progress.repairedPotSaleComplete = true;
    if (firstSale) this.progress.task = 'complete';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`Repaired pot ${firstSale ? 'sold' : 'resold'} for ${REPAIRED_POT_SALE_PRICE} coins.`);
    this.startShopkeeperTransaction(
      'special-repair-pot',
      1,
      'sell',
      this.getShopShelfPosition(instanceId),
      `Repaired pot ${firstSale ? 'sold' : 'resold'} for ${REPAIRED_POT_SALE_PRICE} coins.`,
    );
  }

  buyShopStock(stockId: string, quantity = 1): void {
    if (!this.shopInterior || this.shopTransactionBusy) return;
    const entry = this.getShopStockEntry(stockId);
    if (!entry) {
      this.hud.refreshShopPanel('That stock is no longer available.');
      return;
    }
    const amount = this.normalizeTransactionQuantity(quantity, entry.quantity);
    if (!amount) return;
    const sourcePosition = this.getShopShelfPosition(stockId);
    const isPlantProduct = isPlantProductItem(entry.item);
    if (!isPlantProduct && amount !== 1) return;
    if (!isPlantProduct && (this.inventoryHasPot || this.progress.placedWorldItem)) {
      this.hud.refreshShopPanel('Carry or place only one loose display pot at a time.');
      return;
    }
    const unitPrice = this.getShopBuyPrice(entry.item);
    const total = unitPrice * amount;
    if (this.coins < total) {
      const shortfall = total - this.coins;
      this.hud.refreshShopPanel(`Need ${shortfall} more coin${shortfall === 1 ? '' : 's'} to buy ${amount} item${amount === 1 ? '' : 's'}.`);
      this.showToast(`Insufficient funds: ${shortfall} more coin${shortfall === 1 ? '' : 's'} needed.`, 1600);
      return;
    }
    const removed = this.removeShopStock(stockId, amount);
    if (!removed) return;
    this.coins -= total;
    if (isPlantProductItem(removed.item)) {
      const species = getPlantDefinitionByProduct(removed.item).species;
      this.progress.harvestQuantities[species] += amount;
    } else {
      this.inventoryHasPot = true;
      this.inventoryPot = removed.condition === 'ordinary' ? 'ordinary' : 'repaired';
      this.inventoryInstanceId = removed.instanceIds[0] ?? removed.stockId;
      this.progress.inventoryPot = this.inventoryPot;
      this.progress.inventoryItem = removed.item === 'rare-spotted-begonia'
        ? 'rare-spotted-begonia'
        : this.inventoryPot === 'ordinary' ? 'small-golden-pothos' : 'special-repair-pot';
      this.progress.inventoryInstanceId = this.inventoryInstanceId;
    }
    this.progress.coins = this.coins;
    this.saveProgress();
    this.syncHudState();
    const label = isPlantProductItem(removed.item)
      ? getPlantDefinitionByProduct(removed.item).harvestLabel
      : removed.item === 'small-golden-pothos' ? 'Small Golden Pothos'
        : removed.item === 'rare-spotted-begonia' ? 'Rare Spotted Begonia' : 'Empty repaired pot';
    this.hud.refreshShopPanel(`Bought ${amount} ${label}${amount === 1 ? '' : 's'} for ${total} coins.`);
    this.startShopkeeperTransaction(removed.item, amount, 'buy', sourcePosition, `${label} added to the Bag.`);
  }

  buyPremiumPlant(id: PremiumPlantId): void {
    if (!this.shopInterior || this.shopTransactionBusy) return;
    const definition = getPremiumPlantDefinition(id);
    if (this.progress.ownedPremiumPlants.includes(id)) {
      this.hud.refreshShopPanel(`${definition.label} is already in the Bag.`);
      return;
    }
    if (this.coins < definition.price) {
      const shortfall = definition.price - this.coins;
      this.hud.refreshShopPanel(`Need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for ${definition.label}.`);
      this.showToast(`Insufficient funds: ${shortfall} more coin${shortfall === 1 ? '' : 's'} needed.`, 1600);
      return;
    }
    const source = SHOP_SHELF_SLOTS[definition.shelfSlot];
    this.coins -= definition.price;
    this.progress.coins = this.coins;
    this.progress.ownedPremiumPlants.push(id);
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`${definition.label} purchased for ${definition.price} coins.`);
    this.startShopkeeperTransaction(id, 1, 'buy', new Phaser.Math.Vector2(source.x, source.y - 12), `${definition.label} added to the Bag.`);
  }

  acceptWindowJob(): void {
    if (!this.shopInterior || this.progress.windowJobAccepted || this.progress.windowJobComplete) return;
    this.progress.windowJobAccepted = true;
    this.progress.buySellRasterUpgradePending = this.progress.buildings['buy-sell'].graphicsEra === 'green-crt';
    this.progress.windowCleaningProgress = 0;
    this.progress.windowCleaningSections = Object.fromEntries(
      HOMES_WINDOW_CLEAN_SECTIONS.map((section) => [section.id, 0]),
    );
    this.progress.cleanerOwned = true;
    this.assignToolToSlot('cleaner');
    this.progress.equippedTool = 'cleaner';
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel('Cleaner borrowed and equipped.');
    this.showToast('Press B to clean window.', 1700);
  }

  payRentalBond(): boolean {
    if (this.rentalBondPaid) {
      if (!this.rentalKeyOwned) {
        this.rentalKeyOwned = true;
        this.progress.rentalKeyOwned = true;
        this.saveProgress();
        this.syncHudState();
        this.showToast('Received apartment key.', 1800);
      }
      this.hud.refreshPropertyPanel('Your rental is already unlocked.');
      return false;
    }
    const foundPotCount = Number(this.progress.openingGoldenPothosCollected)
      + Number(this.progress.brokenPotOwned)
      + Number(this.progress.rareBegoniaCollected);
    if (this.progress.repairStep < 10 || foundPotCount < 3) {
      const missing = [
        foundPotCount < 3 ? `find ${3 - foundPotCount} more pot${3 - foundPotCount === 1 ? '' : 's'}` : '',
        this.progress.repairStep < 10 ? 'repair one item' : '',
      ].filter(Boolean).join(' and ');
      this.hud.refreshPropertyPanel(`Complete the housing checklist first: ${missing}.`);
      this.showToast(`Housing requirements incomplete: ${missing}.`, 2100);
      return false;
    }
    const bond = RENTAL_BOND_COST;
    if (this.coins < bond) {
      const shortfall = bond - this.coins;
      this.hud.refreshPropertyPanel(`You need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for the bond.`);
      this.showToast(`You need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for the ${RENTAL_BOND_COST}-coin bond.`, 1800);
      return false;
    }
    this.coins -= bond;
    this.rentalBondPaid = true;
    this.rentalKeyOwned = true;
    this.activeProperty = 'starter-apartment';
    this.rentalBondTotal = RENTAL_BOND_COST;
    this.progress.rentalBondPaid = true;
    this.progress.rentalKeyOwned = true;
    this.progress.activeProperty = this.activeProperty;
    this.progress.rentalBondTotal = this.rentalBondTotal;
    this.progress.propertyHandoversAcknowledged['starter-apartment'] = false;
    this.grantPropertyWelcomeGift('starter-apartment');
    this.progress.task = 'place-pot';
    this.updateApartmentRentalSign();
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshPropertyPanel('Bond paid. Your POVO room key and Welcome Gift are ready.');
    this.hud.highlightBag();
    this.toastTimer?.remove(false);
    this.toastTimer = undefined;
    this.time.delayedCall(0, () => this.presentPovoHandover());
    return true;
  }

  private presentPovoHandover(): void {
    if (!this.rentalBondPaid || !this.rentalKeyOwned || !this.povoWelcomeGiftClaimed
      || this.progress.propertyHandoversAcknowledged['starter-apartment']) return;
    const message = getPropertyWelcomeGift('starter-apartment')?.message
      ?? "Here’s your room key to POVO Apartments.\nWe left a welcome gift for you.";
    this.setModalOpen(true);
    this.hud.showPropertyHandover(message, () => {
      this.progress.propertyHandoversAcknowledged['starter-apartment'] = true;
      this.saveProgress();
      this.setModalOpen(false);
      this.syncHudState();
    });
  }

  reviewSecondRentalMove(): void {
    if (this.activeProperty === 'second-rental') {
      this.hud.refreshPropertyPanel('Alex already lives in the two-room rental.');
      return;
    }
    if (!this.rentalBondPaid || !this.progress.basilHarvestSaleRecorded || !this.progress.mintHarvestSaleRecorded) {
      this.hud.refreshPropertyPanel('Sell one genuine basil harvest and one genuine mint harvest first.');
      return;
    }
    this.secondRentalMoveConfirmation = true;
    this.hud.refreshPropertyPanel();
  }

  cancelSecondRentalMove(): void {
    this.secondRentalMoveConfirmation = false;
    this.hud.refreshPropertyPanel();
  }

  confirmSecondRentalMove(): boolean {
    if (this.activeProperty === 'second-rental' || !this.secondRentalMoveConfirmation) return false;
    if (!this.rentalBondPaid || !this.progress.basilHarvestSaleRecorded || !this.progress.mintHarvestSaleRecorded) {
      this.secondRentalMoveConfirmation = false;
      this.hud.refreshPropertyPanel('The move requirements are not complete.');
      return false;
    }
    if (this.coins < SECOND_RENTAL_MOVE_COST) {
      this.hud.refreshPropertyPanel(`Need ${SECOND_RENTAL_MOVE_COST - this.coins} more coin${SECOND_RENTAL_MOVE_COST - this.coins === 1 ? '' : 's'} for the move.`);
      this.showToast(`Save ${SECOND_RENTAL_MOVE_COST - this.coins} more coin${SECOND_RENTAL_MOVE_COST - this.coins === 1 ? '' : 's'} before moving.`, 1800);
      return false;
    }

    // Commit the transfer as one state change. The starter bond is not
    // refunded and the full second-rental bond is never charged again.
    const placedPots = this.progress.growingPots
      .filter((pot) => pot.slot !== null)
      .sort((left, right) => (left.slot ?? 0) - (right.slot ?? 0));
    placedPots.forEach((pot, index) => { pot.slot = index; });
    this.progress.growingPots.filter((pot) => pot.slot === null).forEach((pot) => { pot.slot = null; });
    this.coins -= SECOND_RENTAL_MOVE_COST;
    this.activeProperty = 'second-rental';
    this.rentalBondTotal = SECOND_RENTAL_TOTAL_BOND;
    this.progress.activeProperty = this.activeProperty;
    this.progress.rentalBondTotal = this.rentalBondTotal;
    this.progress.task = 'complete';
    this.secondRentalMoveConfirmation = false;
    this.saveProgress();
    this.rebuildStreetArtwork();
    this.updateApartmentRentalSign();
    this.syncHudState();
    this.showToast(`Move complete. ${SECOND_RENTAL_TOTAL_BOND}-coin bond recorded; ${SECOND_RENTAL_MOVE_COST} coins paid.`, 2200);
    this.presentPlaytestCompletionIfNeeded();
    return true;
  }

  private presentPlaytestCompletionIfNeeded(): void {
    if (this.testSaveMode || this.activeProperty !== 'second-rental' || this.progress.playtestCompletionShown) return;
    this.progress.playtestCompletionShown = true;
    this.saveProgress();
    // The second-rental action is confirmed from a panel that closes after
    // this method returns. Present on the next tick so that close cannot
    // accidentally re-enable world input behind the completion dialog.
    this.time.delayedCall(0, () => this.hud.showPlaytestComplete());
  }

  private setBuySellArtwork(artwork: BuySellArtwork | undefined): void {
    this.buySellDoor = artwork?.door;
    this.buySellArtworkObjects = artwork ? [...artwork.objects] : [];
  }

  private rebuildBuySellArtwork(): void {
    const building = BUILDINGS.find((candidate) => candidate.key === 'buy-sell');
    if (!building) return;
    const oldObjects = new Set(this.buySellArtworkObjects);
    this.buySellArtworkObjects.forEach((object) => object.destroy());
    const artwork = drawBuySellBuilding(
      this,
      building,
      this.progress.buildings['buy-sell'].graphicsEra,
      this.progress.graphicsUpgradeInstalled,
    );
    this.setBuySellArtwork(artwork);
    this.streetArtworkObjects = this.streetArtworkObjects.filter((object) => !oldObjects.has(object));
    this.streetArtworkObjects.push(...artwork.objects);
    this.streetObjects = this.streetObjects.filter((object) => !oldObjects.has(object));
    this.streetObjects.push(...artwork.objects);
    this.setObjectsVisible(artwork.objects, !this.shopInterior && !this.homeInterior);
  }

  private rebuildStreetArtwork(): void {
    const oldArtwork = new Set(this.streetArtworkObjects);
    this.streetArtworkObjects.forEach((object) => object.destroy());
    const before = new Set(this.children.list);
    const buySellArtwork = drawNeighborhood(this, this.progress.rentalBondPaid, this.progress.graphicsUpgradeInstalled, this.activeProperty, this.progress.buildings['buy-sell'].graphicsEra, this.progress.buildings.nursery, this.progress.buildings['real-estate'].graphicsEra);
    this.setBuySellArtwork(buySellArtwork);
    this.starterApartmentDoor = drawStarterApartmentDoor(this);
    this.realEstateDoor = drawRealEstateDoor(this, this.progress.buildings['real-estate'].graphicsEra);
    const added = this.children.list.filter((object) => !before.has(object));
    this.streetArtworkObjects = added;
    this.streetObjects = this.streetObjects.filter((object) => !oldArtwork.has(object));
    this.streetObjects.push(...added);
    this.refreshWantedSign();
    this.updateProgressVisuals();
  }

  plantBasil(): void { this.plantSelectedCrop('basil'); }

  plantSelectedCrop(species: PlantSpecies): void {
    const pot = this.getSelectedGrowingPot();
    const definition = getPlantDefinition(species);
    if (!this.homeInterior || !pot || pot.slot === null) {
      this.hud.refreshBasilPanel('Select an empty placed pot on the grow table first.');
      return;
    }
    if (pot.crop) {
      this.hud.refreshBasilPanel('This pot is already occupied.');
      return;
    }
    if (definition.yieldMode === 'whole-plant' && pot.type !== 'small-basic-plastic-pot') {
      this.hud.refreshBasilPanel(`The repaired special pot cannot grow a ${definition.label}. Use a small basic plastic pot.`);
      return;
    }
    if (this.progress.seedQuantities[species] < 1) {
      this.hud.refreshBasilPanel(`No ${definition.label.toLowerCase()} seeds available. Buy some at ${BUY_SELL_NAME}.`);
      return;
    }
    this.requestGardeningAction({ potId: pot.id, type: 'plant', species });
  }

  waterSelectedCrop(): void {
    const pot = this.getSelectedGrowingPot();
    if (!pot?.crop || this.getCropStage(pot) !== 'planted' || pot.crop.growthStartedAt !== null) {
      this.hud.refreshBasilPanel('This pot does not need water.');
      return;
    }
    if (!this.progress.wateringCanOwned) {
      this.hud.refreshBasilPanel('A basic watering can is required.');
      return;
    }
    this.requestGardeningAction({ potId: pot.id, type: 'water', requiredTool: 'watering-can' }, true);
  }

  useBasicFertilizer(): void {
    const pot = this.getSelectedGrowingPot();
    const species = pot?.crop?.species;
    if (!this.homeInterior || !pot || !pot.crop || !species) {
      this.hud.refreshBasilPanel('Select a planted growing pot before using fertiliser.');
      return;
    }
    if (this.getCropStage(pot) !== 'seedling' || pot.crop.growthStartedAt === null) {
      this.hud.refreshBasilPanel('Basic fertiliser is only used while a crop is growing.');
      return;
    }
    if (this.progress.basicFertilizerCharges < 1) {
      this.hud.refreshBasilPanel(`No basic fertiliser remains. Buy a box of ${BASIC_FERTILIZER_PELLETS_PER_BOX} pellets at ${BUY_SELL_NAME}.`);
      return;
    }
    this.requestGardeningAction({ potId: pot.id, type: 'fertilize' });
  }

  harvestBasil(): void { this.harvestSelectedCrop(); }

  harvestSelectedCrop(): void {
    const pot = this.getSelectedGrowingPot();
    const species = pot?.crop?.species;
    if (!this.homeInterior || !pot || !species || this.getCropStage(pot) !== 'mature') {
      this.hud.refreshBasilPanel('The selected crop is not ready to harvest yet.');
      return;
    }
    const definition = getPlantDefinition(species);
    this.requestGardeningAction({ potId: pot.id, type: 'harvest', species });
  }

  private requestGardeningAction(action: GardeningAction, autoEquip = false): void {
    if (this.activeGardeningAction || this.pendingGardeningAction) return;
    const initialError = this.getGardeningActionError(action, false, !autoEquip);
    if (initialError) {
      this.hud.refreshBasilPanel(initialError);
      this.showToast(initialError, 1700);
      return;
    }

    this.hud.closePanel();
    if (autoEquip && action.requiredTool && this.progress.equippedTool !== action.requiredTool) {
      this.equipTool(action.requiredTool);
    }
    this.pendingGardeningAction = { ...action };
    this.selectedGrowingPotId = action.potId;
    this.basilPotSelected = true;
    const pot = this.getSelectedGrowingPot();
    if (!pot || pot.slot === null) {
      this.pendingGardeningAction = null;
      this.showToast('That growing pot is no longer available.', 1700);
      return;
    }
    const spot = this.getGrowingSpotForPot(pot);
    const approach = new Phaser.Math.Vector2(spot.x - 54, spot.y);
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
      this.selectPendingInteraction('gardening-action', approach);
      return;
    }
    const path = this.getHomeTapPath(approach.x, approach.y);
    if (path) this.selectPendingInteraction('gardening-action', approach, path);
    else {
      this.pendingGardeningAction = null;
      this.showToast('That growing pot cannot be reached.', 1700);
    }
  }

  private getGardeningActionError(action: GardeningAction, checkDistance: boolean, checkTool = true): string | null {
    if (!this.homeInterior) return 'Gardening actions are only available inside the apartment.';
    const pot = this.progress.growingPots.find((candidate) => candidate.id === action.potId);
    if (!pot || pot.slot === null) return 'That growing pot is no longer available.';
    const spot = this.getGrowingSpotForPot(pot);
    if (checkDistance && Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) > 115) return 'Move beside the selected growing pot first.';
    if (checkTool && action.requiredTool && this.progress.equippedTool !== action.requiredTool) {
      return `Equip the ${action.requiredTool === 'watering-can' ? 'watering can' : action.requiredTool} first.`;
    }
    if (action.type === 'plant') {
      if (!action.species) return 'Choose a seed type first.';
      if (pot.crop) return 'This pot is already occupied.';
      if ((this.progress.seedQuantities[action.species] ?? 0) < 1) return `No ${getPlantDefinition(action.species).label.toLowerCase()} seeds remain.`;
    } else if (action.type === 'water') {
      if (!pot.crop || this.getCropStage(pot) !== 'planted' || pot.crop.growthStartedAt !== null) return 'This pot does not need water.';
      if (!this.progress.wateringCanOwned) return 'A basic watering can is required.';
    } else if (action.type === 'fertilize') {
      if (!pot.crop || this.getCropStage(pot) !== 'seedling' || pot.crop.growthStartedAt === null) return 'Basic fertiliser is only used while a crop is growing.';
      if (this.progress.basicFertilizerCharges < 1) return 'No basic fertiliser remains.';
    } else if (action.type === 'harvest') {
      if (!pot.crop || this.getCropStage(pot) !== 'mature') return 'The selected crop is not ready to harvest.';
      const definition = getPlantDefinition(pot.crop.species);
      if (definition.yieldMode === 'whole-plant' && pot.type !== 'small-basic-plastic-pot') {
        return `The repaired special pot cannot hold a ${definition.label}.`;
      }
    }
    return null;
  }

  private startGardeningAction(): void {
    const action = this.pendingGardeningAction;
    if (!action) return;
    const error = this.getGardeningActionError(action, true);
    if (error) {
      this.pendingGardeningAction = null;
      this.showToast(error, 1700);
      return;
    }
    this.pendingGardeningAction = null;
    this.activeGardeningAction = action;
    this.basilPotSelected = true;
    this.gardeningActionElapsed = 0;
    this.gardeningActionApplied = false;
    const pot = this.progress.growingPots.find((candidate) => candidate.id === action.potId)!;
    const spot = this.getGrowingSpotForPot(pot);
    this.faceDirection(new Phaser.Math.Vector2(spot.x - this.player.x, spot.y - this.player.y));
    this.audio.playToolUse();
    this.drawGardeningAction(0);
    this.showToast(action.type === 'plant' ? 'SOWING…' : action.type === 'water' ? 'WATERING…' : action.type === 'fertilize' ? 'FERTILISING…' : 'HARVESTING…', 900);
  }

  private updateGardeningAction(delta: number): void {
    const action = this.activeGardeningAction;
    if (!action) return;
    const pot = this.progress.growingPots.find((candidate) => candidate.id === action.potId);
    const spot = pot?.slot === null || !pot ? null : this.getGrowingSpotForPot(pot);
    const stillInRange = this.homeInterior && !this.modalOpen && !this.phoneLandscapeBlocked && !this.shopTransitioning
      && !this.hopActive && (this.gardeningActionApplied || Boolean(spot)
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, spot!.x, spot!.y) <= 115);
    if (!stillInRange) {
      this.cancelGardeningAction('Gardening action cancelled.');
      return;
    }
    if (!this.gardeningActionApplied) {
      const error = this.getGardeningActionError(action, true);
      if (error) {
        this.cancelGardeningAction(error);
        return;
      }
    }
    this.gardeningActionElapsed = Math.min(this.gardeningActionDuration, this.gardeningActionElapsed + Math.min(delta, 32));
    const progress = this.gardeningActionElapsed / this.gardeningActionDuration;
    this.drawGardeningAction(progress);
    if (!this.gardeningActionApplied && progress >= 0.58) this.applyGardeningAction(action);
    if (progress >= 1) {
      this.activeGardeningAction = null;
      this.basilWaterEffect?.clear().setVisible(false);
      this.drawPlayer();
      this.updateInteraction();
    }
  }

  private applyGardeningAction(action: GardeningAction): void {
    const pot = this.progress.growingPots.find((candidate) => candidate.id === action.potId);
    if (!pot || pot.slot === null || this.getGardeningActionError(action, true)) {
      this.cancelGardeningAction('Gardening action could not be completed.');
      return;
    }
    if (action.type === 'plant' && action.species) {
      pot.crop = { species: action.species, stage: 'planted', wateredAt: null, growthStartedAt: null };
      this.progress.seedQuantities[action.species] -= 1;
      this.progress.growingEvents[action.species] += 1;
      this.progress.task = PLANT_TASKS[action.species].water;
      this.showToast(`${getPlantDefinition(action.species).label} planted.`, 1400);
    } else if (action.type === 'water' && pot.crop) {
      const now = Date.now();
      pot.crop.wateredAt = now;
      pot.crop.growthStartedAt = now;
      pot.crop.stage = 'seedling';
      this.progress.task = PLANT_TASKS[pot.crop.species].grow;
      const growthSeconds = Math.round(getPlantDefinition(pot.crop.species).growthDurationMs / 1000);
      this.showToast(`${getPlantDefinition(pot.crop.species).label} watered. It will mature in about ${growthSeconds} seconds.`, 2200);
      if (pot.crop.species === 'mint' && !this.progress.mintLowSuppliesAcknowledged) this.showThought('I should let the mint grow', true);
    } else if (action.type === 'fertilize' && pot.crop) {
      const definition = getPlantDefinition(pot.crop.species);
      this.progress.basicFertilizerCharges -= 1;
      pot.crop.growthStartedAt = Math.max(1, pot.crop.growthStartedAt! - BASIC_FERTILIZER_GROWTH_REDUCTION_MS);
      pot.crop.stage = 'seedling';
      this.updateGrowingCrops();
      const remainingSeconds = Math.ceil(this.getCropTimeRemaining(pot) / 1000);
      this.showToast(remainingSeconds <= 0
        ? `Basic fertiliser pellet used. ${definition.label} is now mature.`
        : `Basic fertiliser pellet used. Growth shortened by 30 seconds · ${remainingSeconds}s remaining.`, 2400);
    } else if (action.type === 'harvest' && pot.crop) {
      const species = pot.crop.species;
      const definition = getPlantDefinition(species);
      if (definition.yieldMode === 'whole-plant') {
        this.destroyGrowingPotDisplay(pot.id);
        this.progress.growingPots = this.progress.growingPots.filter((candidate) => candidate.id !== pot.id);
        this.selectedGrowingPotId = null;
        this.selectedGrowingSpotIndex = null;
      } else {
        pot.crop = null;
      }
      this.progress.harvestQuantities[species] += 1;
      this.progress.task = PLANT_TASKS[species].sell;
      this.basilPotSelected = false;
      this.hud.highlightBag();
      this.showToast(definition.yieldMode === 'whole-plant'
        ? `${definition.harvestLabel} lifted into the Bag with its basic pot. Sell it at ${BUY_SELL_NAME} for ${definition.harvestPrice} coins.`
        : `${definition.label} harvested. Sell it at ${BUY_SELL_NAME} for ${definition.harvestPrice} coins.`, 2600);
    }
    this.gardeningActionApplied = true;
    this.saveProgress();
    this.updateBasilVisual();
    this.syncHudState();
  }

  private cancelGardeningAction(message: string): void {
    const hadAction = Boolean(this.pendingGardeningAction || this.activeGardeningAction);
    this.pendingGardeningAction = null;
    this.activeGardeningAction = null;
    this.gardeningActionElapsed = 0;
    this.gardeningActionApplied = false;
    this.basilWaterEffect?.clear().setVisible(false);
    this.drawPlayer();
    if (hadAction && message) this.showToast(message, 1700);
  }

  private drawGardeningAction(progress: number): void {
    const action = this.activeGardeningAction;
    if (!action || !this.basilWaterEffect) return;
    const pot = this.progress.growingPots.find((candidate) => candidate.id === action.potId);
    if (!pot || pot.slot === null) return;
    const spot = this.getGrowingSpotForPot(pot);
    const sourceX = this.player.x + (this.playerFacing === 'left' ? -16 : 16);
    const sourceY = this.player.y - 28;
    const targetX = spot.x;
    const targetY = spot.y - 28;
    const travel = Math.min(1, progress / 0.78);
    const lerp = (start: number, end: number, amount: number): number => start + (end - start) * amount;
    this.basilWaterEffect.clear();
    if (action.type === 'water') {
      this.basilWaterEffect.lineStyle(3, 0xd8dddc, 0.9).lineBetween(sourceX, sourceY, targetX, targetY);
      for (let index = 0; index < 7; index += 1) {
        const offset = (index % 3 - 1) * 10;
        const amount = Math.max(0, Math.min(1, travel - (index % 4) * 0.08));
        this.basilWaterEffect.fillStyle(index % 2 === 0 ? 0xf6f7f3 : 0xbfc5c3, 0.95).fillCircle(lerp(sourceX, targetX + offset, amount), lerp(sourceY, targetY + offset * 0.25, amount), 3 + index % 2);
      }
    } else if (action.type === 'fertilize') {
      this.basilWaterEffect.fillStyle(0x111416, 1).fillRect(sourceX - 10, sourceY - 13, 20, 15);
      this.basilWaterEffect.lineStyle(2, 0xf6f7f3, 1).strokeRect(sourceX - 10, sourceY - 13, 20, 15);
      for (let index = 0; index < 6; index += 1) {
        const amount = Math.max(0, Math.min(1, travel - index * 0.07));
        this.basilWaterEffect.fillStyle(0xf6f7f3, 0.95).fillRect(lerp(sourceX, targetX + (index % 3 - 1) * 12, amount), lerp(sourceY, targetY - 8 + (index % 2) * 8, amount), 4, 4);
      }
    } else if (action.type === 'plant') {
      this.basilWaterEffect.fillStyle(0xf6f7f3, 1).fillRect(sourceX - 11, sourceY - 15, 22, 18);
      this.basilWaterEffect.lineStyle(2, 0x111416, 1).strokeRect(sourceX - 11, sourceY - 15, 22, 18);
      this.basilWaterEffect.fillStyle(0x111416, 1).fillRect(sourceX - 5, sourceY - 8, 10, 3);
      for (let index = 0; index < 4; index += 1) {
        const amount = Math.max(0, Math.min(1, travel - index * 0.1));
        this.basilWaterEffect.fillStyle(0xf6f7f3, 1).fillCircle(lerp(sourceX, targetX + (index - 1.5) * 8, amount), lerp(sourceY, targetY - 3 + (index % 2) * 8, amount), 3);
      }
    } else {
      for (let index = 0; index < 5; index += 1) {
        const amount = Math.max(0, Math.min(1, travel - index * 0.08));
        this.basilWaterEffect.lineStyle(3, 0xf6f7f3, 0.95).lineBetween(lerp(targetX, sourceX + (index - 2) * 8, amount), lerp(targetY, sourceY + (index % 2) * 5, amount), lerp(targetX + (index % 2 ? 10 : -10), sourceX + (index - 2) * 8, amount), lerp(targetY - 20, sourceY + (index % 2) * 5, amount));
      }
    }
    if (progress >= 0.78 && action.type !== 'harvest') {
      this.basilWaterEffect.lineStyle(2, 0xf6f7f3, 0.9).strokeCircle(targetX, targetY, 8 + (progress - 0.78) * 20);
    }
    this.basilWaterEffect.setVisible(true);
    this.drawPlayer();
  }

  sellBasilHarvest(quantity = 1): void { this.sellPlantHarvest('basil', quantity); }

  sellPlantHarvest(species: PlantSpecies, quantity = 1): void {
    if (!this.shopInterior || this.shopTransactionBusy) return;
    const definition = getPlantDefinition(species);
    const amount = this.normalizeTransactionQuantity(quantity, this.progress.harvestQuantities[species]);
    const stockCondition: ShopStockCondition = definition.yieldMode === 'whole-plant' ? 'living' : 'fresh';
    if (!amount || !this.addShopStock(definition.harvestItem, stockCondition, amount)) return;
    const total = definition.harvestPrice * amount;
    this.progress.harvestQuantities[species] -= amount;
    this.coins += total;
    this.progress.coins = this.coins;
    if (species === 'basil') this.progress.basilHarvestSaleRecorded = true;
    if (species === 'mint') this.progress.mintHarvestSaleRecorded = true;
    this.progress.task = 'buy-seeds';
    this.updateSecondRentalObjective();
    this.saveProgress();
    this.syncHudState();
    this.refreshWantedSign();
    this.hud.refreshShopPanel(`${definition.harvestLabel} ×${amount} sold for ${total} coins.${definition.yieldMode === 'whole-plant' ? ' Buy a replacement basic pot and more seeds to grow again.' : ' Buy more seeds to grow again.'}`);
    this.startShopkeeperTransaction(definition.harvestItem, amount, 'sell', this.getShopItemShelfPosition(definition.harvestItem), `${definition.harvestLabel} ×${amount} sold for ${total} coins.`);
  }

  deliverBasilHarvest(): void {
    if (!this.shopInterior || this.shopTransactionBusy || this.progress.basilDeliveryComplete) return;
    if (this.progress.buildings['buy-sell'].graphicsEra !== 'atari-colour' || this.progress.harvestQuantities.basil < 1) return;
    const definition = getPlantDefinition('basil');
    if (!this.addShopStock(definition.harvestItem, 'fresh', 1)) return;
    this.progress.harvestQuantities.basil -= 1;
    this.progress.basilHarvestSaleRecorded = true;
    this.progress.basilDeliveryComplete = true;
    this.coins += BASIL_DELIVERY_REWARD;
    this.progress.coins = this.coins;
    this.progress.task = this.progress.additionalGrowingPotsPurchased < 2 ? 'place-pot' : 'buy-seeds';
    this.updateSecondRentalObjective();
    this.saveProgress();
    this.syncHudState();
    this.refreshWantedSign();
    this.hud.refreshShopPanel(`Fresh basil leaves delivered. +${BASIL_DELIVERY_REWARD} coins. Close the menu when ready for Birch to shelve it.`);
    this.queueShopkeeperTransaction(
      definition.harvestItem,
      1,
      'sell',
      this.getShopItemShelfPosition(definition.harvestItem),
      `Fresh basil leaves delivered for ${BASIL_DELIVERY_REWARD} coins.`,
    );
  }

  buyBasilSeed(quantity = 1): void { this.buyPlantSeed('basil', quantity); }

  buyPlantSeed(species: PlantSpecies, quantity = 1): void {
    if (!this.shopInterior || this.shopTransactionBusy || !this.povoWelcomeGiftClaimed) return;
    const definition = getPlantDefinition(species);
    const packCount = this.normalizeTransactionQuantity(quantity, Number.MAX_SAFE_INTEGER);
    if (!packCount) return;
    const amount = definition.seedPackQuantity * packCount;
    const total = definition.seedPrice * amount;
    if (this.coins < total) {
      const shortfall = total - this.coins;
      this.hud.refreshShopPanel(`You need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for ${packCount} ${definition.label} seed pack${packCount === 1 ? '' : 's'}.`);
      this.showToast(`You need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for ${definition.label.toLowerCase()} seeds.`, 1600);
      return;
    }
    this.coins -= total;
    this.progress.coins = this.coins;
    this.progress.seedQuantities[species] += amount;
    this.progress.task = PLANT_TASKS[species].plant;
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`${definition.label} seed pack added: ${amount} seeds.`);
    this.startShopkeeperTransaction(definition.seedItem, packCount, 'buy', new Phaser.Math.Vector2(695, 557), `Bought ${packCount} ${definition.label.toLowerCase()} seed pack${packCount === 1 ? '' : 's'} (${amount} seeds) for ${total} coins.`);
  }

  buyBasicFertilizerBox(): void {
    if (!this.shopInterior || this.shopTransactionBusy || !this.povoWelcomeGiftClaimed) {
      if (this.shopInterior) this.hud.refreshShopPanel('Claim the welcome gift before buying growing supplies.');
      return;
    }
    if (this.coins < BASIC_FERTILIZER_BOX_PRICE) {
      const shortfall = BASIC_FERTILIZER_BOX_PRICE - this.coins;
      this.hud.refreshShopPanel(`Need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for a Basic Fertiliser box.`);
      return;
    }
    this.coins -= BASIC_FERTILIZER_BOX_PRICE;
    this.progress.coins = this.coins;
    this.progress.basicFertilizerCharges += BASIC_FERTILIZER_PELLETS_PER_BOX;
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`Basic Fertiliser box added to the Bag: ${BASIC_FERTILIZER_PELLETS_PER_BOX} pellets for ${BASIC_FERTILIZER_BOX_PRICE} coins.`);
    this.startShopkeeperTransaction(
      'basic-fertilizer-box',
      1,
      'buy',
      new Phaser.Math.Vector2(695, 557),
      `${BASIC_FERTILIZER_PELLETS_PER_BOX} Basic Fertiliser pellets added to the Bag.`,
    );
  }

  buyAdditionalGrowingPot(quantity = 1): void {
    if (!this.shopInterior || this.shopTransactionBusy || !this.povoWelcomeGiftClaimed) {
      if (this.shopInterior) this.hud.refreshShopPanel('Claim the welcome gift before buying additional growing pots.');
      return;
    }
    const amount = this.normalizeTransactionQuantity(quantity, Math.max(0, this.getActiveGrowingSpots().length - this.progress.growingPots.length));
    if (!amount) return;
    const total = SMALL_BASIC_PLASTIC_POT_PRICE * amount;
    if (this.coins < total) { this.hud.refreshShopPanel(`Need ${total - this.coins} more coin${total - this.coins === 1 ? '' : 's'} for another growing pot.`); return; }
    for (let index = 0; index < amount; index += 1) {
      this.progress.growingPotPurchaseSerial += 1;
      const id = `purchased-growing-pot-${this.progress.growingPotPurchaseSerial}`;
      this.progress.growingPots.push(createEmptyGrowingPot(id));
      this.progress.additionalGrowingPotsPurchased = Math.min(MAX_ADDITIONAL_GROWING_POTS, this.progress.additionalGrowingPotsPurchased + 1);
    }
    this.coins -= total;
    this.progress.task = 'place-pot';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`Bought ${amount} Small basic plastic pot${amount === 1 ? '' : 's'} for ${total} coins. Place them on the grow table.`);
    this.startShopkeeperTransaction('small-basic-plastic-pot', amount, 'buy', new Phaser.Math.Vector2(205, 557), `Bought ${amount} Small basic plastic pot${amount === 1 ? '' : 's'} for ${total} coins.`);
  }

  private getCropStage(pot: GrowingPotState): BasilStage {
    if (!pot.crop) return 'empty';
    if (pot.crop.stage === 'planted' || pot.crop.growthStartedAt === null) return 'planted';
    const elapsed = Math.max(0, Date.now() - pot.crop.growthStartedAt);
    return elapsed >= getPlantDefinition(pot.crop.species).growthDurationMs ? 'mature' : 'seedling';
  }

  private getCropTimeRemaining(pot: GrowingPotState | null): number {
    if (!pot?.crop?.growthStartedAt) return 0;
    return Math.max(0, getPlantDefinition(pot.crop.species).growthDurationMs - Math.max(0, Date.now() - pot.crop.growthStartedAt));
  }

  private getBasilStage(): BasilStage {
    const starter = this.progress.growingPots.find((pot) => pot.id === STARTER_GROWING_POT_ID);
    return starter ? this.getCropStage(starter) : 'empty';
  }

  private getBasilTimeRemaining(): number {
    return this.getCropTimeRemaining(this.progress.growingPots.find((pot) => pot.id === STARTER_GROWING_POT_ID) ?? null);
  }

  private updateGrowingCrops(): void {
    let changed = false;
    for (const pot of this.progress.growingPots) {
      if (!pot.crop || pot.crop.growthStartedAt === null) continue;
      const stage = this.getCropStage(pot);
      if (stage !== 'mature' || pot.crop.stage === 'mature') continue;
      pot.crop.stage = 'mature';
      const definition = getPlantDefinition(pot.crop.species);
      const task = PLANT_TASKS[pot.crop.species].mature;
      if (this.progress.task === PLANT_TASKS[pot.crop.species].grow) this.progress.task = task;
      changed = true;
      if (this.selectedGrowingPotId === pot.id) this.showToast(definition.yieldMode === 'whole-plant'
        ? `${definition.label} is mature and ready to lift into the Bag.`
        : `Mature ${definition.label} is ready to harvest.`, 2200);
    }
    if (changed) { this.saveProgress(); this.syncHudState(); this.updateBasilVisual(); }
  }

  private startBasilWatering(): void { this.startGrowingWatering(); }

  private startGrowingWatering(): void {
    const pot = this.getSelectedGrowingPot();
    if (!this.homeInterior || !pot?.crop || this.getCropStage(pot) !== 'planted') { this.showToast('Select a planted growing pot first.', 1500); return; }
    if (!this.progress.wateringCanOwned || this.progress.equippedTool !== 'watering-can') { this.showToast('Equip the watering can before pressing B.', 1500); return; }
    if (pot.crop.growthStartedAt !== null || this.basilWaterAnimating || this.pendingGardeningAction || this.activeGardeningAction) { this.showToast('This crop has already been watered.', 1400); return; }
    const growingSpot = this.getGrowingSpotForPot(pot);
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, growingSpot.x, growingSpot.y) > 115) { this.showToast('Move beside the highlighted growing pot before watering.', 1500); return; }
    this.requestGardeningAction({ potId: pot.id, type: 'water', requiredTool: 'watering-can' });
  }

  private stopBasilWatering(): void { this.basilWaterAnimating = false; this.basilWaterElapsed = 0; this.basilWaterEffect?.clear().setVisible(false); }

  private updateBasilWatering(delta: number): void { this.updateGrowingWatering(delta); }

  private updateGrowingWatering(delta: number): void {
    if (!this.basilWaterAnimating) return;
    const targetId = this.selectedGrowingPotId;
    const pot = this.progress.growingPots.find((candidate) => candidate.id === targetId);
    const movementHeld = this.joystickSteering || this.cursorKeys?.left.isDown || this.cursorKeys?.right.isDown || this.cursorKeys?.up.isDown || this.cursorKeys?.down.isDown || this.keys?.W.isDown || this.keys?.A.isDown || this.keys?.S.isDown || this.keys?.D.isDown;
    const stillValid = this.homeInterior && !this.modalOpen && !this.phoneLandscapeBlocked && !this.shopTransitioning && !this.hopActive && !this.target && !movementHeld && Boolean(pot?.crop) && pot?.crop?.growthStartedAt === null && this.progress.equippedTool === 'watering-can' && targetId === this.selectedGrowingPotId && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot!).x, this.getGrowingSpotForPot(pot!).y) <= 115;
    if (!stillValid) { this.stopBasilWatering(); return; }
    this.basilWaterElapsed = Math.min(this.basilWaterDuration, this.basilWaterElapsed + Math.min(delta, 32));
    const progress = this.basilWaterElapsed / this.basilWaterDuration;
    this.drawBasilWatering(progress);
    if (progress < 1) return;
    this.stopBasilWatering();
    const species = pot!.crop!.species;
    pot!.crop!.wateredAt = Date.now();
    pot!.crop!.growthStartedAt = Date.now();
    pot!.crop!.stage = 'seedling';
    this.progress.task = PLANT_TASKS[species].grow;
    this.saveProgress(); this.updateBasilVisual(); this.syncHudState();
    const growthSeconds = Math.round(getPlantDefinition(species).growthDurationMs / 1000);
    this.showToast(`${getPlantDefinition(species).label} watered. It will mature in about ${growthSeconds} seconds.`, 2200);
  }

  private drawBasilWatering(progress: number): void {
    if (!this.basilWaterEffect) return;
    const targetPot = this.getSelectedGrowingPot();
    const growingSpot = targetPot ? this.getGrowingSpotForPot(targetPot) : this.getActiveGrowingSpot();
    const sourceX = this.player.x; const sourceY = this.player.y - 40; const targetX = growingSpot.x; const targetY = growingSpot.y - 34; const travel = Math.min(1, progress / 0.8);
    this.basilWaterEffect.clear(); this.basilWaterEffect.lineStyle(3, 0xd8dddc, 0.9).lineBetween(sourceX, sourceY, targetX - 14, targetY); this.basilWaterEffect.fillStyle(0xf6f7f3, 0.95);
    for (let index = 0; index < 6; index += 1) { const offset = (index % 3 - 1) * 11; const x = sourceX + (targetX + offset - sourceX) * Math.max(0, travel - (index % 3) * 0.08); const y = sourceY + (targetY + offset * 0.2 - sourceY) * Math.max(0, travel - (index % 3) * 0.08); this.basilWaterEffect.fillCircle(x, y, 3 + index % 2); }
    if (progress >= 0.8) this.basilWaterEffect.lineStyle(2, 0xf6f7f3, 0.9).strokeCircle(targetX, targetY, 8 + (progress - 0.8) * 20);
    this.basilWaterEffect.setVisible(true);
  }

  private updateBasilVisual(): void {
    const growingSpots = this.getActiveGrowingSpots();
    for (const pot of this.progress.growingPots) {
      let display = this.growingPotDisplays.get(pot.id);
      if (!display && this.homeInterior) {
        display = this.add.graphics().setDepth(5);
        this.growingPotDisplays.set(pot.id, display);
        this.homeObjects.push(display);
        if (pot.id === STARTER_GROWING_POT_ID) this.basilPot = display;
      }
      if (!display || pot.slot === null) { display?.setVisible(false); continue; }
      const spot = growingSpots[pot.slot];
      if (!spot) { display.setVisible(false); continue; }
      display.setPosition(spot.x, spot.y).clear().setVisible(this.povoWelcomeGiftClaimed);
      const stage = this.getCropStage(pot);
      drawGrowingCrop(display, 0, 0, pot.crop?.species ?? 'basil', stage as BasilVisualStage, 0.9, this.progress.graphicsUpgradeInstalled);
      display.setAlpha(this.selectedGrowingPotId === pot.id ? 1 : 0.94);
    }
  }

  private destroyGrowingPotDisplay(potId: string): void {
    const display = this.growingPotDisplays.get(potId);
    if (!display) return;
    if (this.basilPot === display) this.basilPot = undefined;
    this.homeObjects = this.homeObjects.filter((object) => object !== display);
    display.destroy();
    this.growingPotDisplays.delete(potId);
  }

  private isNearGrowingSpot(point: Phaser.Math.Vector2): boolean { return this.getGrowingSpotIndexAtPoint(point) !== null; }

  private isNearGrowingSpotPlayer(): boolean {
    const nearbyPot = this.progress.growingPots.find((pot) => pot.slot !== null
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y) <= BASIL_POT_INTERACTION_RADIUS);
    if (nearbyPot) return true;
    const growingSpot = this.getActiveGrowingSpot();
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, growingSpot.x, growingSpot.y) <= BASIL_POT_INTERACTION_RADIUS;
  }

  private getBasilApproachPoint(): Phaser.Math.Vector2 {
    const spot = this.getActiveGrowingSpot();
    return new Phaser.Math.Vector2(spot.x - 54, spot.y);
  }

  private getActiveGrowingSpots(): readonly { x: number; y: number }[] {
    return this.activeProperty === 'second-rental' ? SECOND_HOME_GROWING_SPOTS : HOME_GROWING_SPOTS;
  }

  private getGrowingSpotForPot(pot: GrowingPotState): { x: number; y: number } {
    const spots = this.getActiveGrowingSpots();
    return spots[Phaser.Math.Clamp(pot.slot ?? this.selectedGrowingSpotIndex ?? 1, 0, spots.length - 1)] ?? spots[1] ?? spots[0];
  }

  private getActiveGrowingSpot(): { x: number; y: number } {
    const selected = this.getSelectedGrowingPot();
    const spots = this.getActiveGrowingSpots();
    return selected ? this.getGrowingSpotForPot(selected) : spots[Phaser.Math.Clamp(this.selectedGrowingSpotIndex ?? 1, 0, spots.length - 1)] ?? spots[1] ?? spots[0];
  }

  private getSelectedGrowingPot(): GrowingPotState | null { return this.selectedGrowingPotId ? this.progress.growingPots.find((pot) => pot.id === this.selectedGrowingPotId) ?? null : null; }

  private getPotAtGrowingSpotIndex(index: number): GrowingPotState | null { return this.progress.growingPots.find((pot) => pot.slot === index) ?? null; }

  private getGrowingSpotIndexAtPoint(point: Phaser.Math.Vector2): number | null {
    const index = this.getActiveGrowingSpots().findIndex((spot) => Math.abs(point.x - spot.x) <= 42 && point.y >= spot.y - 78 && point.y <= spot.y + 34);
    return index >= 0 ? index : null;
  }

  private placeStarterPot(): void { this.placeSelectedGrowingPot(); }

  private prepareGrowingSlotPlacement(): void {
    if (!this.homeInterior || !this.povoWelcomeGiftClaimed) return;
    const index = this.selectedGrowingSpotIndex;
    if (index === null) {
      this.showToast('Select an empty grow-table square first.', 1700);
      return;
    }
    if (this.getPotAtGrowingSpotIndex(index)) {
      this.showToast('That grow-table square is already occupied.', 1700);
      return;
    }
    const pot = this.progress.growingPots.find((candidate) => candidate.slot === null);
    const spot = this.getActiveGrowingSpots()[index];
    if (!pot || Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) > 120) return;
    this.pendingInteraction = null;
    this.pendingBrokenPotPieceIndex = null;
    this.growingSlotReadyToPlace = true;
    this.showInteractionHighlight('place-growing-pot', new Phaser.Math.Vector2(spot.x, spot.y));
    this.hud.setAction('ADD POT TO THIS SQUARE');
    this.showToast('Add pot to this square.', 2600);
    this.updateInteraction();
  }

  public placeSelectedGrowingPot(): void {
    if (!this.homeInterior || !this.povoWelcomeGiftClaimed) return;
    if (!this.growingSlotReadyToPlace) {
      this.showToast('Tap an empty grow-table square first.', 1700);
      return;
    }
    const index = this.selectedGrowingSpotIndex;
    if (index === null || this.getPotAtGrowingSpotIndex(index)) { this.showToast('Choose an empty grow-table slot.', 1500); return; }
    const pot = this.progress.growingPots.find((candidate) => candidate.id === STARTER_GROWING_POT_ID && candidate.slot === null)
      ?? this.progress.growingPots.find((candidate) => candidate.slot === null);
    const spot = this.getActiveGrowingSpots()[index];
    if (!pot || Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) > 120) return;
    pot.slot = index;
    this.growingSlotReadyToPlace = false;
    this.selectedGrowingPotId = pot.id;
    this.basilPotSelected = true;
    this.progress.task = this.progress.growingPots.every((candidate) => candidate.slot !== null) ? 'plant-mint' : 'place-pot';
    this.saveProgress(); this.updateBasilVisual(); this.syncHudState(); this.selectedGrowingSpotIndex = null;
    this.showToast('Pot placed. Select it to choose a seed.', 1900);
    this.hud.openPanel('basil');
  }

  private selectBasilPot(): void {
    const starter = this.progress.growingPots.find((pot) => pot.id === STARTER_GROWING_POT_ID);
    if (starter) this.selectGrowingPot(starter.id);
  }

  public selectGrowingPot(id: string): void {
    if (!this.homeInterior) return;
    const pot = this.progress.growingPots.find((candidate) => candidate.id === id && candidate.slot !== null);
    if (!pot || Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y) > BASIL_POT_INTERACTION_RADIUS) { this.showToast('Move closer to the growing pot first.', 1400); return; }
    this.selectedGrowingPotId = id; this.basilPotSelected = true;
    this.hud.openPanel('basil');
    if (!pot.crop && PLANT_SPECIES.every((species) => (this.progress.seedQuantities[species] ?? 0) < 1)) {
      const message = `Buy seeds at ${BUY_SELL_NAME}.`;
      this.hud.refreshBasilPanel(message);
      this.showToast(message, 1900);
    }
    this.showInteractionHighlight('select-growing-pot', new Phaser.Math.Vector2(this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y));
    this.updateBasilVisual(); this.updateInteraction();
  }

  restartPrototype(): void {
    this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.inventoryInstanceId = null;
    this.saleComplete = false;
    this.coins = 0;
    this.clearItemPlacement();
    this.rentalBondPaid = false;
    this.rentalKeyOwned = false;
    this.activeProperty = 'none';
    this.rentalBondTotal = 0;
    this.secondRentalMoveConfirmation = false;
    this.progress.openingComplete = false;
    this.housingThoughtElapsedMs = 0;
    this.thoughtBubble?.setVisible(false);
    this.repairPickupReady = false;
    this.windowFacePromptRequired = false;
    this.basilPotSelected = false;
    this.selectedGrowingPotId = null;
    this.basilStageCache = 'empty';
    this.stopBasilWatering();
    this.repairPotDisplay?.destroy();
    this.repairPotDisplay = undefined;
    this.repairPickupPrompt?.destroy();
    this.repairPickupPrompt = undefined;
    this.shopGoldenPothosDisplay = [];
    this.shopPremiumPlantDisplay = [];
    this.saveProgress();
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.zoomMode = 'close';
    this.streetZoomMode = 'close';
    this.applyZoom(this.zoomMode);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y).setVisible(true);
    this.drawPlayer();
    this.updateProgressVisuals();
    this.refreshWantedSign();
    this.syncHudState();
    this.hud.setMapPosition(START_POSITION.x / WORLD_WIDTH, START_POSITION.y);
    this.showToast('Prototype restarted.');
    this.updateInteraction();
    this.startOpeningSequence();
  }

  private updateApartmentRentalSign(): void {
    this.children.list.forEach((child) => {
      if (!('getData' in child) || !('setText' in child)) return;
      const object = child as Phaser.GameObjects.Text;
      if (!object.getData('apartment-rental-sign')) return;
      const property = object.getData('property-id') as PropertyId;
      const occupied = property === this.activeProperty;
      object.setText(object.getData('rental-sign-role') === 'title'
        ? (occupied ? 'YOUR HOME' : property === 'starter-apartment' ? 'SINGLE ROOM TO LET' : 'TO LET')
        : (occupied ? 'ACCESS UNLOCKED' : property === 'second-rental' ? 'MOVE TO RENTAL' : '60 COINS'));
    });
  }

  private createPlayer(): void {
    this.player = this.add.graphics().setDepth(30);
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.drawPlayer();
  }

  private createThoughtBubble(): void {
    this.thoughtBubbleBackdrop = this.add.graphics();
    this.thoughtBubbleText = this.add.text(0, 0, '', {
      color: '#111416',
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 132, useAdvancedWrap: true },
    }).setOrigin(0.5);
    this.thoughtBubble = this.add.container(this.player.x, this.player.y - 104, [this.thoughtBubbleBackdrop, this.thoughtBubbleText])
      .setDepth(40)
      .setVisible(false);
  }

  private showThought(text: string, automatic = false, fontSize = '16px'): void {
    if (!this.thoughtBubble || !this.thoughtBubbleBackdrop || !this.thoughtBubbleText) return;
    this.thoughtBubbleText.setFontSize(fontSize);
    this.thoughtBubbleText.setText(text);
    const greenScreen = this.progress.alexGraphics === 'green-screen';
    const background = greenScreen ? 0x030805 : 0xf6f7f3;
    const outline = greenScreen ? 0x39ff5a : 0x111416;
    this.thoughtBubbleText.setColor(greenScreen ? '#b9ffbf' : '#111416');
    const width = 164;
    const height = Math.max(58, this.thoughtBubbleText.height + 24);
    this.thoughtBubbleBackdrop.clear();
    this.thoughtBubbleBackdrop.fillStyle(background, 0.98).fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.thoughtBubbleBackdrop.lineStyle(2, outline, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.thoughtBubbleBackdrop.fillStyle(background, 0.98).fillTriangle(-12, height / 2 - 2, 12, height / 2 - 2, 0, height / 2 + 16);
    this.thoughtBubbleBackdrop.lineStyle(2, outline, 1).lineBetween(-12, height / 2 - 2, 0, height / 2 + 16).lineBetween(0, height / 2 + 16, 12, height / 2 - 2);
    this.thoughtBubbleText.setPosition(0, 0);
    this.thoughtBubbleIsAutomatic = automatic;
    this.thoughtBubbleRemainingMs = 3000;
    this.thoughtBubble.setVisible(true);
    this.updateThoughtBubblePosition();
    if (text === 'I should let the mint grow' && !this.progress.mintLowSuppliesAcknowledged && !this.mintLowSuppliesTimer) {
      this.mintLowSuppliesTimer = this.time.delayedCall(3050, () => {
        this.mintLowSuppliesTimer = undefined;
        this.presentMintLowSuppliesPopup();
      });
    }
  }

  private presentMintLowSuppliesPopup(): void {
    if (this.progress.mintLowSuppliesAcknowledged) return;
    this.setModalOpen(true);
    this.hud.showAcknowledgement("I’m low on supplies, gotta get to the Buy’nSell.", () => {
      this.progress.mintLowSuppliesAcknowledged = true;
      this.saveProgress();
      this.setModalOpen(false);
      this.syncHudState();
    });
  }

  private updateThoughtBubblePosition(): void {
    if (!this.thoughtBubble) return;
    this.thoughtBubble.setPosition(this.player.x, this.player.y - 104 - this.hopVisualOffset);
  }

  private updateThoughtBubble(delta: number): void {
    const blocked = this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning
      || this.activeGardeningAction !== null || this.sprayAnimating || this.repairAnimating || this.hopActive;
    if (blocked) {
      this.thoughtBubble?.setVisible(false);
      this.thoughtBubbleRemainingMs = 0;
      return;
    }
    if (this.rentalBondPaid && this.thoughtBubbleIsAutomatic) {
      this.thoughtBubble?.setVisible(false);
      this.thoughtBubbleRemainingMs = 0;
      return;
    }
    if (this.thoughtBubble?.visible) {
      this.updateThoughtBubblePosition();
      this.thoughtBubbleRemainingMs -= delta;
      if (this.thoughtBubbleRemainingMs <= 0) this.thoughtBubble.setVisible(false);
      return;
    }
    if (this.rentalBondPaid) return;
    this.housingThoughtElapsedMs += delta;
    if (this.housingThoughtElapsedMs >= 30000) {
      this.housingThoughtElapsedMs = 0;
      this.showThought('I need a place to live', true);
    }
  }

  private startHousingThoughtReminder(): void {
    this.housingThoughtElapsedMs = 0;
    if (!this.rentalBondPaid) this.showThought('I need a place to live', true);
  }

  private getCurrentThought(): string {
    if (!this.rentalBondPaid) return 'I need a place to live';
    if (!this.povoWelcomeGiftClaimed) return 'I should claim the welcome gift';
    const thoughts: Partial<Record<TaskState, string>> = {
      'place-pot': 'I need to place a pot on the grow table',
      'plant-basil': 'I should plant a seed',
      'water-basil': 'The basil needs water',
      'grow-basil': 'I should let the basil grow',
      'harvest-basil': 'The basil is ready to harvest',
      'sell-basil': 'I should sell the basil harvest',
      'buy-seeds': 'I should buy more seeds',
      'plant-mint': 'I should plant mint in an empty pot',
      'water-mint': 'The mint needs water',
      'grow-mint': 'I should let the mint grow',
      'harvest-mint': 'The mint is ready to harvest',
      'sell-mint': 'I should sell the mint harvest',
      'plant-dwarf-marigold': 'I should plant the Dwarf Marigold seeds',
      'water-dwarf-marigold': 'The Dwarf Marigold needs water',
      'grow-dwarf-marigold': 'The Dwarf Marigold is growing',
      'lift-dwarf-marigold': 'The Dwarf Marigold is ready to lift',
      'sell-dwarf-marigold': 'I should sell the potted Dwarf Marigold',
      'plant-peace-lily': 'I should plant the Peace Lily seeds',
      'water-peace-lily': 'The Peace Lily needs water',
      'grow-peace-lily': 'The Peace Lily is growing',
      'lift-peace-lily': 'The Peace Lily is ready to lift',
      'sell-peace-lily': 'I should sell the potted Peace Lily',
    };
    return thoughts[this.progress.task] ?? 'I should keep working on my plants';
  }

  private drawPlayer(): void {
    this.player.clear();
    const lift = this.hopVisualOffset;
    const greenScreen = this.progress.alexGraphics === 'green-screen';
    const robotLight = greenScreen ? 0x050b06 : 0xf5f6f2;
    const robotInk = greenScreen ? 0x39ff5a : 0x111416;
    const robotDetail = greenScreen ? 0x16752a : 0x697173;
    const robotEye = greenScreen ? 0xb9ffbf : robotInk;
    this.player.fillStyle(0x111416, 0.65).fillEllipse(0, 32, 30, 8);
    const sideFacing = this.playerFacing === 'left' || this.playerFacing === 'right';
    const bodyX = sideFacing ? -11 : -14;
    const bodyWidth = sideFacing ? 22 : 28;
    this.player.fillStyle(robotLight, 1).fillRect(bodyX, -43 - lift, bodyWidth, 56);
    this.player.lineStyle(2, robotInk, 1).strokeRect(bodyX, -43 - lift, bodyWidth, 56);

    if (this.playerFacing === 'front') {
      this.player.fillStyle(robotEye, 1).fillRect(-8, -31 - lift, 5, 6).fillRect(3, -31 - lift, 5, 6);
      this.player.lineStyle(2, greenScreen ? robotDetail : robotInk, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
    } else if (this.playerFacing === 'back') {
      this.player.fillStyle(greenScreen ? 0x0b1c0e : 0x3b4244, 1).fillRect(-8, -32 - lift, 16, 9);
      this.player.lineStyle(2, robotDetail, 1).lineBetween(-4, -28 - lift, 4, -28 - lift);
      this.player.lineStyle(2, greenScreen ? robotDetail : robotInk, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
    } else {
      const eyeX = this.playerFacing === 'left' ? -8 : 3;
      this.player.fillStyle(robotEye, 1).fillRect(eyeX, -31 - lift, 5, 6);
      this.player.lineStyle(2, robotDetail, 1).lineBetween(0, -20 - lift, 0, 9 - lift);
    }
    this.player.fillStyle(robotLight, 1).fillRect(-13, 13 - lift, 10, 18).fillRect(3, 13 - lift, 10, 18);
    if (greenScreen) {
      this.player.lineStyle(2, robotInk, 1).strokeRect(-13, 13 - lift, 10, 18).strokeRect(3, 13 - lift, 10, 18);
    } else {
      this.player.lineStyle(2, robotInk, 1).strokeRect(-13, 13 - lift, 10, 18).strokeRect(3, 13 - lift, 10, 18);
    }
    this.drawPlayerToolAttachment(lift);
    // The module package enlarges only the rendering. World position,
    // collision, movement speed and interaction geometry remain unchanged.
    this.player.setScale(this.progress.graphicsUpgradeInstalled ? 1.25 : 1);
  }

  private drawPlayerToolAttachment(lift: number): void {
    const action = this.activeGardeningAction;
    const sideSign = this.playerFacing === 'left' ? -1 : 1;
    const handX = this.playerFacing === 'front' || this.playerFacing === 'back' ? 16 : sideSign * 16;
    const handY = -4 - lift;
    const reach = action ? 5 + Math.sin(Math.min(1, this.gardeningActionElapsed / this.gardeningActionDuration) * Math.PI) * 8 : 0;
    const toolX = handX + sideSign * reach;
    const greenScreen = this.progress.alexGraphics === 'green-screen';
    const toolEdge = greenScreen ? 0x39ff5a : 0xf6f7f3;
    const toolDark = greenScreen ? 0x050b06 : 0x111416;
    const toolMid = greenScreen ? 0x123d1b : 0xbfc5c3;

    if (action?.type === 'plant') {
      this.player.fillStyle(greenScreen ? toolDark : toolEdge, 1).fillRect(toolX - 9, handY - 9, 18, 13);
      this.player.lineStyle(2, greenScreen ? toolEdge : toolDark, 1).strokeRect(toolX - 9, handY - 9, 18, 13);
      this.player.fillStyle(greenScreen ? toolMid : toolDark, 1).fillRect(toolX - 5, handY - 3, 10, 2);
      return;
    }
    if (action?.type === 'fertilize') {
      this.player.fillStyle(toolDark, 1).fillRect(toolX - 8, handY - 10, 16, 14);
      this.player.lineStyle(2, toolEdge, 1).strokeRect(toolX - 8, handY - 10, 16, 14);
      this.player.lineStyle(2, toolEdge, 1).lineBetween(toolX - 4, handY - 6, toolX + 4, handY - 6);
      return;
    }
    if (action?.type === 'harvest') {
      this.player.lineStyle(3, toolEdge, 1).lineBetween(handX, handY, toolX + sideSign * 12, handY - 8);
      return;
    }
    if (this.progress.equippedTool === 'watering-can') {
      this.player.fillStyle(toolMid, 1).fillRect(toolX - 7, handY - 9, 13, 15);
      this.player.lineStyle(2, greenScreen ? toolEdge : toolDark, 1).strokeRect(toolX - 7, handY - 9, 13, 15);
      this.player.lineStyle(2, toolEdge, 1).lineBetween(toolX + sideSign * 5, handY - 5, toolX + sideSign * 13, handY - 12);
    } else if (this.progress.equippedTool === 'cleaner') {
      this.player.lineStyle(3, toolEdge, 1).lineBetween(handX, handY, toolX + sideSign * 15, handY - 13);
      this.player.fillStyle(toolMid, 1).fillRect(toolX + sideSign * 10 - 5, handY - 17, 10, 8);
      this.player.lineStyle(2, greenScreen ? toolEdge : toolDark, 1).strokeRect(toolX + sideSign * 10 - 5, handY - 17, 10, 8);
    } else if (this.progress.equippedTool === 'repair') {
      this.player.lineStyle(3, toolEdge, 1).lineBetween(handX, handY, toolX + sideSign * 12, handY + 10);
      this.player.lineStyle(3, greenScreen ? toolMid : toolDark, 1).lineBetween(toolX + sideSign * 8, handY + 5, toolX + sideSign * 16, handY + 12);
    }
  }

  private createPot(): void {
    this.pot = this.add.graphics().setDepth(22);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y);
    drawGoldenPothos(this.pot, 0, 0, 0.9, this.progress.graphicsUpgradeInstalled);
    this.pot.setVisible(!this.progress.openingGoldenPothosCollected && this.progress.inventoryItem !== 'small-golden-pothos');
  }

  private createRareBegonia(): void {
    this.rareBegonia = this.add.graphics().setDepth(22).setPosition(RARE_BEGONIA_POSITION.x, RARE_BEGONIA_POSITION.y);
    drawRareSpottedBegonia(this.rareBegonia, 0, 0, 0.82, this.progress.graphicsUpgradeInstalled);
    this.rareBegonia.setVisible(!this.progress.rareBegoniaCollected);
  }

  private createHeavyPot(): void {
    this.heavyPot = this.add.graphics().setDepth(22).setPosition(HEAVY_POT_POSITION.x, HEAVY_POT_POSITION.y);
    drawGoldenPothos(this.heavyPot, 0, 0, 1.55, false);
  }

  private createBrokenPot(): void {
    this.brokenPot = this.add.graphics().setDepth(22);
    this.brokenPot.setPosition(BROKEN_POT_PIECES_CENTRE.x, BROKEN_POT_PIECES_CENTRE.y);
    const piecesRemaining = this.progress.brokenPotAvailable && !this.progress.brokenPotOwned
      ? Math.max(1, this.progress.brokenPotPiecesRemaining)
      : this.progress.brokenPotPiecesRemaining;
    drawBrokenPotPieces(this.brokenPot, 0, 0, BROKEN_POT_PIECES_SCALE, piecesRemaining, BROKEN_POT_PIECE_OFFSETS, this.getCollectedBrokenPotPieceIndices());
    this.brokenPot.setVisible(this.progress.brokenPotAvailable && !this.progress.brokenPotOwned);
  }

  private createPlacedItem(): void {
    this.placedItemDisplay = this.add.graphics().setDepth(22);
    this.updatePlacedItemVisual();
  }

  private updatePlacedItemVisual(): void {
    if (!this.placedItemDisplay) return;
    const placed = this.progress.placedWorldItem;
    if (!placed || this.shopInterior || this.homeInterior) {
      this.placedItemDisplay.clear().setVisible(false);
      return;
    }
    this.placedItemDisplay.setPosition(placed.x, placed.y).clear();
    if (placed.item === 'small-golden-pothos') {
      drawGoldenPothos(this.placedItemDisplay, 0, 0, 0.9, this.progress.graphicsUpgradeInstalled);
    } else if (placed.item === 'rare-spotted-begonia') {
      drawRareSpottedBegonia(this.placedItemDisplay, 0, 0, 0.82, this.progress.graphicsUpgradeInstalled);
    } else if (placed.condition === 'broken') {
      // A broken pot is represented as four loose pieces on the ground.
      // The global piece counter is for the separate street pickup and is 0
      // after the pot has been assembled into the Bag, so it must not control
      // the appearance of a deliberately placed broken pot.
      drawBrokenPotPieces(this.placedItemDisplay, 0, 0, BROKEN_POT_PIECES_SCALE, BROKEN_POT_PIECE_COUNT);
    } else {
      // A repaired pot keeps its empty, seamed silhouette when placed back
      // on the street; it never regresses to loose pieces or gains foliage.
      drawBrokenPot(this.placedItemDisplay, 0, 0, 1.89, 10, this.progress.graphicsUpgradeInstalled);
    }
    this.placedItemDisplay.setVisible(true);
  }

  private createWindowDirtOverlay(): void {
    this.windowDirtOverlay = this.add.graphics().setDepth(8);
    this.refreshWindowDirtOverlay();
    this.windowDirtOverlay.setVisible(this.progress.windowJobAccepted && !this.progress.windowJobComplete);
  }

  private refreshWindowDirtOverlay(): void {
    if (!this.windowDirtOverlay) return;
    this.windowDirtOverlay.clear();
    HOMES_WINDOW_CLEAN_SECTIONS.forEach((section, sectionIndex) => {
      const sectionProgress = this.getWindowSectionProgress(sectionIndex);
      const complete = sectionProgress >= section.spraysRequired;
      const dirtLevel = 1 - sectionProgress / section.spraysRequired;
      this.windowDirtOverlay.fillStyle(0x111416, complete ? 0.08 : 0.12 + dirtLevel * 0.38).fillRect(
        section.x,
        section.y,
        section.width,
        section.height,
      );
      this.windowDirtOverlay.lineStyle(2, 0xf6f7f3, complete ? 0.34 : 0.45 + dirtLevel * 0.35).strokeRect(
        section.x,
        section.y,
        section.width,
        section.height,
      );
      if (complete) return;
      this.windowDirtOverlay.fillStyle(0x858d8d, 0.34 + dirtLevel * 0.34);
      const dirtMarks = Math.max(1, Math.ceil(dirtLevel * 6));
      for (let mark = 0; mark < dirtMarks; mark += 1) {
        const markX = section.x + 14 + (mark % 2) * (section.width - 54);
        const markY = section.y + 18 + Math.floor(mark / 2) * 42;
        this.windowDirtOverlay.fillRect(markX, markY, 30, 11);
      }
    });
  }

  private createSprayEffect(): void {
    this.sprayEffect = this.add.graphics().setDepth(25).setVisible(false);
  }

  private getBrokenPotPiecePosition(index: number): { x: number; y: number } {
    return {
      x: BROKEN_POT_PIECES_CENTRE.x + BROKEN_POT_PIECE_OFFSETS[index] * BROKEN_POT_PIECES_SCALE,
      y: BROKEN_POT_PIECES_CENTRE.y,
    };
  }

  private getCollectedBrokenPotPieceIndices(): number[] {
    return this.progress.brokenPotPiecesCollected
      .map((id) => BROKEN_POT_PIECE_IDS.indexOf(id as typeof BROKEN_POT_PIECE_IDS[number]))
      .filter((index) => index >= 0);
  }

  private createDestinationMarker(): void {
    this.destinationMarker = this.add.graphics().setDepth(28).setVisible(false);
    this.destinationMarker.lineStyle(3, 0xf6f7f3, 0.95).strokeCircle(0, 0, 11);
    this.destinationMarker.lineStyle(2, 0x111416, 0.95).lineBetween(-7, 0, 7, 0).lineBetween(0, -7, 0, 7);
  }

  private createInteractionHighlight(): void {
    this.interactionHighlight = this.add.graphics().setDepth(29).setVisible(false);
  }

  private createPlacementHighlight(): void {
    this.placementOptionsHighlight = this.add.graphics().setDepth(20).setVisible(false);
    this.placementHighlight = this.add.graphics().setDepth(21).setVisible(false);
    this.placementHighlight.fillStyle(0xf6f7f3, 0.16).fillRect(-56, -34, 112, 68);
    this.placementHighlight.lineStyle(3, 0xf6f7f3, 0.95).strokeRect(-56, -34, 112, 68);
    this.placementHighlight.lineStyle(2, 0x111416, 0.9);
    this.placementHighlight.lineBetween(-56, -34, -42, -34);
    this.placementHighlight.lineBetween(56, -34, 42, -34);
    this.placementHighlight.lineBetween(-56, 34, -42, 34);
    this.placementHighlight.lineBetween(56, 34, 42, 34);
  }

  private updatePlacementOptions(): void {
    if (!this.placementOptionsHighlight) return;
    this.placementOptionsHighlight.clear();
    if (!this.itemPlacementMode || this.shopInterior || this.homeInterior || this.placementOptionTargets.length === 0) {
      this.placementOptionsHighlight.setVisible(false);
      return;
    }
    this.placementOptionTargets.forEach((option) => {
      const selected = this.placementTarget
        && Phaser.Math.Distance.Between(option.x, option.y, this.placementTarget.x, this.placementTarget.y) < 1;
      if (selected) return;
      this.placementOptionsHighlight.fillStyle(0xf6f7f3, 0.09).fillRect(option.x - 48, option.y - 28, 96, 56);
      this.placementOptionsHighlight.lineStyle(2, 0xf6f7f3, 0.7).strokeRect(option.x - 48, option.y - 28, 96, 56);
      this.placementOptionsHighlight.lineStyle(2, 0x111416, 0.7);
      this.placementOptionsHighlight.lineBetween(option.x - 48, option.y - 28, option.x - 36, option.y - 28);
      this.placementOptionsHighlight.lineBetween(option.x + 48, option.y + 28, option.x + 36, option.y + 28);
    });
    this.placementOptionsHighlight.setVisible(true);
  }

  private updatePlacementHighlight(): void {
    if (!this.placementHighlight) return;
    this.updatePlacementOptions();
    const visible = this.itemPlacementMode
      && !this.shopInterior
      && !this.homeInterior
      && Boolean(this.placementTarget);
    if (!visible || !this.placementTarget) {
      this.placementHighlight.setVisible(false);
      return;
    }
    this.placementHighlight.setPosition(this.placementTarget.x, this.placementTarget.y).setVisible(true);
  }

  private createCars(): void {
    const carData = [
      { x: 330, y: 1000, speed: 80, direction: 1 as const },
      { x: 1530, y: 1110, speed: 70, direction: -1 as const },
      { x: 2750, y: 1000, speed: 58, direction: 1 as const },
    ];
    this.cars = carData.map((data, index) => {
      const graphics = this.add.graphics().setDepth(18);
      graphics.setPosition(data.x, data.y);
      this.drawCar(graphics, index % 2 === 0 ? 1 : -1);
      return { graphics, ...data };
    });
  }

  private drawCar(g: Phaser.GameObjects.Graphics, direction: 1 | -1): void {
    g.fillStyle(0x0c0e0f, 1).fillRoundedRect(-40, -18, 80, 24, 5);
    g.fillStyle(0xdde1df, 1).fillTriangle(-20, -18, 4, -42, 30, -18);
    g.fillStyle(0x121618, 1).fillCircle(-22, 7, 10).fillCircle(23, 7, 10);
    g.fillStyle(0xdde1df, 1).fillCircle(-22, 7, 4).fillCircle(23, 7, 4);
    if (direction < 0) g.scaleX = -1;
  }

  private updateCars(delta: number): void {
    this.cars.forEach((car) => {
      car.x += car.speed * car.direction * delta / 1000;
      if (car.x > WORLD_WIDTH + 120) car.x = -120;
      if (car.x < -120) car.x = WORLD_WIDTH + 120;
      car.graphics.x = car.x;
    });
  }

  private readonly handleCanvasPointerDown = (event: PointerEvent): void => {
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive || this.modalOpen || this.phoneLandscapeBlocked || this.joystickPointerHeld || event.pointerType === 'mouse' && event.button !== 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.audio.unlock();
    this.game.canvas.setPointerCapture?.(event.pointerId);
    this.handleCanvasClientPoint(event.clientX, event.clientY);
  };

  private readonly handleCanvasPointerUp = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.game.canvas.releasePointerCapture?.(event.pointerId);
  };

  private readonly handleCanvasPointerCancel = (event: PointerEvent): void => {
    this.game.canvas.releasePointerCapture?.(event.pointerId);
  };

  private readonly handleCanvasClick = (event: MouseEvent): void => {
    if (this.openingSequenceActive || this.modalOpen || this.phoneLandscapeBlocked || this.joystickPointerHeld) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.handleCanvasClientPoint(event.clientX, event.clientY);
  };

  private handleCanvasClientPoint(clientX: number, clientY: number): void {
    const now = performance.now();
    if (now - this.lastWorldInputAt < 350) return;
    this.lastWorldInputAt = now;
    const rect = this.game.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const screenX = (clientX - rect.left) * (this.scale.width / rect.width);
    const screenY = (clientY - rect.top) * (this.scale.height / rect.height);
    this.handleWorldPoint(screenX, screenY);
  }

  private handleWorldPoint(screenX: number, screenY: number): void {
    if (this.openingSequenceActive || this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.joystickPointerHeld || this.activeGardeningAction) return;
    if (this.sprayAnimating) this.cancelToolUse(false);
    const point = this.cameras.main.getWorldPoint(screenX, screenY);
    if ((this.shopInterior || this.homeInterior)
      && this.isNearPoint(point, new Phaser.Math.Vector2(this.player.x, this.player.y), 54)) {
      this.cancelTapWalk();
      this.clearInteractionHighlight();
      this.showThought(this.getCurrentThought());
      return;
    }
    if (this.shopInterior) {
      this.handleShopWorldPoint(point.x, point.y);
      return;
    }
    if (this.homeInterior) {
      this.handleHomeWorldPoint(point.x, point.y);
      return;
    }
    if (this.itemPlacementMode) {
      this.handleItemPlacementPoint(point);
      return;
    }
    if (this.repairPickupReady && this.repairPotDisplay?.visible) {
      const repairPosition = new Phaser.Math.Vector2(this.repairPotDisplay.x, this.repairPotDisplay.y);
      if (this.isNearPoint(point, repairPosition, 125)) {
        const approach = new Phaser.Math.Vector2(repairPosition.x - 72, repairPosition.y);
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, repairPosition.x, repairPosition.y) <= 105) {
          this.selectPendingInteraction('pickup-repaired', approach);
        } else {
          const tapPath = this.getTapPath(approach.x, approach.y);
          if (!tapPath) {
            this.cancelTapWalk();
            this.showToast('The repaired pot cannot be reached.', 1500);
            return;
          }
          this.selectPendingInteraction('pickup-repaired', approach, tapPath);
        }
        return;
      }
    }
    const placedItem = this.progress.placedWorldItem;
    if (placedItem && this.placedItemDisplay?.visible && !this.inventoryHasPot
      && this.isNearPoint(point, placedItem, 118)) {
      const approach = this.getPlacedItemApproachPoint(placedItem);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, placedItem.x, placedItem.y) <= 110) {
        this.selectPendingInteraction('pickup-placed-item', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('That item cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('pickup-placed-item', approach, tapPath);
      }
      return;
    }
    if (this.progress.windowJobAccepted && this.isWindowDisplayPoint(point)) {
      const sectionIndex = this.getWindowSectionIndexAtPoint(point);
      if (sectionIndex === null) return;
      if (this.getWindowSectionProgress(sectionIndex) >= HOMES_WINDOW_CLEAN_SECTIONS[sectionIndex].spraysRequired) {
        this.selectedWindowSectionIndex = null;
        this.cancelTapWalk();
        this.showToast('Already clean. Move to the other window.', 1600);
        return;
      }
      this.selectedWindowSectionIndex = sectionIndex;
      const approach = this.getWindowInteractionPoint(sectionIndex);
      if (this.isNearWindowApproach()) {
        this.windowFacePromptRequired = true;
        this.windowFacingLocked = false;
        this.faceDirection(new Phaser.Math.Vector2(0, 1));
      } else {
        this.windowFacePromptRequired = false;
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('The display cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('window-clean', approach, tapPath);
      }
      return;
    }
    const brokenPieceIndex = this.getBrokenPotPieceIndexAtPoint(point);
    if (brokenPieceIndex !== null && this.progress.brokenPotAvailable && !this.progress.brokenPotOwned && this.brokenPot.visible) {
      if (this.inventoryHasPot) {
        this.cancelTapWalk();
        this.showToast('The Bag is full. Sell the current pot before picking up these pieces.', 1900);
        return;
      }
      const brokenPosition = this.getBrokenPotPiecePosition(brokenPieceIndex);
      const approach = new Phaser.Math.Vector2(brokenPosition.x - 72, brokenPosition.y);
      // Record the chosen fragment before selecting the interaction. A close
      // interaction completes synchronously, so assigning this afterwards
      // loses the piece ID and makes taps appear to do nothing.
      this.pendingBrokenPotPieceIndex = brokenPieceIndex;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, brokenPosition.x, brokenPosition.y) <= BROKEN_POT_PIECE_PICKUP_RANGE) {
        this.selectPendingInteraction('select-broken-piece', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.pendingBrokenPotPieceIndex = null;
          this.cancelTapWalk();
          this.showToast('That pot cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('select-broken-piece', approach, tapPath);
      }
      return;
    }
    if (this.isNearPoint(point, POT_POSITION, 82) && !this.inventoryHasPot && this.pot.visible) {
      const approach = this.getPotApproachPoint();
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y) <= 105) {
        this.selectPendingInteraction('pickup', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('That pot cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('pickup', approach, tapPath);
      }
      return;
    }
    if (this.isNearPoint(point, HEAVY_POT_POSITION, 126) && this.heavyPot.visible) {
      this.cancelTapWalk();
      this.showToast('This pot is too big for Alex to lift. Needs a trolley or Heavy Lift upgrade.', 2400);
      return;
    }
    if (this.isNearPoint(point, RARE_BEGONIA_POSITION, 92) && this.rareBegonia.visible) {
      if (this.inventoryHasPot) {
        this.cancelTapWalk();
        this.showToast('The Bag is carrying another loose pot. Put it down or sell it first.', 1800);
        return;
      }
      const approach = new Phaser.Math.Vector2(RARE_BEGONIA_POSITION.x - 74, RARE_BEGONIA_POSITION.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, RARE_BEGONIA_POSITION.x, RARE_BEGONIA_POSITION.y) <= 110) {
        this.selectPendingInteraction('pickup-begonia', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('The Rare Spotted Begonia cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('pickup-begonia', approach, tapPath);
      }
      return;
    }
    if (this.isNearBuySellDoor(point)) {
      const approach = new Phaser.Math.Vector2(BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 120) {
        this.selectPendingInteraction('enter-shop', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('The entrance cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('enter-shop', approach, tapPath);
      }
      return;
    }
    if (this.isNearRealEstateDoor(point)) {
      if (!this.progress.windowJobComplete) {
        this.cancelTapWalk();
        this.showToast('REAL ESTATE CLOSED. Clean both windows to reopen the office.', 1900);
        return;
      }
      const approach = new Phaser.Math.Vector2(REAL_ESTATE_ENTRANCE.x, REAL_ESTATE_ENTRANCE.y);
      const tapPath = this.getTapPath(approach.x, approach.y);
      if (tapPath) this.selectPendingInteraction('enter-real-estate', approach, tapPath);
      else this.showToast('The Real Estate entrance cannot be reached.', 1500);
      return;
    }
    if (this.isNearSecondRentalDoor(point)) {
      const approach = new Phaser.Math.Vector2(SECOND_RENTAL_ENTRANCE.x, SECOND_RENTAL_ENTRANCE.y);
      if (this.activeProperty !== 'second-rental') {
        this.cancelTapWalk();
        this.showToast('Arrange the two-room rental at the REAL ESTATE AGENT first.', 1800);
        return;
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 120) {
        this.selectPendingInteraction('enter-home', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('The two-room rental entrance cannot be reached.', 1600);
          return;
        }
        this.selectPendingInteraction('enter-home', approach, tapPath);
      }
      return;
    }
    if (this.isNearApartmentDoor(point)) {
      const approach = this.getApartmentApproachPoint();
      if (this.activeProperty !== 'starter-apartment') {
        this.cancelTapWalk();
        this.showToast(this.activeProperty === 'second-rental'
          ? 'The starter apartment has been returned. Use the two-room rental.'
          : 'Rental available. See the REAL ESTATE AGENT.', 1800);
        return;
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 120) {
        this.selectPendingInteraction('enter-home', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('The starter apartment entrance cannot be reached.', 1600);
          return;
        }
        this.selectPendingInteraction('enter-home', approach, tapPath);
      }
      return;
    }
    // Interactive world objects take priority over Alex's self-tap area.
    // Otherwise, standing on or immediately beside a small collectible makes
    // its enlarged touch target overlap Alex and the pickup tap is swallowed
    // by the thought-bubble action.
    if (this.isNearPoint(point, new Phaser.Math.Vector2(this.player.x, this.player.y), 54)) {
      this.cancelTapWalk();
      this.clearInteractionHighlight();
      this.showThought(this.getCurrentThought());
      return;
    }
    const tapPath = this.getTapPath(point.x, point.y);
    if (!tapPath) {
      this.cancelTapWalk();
      this.showToast('That area is not accessible.', 1500);
      return;
    }
    this.selectWalkPath(tapPath);
  }

  private isNearPoint(point: Phaser.Math.Vector2, target: { x: number; y: number }, radius: number): boolean {
    return Phaser.Math.Distance.Between(point.x, point.y, target.x, target.y) <= radius;
  }

  private getBrokenPotPieceIndexAtPoint(point: Phaser.Math.Vector2): number | null {
    for (let index = 0; index < BROKEN_POT_PIECE_COUNT; index += 1) {
      if (this.progress.brokenPotPiecesCollected.includes(BROKEN_POT_PIECE_IDS[index])) continue;
      const position = this.getBrokenPotPiecePosition(index);
      if (Math.abs(point.x - position.x) <= 34 * BROKEN_POT_PIECES_SCALE
        && Math.abs(point.y - position.y) <= 32 * BROKEN_POT_PIECES_SCALE) return index;
    }
    return null;
  }

  private isNearBuySellDoor(point: Phaser.Math.Vector2): boolean {
    // The hit area follows the visible door, while the approach point remains
    // at pavement level so Alex never has to enter the building geometry.
    return Math.abs(point.x - BUY_SELL_ENTRANCE.x) <= BUY_SELL_DOOR_WIDTH / 2 + 18
      && point.y >= BUY_SELL_DOOR_TOP - 18
      && point.y <= BUY_SELL_DOOR_BOTTOM + 14;
  }

  private isNearRealEstateDoor(point: Phaser.Math.Vector2): boolean {
    return Math.abs(point.x - REAL_ESTATE_ENTRANCE.x) <= BUY_SELL_DOOR_WIDTH / 2 + 18
      && point.y >= REAL_ESTATE_DOOR_TOP - 18 && point.y <= REAL_ESTATE_DOOR_BOTTOM + 14;
  }

  private isPlayerNearBuySellEntrance(): boolean {
    return Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      BUY_SELL_ENTRANCE.x,
      BUY_SELL_ENTRANCE.y,
    ) <= 120;
  }

  private getPotApproachPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(POT_POSITION.x - 72, POT_POSITION.y);
  }

  private getPlacedItemApproachPoint(item: Pick<PlacedWorldItem, 'x' | 'y'>): Phaser.Math.Vector2 {
    const approachX = item.x - 72 < STARTING_WALKABLE_MIN_X + 24 ? item.x + 72 : item.x - 72;
    return new Phaser.Math.Vector2(approachX, item.y);
  }

  private selectWalkPath(path: Phaser.Math.Vector2[]): void {
    this.pendingInteraction = null;
    this.selectedWindowSectionIndex = null;
    this.windowFacePromptRequired = false;
    this.basilPotSelected = false;
    this.selectedGrowingPotId = null;
    this.selectedGrowingSpotIndex = null;
    this.growingSlotReadyToPlace = false;
    this.windowFacingLocked = false;
    this.clearInteractionHighlight();
    this.target = path.shift() ?? null;
    this.targetQueue = path;
    const destination = this.targetQueue[this.targetQueue.length - 1] ?? this.target;
    if (destination) this.destinationMarker.setPosition(destination.x, destination.y).setVisible(true);
  }

  private selectPendingInteraction(
    interaction: PendingInteraction,
    approach: Phaser.Math.Vector2,
    path?: Phaser.Math.Vector2[],
  ): void {
    const selectedBrokenPiece = interaction === 'select-broken-piece'
      ? this.pendingBrokenPotPieceIndex
      : null;
    this.cancelTapWalk(interaction === 'gardening-action');
    // cancelTapWalk normally clears stale piece targeting. For a newly
    // selected fragment, restore the current ID after that cleanup so both
    // immediate and path-followed selection can complete.
    if (interaction === 'select-broken-piece') this.pendingBrokenPotPieceIndex = selectedBrokenPiece;
    if (interaction !== 'window-clean') this.selectedWindowSectionIndex = null;
    this.pendingInteraction = interaction;
    this.showInteractionHighlight(interaction, approach);
    if (path && path.length > 0) {
      this.target = path.shift() ?? null;
      this.targetQueue = path;
      this.destinationMarker.setPosition(approach.x, approach.y).setVisible(true);
      return;
    }
    this.target = null;
    this.targetQueue = [];
    this.destinationMarker.setVisible(false);
    this.completePendingInteraction();
  }

  private handleShopWorldPoint(pointX: number, pointY: number): void {
    const point = new Phaser.Math.Vector2(pointX, pointY);
    if (this.realEstateInterior) {
      if (this.isNearShopExit(point)) {
        const approach = new Phaser.Math.Vector2(SHOP_EXIT.x, SHOP_EXIT_DOOR_BOTTOM - 22);
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
          this.selectPendingInteraction('exit-real-estate', approach);
        } else {
          const exitPath = this.getShopTapPath(approach.x, approach.y);
          if (exitPath) this.selectPendingInteraction('exit-real-estate', approach, exitPath);
        }
        return;
      }
      const rosePosition = new Phaser.Math.Vector2(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
      if (this.isNearPoint(point, rosePosition, 90) || this.isNearPoint(point, SHOP_COUNTER, 130)) {
        this.cancelTapWalk();
        this.hud.openRealEstatePanel();
        return;
      }
      const path = this.getShopTapPath(point.x, point.y);
      if (path) this.selectWalkPath(path);
      else this.showToast('That area is not accessible.', 1500);
      return;
    }
    if (this.isNearShopExit(point)) {
      const approach = new Phaser.Math.Vector2(SHOP_EXIT.x, SHOP_EXIT_DOOR_BOTTOM - 22);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
        this.selectPendingInteraction('exit-shop', approach);
      } else {
        const path = this.getShopTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction('exit-shop', approach, path);
        else this.showToast('The exit cannot be reached.', 1500);
      }
      return;
    }
    const clerkPosition = new Phaser.Math.Vector2(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
    if (this.isNearPoint(point, clerkPosition, 76)) {
      this.cancelTapWalk();
      this.openShopPanel();
      return;
    }
    if (this.isNearPoint(point, SHOP_COUNTER, 130)) {
      const approach = new Phaser.Math.Vector2(SHOP_COUNTER_APPROACH.x, SHOP_COUNTER_APPROACH.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
        this.selectPendingInteraction('counter', approach);
      } else {
        const path = this.getShopTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction('counter', approach, path);
        else this.showToast('The counter cannot be reached.', 1500);
      }
      return;
    }
    const path = this.getShopTapPath(point.x, point.y);
    if (!path) {
      this.cancelTapWalk();
      this.showToast('That area is not accessible.', 1500);
      return;
    }
    this.selectWalkPath(path);
  }

  private handleHomeWorldPoint(pointX: number, pointY: number): void {
    const point = new Phaser.Math.Vector2(pointX, pointY);
    if (this.isNearHomeExit(point)) {
      const approach = new Phaser.Math.Vector2(HOME_EXIT.x, HOME_EXIT_DOOR_BOTTOM - 22);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
        this.selectPendingInteraction('exit-home', approach);
      } else {
        const path = this.getHomeTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction('exit-home', approach, path);
        else this.showToast('The exit cannot be reached.', 1500);
      }
      return;
    }
    const growingSpotIndex = this.getGrowingSpotIndexAtPoint(point);
    if (growingSpotIndex !== null) {
      if (!this.povoWelcomeGiftClaimed) {
        this.cancelTapWalk();
        this.showToast('Claim the welcome gift before using the grow table.', 1700);
        return;
      }
      this.selectedGrowingSpotIndex = growingSpotIndex;
      const pot = this.getPotAtGrowingSpotIndex(growingSpotIndex);
      const spot = this.getActiveGrowingSpots()[growingSpotIndex];
      const approach = new Phaser.Math.Vector2(spot.x - 54, spot.y);
      const unplacedPot = this.progress.growingPots.find((candidate) => candidate.slot === null);
      const interaction: PendingInteraction = pot ? 'select-growing-pot' : unplacedPot ? 'place-growing-pot' : 'select-growing-pot';
      this.selectedGrowingPotId = pot?.id ?? null;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y) <= BASIL_POT_INTERACTION_RADIUS) {
        this.selectPendingInteraction(interaction, approach);
      } else {
        const path = this.getHomeTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction(interaction, approach, path);
        else this.showToast('That grow-table slot cannot be reached.', 1500);
      }
      return;
    }
    const path = this.getHomeTapPath(point.x, point.y);
    if (!path) {
      this.cancelTapWalk();
      this.showToast('That area is not accessible.', 1500);
      return;
    }
    this.selectWalkPath(path);
  }

  private getShopTapPath(x: number, y: number): Phaser.Math.Vector2[] | null {
    if (!this.isShopWalkablePosition(x, y)) return null;
    return [new Phaser.Math.Vector2(x, y)];
  }

  private getHomeTapPath(x: number, y: number): Phaser.Math.Vector2[] | null {
    if (!this.isHomeWalkablePosition(x, y)) return null;
    return [new Phaser.Math.Vector2(x, y)];
  }

  private handleItemPlacementPoint(point: Phaser.Math.Vector2): void {
    const placement = this.getItemPlacementAtPoint(point);
    if (!placement) {
      this.placementTarget = null;
      this.updatePlacementHighlight();
      this.syncHudState();
      this.showToast('Choose a clear pavement square.', 1500);
      return;
    }
    this.cancelTapWalk();
    this.placementTarget = placement;
    this.updatePlacementHighlight();
    this.syncHudState();
    this.showToast('Press B to put the item down.', 1500);
  }

  private isNearShopExit(point: Phaser.Math.Vector2): boolean {
    return Math.abs(point.x - SHOP_EXIT.x) <= SHOP_EXIT_ACTIVATION_HALF_WIDTH
      && point.y >= SHOP_EXIT_ACTIVATION_TOP
      && point.y <= SHOP_EXIT_ACTIVATION_BOTTOM;
  }

  private isNearHomeExit(point = new Phaser.Math.Vector2(this.player.x, this.player.y)): boolean {
    return Math.abs(point.x - HOME_EXIT.x) <= HOME_EXIT_ACTIVATION_HALF_WIDTH
      && point.y >= HOME_EXIT_ACTIVATION_TOP
      && point.y <= HOME_EXIT_ACTIVATION_BOTTOM;
  }

  private tryActivateMovementDoor(direction: Phaser.Math.Vector2, previousX: number, previousY: number): boolean {
    if (this.modalOpen || this.shopTransitioning || this.pendingInteraction || this.target) return false;

    if (!this.shopInterior && !this.homeInterior) {
      const thresholdY = FRONT_PAVEMENT_MIN_Y + 10;
      const inDoorLane = Math.abs(this.player.x - BUY_SELL_ENTRANCE.x) <= BUY_SELL_DOOR_WIDTH / 2 + 8;
      const movingIntoDoor = direction.y < -0.45 && inDoorLane
        && previousY >= this.player.y && this.player.y <= thresholdY;
      if (movingIntoDoor) {
        this.enterShop();
        return true;
      }
      const inRealEstateLane = Math.abs(this.player.x - REAL_ESTATE_ENTRANCE.x) <= BUY_SELL_DOOR_WIDTH / 2 + 8;
      const movingIntoRealEstate = direction.y < -0.45 && inRealEstateLane
        && previousY >= this.player.y && this.player.y <= thresholdY;
      if (movingIntoRealEstate) {
        if (this.progress.windowJobComplete) this.enterRealEstate();
        else if (performance.now() - this.rentalFeedbackAt > 900) {
          this.rentalFeedbackAt = performance.now();
          this.showToast('REAL ESTATE CLOSED. Clean both windows to reopen the office.', 1700);
        }
        return true;
      }
      const inApartmentLane = Math.abs(this.player.x - APARTMENT_ENTRANCE.x) <= APARTMENT_DOOR_WIDTH / 2 + 8;
      const movingIntoApartment = direction.y < -0.45 && inApartmentLane
        && previousY >= this.player.y && this.player.y <= FRONT_PAVEMENT_MIN_Y + 10;
      if (movingIntoApartment) {
        if (this.rentalBondPaid && this.activeProperty === 'starter-apartment') this.enterHome();
        else if (performance.now() - this.rentalFeedbackAt > 900) {
          this.rentalFeedbackAt = performance.now();
          this.showToast(this.activeProperty === 'second-rental'
            ? 'The starter apartment has been returned. Use the two-room rental.'
            : 'Rental available. See the REAL ESTATE AGENT.', 1500);
        }
        return true;
      }
      const inSecondRentalLane = Math.abs(this.player.x - SECOND_RENTAL_ENTRANCE.x) <= APARTMENT_DOOR_WIDTH / 2 + 8;
      const movingIntoSecondRental = direction.y < -0.45 && inSecondRentalLane
        && previousY >= this.player.y && this.player.y <= FRONT_PAVEMENT_MIN_Y + 10;
      if (movingIntoSecondRental) {
        if (this.activeProperty === 'second-rental') this.enterHome();
        else if (performance.now() - this.rentalFeedbackAt > 900) {
          this.rentalFeedbackAt = performance.now();
          this.showToast('Arrange the two-room rental at the REAL ESTATE AGENT first.', 1500);
        }
        return true;
      }
      return false;
    }

    if (this.homeInterior) {
      const inExitLane = Math.abs(this.player.x - HOME_EXIT.x) <= HOME_EXIT_ACTIVATION_HALF_WIDTH;
      const movingIntoExit = direction.y > 0.45 && inExitLane
        && previousY <= this.player.y
        && previousY <= HOME_EXIT_DOOR_BOTTOM + 8
        && this.player.y >= HOME_EXIT_MOVEMENT_TRIGGER_Y;
      if (movingIntoExit) {
        this.exitHome();
        return true;
      }
      return false;
    }

    const inExitLane = Math.abs(this.player.x - SHOP_EXIT.x) <= SHOP_EXIT_ACTIVATION_HALF_WIDTH;
    const movingIntoExit = direction.y > 0.45 && inExitLane
      && previousY <= this.player.y
      && previousY <= SHOP_EXIT_DOOR_BOTTOM + 8
      && this.player.y >= SHOP_EXIT_MOVEMENT_TRIGGER_Y;
    if (movingIntoExit) {
      if (this.realEstateInterior) this.exitRealEstate();
      else this.exitShop();
      return true;
    }
    return false;
  }

  private showInteractionHighlight(interaction: PendingInteraction, point: Phaser.Math.Vector2): void {
    this.interactionHighlight.clear();
    this.interactionHighlight.lineStyle(4, 0xf6f7f3, 0.95);
    if (interaction === 'enter-shop') {
      this.interactionHighlight.strokeRect(
        BUY_SELL_ENTRANCE.x - BUY_SELL_DOOR_WIDTH / 2 - 10,
        BUY_SELL_DOOR_TOP - 10,
        BUY_SELL_DOOR_WIDTH + 20,
        BUY_SELL_DOOR_HEIGHT + 20,
      );
    } else if (interaction === 'exit-shop') {
      this.interactionHighlight.strokeRect(point.x - SHOP_EXIT_DOOR_WIDTH / 2 - 10, SHOP_EXIT_DOOR_TOP - 10, SHOP_EXIT_DOOR_WIDTH + 20, SHOP_EXIT_DOOR_HEIGHT + 20);
    } else if (interaction === 'exit-home') {
      this.interactionHighlight.strokeRect(point.x - HOME_EXIT_DOOR_WIDTH / 2 - 10, HOME_EXIT_DOOR_TOP - 10, HOME_EXIT_DOOR_WIDTH + 20, HOME_EXIT_DOOR_HEIGHT + 20);
    } else if (interaction === 'window-clean') {
      this.interactionHighlight.strokeRect(HOMES_WINDOW.x - 6, HOMES_WINDOW.y + 4, HOMES_WINDOW.width - 8, HOMES_WINDOW.height - 8);
    } else if (interaction === 'place-growing-pot') {
      const index = this.selectedGrowingSpotIndex;
      const spot = index === null ? point : this.getActiveGrowingSpots()[index];
      this.interactionHighlight.strokeRect(spot.x - 48, spot.y - 34, 96, 68);
    } else if (interaction === 'select-growing-pot' || interaction === 'gardening-action') {
      this.interactionHighlight.strokeRect(point.x - 48, point.y - 34, 96, 68);
    } else {
      this.interactionHighlight.strokeCircle(point.x, point.y, 42);
    }
    this.interactionHighlight.setVisible(true);
  }

  private clearInteractionHighlight(): void {
    if (!this.interactionHighlight) return;
    this.interactionHighlight.clear().setVisible(false);
  }

  private completePendingInteraction(): void {
    const interaction = this.pendingInteraction;
    if (!interaction) return;
    this.pendingInteraction = null;
    this.clearInteractionHighlight();
    if (interaction === 'pickup') this.collectPot();
    if (interaction === 'pickup-begonia') this.collectRareBegonia();
    if (interaction === 'pickup-placed-item') this.collectPlacedItem();
    if (interaction === 'select-broken-piece') this.selectBrokenPotPiece();
    if (interaction === 'pickup-repaired') this.collectRepairedPot();
    if (interaction === 'window-clean') {
      this.windowFacePromptRequired = true;
      this.windowFacingLocked = false;
      this.faceDirection(new Phaser.Math.Vector2(0, 1));
    }
    if (interaction === 'enter-shop') this.enterShop();
    if (interaction === 'enter-real-estate') this.enterRealEstate();
    if (interaction === 'exit-real-estate') this.exitRealEstate();
    if (interaction === 'counter') this.openShopPanel();
    if (interaction === 'exit-shop') this.exitShop();
    if (interaction === 'enter-home') this.enterHome();
    if (interaction === 'exit-home') this.exitHome();
    if (interaction === 'place-starter-pot') this.placeStarterPot();
    if (interaction === 'select-basil-pot') this.selectBasilPot();
    if (interaction === 'place-growing-pot') this.prepareGrowingSlotPlacement();
    if (interaction === 'select-growing-pot' && this.selectedGrowingPotId) this.selectGrowingPot(this.selectedGrowingPotId);
    if (interaction === 'gardening-action') this.startGardeningAction();
  }

  private collectPot(): void {
    if (this.shopInterior || this.homeInterior || this.inventoryHasPot || !this.pot.visible || this.buySellUpgradeAnimating) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y) > 110) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'ordinary';
    this.inventoryInstanceId = OPENING_GOLDEN_POTHOS_INSTANCE_ID;
    this.pot.setVisible(false);
    this.progress.inventoryPot = 'ordinary';
    this.progress.inventoryItem = 'small-golden-pothos';
    this.progress.openingGoldenPothosCollected = true;
    // Collecting the first pot unlocks the opening job. Selling remains an
    // available transaction, but it is no longer the next required objective.
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Found a Small Golden Pothos.', 1600);
  }

  private collectRareBegonia(): void {
    if (this.shopInterior || this.homeInterior || this.inventoryHasPot || !this.rareBegonia.visible) return;
    if (this.progress.rareBegoniaCollected) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, RARE_BEGONIA_POSITION.x, RARE_BEGONIA_POSITION.y) > 115) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'ordinary';
    this.inventoryInstanceId = RARE_SPOTTED_BEGONIA_INSTANCE_ID;
    this.progress.inventoryPot = 'ordinary';
    this.progress.inventoryItem = 'rare-spotted-begonia';
    this.progress.inventoryInstanceId = RARE_SPOTTED_BEGONIA_INSTANCE_ID;
    this.progress.rareBegoniaCollected = true;
    this.rareBegonia.setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Found a Rare Spotted Begonia. Birch is buying it for 300 coins.', 2200);
  }

  private collectPlacedItem(): void {
    const placed = this.progress.placedWorldItem;
    if (this.shopInterior || this.homeInterior || this.inventoryHasPot || !placed || !this.placedItemDisplay?.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, placed.x, placed.y) > 110) return;

    this.inventoryHasPot = true;
    this.inventoryPot = placed.condition;
    this.inventoryInstanceId = placed.instanceId;
    this.progress.inventoryPot = placed.condition;
    this.progress.inventoryItem = placed.item;
    this.progress.inventoryInstanceId = placed.instanceId;
    this.progress.placedWorldItem = null;
    if (placed.condition === 'broken') {
      this.progress.brokenPotOwned = true;
      this.progress.brokenPotAvailable = false;
      this.progress.task = 'repair';
    } else if (placed.condition === 'repaired') {
      this.progress.task = 'sell-repaired';
    }
    this.placedItemDisplay.clear().setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast(`${this.getPlacedItemLabel(placed)} picked up.`, 1800);
  }

  private getPlacedItemLabel(item: Pick<PlacedWorldItem, 'item' | 'condition'>): string {
    if (item.item === 'small-golden-pothos') return 'Small Golden Pothos';
    if (item.item === 'rare-spotted-begonia') return 'Rare Spotted Begonia';
    return item.condition === 'repaired' ? 'Repaired pot' : 'Broken pot';
  }

  private selectBrokenPotPiece(): void {
    const pieceIndex = this.pendingBrokenPotPieceIndex;
    this.pendingBrokenPotPieceIndex = null;
    if (pieceIndex === null || this.progress.brokenPotPiecesCollected.includes(BROKEN_POT_PIECE_IDS[pieceIndex])) return;
    const position = this.getBrokenPotPiecePosition(pieceIndex);
    if (this.shopInterior || this.homeInterior || this.inventoryHasPot || !this.brokenPot.visible || this.progress.brokenPotPiecesRemaining <= 0) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > BROKEN_POT_PIECE_PICKUP_RANGE) return;
    this.selectedBrokenPotPieceIndex = pieceIndex;
    this.brokenPotPieceSelected = true;
    this.syncHudState();
    this.showToast(`Broken piece selected. Press B to pick it up (${this.progress.brokenPotPiecesRemaining} left).`, 1700);
  }

  private collectBrokenPotPiece(): void {
    const pieceIndex = this.selectedBrokenPotPieceIndex;
    if (pieceIndex === null || this.progress.brokenPotPiecesCollected.includes(BROKEN_POT_PIECE_IDS[pieceIndex])) return;
    const position = this.getBrokenPotPiecePosition(pieceIndex);
    if (this.shopInterior || this.homeInterior || !this.brokenPotPieceSelected || this.inventoryHasPot || !this.brokenPot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > BROKEN_POT_PIECE_PICKUP_RANGE) {
      this.showToast('Move closer to the broken piece first.', 1400);
      return;
    }

    this.audio.playToolUse();
    this.brokenPotPieceSelected = false;
    this.selectedBrokenPotPieceIndex = null;
    this.progress.brokenPotPiecesCollected.push(BROKEN_POT_PIECE_IDS[pieceIndex]);
    this.progress.brokenPotPiecesOwned = this.progress.brokenPotPiecesCollected.length;
    this.progress.brokenPotPiecesRemaining = BROKEN_POT_PIECE_COUNT - this.progress.brokenPotPiecesOwned;
    this.brokenPot.clear();
    drawBrokenPotPieces(this.brokenPot, 0, 0, BROKEN_POT_PIECES_SCALE, this.progress.brokenPotPiecesRemaining, BROKEN_POT_PIECE_OFFSETS, this.getCollectedBrokenPotPieceIndices());

    if (this.progress.brokenPotPiecesRemaining > 0) {
      this.saveProgress();
      this.syncHudState();
      this.showToast(`Piece added to the Bag (${this.progress.brokenPotPiecesOwned}/${BROKEN_POT_PIECE_COUNT}). Click the next piece, then press B.`, 1700);
      return;
    }

    this.inventoryHasPot = true;
    this.inventoryPot = 'broken';
    this.inventoryInstanceId = SPECIAL_REPAIR_POT_INSTANCE_ID;
    this.progress.brokenPotPiecesOwned = 0;
    this.progress.brokenPotPiecesCollected = [];
    this.progress.inventoryPot = 'broken';
    this.progress.inventoryItem = 'special-repair-pot';
    this.progress.brokenPotOwned = true;
    this.progress.brokenPotAvailable = false;
    this.progress.task = 'repair';
    this.brokenPot.setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('All pieces collected. Repair the pot from the Bag.');
  }

  private collectRepairedPot(): void {
    if (this.shopInterior || this.homeInterior || !this.repairPickupReady || !this.repairPotDisplay?.visible || this.inventoryPot !== 'broken') return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.repairPotDisplay.x, this.repairPotDisplay.y) > 110) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'repaired';
    this.inventoryInstanceId = this.inventoryInstanceId ?? SPECIAL_REPAIR_POT_INSTANCE_ID;
    this.progress.inventoryPot = 'repaired';
    this.progress.inventoryItem = 'special-repair-pot';
    this.progress.task = 'sell-repaired';
    this.repairPickupReady = false;
    this.repairPotDisplay.setVisible(false);
    this.repairPickupPrompt?.setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.scheduleGraphicsUpgradeAfterRepairedPickup();
    this.showToast(`Repaired pot added to the Bag. Sell it at ${BUY_SELL_NAME} for ${REPAIRED_POT_SALE_PRICE} coins.`);
  }

  private openShopPanel(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.cancelTapWalk();
    this.hud.showToast('');
    this.hud.openPanel('shop');
  }

  private enterShop(): void {
    if (this.shopInterior || this.homeInterior || this.shopTransitioning || this.buySellUpgradeAnimating) return;
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.setRepairPickupPresentationVisible(false);
    this.cancelTapWalk();
    this.streetPosition.set(this.player.x, this.player.y);
    this.streetZoomMode = this.zoomMode;
    setBuySellDoorOpen(this.buySellDoor!, true, this.progress.buildings['buy-sell'].graphicsEra);
    this.player.setAlpha(1);
    this.tweens.add({
      targets: this.player,
      x: BUY_SELL_ENTRANCE.x,
      y: BUY_SELL_DOOR_BOTTOM - 18,
      duration: 360,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          alpha: 0,
          duration: 220,
          ease: 'Quad.in',
          onComplete: () => {
            this.cameras.main.fadeOut(180, 7, 9, 10);
            this.time.delayedCall(180, () => this.enterShopNow());
          },
        });
      },
    });
  }

  private enterShopNow(): void {
    this.shopInterior = true;
    this.setObjectsVisible(this.streetObjects, false);
    this.shopObjects = [];
    this.shopGoldenPothosDisplay = [];
    this.shopPremiumPlantDisplay = [];
    this.drawShopInterior();
    this.player.setPosition(SHOP_PLAYER_START.x, SHOP_PLAYER_START.y).setAlpha(1).setVisible(true);
    this.zoomMode = 'normal';
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.setShopCamera();
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
    this.showToast(`Welcome to ${BUY_SELL_NAME}. I'm Birch. How can I help?`, 2200);
    this.persistDevSession();
  }

  private enterRealEstate(): void {
    if (this.shopInterior || this.homeInterior || this.shopTransitioning || !this.progress.windowJobComplete) return;
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.streetPosition.set(this.player.x, this.player.y);
    this.streetZoomMode = this.zoomMode;
    if (this.realEstateDoor) setRealEstateDoorOpen(this.realEstateDoor, true, this.progress.buildings['real-estate'].graphicsEra);
    this.tweens.add({ targets: this.player, x: REAL_ESTATE_ENTRANCE.x, y: REAL_ESTATE_DOOR_BOTTOM - 18, duration: 360, ease: 'Sine.inOut', onComplete: () => {
      this.player.setAlpha(0);
      this.shopInterior = true;
      this.realEstateInterior = true;
      this.setObjectsVisible(this.streetObjects, false);
      this.shopObjects = [];
      this.drawRealEstateInterior();
      this.player.setPosition(SHOP_PLAYER_START.x, SHOP_PLAYER_START.y).setAlpha(1).setVisible(true);
      this.zoomMode = 'normal';
      this.setShopCamera();
      this.shopTransitioning = false;
      this.showToast("Welcome to the Real Estate Agent. I'm Rose. Click me to view properties.", 2400);
    } });
  }

  private exitRealEstate(): void {
    if (!this.realEstateInterior || this.shopTransitioning) return;
    this.shopTransitioning = true;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.shopObjects.forEach((object) => object.destroy());
    this.shopObjects = [];
    this.shopkeeper = undefined;
    this.shopExitDoor = undefined;
    this.shopInterior = false;
    this.realEstateInterior = false;
    if (this.realEstateDoor) setRealEstateDoorOpen(this.realEstateDoor, false, this.progress.buildings['real-estate'].graphicsEra);
    this.setObjectsVisible(this.streetObjects, true);
    this.player.setPosition(REAL_ESTATE_ENTRANCE.x - 82, FRONT_PAVEMENT_MAX_Y - 18).setAlpha(1).setVisible(true);
    this.zoomMode = this.streetZoomMode;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.applyZoom(this.streetZoomMode);
    this.shopTransitioning = false;
  }

  private enterHome(): void {
    if (this.shopInterior || this.homeInterior || this.shopTransitioning || !this.rentalBondPaid || this.activeProperty === 'none') return;
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.setRepairPickupPresentationVisible(false);
    this.cancelTapWalk();
    this.streetPosition.set(this.player.x, this.player.y);
    this.streetZoomMode = this.zoomMode;
    this.player.setAlpha(1);
    const entrance = this.getActiveHomeEntrance();
    const doorBottom = this.activeProperty === 'second-rental' ? SECOND_RENTAL_DOOR_BOTTOM : APARTMENT_DOOR_BOTTOM;
    if (this.activeProperty === 'starter-apartment' && this.starterApartmentDoor) {
      setStarterApartmentDoorOpen(this.starterApartmentDoor, true);
    }
    this.tweens.add({
      targets: this.player,
      x: entrance.x,
      y: doorBottom - 18,
      duration: 360,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          alpha: 0,
          duration: 220,
          ease: 'Quad.in',
          onComplete: () => {
            this.cameras.main.fadeOut(180, 7, 9, 10);
            this.time.delayedCall(180, () => this.enterHomeNow());
          },
        });
      },
    });
  }

  private enterHomeNow(): void {
    this.homeInterior = true;
    this.setObjectsVisible(this.streetObjects, false);
    this.homeObjects = [];
    this.drawHomeInterior();
    const homeStart = this.activeProperty === 'second-rental' ? SECOND_HOME_PLAYER_START : HOME_PLAYER_START;
    this.player.setPosition(homeStart.x, homeStart.y).setAlpha(1).setVisible(true);
    this.zoomMode = 'normal';
    this.basilPotSelected = false;
    this.selectedGrowingPotId = null;
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.setHomeCamera();
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
    this.persistDevSession();
  }

  private exitShop(): void {
    if (!this.shopInterior || this.shopTransitioning || this.shopTransactionBusy) return;
    this.showToast('Thank you, come again!', 1800);
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.cancelTapWalk();
    if (this.shopExitDoor) drawMatchingDoor(this.shopExitDoor, SHOP_EXIT.x, SHOP_EXIT_DOOR_TOP, SHOP_EXIT_DOOR_WIDTH, SHOP_EXIT_DOOR_HEIGHT, true, this.progress.buildings['buy-sell'].graphicsEra);
    this.tweens.add({
      targets: this.player,
      x: SHOP_EXIT.x,
      y: SHOP_EXIT_DOOR_BOTTOM - 18,
      duration: 280,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          alpha: 0,
          duration: 180,
          ease: 'Quad.in',
          onComplete: () => {
            this.cameras.main.fadeOut(120, 7, 9, 10);
            this.time.delayedCall(120, () => this.exitShopNow());
          },
        });
      },
    });
  }

  private exitShopNow(): void {
    this.shopObjects.forEach((object) => object.destroy());
    this.shopObjects = [];
    this.shopkeeper = undefined;
    this.shopExitDoor = undefined;
    this.shopGoldenPothosDisplay = [];
    this.shopPremiumPlantDisplay = [];
    this.shopInterior = false;
    const completeRasterUpgrade = this.progress.buySellRasterUpgradePending
      && this.progress.windowJobAccepted
      && this.progress.buildings['buy-sell'].graphicsEra === 'green-crt';
    setBuySellDoorOpen(this.buySellDoor!, false, this.progress.buildings['buy-sell'].graphicsEra);
    this.setObjectsVisible(this.streetObjects, true);
    this.player.setPosition(BUY_SELL_ENTRANCE.x - 82, FRONT_PAVEMENT_MAX_Y - 18).setAlpha(1).setVisible(true);
    this.setRepairPickupPresentationVisible(this.repairPickupReady);
    this.updateProgressVisuals();
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.zoomMode = this.streetZoomMode;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.applyZoom(this.streetZoomMode);
    this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
    if (completeRasterUpgrade) {
      this.buySellUpgradeAnimating = true;
      this.time.delayedCall(1200, () => {
        if (!this.progress.buySellRasterUpgradePending) {
          this.buySellUpgradeAnimating = false;
          return;
        }
        this.progress.buildings['buy-sell'].graphicsEra = 'atari-bw';
        this.progress.buySellRasterUpgradePending = false;
        this.saveProgress();
        this.rebuildBuySellArtwork();
        this.presentBuySellRasterUpgrade();
      });
    }
    this.persistDevSession();
  }

  private presentBuySellRasterUpgrade(): void {
    this.buySellUpgradeAnimating = true;
    this.buySellArtworkObjects.forEach((object) => {
      const display = object as Phaser.GameObjects.GameObject & { setAlpha?: (alpha: number) => void };
      display.setAlpha?.(0.2);
      this.tweens.add({
        targets: object,
        alpha: 1,
        duration: 190,
        yoyo: true,
        repeat: 2,
        onComplete: () => display.setAlpha?.(1),
      });
    });
    const view = this.cameras.main.worldView;
    const notice = this.add.text(view.centerX, view.top + 48 / this.cameras.main.zoom, 'BUY/SELL MONOCHROME RASTER ONLINE', {
      color: '#f6f7f3', fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold',
      backgroundColor: '#111416', padding: { left: 8, right: 8, top: 5, bottom: 5 },
    }).setOrigin(0.5, 0).setDepth(40);
    this.time.delayedCall(1200, () => {
      this.buySellArtworkObjects.forEach((object) => {
        const display = object as Phaser.GameObjects.GameObject & { setAlpha?: (alpha: number) => void };
        display.setAlpha?.(1);
      });
      this.buySellUpgradeAnimating = false;
      notice.destroy();
    });
  }

  private exitHome(): void {
    if (!this.homeInterior || this.shopTransitioning) return;
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.cancelTapWalk();
    if (this.homeExitDoor) drawMatchingDoor(this.homeExitDoor, HOME_EXIT.x, HOME_EXIT_DOOR_TOP, HOME_EXIT_DOOR_WIDTH, HOME_EXIT_DOOR_HEIGHT, true, this.activeProperty === 'starter-apartment' ? 'green-crt' : 'atari-bw');
    this.tweens.add({
      targets: this.player,
      x: HOME_EXIT.x,
      y: HOME_EXIT_DOOR_BOTTOM - 18,
      duration: 280,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          alpha: 0,
          duration: 180,
          ease: 'Quad.in',
          onComplete: () => {
            this.cameras.main.fadeOut(120, 7, 9, 10);
            this.time.delayedCall(120, () => this.exitHomeNow());
          },
        });
      },
    });
  }

  private exitHomeNow(): void {
    this.homeObjects.forEach((object) => object.destroy());
    this.homeObjects = [];
    this.homeExitDoor = undefined;
    this.homeWelcomeGiftObjects = [];
    this.basilPot = undefined;
    this.basilWaterEffect = undefined;
    this.homeInterior = false;
    this.basilPotSelected = false;
    this.selectedGrowingPotId = null;
    this.setObjectsVisible(this.streetObjects, true);
    if (this.starterApartmentDoor) setStarterApartmentDoorOpen(this.starterApartmentDoor, false);
    const entrance = this.getActiveHomeEntrance();
    this.player.setPosition(entrance.x, FRONT_PAVEMENT_MAX_Y - 18).setAlpha(1).setVisible(true);
    this.setRepairPickupPresentationVisible(this.repairPickupReady);
    this.updateProgressVisuals();
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.zoomMode = this.streetZoomMode;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.applyZoom(this.streetZoomMode);
    this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
    this.persistDevSession();
  }

  private setShopCamera(): void {
    const fittedZoom = Math.min(
      this.scale.width / SHOP_WORLD_WIDTH,
      this.scale.height / SHOP_WORLD_HEIGHT,
    );
    // The square room fits the square portrait gameplay viewport while
    // retaining a small minimum scale on very short phones.
    const portraitPhone = this.isPortraitPhoneViewport() && this.scale.width <= 680;
    const normalZoom = portraitPhone ? Math.max(0.34, fittedZoom) : Math.max(0.25, fittedZoom);
    const zoom = this.zoomMode === 'close' ? normalZoom * 1.9 : normalZoom;
    this.cameras.main.setBounds(0, 0, SHOP_WORLD_WIDTH, SHOP_WORLD_HEIGHT);
    this.cameras.main.setZoom(zoom);
    const followLerp = this.zoomMode === 'close' ? 0.2 : 0.14;
    this.cameras.main.startFollow(this.player, true, followLerp, followLerp, 0, 0);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
    this.hud.setZoomMode(this.zoomMode);
  }

  private setHomeCamera(): void {
    const worldWidth = this.getActiveHomeWorldWidth();
    const worldHeight = this.getActiveHomeWorldHeight();
    // Keep the same scale as the square starter room. The wider second
    // rental therefore becomes the first interior that can pan horizontally.
    const fittedZoom = Math.min(
      this.scale.width / HOME_WORLD_WIDTH,
      this.scale.height / HOME_WORLD_HEIGHT,
    );
    const portraitPhone = this.isPortraitPhoneViewport() && this.scale.width <= 680;
    const normalZoom = portraitPhone ? Math.max(0.34, fittedZoom) : Math.max(0.25, fittedZoom);
    const zoom = this.zoomMode === 'close' ? normalZoom * 1.9 : normalZoom;
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(zoom);
    const followLerp = this.zoomMode === 'close' ? 0.2 : 0.14;
    this.cameras.main.startFollow(this.player, true, followLerp, followLerp, 0, 0);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
    this.hud.setZoomMode(this.zoomMode);
  }

  private getActiveHomeWorldWidth(): number {
    return this.activeProperty === 'second-rental' ? SECOND_HOME_WORLD_WIDTH : HOME_WORLD_WIDTH;
  }

  private getActiveHomeWorldHeight(): number {
    return this.activeProperty === 'second-rental' ? SECOND_HOME_WORLD_HEIGHT : HOME_WORLD_HEIGHT;
  }

  private isWithinShopCounterRange(): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, SHOP_COUNTER_APPROACH.x, SHOP_COUNTER_APPROACH.y) <= 110;
  }

  private setObjectsVisible(objects: Phaser.GameObjects.GameObject[], visible: boolean): void {
    objects.forEach((object) => {
      const displayObject = object as Phaser.GameObjects.GameObject & { setVisible?: (value: boolean) => void };
      displayObject.setVisible?.(visible);
    });
  }

  private drawRealEstateInterior(): void {
    const era = this.progress.buildings['real-estate'].graphicsEra;
    const greenCrt = era === 'green-crt';
    const colour = era === 'atari-colour';
    const lineColour = greenCrt ? 0x39ff5a : colour ? 0xf2e5c7 : 0xf6f7f3;
    const cssColour = greenCrt ? '#39ff5a' : colour ? '#f2e5c7' : '#f6f7f3';
    const room = this.add.graphics().setDepth(-100);
    room.fillStyle(greenCrt ? 0x050906 : colour ? 0x173a55 : 0x252a2d, 1).fillRect(0, 0, SHOP_WORLD_WIDTH, SHOP_WORLD_HEIGHT);
    room.lineStyle(5, lineColour, 0.95).strokeRect(40, 80, SHOP_WORLD_WIDTH - 80, SHOP_WORLD_HEIGHT - 130);
    room.lineStyle(2, lineColour, 0.45);
    for (let x = 90; x < 850; x += 95) room.lineBetween(x, 100, x, 500);
    this.shopObjects.push(room);

    const displays = this.add.graphics().setDepth(3);
    displays.lineStyle(4, lineColour, 0.9).strokeRect(105, 165, 270, 270).strokeRect(525, 165, 270, 270);
    for (const baseX of [125, 545]) {
      for (let index = 0; index < 4; index += 1) {
        const px = baseX + (index % 2) * 125;
        const py = 190 + Math.floor(index / 2) * 112;
        displays.strokeRect(px, py, 104, 88);
        displays.lineBetween(px + 12, py + 67, px + 52, py + 30);
        displays.lineBetween(px + 52, py + 30, px + 92, py + 67);
      }
    }
    this.shopObjects.push(displays);

    const counter = this.add.graphics().setDepth(5);
    counter.fillStyle(0x071008, 1).fillRect(SHOP_COUNTER.x - SHOP_COUNTER_WIDTH / 2, SHOP_COUNTER.y - SHOP_COUNTER_HEIGHT / 2, SHOP_COUNTER_WIDTH, SHOP_COUNTER_HEIGHT);
    counter.lineStyle(5, lineColour, 1).strokeRect(SHOP_COUNTER.x - SHOP_COUNTER_WIDTH / 2, SHOP_COUNTER.y - SHOP_COUNTER_HEIGHT / 2, SHOP_COUNTER_WIDTH, SHOP_COUNTER_HEIGHT);
    this.shopObjects.push(counter);

    this.shopkeeper = this.add.graphics().setDepth(6).setPosition(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
    this.shopkeeper.lineStyle(5, lineColour, 1).strokeRect(-28, -66, 56, 66);
    this.shopkeeper.fillStyle(lineColour, 1).fillRect(-18, -49, 7, 7).fillRect(11, -49, 7, 7);
    this.shopObjects.push(this.shopkeeper);

    this.shopExitDoor = this.add.graphics().setDepth(4);
    drawMatchingDoor(this.shopExitDoor, SHOP_EXIT.x, SHOP_EXIT_DOOR_TOP, SHOP_EXIT_DOOR_WIDTH, SHOP_EXIT_DOOR_HEIGHT, false, greenCrt ? 'green-crt' : 'atari-bw');
    this.shopObjects.push(this.shopExitDoor);
    const title = this.add.text(450, 125, 'REAL ESTATE AGENT · ROSE', { color: cssColour, fontFamily: SHOP_LABEL_FONT, fontSize: '30px', fontStyle: 'bold', backgroundColor: greenCrt ? '#050906' : colour ? '#173a55' : '#111416', padding: { left: 8, right: 8, top: 4, bottom: 4 } }).setOrigin(0.5).setDepth(7).setResolution(Math.max(2, window.devicePixelRatio || 1));
    const prompt = this.add.text(450, SHOP_COUNTER.y + 24, 'CLICK ROSE', { color: cssColour, fontFamily: SHOP_LABEL_FONT, fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7).setResolution(Math.max(2, window.devicePixelRatio || 1));
    this.shopObjects.push(title, prompt);
  }

  private drawShopInterior(): void {
    const graphicsEra = this.progress.buildings['buy-sell'].graphicsEra;
    const upgraded = graphicsEra === 'atari-colour';
    const greenCrt = graphicsEra === 'green-crt';
    const outerWall = upgraded ? 0x173a55 : greenCrt ? 0x030805 : 0x252a2d;
    const innerWall = upgraded ? 0xb85b38 : greenCrt ? 0x050d07 : 0x454c4e;
    const fixtureDark = upgraded ? 0x0c2b42 : greenCrt ? 0x030805 : 0x111416;
    const fixtureMid = upgraded ? 0x337d78 : greenCrt ? 0x123d1b : 0x858d8d;
    const fixtureLight = upgraded ? 0xf2e5c7 : greenCrt ? 0x39ff5a : 0xf6f7f3;
    const room = this.add.graphics().setDepth(-100);
    room.fillStyle(outerWall, 1).fillRect(0, 0, SHOP_WORLD_WIDTH, SHOP_WORLD_HEIGHT);
    room.fillStyle(innerWall, 1).fillRect(40, 80, SHOP_WORLD_WIDTH - 80, SHOP_WORLD_HEIGHT - 130);
    room.lineStyle(8, fixtureLight, 0.95).strokeRect(40, 80, SHOP_WORLD_WIDTH - 80, SHOP_WORLD_HEIGHT - 130);
    room.lineStyle(greenCrt ? 2 : 3, upgraded ? 0x713a32 : greenCrt ? 0x16752a : 0x697271, 0.9);
    for (let x = 70; x < SHOP_WORLD_WIDTH - 50; x += 70) room.lineBetween(x, 90, x, SHOP_WORLD_HEIGHT - 70);
    this.shopObjects.push(room);

    const shelves = this.add.graphics().setDepth(3);
    shelves.fillStyle(fixtureDark, 1);
    SHOP_SHELVES.forEach((shelf) => shelves.fillRect(shelf.x, shelf.y, shelf.width, shelf.height));
    shelves.lineStyle(5, fixtureLight, 1);
    SHOP_SHELVES.forEach((shelf) => {
      for (const shelfY of [shelf.y + 58, shelf.y + 126, shelf.y + 194, shelf.y + shelf.height]) {
        shelves.lineBetween(shelf.x + 12, shelfY, shelf.x + shelf.width - 12, shelfY);
      }
    });
    this.shopObjects.push(shelves);
    this.createShopFutureDisplayItems();
    this.createShopGoldenPothosDisplay();

    const counter = this.add.graphics().setDepth(5);
    const counterLeft = SHOP_COUNTER.x - SHOP_COUNTER_WIDTH / 2;
    const counterTop = SHOP_COUNTER.y - SHOP_COUNTER_HEIGHT / 2;
    counter.fillStyle(fixtureDark, 1).fillRect(counterLeft, counterTop, SHOP_COUNTER_WIDTH, SHOP_COUNTER_HEIGHT);
    counter.fillStyle(fixtureMid, 1).fillRect(counterLeft + 18, counterTop + 18, SHOP_COUNTER_WIDTH - 36, 26);
    counter.lineStyle(5, fixtureLight, 0.95).strokeRect(counterLeft, counterTop, SHOP_COUNTER_WIDTH, SHOP_COUNTER_HEIGHT);
    this.shopObjects.push(counter);

    this.shopkeeper = this.add.graphics().setDepth(6);
    this.shopkeeper.setPosition(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
    this.drawShopkeeper(false);
    this.shopObjects.push(this.shopkeeper);

    this.shopExitDoor = this.add.graphics().setDepth(4);
    drawMatchingDoor(this.shopExitDoor, SHOP_EXIT.x, SHOP_EXIT_DOOR_TOP, SHOP_EXIT_DOOR_WIDTH, SHOP_EXIT_DOOR_HEIGHT, false, graphicsEra);
    this.shopObjects.push(this.shopExitDoor);

    const labels = [
      { text: BUY_SELL_SIGN_NAME, x: SHOP_COUNTER.x, y: 125, size: '34px' },
    ];
    labels.forEach(({ text, x, y, size }) => {
      const label = this.add.text(x, y, text, {
        color: upgraded ? '#f2e5c7' : '#f6f7f3', fontFamily: SHOP_LABEL_FONT, fontSize: size, fontStyle: 'bold',
        backgroundColor: upgraded ? '#0c2b42' : '#111416', padding: { left: 7, right: 7, top: 4, bottom: 4 },
      }).setOrigin(0.5).setDepth(7).setResolution(Math.max(2, window.devicePixelRatio || 1));
      this.shopObjects.push(label);
    });
    const counterInstruction = this.add.text(
      SHOP_COUNTER.x,
      SHOP_COUNTER.y + 24,
      'CLICK CLERK',
      {
        color: upgraded ? '#f2e5c7' : '#f6f7f3',
        fontFamily: SHOP_LABEL_FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        align: 'center',
      },
    ).setOrigin(0.5).setDepth(7).setResolution(Math.max(2, window.devicePixelRatio || 1));
    this.shopObjects.push(counterInstruction);
  }

  private drawShopkeeper(seated: boolean): void {
    if (!this.shopkeeper) return;
    // The first independent building pass leaves the NPC in Atari B&W.
    const scale = 1;
    const width = 56 * scale;
    const height = 66 * scale;
    const top = -height;
    this.shopkeeper.clear();
    this.shopkeeper.fillStyle(0xf6f7f3, 1).fillRect(-width / 2, top, width, height);
    this.shopkeeper.lineStyle(4, 0x111416, 1).strokeRect(-width / 2, top, width, height);
    this.shopkeeper.fillStyle(0x111416, 1)
      .fillRect(-20 * scale, top + 18 * scale, 8 * scale, 8 * scale)
      .fillRect(12 * scale, top + 18 * scale, 8 * scale, 8 * scale);
    if (seated) {
      this.shopkeeper.lineStyle(4, 0x858d8d, 1).lineBetween(-width / 2, 0, width / 2, 0);
    }
  }

  private getShopkeeperHandPosition(): Phaser.Math.Vector2 {
    if (!this.shopkeeper) return new Phaser.Math.Vector2(SHOP_HANDOVER_POINT.x, SHOP_HANDOVER_POINT.y);
    const scale = 1;
    return new Phaser.Math.Vector2(this.shopkeeper.x + 34 * scale, this.shopkeeper.y - 30 * scale);
  }

  private drawHarvestCarry(g: Phaser.GameObjects.Graphics, species: PlantSpecies): void {
    const definition = getPlantDefinition(species);
    const leaf = species === 'mint' ? 0xbfc5c3 : 0xd8dddc;
    g.clear();
    if (definition.yieldMode === 'whole-plant') {
      drawGrowingCrop(g, 0, 12, species, 'mature', 0.68, this.progress.graphicsUpgradeInstalled);
      return;
    }
    g.fillStyle(0x111416, 1).fillRect(-26, 8, 52, 8);
    g.lineStyle(2, 0xf6f7f3, 1).strokeRect(-26, 8, 52, 8);
    g.fillStyle(leaf, 1)
      .fillEllipse(-14, 0, 18, 9)
      .fillEllipse(0, -7, 20, 10)
      .fillEllipse(15, 1, 18, 9)
      .fillEllipse(-2, 7, 18, 9);
    g.lineStyle(2, 0x697173, 1).lineBetween(-18, 8, 1, -5).lineBetween(0, 8, 15, 1);
  }

  private drawShopkeeperCarry(item: ShopPresentationItem): void {
    if (!this.shopkeeper) return;
    this.shopkeeperCarry?.destroy();
    this.shopkeeperCarryLabel?.destroy();
    this.shopkeeperCarry = this.add.graphics().setDepth(8);
    if (item === 'snake-plant' || item === 'monstera' || item === 'variegated-pothos') this.drawPremiumPlant(this.shopkeeperCarry, item, 0, 12, 0.52);
    else if (item === 'small-golden-pothos') drawGoldenPothos(this.shopkeeperCarry, 0, 12, 0.34, this.progress.graphicsUpgradeInstalled);
    else if (item === 'rare-spotted-begonia') drawRareSpottedBegonia(this.shopkeeperCarry, 0, 12, 0.34, this.progress.graphicsUpgradeInstalled);
    else if (item === 'special-repair-pot') drawBrokenPot(this.shopkeeperCarry, 0, 12, 0.72, 10, this.progress.graphicsUpgradeInstalled);
    else if (isPlantProductItem(item)) this.drawHarvestCarry(this.shopkeeperCarry, getPlantDefinitionByProduct(item).species);
    else if (item === 'small-basic-plastic-pot') drawPot(this.shopkeeperCarry, 0, 12, 0.62, this.progress.graphicsUpgradeInstalled);
    else if (item === 'basic-fertilizer-box') {
      this.shopkeeperCarry.fillStyle(0xd8dddc, 1).fillRect(-25, -15, 50, 34);
      this.shopkeeperCarry.lineStyle(3, 0x111416, 1).strokeRect(-25, -15, 50, 34);
      this.shopkeeperCarry.fillStyle(0x697173, 1).fillCircle(-12, 1, 4).fillCircle(0, -4, 4).fillCircle(12, 1, 4);
      this.shopkeeperCarry.lineStyle(2, 0x111416, 1).lineBetween(-18, -8, 18, -8);
    }
    else {
      this.shopkeeperCarry.fillStyle(0xf6f7f3, 1).fillRect(-24, -14, 48, 30);
      this.shopkeeperCarry.lineStyle(3, 0x111416, 1).strokeRect(-24, -14, 48, 30);
      this.shopkeeperCarry.fillStyle(0x697173, 1).fillRect(-15, -5, 30, 4);
    }
    this.shopkeeperCarryLabel = this.add.text(0, 30, '×1', {
      color: '#f6f7f3', fontFamily: SHOP_LABEL_FONT, fontSize: '17px', fontStyle: 'bold',
      backgroundColor: '#111416', padding: { left: 5, right: 5, top: 3, bottom: 3 },
    }).setOrigin(0.5).setDepth(9).setResolution(Math.max(2, window.devicePixelRatio || 1));
    this.updateShopkeeperCarryPosition();
  }

  private updateShopkeeperCarryPosition(): void {
    if (!this.shopkeeperCarry || !this.shopkeeper) return;
    const hand = this.getShopkeeperHandPosition();
    this.shopkeeperCarry.setPosition(hand.x, hand.y);
    this.shopkeeperCarryLabel?.setPosition(hand.x, hand.y + 30);
  }

  private clearShopkeeperCarry(): void {
    this.shopkeeperCarry?.destroy();
    this.shopkeeperCarryLabel?.destroy();
    this.shopkeeperCarry = undefined;
    this.shopkeeperCarryLabel = undefined;
  }

  private getShopShelfPosition(stockId: string): Phaser.Math.Vector2 {
    const slot = this.getShopShelfSlot(stockId);
    return new Phaser.Math.Vector2(slot.x, slot.y - 12);
  }

  private getShopShelfSlot(stockId: string): { x: number; y: number } {
    const index = Math.max(0, this.progress.shopStock.findIndex((entry) => entry.stockId === stockId));
    return SHOP_SHELF_SLOTS[PREMIUM_PLANT_CATALOG.length + index] ?? SHOP_SHELF_SLOTS[SHOP_SHELF_SLOTS.length - 1];
  }

  private getShopItemShelfPosition(item: ShopStockItem): Phaser.Math.Vector2 {
    const entry = this.progress.shopStock.find((candidate) => candidate.item === item && candidate.quantity > 0);
    const fallback = SHOP_SHELF_SLOTS[SHOP_SHELF_SLOTS.length - 1];
    return entry ? this.getShopShelfPosition(entry.stockId) : new Phaser.Math.Vector2(fallback.x, fallback.y - 12);
  }

  private startShopkeeperTransaction(
    item: ShopPresentationItem,
    quantity: number,
    direction: ShopTransactionDirection,
    source: Phaser.Math.Vector2,
    feedback: string,
  ): void {
    if (!this.shopInterior || this.shopTransactionBusy) return;
    this.queueShopkeeperTransaction(item, quantity, direction, source, feedback);
  }

  private queueShopkeeperTransaction(
    item: ShopPresentationItem,
    quantity: number,
    direction: ShopTransactionDirection,
    source: Phaser.Math.Vector2,
    feedback: string,
  ): void {
    if (!this.shopInterior || this.shopTransactionBusy) return;
    this.pendingShopkeeperTransactions.push({
      item,
      quantity,
      direction,
      source: source.clone(),
      feedback,
    });
  }

  private beginNextPendingShopkeeperTransaction(): void {
    if (this.modalOpen || !this.shopInterior || this.shopTransactionBusy) return;
    const transaction = this.pendingShopkeeperTransactions.shift();
    if (!transaction) return;
    this.beginShopkeeperTransaction(
      transaction.item,
      transaction.quantity,
      transaction.direction,
      transaction.source,
      transaction.feedback,
    );
  }

  private getShopkeeperAnimationScale(): number {
    const era = this.progress.buildings['buy-sell'].graphicsEra;
    const presentationScale = era === 'atari-bw' ? 1.2 : era === 'atari-colour' ? 0.8 : 1;
    return presentationScale * 1.35;
  }

  private beginShopkeeperTransaction(
    item: ShopPresentationItem,
    quantity: number,
    direction: ShopTransactionDirection,
    source: Phaser.Math.Vector2,
    feedback: string,
  ): void {
    if (!this.shopInterior || this.shopTransactionBusy) return;
    if (!this.shopkeeper) {
      this.refreshShopStockDisplay();
      this.showToast(feedback, 1800);
      this.beginNextPendingShopkeeperTransaction();
      return;
    }
    this.shopTransactionBusy = true;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.cancelToolUse(true);
    this.clearInteractionHighlight();
    this.destinationMarker.setVisible(false);
    this.showToast('Shopkeeper is handling the transaction…', 1800);

    const handover = new Phaser.Math.Vector2(SHOP_HANDOVER_POINT.x, SHOP_HANDOVER_POINT.y);
    const home = new Phaser.Math.Vector2(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
    const animationScale = this.getShopkeeperAnimationScale();
    const firstStop = direction === 'buy' ? source : handover;
    const secondStop = direction === 'buy' ? handover : source;
    const finish = (): void => {
      this.shopkeeperTransactionTween = this.tweens.add({
        targets: this.shopkeeper,
        x: home.x,
        y: home.y,
        duration: 360 * animationScale,
        ease: 'Sine.inOut',
        onUpdate: () => this.updateShopkeeperCarryPosition(),
        onComplete: () => {
          this.clearShopkeeperCarry();
          this.shopkeeperTransactionTween = undefined;
          this.shopTransactionBusy = false;
          this.hud.resetHeldInputs();
          this.refreshShopStockDisplay();
          this.showToast(feedback, 1800);
          this.updateInteraction();
          this.beginNextPendingShopkeeperTransaction();
        },
      });
    };
    const moveToSecond = (): void => {
      this.shopkeeperTransactionTween = this.tweens.add({
        targets: this.shopkeeper,
        x: secondStop.x,
        y: secondStop.y,
        duration: 520 * animationScale,
        ease: 'Sine.inOut',
        onUpdate: () => this.updateShopkeeperCarryPosition(),
        onComplete: () => {
          this.clearShopkeeperCarry();
          finish();
        },
      });
    };
    this.shopkeeperTransactionTween = this.tweens.add({
      targets: this.shopkeeper,
      x: firstStop.x,
      y: firstStop.y,
      duration: 420 * animationScale,
      ease: 'Sine.inOut',
      onUpdate: () => this.updateShopkeeperCarryPosition(),
      onComplete: () => {
        if (direction === 'buy' && !item.endsWith('-seeds') && item !== 'small-basic-plastic-pot' && item !== 'basic-fertilizer-box') {
          // The authoritative stock was already decremented before the
          // animation. Remove the shelf representation at pickup time so the
          // carried representative is not duplicated during the handover.
          this.refreshShopStockDisplay();
        }
        this.drawShopkeeperCarry(item);
        if (this.shopkeeperCarryLabel) this.shopkeeperCarryLabel.setText(`×${quantity}`);
        moveToSecond();
      },
    });
  }

  private drawHomeInterior(): void {
    const growingSpots = this.getActiveGrowingSpots();
    const secondRental = this.activeProperty === 'second-rental';
    const starterGreen = !secondRental;
    const roomBackground = starterGreen ? 0x030805 : 0x314246;
    const roomSurface = starterGreen ? 0x050d07 : 0x454c4e;
    const roomLine = starterGreen ? 0x39ff5a : 0xf6f7f3;
    const worldWidth = this.getActiveHomeWorldWidth();
    const worldHeight = this.getActiveHomeWorldHeight();
    const room = this.add.graphics().setDepth(-100);
    room.fillStyle(roomBackground, 1).fillRect(0, 0, worldWidth, worldHeight);
    room.fillStyle(roomSurface, 1).fillRect(48, 80, worldWidth - 96, worldHeight - 128);
    room.lineStyle(starterGreen ? 4 : 8, roomLine, 0.95).strokeRect(48, 80, worldWidth - 96, worldHeight - 128);
    room.lineStyle(3, 0x697271, 0.8).lineBetween(48, 500, worldWidth - 48, 500);
    if (secondRental) {
      room.lineStyle(6, 0x9aa5a3, 0.9).lineBetween(600, 120, 600, 490);
      room.fillStyle(0x1d2527, 0.9).fillRect(82, 112, 480, 34).fillRect(638, 112, 480, 34);
      this.homeObjects.push(this.add.text(322, 129, 'LIVING ROOM', {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold',
        stroke: '#07090a', strokeThickness: 5, backgroundColor: '#111416', padding: { left: 7, right: 7, top: 4, bottom: 4 },
      }).setOrigin(0.5).setDepth(7));
      this.homeObjects.push(this.add.text(878, 129, 'GROWING ROOM · 6 POSITIONS', {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold',
        stroke: '#07090a', strokeThickness: 5, backgroundColor: '#111416', padding: { left: 7, right: 7, top: 4, bottom: 4 },
      }).setOrigin(0.5).setDepth(7));
    }
    this.homeObjects.push(room);

    const windowX = secondRental ? 930 : 610;
    const window = this.add.graphics().setDepth(3);
    window.fillStyle(0x111416, 1).fillRect(windowX, 180, 190, 150);
    window.lineStyle(starterGreen ? 3 : 5, roomLine, 1).strokeRect(windowX, 180, 190, 150);
    window.lineStyle(3, 0x858d8d, 1).lineBetween(windowX + 95, 180, windowX + 95, 330).lineBetween(windowX, 255, windowX + 190, 255);
    this.homeObjects.push(window);

    const growTable = this.add.graphics().setDepth(3);
    const firstSlot = growingSpots[0];
    const lastSlot = growingSpots[growingSpots.length - 1];
    const tableLeft = firstSlot.x - 48;
    const tableRight = lastSlot.x + 48;
    growTable.fillStyle(0x111416, 1).fillRect(tableLeft, firstSlot.y - 42, tableRight - tableLeft, 84);
    growTable.lineStyle(4, roomLine, 0.95).strokeRect(tableLeft, firstSlot.y - 42, tableRight - tableLeft, 84);
    growingSpots.forEach((spot) => {
      growTable.fillStyle(0x697271, 1).fillRect(spot.x - 38, spot.y - 27, 76, 54);
      growTable.lineStyle(3, roomLine, 0.95).strokeRect(spot.x - 38, spot.y - 27, 76, 54);
    });
    this.homeObjects.push(growTable);
    growingSpots.forEach((spot, index) => {
      const slotLabel = this.add.text(spot.x, spot.y + 31, `SLOT ${index + 1}`, {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold',
        stroke: '#07090a', strokeThickness: 4, backgroundColor: '#111416', padding: { left: 5, right: 5, top: 3, bottom: 3 },
      }).setOrigin(0.5).setDepth(7);
      this.homeObjects.push(slotLabel);
    });

    this.growingPotDisplays.clear();
    this.progress.growingPots.forEach((pot) => {
      const display = this.add.graphics().setDepth(5);
      this.growingPotDisplays.set(pot.id, display);
      this.homeObjects.push(display);
      if (pot.id === STARTER_GROWING_POT_ID) this.basilPot = display;
    });
    this.basilWaterEffect = this.add.graphics().setDepth(6).setVisible(false);
    this.homeObjects.push(this.basilWaterEffect);
    this.updateBasilVisual();

    this.homeExitDoor = this.add.graphics().setDepth(4);
    drawMatchingDoor(this.homeExitDoor, HOME_EXIT.x, HOME_EXIT_DOOR_TOP, HOME_EXIT_DOOR_WIDTH, HOME_EXIT_DOOR_HEIGHT, false, starterGreen ? 'green-crt' : 'atari-bw');
    this.homeObjects.push(this.homeExitDoor);

    const labels = [
      { text: secondRental ? 'TWO-ROOM RENTAL' : 'YOUR RENTAL', x: worldWidth / 2, y: 112, size: '32px' },
      { text: 'GROW TABLE', x: (firstSlot.x + lastSlot.x) / 2, y: firstSlot.y + 70, size: '22px' },
      { text: 'WINDOW', x: windowX + 95, y: 356, size: '22px' },
      { text: 'EXIT', x: HOME_EXIT.x, y: HOME_EXIT.y + 28, size: '22px' },
    ];
    labels.forEach(({ text, x, y, size }) => {
      const label = this.add.text(x, y, text, {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: size, fontStyle: 'bold',
        stroke: '#07090a', strokeThickness: 5, backgroundColor: '#111416', padding: { left: 7, right: 7, top: 4, bottom: 4 },
      }).setOrigin(0.5).setDepth(7);
      this.homeObjects.push(label);
    });
    this.drawHomeInteriorWelcomeGift();
  }

  private drawHomeInteriorWelcomeGift(): void {
    this.homeWelcomeGiftObjects.forEach((object) => object.destroy());
    this.homeWelcomeGiftObjects = [];
    if (!this.homeInterior || this.activeProperty === 'second-rental') return;
    const kit = this.add.graphics().setDepth(4);
    kit.fillStyle(0x111416, 1).fillRect(HOME_WELCOME_GIFT.x - 95, HOME_WELCOME_GIFT.y - 46, 190, 72);
    kit.lineStyle(4, 0xf6f7f3, 0.95).strokeRect(HOME_WELCOME_GIFT.x - 95, HOME_WELCOME_GIFT.y - 46, 190, 72);
    kit.fillStyle(0x697271, 1).fillRect(HOME_WELCOME_GIFT.x - 72, HOME_WELCOME_GIFT.y - 23, 34, 24);
    kit.lineStyle(2, 0xf6f7f3, 0.9).strokeRect(HOME_WELCOME_GIFT.x - 72, HOME_WELCOME_GIFT.y - 23, 34, 24);
    kit.fillStyle(0x858d8d, 1).fillRect(HOME_WELCOME_GIFT.x - 10, HOME_WELCOME_GIFT.y - 23, 42, 24);
    kit.fillStyle(0xd8dddc, 1).fillRect(HOME_WELCOME_GIFT.x + 50, HOME_WELCOME_GIFT.y - 28, 10, 34);
    this.homeWelcomeGiftObjects.push(kit);
    const label = this.add.text(HOME_WELCOME_GIFT.x, HOME_WELCOME_GIFT.y + 42,
      'POVO WELCOME GIFT · DELIVERED', {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold',
        stroke: '#07090a', strokeThickness: 5, backgroundColor: '#111416', padding: { left: 7, right: 7, top: 5, bottom: 5 },
      }).setOrigin(0.5).setDepth(7);
    this.homeWelcomeGiftObjects.push(label);
    const contents = this.add.text(HOME_WELCOME_GIFT.x, HOME_WELCOME_GIFT.y - 62,
      'POT · USED MEDIUM\nSEEDS · WATERING CAN\n1 BASIC FERTILISER', {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold',
        align: 'center', lineSpacing: 4, stroke: '#07090a', strokeThickness: 4,
        backgroundColor: '#111416', padding: { left: 7, right: 7, top: 5, bottom: 5 },
      }).setOrigin(0.5).setDepth(7);
    this.homeWelcomeGiftObjects.push(contents);
    this.homeObjects.push(...this.homeWelcomeGiftObjects);
  }

  private createWantedSign(): void {
    this.wantedSignBackdrop = this.add.graphics().setDepth(20);
    const signX = BUY_SELL_WINDOW.x + 18;
    const signWidth = BUY_SELL_WINDOW.width - 36;
    const signHeight = 112;
    const signY = BUY_SELL_WINDOW.y + (BUY_SELL_WINDOW.height - signHeight) / 2;
    this.wantedSignText = this.add.text(BUY_SELL_WINDOW.x + BUY_SELL_WINDOW.width / 2, signY + signHeight / 2, '', {
      color: '#f6f7f3',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: '26px',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setDepth(21);
    this.refreshWantedSign();
  }

  private createRealEstateStatusSign(): void {
    this.realEstateStatusBackdrop = this.add.graphics().setDepth(20);
    this.realEstateStatusText = this.add.text(1718, 684, '', {
      color: '#f6f7f3',
      fontFamily: SHOP_LABEL_FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 3,
    }).setOrigin(0.5).setDepth(21).setResolution(Math.max(2, window.devicePixelRatio || 1));
    this.refreshRealEstateStatusSign();
  }

  private refreshRealEstateStatusSign(): void {
    if (!this.realEstateStatusBackdrop || !this.realEstateStatusText) return;
    const green = this.progress.buildings['real-estate'].graphicsEra === 'green-crt';
    const colour = green ? 0x39ff5a : 0xf6f7f3;
    this.realEstateStatusBackdrop.clear();
    this.realEstateStatusBackdrop.fillStyle(0x07090a, 0.98).fillRect(1668, 636, 100, 96);
    this.realEstateStatusBackdrop.lineStyle(3, colour, 1).strokeRect(1668, 636, 100, 96);
    this.realEstateStatusText
      .setColor(`#${colour.toString(16).padStart(6, '0')}`)
      .setText(this.progress.windowJobComplete ? 'OPEN\nSEE ROSE' : 'CLOSED\nUNTIL\nFURTHER\nNOTICE');
  }

  private refreshWantedSign(): void {
    if (!this.wantedSignBackdrop || !this.wantedSignText) return;
    const goldenPothosWanted = !this.progress.saleComplete;
    const basilWanted = this.progress.buildings['buy-sell'].graphicsEra === 'atari-colour'
      && !this.progress.basilDeliveryComplete;
    const requestOutstanding = goldenPothosWanted || basilWanted;
    const message = goldenPothosWanted
      ? 'WANTED\nGOLDEN POTHOS\nCASH PAID'
      : basilWanted ? 'WANTED\nBASIL\nCASH PAID' : 'NO DELIVERIES\nWANTED';
    this.wantedSignBackdrop.clear();
    const signX = BUY_SELL_WINDOW.x + 18;
    const signWidth = BUY_SELL_WINDOW.width - 36;
    const signHeight = 112;
    const signY = BUY_SELL_WINDOW.y + (BUY_SELL_WINDOW.height - signHeight) / 2;
    const signColour = this.progress.graphicsUpgradeInstalled ? 0x236a9b : 0x111416;
    const signTextColour = this.progress.graphicsUpgradeInstalled ? 0x8ed8ff : 0xf6f7f3;
    this.wantedSignBackdrop.fillStyle(signColour, 0.98).fillRect(signX, signY, signWidth, signHeight);
    this.wantedSignBackdrop.lineStyle(4, signTextColour, 0.98).strokeRect(signX, signY, signWidth, signHeight);
    this.wantedSignText.setText(message);
    this.wantedSignText.setColor(`#${signTextColour.toString(16).padStart(6, '0')}`);

    this.wantedSignPulse?.stop();
    this.wantedSignPulse?.remove();
    this.wantedSignPulse = undefined;
    this.wantedSignBackdrop.setAlpha(1);
    this.wantedSignText.setAlpha(1);
    if (requestOutstanding) {
      this.wantedSignPulse = this.tweens.add({
        targets: [this.wantedSignBackdrop, this.wantedSignText],
        alpha: 0.16,
        duration: 570,
        hold: 900,
        yoyo: true,
        repeat: -1,
        repeatDelay: 250,
        ease: 'Sine.inOut',
      });
    }
  }

  private createShopFutureDisplayItems(): void {
    PREMIUM_PLANT_CATALOG.forEach((definition) => {
      if (this.progress.ownedPremiumPlants.includes(definition.id)) return;
      const slot = SHOP_SHELF_SLOTS[definition.shelfSlot];
      const item = this.add.graphics().setDepth(4).setPosition(slot.x, slot.y - 8);
      this.drawPremiumPlant(item, definition.id, 0, 0, 0.55);
      const tag = this.add.text(slot.x + 36, slot.y - 42, `${definition.shortLabel}\n${definition.price}C`, {
        color: '#f6f7f3',
        fontFamily: SHOP_LABEL_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        backgroundColor: '#111416',
        padding: { left: 5, right: 5, top: 4, bottom: 4 },
      }).setOrigin(0, 0.5).setDepth(7).setResolution(Math.max(2, window.devicePixelRatio || 1));
      this.shopPremiumPlantDisplay.push(item, tag);
      this.shopObjects.push(item, tag);
    });
  }

  private drawPremiumPlant(g: Phaser.GameObjects.Graphics, id: PremiumPlantId, x: number, y: number, scale: number): void {
    const colour = this.progress.graphicsUpgradeInstalled;
    drawPot(g, x, y, scale, colour);
    const leaf = colour ? (id === 'variegated-pothos' ? 0xa9d36f : id === 'monstera' ? 0x4f9a54 : 0x6ba866) : 0xbfc5c3;
    const accent = colour ? 0xe6efad : 0x697173;
    g.lineStyle(3 * scale, 0x111416, 1);
    if (id === 'snake-plant') {
      g.fillStyle(leaf, 1)
        .fillTriangle(x - 12 * scale, y - 26 * scale, x - 9 * scale, y - 88 * scale, x, y - 28 * scale)
        .fillTriangle(x - 2 * scale, y - 26 * scale, x + 4 * scale, y - 102 * scale, x + 10 * scale, y - 27 * scale)
        .fillTriangle(x + 6 * scale, y - 27 * scale, x + 18 * scale, y - 79 * scale, x + 17 * scale, y - 25 * scale);
      g.lineStyle(2 * scale, accent, 0.9).lineBetween(x + 4 * scale, y - 31 * scale, x + 4 * scale, y - 91 * scale);
      return;
    }
    if (id === 'monstera') {
      g.lineBetween(x, y - 27 * scale, x, y - 91 * scale);
      g.fillStyle(leaf, 1)
        .fillTriangle(x - 2 * scale, y - 54 * scale, x - 35 * scale, y - 75 * scale, x - 15 * scale, y - 91 * scale)
        .fillTriangle(x + 2 * scale, y - 65 * scale, x + 36 * scale, y - 88 * scale, x + 17 * scale, y - 101 * scale)
        .fillTriangle(x - 1 * scale, y - 78 * scale, x - 24 * scale, y - 108 * scale, x - 4 * scale, y - 113 * scale);
      return;
    }
    g.lineBetween(x, y - 27 * scale, x - 11 * scale, y - 76 * scale).lineBetween(x, y - 34 * scale, x + 16 * scale, y - 87 * scale);
    g.fillStyle(leaf, 1)
      .fillTriangle(x - 7 * scale, y - 58 * scale, x - 34 * scale, y - 73 * scale, x - 17 * scale, y - 88 * scale)
      .fillTriangle(x + 10 * scale, y - 68 * scale, x + 38 * scale, y - 85 * scale, x + 20 * scale, y - 99 * scale)
      .fillTriangle(x - 5 * scale, y - 78 * scale, x - 24 * scale, y - 107 * scale, x - 4 * scale, y - 111 * scale);
    g.fillStyle(accent, 1).fillRect(x - 19 * scale, y - 82 * scale, 7 * scale, 6 * scale).fillRect(x + 23 * scale, y - 91 * scale, 7 * scale, 6 * scale);
  }

  private createShopGoldenPothosDisplay(): void {
    if (!this.shopInterior || this.shopGoldenPothosDisplay.length > 0) return;
    const entries = this.progress.shopStock.filter((entry) => entry.quantity > 0);
    entries.forEach((entry) => {
      const slot = this.getShopShelfSlot(entry.stockId);
      const itemOffsetY = entry.item === 'special-repair-pot' ? 20 : entry.item === 'small-golden-pothos' ? 8 : 16;
      const item = this.add.graphics().setDepth(4).setPosition(slot.x, slot.y - itemOffsetY);
      if (entry.item === 'small-golden-pothos') {
        drawGoldenPothos(item, 0, 0, 0.55, this.progress.graphicsUpgradeInstalled);
      } else if (entry.item === 'rare-spotted-begonia') {
        drawRareSpottedBegonia(item, 0, 0, 0.5, this.progress.graphicsUpgradeInstalled);
      } else if (entry.item === 'special-repair-pot') {
        drawBrokenPot(item, 0, 0, 1.302, 10, this.progress.graphicsUpgradeInstalled);
      } else if (isPlantProductItem(entry.item)) {
        this.drawHarvestCarry(item, getPlantDefinitionByProduct(entry.item).species);
      }
      const label = entry.item === 'small-golden-pothos'
        ? 'GOLDEN POTHOS'
        : entry.item === 'rare-spotted-begonia'
          ? 'SPOTTED BEGONIA'
        : entry.item === 'special-repair-pot'
          ? 'REPAIRED POT'
          : getPlantDefinitionByProduct(entry.item).harvestLabel.toUpperCase();
      const stockLabel = this.add.text(slot.x + 36, slot.y - 43, `${label}${entry.quantity > 1 ? ` ×${entry.quantity}` : ''}\n${this.getShopBuyPrice(entry.item)}C`, {
        color: '#f6f7f3',
        fontFamily: SHOP_LABEL_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        backgroundColor: '#111416',
        padding: { left: 5, right: 5, top: 4, bottom: 4 },
      }).setOrigin(0, 0.5).setDepth(7).setResolution(Math.max(2, window.devicePixelRatio || 1));
      this.shopGoldenPothosDisplay.push(item, stockLabel);
    });
    this.shopObjects.push(...this.shopGoldenPothosDisplay);
  }

  private readonly handleCanvasWheel = (event: WheelEvent): void => {
    if (this.openingSequenceActive || this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning) return;
      event.preventDefault();
    this.zoomBy(event.deltaY > 0 ? -1 : 1);
  };

  private readonly handleZoomKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.key.toLowerCase() === 'q') {
      if (!this.modalOpen && !this.phoneLandscapeBlocked && !this.shopTransitioning) event.preventDefault();
      return;
    }
    if (this.openingSequenceActive || this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning) return;
    if (event.key === ',' || event.code === 'Comma') {
      event.preventDefault();
      this.zoomBy(-1);
    } else if (event.key === '.' || event.code === 'Period') {
      event.preventDefault();
      this.zoomBy(1);
    }
  };

  private applyZoom(mode: ZoomMode): void {
    this.zoomMode = mode;
    if (this.shopInterior) {
      this.setShopCamera();
      return;
    }
    if (this.homeInterior) {
      this.setHomeCamera();
      return;
    }
    const frame = this.getCameraFrame(mode);
    const portrait = this.isPortraitPhoneViewport() || this.scale.height > this.scale.width;
    this.portraitFollowCentered = portrait;
    const followOffsetX = portrait ? 0 : frame.offsetX;
    this.closeFollowCentered = mode === 'close' && this.player.y >= OPPOSITE_PAVEMENT_MIN_Y;
    const followOffsetY = this.closeFollowCentered ? 0 : frame.offsetY;
    const followLerp = mode === 'close' ? 0.2 : 0.12;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(frame.zoom);
    this.cameras.main.startFollow(this.player, true, followLerp, followLerp, followOffsetX, followOffsetY);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
    if (this.closeFollowCentered) this.cameras.main.centerOn(this.player.x, this.player.y);
    this.hud.setZoomMode(mode);
  }

  private updatePortraitFollow(): void {
    const portrait = this.isPortraitPhoneViewport() || this.scale.height > this.scale.width;
    if (!portrait || this.portraitFollowCentered) return;

    this.portraitFollowCentered = true;
    const frame = this.getCameraFrame(this.zoomMode);
    const followOffsetY = this.zoomMode === 'close' && this.closeFollowCentered ? 0 : frame.offsetY;
    const followLerp = this.zoomMode === 'close' ? 0.2 : 0.12;
    this.cameras.main.startFollow(this.player, true, followLerp, followLerp, 0, followOffsetY);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
  }

  private updateCloseVerticalFollow(): void {
    if (this.zoomMode !== 'close') return;
    const shouldCenter = this.player.y >= OPPOSITE_PAVEMENT_MIN_Y;
    if (shouldCenter === this.closeFollowCentered) return;

    this.closeFollowCentered = shouldCenter;
    const frame = this.getCameraFrame('close');
    const portrait = this.isPortraitPhoneViewport() || this.scale.height > this.scale.width;
    const followOffsetX = portrait && this.portraitFollowCentered ? 0 : frame.offsetX;
    const followLerp = 0.2;
    // Change the target offset in place so Phaser keeps the current scroll
    // position and eases into the new composition instead of snapping.
    this.cameras.main.setFollowOffset(followOffsetX, shouldCenter ? 0 : frame.offsetY);
    this.cameras.main.setLerp(followLerp, followLerp);
  }

  private getHorizontalDeadzone(): number {
    const viewportWidth = Math.max(1, this.scale.width);
    const portrait = this.isPortraitPhoneViewport() || this.scale.height > this.scale.width;
    // The phone viewport is narrow enough that a desktop-sized deadzone lets
    // Alex drift toward an edge before the camera responds. A small, scaled
    // deadzone keeps the follow centered without changing world geometry.
    if (portrait) return Math.max(20, Math.min(viewportWidth * 0.08, 42));
    return Math.max(96, Math.min(viewportWidth * 0.34, 420));
  }

  private getVerticalDeadzone(): number {
    const viewportHeight = Math.max(1, this.scale.height);
    return Math.max(120, Math.min(viewportHeight * 0.32, 520));
  }

  private updatePhoneOrientationState(): void {
    const viewport = this.getDeviceViewport();
    const phoneLandscape = this.isPhoneDevice() && viewport.width > viewport.height;
    const phonePortrait = this.isPhoneDevice() && viewport.height > viewport.width;
    const nextOrientation: 'portrait' | 'landscape' | 'other' = phonePortrait
      ? 'portrait'
      : phoneLandscape
        ? 'landscape'
        : 'other';
    if (this.phoneOrientation !== null && this.phoneOrientation !== nextOrientation) {
      this.hud.resetHeldInputs();
      this.cancelToolUse(true);
    }
    this.phoneOrientation = nextOrientation;
    this.hud.setPhoneHybridLayout(PHONE_HYBRID_CONTROLS && phonePortrait);
    if (phoneLandscape === this.phoneLandscapeBlocked) return;
    this.phoneLandscapeBlocked = phoneLandscape;
    this.hud.setPhoneOrientationBlocked(phoneLandscape);
    if (phoneLandscape) {
      this.hud.resetHeldInputs();
      this.cancelToolUse(true);
    }
    this.updateInteraction();
  }

  restartPlaytest(): void {
    this.restartPrototype();
    this.startOpeningSequence();
  }

  private isPhoneDevice(): boolean {
    return /Android|iPhone|iPod/i.test(navigator.userAgent) && !/Windows Phone/i.test(navigator.userAgent);
  }

  private isPortraitPhoneViewport(): boolean {
    const viewport = this.getDeviceViewport();
    return PHONE_HYBRID_CONTROLS
      && this.isPhoneDevice()
      && viewport.height > viewport.width;
  }

  private getDeviceViewport(): { width: number; height: number } {
    const viewport = window.visualViewport;
    return {
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    };
  }

  private getCameraFrame(mode: 'close' | 'normal'): { zoom: number; offsetX: number; offsetY: number } {
    const viewportWidth = Math.max(1, this.scale.width);
    const viewportHeight = Math.max(1, this.scale.height);
    const portrait = this.isPortraitPhoneViewport() || viewportHeight > viewportWidth;
    const compactLandscape = !portrait && viewportHeight < 600;
    const desktop = viewportWidth >= 900 && viewportHeight >= 600;

    if (mode === 'close') {
      const building = this.getNearestBuilding();
      const left = Math.min(this.player.x - 20, building.x);
      const right = Math.max(this.player.x + 20, building.x + building.width);
      const top = building.kind === 'apartment' ? building.y - 76 : building.y - 18;
      const bottom = FRONT_PAVEMENT_MAX_Y + 16;
      // Close has one fixed magnification across the whole starting street.
      // Use the opening apartment's reference frame for every location so a
      // different storefront cannot create an apparent third zoom.
      const closeReference = BUILDINGS[0];
      const referenceLeft = Math.min(START_POSITION.x - 20, closeReference.x);
      const referenceRight = Math.max(START_POSITION.x + 20, closeReference.x + closeReference.width);
      const referenceTop = closeReference.y - 76;
      const referenceBottom = FRONT_PAVEMENT_MAX_Y + 16;
      const zoom = this.fitZoom(
        viewportWidth,
        viewportHeight,
        referenceRight - referenceLeft,
        referenceBottom - referenceTop,
        1.45,
      );
      return {
        zoom,
        offsetX: this.limitFollowOffset(this.player.x - (left + right) / 2, viewportWidth, zoom),
        offsetY: this.limitFollowOffset(this.player.y - (top + bottom) / 2, viewportHeight, zoom),
      };
    }

    const bounds = desktop
      ? { left: 560, right: 2990, top: 390, bottom: 1240 }
      : compactLandscape
        ? { left: 540, right: 2880, top: 430, bottom: 1210 }
        : { left: 540, right: 2940, top: 390, bottom: 1240 };
    const fittedZoom = this.fitZoom(
      viewportWidth,
      viewportHeight,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
      0.94,
    );
    const minimumZoom = desktop ? 0.58 : portrait ? 0.42 : 0.32;
    const zoom = Math.max(fittedZoom * 0.92, minimumZoom);
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    return {
      zoom,
      offsetX: this.limitFollowOffset(this.player.x - centerX, viewportWidth, zoom),
      offsetY: this.limitFollowOffset(this.player.y - centerY, viewportHeight, zoom),
    };
  }

  private limitFollowOffset(offset: number, viewportSize: number, zoom: number): number {
    const maxOffset = (viewportSize / Math.max(zoom, 0.08)) * 0.34;
    return Phaser.Math.Clamp(offset, -maxOffset, maxOffset);
  }

  private fitZoom(viewportWidth: number, viewportHeight: number, worldWidth: number, worldHeight: number, padding: number): number {
    return Math.max(0.08, Math.min(viewportWidth / worldWidth, viewportHeight / worldHeight) * padding);
  }

  private getNearestBuilding() {
    return BUILDINGS.reduce((nearest, building) => {
      const nearestDistance = Math.abs((nearest.x + nearest.width / 2) - this.player.x);
      const buildingDistance = Math.abs((building.x + building.width / 2) - this.player.x);
      return buildingDistance < nearestDistance ? building : nearest;
    });
  }

  private cancelTapWalk(preserveGardeningAction = false): void {
    this.target = null;
    this.targetQueue = [];
    if (this.destinationMarker) this.destinationMarker.setVisible(false);
    this.pendingInteraction = null;
    this.pendingBrokenPotPieceIndex = null;
    if (!preserveGardeningAction) this.pendingGardeningAction = null;
    this.growingSlotReadyToPlace = false;
    this.basilPotSelected = false;
    this.windowFacePromptRequired = false;
    this.windowFacingLocked = false;
    this.clearInteractionHighlight();
    if (this.brokenPotPieceSelected) {
      this.brokenPotPieceSelected = false;
      this.selectedBrokenPotPieceIndex = null;
      this.syncHudState();
    }
  }

  private clearItemPlacement(): void {
    const wasActive = this.itemPlacementMode || Boolean(this.placementTarget);
    this.itemPlacementMode = false;
    this.placementTarget = null;
    this.placementOptionTargets = [];
    this.updatePlacementHighlight();
    if (wasActive) this.syncHudState();
  }

  private moveOnWalkableGround(nextX: number, nextY: number): void {
    const currentX = this.player.x;
    const currentY = this.player.y;
    const isWalkable = (x: number, y: number): boolean => this.shopInterior
      ? this.isShopWalkablePosition(x, y)
      : this.homeInterior
        ? this.isHomeWalkablePosition(x, y)
        : this.isWalkablePosition(x, y);
    if (isWalkable(nextX, nextY)) {
      this.player.setPosition(nextX, nextY);
      return;
    }
    if (isWalkable(nextX, currentY)) {
      this.player.x = nextX;
    }
    if (isWalkable(this.player.x, nextY)) {
      this.player.y = nextY;
    }
  }

  private isShopWalkablePosition(x: number, y: number): boolean {
    if (x < 82 || x > SHOP_WORLD_WIDTH - 82 || y < 160 || y > SHOP_WORLD_HEIGHT - 72) return false;
    const insideCounter = x >= SHOP_COUNTER.x - SHOP_COUNTER_WIDTH / 2 && x <= SHOP_COUNTER.x + SHOP_COUNTER_WIDTH / 2
      && y >= SHOP_COUNTER.y - SHOP_COUNTER_HEIGHT / 2 && y <= SHOP_COUNTER.y + SHOP_COUNTER_HEIGHT / 2 + 42;
    const insideShelf = SHOP_SHELVES.some((shelf) => x >= shelf.x - 10 && x <= shelf.x + shelf.width + 10
      && y >= shelf.y - 10 && y <= shelf.y + shelf.height + 20);
    return !insideCounter && !insideShelf;
  }

  private isHomeWalkablePosition(x: number, y: number): boolean {
    return x >= 72 && x <= this.getActiveHomeWorldWidth() - 72
      && y >= 90 && y <= this.getActiveHomeWorldHeight() - 72;
  }

  private isWalkablePosition(x: number, y: number): boolean {
    const insideStartingBlock = x >= STARTING_WALKABLE_MIN_X && x <= STARTING_WALKABLE_MAX_X;
    if (!insideStartingBlock) return false;
    const onCrossing = x >= CROSSING_START_X && x <= CROSSING_END_X
      && y >= FRONT_PAVEMENT_MIN_Y && y <= OPPOSITE_PAVEMENT_MAX_Y;
    const onFrontPavement = y >= FRONT_PAVEMENT_MIN_Y && y <= FRONT_PAVEMENT_MAX_Y;
    const onOppositePavement = y >= OPPOSITE_PAVEMENT_MIN_Y && y <= OPPOSITE_PAVEMENT_MAX_Y;
    return onCrossing || onFrontPavement || onOppositePavement;
  }

  private getTapPath(x: number, y: number): Phaser.Math.Vector2[] | null {
    if (x < STARTING_WALKABLE_MIN_X || x > STARTING_WALKABLE_MAX_X) return null;
    if (!this.isWalkablePosition(x, y)) return null;

    const destination = new Phaser.Math.Vector2(x, y);
    const currentlyOpposite = this.player.y >= OPPOSITE_PAVEMENT_MIN_Y;
    const destinationOpposite = y >= OPPOSITE_PAVEMENT_MIN_Y;
    if (currentlyOpposite === destinationOpposite || y >= FRONT_PAVEMENT_MIN_Y && y <= FRONT_PAVEMENT_MAX_Y && x >= CROSSING_START_X && x <= CROSSING_END_X) {
      return [destination];
    }

    const crossingX = Phaser.Math.Clamp(
      x,
      CROSSING_START_X + 24,
      CROSSING_END_X - 24,
    );
    const frontY = (FRONT_PAVEMENT_MIN_Y + FRONT_PAVEMENT_MAX_Y) / 2;
    const oppositeY = (OPPOSITE_PAVEMENT_MIN_Y + OPPOSITE_PAVEMENT_MAX_Y) / 2;
    return [
      new Phaser.Math.Vector2(crossingX, currentlyOpposite ? oppositeY : frontY),
      new Phaser.Math.Vector2(crossingX, currentlyOpposite ? frontY : oppositeY),
      destination,
    ];
  }

  private updateInteraction(): void {
    if (this.activeGardeningAction) {
      this.hud.setAction(null);
      return;
    }
    if (!this.modalOpen && this.realEstateInterior && this.isNearShopExit(new Phaser.Math.Vector2(this.player.x, this.player.y))) {
      this.hud.setAction('EXIT REAL ESTATE');
      return;
    }
    if (!this.modalOpen && this.realEstateInterior && this.isWithinShopCounterRange()) {
      this.hud.setAction('OPEN PROPERTY MENU');
      return;
    }
    if (!this.modalOpen && this.homeInterior && this.isNearHomeExit()) {
      this.hud.setAction('EXIT HOME');
      return;
    }
    if (!this.modalOpen && this.homeInterior && this.growingSlotReadyToPlace) {
      this.hud.setAction('ADD POT TO THIS SQUARE');
      return;
    }
    if (!this.modalOpen && this.homeInterior && this.isNearGrowingSpotPlayer()) {
      if (!this.povoWelcomeGiftClaimed) this.hud.setAction('CLAIM WELCOME GIFT');
      else {
        const selectedPot = this.getSelectedGrowingPot();
        const nearbyPot = this.progress.growingPots.find((pot) => pot.slot !== null && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y) <= BASIL_POT_INTERACTION_RADIUS);
        const pot = selectedPot ?? nearbyPot;
        if (!pot) this.hud.setAction(this.progress.growingPots.some((candidate) => candidate.slot === null) ? 'TAP EMPTY SLOT' : null);
        else if (this.basilPotSelected && pot.crop && this.getCropStage(pot) === 'planted') this.hud.setAction(`WATER ${getPlantDefinition(pot.crop.species).label.toUpperCase()}`);
        else if (pot.crop && this.getCropStage(pot) === 'mature') {
          const definition = getPlantDefinition(pot.crop.species);
          this.hud.setAction(definition.yieldMode === 'whole-plant'
            ? `LIFT ${definition.label.toUpperCase()}`
            : `HARVEST ${definition.label.toUpperCase()}`);
        }
        else this.hud.setAction('OPEN POT');
      }
      return;
    }
    if (!this.modalOpen && !this.shopInterior && !this.homeInterior && this.progress.placedWorldItem
      && this.placedItemDisplay?.visible
      && !this.inventoryHasPot
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.progress.placedWorldItem.x, this.progress.placedWorldItem.y) <= 110) {
      this.hud.setAction(null);
      return;
    }
    if (!this.modalOpen && !this.shopInterior && !this.homeInterior && this.itemPlacementMode && this.inventoryHasPot) {
      this.hud.setAction(this.placementTarget ? 'PRESS B TO PUT DOWN' : 'TAP PAVEMENT TO PLACE');
      return;
    }
    if (!this.modalOpen && !this.shopInterior && !this.homeInterior && this.brokenPotPieceSelected) {
      this.hud.setAction('PRESS B TO PICK UP PIECE');
      return;
    }
    if (!this.modalOpen && !this.shopInterior && !this.homeInterior && this.progress.windowJobAccepted
      && this.isNearWindowApproach() && (this.windowFacePromptRequired || !this.isFacingWindow())) {
      this.hud.setAction('FACE REAL ESTATE WINDOW · HIT B TO SPRAY');
      return;
    }
    this.hud.setAction(null);
  }

  private showToast(message: string, duration = 3300): void {
    this.hud.showToast(message);
    if (this.toastTimer) this.toastTimer.remove(false);
    this.toastTimer = this.time.delayedCall(duration, () => this.hud.showToast(''));
  }
}
