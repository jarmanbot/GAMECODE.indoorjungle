import Phaser from 'phaser';
import { drawNeighborhood, drawPot } from './art';
import {
  BUILDINGS,
  BUY_SELL_ENTRANCE,
  CROSSING_END_X,
  CROSSING_START_X,
  FRONT_PAVEMENT_MAX_Y,
  FRONT_PAVEMENT_MIN_Y,
  OPPOSITE_PAVEMENT_MAX_Y,
  OPPOSITE_PAVEMENT_MIN_Y,
  POT_POSITION,
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

export class GameScene extends Phaser.Scene {
  private readonly zoomOrder: ZoomMode[] = ['normal', 'close'];
  private readonly hud: HudController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
  private cars: Car[] = [];
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private targetQueue: Phaser.Math.Vector2[] = [];
  private zoomMode: ZoomMode = 'normal';
  private inventoryHasPot = false;
  private saleComplete = false;
  private modalOpen = false;
  private mapMovementAllowed = false;
  private destinationMarker!: Phaser.GameObjects.Graphics;
  private toastTimer?: Phaser.Time.TimerEvent;
  private lastWorldInputAt = 0;
  private portraitFollowCentered = false;
  private closeFollowCentered = false;
  private phoneLandscapeBlocked = false;

  constructor(hud: HudController) {
    super('game-scene');
    this.hud = hud;
  }

  create(): void {
    drawNeighborhood(this);
    this.createCars();
    this.createPlayer();
    this.createPot();
    this.createDestinationMarker();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.applyZoom(this.zoomMode);
    this.cameras.main.roundPixels = true;

    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

    this.game.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown, { passive: false, capture: true });
    this.game.canvas.addEventListener('pointerup', this.handleCanvasPointerUp, { passive: false, capture: true });
    this.game.canvas.addEventListener('pointercancel', this.handleCanvasPointerCancel, { passive: false, capture: true });
    this.game.canvas.addEventListener('click', this.handleCanvasClick, { passive: false, capture: true });
    this.game.canvas.addEventListener('wheel', this.handleCanvasWheel, { passive: false });
    window.addEventListener('keydown', this.handleZoomKeyDown);
    this.scale.on('resize', () => {
      this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      this.applyZoom(this.zoomMode);
      this.updatePhoneOrientationState();
    });

    this.hud.setZoomMode(this.zoomMode);
    this.hud.setGameState({ coins: 0, inventoryHasPot: false, task: 'find' });
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
    this.updateCloseVerticalFollow();

    const direction = new Phaser.Math.Vector2(
      this.mapMovementAllowed ? 0 : Number(this.cursorKeys.left.isDown || this.keys.A.isDown) * -1 + Number(this.cursorKeys.right.isDown || this.keys.D.isDown),
      this.mapMovementAllowed ? 0 : Number(this.cursorKeys.up.isDown || this.keys.W.isDown) * -1 + Number(this.cursorKeys.down.isDown || this.keys.S.isDown),
    );
    const hasKeyboardInput = direction.lengthSq() > 0;
    if (hasKeyboardInput || this.target) this.updatePortraitFollow();
    if (hasKeyboardInput) {
      direction.normalize();
      this.cancelTapWalk();
    } else if (this.target) {
      direction.set(this.target.x - this.player.x, this.target.y - this.player.y);
      if (direction.length() < 8) {
        this.target = this.targetQueue.shift() ?? null;
        if (!this.target) {
          this.destinationMarker.setVisible(false);
          direction.set(0, 0);
        } else {
          direction.set(this.target.x - this.player.x, this.target.y - this.player.y);
          direction.normalize();
        }
      } else {
        direction.normalize();
      }
    }

    if (direction.lengthSq() > 0) {
      const speed = hasKeyboardInput ? 235 : 190;
      const nextX = Phaser.Math.Clamp(
        this.player.x + direction.x * speed * delta / 1000,
        STARTING_WALKABLE_MIN_X,
        STARTING_WALKABLE_MAX_X,
      );
      const nextY = Phaser.Math.Clamp(this.player.y + direction.y * speed * delta / 1000, FRONT_PAVEMENT_MIN_Y, OPPOSITE_PAVEMENT_MAX_Y);
      this.moveOnWalkableGround(nextX, nextY);
      this.drawPlayer();
      this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    }

    this.updateInteraction();
  }

  setModalOpen(isOpen: boolean, preserveDestination = false): void {
    this.modalOpen = isOpen;
    this.mapMovementAllowed = isOpen && preserveDestination;
    if (isOpen && !preserveDestination) this.cancelTapWalk();
  }

  zoomBy(direction: 1 | -1): void {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
    const index = this.zoomOrder.indexOf(this.zoomMode);
    const nextIndex = Phaser.Math.Clamp(index + direction, 0, this.zoomOrder.length - 1);
    this.applyZoom(this.zoomOrder[nextIndex]);
  }

  setZoom(mode: ZoomMode): void {
    if (this.phoneLandscapeBlocked) return;
    this.applyZoom(mode);
  }

  tryInteract(): void {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
    const playerDistanceToPot = Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y);
    const playerDistanceToShop = Phaser.Math.Distance.Between(this.player.x, this.player.y, BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y);

    if (!this.inventoryHasPot && playerDistanceToPot < 105) {
      this.inventoryHasPot = true;
      this.pot.setVisible(false);
      this.hud.setGameState({ coins: 0, inventoryHasPot: true, task: 'sell' });
      this.showToast('Pot collected. Take it to BUY / SELL.');
      this.updateInteraction();
      return;
    }

    if (this.inventoryHasPot && !this.saleComplete && playerDistanceToShop < 145) {
      this.inventoryHasPot = false;
      this.saleComplete = true;
      this.hud.setGameState({ coins: 5, inventoryHasPot: false, task: 'complete' });
      this.showToast('Task complete · +5 coins');
      this.updateInteraction();
    }
  }

  restartPrototype(): void {
    this.inventoryHasPot = false;
    this.saleComplete = false;
    this.cancelTapWalk();
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y).setVisible(true);
    this.drawPlayer();
    this.hud.setGameState({ coins: 0, inventoryHasPot: false, task: 'find' });
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
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-14, -43, 28, 56);
    this.player.lineStyle(3, 0x111416, 1).strokeRect(-14, -43, 28, 56);
    this.player.fillStyle(0x111416, 1).fillRect(-8, -31, 5, 6).fillRect(3, -31, 5, 6);
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-13, 13, 10, 18).fillRect(3, 13, 10, 18);
    this.player.lineStyle(3, 0x111416, 1).lineBetween(0, 14, 0, 29);
  }

  private createPot(): void {
    this.pot = this.add.graphics().setDepth(22);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y);
    drawPot(this.pot, 0, 0, 0.75);
  }

  private createDestinationMarker(): void {
    this.destinationMarker = this.add.graphics().setDepth(28).setVisible(false);
    this.destinationMarker.lineStyle(3, 0xf6f7f3, 0.95).strokeCircle(0, 0, 11);
    this.destinationMarker.lineStyle(2, 0x111416, 0.95).lineBetween(-7, 0, 7, 0).lineBetween(0, -7, 0, 7);
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
    if (this.modalOpen || this.phoneLandscapeBlocked || event.pointerType === 'mouse' && event.button !== 0) return;
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
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
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
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
    const point = this.cameras.main.getWorldPoint(screenX, screenY);
    const tapPath = this.getTapPath(point.x, point.y);
    if (!tapPath) {
      this.cancelTapWalk();
      this.showToast('That area is not accessible.', 1500);
      return;
    }
    this.target = tapPath.shift() ?? null;
    this.targetQueue = tapPath;
    const destination = this.targetQueue[this.targetQueue.length - 1] ?? this.target;
    if (destination) this.destinationMarker.setPosition(destination.x, destination.y).setVisible(true);
  }

  private readonly handleCanvasWheel = (event: WheelEvent): void => {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
      event.preventDefault();
    this.zoomBy(event.deltaY > 0 ? -1 : 1);
  };

  private readonly handleZoomKeyDown = (event: KeyboardEvent): void => {
    if (this.modalOpen || this.phoneLandscapeBlocked) return;
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
    const portrait = this.scale.height > this.scale.width;
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
    if (this.scale.height <= this.scale.width || this.portraitFollowCentered) return;

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
    const portrait = this.scale.height > this.scale.width;
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
    const phoneLandscape = this.isPhoneDevice() && this.scale.width > this.scale.height;
    if (phoneLandscape === this.phoneLandscapeBlocked) return;
    this.phoneLandscapeBlocked = phoneLandscape;
    this.hud.setPhoneOrientationBlocked(phoneLandscape);
    this.updateInteraction();
  }

  private isPhoneDevice(): boolean {
    return /Android|iPhone|iPod/i.test(navigator.userAgent) && !/Windows Phone/i.test(navigator.userAgent);
  }

  private getCameraFrame(mode: 'close' | 'normal'): { zoom: number; offsetX: number; offsetY: number } {
    const viewportWidth = Math.max(1, this.scale.width);
    const viewportHeight = Math.max(1, this.scale.height);
    const portrait = viewportHeight > viewportWidth;
    const compactLandscape = !portrait && viewportHeight < 600;
    const desktop = viewportWidth >= 900 && viewportHeight >= 600;

    if (mode === 'close') {
      const building = this.getNearestBuilding();
      const left = Math.min(this.player.x - 20, building.x);
      const right = Math.max(this.player.x + 20, building.x + building.width);
      const top = building.kind === 'apartment' ? building.y - 76 : building.y - 18;
      const bottom = FRONT_PAVEMENT_MAX_Y + 16;
      const zoom = this.fitZoom(viewportWidth, viewportHeight, right - left, bottom - top, 0.94);
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
  }

  private moveOnWalkableGround(nextX: number, nextY: number): void {
    const currentX = this.player.x;
    const currentY = this.player.y;
    if (this.isWalkablePosition(nextX, nextY)) {
      this.player.setPosition(nextX, nextY);
      return;
    }
    if (this.isWalkablePosition(nextX, currentY)) {
      this.player.x = nextX;
    }
    if (this.isWalkablePosition(this.player.x, nextY)) {
      this.player.y = nextY;
    }
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
    if (!this.player || this.modalOpen || this.phoneLandscapeBlocked) {
      this.hud.setAction(null);
      return;
    }
    const nearPot = !this.inventoryHasPot && Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y) < 105;
    const nearShop = this.inventoryHasPot && !this.saleComplete && Phaser.Math.Distance.Between(this.player.x, this.player.y, BUY_SELL_ENTRANCE.x, BUY_SELL_ENTRANCE.y) < 145;
    if (nearPot) {
      this.hud.setAction('COLLECT POT');
    } else if (nearShop) {
      this.hud.setAction('SELL POT');
    } else {
      this.hud.setAction(null);
    }
  }

  private showToast(message: string, duration = 3300): void {
    this.hud.showToast(message);
    if (this.toastTimer) this.toastTimer.remove(false);
    this.toastTimer = this.time.delayedCall(duration, () => this.hud.showToast(''));
  }
}
