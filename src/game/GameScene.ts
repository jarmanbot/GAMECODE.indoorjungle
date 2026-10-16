import Phaser from 'phaser';
import { drawNeighborhood, drawPot, setBuySellDoorOpen } from './art';
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

type PendingInteraction = 'pickup' | 'enter-shop' | 'counter' | 'exit-shop';

export class GameScene extends Phaser.Scene {
  private readonly zoomOrder: ZoomMode[] = ['normal', 'close'];
  private readonly hud: HudController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
  private buySellDoor?: Phaser.GameObjects.Graphics;
  private cars: Car[] = [];
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private target: Phaser.Math.Vector2 | null = null;
  private targetQueue: Phaser.Math.Vector2[] = [];
  private zoomMode: ZoomMode = 'normal';
  private inventoryHasPot = false;
  private saleComplete = false;
  private coins = 0;
  private modalOpen = false;
  private mapMovementAllowed = false;
  private shopInterior = false;
  private shopTransitioning = false;
  private streetZoomMode: ZoomMode = 'normal';
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

  constructor(hud: HudController) {
    super('game-scene');
    this.hud = hud;
  }

  create(): void {
    this.buySellDoor = drawNeighborhood(this);
    this.createCars();
    this.createPlayer();
    this.createPot();
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
    this.hud.setGameState({ coins: this.coins, inventoryHasPot: this.inventoryHasPot, task: 'find' });
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
    if (!this.shopInterior && (hasKeyboardInput || this.target)) this.updatePortraitFollow();
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
      const speed = hasKeyboardInput ? 235 : 190;
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
      this.drawPlayer();
      if (!this.shopInterior) this.hud.setMapPosition(this.player.x / WORLD_WIDTH, this.player.y);
    }

    this.updateInteraction();
  }

  setModalOpen(isOpen: boolean, preserveDestination = false): void {
    this.modalOpen = isOpen;
    this.mapMovementAllowed = isOpen && preserveDestination;
    if (isOpen && !preserveDestination) this.cancelTapWalk();
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
    if (!this.shopInterior || !this.inventoryHasPot || this.saleComplete) return;
    this.inventoryHasPot = false;
    this.saleComplete = true;
    this.coins += 5;
    this.hud.setGameState({ coins: this.coins, inventoryHasPot: false, task: 'complete' });
    this.hud.refreshShopPanel('Pot sold for 5 coins.');
    this.showToast('Pot sold for 5 coins.');
  }

  restartPrototype(): void {
    this.inventoryHasPot = false;
    this.saleComplete = false;
    this.coins = 0;
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
    if (this.modalOpen || this.phoneLandscapeBlocked || this.shopTransitioning) return;
    const point = this.cameras.main.getWorldPoint(screenX, screenY);
    if (this.shopInterior) {
      this.handleShopWorldPoint(point.x, point.y);
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
    if (interaction === 'enter-shop') this.enterShop();
    if (interaction === 'counter') this.openShopPanel();
    if (interaction === 'exit-shop') this.exitShop();
  }

  private collectPot(): void {
    if (this.shopInterior || this.inventoryHasPot || !this.pot.visible) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, POT_POSITION.x, POT_POSITION.y) > 110) return;
    this.inventoryHasPot = true;
    this.pot.setVisible(false);
    this.hud.setGameState({ coins: this.coins, inventoryHasPot: true, task: 'sell' });
    this.hud.highlightBag();
    this.showToast('Pot collected. Take it to BUY / SELL.');
  }

  private openShopPanel(): void {
    if (!this.shopInterior || this.shopTransitioning) return;
    this.cancelTapWalk();
    this.hud.openPanel('shop');
  }

  private enterShop(): void {
    if (this.shopInterior || this.shopTransitioning) return;
    this.shopTransitioning = true;
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
    this.pot.setVisible(!this.inventoryHasPot && !this.saleComplete);
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
    const portraitPhone = this.scale.height > this.scale.width && this.scale.width <= 680;
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
