import Phaser from 'phaser';
import { drawNeighborhood, drawPot } from './art';
import {
  BUILDINGS,
  BUY_SELL_ENTRANCE,
  CAMERA_FOLLOW_OFFSETS,
  CROSSING_END_X,
  CROSSING_START_X,
  FRONT_PAVEMENT_MAX_Y,
  FRONT_PAVEMENT_MIN_Y,
  OPPOSITE_PAVEMENT_MAX_Y,
  OPPOSITE_PAVEMENT_MIN_Y,
  POT_POSITION,
  START_POSITION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ZOOM_LEVELS,
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
  private readonly zoomOrder: ZoomMode[] = ['overview', 'normal', 'close'];
  private readonly hud: HudController;
  private player!: Phaser.GameObjects.Graphics;
  private pot!: Phaser.GameObjects.Graphics;
  private cars: Car[] = [];
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private zoomMode: ZoomMode = 'normal';
  private inventoryHasPot = false;
  private saleComplete = false;
  private modalOpen = false;
  private toastTimer?: Phaser.Time.TimerEvent;

  constructor(hud: HudController) {
    super('game-scene');
    this.hud = hud;
  }

  create(): void {
    drawNeighborhood(this);
    this.createCars();
    this.createPlayer();
    this.createPot();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.applyZoom(this.zoomMode);
    this.cameras.main.roundPixels = true;

    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

    this.input.on('pointerdown', this.handleWorldPointer, this);
    this.game.canvas.addEventListener('wheel', this.handleCanvasWheel, { passive: false });
    window.addEventListener('keydown', this.handleZoomKeyDown);
    this.scale.on('resize', () => this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT));

    this.hud.setZoomMode(this.zoomMode);
    this.hud.setGameState({ coins: 0, inventoryHasPot: false, task: 'find' });
    this.updateInteraction();
  }

  update(_time: number, delta: number): void {
    this.updateCars(delta);

    if (this.modalOpen) {
      this.updateInteraction();
      return;
    }

    const direction = new Phaser.Math.Vector2(
      Number(this.cursorKeys.left.isDown || this.keys.A.isDown) * -1 + Number(this.cursorKeys.right.isDown || this.keys.D.isDown),
      Number(this.cursorKeys.up.isDown || this.keys.W.isDown) * -1 + Number(this.cursorKeys.down.isDown || this.keys.S.isDown),
    );
    const hasKeyboardInput = direction.lengthSq() > 0;
    if (hasKeyboardInput) {
      direction.normalize();
      this.target = null;
    } else if (this.target) {
      direction.set(this.target.x - this.player.x, this.target.y - this.player.y);
      if (direction.length() < 8) {
        this.target = null;
        direction.set(0, 0);
      } else {
        direction.normalize();
      }
    }

    if (direction.lengthSq() > 0) {
      const speed = hasKeyboardInput ? 235 : 190;
      const nextX = Phaser.Math.Clamp(this.player.x + direction.x * speed * delta / 1000, 120, WORLD_WIDTH - 120);
      const nextY = Phaser.Math.Clamp(this.player.y + direction.y * speed * delta / 1000, FRONT_PAVEMENT_MIN_Y, OPPOSITE_PAVEMENT_MAX_Y);
      this.moveOnWalkableGround(nextX, nextY);
      this.drawPlayer();
      this.hud.setMapPosition(nextX / WORLD_WIDTH);
    }

    this.updateInteraction();
  }

  setModalOpen(isOpen: boolean): void {
    this.modalOpen = isOpen;
    if (isOpen) this.target = null;
  }

  cycleZoom(direction: 1 | -1): void {
    const index = this.zoomOrder.indexOf(this.zoomMode);
    const nextIndex = Phaser.Math.Clamp(index + direction, 0, this.zoomOrder.length - 1);
    this.applyZoom(this.zoomOrder[nextIndex]);
  }

  setZoom(mode: ZoomMode): void {
    this.applyZoom(mode);
  }

  tryInteract(): void {
    if (this.modalOpen) return;
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
    this.target = null;
    this.player.setPosition(START_POSITION.x, START_POSITION.y);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y).setVisible(true);
    this.drawPlayer();
    this.hud.setGameState({ coins: 0, inventoryHasPot: false, task: 'find' });
    this.hud.setMapPosition(START_POSITION.x / WORLD_WIDTH);
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
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-18, -47, 36, 68);
    this.player.lineStyle(5, 0x111416, 1).strokeRect(-18, -47, 36, 68);
    this.player.fillStyle(0x111416, 1).fillRect(-10, -33, 7, 8).fillRect(3, -33, 7, 8);
    this.player.fillStyle(0xf5f6f2, 1).fillRect(-18, 21, 13, 25).fillRect(5, 21, 13, 25);
    this.player.lineStyle(4, 0x111416, 1).lineBetween(0, 22, 0, 43);
  }

  private createPot(): void {
    this.pot = this.add.graphics().setDepth(22);
    this.pot.setPosition(POT_POSITION.x, POT_POSITION.y);
    drawPot(this.pot, 0, 0, 1.15);
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

  private handleWorldPointer(pointer: Phaser.Input.Pointer): void {
    if (this.modalOpen || pointer.y < 0) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.target = this.getNearestWalkablePoint(point.x, point.y);
  }

  private readonly handleCanvasWheel = (event: WheelEvent): void => {
    if (this.modalOpen) return;
    event.preventDefault();
    this.cycleZoom(event.deltaY > 0 ? -1 : 1);
  };

  private readonly handleZoomKeyDown = (event: KeyboardEvent): void => {
    if (this.modalOpen) return;
    if (event.key === ',' || event.code === 'Comma') {
      event.preventDefault();
      this.cycleZoom(-1);
    } else if (event.key === '.' || event.code === 'Period') {
      event.preventDefault();
      this.cycleZoom(1);
    }
  };

  private applyZoom(mode: ZoomMode): void {
    this.zoomMode = mode;
    const followOffset = CAMERA_FOLLOW_OFFSETS[mode];
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setFollowOffset(followOffset.x, followOffset.y);
    this.cameras.main.setZoom(ZOOM_LEVELS[mode]);
    this.hud.setZoomMode(mode);
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
    const onCrossing = x >= CROSSING_START_X && x <= CROSSING_END_X
      && y >= FRONT_PAVEMENT_MIN_Y && y <= OPPOSITE_PAVEMENT_MAX_Y;
    const onFrontPavement = y >= FRONT_PAVEMENT_MIN_Y && y <= FRONT_PAVEMENT_MAX_Y;
    const onOppositePavement = y >= OPPOSITE_PAVEMENT_MIN_Y && y <= OPPOSITE_PAVEMENT_MAX_Y;
    return onCrossing || onFrontPavement || onOppositePavement;
  }

  private getNearestWalkablePoint(x: number, y: number): Phaser.Math.Vector2 {
    const targetX = Phaser.Math.Clamp(x, 120, WORLD_WIDTH - 120);
    const currentOnOppositePavement = this.player.y >= OPPOSITE_PAVEMENT_MIN_Y;
    if (targetX >= CROSSING_START_X && targetX <= CROSSING_END_X) {
      return new Phaser.Math.Vector2(
        targetX,
        Phaser.Math.Clamp(y, FRONT_PAVEMENT_MIN_Y, OPPOSITE_PAVEMENT_MAX_Y),
      );
    }
    if (currentOnOppositePavement && y >= OPPOSITE_PAVEMENT_MIN_Y) {
      return new Phaser.Math.Vector2(targetX, Phaser.Math.Clamp(y, OPPOSITE_PAVEMENT_MIN_Y, OPPOSITE_PAVEMENT_MAX_Y));
    }
    return new Phaser.Math.Vector2(targetX, Phaser.Math.Clamp(y, FRONT_PAVEMENT_MIN_Y, FRONT_PAVEMENT_MAX_Y));
  }

  private updateInteraction(): void {
    if (!this.player || this.modalOpen) {
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

  private showToast(message: string): void {
    this.hud.showToast(message);
    if (this.toastTimer) this.toastTimer.remove(false);
    this.toastTimer = this.time.delayedCall(3300, () => this.hud.showToast(''));
  }
}
