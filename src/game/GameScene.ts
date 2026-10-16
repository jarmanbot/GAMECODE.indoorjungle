import Phaser from 'phaser';
import { drawNeighborhood, drawPot, drawBrokenPot, setBuySellDoorOpen } from './art';
import { PHONE_HYBRID_CONTROLS } from './config';
import { DEFAULT_PROGRESS, sanitizeProgress, type EquippedTool, type PotCondition, type ProgressState, type TaskState } from './progress';
import {
  BUILDINGS,
  BUY_SELL_DOOR_BOTTOM,
  BUY_SELL_DOOR_HEIGHT,
  BUY_SELL_DOOR_TOP,
  BUY_SELL_DOOR_WIDTH,
  BUY_SELL_ENTRANCE,
  CROSSING_END_X,
  CROSSING_START_X,
  FRONT_PAVEMENT_MAX_Y,
  FRONT_PAVEMENT_MIN_Y,
  OPPOSITE_PAVEMENT_MAX_Y,
  OPPOSITE_PAVEMENT_MIN_Y,
  POT_POSITION,
  SHOP_COUNTER,
  SHOP_COUNTER_APPROACH,
  SHOP_EXIT,
  SHOP_PLAYER_START,
  SHOP_WORLD_HEIGHT,
  SHOP_WORLD_WIDTH,
  START_POSITION,
  STARTING_WALKABLE_MAX_X,
  STARTING_WALKABLE_MIN_X,
  WORLD_HEIGHT,
  WORLD_WIDTH,
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

type PendingInteraction = 'pickup' | 'pickup-broken' | 'enter-shop' | 'counter' | 'exit-shop';

export class GameScene extends Phaser.Scene {
  private readonly zoomOrder: ZoomMode[] = ['normal', 'close'];
  private readonly hud: HudController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
  private brokenPot!: Phaser.GameObjects.Graphics;
  private windowDirtOverlay!: Phaser.GameObjects.Graphics;
  private sprayEffect!: Phaser.GameObjects.Graphics;
  private repairPotDisplay?: Phaser.GameObjects.Graphics;
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
  private saleComplete = false;
  private coins = 0;
  private progress: ProgressState = sanitizeProgress(DEFAULT_PROGRESS);
  private readonly progressKey = 'indoor-jungle-progress-v1';
  private modalOpen = false;
  private mapMovementAllowed = false;
  private shopInterior = false;
  private shopTransitioning = false;
  private streetZoomMode: ZoomMode = 'close';
  private pendingInteraction: PendingInteraction | null = null;
  private streetPosition = new Phaser.Math.Vector2(START_POSITION.x, START_POSITION.y);
  private destinationMarker!: Phaser.GameObjects.Graphics;
  private interactionHighlight!: Phaser.GameObjects.Graphics;
  private streetObjects: Phaser.GameObjects.GameObject[] = [];
  private shopObjects: Phaser.GameObjects.GameObject[] = [];
  private toastTimer?: Phaser.Time.TimerEvent;
  private lastWorldInputAt = 0;
  private portraitFollowCentered = false;
  private closeFollowCentered = false;
  private phoneLandscapeBlocked = false;
  private phoneOrientation: 'portrait' | 'landscape' | 'other' | null = null;
  private toolHeld = false;
  private toolFeedbackAt = 0;
  private lastSavedCleaningStage = 0;
  private hopActive = false;
  private hopElapsed = 0;
  private readonly hopDuration = 520;
  private hopVisualOffset = 0;
  private lastFacing = new Phaser.Math.Vector2(0, -1);
  private repairPresentationActive = false;
  private repairAnimating = false;

  constructor(hud: HudController) {
    super('game-scene');
    this.hud = hud;
  }

  create(): void {
    this.loadProgress();
    this.buySellDoor = drawNeighborhood(this);
    this.createWindowDirtOverlay();
    this.createCars();
    this.createPlayer();
    this.createPot();
    this.createBrokenPot();
    this.createSprayEffect();
    this.createDestinationMarker();
    this.createInteractionHighlight();
    this.streetObjects = [...this.children.list];

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.applyZoom(this.zoomMode);
    this.cameras.main.roundPixels = true;

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
      } else {
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.applyZoom(this.zoomMode);
      }
      this.updatePhoneOrientationState();
    });

    this.hud.setZoomMode(this.zoomMode);
    this.syncHudState();
    this.updateProgressVisuals();
    this.updatePhoneOrientationState();
    this.updateInteraction();
  }

  update(_time: number, delta: number): void {
    this.updateCars(delta);

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
    if (!this.shopInterior) this.updateCloseVerticalFollow();

    const direction = new Phaser.Math.Vector2(
      this.mapMovementAllowed ? 0 : Number(this.cursorKeys.left.isDown || this.keys.A.isDown) * -1 + Number(this.cursorKeys.right.isDown || this.keys.D.isDown),
      this.mapMovementAllowed ? 0 : Number(this.cursorKeys.up.isDown || this.keys.W.isDown) * -1 + Number(this.cursorKeys.down.isDown || this.keys.S.isDown),
    );
    const hasKeyboardInput = direction.lengthSq() > 0;
    const hasJoystickInput = this.joystickSteering;
    if (hasKeyboardInput || hasJoystickInput) this.releaseTool();
    if (!this.shopInterior && (hasKeyboardInput || hasJoystickInput || this.target)) this.updatePortraitFollow();
    if (hasKeyboardInput) {
      direction.normalize();
      this.cancelTapWalk();
    } else if (hasJoystickInput) {
      direction.copy(this.joystickInput);
      this.cancelTapWalk();
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
      const speed = hasKeyboardInput || hasJoystickInput ? 235 : 190;
      const minX = this.shopInterior ? 82 : STARTING_WALKABLE_MIN_X;
      const maxX = this.shopInterior ? SHOP_WORLD_WIDTH - 82 : STARTING_WALKABLE_MAX_X;
      const minY = this.shopInterior ? 160 : FRONT_PAVEMENT_MIN_Y;
      const maxY = this.shopInterior ? SHOP_WORLD_HEIGHT - 72 : OPPOSITE_PAVEMENT_MAX_Y;
      const nextX = Phaser.Math.Clamp(
        this.player.x + direction.x * speed * delta / 1000,
        minX,
        maxX,
      );
      const nextY = Phaser.Math.Clamp(this.player.y + direction.y * speed * delta / 1000, minY, maxY);
      this.moveOnWalkableGround(nextX, nextY);
      this.updateFacing(direction);
      this.updateRepairInterruption();
      this.drawPlayer();
      if (!this.shopInterior) this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    }

    this.updateHop(delta);
    if (this.toolHeld && this.progress.equippedTool === 'cleaner') this.updateWindowCleaning(delta);
    this.updateInteraction();
  }

  setModalOpen(isOpen: boolean, preserveDestination = false): void {
    this.modalOpen = isOpen;
    // Map panels may preserve a pending destination for after close, but no
    // modal is allowed to keep Alex moving while it is open.
    this.mapMovementAllowed = false;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    if (isOpen && !preserveDestination) this.cancelTapWalk();
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
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopInterior || this.shopTransitioning) return;
    const index = this.zoomOrder.indexOf(this.zoomMode);
    const nextIndex = Phaser.Math.Clamp(index + direction, 0, this.zoomOrder.length - 1);
    this.applyZoom(this.zoomOrder[nextIndex]);
  }

  setZoom(mode: ZoomMode): void {
    if (this.phoneLandscapeBlocked || this.shopInterior || this.shopTransitioning) return;
    this.applyZoom(mode);
  }

  tryInteract(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
    if (this.pendingInteraction && !this.target) this.completePendingInteraction();
    else if (this.shopInterior && this.isWithinShopCounterRange()) this.openShopPanel();
    else if (!this.shopInterior && this.isPlayerNearBuySellEntrance()) this.selectPendingInteraction(
      'enter-shop',
      new Phaser.Math.Vector2(BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y),
    );
  }

  setJoystickInput(x: number, y: number, pointerHeld: boolean): void {
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
    if (!this.joystickSteering) this.cancelTapWalk();
    this.cancelToolUse(false);
    this.joystickSteering = true;
  }

  pressHop(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.hopActive) return;
    if (this.repairPresentationActive) this.cancelRepairPresentation();
    this.releaseTool();
    this.hopActive = true;
    this.hopElapsed = 0;
    this.hopVisualOffset = 0;
    this.drawPlayer();
  }

  pressTool(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.hopActive) return;
    if (!this.progress.equippedTool) {
      this.showToast('No tool equipped.', 1300);
      return;
    }
    if (this.progress.equippedTool === 'cleaner') {
      this.toolHeld = true;
      return;
    }
    this.advanceRepairStep();
  }

  equipTool(tool: Exclude<EquippedTool, null>): void {
    if (tool === 'cleaner' && !this.progress.cleanerOwned) return;
    if (tool === 'repair' && !this.progress.repairToolOwned) return;
    this.progress.equippedTool = tool;
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`${tool === 'cleaner' ? 'Cleaner' : 'Repair tool'} equipped.`);
    this.showToast(`${tool === 'cleaner' ? 'Cleaner' : 'Repair tool'} equipped.`, 1200);
  }

  releaseTool(): void {
    this.toolHeld = false;
    this.sprayEffect?.setVisible(false);
  }

  getShopPanelState(): { inventoryPot: PotCondition | null; saleComplete: boolean; windowJobAccepted: boolean; windowJobComplete: boolean } {
    return {
      inventoryPot: this.inventoryPot,
      saleComplete: this.saleComplete,
      windowJobAccepted: this.progress.windowJobAccepted,
      windowJobComplete: this.progress.windowJobComplete,
    };
  }

  private syncHudState(): void {
    this.hud.setGameState({
      coins: this.coins,
      inventoryHasPot: this.inventoryHasPot,
      inventoryPotCondition: this.inventoryPot,
      task: this.progress.task,
      equippedTool: this.progress.equippedTool,
      repairToolOwned: this.progress.repairToolOwned,
      cleanerOwned: this.progress.cleanerOwned,
      glueCharges: this.progress.glueCharges,
    });
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(this.progressKey);
      this.progress = sanitizeProgress(raw ? JSON.parse(raw) : DEFAULT_PROGRESS);
    } catch {
      this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    }
    this.coins = this.progress.coins;
    this.inventoryPot = this.progress.inventoryPot;
    this.inventoryHasPot = this.inventoryPot !== null;
    this.saleComplete = this.progress.saleComplete;
    if (this.inventoryPot === 'ordinary' && this.progress.task === 'find') this.progress.task = 'sell';
    if (this.saleComplete && this.progress.task === 'find') this.progress.task = 'clean';
    this.lastSavedCleaningStage = Math.floor(this.progress.windowCleaningProgress);
  }

  private saveProgress(): void {
    this.progress.coins = this.coins;
    this.progress.inventoryPot = this.inventoryPot;
    this.progress.saleComplete = this.saleComplete;
    this.progress.brokenPotOwned = this.inventoryPot === 'broken' || this.progress.brokenPotOwned;
    try { localStorage.setItem(this.progressKey, JSON.stringify(this.progress)); } catch { /* private browsing may deny storage */ }
  }

  private updateProgressVisuals(): void {
    if (this.pot) this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete);
    if (this.brokenPot) this.brokenPot.setVisible(this.progress.brokenPotAvailable && !this.progress.brokenPotOwned && !this.inventoryHasPot);
    if (this.windowDirtOverlay) {
      this.windowDirtOverlay.setVisible(this.progress.windowJobAccepted && !this.progress.windowJobComplete);
      this.windowDirtOverlay.setAlpha(Math.max(0.18, 1 - this.progress.windowCleaningProgress / 3));
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
    if (direction.lengthSq() > 0.001) this.lastFacing.copy(direction).normalize();
  }

  private cancelToolUse(cancelRepair: boolean): void {
    this.releaseTool();
    if (cancelRepair && this.repairPresentationActive) this.cancelRepairPresentation();
  }

  private updateRepairInterruption(): void {
    if (!this.repairPresentationActive || !this.repairPotDisplay) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.repairPotDisplay.x, this.repairPotDisplay.y) > 115) {
      this.cancelRepairPresentation();
    }
  }

  private getWindowInteractionPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(968, FRONT_PAVEMENT_MIN_Y + 24);
  }

  private isFacingWindow(): boolean {
    const point = this.getWindowInteractionPoint();
    const toward = new Phaser.Math.Vector2(point.x - this.player.x, point.y - this.player.y).normalize();
    return this.lastFacing.dot(toward) > 0.25;
  }

  private updateWindowCleaning(delta: number): void {
    if (this.hopActive || !this.progress.windowJobAccepted || this.progress.windowJobComplete || this.progress.equippedTool !== 'cleaner') return;
    const point = this.getWindowInteractionPoint();
    const inRange = Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) <= 150;
    if (!inRange || !this.isFacingWindow()) {
      this.sprayEffect.setVisible(false);
      const now = performance.now();
      if (now - this.toolFeedbackAt > 1800) {
        this.toolFeedbackAt = now;
        this.showToast(!inRange ? 'Move closer to the display window.' : 'Face the display window to spray.', 1200);
      }
      return;
    }
    this.sprayEffect.clear();
    this.sprayEffect.fillStyle(0xf6f7f3, 0.95).fillCircle(point.x - 18, point.y - 10, 6).fillCircle(point.x - 30, point.y - 22, 4).fillCircle(point.x - 42, point.y - 32, 3);
    this.sprayEffect.lineStyle(2, 0xf6f7f3, 0.8).lineBetween(point.x - 10, point.y - 8, point.x - 48, point.y - 38);
    this.sprayEffect.setVisible(true);
    this.progress.windowCleaningProgress = Math.min(3, this.progress.windowCleaningProgress + delta / 1000 * 0.7);
    this.windowDirtOverlay.setAlpha(Math.max(0.18, 1 - this.progress.windowCleaningProgress / 3));
    const cleaningStage = Math.floor(this.progress.windowCleaningProgress);
    if (cleaningStage !== this.lastSavedCleaningStage) {
      this.lastSavedCleaningStage = cleaningStage;
      this.saveProgress();
    }
    if (this.progress.windowCleaningProgress >= 3) this.completeWindowJob();
  }

  private completeWindowJob(): void {
    if (this.progress.windowJobComplete) return;
    this.progress.windowJobAccepted = false;
    this.progress.windowJobComplete = true;
    this.progress.cleanerOwned = false;
    this.progress.repairToolOwned = true;
    this.progress.glueCharges = Math.max(1, this.progress.glueCharges);
    this.progress.equippedTool = 'repair';
    this.progress.brokenPotAvailable = true;
    this.progress.task = 'repair';
    this.coins += 3;
    this.progress.coins = this.coins;
    this.sprayEffect.setVisible(false);
    this.updateProgressVisuals();
    this.saveProgress();
    this.syncHudState();
    this.showToast('Window clean. +3 coins. A repair tool and glue were added.');
  }

  beginPortableRepair(): void {
    if (this.shopInterior || !this.progress.repairToolOwned || this.progress.glueCharges < 1 || this.inventoryPot !== 'broken') {
      this.showToast('Repair needs the repair tool, glue and a broken pot.', 1600);
      return;
    }
    const direction = this.lastFacing.clone().normalize();
    const candidate = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(this.player.x + direction.x * 78, STARTING_WALKABLE_MIN_X + 28, STARTING_WALKABLE_MAX_X - 28),
      Phaser.Math.Clamp(this.player.y + direction.y * 78, FRONT_PAVEMENT_MIN_Y + 28, FRONT_PAVEMENT_MAX_Y - 18),
    );
    if (!this.isWalkablePosition(candidate.x, candidate.y) || this.isNearBuySellDoor(new Phaser.Math.Vector2(candidate.x, candidate.y))) {
      this.showToast('There is no clear ground directly ahead to repair the pot.', 1800);
      return;
    }
    this.repairPotDisplay?.destroy();
    this.repairPotDisplay = this.add.graphics().setDepth(24).setPosition(candidate.x, candidate.y);
    drawBrokenPot(this.repairPotDisplay, 0, 0, 0.95, this.progress.repairStep);
    this.repairPresentationActive = true;
    this.progress.equippedTool = 'repair';
    this.hud.setEquippedTool('repair');
    this.showToast('Repair: Align pieces, Join cracks, Finish repair. Press B once for each step.', 2600);
  }

  private advanceRepairStep(): void {
    if (!this.repairPresentationActive || this.repairAnimating || this.hopActive || this.inventoryPot !== 'broken') return;
    this.repairAnimating = true;
    const labels = ['Align pieces', 'Join cracks', 'Finish repair'];
    this.showToast(labels[Math.min(this.progress.repairStep, 2)], 700);
    this.time.delayedCall(360, () => {
      if (!this.repairPresentationActive) {
        this.repairAnimating = false;
        return;
      }
      this.progress.repairStep = Math.min(3, this.progress.repairStep + 1);
      this.repairPotDisplay?.clear();
      if (this.repairPotDisplay) drawBrokenPot(this.repairPotDisplay, 0, 0, 0.95, this.progress.repairStep);
      this.repairAnimating = false;
      this.saveProgress();
      if (this.progress.repairStep >= 3) this.completeRepair();
    });
  }

  private completeRepair(): void {
    if (this.inventoryPot !== 'broken' || this.progress.glueCharges < 1) return;
    this.progress.glueCharges -= 1;
    this.inventoryPot = 'repaired';
    this.inventoryHasPot = true;
    this.progress.inventoryPot = 'repaired';
    this.progress.task = 'sell-repaired';
    this.repairPresentationActive = false;
    this.repairPotDisplay?.setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Pot repaired. Sell it at BUY / SELL for 10 coins.');
  }

  private cancelRepairPresentation(): void {
    if (!this.repairPresentationActive) return;
    this.repairPresentationActive = false;
    this.repairAnimating = false;
    this.repairPotDisplay?.setVisible(false);
    this.releaseTool();
    this.showToast('Repair paused. Completed steps were kept in the Bag.', 1500);
  }

  private handleKeyboardInteraction(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
    if (this.shopInterior && this.isWithinShopCounterRange()) {
      this.openShopPanel();
      return;
    }
    if (!this.shopInterior && this.isPlayerNearBuySellEntrance()) {
      this.selectPendingInteraction(
        'enter-shop',
        new Phaser.Math.Vector2(BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y),
      );
    }
  }

  sellOpeningPot(): void {
    // The shop panel is intentionally modal while this action is performed;
    // modalOpen must not reject the panel's own transaction button.
    if (!this.shopInterior || this.inventoryPot !== 'ordinary' || this.saleComplete) return;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.saleComplete = true;
    this.coins += 5;
    this.progress.inventoryPot = null;
    this.progress.coins = this.coins;
    this.progress.saleComplete = true;
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel('Pot sold for 5 coins.');
    this.showToast('Pot sold for 5 coins.');
  }

  sellRepairedPot(): void {
    if (!this.shopInterior || this.inventoryPot !== 'repaired') return;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.coins += 10;
    this.progress.inventoryPot = null;
    this.progress.coins = this.coins;
    this.progress.task = 'complete';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel('Repaired pot sold for 10 coins.');
    this.showToast('Repaired pot sold for 10 coins.');
  }

  acceptWindowJob(): void {
    if (!this.shopInterior || !this.saleComplete || this.progress.windowJobAccepted || this.progress.windowJobComplete) return;
    this.progress.windowJobAccepted = true;
    this.progress.cleanerOwned = true;
    this.progress.equippedTool = 'cleaner';
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel('Cleaner borrowed and equipped.');
    this.showToast('Cleaner equipped. Face the display window and hold B.');
  }

  restartPrototype(): void {
    this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.saleComplete = false;
    this.coins = 0;
    this.saveProgress();
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y).setVisible(true);
    this.drawPlayer();
    this.updateProgressVisuals();
    this.syncHudState();
    this.hud.setMapPosition(START_POSITION.x / WORLD_WIDTH, START_POSITION.y);
    this.showToast('Prototype restarted.');
    this.updateInteraction();
  }

  private createPlayer(): void {
    this.player = this.add.graphics().setDepth(30);
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.drawPlayer();
  }

  private drawPlayer(): void {
    this.player.clear();
    const lift = this.hopVisualOffset;
    this.player.fillStyle(0x111416, 0.65).fillEllipse(0, 32, 30, 8);
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-14, -43 - lift, 28, 56);
    this.player.lineStyle(3, 0x111416, 1).strokeRect(-14, -43 - lift, 28, 56);
    this.player.fillStyle(0x111416, 1).fillRect(-8, -31 - lift, 5, 6).fillRect(3, -31 - lift, 5, 6);
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-13, 13 - lift, 10, 18).fillRect(3, 13 - lift, 10, 18);
    this.player.lineStyle(3, 0x111416, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
  }

  private createPot(): void {
    this.pot = this.add.graphics().setDepth(22);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y);
    drawPot(this.pot, 0, 0, 0.9);
    this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete);
  }

  private createBrokenPot(): void {
    this.brokenPot = this.add.graphics().setDepth(22);
    const position = this.getBrokenPotPosition();
    this.brokenPot.setPosition(position.x, position.y);
    drawBrokenPot(this.brokenPot, 0, 0, 0.95, this.progress.repairStep);
    this.brokenPot.setVisible(this.progress.brokenPotAvailable && !this.progress.brokenPotOwned);
  }

  private createWindowDirtOverlay(): void {
    this.windowDirtOverlay = this.add.graphics().setDepth(8);
    const window = BUILDINGS.find((building) => building.key === 'buy-sell');
    if (!window) return;
    this.windowDirtOverlay.fillStyle(0x111416, 0.42).fillRect(window.x + 38, window.y + 130, 100, 126);
    this.windowDirtOverlay.fillStyle(0x858d8d, 0.42);
    for (let index = 0; index < 7; index += 1) {
      this.windowDirtOverlay.fillRect(window.x + 47 + (index % 3) * 32, window.y + 143 + Math.floor(index / 3) * 39, 18, 8);
    }
    this.windowDirtOverlay.setVisible(this.progress.windowJobAccepted && !this.progress.windowJobComplete);
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
    if (this.modalOpen || this.phoneLandscapeBlocked || this.joystickPointerHeld || event.pointerType === 'mouse' && event.button !== 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
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
    if (this.modalOpen || this.phoneLandscapeBlocked || this.joystickPointerHeld) {
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
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.joystickPointerHeld) return;
    const point = this.cameras.main.getWorldPoint(screenX, screenY);
    if (this.shopInterior) {
      this.handleShopWorldPoint(point.x, point.y);
      return;
    }
    const brokenPosition = this.getBrokenPotPosition();
    if (this.isNearPoint(point, brokenPosition, 92) && this.progress.brokenPotAvailable && !this.progress.brokenPotOwned && !this.inventoryHasPot && this.brokenPot.visible) {
      const approach = new Phaser.Math.Vector2(brokenPosition.x - 72, brokenPosition.y);
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, brokenPosition.x, brokenPosition.y) <= 105) {
        this.selectPendingInteraction('pickup-broken', approach);
      } else {
        const tapPath = this.getTapPath(approach.x, approach.y);
        if (!tapPath) {
          this.cancelTapWalk();
          this.showToast('That pot cannot be reached.', 1500);
          return;
        }
        this.selectPendingInteraction('pickup-broken', approach, tapPath);
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

  private selectWalkPath(path: Phaser.Math.Vector2[]): void {
    this.pendingInteraction = null;
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
    this.cancelTapWalk();
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
    if (this.isNearPoint(point, SHOP_EXIT, 105)) {
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

  private getShopTapPath(x: number, y: number): Phaser.Math.Vector2[] | null {
    if (!this.isShopWalkablePosition(x, y)) return null;
    return [new Phaser.Math.Vector2(x, y)];
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
      this.interactionHighlight.strokeRect(point.x - 58, point.y - 62, 116, 70);
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
    if (interaction === 'pickup-broken') this.collectBrokenPot();
    if (interaction === 'enter-shop') this.enterShop();
    if (interaction === 'counter') this.openShopPanel();
    if (interaction === 'exit-shop') this.exitShop();
  }

  private collectPot(): void {
    if (this.shopInterior || this.inventoryHasPot || !this.pot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y) > 110) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'ordinary';
    this.pot.setVisible(false);
    this.progress.inventoryPot = 'ordinary';
    this.progress.task = 'sell';
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Pot collected. Take it to BUY / SELL.');
  }

  private collectBrokenPot(): void {
    const position = this.getBrokenPotPosition();
    if (this.shopInterior || this.inventoryHasPot || !this.brokenPot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > 110) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'broken';
    this.progress.inventoryPot = 'broken';
    this.progress.brokenPotOwned = true;
    this.progress.brokenPotAvailable = false;
    this.progress.task = 'repair';
    this.brokenPot.setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Broken pot collected. Repair it from the Bag.');
  }

  private openShopPanel(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.cancelTapWalk();
    this.hud.openPanel('shop');
  }

  private enterShop(): void {
    if (this.shopInterior || this.shopTransitioning) return;
    this.shopTransitioning = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
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
    this.drawShopInterior();
    this.player.setPosition(SHOP_PLAYER_START.x, SHOP_PLAYER_START.y).setAlpha(1).setVisible(true);
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.setShopCamera();
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
  }

  private exitShop(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.shopTransitioning = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.cancelTapWalk();
    this.cameras.main.fadeOut(120, 7, 9, 10);
    this.time.delayedCall(120, () => this.exitShopNow());
  }

  private exitShopNow(): void {
    this.shopObjects.forEach((object) => object.destroy());
    this.shopObjects = [];
    this.shopInterior = false;
    setBuySellDoorOpen(this.buySellDoor!, false);
    this.setObjectsVisible(this.streetObjects, true);
    this.player.setPosition(BUY_SELL_ENTRANCE.x - 82, FRONT_PAVEMENT_MAX_Y - 18).setAlpha(1).setVisible(true);
    this.updateProgressVisuals();
    this.destinationMarker.setVisible(false);
    this.clearInteractionHighlight();
    this.zoomMode = this.streetZoomMode;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.applyZoom(this.streetZoomMode);
    this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    this.shopTransitioning = false;
    this.cameras.main.fadeIn(160, 7, 9, 10);
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
    const room = this.add.graphics().setDepth(-100);
    room.fillStyle(0x252a2d, 1).fillRect(0, 0, SHOP_WORLD_WIDTH, SHOP_WORLD_HEIGHT);
    room.fillStyle(0x454c4e, 1).fillRect(56, 110, SHOP_WORLD_WIDTH - 112, SHOP_WORLD_HEIGHT - 170);
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

    const counter = this.add.graphics().setDepth(5);
    counter.fillStyle(0x111416, 1).fillRect(SHOP_COUNTER.x - 180, SHOP_COUNTER.y - 62, 360, 112);
    counter.fillStyle(0x858d8d, 1).fillRect(SHOP_COUNTER.x - 159, SHOP_COUNTER.y - 42, 318, 30);
    counter.lineStyle(5, 0xf6f7f3, 0.95).strokeRect(SHOP_COUNTER.x - 180, SHOP_COUNTER.y - 62, 360, 112);
    this.shopObjects.push(counter);

    const shopkeeper = this.add.graphics().setDepth(6);
    shopkeeper.fillStyle(0xf6f7f3, 1).fillRect(SHOP_COUNTER.x - 28, SHOP_COUNTER.y - 132, 56, 66);
    shopkeeper.lineStyle(4, 0x111416, 1).strokeRect(SHOP_COUNTER.x - 28, SHOP_COUNTER.y - 132, 56, 66);
    shopkeeper.fillStyle(0x111416, 1).fillRect(SHOP_COUNTER.x - 17, SHOP_COUNTER.y - 118, 8, 8).fillRect(SHOP_COUNTER.x + 9, SHOP_COUNTER.y - 118, 8, 8);
    this.shopObjects.push(shopkeeper);

    const exit = this.add.graphics().setDepth(4);
    exit.fillStyle(0x111416, 1).fillRect(SHOP_EXIT.x - 52, SHOP_EXIT.y - 72, 104, 78);
    exit.lineStyle(5, 0xf6f7f3, 1).strokeRect(SHOP_EXIT.x - 52, SHOP_EXIT.y - 72, 104, 78);
    this.shopObjects.push(exit);

    const labels = [
      { text: 'BUY / SELL', x: SHOP_COUNTER.x, y: 150, size: '26px' },
      { text: 'COUNTER', x: SHOP_COUNTER.x, y: SHOP_COUNTER.y + 72, size: '15px' },
      { text: 'EXIT', x: SHOP_EXIT.x, y: SHOP_EXIT.y + 28, size: '14px' },
    ];
    labels.forEach(({ text, x, y, size }) => {
      const label = this.add.text(x, y, text, {
        color: '#f6f7f3', fontFamily: 'monospace', fontSize: size, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7);
      this.shopObjects.push(label);
    });
  }

  private readonly handleCanvasWheel = (event: WheelEvent): void => {
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning) return;
      event.preventDefault();
    this.zoomBy(event.deltaY > 0 ? -1 : 1);
  };

  private readonly handleZoomKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space' || event.key.toLowerCase() === 'q') {
      if (!this.modalOpen && !this.phoneLandscapeBlocked && !this.shopTransitioning) event.preventDefault();
      return;
    }
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning) return;
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
    const followLerp = mode === 'close' ? 0.14 : 0.08;
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
    const followLerp = this.zoomMode === 'close' ? 0.14 : 0.08;
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
    const followLerp = 0.14;
    // Change the target offset in place so Phaser keeps the current scroll
    // position and eases into the new composition instead of snapping.
    this.cameras.main.setFollowOffset(followOffsetX, shouldCenter ? 0 : frame.offsetY);
    this.cameras.main.setLerp(followLerp, followLerp);
  }

  private getHorizontalDeadzone(): number {
    const viewportWidth = Math.max(1, this.scale.width);
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
      // Close is one camera level. Do not derive its magnification from the
      // nearest storefront: different building widths otherwise create an
      // apparent third zoom while Alex walks along the street.
      const referenceBuilding = BUILDINGS.find((candidate) => candidate.key === 'buy-sell') ?? BUILDINGS[0];
      const referenceLeft = Math.min(START_POSITION.x - 20, referenceBuilding.x);
      const referenceRight = Math.max(START_POSITION.x + 20, referenceBuilding.x + referenceBuilding.width);
      const referenceTop = referenceBuilding.y - 18;
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
      ? { left: 560, right: 2530, top: 390, bottom: 1240 }
      : compactLandscape
        ? { left: 540, right: 2400, top: 430, bottom: 1210 }
        : { left: 560, right: 1680, top: 390, bottom: 1240 };
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

  private cancelTapWalk(): void {
    this.target = null;
    this.targetQueue = [];
    if (this.destinationMarker) this.destinationMarker.setVisible(false);
    this.pendingInteraction = null;
    this.clearInteractionHighlight();
  }

  private moveOnWalkableGround(nextX: number, nextY: number): void {
    const currentX = this.player.x;
    const currentY = this.player.y;
    const isWalkable = (x: number, y: number): boolean => this.shopInterior
      ? this.isShopWalkablePosition(x, y)
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
    this.hud.setAction(null);
  }

  private showToast(message: string, duration = 3300): void {
    this.hud.showToast(message);
    if (this.toastTimer) this.toastTimer.remove(false);
    this.toastTimer = this.time.delayedCall(duration, () => this.hud.showToast(''));
  }
}
