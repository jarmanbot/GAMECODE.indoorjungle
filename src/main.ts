import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { HudController } from './ui/HudController';
import './style.css';

const hud = new HudController();
const scene = new GameScene(hud);

// Bind zoom actions before Phaser boots so HUD clicks never depend on scene timing.
hud.bindZoomControls(
  () => scene.zoomBy(-1),
  () => scene.zoomBy(1),
);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-stage',
  backgroundColor: '#252a2d',
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 1280,
    height: 720,
  },
  render: {
    antialias: false,
    // Allow fractional camera/player positions for smooth joystick follow;
    // antialiasing remains disabled and the canvas keeps pixelated scaling.
    roundPixels: false,
  },
  scene: [scene],
});

hud.bindScene(scene);

window.addEventListener('beforeunload', () => game.destroy(true));
