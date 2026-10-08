import Phaser from 'phaser';
import { GameScene } from './game/GameScene';
import { HudController } from './ui/HudController';
import './style.css';

const hud = new HudController();
const scene = new GameScene(hud);

// Bind zoom actions before Phaser boots so HUD clicks never depend on scene timing.
hud.bindZoomControls(
  () => scene.cycleZoom(-1),
  () => scene.cycleZoom(1),
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
    roundPixels: true,
  },
  scene: [scene],
});

hud.bindScene(scene);

window.addEventListener('beforeunload', () => game.destroy(true));
