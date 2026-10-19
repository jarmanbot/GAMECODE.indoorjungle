import Phaser from 'phaser';
import { drawNeighborhood, drawPot, drawGoldenPothos, drawBrokenPot, drawBrokenPotPieces, setBuySellDoorOpen } from './art';
import { AudioController } from './AudioController';
import { PHONE_HYBRID_CONTROLS } from './config';
import { DEFAULT_PROGRESS, sanitizeProgress, type EquippedTool, type InventoryItem, type PotCondition, type ProgressState, type TaskState } from './progress';
import {
  BUILDINGS,
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

type PendingInteraction = 'pickup' | 'select-broken-piece' | 'pickup-repaired' | 'window-clean' | 'enter-shop' | 'counter' | 'exit-shop';
type PlayerFacing = 'front' | 'back' | 'left' | 'right';

export class GameScene extends Phaser.Scene {
  private readonly zoomOrder: ZoomMode[] = ['normal', 'close'];
  private readonly hud: HudController;
  private readonly audio: AudioController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
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
  private saleComplete = false;
  private coins = 0;
  private progress: ProgressState = sanitizeProgress(DEFAULT_PROGRESS);
  private readonly progressKey = 'indoor-jungle-progress-v1';
  private modalOpen = false;
  private mapMovementAllowed = false;
  private shopInterior = false;
  private shopTransitioning = false;
  private movementReleaseRequired = false;
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
  private sprayTimer?: Phaser.Time.TimerEvent;
  private wantedSignBackdrop?: Phaser.GameObjects.Graphics;
  private wantedSignText?: Phaser.GameObjects.Text;
  private wantedSignPulse?: Phaser.Tweens.Tween;
  private shopGoldenPothosDisplay: Phaser.GameObjects.GameObject[] = [];
  private hopActive = false;
  private hopElapsed = 0;
  private readonly hopDuration = 520;
  private hopVisualOffset = 0;
  private lastFacing = new Phaser.Math.Vector2(0, 1);
  private playerFacing: PlayerFacing = 'front';
  private windowFacingLocked = false;
  private repairPresentationActive = false;
  private repairPickupReady = false;
  private repairAnimating = false;
  private brokenPotPieceSelected = false;

  constructor(hud: HudController, audio: AudioController) {
    super('game-scene');
    this.hud = hud;
    this.audio = audio;
  }

  create(): void {
    this.loadProgress();
    this.buySellDoor = drawNeighborhood(this);
    this.createWantedSign();
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
      // A stalled browser frame should not turn into a large teleport. This
      // is especially noticeable while a captured phone pointer is steering
      // the joystick and the camera is following Alex.
      const movementDelta = Math.min(delta, 32);
      const speed = hasKeyboardInput || hasJoystickInput ? 235 : 190;
      const minX = this.shopInterior ? 82 : STARTING_WALKABLE_MIN_X;
      const maxX = this.shopInterior ? SHOP_WORLD_WIDTH - 82 : STARTING_WALKABLE_MAX_X;
      const minY = this.shopInterior ? 160 : FRONT_PAVEMENT_MIN_Y;
      const maxY = this.shopInterior ? SHOP_WORLD_HEIGHT - 72 : OPPOSITE_PAVEMENT_MAX_Y;
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
      if (!this.shopInterior) this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    }

    // Alex faces the player whenever movement has ended. The window-cleaning
    // task is the one deliberate exception: Alex must keep their back to the
    // player while working on the HOMES display.
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
    else if (!this.shopInterior && this.progress.windowJobAccepted && this.isNearWindowApproach()) {
      this.windowFacingLocked = true;
      this.faceDirection(new Phaser.Math.Vector2(0, -1));
      this.showToast('Face the HOMES display window, then tap B eight times.', 1700);
    }
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
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning || this.hopActive) return;
    this.audio.unlock();
    if (this.brokenPotPieceSelected) {
      this.collectBrokenPotPiece();
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
    this.progress.equippedTool = tool;
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel(`${tool === 'cleaner' ? 'Cleaner' : 'Repair tool'} equipped.`);
    this.showToast(`${tool === 'cleaner' ? 'Cleaner' : 'Repair tool'} equipped.`, 1200);
  }

  releaseTool(): void {
    this.toolHeld = false;
  }

  getShopPanelState(): { inventoryPot: PotCondition | null; inventoryItem: InventoryItem | null; saleComplete: boolean; windowJobAccepted: boolean; windowJobComplete: boolean } {
    return {
      inventoryPot: this.inventoryPot,
      inventoryItem: this.progress.inventoryItem,
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
      inventoryItem: this.progress.inventoryItem,
      task: this.progress.task,
      equippedTool: this.progress.equippedTool,
      repairToolOwned: this.progress.repairToolOwned,
      cleanerOwned: this.progress.cleanerOwned,
      glueCharges: this.progress.glueCharges,
      brokenPotPieceSelected: this.brokenPotPieceSelected,
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
  }

  private saveProgress(): void {
    this.progress.coins = this.coins;
    this.progress.inventoryPot = this.inventoryPot;
    this.progress.inventoryItem = this.inventoryPot === 'ordinary'
      ? 'small-golden-pothos'
      : this.inventoryPot ? 'special-repair-pot' : null;
    this.progress.saleComplete = this.saleComplete;
    this.progress.brokenPotOwned = this.inventoryPot === 'broken' || this.progress.brokenPotOwned;
    try { localStorage.setItem(this.progressKey, JSON.stringify(this.progress)); } catch { /* private browsing may deny storage */ }
  }

  private updateProgressVisuals(): void {
    if (this.pot) this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete);
    // The broken pieces remain visible even while the opening pot is still in
    // the Bag. Selling is no longer the next required objective, so hiding
    // the ground item here made the repair pickup appear to be missing.
    if (this.brokenPot) {
      const shouldShowBrokenPot = this.progress.brokenPotAvailable && !this.progress.brokenPotOwned;
      if (shouldShowBrokenPot) {
        if (this.progress.brokenPotPiecesRemaining <= 0) this.progress.brokenPotPiecesRemaining = 3;
        const piecesRemaining = this.progress.brokenPotPiecesRemaining;
        this.brokenPot.clear();
        drawBrokenPotPieces(this.brokenPot, 0, 0, 1.08, piecesRemaining);
      }
      this.brokenPot.setVisible(shouldShowBrokenPot);
    }
    if (this.windowDirtOverlay) {
      this.windowDirtOverlay.setVisible(this.progress.windowJobAccepted && !this.progress.windowJobComplete);
      this.windowDirtOverlay.setAlpha(Math.max(0.12, 1 - this.progress.windowCleaningProgress / 8));
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
    if (cancelRepair && this.repairPresentationActive) this.cancelRepairPresentation();
  }

  private updateRepairInterruption(): void {
    if (!this.repairPresentationActive || !this.repairPotDisplay) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.repairPotDisplay.x, this.repairPotDisplay.y) > 115) {
      this.cancelRepairPresentation();
    }
  }

  private getWindowInteractionPoint(): Phaser.Math.Vector2 {
    // This is a walkable point directly below the HOMES estate-agent display.
    // Selecting the window routes Alex here and explicitly turns them toward
    // the facade, so the cleaning job never depends on guesswork.
    return new Phaser.Math.Vector2(1440, FRONT_PAVEMENT_MIN_Y + 10);
  }

  private getWindowDisplayPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(1440, 680);
  }

  private isNearWindowApproach(): boolean {
    const point = this.getWindowInteractionPoint();
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) <= 130;
  }

  private isWindowDisplayPoint(point: Phaser.Math.Vector2): boolean {
    return point.x >= 1270 && point.x <= 1630 && point.y >= 580 && point.y <= 790;
  }

  private isFacingWindow(): boolean {
    const point = this.getWindowDisplayPoint();
    const toward = new Phaser.Math.Vector2(point.x - this.player.x, point.y - this.player.y).normalize();
    return this.lastFacing.dot(toward) > 0.72;
  }

  private advanceWindowCleaningTap(): void {
    if (this.hopActive || !this.progress.windowJobAccepted || this.progress.windowJobComplete || this.progress.equippedTool !== 'cleaner') return;
    const inRange = this.isNearWindowApproach();
    if (!inRange || !this.isFacingWindow()) {
      const now = performance.now();
      if (now - this.toolFeedbackAt > 700) {
        this.toolFeedbackAt = now;
        this.showToast(!inRange ? 'Move closer to the HOMES window.' : 'Tap the HOMES window to face it, then tap B.', 1300);
      }
      return;
    }

    this.audio.playToolUse();
    const approach = this.getWindowInteractionPoint();
    const display = this.getWindowDisplayPoint();
    this.sprayEffect.clear();
    // Deliberately oversized, high-contrast spray burst: it is a feedback
    // effect only and does not change Alex’s collision or ground position.
    this.sprayEffect.fillStyle(0xf6f7f3, 0.98).fillCircle(approach.x, approach.y - 48, 13);
    this.sprayEffect.fillStyle(0xd8dddc, 0.96);
    for (let index = 0; index < 10; index += 1) {
      const spread = (index - 4.5) * 15;
      const progress = 0.25 + (index % 3) * 0.21;
      this.sprayEffect.fillCircle(
        approach.x + spread * progress,
        approach.y - 70 - progress * 100,
        5 + (index % 3),
      );
    }
    this.sprayEffect.lineStyle(5, 0xf6f7f3, 0.92)
      .lineBetween(approach.x, approach.y - 56, display.x, display.y + 48)
      .lineBetween(approach.x - 15, approach.y - 58, display.x - 55, display.y + 58)
      .lineBetween(approach.x + 15, approach.y - 58, display.x + 55, display.y + 58);
    this.sprayEffect.lineStyle(3, 0x111416, 0.95).strokeRect(display.x - 166, display.y - 84, 332, 168);
    this.sprayEffect.setVisible(true);
    this.sprayTimer?.remove(false);
    this.sprayTimer = this.time.delayedCall(420, () => this.stopSprayEffect());

    this.progress.windowCleaningProgress = Math.min(8, this.progress.windowCleaningProgress + 1);
    this.lastSavedCleaningStage = this.progress.windowCleaningProgress;
    this.windowDirtOverlay.setAlpha(Math.max(0.12, 1 - this.progress.windowCleaningProgress / 8));
    this.saveProgress();
    this.showToast(`SPRAY ${this.progress.windowCleaningProgress} / 8`, 850);
    if (this.progress.windowCleaningProgress >= 8) this.completeWindowJob();
  }

  private stopSprayEffect(): void {
    this.sprayTimer?.remove(false);
    this.sprayTimer = undefined;
    this.sprayEffect?.clear().setVisible(false);
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
    this.progress.brokenPotPiecesRemaining = 3;
    this.progress.task = 'repair';
    this.windowFacingLocked = false;
    this.faceDirection(new Phaser.Math.Vector2(0, 1));
    this.coins += 3;
    this.progress.coins = this.coins;
    this.sprayEffect.setVisible(false);
    this.updateProgressVisuals();
    this.saveProgress();
    this.syncHudState();
    this.showToast('HOMES window clean. +3 coins. A repair tool and glue were added.');
  }

  beginPortableRepair(): void {
    if (this.shopInterior) {
      this.showToast('Repair the pot outside on the street.', 1600);
      return;
    }
    if (this.inventoryPot === 'broken' && (this.repairPickupReady || this.progress.repairStep >= 10)) {
      this.repairPickupReady = true;
      this.createRepairPickupPresentation();
      this.showToast('The pot is repaired. Click it to put it in the Bag.', 2200);
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
    this.repairPickupPrompt = this.add.text(this.repairPotDisplay.x, this.repairPotDisplay.y - 88, 'CLICK TO PUT IN BAG', {
      color: '#f6f7f3',
      fontFamily: 'monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      stroke: '#111416',
      strokeThickness: 5,
      backgroundColor: '#111416',
      padding: { left: 7, right: 7, top: 4, bottom: 4 },
    }).setOrigin(0.5).setDepth(27);
  }

  private drawRepairPresentation(): void {
    if (!this.repairPotDisplay) return;
    const stage = Phaser.Math.Clamp(this.progress.repairStep, 0, 10);
    const display = this.repairPotDisplay;
    display.clear();

    // Keep the repair target grounded and conspicuous without changing its
    // collision footprint or turning it into a second collectible.
    display.fillStyle(0x111416, 0.55).fillEllipse(0, 25, 116, 22);
    display.lineStyle(3, 0xf6f7f3, 0.9).strokeEllipse(0, 22, 142, 38);
    drawBrokenPot(display, 0, 0, 1.15, stage);

    // Ten chunky segments make the required taps visible at a glance.
    for (let index = 0; index < 10; index += 1) {
      const x = -54 + index * 12;
      display.fillStyle(index < stage ? 0xf6f7f3 : 0x3b4244, 1).fillRect(x, 43, 9, 8);
      display.lineStyle(1, 0xbfc5c3, 0.9).strokeRect(x, 43, 9, 8);
    }
  }

  private advanceRepairStep(): void {
    if (this.repairPickupReady) {
      this.showToast('The pot is repaired. Click it to put it in the Bag.', 1600);
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
    this.drawRepairPresentation();
    this.createRepairPickupPresentation();
    this.saveProgress();
    this.syncHudState();
    this.showToast('Pot fully repaired. Click it to put it in the Bag.', 2400);
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

  private setRepairPickupPresentationVisible(visible: boolean): void {
    this.repairPotDisplay?.setVisible(visible);
    this.repairPickupPrompt?.setVisible(visible);
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
    this.progress.inventoryItem = null;
    this.progress.coins = this.coins;
    this.progress.saleComplete = true;
    this.progress.shopGoldenPothosStock = true;
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.refreshWantedSign();
    this.createShopGoldenPothosDisplay();
    this.hud.refreshShopPanel('Small Golden Pothos delivered. +5 coins.');
    this.showToast('Small Golden Pothos sold for 5 coins.');
  }

  sellRepairedPot(): void {
    if (!this.shopInterior || this.inventoryPot !== 'repaired') return;
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.progress.inventoryItem = null;
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
    const openingPotCollected = this.inventoryPot === 'ordinary' || this.saleComplete;
    if (!this.shopInterior || !openingPotCollected || this.progress.windowJobAccepted || this.progress.windowJobComplete) return;
    this.progress.windowJobAccepted = true;
    this.progress.cleanerOwned = true;
    this.progress.equippedTool = 'cleaner';
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.refreshShopPanel('Cleaner borrowed and equipped.');
    this.showToast('Cleaner equipped. Tap the HOMES display window, then tap B eight times.', 5200);
  }

  restartPrototype(): void {
    this.progress = sanitizeProgress(DEFAULT_PROGRESS);
    this.inventoryHasPot = false;
    this.inventoryPot = null;
    this.saleComplete = false;
    this.coins = 0;
    this.repairPickupReady = false;
    this.repairPotDisplay?.destroy();
    this.repairPotDisplay = undefined;
    this.repairPickupPrompt?.destroy();
    this.repairPickupPrompt = undefined;
    this.shopGoldenPothosDisplay = [];
    this.saveProgress();
    this.hud.resetHeldInputs();
    this.cancelTapWalk();
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y).setVisible(true);
    this.drawPlayer();
    this.updateProgressVisuals();
    this.refreshWantedSign();
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
    const sideFacing = this.playerFacing === 'left' || this.playerFacing === 'right';
    const bodyX = sideFacing ? -11 : -14;
    const bodyWidth = sideFacing ? 22 : 28;
    this.player.fillStyle(0xf5f6f2, 1).fillRect(bodyX, -43 - lift, bodyWidth, 56);
    this.player.lineStyle(3, 0x111416, 1).strokeRect(bodyX, -43 - lift, bodyWidth, 56);

    if (this.playerFacing === 'front') {
      this.player.fillStyle(0x111416, 1).fillRect(-8, -31 - lift, 5, 6).fillRect(3, -31 - lift, 5, 6);
      this.player.lineStyle(3, 0x111416, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
    } else if (this.playerFacing === 'back') {
      this.player.fillStyle(0x3b4244, 1).fillRect(-8, -32 - lift, 16, 9);
      this.player.lineStyle(2, 0x697173, 1).lineBetween(-4, -28 - lift, 4, -28 - lift);
      this.player.lineStyle(3, 0x111416, 1).lineBetween(0, 14 - lift, 0, 29 - lift);
    } else {
      const eyeX = this.playerFacing === 'left' ? -8 : 3;
      this.player.fillStyle(0x111416, 1).fillRect(eyeX, -31 - lift, 5, 6);
      this.player.lineStyle(2, 0x697173, 1).lineBetween(0, -20 - lift, 0, 9 - lift);
    }
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-13, 13 - lift, 10, 18).fillRect(3, 13 - lift, 10, 18);
  }

  private createPot(): void {
    this.pot = this.add.graphics().setDepth(22);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y);
    drawGoldenPothos(this.pot, 0, 0, 0.9);
    this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete);
  }

  private createBrokenPot(): void {
    this.brokenPot = this.add.graphics().setDepth(22);
    const position = this.getBrokenPotPosition();
    this.brokenPot.setPosition(position.x, position.y);
    const piecesRemaining = this.progress.brokenPotAvailable && !this.progress.brokenPotOwned
      ? Math.max(1, this.progress.brokenPotPiecesRemaining)
      : this.progress.brokenPotPiecesRemaining;
    drawBrokenPotPieces(this.brokenPot, 0, 0, 1.08, piecesRemaining);
    this.brokenPot.setVisible(this.progress.brokenPotAvailable && !this.progress.brokenPotOwned);
  }

  private createWindowDirtOverlay(): void {
    this.windowDirtOverlay = this.add.graphics().setDepth(8);
    const window = BUILDINGS.find((building) => building.key === 'homes');
    if (!window) return;
    this.windowDirtOverlay.fillStyle(0x111416, 0.32).fillRect(window.x + 22, window.y + 104, window.width - 44, 180);
    this.windowDirtOverlay.fillStyle(0x858d8d, 0.42);
    for (let index = 0; index < 12; index += 1) {
      this.windowDirtOverlay.fillRect(window.x + 38 + (index % 5) * 54, window.y + 122 + Math.floor(index / 5) * 46, 26, 9);
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
    if (this.progress.windowJobAccepted && this.isWindowDisplayPoint(point)) {
      const approach = this.getWindowInteractionPoint();
      if (this.isNearWindowApproach()) {
        this.windowFacingLocked = true;
        this.faceDirection(new Phaser.Math.Vector2(0, -1));
        this.showToast('HOMES display selected. Hold B to clean.', 1500);
      } else {
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
    return (remaining >= 1 && hit(-24, -2, 58, 58))
      || (remaining >= 2 && hit(24, -2, 58, 58))
      || (remaining >= 3 && hit(0, -42, 46, 42));
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

  private getShopTapPath(x: number, y: number): Phaser.Math.Vector2[] | null {
    if (!this.isShopWalkablePosition(x, y)) return null;
    return [new Phaser.Math.Vector2(x, y)];
  }

  private isNearShopExit(point: Phaser.Math.Vector2): boolean {
    return Math.abs(point.x - SHOP_EXIT.x) <= 64
      && point.y >= SHOP_EXIT.y - 86
      && point.y <= SHOP_EXIT.y + 20;
  }

  private tryActivateMovementDoor(direction: Phaser.Math.Vector2, previousX: number, previousY: number): boolean {
    if (this.modalOpen || this.shopTransitioning || this.pendingInteraction || this.target) return false;

    if (!this.shopInterior) {
      const thresholdY = FRONT_PAVEMENT_MIN_Y + 10;
      const inDoorLane = Math.abs(this.player.x - BUY_SELL_ENTRANCE.x) <= BUY_SELL_DOOR_WIDTH / 2 + 8;
      const movingIntoDoor = direction.y < -0.45 && inDoorLane
        && previousY >= this.player.y && this.player.y <= thresholdY;
      if (movingIntoDoor) {
        this.enterShop();
        return true;
      }
      return false;
    }

    const exitThresholdX = SHOP_EXIT.x + 52;
    const inExitLane = Math.abs(this.player.y - SHOP_EXIT.y) <= 48;
    const movingIntoExit = direction.x < -0.45 && inExitLane
      && previousX >= this.player.x
      && previousX >= SHOP_EXIT.x - 52
      && this.player.x <= exitThresholdX;
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
      this.interactionHighlight.strokeRect(point.x - 58, point.y - 62, 116, 70);
    } else if (interaction === 'window-clean') {
      this.interactionHighlight.strokeRect(1274, 596, 332, 188);
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
    if (interaction === 'select-broken-piece') this.selectBrokenPotPiece();
    if (interaction === 'pickup-repaired') this.collectRepairedPot();
    if (interaction === 'window-clean') {
      this.windowFacingLocked = true;
      this.faceDirection(new Phaser.Math.Vector2(0, -1));
      this.showToast('HOMES display selected. Hold B to clean.', 1500);
    }
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
    this.progress.inventoryItem = 'small-golden-pothos';
    // Collecting the first pot unlocks the opening job. Selling remains an
    // available transaction, but it is no longer the next required objective.
    this.progress.task = 'clean';
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Head to the general store and sell the Golden Pothos.');
  }

  private selectBrokenPotPiece(): void {
    const position = this.getBrokenPotPosition();
    if (this.shopInterior || this.inventoryHasPot || !this.brokenPot.visible || this.progress.brokenPotPiecesRemaining <= 0) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > 110) return;
    this.brokenPotPieceSelected = true;
    this.syncHudState();
    this.showToast(`Broken piece selected. Press B to pick it up (${this.progress.brokenPotPiecesRemaining} left).`, 1700);
  }

  private collectBrokenPotPiece(): void {
    const position = this.getBrokenPotPosition();
    if (this.shopInterior || !this.brokenPotPieceSelected || this.inventoryHasPot || !this.brokenPot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, position.x, position.y) > 110) {
      this.showToast('Move closer to the broken piece first.', 1400);
      return;
    }

    this.audio.playToolUse();
    this.brokenPotPieceSelected = false;
    this.progress.brokenPotPiecesRemaining = Math.max(0, this.progress.brokenPotPiecesRemaining - 1);
    this.brokenPot.clear();
    drawBrokenPotPieces(this.brokenPot, 0, 0, 1.08, this.progress.brokenPotPiecesRemaining);

    if (this.progress.brokenPotPiecesRemaining > 0) {
      this.saveProgress();
      this.syncHudState();
      this.showToast(`Piece picked up. Click another piece, then press B (${this.progress.brokenPotPiecesRemaining} left).`, 1700);
      return;
    }

    this.inventoryHasPot = true;
    this.inventoryPot = 'broken';
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
    if (this.shopInterior || !this.repairPickupReady || !this.repairPotDisplay?.visible || this.inventoryPot !== 'broken') return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.repairPotDisplay.x, this.repairPotDisplay.y) > 110) return;
    this.inventoryHasPot = true;
    this.inventoryPot = 'repaired';
    this.progress.inventoryPot = 'repaired';
    this.progress.inventoryItem = 'special-repair-pot';
    this.progress.task = 'sell-repaired';
    this.repairPickupReady = false;
    this.repairPotDisplay.setVisible(false);
    this.repairPickupPrompt?.setVisible(false);
    this.saveProgress();
    this.syncHudState();
    this.hud.highlightBag();
    this.showToast('Repaired pot added to the Bag. Sell it at BUY / SELL for 10 coins.');
  }

  private openShopPanel(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.cancelTapWalk();
    this.hud.openPanel('shop');
  }

  private enterShop(): void {
    if (this.shopInterior || this.shopTransitioning) return;
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
  }

  private exitShop(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.shopTransitioning = true;
    this.movementReleaseRequired = true;
    this.hud.resetHeldInputs();
    this.cancelToolUse(true);
    this.cancelTapWalk();
    this.cameras.main.fadeOut(120, 7, 9, 10);
    this.time.delayedCall(120, () => this.exitShopNow());
  }

  private exitShopNow(): void {
    this.shopObjects.forEach((object) => object.destroy());
    this.shopObjects = [];
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
    this.createShopFutureDisplayItems();
    this.createShopGoldenPothosDisplay();

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
    this.wantedSignBackdrop.fillStyle(0x111416, 0.98).fillRect(signX, signY, signWidth, signHeight);
    this.wantedSignBackdrop.lineStyle(4, 0xf6f7f3, 0.98).strokeRect(signX, signY, signWidth, signHeight);
    this.wantedSignText.setText(message);

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
    if (!this.shopInterior || !this.progress.shopGoldenPothosStock || this.shopGoldenPothosDisplay.length > 0) return;
    const item = this.add.graphics().setDepth(4);
    drawGoldenPothos(item, 180, 405, 0.55);
    const stockLabel = this.add.text(180, 376, 'SHOP STOCK', {
      color: '#f6f7f3',
      fontFamily: 'monospace',
      fontSize: '8px',
      fontStyle: 'bold',
      backgroundColor: '#111416',
      padding: { left: 3, right: 3, top: 2, bottom: 2 },
    }).setOrigin(0.5).setDepth(7);
    const priceTag = this.add.text(180, 454, '7 COINS', {
      color: '#111416',
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      backgroundColor: '#f6f7f3',
      padding: { left: 5, right: 5, top: 3, bottom: 3 },
    }).setOrigin(0.5).setDepth(7);
    this.shopGoldenPothosDisplay = [item, stockLabel, priceTag];
    this.shopObjects.push(...this.shopGoldenPothosDisplay);
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
    this.windowFacingLocked = false;
    this.clearInteractionHighlight();
    if (this.brokenPotPieceSelected) {
      this.brokenPotPieceSelected = false;
      this.syncHudState();
    }
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
    if (!this.modalOpen && !this.shopInterior && this.brokenPotPieceSelected) {
      this.hud.setAction('PRESS B TO PICK UP PIECE');
      return;
    }
    if (!this.modalOpen && !this.shopInterior && this.progress.windowJobAccepted && this.isNearWindowApproach()) {
      this.hud.setAction('FACE HOMES WINDOW');
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
