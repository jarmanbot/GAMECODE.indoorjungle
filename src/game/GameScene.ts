import Phaser from 'phaser';
import { drawNeighborhood, drawPot, drawGoldenPothos, drawBrokenPot, drawBrokenPotPieces, drawGrowingCrop, drawMatchingDoor, setBuySellDoorOpen, type BasilVisualStage } from './art';
import { AudioController } from './AudioController';
import { PHONE_HYBRID_CONTROLS } from './config';
import { createDevCheckpoint, type DevCheckpointScene } from './devCheckpoints';
import {
  BASIL_HARVEST_STOCK_ID,
  MINT_HARVEST_STOCK_ID,
  DEFAULT_SHOP_STOCK_QUALITY,
  DEFAULT_PROGRESS,
  OPENING_GOLDEN_POTHOS_INSTANCE_ID,
  sanitizeProgress,
  syncProgressLegacyMirrors,
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
import { GROWING_TABLE_SLOT_COUNT, MAX_ADDITIONAL_GROWING_POTS, STARTER_GROWING_POT_ID, createEmptyGrowingPot, type GrowingPotState } from './growing';
import { getPlantDefinition, PLANT_SPECIES, type PlantSpecies } from './plants';
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
  BUY_SELL_WINDOW,
  CROSSING_END_X,
  CROSSING_START_X,
  FRONT_PAVEMENT_MAX_Y,
  FRONT_PAVEMENT_MIN_Y,
  HOME_EXIT,
  HOME_GROWING_SPOTS,
  SECOND_HOME_GROWING_SPOTS,
  HOME_PLAYER_START,
  HOME_STARTER_KIT,
  HOME_WORLD_HEIGHT,
  HOME_WORLD_WIDTH,
  SECOND_RENTAL_ENTRANCE,
  SECOND_RENTAL_DOOR_TOP,
  SECOND_RENTAL_DOOR_BOTTOM,
  OPENING_TOWER,
  OPENING_DROP_POINT,
  BASIL_GROWTH_DURATION_MS,
  BASIL_POT_INTERACTION_RADIUS,
  BASIL_HARVEST_PRICE,
  BASIL_SEED_PRICE,
  SMALL_BASIC_PLASTIC_POT_PRICE,
  getShopBuybackPrice,
  OPENING_POTHOS_SALE_PRICE,
  WINDOW_JOB_REWARD,
  REPAIRED_POT_SALE_PRICE,
  RENTAL_BOND_COST,
  SECOND_RENTAL_TOTAL_BOND,
  SECOND_RENTAL_MOVE_COST,
  HOMES_LISTINGS,
  HOMES_WINDOW,
  HOMES_WINDOW_CLEAN_SECTIONS,
  OPPOSITE_PAVEMENT_MAX_Y,
  OPPOSITE_PAVEMENT_MIN_Y,
  PAVEMENT_Y,
  POT_POSITION,
  SHOP_COUNTER,
  SHOP_COUNTER_APPROACH,
  SHOP_EXIT,
  SHOP_EXIT_DOOR_BOTTOM,
  SHOP_EXIT_DOOR_TOP,
  SHOP_HANDOVER_POINT,
  SHOP_PLAYER_START,
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

type PendingInteraction = 'pickup' | 'pickup-placed-item' | 'select-broken-piece' | 'pickup-repaired' | 'window-clean' | 'enter-shop' | 'counter' | 'exit-shop' | 'enter-home' | 'exit-home' | 'claim-starter-kit' | 'place-starter-pot' | 'select-basil-pot' | 'place-growing-pot' | 'select-growing-pot' | 'gardening-action';
type PlayerFacing = 'front' | 'back' | 'left' | 'right';
type GardeningActionType = 'plant' | 'water' | 'fertilize' | 'harvest';
interface GardeningAction {
  potId: string;
  type: GardeningActionType;
  species?: PlantSpecies;
  requiredTool?: EquippedTool;
}
type ShopPresentationItem = ShopStockItem | 'basil-seeds' | 'mint-seeds' | 'small-basic-plastic-pot';
type ShopTransactionDirection = 'buy' | 'sell';
type DevSessionMeta = { checkpointId: string; scene: DevCheckpointScene; spawn: { x: number; y: number }; zoom: ZoomMode };
const DEV_BUILD = import.meta.env.DEV;

export class GameScene extends Phaser.Scene {
  private readonly zoomOrder: ZoomMode[] = ['normal', 'close'];
  private readonly hud: HudController;
  private readonly audio: AudioController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
  private placedItemDisplay?: Phaser.GameObjects.Graphics;
  private brokenPot!: Phaser.GameObjects.Graphics;
  private windowDirtOverlay!: Phaser.GameObjects.Graphics;
  private sprayEffect!: Phaser.GameObjects.Graphics;
  private repairPotDisplay?: Phaser.GameObjects.Graphics;
  private repairPickupPrompt?: Phaser.GameObjects.Text;
  private buySellDoor?: Phaser.GameObjects.Graphics;
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
  private readonly normalProgressKey = 'indoor-jungle-progress-v1';
  private readonly devProgressKey = 'indoor-jungle-progress-dev-test-v1';
  private readonly devModeKey = 'indoor-jungle-dev-test-mode-v1';
  private readonly devSessionKey = 'indoor-jungle-dev-test-session-v1';
  private testSaveMode = false;
  private devSessionMeta: DevSessionMeta | null = null;
  private modalOpen = false;
  private mapMovementAllowed = false;
  private shopInterior = false;
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
  private homeStarterKitObjects: Phaser.GameObjects.GameObject[] = [];
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
  private shopGoldenPothosDisplay: Phaser.GameObjects.GameObject[] = [];
  private shopkeeper?: Phaser.GameObjects.Graphics;
  private shopExitDoor?: Phaser.GameObjects.Graphics;
  private shopkeeperCarry?: Phaser.GameObjects.Graphics;
  private shopkeeperCarryLabel?: Phaser.GameObjects.Text;
  private shopkeeperTransactionTween?: Phaser.Tweens.Tween;
  private shopTransactionBusy = false;
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
  private rentalBondPaid = false;
  private rentalKeyOwned = false;
  private activeProperty: PropertyId = 'none';
  private rentalBondTotal = 0;
  private secondRentalMoveConfirmation = false;
  private starterKitClaimed = false;
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
  private openingZoomDemoActive = false;
  private openingZoomDemoTimer?: Phaser.Time.TimerEvent;
  private openingZoomDemoStep = 0;
  private graphicsUpgradePresentationActive = false;
  private graphicsUpgradeInstallElapsed = 0;
  private readonly graphicsUpgradeInstallDuration = 2300;
  private graphicsUpgradeWorldObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(hud: HudController, audio: AudioController) {
    super('game-scene');
    this.hud = hud;
    this.audio = audio;
  }

  create(): void {
    this.testSaveMode = this.readDevTestMode();
    this.loadProgress();
    this.buySellDoor = drawNeighborhood(this, this.progress.rentalBondPaid, this.progress.graphicsUpgradeInstalled, this.activeProperty);
    this.streetArtworkObjects = [...this.children.list];
    this.createWantedSign();
    this.createWindowDirtOverlay();
    this.createCars();
    this.createPlayer();
    this.createPot();
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
      const maxX = this.shopInterior ? SHOP_WORLD_WIDTH - 82 : this.homeInterior ? HOME_WORLD_WIDTH - 72 : STARTING_WALKABLE_MAX_X;
      const minY = this.shopInterior ? 160 : this.homeInterior ? 90 : FRONT_PAVEMENT_MIN_Y;
      const maxY = this.shopInterior ? SHOP_WORLD_HEIGHT - 72 : this.homeInterior ? HOME_WORLD_HEIGHT - 72 : OPPOSITE_PAVEMENT_MAX_Y;
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
      else if (!this.windowFacingLocked && this.playerFacing !== 'front') this.faceDirection(new Phaser.Math.Vector2(0, 1));
      this.updateRepairInterruption();
      this.drawPlayer();
      if (!this.shopInterior && !this.homeInterior) this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    }

    // Alex faces the player whenever movement has ended. The window-cleaning
    // task is the one deliberate exception: Alex must keep their back to the
    // player while working on the REAL ESTATE AGENT display.
    if (direction.lengthSq() === 0 && !this.windowFacingLocked && this.playerFacing !== 'front') {
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
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive || this.modalOpen || this.phoneLandscapeBlocked || this.shopInterior || this.homeInterior || this.shopTransitioning) return;
    const index = this.zoomOrder.indexOf(this.zoomMode);
    const nextIndex = Phaser.Math.Clamp(index + direction, 0, this.zoomOrder.length - 1);
    this.applyZoom(this.zoomOrder[nextIndex]);
  }

  setZoom(mode: ZoomMode): void {
    if (this.openingSequenceActive || this.openingZoomDemoActive || this.graphicsUpgradePresentationActive || this.phoneLandscapeBlocked || this.shopInterior || this.homeInterior || this.shopTransitioning) return;
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
    else if (this.shopInterior && this.isWithinShopCounterRange()) this.openShopPanel();
    else if (this.homeInterior && this.isNearHomeExit()) this.selectPendingInteraction('exit-home', new Phaser.Math.Vector2(HOME_EXIT.x, HOME_EXIT.y));
    else if (this.homeInterior && this.isNearStarterKit()) this.claimStarterKit();
    else if (this.homeInterior && this.isNearGrowingSpotPlayer()) {
      if (!this.starterKitClaimed) this.showToast('Claim the starter kit first.', 1500);
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

  getShopPanelState(): { inventoryPot: PotCondition | null; inventoryItem: InventoryItem | null; saleComplete: boolean; windowJobAccepted: boolean; windowCleaningProgress: number; windowJobComplete: boolean; basilHarvests: number; basilSeeds: number; seedQuantities: Record<PlantSpecies, number>; harvestQuantities: Record<PlantSpecies, number>; additionalGrowingPotsAvailable: number; starterKitClaimed: boolean; shopStock: ShopStockEntry[] } {
    return {
      inventoryPot: this.inventoryPot,
      inventoryItem: this.progress.inventoryItem,
      saleComplete: this.saleComplete,
      windowJobAccepted: this.progress.windowJobAccepted,
      windowCleaningProgress: this.progress.windowCleaningProgress,
      windowJobComplete: this.progress.windowJobComplete,
      basilHarvests: this.progress.basilHarvests,
      basilSeeds: this.progress.basilSeeds,
      seedQuantities: { ...this.progress.seedQuantities },
      harvestQuantities: { ...this.progress.harvestQuantities },
      additionalGrowingPotsAvailable: Math.max(0, MAX_ADDITIONAL_GROWING_POTS - this.progress.additionalGrowingPotsPurchased),
      starterKitClaimed: this.starterKitClaimed,
      shopStock: this.progress.shopStock.map((entry) => ({ ...entry, instanceIds: [...entry.instanceIds] })),
    };
  }

  public isShopTransactionBusy(): boolean {
    return this.shopTransactionBusy;
  }

  getBasilPanelState(): { starterKitClaimed: boolean; starterPotPlaced: boolean; stage: BasilStage; seeds: number; harvests: number; timeRemainingMs: number; wateringCanOwned: boolean; basilCycleCount: number; basicFertilizerCharges: number; selectedPotId: string | null; growingPots: GrowingPotState[]; seedQuantities: Record<PlantSpecies, number>; harvestQuantities: Record<PlantSpecies, number> } {
    const selected = this.getSelectedGrowingPot();
    return {
      starterKitClaimed: this.starterKitClaimed,
      starterPotPlaced: this.progress.starterPotPlaced,
      stage: selected?.crop ? this.getCropStage(selected) : 'empty',
      seeds: this.progress.basilSeeds,
      harvests: this.progress.basilHarvests,
      timeRemainingMs: selected ? this.getCropTimeRemaining(selected) : this.getBasilTimeRemaining(),
      wateringCanOwned: this.progress.wateringCanOwned,
      basilCycleCount: this.progress.basilCycleCount,
      basicFertilizerCharges: this.progress.basicFertilizerCharges,
      seedQuantities: { ...this.progress.seedQuantities },
      harvestQuantities: { ...this.progress.harvestQuantities },
      growingPots: this.progress.growingPots.map((pot) => ({ ...pot, crop: pot.crop ? { ...pot.crop } : null })),
      selectedPotId: this.selectedGrowingPotId,
    };
  }

  getPropertyPanelState(): { coins: number; rentalBondPaid: boolean; rentalKeyOwned: boolean; starterKitClaimed: boolean; activeProperty: PropertyId; rentalBondTotal: number; basilHarvestSaleRecorded: boolean; mintHarvestSaleRecorded: boolean; secondRentalMoveConfirmation: boolean } {
    return {
      coins: this.coins,
      rentalBondPaid: this.rentalBondPaid,
      rentalKeyOwned: this.rentalKeyOwned,
      starterKitClaimed: this.starterKitClaimed,
      activeProperty: this.activeProperty,
      rentalBondTotal: this.rentalBondTotal,
      basilHarvestSaleRecorded: this.progress.basilHarvestSaleRecorded,
      mintHarvestSaleRecorded: this.progress.mintHarvestSaleRecorded,
      secondRentalMoveConfirmation: this.secondRentalMoveConfirmation,
    };
  }

  getRentalState(): { rentalBondPaid: boolean; rentalKeyOwned: boolean; starterKitClaimed: boolean; activeProperty: PropertyId; rentalBondTotal: number } {
    return {
      rentalBondPaid: this.rentalBondPaid,
      rentalKeyOwned: this.rentalKeyOwned,
      starterKitClaimed: this.starterKitClaimed,
      activeProperty: this.activeProperty,
      rentalBondTotal: this.rentalBondTotal,
    };
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
      starterKitClaimed: this.starterKitClaimed,
      rentalBondPaid: this.rentalBondPaid,
      rentalKeyOwned: this.rentalKeyOwned,
      activeProperty: this.activeProperty,
      rentalBondTotal: this.rentalBondTotal,
      basilHarvestSaleRecorded: this.progress.basilHarvestSaleRecorded,
      mintHarvestSaleRecorded: this.progress.mintHarvestSaleRecorded,
      hasCollectedSaleableItem: this.inventoryHasPot || this.saleComplete || Boolean(this.progress.placedWorldItem) || this.progress.repairedPotSaleComplete,
      saleComplete: this.saleComplete || this.progress.repairedPotSaleComplete,
      paidWorkComplete: this.progress.windowJobComplete,
      starterPotPlaced: this.progress.starterPotPlaced,
      basilSeeds: this.progress.basilSeeds,
      basilHarvests: this.progress.basilHarvests,
      basilCycleCount: this.progress.basilCycleCount,
      basicFertilizerCharges: this.progress.basicFertilizerCharges,
      seedQuantities: this.progress.seedQuantities,
      harvestQuantities: this.progress.harvestQuantities,
      growingPots: this.progress.growingPots,
      graphicsUpgradeInstalled: this.progress.graphicsUpgradeInstalled,
      alexGraphics: this.progress.alexGraphics,
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

  private loadProgress(): void {
    let rentalKeyWasSaved = false;
    try {
      const raw = localStorage.getItem(this.getProgressStorageKey());
      const saved = raw ? JSON.parse(raw) as Partial<ProgressState> : null;
      rentalKeyWasSaved = saved?.rentalKeyOwned === true;
      this.progress = sanitizeProgress(saved ?? DEFAULT_PROGRESS);
    } catch {
      this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    }
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
    if (this.rentalBondPaid && !rentalKeyWasSaved) this.saveProgress();
    this.starterKitClaimed = this.progress.starterKitClaimed;
    this.updateSecondRentalObjective();
    if (this.rentalBondPaid && this.starterKitClaimed && !this.progress.starterKitGranted) {
      // The previous apartment pass persisted the claim flag before the
      // repeatable kit contents existed. Migrate that valid old claim once.
      this.grantStarterKitState();
      this.saveProgress();
    }
    // Older saves predate the starter-kit fertiliser. Award it only while the
    // first basil cycle has not begun, so a consumed charge cannot respawn.
    if (this.progress.starterKitClaimed && this.progress.starterKitGranted
      && this.progress.growingEvents.basil === 0 && this.progress.basicFertilizerCharges === 0) {
      this.progress.basicFertilizerCharges = 1;
      this.saveProgress();
    }
    // The starter kit now includes one mint seed as well as one basil seed.
    // Migrate older claimed kits once, but do not respawn a mint seed after a
    // player has already started a mint growing event.
    if (this.progress.starterKitClaimed && this.progress.starterKitGranted
      && this.progress.seedQuantities.mint === 0 && this.progress.growingEvents.mint === 0) {
      this.progress.seedQuantities.mint = 1;
      this.saveProgress();
    }
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
      if (this.progress.brokenPotPiecesRemaining <= 0) this.progress.brokenPotPiecesRemaining = 3;
    }
    // Recover an interrupted/older prototype save that exposed the ground
    // item with no remaining piece count.
    if (this.progress.brokenPotAvailable && !this.progress.brokenPotOwned && this.progress.brokenPotPiecesRemaining <= 0) {
      this.progress.brokenPotPiecesRemaining = 3;
    }
    if (this.inventoryPot === 'ordinary' && (this.progress.task === 'find' || this.progress.task === 'sell')) this.progress.task = 'clean';
    this.lastSavedCleaningStage = Math.floor(this.progress.windowCleaningProgress);
    this.basilStageCache = this.getBasilStage();
    // A crop can mature while the game is closed. Promote the saved objective
    // on load without granting a harvest until the player explicitly picks it.
    if (this.basilStageCache === 'mature' && this.progress.task !== 'harvest-basil') {
      this.progress.task = 'harvest-basil';
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
    if (this.progress.openingComplete) {
      this.startHousingThoughtReminder();
      this.presentGraphicsUpgradeIfNeeded();
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
    this.starterKitClaimed = false;
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
    this.openingZoomDemoTimer?.remove(false);
    this.openingZoomDemoTimer = undefined;
    this.openingZoomDemoActive = false;
    this.openingZoomDemoStep = 0;
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
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, OPENING_TOWER.y - 160, WORLD_WIDTH, WORLD_HEIGHT - OPENING_TOWER.y + 160);
    this.applyZoom(this.zoomMode);
    this.hud.setZoomMode(this.zoomMode);
    this.openingKick?.destroy();
    this.openingKick = this.add.graphics().setDepth(32);
    this.openingKick.fillStyle(0x111416, 1).fillRect(-8, -7, 54, 18);
    this.openingKick.fillStyle(0xf6f7f3, 1).fillRect(34, -4, 18, 12);
    this.openingKick.lineStyle(3, 0x111416, 1).strokeRect(-8, -7, 60, 18);
    this.openingKick.setPosition(OPENING_DROP_POINT.x + 20, OPENING_DROP_POINT.y + 18);
    this.tweens.add({ targets: this.openingKick, x: OPENING_DROP_POINT.x + 82, duration: 1200, ease: 'Power2', onComplete: () => this.openingKick?.setVisible(false) });
    // Hold on the upper doorway first so the tower roofline and the kick are
    // visible before the camera begins following Alex down the full drop.
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, OPENING_TOWER.y - 160, WORLD_WIDTH, WORLD_HEIGHT - OPENING_TOWER.y + 160);
    this.cameras.main.centerOn(OPENING_DROP_POINT.x, OPENING_DROP_POINT.y - 120);
    this.time.delayedCall(1500, () => {
      if (!this.openingSequenceActive) return;
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.openingSequenceTween = this.tweens.add({
        targets: this.player,
        y: START_POSITION.y - 24,
        duration: 6000,
        ease: 'Cubic.easeIn',
        onUpdate: () => {
          this.drawPlayer();
          this.updateThoughtBubblePosition();
        },
        onComplete: () => {
          if (!this.openingSequenceActive) return;
          this.openingSequenceTween = this.tweens.add({
            targets: this.player,
            y: START_POSITION.y,
            duration: 300,
            ease: 'Bounce.easeOut',
            onUpdate: () => {
              this.drawPlayer();
              this.updateThoughtBubblePosition();
            },
            onComplete: () => this.finishOpeningSequence(),
          });
        },
      });
    });
    this.showToast('Alex has been booted out. Recovering on the street...', 2200);
  }

  private finishOpeningSequence(): void {
    if (!this.openingSequenceActive) return;
    this.openingSequenceTween?.stop();
    this.openingSequenceTween = undefined;
    this.openingKick?.destroy();
    this.openingKick = undefined;
    this.openingSequenceActive = false;
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.player.setPosition(START_POSITION.x, START_POSITION.y).setAlpha(1).setVisible(true);
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.zoomMode = 'normal';
    this.streetZoomMode = 'normal';
    this.applyZoom(this.zoomMode);
    this.hud.setZoomMode(this.zoomMode);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.progress.openingComplete = true;
    this.saveProgress();
    this.drawPlayer();
    this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    // Hold the zoomed-out landing view briefly, then show two zoom flashes:
    // in, out, in. The player remains at the safe spawn while it runs.
    this.openingZoomDemoActive = true;
    this.openingZoomDemoStep = 0;
    this.openingZoomDemoTimer = this.time.delayedCall(1200, () => this.runOpeningZoomDemoStep());
  }

  private runOpeningZoomDemoStep(): void {
    if (!this.openingZoomDemoActive) return;
    if (this.openingZoomDemoStep >= 3) {
      this.openingZoomDemoActive = false;
      this.openingZoomDemoTimer = undefined;
      // Resume the original zoomed-in starting view after the demonstration.
      this.applyZoom('close');
      this.updateInteraction();
      this.startHousingThoughtReminder();
      this.showThought('I need a place to stay', true);
      return;
    }

    // The landing ends in Normal; show Close, Normal, Close, then leave Alex
    // in Close for the first playable objective.
    const mode: ZoomMode = this.openingZoomDemoStep % 2 === 0 ? 'close' : 'normal';
    this.openingZoomDemoStep += 1;
    this.applyZoom(mode);
    this.openingZoomDemoTimer = this.time.delayedCall(800, () => this.runOpeningZoomDemoStep());
  }

  private saveProgress(): void {
    syncProgressLegacyMirrors(this.progress);
    this.progress.coins = this.coins;
    this.progress.inventoryPot = this.inventoryPot;
    this.progress.inventoryInstanceId = this.inventoryPot ? (this.inventoryInstanceId ?? (this.inventoryPot === 'ordinary' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID)) : null;
    this.progress.inventoryItem = this.inventoryPot === 'ordinary'
      ? 'small-golden-pothos'
      : this.inventoryPot ? 'special-repair-pot' : null;
    this.progress.saleComplete = this.saleComplete;
    this.progress.rentalBondPaid = this.rentalBondPaid;
    this.progress.rentalKeyOwned = this.rentalKeyOwned;
    this.progress.activeProperty = this.activeProperty;
    this.progress.rentalBondTotal = this.rentalBondTotal;
    this.progress.starterKitClaimed = this.starterKitClaimed;
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
    if (this.activeProperty !== 'starter-apartment' || !this.starterKitClaimed) return;
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
    this.starterKitClaimed = this.progress.starterKitClaimed;
    this.repairPickupReady = this.inventoryPot === 'broken' && this.progress.repairStep >= 10;
    this.lastSavedCleaningStage = Math.floor(this.progress.windowCleaningProgress);
    this.basilStageCache = this.getBasilStage();
    this.graphicsUpgradePresentationActive = this.progress.graphicsUpgradeStage === 'prompt'
      || this.progress.graphicsUpgradeStage === 'installing'
      || this.progress.graphicsUpgradeStage === 'acknowledgement';
  }

  private clearSceneForDevLoad(): void {
    this.openingSequenceActive = false;
    this.openingZoomDemoActive = false;
    this.openingZoomDemoTimer?.remove(false);
    this.openingZoomDemoTimer = undefined;
    this.openingZoomDemoStep = 0;
    this.graphicsUpgradePresentationActive = false;
    this.hud.hideGraphicsUpgrade();
    this.shopkeeperTransactionTween?.stop();
    this.shopkeeperTransactionTween = undefined;
    this.clearShopkeeperCarry();
    this.shopTransactionBusy = false;
    this.shopkeeper = undefined;
    this.shopExitDoor = undefined;
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
    this.graphicsUpgradeWorldObjects.forEach((object) => object.destroy());
    this.graphicsUpgradeWorldObjects = [];
    this.shopObjects = [];
    this.homeObjects = [];
    this.homeStarterKitObjects = [];
    this.shopGoldenPothosDisplay = [];
    this.shopInterior = false;
    this.homeInterior = false;
    this.basilPot = undefined;
    this.basilWaterEffect = undefined;
    this.growingPotDisplays.clear();
    this.selectedGrowingPotId = null;
    this.setObjectsVisible(this.streetObjects, true);
    if (this.buySellDoor) setBuySellDoorOpen(this.buySellDoor, false);
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

  private grantStarterKitState(): void {
    this.progress.starterKitGranted = true;
    this.progress.seedQuantities.basil = Math.max(1, this.progress.seedQuantities.basil);
    this.progress.seedQuantities.mint = Math.max(1, this.progress.seedQuantities.mint);
    this.progress.basicFertilizerCharges = Math.max(1, this.progress.basicFertilizerCharges);
    this.progress.wateringCanOwned = true;
    if (!this.progress.growingPots.some((pot) => pot.id === STARTER_GROWING_POT_ID)) {
      this.progress.growingPots.push(createEmptyGrowingPot(STARTER_GROWING_POT_ID));
    }
    this.assignToolToSlot('watering-can');
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
    if (this.pot) this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete && !this.progress.placedWorldItem);
    // The broken pieces remain visible even while the opening pot is still in
    // the Bag. Selling is no longer the next required objective, so hiding
    // the ground item here made the repair pickup appear to be missing.
    if (this.brokenPot) {
      const shouldShowBrokenPot = this.progress.brokenPotAvailable && !this.progress.brokenPotOwned;
      if (shouldShowBrokenPot) {
        if (this.progress.brokenPotPiecesRemaining <= 0) this.progress.brokenPotPiecesRemaining = 3;
        const piecesRemaining = this.progress.brokenPotPiecesRemaining;
        this.brokenPot.clear();
        drawBrokenPotPieces(this.brokenPot, 0, 0, 2.268, piecesRemaining);
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
    const completedBefore = HOMES_WINDOW_CLEAN_SECTIONS
      .slice(0, sectionIndex)
      .reduce((total, candidate) => total + candidate.spraysRequired, 0);
    return Phaser.Math.Clamp(this.progress.windowCleaningProgress - completedBefore, 0, section.spraysRequired);
  }

  private getTotalWindowSprays(): number {
    return HOMES_WINDOW_CLEAN_SECTIONS.reduce((total, section) => total + section.spraysRequired, 0);
  }

  private getActiveWindowSectionIndex(): number {
    let remaining = this.progress.windowCleaningProgress;
    for (let index = 0; index < HOMES_WINDOW_CLEAN_SECTIONS.length; index += 1) {
      if (remaining < HOMES_WINDOW_CLEAN_SECTIONS[index].spraysRequired) return index;
      remaining -= HOMES_WINDOW_CLEAN_SECTIONS[index].spraysRequired;
    }
    return Math.max(0, HOMES_WINDOW_CLEAN_SECTIONS.length - 1);
  }

  private getSelectedWindowSectionIndex(): number {
    return this.selectedWindowSectionIndex ?? this.getActiveWindowSectionIndex();
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
    if (this.getSelectedWindowSectionIndex() !== this.getActiveWindowSectionIndex()) return false;
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
    const activeSection = this.getActiveWindowSectionIndex();
    if (this.getSelectedWindowSectionIndex() !== activeSection) {
      this.showToast('Move to the next dirty window section.', 1400);
      return;
    }
    const inRange = this.isNearWindowApproach();
    if (!inRange || !this.isFacingWindow()) {
      const now = performance.now();
      if (now - this.toolFeedbackAt > 700) {
        this.toolFeedbackAt = now;
        this.showToast(!inRange ? 'Move closer to the REAL ESTATE AGENT window.' : 'Face the REAL ESTATE AGENT window, then press B once per spray.', 1300);
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
    const sprayedSectionIndex = this.getActiveWindowSectionIndex();
    const sprayedSection = HOMES_WINDOW_CLEAN_SECTIONS[sprayedSectionIndex];
    this.progress.windowCleaningProgress = Math.min(this.getTotalWindowSprays(), this.progress.windowCleaningProgress + 1);
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
      this.showToast('Already clean. Move to the next window.', 1800);
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
    this.progress.brokenPotPiecesRemaining = 3;
    this.progress.brokenPotPiecesOwned = 0;
    this.progress.task = 'repair';
    this.selectedWindowSectionIndex = null;
    this.windowFacePromptRequired = false;
    this.windowFacingLocked = false;
    this.faceDirection(new Phaser.Math.Vector2(0, 1));
    this.coins += WINDOW_JOB_REWARD;
    this.progress.coins = this.coins;
    this.sprayEffect.setVisible(false);
    this.updateProgressVisuals();
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightToolSelector();
    this.hud.highlightBag();
    this.toastTimer?.remove(false);
    this.toastTimer = undefined;
    this.hud.showDismissibleToast(`WINDOW JOB COMPLETE. +${WINDOW_JOB_REWARD} COINS. REPAIR TOOL EQUIPPED IN TOOLS BESIDE ZOOM. GLUE ×1 IS IN BAG. COLLECT THE BROKEN POT PIECES OUTSIDE.`);
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
    this.presentGraphicsUpgradeIfNeeded();
    this.showToast('Pot fully repaired. Tap or click it to put it in the Bag.', 2400);
  }

  private presentGraphicsUpgradeIfNeeded(): void {
    if (!this.progress.graphicsUpgradeUnlocked && (this.progress.repairStep >= 10 || this.progress.repairedPotSaleComplete)) {
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
    this.progress.nurseryConstructionComplete = true;
    this.progress.alexGraphics = 'green-screen';
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
    this.createInstalledNurseryOverlay();
    this.drawPlayer();
    this.refreshWantedSign();
    this.updateProgressVisuals();
  }

  private createInstalledNurseryOverlay(): void {
    this.graphicsUpgradeWorldObjects.forEach((object) => object.destroy());
    this.graphicsUpgradeWorldObjects = [];
    const nursery = BUILDINGS.find((building) => building.key === 'plants');
    if (!nursery) return;
    const g = this.add.graphics().setDepth(26);
    g.lineStyle(5, 0x969e9d, 0.95);
    g.lineBetween(nursery.x + 28, nursery.y + 286, nursery.x + nursery.width - 28, nursery.y + 286);
    g.lineBetween(nursery.x + 48, nursery.y + 286, nursery.x + 48, nursery.y + 214);
    g.lineBetween(nursery.x + nursery.width - 48, nursery.y + 286, nursery.x + nursery.width - 48, nursery.y + 214);
    g.lineBetween(nursery.x + 48, nursery.y + 214, nursery.x + nursery.width - 48, nursery.y + 214);
    const label = this.add.text(nursery.x + nursery.width / 2, nursery.y + 300, 'NURSERY UNDER CONSTRUCTION', {
      color: '#f6f7f3', fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', backgroundColor: '#111416', padding: { left: 4, right: 4, top: 3, bottom: 3 },
    }).setOrigin(0.5).setDepth(27);
    this.graphicsUpgradeWorldObjects.push(g, label);
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
      this.getBrokenPotPosition(),
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
    if (this.shopInterior && this.isWithinShopCounterRange()) {
      this.openShopPanel();
      return;
    }
    if (this.homeInterior && this.isNearHomeExit()) {
      this.exitHome();
      return;
    }
    if (this.homeInterior && this.isNearStarterKit()) {
      this.claimStarterKit();
      return;
    }
    if (this.homeInterior && this.isNearGrowingSpotPlayer()) {
      if (!this.starterKitClaimed) this.showToast('Claim the starter kit first.', 1500);
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
    if (item === 'special-repair-pot') return REPAIRED_POT_SALE_PRICE;
    return getPlantDefinition(item === 'fresh-mint-leaves' ? 'mint' : 'basil').harvestPrice;
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
    if (item === 'fresh-basil-leaves' || item === 'fresh-mint-leaves') {
      const existing = this.progress.shopStock.find((entry) => entry.item === item && entry.quality === quality && entry.condition === condition);
      const stockId = item === 'fresh-basil-leaves' ? BASIL_HARVEST_STOCK_ID : MINT_HARVEST_STOCK_ID;
      if (existing) existing.quantity += amount;
      else this.progress.shopStock.push({ stockId: quality === DEFAULT_SHOP_STOCK_QUALITY ? stockId : `${stockId}:${quality}`, item, quality, condition, quantity: amount, instanceIds: [] });
      return true;
    }

    const id = instanceId?.trim() || (item === 'small-golden-pothos' ? OPENING_GOLDEN_POTHOS_INSTANCE_ID : SPECIAL_REPAIR_POT_INSTANCE_ID);
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
    this.shopGoldenPothosDisplay.forEach((object) => object.destroy());
    const displaySet = new Set(this.shopGoldenPothosDisplay);
    this.shopObjects = this.shopObjects.filter((object) => !displaySet.has(object));
    this.shopGoldenPothosDisplay = [];
    this.createShopGoldenPothosDisplay();
  }

  sellOpeningPot(): void {
    // This method remains the opening delivery entry point, but also supports
    // reselling the same preserved instance after a buyback.
    if (!this.shopInterior || this.shopTransactionBusy || this.inventoryPot !== 'ordinary') return;
    const instanceId = this.inventoryInstanceId ?? OPENING_GOLDEN_POTHOS_INSTANCE_ID;
    if (!this.addShopStock('small-golden-pothos', 'ordinary', 1, instanceId)) return;
    const firstDelivery = !this.saleComplete;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.inventoryInstanceId = null;
    this.coins += OPENING_POTHOS_SALE_PRICE;
    this.progress.inventoryPot = null;
    this.progress.inventoryItem = null;
    this.progress.inventoryInstanceId = null;
    this.progress.coins = this.coins;
    // Keep the scene mirror in sync before saveProgress(), which serializes
    // the authoritative sale-complete flag. Without this assignment the
    // sold collectible could respawn and the next job would remain locked.
    this.saleComplete = true;
    this.progress.saleComplete = true;
    this.progress.shopGoldenPothosStock = true;
    if (firstDelivery) {
      this.progress.task = 'clean';
      this.refreshWantedSign();
    }
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(firstDelivery
      ? `Small Golden Pothos delivered. +${OPENING_POTHOS_SALE_PRICE} coins.`
      : `Small Golden Pothos resold for ${OPENING_POTHOS_SALE_PRICE} coins.`);
    this.startShopkeeperTransaction(
      'small-golden-pothos',
      1,
      'sell',
      this.getShopShelfPosition(instanceId),
      `${firstDelivery ? 'Small Golden Pothos sold' : 'Small Golden Pothos resold'} for ${OPENING_POTHOS_SALE_PRICE} coins.`,
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
    const isHarvest = entry.item === 'fresh-basil-leaves' || entry.item === 'fresh-mint-leaves';
    if (!isHarvest && amount !== 1) return;
    if (!isHarvest && (this.inventoryHasPot || this.progress.placedWorldItem)) {
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
    if (removed.item === 'fresh-basil-leaves' || removed.item === 'fresh-mint-leaves') {
      const species = removed.item === 'fresh-basil-leaves' ? 'basil' : 'mint';
      this.progress.harvestQuantities[species] += amount;
    } else {
      this.inventoryHasPot = true;
      this.inventoryPot = removed.condition === 'ordinary' ? 'ordinary' : 'repaired';
      this.inventoryInstanceId = removed.instanceIds[0] ?? removed.stockId;
      this.progress.inventoryPot = this.inventoryPot;
      this.progress.inventoryItem = this.inventoryPot === 'ordinary' ? 'small-golden-pothos' : 'special-repair-pot';
      this.progress.inventoryInstanceId = this.inventoryInstanceId;
    }
    this.progress.coins = this.coins;
    this.saveProgress();
    this.syncHudState();
    const label = removed.item === 'fresh-basil-leaves' ? 'Fresh basil leaves' : removed.item === 'fresh-mint-leaves' ? 'Fresh mint leaves' : removed.item === 'small-golden-pothos' ? 'Small Golden Pothos' : 'Empty repaired pot';
    this.hud.refreshShopPanel(`Bought ${amount} ${label}${amount === 1 ? '' : 's'} for ${total} coins.`);
    this.startShopkeeperTransaction(removed.item, amount, 'buy', sourcePosition, `${label} added to the Bag.`);
  }

  acceptWindowJob(): void {
    if (!this.shopInterior || this.progress.windowJobAccepted || this.progress.windowJobComplete) return;
    this.progress.windowJobAccepted = true;
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
    this.starterKitClaimed = false;
    this.progress.rentalBondPaid = true;
    this.progress.rentalKeyOwned = true;
    this.progress.activeProperty = this.activeProperty;
    this.progress.rentalBondTotal = this.rentalBondTotal;
    this.progress.starterKitClaimed = false;
    this.progress.task = 'place-pot';
    this.updateApartmentRentalSign();
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshPropertyPanel('Bond paid. Your rental and starter kit are unlocked.');
    this.hud.highlightBag();
    this.toastTimer?.remove(false);
    this.toastTimer = undefined;
    this.hud.showDismissibleToast('RENTAL COMPLETE. Received apartment key ⚿. The key is in your Bag. Your starter apartment is unlocked; enter it to claim the starter kit.');
    return true;
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
    // refunded and a second 120-coin charge is never performed.
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
    return true;
  }

  private rebuildStreetArtwork(): void {
    const oldArtwork = new Set(this.streetArtworkObjects);
    this.streetArtworkObjects.forEach((object) => object.destroy());
    const before = new Set(this.children.list);
    this.buySellDoor = drawNeighborhood(this, this.rentalBondPaid, this.progress.graphicsUpgradeInstalled, this.activeProperty);
    const added = this.children.list.filter((object) => !before.has(object));
    this.streetArtworkObjects = added;
    this.streetObjects = this.streetObjects.filter((object) => !oldArtwork.has(object));
    this.streetObjects.push(...added);
    this.refreshWantedSign();
    this.updateProgressVisuals();
  }

  private claimStarterKit(): void {
    if (!this.rentalBondPaid || this.starterKitClaimed) {
      if (this.starterKitClaimed) this.showToast('Starter kit already claimed. Place the pot on the grow table.', 1900);
      return;
    }
    this.starterKitClaimed = true;
    this.progress.starterKitClaimed = true;
    this.grantStarterKitState();
    this.progress.task = 'place-pot';
    this.saveProgress();
    this.toastTimer?.remove(false);
    this.toastTimer = undefined;
    this.hud.showDismissibleToast('Starter kit claimed: pot, watering can, basil seed ×1, mint seed ×1 and basic fertiliser ×1. Place the pot on the grow table.');
    this.drawHomeInteriorKit();
    this.syncHudState();
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
    if (this.progress.seedQuantities[species] < 1) {
      this.hud.refreshBasilPanel(`No ${definition.label.toLowerCase()} seeds available. Buy some at BUY / SELL.`);
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
      this.hud.refreshBasilPanel('No basic fertiliser remains. Plants shop stock will arrive later.');
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
      && !this.hopActive && Boolean(spot)
      && Phaser.Math.Distance.Between(this.player.x, this.player.y, spot!.x, spot!.y) <= 115;
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
      this.progress.task = action.species === 'basil' ? 'water-basil' : 'water-mint';
      this.showToast(`${getPlantDefinition(action.species).label} planted.`, 1400);
    } else if (action.type === 'water' && pot.crop) {
      const now = Date.now();
      pot.crop.wateredAt = now;
      pot.crop.growthStartedAt = now;
      pot.crop.stage = 'seedling';
      this.progress.task = pot.crop.species === 'basil' ? 'grow-basil' : 'grow-mint';
      const growthSeconds = Math.round(getPlantDefinition(pot.crop.species).growthDurationMs / 1000);
      this.showToast(`${getPlantDefinition(pot.crop.species).label} watered. It will mature in about ${growthSeconds} seconds.`, 2200);
    } else if (action.type === 'fertilize' && pot.crop) {
      const duration = getPlantDefinition(pot.crop.species).growthDurationMs;
      this.progress.basicFertilizerCharges -= 1;
      pot.crop.growthStartedAt = Date.now() - duration - 1;
      pot.crop.stage = 'seedling';
      this.updateGrowingCrops();
      this.showToast('Basic fertiliser used. Crop grew instantly.', 2200);
    } else if (action.type === 'harvest' && pot.crop) {
      const species = pot.crop.species;
      const definition = getPlantDefinition(species);
      pot.crop = null;
      this.progress.harvestQuantities[species] += 1;
      this.progress.task = species === 'basil' ? 'sell-basil' : 'sell-mint';
      this.basilPotSelected = false;
      this.hud.highlightBag();
      this.showToast(`${definition.label} harvested. Sell it at BUY / SELL for ${definition.harvestPrice} coins.`, 2400);
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
    if (!amount || !this.addShopStock(definition.harvestItem, 'fresh', amount)) return;
    const total = definition.harvestPrice * amount;
    this.progress.harvestQuantities[species] -= amount;
    this.coins += total;
    if (species === 'basil') this.progress.basilHarvestSaleRecorded = true;
    if (species === 'mint') this.progress.mintHarvestSaleRecorded = true;
    this.progress.task = species === 'basil' && this.progress.additionalGrowingPotsPurchased < 2 ? 'place-pot' : 'buy-seeds';
    this.updateSecondRentalObjective();
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`${definition.harvestLabel} ×${amount} sold for ${total} coins. Buy more seeds to grow again.`);
    this.startShopkeeperTransaction(definition.harvestItem, amount, 'sell', this.getShopItemShelfPosition(definition.harvestItem), `${definition.harvestLabel} ×${amount} sold for ${total} coins.`);
  }

  buyBasilSeed(quantity = 1): void { this.buyPlantSeed('basil', quantity); }

  buyPlantSeed(species: PlantSpecies, quantity = 1): void {
    if (!this.shopInterior || this.shopTransactionBusy || !this.starterKitClaimed) return;
    const definition = getPlantDefinition(species);
    const amount = this.normalizeTransactionQuantity(quantity, Number.MAX_SAFE_INTEGER);
    if (!amount) return;
    const total = definition.seedPrice * amount;
    if (this.coins < total) {
      const shortfall = total - this.coins;
      this.hud.refreshShopPanel(`You need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for ${amount} seed${amount === 1 ? '' : 's'}.`);
      this.showToast(`You need ${shortfall} more coin${shortfall === 1 ? '' : 's'} for ${definition.label.toLowerCase()} seeds.`, 1600);
      return;
    }
    this.coins -= total;
    this.progress.seedQuantities[species] += amount;
    this.progress.task = species === 'basil' ? 'plant-basil' : 'plant-mint';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`${amount} ${definition.label.toLowerCase()} seed${amount === 1 ? '' : 's'} added to the Bag.`);
    this.startShopkeeperTransaction(`${species}-seeds`, amount, 'buy', new Phaser.Math.Vector2(960, 612), `Bought ${amount} ${definition.label.toLowerCase()} seed${amount === 1 ? '' : 's'} for ${total} coins.`);
  }

  buyAdditionalGrowingPot(quantity = 1): void {
    if (!this.shopInterior || this.shopTransactionBusy || !this.starterKitClaimed) {
      if (this.shopInterior) this.hud.refreshShopPanel('Claim the starter kit before buying additional growing pots.');
      return;
    }
    const amount = this.normalizeTransactionQuantity(quantity, Math.max(0, MAX_ADDITIONAL_GROWING_POTS - this.progress.additionalGrowingPotsPurchased));
    if (!amount) return;
    const total = SMALL_BASIC_PLASTIC_POT_PRICE * amount;
    if (this.coins < total) { this.hud.refreshShopPanel(`Need ${total - this.coins} more coin${total - this.coins === 1 ? '' : 's'} for another growing pot.`); return; }
    for (let index = 0; index < amount; index += 1) {
      const id = `growing-pot-${this.progress.additionalGrowingPotsPurchased + 2}`;
      if (!this.progress.growingPots.some((pot) => pot.id === id)) this.progress.growingPots.push(createEmptyGrowingPot(id));
      this.progress.additionalGrowingPotsPurchased += 1;
    }
    this.coins -= total;
    this.progress.task = 'place-pot';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`Bought ${amount} Small basic plastic pot${amount === 1 ? '' : 's'} for ${total} coins. Place them on the grow table.`);
    this.startShopkeeperTransaction('small-basic-plastic-pot', amount, 'buy', new Phaser.Math.Vector2(840, 612), `Bought ${amount} Small basic plastic pot${amount === 1 ? '' : 's'} for ${total} coins.`);
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
      const task = pot.crop.species === 'basil' ? 'harvest-basil' : 'harvest-mint';
      if (this.progress.task === (pot.crop.species === 'basil' ? 'grow-basil' : 'grow-mint')) this.progress.task = task;
      changed = true;
      if (this.selectedGrowingPotId === pot.id) this.showToast(`Mature ${pot.crop.species} is ready to harvest.`, 2200);
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
    this.progress.task = species === 'basil' ? 'grow-basil' : 'grow-mint';
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
      display.setPosition(spot.x, spot.y).clear().setVisible(this.starterKitClaimed);
      const stage = this.getCropStage(pot);
      drawGrowingCrop(display, 0, 0, pot.crop?.species ?? 'basil', stage as BasilVisualStage, 0.9, this.progress.graphicsUpgradeInstalled);
      display.setAlpha(this.selectedGrowingPotId === pot.id ? 1 : 0.94);
    }
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
    if (!this.homeInterior || !this.starterKitClaimed) return;
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
    this.growingSlotReadyToPlace = true;
    this.showInteractionHighlight('place-growing-pot', new Phaser.Math.Vector2(spot.x, spot.y));
    this.hud.setAction('ADD POT TO THIS SQUARE');
    this.showToast('Add pot to this square.', 2600);
    this.updateInteraction();
  }

  public placeSelectedGrowingPot(): void {
    if (!this.homeInterior || !this.starterKitClaimed) return;
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
      const message = 'Buy seeds at BUY / SELL.';
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
    this.starterKitClaimed = false;
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
        ? (occupied ? 'YOUR HOME' : 'TO LET')
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
      wordWrap: { width: 208, useAdvancedWrap: true },
    }).setOrigin(0.5);
    this.thoughtBubble = this.add.container(this.player.x, this.player.y - 104, [this.thoughtBubbleBackdrop, this.thoughtBubbleText])
      .setDepth(40)
      .setVisible(false);
  }

  private showThought(text: string, automatic = false): void {
    if (!this.thoughtBubble || !this.thoughtBubbleBackdrop || !this.thoughtBubbleText) return;
    this.thoughtBubbleText.setText(text);
    const width = 236;
    const height = Math.max(58, this.thoughtBubbleText.height + 24);
    this.thoughtBubbleBackdrop.clear();
    this.thoughtBubbleBackdrop.fillStyle(0xf6f7f3, 0.98).fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.thoughtBubbleBackdrop.lineStyle(3, 0x111416, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.thoughtBubbleBackdrop.fillStyle(0xf6f7f3, 0.98).fillTriangle(-12, height / 2 - 2, 12, height / 2 - 2, 0, height / 2 + 16);
    this.thoughtBubbleBackdrop.lineStyle(3, 0x111416, 1).lineBetween(-12, height / 2 - 2, 0, height / 2 + 16).lineBetween(0, height / 2 + 16, 12, height / 2 - 2);
    this.thoughtBubbleText.setPosition(0, 0);
    this.thoughtBubbleIsAutomatic = automatic;
    this.thoughtBubbleRemainingMs = 3000;
    this.thoughtBubble.setVisible(true);
    this.updateThoughtBubblePosition();
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
    if (!this.starterKitClaimed) return 'I should claim the starter kit';
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
    };
    return thoughts[this.progress.task] ?? 'I should keep working on my plants';
  }

  private drawPlayer(): void {
    this.player.clear();
    const lift = this.hopVisualOffset;
    const greenScreen = this.progress.alexGraphics === 'green-screen' && this.progress.graphicsUpgradeInstalled;
    const robotLight = greenScreen ? 0xb8d98c : 0xf5f6f2;
    const robotInk = greenScreen ? 0x19331b : 0x111416;
    this.player.fillStyle(0x111416, 0.65).fillEllipse(0, 32, 30, 8);
    const sideFacing = this.playerFacing === 'left' || this.playerFacing === 'right';
    const bodyX = sideFacing ? -11 : -14;
    const bodyWidth = sideFacing ? 22 : 28;
    this.player.fillStyle(robotLight, 1).fillRect(bodyX, -43 - lift, bodyWidth, 56);
    this.player.lineStyle(3, robotInk, 1).strokeRect(bodyX, -43 - lift, bodyWidth, 56);

    if (this.playerFacing === 'front') {
      this.player.fillStyle(robotInk, 1).fillRect(-8, -31 - lift, 5, 6).fillRect(3, -31 - lift, 5, 6);
      this.player.lineStyle(3, robotInk, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
    } else if (this.playerFacing === 'back') {
      this.player.fillStyle(greenScreen ? 0x53734a : 0x3b4244, 1).fillRect(-8, -32 - lift, 16, 9);
      this.player.lineStyle(2, greenScreen ? 0x8fbf76 : 0x697173, 1).lineBetween(-4, -28 - lift, 4, -28 - lift);
      this.player.lineStyle(3, robotInk, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
    } else {
      const eyeX = this.playerFacing === 'left' ? -8 : 3;
      this.player.fillStyle(robotInk, 1).fillRect(eyeX, -31 - lift, 5, 6);
      this.player.lineStyle(2, 0x697173, 1).lineBetween(0, -20 - lift, 0, 9 - lift);
    }
    this.player.fillStyle(robotLight, 1).fillRect(-13, 13 - lift, 10, 18).fillRect(3, 13 - lift, 10, 18);
    this.drawPlayerToolAttachment(lift);
    this.player.setScale(this.progress.graphicsUpgradeInstalled ? 1.25 : 1);
  }

  private drawPlayerToolAttachment(lift: number): void {
    const action = this.activeGardeningAction;
    const sideSign = this.playerFacing === 'left' ? -1 : 1;
    const handX = this.playerFacing === 'front' || this.playerFacing === 'back' ? 16 : sideSign * 16;
    const handY = -4 - lift;
    const reach = action ? 5 + Math.sin(Math.min(1, this.gardeningActionElapsed / this.gardeningActionDuration) * Math.PI) * 8 : 0;
    const toolX = handX + sideSign * reach;

    if (action?.type === 'plant') {
      this.player.fillStyle(0xf6f7f3, 1).fillRect(toolX - 9, handY - 9, 18, 13);
      this.player.lineStyle(2, 0x111416, 1).strokeRect(toolX - 9, handY - 9, 18, 13);
      this.player.fillStyle(0x111416, 1).fillRect(toolX - 5, handY - 3, 10, 2);
      return;
    }
    if (action?.type === 'fertilize') {
      this.player.fillStyle(0x111416, 1).fillRect(toolX - 8, handY - 10, 16, 14);
      this.player.lineStyle(2, 0xf6f7f3, 1).strokeRect(toolX - 8, handY - 10, 16, 14);
      this.player.lineStyle(2, 0xf6f7f3, 1).lineBetween(toolX - 4, handY - 6, toolX + 4, handY - 6);
      return;
    }
    if (action?.type === 'harvest') {
      this.player.lineStyle(3, 0xf6f7f3, 1).lineBetween(handX, handY, toolX + sideSign * 12, handY - 8);
      return;
    }
    if (this.progress.equippedTool === 'watering-can') {
      this.player.fillStyle(0xbfc5c3, 1).fillRect(toolX - 7, handY - 9, 13, 15);
      this.player.lineStyle(2, 0x111416, 1).strokeRect(toolX - 7, handY - 9, 13, 15);
      this.player.lineStyle(2, 0xf6f7f3, 1).lineBetween(toolX + sideSign * 5, handY - 5, toolX + sideSign * 13, handY - 12);
    } else if (this.progress.equippedTool === 'cleaner') {
      this.player.lineStyle(3, 0xf6f7f3, 1).lineBetween(handX, handY, toolX + sideSign * 15, handY - 13);
      this.player.fillStyle(0xbfc5c3, 1).fillRect(toolX + sideSign * 10 - 5, handY - 17, 10, 8);
      this.player.lineStyle(2, 0x111416, 1).strokeRect(toolX + sideSign * 10 - 5, handY - 17, 10, 8);
    } else if (this.progress.equippedTool === 'repair') {
      this.player.lineStyle(3, 0xf6f7f3, 1).lineBetween(handX, handY, toolX + sideSign * 12, handY + 10);
      this.player.lineStyle(3, 0x111416, 1).lineBetween(toolX + sideSign * 8, handY + 5, toolX + sideSign * 16, handY + 12);
    }
  }

  private createPot(): void {
    this.pot = this.add.graphics().setDepth(22);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y);
    drawGoldenPothos(this.pot, 0, 0, 0.9, this.progress.graphicsUpgradeInstalled);
    this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete && !this.progress.placedWorldItem);
  }

  private createBrokenPot(): void {
    this.brokenPot = this.add.graphics().setDepth(22);
    const position = this.getBrokenPotPosition();
    this.brokenPot.setPosition(position.x, position.y);
    const piecesRemaining = this.progress.brokenPotAvailable && !this.progress.brokenPotOwned
      ? Math.max(1, this.progress.brokenPotPiecesRemaining)
      : this.progress.brokenPotPiecesRemaining;
    drawBrokenPotPieces(this.brokenPot, 0, 0, 2.268, piecesRemaining);
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
    } else if (placed.condition === 'broken') {
      // A broken pot is represented as three loose pieces on the ground.
      // The global piece counter is for the separate street pickup and is 0
      // after the pot has been assembled into the Bag, so it must not control
      // the appearance of a deliberately placed broken pot.
      drawBrokenPotPieces(this.placedItemDisplay, 0, 0, 2.268, 3);
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

  private getBrokenPotPosition(): { x: number; y: number } {
    return { x: 1880, y: 910 };
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
    if (this.isNearPoint(point, new Phaser.Math.Vector2(this.player.x, this.player.y), 54)) {
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
      const activeSection = this.getActiveWindowSectionIndex();
      if (sectionIndex === null) return;
      if (sectionIndex !== activeSection) {
        this.selectedWindowSectionIndex = null;
        this.cancelTapWalk();
        this.showToast(sectionIndex < activeSection ? 'Already clean. Move to the next window.' : 'Clean the previous window section first.', 1600);
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
    const propertyListing = this.getPropertyListingAtPoint(point);
    if (propertyListing) {
      this.cancelTapWalk();
      this.hud.openPropertyDetails(propertyListing);
      return;
    }
    const brokenPosition = this.getBrokenPotPosition();
    if (this.isBrokenPotPiecePoint(point) && this.progress.brokenPotAvailable && !this.progress.brokenPotOwned && this.brokenPot.visible) {
      if (this.inventoryHasPot) {
        this.cancelTapWalk();
        this.showToast('The Bag is full. Sell the current pot before picking up these pieces.', 1900);
        return;
      }
      const approach = new Phaser.Math.Vector2(brokenPosition.x - 72, brokenPosition.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, brokenPosition.x, brokenPosition.y) <= 105) {
        this.selectPendingInteraction('select-broken-piece', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
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
        this.showToast('The starter apartment has been returned. Use the two-room rental.', 1800);
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

  private isBrokenPotPiecePoint(point: Phaser.Math.Vector2): boolean {
    const position = this.getBrokenPotPosition();
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const hit = (x: number, y: number, width: number, height: number): boolean =>
      Math.abs(dx - x) <= width / 2 && Math.abs(dy - y) <= height / 2;
    const remaining = this.progress.brokenPotPiecesRemaining;
    return (remaining >= 1 && hit(-39, -2, 58, 58))
      || (remaining >= 2 && hit(39, -2, 58, 58))
      || (remaining >= 3 && hit(0, -57, 46, 42));
  }

  private isNearBuySellDoor(point: Phaser.Math.Vector2): boolean {
    // The hit area follows the visible door, while the approach point remains
    // at pavement level so Alex never has to enter the building geometry.
    return Math.abs(point.x - BUY_SELL_ENTRANCE.x) <= BUY_SELL_DOOR_WIDTH / 2 + 18
      && point.y >= BUY_SELL_DOOR_TOP - 18
      && point.y <= BUY_SELL_DOOR_BOTTOM + 14;
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
    this.cancelTapWalk(interaction === 'gardening-action');
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
    if (this.isNearShopExit(point)) {
      const approach = new Phaser.Math.Vector2(SHOP_EXIT.x, SHOP_EXIT.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
        this.selectPendingInteraction('exit-shop', approach);
      } else {
        const path = this.getShopTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction('exit-shop', approach, path);
        else this.showToast('The exit cannot be reached.', 1500);
      }
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
      const approach = new Phaser.Math.Vector2(HOME_EXIT.x, HOME_EXIT.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, approach.x, approach.y) <= 110) {
        this.selectPendingInteraction('exit-home', approach);
      } else {
        const path = this.getHomeTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction('exit-home', approach, path);
        else this.showToast('The exit cannot be reached.', 1500);
      }
      return;
    }
    if (this.isNearStarterKit(point)) {
      const approach = new Phaser.Math.Vector2(HOME_STARTER_KIT.x - 120, HOME_STARTER_KIT.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, HOME_STARTER_KIT.x, HOME_STARTER_KIT.y) <= 110) {
        if (!this.starterKitClaimed) this.claimStarterKit();
        else this.showToast('Starter kit already claimed. Place the pot on the grow table.', 1900);
      } else {
        const path = this.getHomeTapPath(approach.x, approach.y);
        if (path) this.selectPendingInteraction('claim-starter-kit', approach, path);
        else this.showToast('The starter kit cannot be reached.', 1500);
      }
      return;
    }
    const growingSpotIndex = this.getGrowingSpotIndexAtPoint(point);
    if (growingSpotIndex !== null) {
      if (!this.starterKitClaimed) {
        this.cancelTapWalk();
        this.showToast('Claim the starter kit before using the grow table.', 1700);
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
    return Math.abs(point.x - SHOP_EXIT.x) <= 64
      && point.y >= SHOP_EXIT_DOOR_TOP - 18
      && point.y <= SHOP_EXIT_DOOR_BOTTOM + 14;
  }

  private isNearHomeExit(point = new Phaser.Math.Vector2(this.player.x, this.player.y)): boolean {
    return Math.abs(point.x - HOME_EXIT.x) <= 64
      && point.y >= HOME_EXIT.y - 86
      && point.y <= HOME_EXIT.y + 20;
  }

  private isNearStarterKit(point = new Phaser.Math.Vector2(this.player.x, this.player.y)): boolean {
    return Phaser.Math.Distance.Between(point.x, point.y, HOME_STARTER_KIT.x, HOME_STARTER_KIT.y) <= 92;
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
      const inApartmentLane = Math.abs(this.player.x - APARTMENT_ENTRANCE.x) <= APARTMENT_DOOR_WIDTH / 2 + 8;
      const movingIntoApartment = this.activeProperty === 'starter-apartment' && direction.y < -0.45 && inApartmentLane
        && previousY >= this.player.y && this.player.y <= FRONT_PAVEMENT_MIN_Y + 10;
      if (movingIntoApartment) {
        if (this.rentalBondPaid) this.enterHome();
        else if (performance.now() - this.rentalFeedbackAt > 900) {
          this.rentalFeedbackAt = performance.now();
          this.showToast('Rent the starter apartment at the REAL ESTATE AGENT first.', 1500);
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
      const exitThresholdX = HOME_EXIT.x + 52;
      const inExitLane = Math.abs(this.player.y - HOME_EXIT.y) <= 48;
      const movingIntoExit = direction.x < -0.45 && inExitLane
        && previousX >= this.player.x
        && previousX >= HOME_EXIT.x - 52
        && this.player.x <= exitThresholdX;
      if (movingIntoExit) {
        this.exitHome();
        return true;
      }
      return false;
    }

    const inExitLane = Math.abs(this.player.x - SHOP_EXIT.x) <= BUY_SELL_DOOR_WIDTH / 2 + 8;
    const movingIntoExit = direction.y > 0.45 && inExitLane
      && previousY <= this.player.y
      && previousY <= SHOP_EXIT_DOOR_BOTTOM + 8
      && this.player.y >= SHOP_EXIT_DOOR_BOTTOM - 18;
    if (movingIntoExit) {
      this.exitShop();
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
      this.interactionHighlight.strokeRect(point.x - BUY_SELL_DOOR_WIDTH / 2 - 10, SHOP_EXIT_DOOR_TOP - 10, BUY_SELL_DOOR_WIDTH + 20, BUY_SELL_DOOR_HEIGHT + 20);
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
    if (interaction === 'pickup-placed-item') this.collectPlacedItem();
    if (interaction === 'select-broken-piece') this.selectBrokenPotPiece();
    if (interaction === 'pickup-repaired') this.collectRepairedPot();
    if (interaction === 'window-clean') {
      this.windowFacePromptRequired = true;
      this.windowFacingLocked = false;
      this.faceDirection(new Phaser.Math.Vector2(0, 1));
    }
    if (interaction === 'enter-shop') this.enterShop();
    if (interaction === 'counter') this.openShopPanel();
    if (interaction === 'exit-shop') this.exitShop();
    if (interaction === 'enter-home') this.enterHome();
    if (interaction === 'exit-home') this.exitHome();
    if (interaction === 'claim-starter-kit') this.claimStarterKit();
    if (interaction === 'place-starter-pot') this.placeStarterPot();
    if (interaction === 'select-basil-pot') this.selectBasilPot();
    if (interaction === 'place-growing-pot') this.prepareGrowingSlotPlacement();
    if (interaction === 'select-growing-pot' && this.selectedGrowingPotId) this.selectGrowingPot(this.selectedGrowingPotId);
    if (interaction === 'gardening-action') this.startGardeningAction();
  }

  private collectPot(): void {
    if (this.shopInterior || this.homeInterior || this.inventoryHasPot || !this.pot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y) > 110) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'ordinary';
    this.inventoryInstanceId = OPENING_GOLDEN_POTHOS_INSTANCE_ID;
    this.pot.setVisible(false);
    this.progress.inventoryPot = 'ordinary';
    this.progress.inventoryItem = 'small-golden-pothos';
    // Collecting the first pot unlocks the opening job. Selling remains an
    // available transaction, but it is no longer the next required objective.
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Found a Small Golden Pothos.');
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
    return item.condition === 'repaired' ? 'Repaired pot' : 'Broken pot';
  }

  private selectBrokenPotPiece(): void {
    const position = this.getBrokenPotPosition();
    if (this.shopInterior || this.homeInterior || this.inventoryHasPot || !this.brokenPot.visible || this.progress.brokenPotPiecesRemaining <= 0) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > 110) return;
    this.brokenPotPieceSelected = true;
    this.syncHudState();
    this.showToast(`Broken piece selected. Press B to pick it up (${this.progress.brokenPotPiecesRemaining} left).`, 1700);
  }

  private collectBrokenPotPiece(): void {
    const position = this.getBrokenPotPosition();
    if (this.shopInterior || this.homeInterior || !this.brokenPotPieceSelected || this.inventoryHasPot || !this.brokenPot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > 110) {
      this.showToast('Move closer to the broken piece first.', 1400);
      return;
    }

    this.audio.playToolUse();
    this.brokenPotPieceSelected = false;
    this.progress.brokenPotPiecesRemaining = Math.max(0, this.progress.brokenPotPiecesRemaining - 1);
    this.progress.brokenPotPiecesOwned = Math.min(3, this.progress.brokenPotPiecesOwned + 1);
    this.brokenPot.clear();
    drawBrokenPotPieces(this.brokenPot, 0, 0, 2.268, this.progress.brokenPotPiecesRemaining);

    if (this.progress.brokenPotPiecesRemaining > 0) {
      this.saveProgress();
      this.syncHudState();
      this.showToast(`Piece added to the Bag (${this.progress.brokenPotPiecesOwned}/3). Click another piece, then press B.`, 1700);
      return;
    }

    this.inventoryHasPot = true;
    this.inventoryPot = 'broken';
    this.inventoryInstanceId = SPECIAL_REPAIR_POT_INSTANCE_ID;
    this.progress.brokenPotPiecesOwned = 0;
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
    this.showToast(`Repaired pot added to the Bag. Sell it at BUY / SELL for ${REPAIRED_POT_SALE_PRICE} coins.`);
  }

  private openShopPanel(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.cancelTapWalk();
    this.hud.openPanel('shop');
  }

  private enterShop(): void {
    if (this.shopInterior || this.homeInterior || this.shopTransitioning) return;
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.setRepairPickupPresentationVisible(false);
    this.cancelTapWalk();
    this.streetPosition.set(this.player.x, this.player.y);
    this.streetZoomMode = this.zoomMode;
    setBuySellDoorOpen(this.buySellDoor!, true);
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
    this.drawShopInterior();
    this.player.setPosition(SHOP_PLAYER_START.x, SHOP_PLAYER_START.y).setAlpha(1).setVisible(true);
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.setShopCamera();
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
    this.persistDevSession();
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
    this.player.setPosition(HOME_PLAYER_START.x, HOME_PLAYER_START.y).setAlpha(1).setVisible(true);
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
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.cancelTapWalk();
    if (this.shopExitDoor) drawMatchingDoor(this.shopExitDoor, SHOP_EXIT.x, SHOP_EXIT_DOOR_TOP, BUY_SELL_DOOR_WIDTH, BUY_SELL_DOOR_HEIGHT, true);
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
    this.shopInterior = false;
    setBuySellDoorOpen(this.buySellDoor!, false);
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
    this.persistDevSession();
  }

  private exitHome(): void {
    if (!this.homeInterior || this.shopTransitioning) return;
    this.clearItemPlacement();
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.cancelTapWalk();
    this.cameras.main.fadeOut(120, 7, 9, 10);
    this.time.delayedCall(120, () => this.exitHomeNow());
  }

  private exitHomeNow(): void {
    this.homeObjects.forEach((object) => object.destroy());
    this.homeObjects = [];
    this.homeStarterKitObjects = [];
    this.basilPot = undefined;
    this.basilWaterEffect = undefined;
    this.homeInterior = false;
    this.basilPotSelected = false;
    this.selectedGrowingPotId = null;
    this.setObjectsVisible(this.streetObjects, true);
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
    ) * 0.92;
    // The full room is intentionally not fitted into a narrow portrait phone:
    // that made the interior text render at only a few pixels high. The camera
    // still follows Alex and the room remains bounded, but the readable play
    // area is larger on phones than the desktop-fit room.
    const portraitPhone = this.isPortraitPhoneViewport() && this.scale.width <= 680;
    const zoom = portraitPhone ? Math.max(0.58, fittedZoom) : Math.max(0.25, fittedZoom);
    this.cameras.main.setBounds(0, 0, SHOP_WORLD_WIDTH, SHOP_WORLD_HEIGHT);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14, 0, 0);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
  }

  private setHomeCamera(): void {
    const fittedZoom = Math.min(
      this.scale.width / HOME_WORLD_WIDTH,
      this.scale.height / HOME_WORLD_HEIGHT,
    ) * 0.92;
    const portraitPhone = this.isPortraitPhoneViewport() && this.scale.width <= 680;
    const zoom = portraitPhone ? Math.max(0.58, fittedZoom) : Math.max(0.25, fittedZoom);
    this.cameras.main.setBounds(0, 0, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14, 0, 0);
    this.cameras.main.setDeadzone(this.getHorizontalDeadzone(), this.getVerticalDeadzone());
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

  private drawShopInterior(): void {
    const upgraded = this.progress.graphicsUpgradeInstalled;
    const room = this.add.graphics().setDepth(-100);
    room.fillStyle(upgraded ? 0x263d42 : 0x252a2d, 1).fillRect(0, 0, SHOP_WORLD_WIDTH, SHOP_WORLD_HEIGHT);
    room.fillStyle(upgraded ? 0x4d6f70 : 0x454c4e, 1).fillRect(56, 110, SHOP_WORLD_WIDTH - 112, SHOP_WORLD_HEIGHT - 170);
    room.lineStyle(8, 0xf6f7f3, 0.95).strokeRect(56, 110, SHOP_WORLD_WIDTH - 112, SHOP_WORLD_HEIGHT - 170);
    room.lineStyle(3, 0x697271, 0.9);
    for (let x = 90; x < SHOP_WORLD_WIDTH - 70; x += 80) room.lineBetween(x, 120, x, 800);
    this.shopObjects.push(room);

    const shelves = this.add.graphics().setDepth(3);
    shelves.fillStyle(0x111416, 1).fillRect(92, 220, 180, 260).fillRect(880, 220, 180, 260);
    shelves.lineStyle(5, 0xf6f7f3, 1);
    for (const shelfX of [92, 880]) {
      for (const shelfY of [275, 350, 425]) shelves.lineBetween(shelfX + 12, shelfY, shelfX + 168, shelfY);
    }
    this.shopObjects.push(shelves);
    this.createShopFutureDisplayItems();
    this.createShopGoldenPothosDisplay();

    const counter = this.add.graphics().setDepth(5);
    counter.fillStyle(0x111416, 1).fillRect(SHOP_COUNTER.x - 180, SHOP_COUNTER.y - 62, 360, 112);
    counter.fillStyle(0x858d8d, 1).fillRect(SHOP_COUNTER.x - 159, SHOP_COUNTER.y - 42, 318, 30);
    counter.lineStyle(5, 0xf6f7f3, 0.95).strokeRect(SHOP_COUNTER.x - 180, SHOP_COUNTER.y - 62, 360, 112);
    this.shopObjects.push(counter);

    this.shopkeeper = this.add.graphics().setDepth(6);
    this.shopkeeper.setPosition(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
    this.drawShopkeeper(false);
    this.shopObjects.push(this.shopkeeper);

    this.shopExitDoor = this.add.graphics().setDepth(4);
    drawMatchingDoor(this.shopExitDoor, SHOP_EXIT.x, SHOP_EXIT_DOOR_TOP, BUY_SELL_DOOR_WIDTH, BUY_SELL_DOOR_HEIGHT, false);
    this.shopObjects.push(this.shopExitDoor);

    const labels = [
      { text: 'BUY / SELL', x: SHOP_COUNTER.x, y: 150, size: '26px' },
      { text: 'COUNTER', x: SHOP_COUNTER.x, y: SHOP_COUNTER.y + 72, size: '15px' },
    ];
    labels.forEach(({ text, x, y, size }) => {
      const label = this.add.text(x, y, text, {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: size, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7);
      this.shopObjects.push(label);
    });
  }

  private drawShopkeeper(seated: boolean): void {
    if (!this.shopkeeper) return;
    const upgraded = this.progress.graphicsUpgradeInstalled;
    const scale = upgraded ? 1.25 : 1;
    const width = 56 * scale;
    const height = 66 * scale;
    const top = -height;
    this.shopkeeper.clear();
    this.shopkeeper.fillStyle(upgraded ? 0xc95b52 : 0xf6f7f3, 1).fillRect(-width / 2, top, width, height);
    this.shopkeeper.lineStyle(4, upgraded ? 0x242a2c : 0x111416, 1).strokeRect(-width / 2, top, width, height);
    this.shopkeeper.fillStyle(0x111416, 1)
      .fillRect(-20 * scale, top + 18 * scale, 8 * scale, 8 * scale)
      .fillRect(12 * scale, top + 18 * scale, 8 * scale, 8 * scale);
    if (seated) {
      this.shopkeeper.lineStyle(4, upgraded ? 0x8fb8c0 : 0x858d8d, 1).lineBetween(-width / 2, 0, width / 2, 0);
    }
  }

  private getShopkeeperHandPosition(): Phaser.Math.Vector2 {
    if (!this.shopkeeper) return new Phaser.Math.Vector2(SHOP_HANDOVER_POINT.x, SHOP_HANDOVER_POINT.y);
    const scale = this.progress.graphicsUpgradeInstalled ? 1.25 : 1;
    return new Phaser.Math.Vector2(this.shopkeeper.x + 34 * scale, this.shopkeeper.y - 30 * scale);
  }

  private drawHarvestCarry(g: Phaser.GameObjects.Graphics, species: PlantSpecies): void {
    const leaf = species === 'mint' ? 0xbfc5c3 : 0xd8dddc;
    g.clear();
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
    if (item === 'small-golden-pothos') drawGoldenPothos(this.shopkeeperCarry, 0, 12, 0.34, this.progress.graphicsUpgradeInstalled);
    else if (item === 'special-repair-pot') drawBrokenPot(this.shopkeeperCarry, 0, 12, 0.72, 10, this.progress.graphicsUpgradeInstalled);
    else if (item === 'fresh-basil-leaves' || item === 'fresh-mint-leaves') this.drawHarvestCarry(this.shopkeeperCarry, item === 'fresh-mint-leaves' ? 'mint' : 'basil');
    else if (item === 'small-basic-plastic-pot') drawPot(this.shopkeeperCarry, 0, 12, 0.62, this.progress.graphicsUpgradeInstalled);
    else {
      this.shopkeeperCarry.fillStyle(0xf6f7f3, 1).fillRect(-24, -14, 48, 30);
      this.shopkeeperCarry.lineStyle(3, 0x111416, 1).strokeRect(-24, -14, 48, 30);
      this.shopkeeperCarry.fillStyle(0x697173, 1).fillRect(-15, -5, 30, 4);
    }
    this.shopkeeperCarryLabel = this.add.text(0, 30, '×1', {
      color: '#f6f7f3', fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', backgroundColor: '#111416', padding: { left: 3, right: 3, top: 2, bottom: 2 },
    }).setOrigin(0.5).setDepth(9);
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
    const positions = [
      { x: 180, y: 405 },
      { x: 960, y: 405 },
      { x: 180, y: 540 },
    ];
    const index = Math.max(0, this.progress.shopStock.findIndex((entry) => entry.stockId === stockId));
    const position = positions[index] ?? { x: 960, y: 540 };
    return new Phaser.Math.Vector2(position.x, position.y + 72);
  }

  private getShopItemShelfPosition(item: ShopStockItem): Phaser.Math.Vector2 {
    const entry = this.progress.shopStock.find((candidate) => candidate.item === item && candidate.quantity > 0);
    return entry ? this.getShopShelfPosition(entry.stockId) : new Phaser.Math.Vector2(960, 612);
  }

  private startShopkeeperTransaction(
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
      return;
    }
    this.shopTransactionBusy = true;
    this.hud.closePanel();
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.cancelToolUse(true);
    this.clearInteractionHighlight();
    this.destinationMarker.setVisible(false);
    this.showToast('Shopkeeper is handling the transaction…', 1800);

    const handover = new Phaser.Math.Vector2(SHOP_HANDOVER_POINT.x, SHOP_HANDOVER_POINT.y);
    const home = new Phaser.Math.Vector2(SHOP_COUNTER.x, SHOP_COUNTER.y - 66);
    const firstStop = direction === 'buy' ? source : handover;
    const secondStop = direction === 'buy' ? handover : source;
    const finish = (): void => {
      this.shopkeeperTransactionTween = this.tweens.add({
        targets: this.shopkeeper,
        x: home.x,
        y: home.y,
        duration: 360,
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
        },
      });
    };
    const moveToSecond = (): void => {
      this.shopkeeperTransactionTween = this.tweens.add({
        targets: this.shopkeeper,
        x: secondStop.x,
        y: secondStop.y,
        duration: 520,
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
      duration: 420,
      ease: 'Sine.inOut',
      onUpdate: () => this.updateShopkeeperCarryPosition(),
      onComplete: () => {
        if (direction === 'buy' && item !== 'basil-seeds' && item !== 'mint-seeds' && item !== 'small-basic-plastic-pot') {
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
    const room = this.add.graphics().setDepth(-100);
    room.fillStyle(secondRental ? 0x314246 : 0x252a2d, 1).fillRect(0, 0, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT);
    room.fillStyle(0x454c4e, 1).fillRect(48, 80, HOME_WORLD_WIDTH - 96, HOME_WORLD_HEIGHT - 128);
    room.lineStyle(8, 0xf6f7f3, 0.95).strokeRect(48, 80, HOME_WORLD_WIDTH - 96, HOME_WORLD_HEIGHT - 128);
    room.lineStyle(3, 0x697271, 0.8).lineBetween(48, 430, HOME_WORLD_WIDTH - 48, 430);
    if (secondRental) {
      room.lineStyle(6, 0x9aa5a3, 0.9).lineBetween(450, 120, 450, 420);
      room.lineStyle(4, 0xf6f7f3, 0.9).lineBetween(450, 430, 450, 640);
      room.fillStyle(0x1d2527, 0.9).fillRect(82, 112, 330, 34).fillRect(500, 112, 330, 34);
      this.homeObjects.push(this.add.text(247, 129, 'LIVING ROOM', { color: '#f6f7f3', fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7));
      this.homeObjects.push(this.add.text(665, 129, 'GROWING ROOM · 6 POSITIONS', { color: '#f6f7f3', fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7));
    }
    this.homeObjects.push(room);

    const window = this.add.graphics().setDepth(3);
    window.fillStyle(0x111416, 1).fillRect(610, 150, 190, 150);
    window.lineStyle(5, 0xf6f7f3, 1).strokeRect(610, 150, 190, 150);
    window.lineStyle(3, 0x858d8d, 1).lineBetween(705, 150, 705, 300).lineBetween(610, 225, 800, 225);
    this.homeObjects.push(window);

    const growTable = this.add.graphics().setDepth(3);
    const firstSlot = growingSpots[0];
    const lastSlot = growingSpots[growingSpots.length - 1];
    const tableLeft = firstSlot.x - 48;
    const tableRight = lastSlot.x + 48;
    growTable.fillStyle(0x111416, 1).fillRect(tableLeft, firstSlot.y - 42, tableRight - tableLeft, 84);
    growTable.lineStyle(4, 0xf6f7f3, 0.95).strokeRect(tableLeft, firstSlot.y - 42, tableRight - tableLeft, 84);
    growingSpots.forEach((spot) => {
      growTable.fillStyle(0x697271, 1).fillRect(spot.x - 38, spot.y - 27, 76, 54);
      growTable.lineStyle(3, 0xf6f7f3, 0.95).strokeRect(spot.x - 38, spot.y - 27, 76, 54);
    });
    this.homeObjects.push(growTable);
    growingSpots.forEach((spot, index) => {
      const slotLabel = this.add.text(spot.x, spot.y + 31, `SLOT ${index + 1}`, {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '8px', fontStyle: 'bold',
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

    const exit = this.add.graphics().setDepth(4);
    exit.fillStyle(0x111416, 1).fillRect(HOME_EXIT.x - 48, HOME_EXIT.y - 72, 96, 78);
    exit.lineStyle(5, 0xf6f7f3, 1).strokeRect(HOME_EXIT.x - 48, HOME_EXIT.y - 72, 96, 78);
    this.homeObjects.push(exit);

    const labels = [
      { text: secondRental ? 'TWO-ROOM RENTAL' : 'YOUR RENTAL', x: HOME_WORLD_WIDTH / 2, y: 112, size: '26px' },
      { text: 'GROW TABLE', x: HOME_WORLD_WIDTH / 2, y: firstSlot.y + 70, size: '14px' },
      { text: 'WINDOW', x: 705, y: 326, size: '14px' },
      { text: 'EXIT', x: HOME_EXIT.x, y: HOME_EXIT.y + 28, size: '14px' },
    ];
    labels.forEach(({ text, x, y, size }) => {
      const label = this.add.text(x, y, text, {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: size, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7);
      this.homeObjects.push(label);
    });
    this.drawHomeInteriorKit();
  }

  private drawHomeInteriorKit(): void {
    this.homeStarterKitObjects.forEach((object) => object.destroy());
    this.homeStarterKitObjects = [];
    if (!this.homeInterior || this.activeProperty === 'second-rental') return;
    const kit = this.add.graphics().setDepth(4);
    kit.fillStyle(0x111416, 1).fillRect(HOME_STARTER_KIT.x - 95, HOME_STARTER_KIT.y - 46, 190, 72);
    kit.lineStyle(4, 0xf6f7f3, 0.95).strokeRect(HOME_STARTER_KIT.x - 95, HOME_STARTER_KIT.y - 46, 190, 72);
    kit.fillStyle(0x697271, 1).fillRect(HOME_STARTER_KIT.x - 72, HOME_STARTER_KIT.y - 23, 34, 24);
    kit.lineStyle(2, 0xf6f7f3, 0.9).strokeRect(HOME_STARTER_KIT.x - 72, HOME_STARTER_KIT.y - 23, 34, 24);
    kit.fillStyle(0x858d8d, 1).fillRect(HOME_STARTER_KIT.x - 10, HOME_STARTER_KIT.y - 23, 42, 24);
    kit.fillStyle(0xd8dddc, 1).fillRect(HOME_STARTER_KIT.x + 50, HOME_STARTER_KIT.y - 28, 10, 34);
    this.homeStarterKitObjects.push(kit);
    const label = this.add.text(HOME_STARTER_KIT.x, HOME_STARTER_KIT.y + 42,
      this.starterKitClaimed ? 'STARTER KIT CLAIMED' : 'STARTER KIT · TAP TO CLAIM', {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#111416', padding: { left: 5, right: 5, top: 3, bottom: 3 },
      }).setOrigin(0.5).setDepth(7);
    this.homeStarterKitObjects.push(label);
    const contents = this.add.text(HOME_STARTER_KIT.x, HOME_STARTER_KIT.y - 62,
      'POT · USED MEDIUM\nSEEDS · WATERING CAN\n1 BASIC FERTILISER', {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: '8px', fontStyle: 'bold',
        align: 'center', lineSpacing: 2,
        backgroundColor: '#111416', padding: { left: 5, right: 5, top: 3, bottom: 3 },
      }).setOrigin(0.5).setDepth(7);
    this.homeStarterKitObjects.push(contents);
    this.homeObjects.push(...this.homeStarterKitObjects);
  }

  private createWantedSign(): void {
    this.wantedSignBackdrop = this.add.graphics().setDepth(20);
    const signX = BUY_SELL_WINDOW.x + 18;
    const signY = BUY_SELL_WINDOW.y + 32;
    const signWidth = BUY_SELL_WINDOW.width - 36;
    const signHeight = 112;
    this.wantedSignText = this.add.text(BUY_SELL_WINDOW.x + BUY_SELL_WINDOW.width / 2, signY + signHeight / 2, '', {
      color: '#f6f7f3',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(21);
    this.refreshWantedSign();
  }

  private refreshWantedSign(): void {
    if (!this.wantedSignBackdrop || !this.wantedSignText) return;
    const requestOutstanding = !this.progress.saleComplete;
    const message = requestOutstanding
      ? 'WANTED\nGOLDEN POTHOS\nCASH PAID'
      : 'NO DELIVERIES\nWANTED';
    this.wantedSignBackdrop.clear();
    const signX = BUY_SELL_WINDOW.x + 18;
    const signY = BUY_SELL_WINDOW.y + 32;
    const signWidth = BUY_SELL_WINDOW.width - 36;
    const signHeight = 112;
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
    this.createPremiumDisplayItem(140, 260, 'B&W', 0xdfe3df, 0x3b4244, 0x697173);
    this.createPremiumDisplayItem(220, 335, 'NES', 0xc95b52, 0x3a78a8, 0x72a653);
    this.createPremiumDisplayItem(930, 260, 'PS', 0x4b3b66, 0xb7a6d8, 0x6c8bd1);
  }

  private createPremiumDisplayItem(
    x: number,
    y: number,
    label: string,
    potColor: number,
    leafColor: number,
    accentColor: number,
  ): void {
    const item = this.add.graphics().setDepth(4);
    item.fillStyle(0x111416, 1).fillRect(x - 22, y - 18, 44, 8);
    item.fillStyle(potColor, 1)
      .fillTriangle(x - 16, y - 10, x + 16, y - 10, x + 11, y + 17)
      .fillTriangle(x - 16, y - 10, x + 11, y + 17, x - 11, y + 17);
    item.lineStyle(3, 0x111416, 1).strokeRect(x - 16, y - 10, 32, 27);
    item.fillStyle(leafColor, 1)
      .fillTriangle(x, y - 18, x - 19, y - 38, x - 5, y - 43)
      .fillTriangle(x + 2, y - 18, x + 20, y - 37, x + 7, y - 43);
    item.lineStyle(2, accentColor, 0.95).lineBetween(x, y - 17, x - 13, y - 35).lineBetween(x + 2, y - 17, x + 14, y - 34);
    const name = this.add.text(x, y + 29, `${label} · DISPLAY`, {
      color: '#f6f7f3',
      fontFamily: 'monospace',
      fontSize: '8px',
      fontStyle: 'bold',
      backgroundColor: '#111416',
      padding: { left: 3, right: 3, top: 2, bottom: 2 },
    }).setOrigin(0.5).setDepth(7);
    this.shopObjects.push(item, name);
  }

  private createShopGoldenPothosDisplay(): void {
    if (!this.shopInterior || this.shopGoldenPothosDisplay.length > 0) return;
    const entries = this.progress.shopStock.filter((entry) => entry.quantity > 0);
    const positions = [
      { x: 180, y: 405 },
      { x: 960, y: 405 },
      { x: 180, y: 540 },
    ];
    entries.forEach((entry, index) => {
      const position = positions[index] ?? { x: 960, y: 540 };
      const item = this.add.graphics().setDepth(4).setPosition(position.x, position.y);
      if (entry.item === 'small-golden-pothos') {
        drawGoldenPothos(item, 0, 0, 0.55, this.progress.graphicsUpgradeInstalled);
      } else if (entry.item === 'special-repair-pot') {
        drawBrokenPot(item, 0, 0, 1.302, 10, this.progress.graphicsUpgradeInstalled);
      } else {
        this.drawHarvestCarry(item, entry.item === 'fresh-mint-leaves' ? 'mint' : 'basil');
      }
      const label = entry.item === 'small-golden-pothos' ? 'GOLDEN POTHOS' : entry.item === 'special-repair-pot' ? 'REPAIRED POT' : entry.item === 'fresh-mint-leaves' ? 'FRESH MINT' : 'FRESH BASIL';
      const stockLabel = this.add.text(position.x, position.y - 40, `${label}${entry.quantity > 1 ? ` ×${entry.quantity}` : ''}`, {
        color: '#f6f7f3',
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        backgroundColor: '#111416',
        padding: { left: 3, right: 3, top: 2, bottom: 2 },
      }).setOrigin(0.5).setDepth(7);
      const priceTag = this.add.text(position.x, position.y + 48, `${this.getShopBuyPrice(entry.item)} COINS EACH`, {
        color: '#111416',
        fontFamily: 'monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        backgroundColor: '#f6f7f3',
        padding: { left: 5, right: 5, top: 3, bottom: 3 },
      }).setOrigin(0.5).setDepth(7);
      this.shopGoldenPothosDisplay.push(item, stockLabel, priceTag);
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
    if (!preserveGardeningAction) this.pendingGardeningAction = null;
    this.growingSlotReadyToPlace = false;
    this.basilPotSelected = false;
    this.windowFacePromptRequired = false;
    this.windowFacingLocked = false;
    this.clearInteractionHighlight();
    if (this.brokenPotPieceSelected) {
      this.brokenPotPieceSelected = false;
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
    const insideCounter = x >= SHOP_COUNTER.x - 180 && x <= SHOP_COUNTER.x + 180
      && y >= SHOP_COUNTER.y - 62 && y <= SHOP_COUNTER.y + 112;
    const insideLeftShelf = x >= 82 && x <= 292 && y >= 210 && y <= 500;
    const insideRightShelf = x >= 868 && x <= 1078 && y >= 210 && y <= 500;
    return !insideCounter && !insideLeftShelf && !insideRightShelf;
  }

  private isHomeWalkablePosition(x: number, y: number): boolean {
    return x >= 72 && x <= HOME_WORLD_WIDTH - 72 && y >= 90 && y <= HOME_WORLD_HEIGHT - 72;
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
    if (!this.modalOpen && this.homeInterior && this.isNearHomeExit()) {
      this.hud.setAction('EXIT HOME');
      return;
    }
    if (!this.modalOpen && this.homeInterior && this.isNearStarterKit() && !this.starterKitClaimed) {
      this.hud.setAction('CLAIM STARTER KIT');
      return;
    }
    if (!this.modalOpen && this.homeInterior && this.growingSlotReadyToPlace) {
      this.hud.setAction('ADD POT TO THIS SQUARE');
      return;
    }
    if (!this.modalOpen && this.homeInterior && this.isNearGrowingSpotPlayer()) {
      if (!this.starterKitClaimed) this.hud.setAction('CLAIM STARTER KIT');
      else {
        const selectedPot = this.getSelectedGrowingPot();
        const nearbyPot = this.progress.growingPots.find((pot) => pot.slot !== null && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.getGrowingSpotForPot(pot).x, this.getGrowingSpotForPot(pot).y) <= BASIL_POT_INTERACTION_RADIUS);
        const pot = selectedPot ?? nearbyPot;
        if (!pot) this.hud.setAction(this.progress.growingPots.some((candidate) => candidate.slot === null) ? 'TAP EMPTY SLOT' : null);
        else if (this.basilPotSelected && pot.crop && this.getCropStage(pot) === 'planted') this.hud.setAction(`WATER ${pot.crop.species === 'mint' ? 'MINT' : 'BASIL'}`);
        else if (pot.crop && this.getCropStage(pot) === 'mature') this.hud.setAction(`HARVEST ${pot.crop.species === 'mint' ? 'MINT' : 'BASIL'}`);
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
      this.hud.setAction('FACE REAL ESTATE WINDOW');
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
