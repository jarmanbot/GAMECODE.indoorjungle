import Phaser from 'phaser';
import {
  BUILDINGS,
  BUY_SELL_DOOR_BOTTOM,
  BUY_SELL_DOOR_HEIGHT,
  BUY_SELL_DOOR_TOP,
  BUY_SELL_ENTRANCE,
  BUY_SELL_DOOR_WIDTH,
  PAVEMENT_HEIGHT,
  PAVEMENT_Y,
  FUTURE_ZONES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type Building,
} from './world';

const INK = 0x111416;
const BLACK = 0x07090a;
const DEEP = 0x1b2023;
const MID = 0x5e6669;
const LIGHT = 0xd8dddc;
const WHITE = 0xf6f7f3;

export function drawNeighborhood(scene: Phaser.Scene): Phaser.GameObjects.Graphics | undefined {
  const background = scene.add.graphics().setDepth(-100);
  background.fillStyle(0x343a3c, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  background.fillStyle(0x252a2d, 1).fillRect(0, 0, WORLD_WIDTH, 410);
  background.fillStyle(0x454c4e, 1).fillRect(0, 410, WORLD_WIDTH, 360);
  background.fillStyle(0x60686a, 1).fillRect(0, 770, WORLD_WIDTH, 60);
  background.fillStyle(0x161a1c, 1).fillRect(0, 1090, WORLD_WIDTH, WORLD_HEIGHT - 1090);

  drawSkyline(scene);
  drawDistantRoads(scene);
  const [westZone, eastZone, worksZone] = FUTURE_ZONES;
  drawVacantLot(scene, westZone.x, westZone.y, westZone.width, westZone.height, westZone.label);
  drawVacantLot(scene, eastZone.x, eastZone.y, eastZone.width, eastZone.height, eastZone.label);
  drawConstructionSite(scene, worksZone.x, worksZone.y, worksZone.width, worksZone.height, worksZone.label);
  drawRoadAndPavement(scene);
  drawBuySellPavement(scene);
  drawUndevelopedPlots(scene);

  let buySellDoor: Phaser.GameObjects.Graphics | undefined;
  BUILDINGS.forEach((building) => {
    const door = drawBuilding(scene, building);
    if (door) buySellDoor = door;
  });
  drawStreetDetails(scene);

  addWorldLabel(scene, 156, 1120, 'ROADS CONTINUE →', 0xced4d2, 18);
  addWorldLabel(scene, 3290, 1120, '← FUTURE NEIGHBOURHOODS', 0xced4d2, 18);
  return buySellDoor;
}

function drawSkyline(scene: Phaser.Scene): void {
  const far = scene.add.graphics().setDepth(-90);
  const farBuildings = [
    [20, 205, 170, 170], [250, 150, 120, 225], [470, 212, 210, 163],
    [820, 138, 150, 237], [1040, 198, 190, 177], [1320, 125, 170, 250],
    [1610, 190, 220, 185], [1940, 142, 160, 233], [2200, 205, 210, 170],
    [2530, 130, 175, 245], [2820, 188, 225, 187], [3160, 150, 180, 225],
    [3470, 204, 210, 172], [3800, 135, 260, 245],
  ];
  far.fillStyle(0x303638, 0.68);
  farBuildings.forEach(([x, y, width, height]) => {
    far.fillRect(x, y, width, height);
  });
  far.lineStyle(3, 0x565e60, 0.32);
  for (const [x, y, width, height] of farBuildings) {
    for (let windowY = y + 38; windowY < y + height - 26; windowY += 46) {
      far.strokeRect(x + 24, windowY, 12, 9);
      if (width > 160) far.strokeRect(x + width - 38, windowY, 12, 9);
    }
  }

  const g = scene.add.graphics().setDepth(-80);
  const skyline = [
    [50, 120, 130, 290], [210, 180, 110, 230], [350, 92, 190, 320], [575, 155, 100, 257],
    [720, 78, 160, 334], [940, 170, 130, 242], [1120, 110, 190, 302], [1360, 145, 120, 267],
    [1520, 72, 165, 340], [1760, 170, 130, 242], [1940, 98, 210, 314], [2220, 144, 145, 268],
    [2440, 70, 170, 342], [2680, 154, 125, 258], [2860, 104, 200, 308], [3100, 168, 140, 244],
    [3300, 75, 185, 337], [3535, 135, 150, 277], [3750, 100, 230, 312], [4040, 158, 120, 254],
  ];
  skyline.forEach(([x, y, width, height], index) => {
    g.fillStyle(index % 3 === 0 ? 0x1d2224 : 0x252a2d, 1).fillRect(x, y, width, height);
    g.lineStyle(4, 0x555e60, 0.55);
    for (let windowY = y + 28; windowY < y + height - 20; windowY += 34) {
      g.strokeRect(x + 22, windowY, 16, 12);
      if (width > 150) g.strokeRect(x + width - 42, windowY, 16, 12);
    }
  });
  g.fillStyle(0x111416, 0.7).fillRect(0, 405, WORLD_WIDTH, 34);
}

function drawDistantRoads(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-50);
  g.fillStyle(0x1c2224, 1).fillRect(0, 720, WORLD_WIDTH, 32);
  g.fillStyle(0x161a1c, 1).fillRect(0, 1150, WORLD_WIDTH, 22);
  g.lineStyle(5, 0x8e9696, 0.65).lineBetween(0, 1160, WORLD_WIDTH, 1160);
  g.lineStyle(5, 0x8e9696, 0.65).lineBetween(0, 1200, WORLD_WIDTH, 1200);
}

function drawRoadAndPavement(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-10);
  g.fillStyle(0x9ea5a5, 1).fillRect(0, PAVEMENT_Y, WORLD_WIDTH, PAVEMENT_HEIGHT);
  g.fillStyle(0x15191b, 1).fillRect(0, PAVEMENT_Y + PAVEMENT_HEIGHT, WORLD_WIDTH, 238);
  g.lineStyle(8, WHITE, 0.92).lineBetween(0, 944, WORLD_WIDTH, 944);
  g.lineStyle(8, WHITE, 0.92).lineBetween(0, 1083, WORLD_WIDTH, 1083);
  for (let x = 0; x < WORLD_WIDTH; x += 170) {
    g.fillStyle(0xd5d9d8, 0.9).fillRect(x + 30, 1008, 94, 10);
  }
  g.fillStyle(0x737b7c, 1).fillRect(0, PAVEMENT_Y, WORLD_WIDTH, 10);
  g.fillStyle(0xd7dbda, 1).fillRect(0, PAVEMENT_Y + PAVEMENT_HEIGHT - 9, WORLD_WIDTH, 9);

  // Narrow opposite pavement: it sits just below the road and is only exposed
  // in the lower part of Normal/Overview framing.
  g.fillStyle(0x777f80, 1).fillRect(0, 1180, WORLD_WIDTH, 72);
  g.fillStyle(0xd7dbda, 1).fillRect(0, 1180, WORLD_WIDTH, 8);
  g.fillStyle(0x555d5e, 1).fillRect(0, 1244, WORLD_WIDTH, 8);

  // A simple crossing anchors the starting block.
  g.fillStyle(WHITE, 0.96);
  for (let stripe = 0; stripe < 7; stripe += 1) {
    g.fillRect(1420 + stripe * 32, PAVEMENT_Y + PAVEMENT_HEIGHT + 10, 18, 220);
  }
}

function drawBuySellPavement(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-8);
  const bayX = BUY_SELL_ENTRANCE.x - 42;
  g.fillStyle(0x737b7c, 1).fillRect(bayX, PAVEMENT_Y, 84, PAVEMENT_HEIGHT - 8);
  g.lineStyle(3, 0xd7dbda, 0.85).lineBetween(bayX, PAVEMENT_Y + 11, bayX + 84, PAVEMENT_Y + 11);
  g.lineStyle(2, 0x4d5557, 0.75).lineBetween(bayX + 12, PAVEMENT_Y + 22, bayX + 12, PAVEMENT_Y + PAVEMENT_HEIGHT - 16);
  g.lineBetween(bayX + 72, PAVEMENT_Y + 22, bayX + 72, PAVEMENT_Y + PAVEMENT_HEIGHT - 16);
}

function drawUndevelopedPlots(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(-3);
  g.fillStyle(0x3b4344, 1).fillRect(0, 1252, WORLD_WIDTH, WORLD_HEIGHT - 1252);

  // Paths make the land read as connected reserve plots instead of a blank strip.
  g.fillStyle(0x777f80, 1).fillRect(0, 1364, WORLD_WIDTH, 24);
  g.fillStyle(0x777f80, 1).fillRect(920, 1252, 24, WORLD_HEIGHT - 1252);
  g.fillStyle(0x777f80, 1).fillRect(2648, 1252, 24, WORLD_HEIGHT - 1252);
  g.lineStyle(4, 0x1b2022, 0.8).lineBetween(0, 1376, WORLD_WIDTH, 1376);

  drawFuturePlot(scene, g, 110, 1284, 700, 330, 'RESERVED LOT A');
  drawFuturePlot(scene, g, 1050, 1284, 700, 330, 'RESERVED LOT B');
  drawFuturePlot(scene, g, 1860, 1284, 700, 330, 'RESERVED LOT C');
  drawFuturePlot(scene, g, 2780, 1284, 1240, 330, 'RESERVED LOT D');
  drawBarrier(g, 910, 1260, 44);
  drawBarrier(g, 2638, 1260, 44);

  for (const x of [170, 430, 730, 1110, 1430, 1910, 2240, 2470, 2870, 3220, 3710, 3980]) {
    drawWeed(g, x, 1710);
    drawRubbish(g, x + 30, 1712);
  }
}

function drawFuturePlot(
  scene: Phaser.Scene,
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
): void {
  g.lineStyle(5, 0xd2d7d5, 0.9).strokeRect(x, y, width, height);
  g.lineStyle(3, 0x737b7c, 0.9).lineBetween(x + width * 0.5, y, x + width * 0.5, y + height);
  g.lineBetween(x, y + height * 0.58, x + width, y + height * 0.58);
  g.fillStyle(0x1a1f21, 1).fillRect(x + 18, y + 16, Math.min(width - 36, 230), 30);
  addWorldLabel(scene, x + 28, y + 31, label, WHITE, 11, false);
  drawLockedBadge(scene, g, x + width - 82, y + 31);
  drawBarrier(g, x + 20, y + height - 16, width - 40);
}

function drawBuilding(scene: Phaser.Scene, building: Building): Phaser.GameObjects.Graphics | undefined {
  if (building.kind === 'shop') {
    return drawBuySellBuilding(scene, building);
  }
  const g = scene.add.graphics().setDepth(5);
  const { x, y, width, height } = building;
  g.fillStyle(0x0c0e0f, 1).fillRect(x - 14, y - 14, width + 28, height + 14);
  g.fillStyle(building.kind === 'apartment' ? 0x81898a : 0x4f5759, 1).fillRect(x, y, width, height);
  g.lineStyle(8, WHITE, 0.95).strokeRect(x, y, width, height);
  g.lineStyle(3, 0x272d2f, 0.9);
  for (let brickY = y + 36; brickY < y + 210; brickY += 34) {
    g.lineBetween(x, brickY, x + width, brickY);
    for (let brickX = x + ((brickY / 34) % 2 === 0 ? 0 : 32); brickX < x + width; brickX += 64) {
      g.lineBetween(brickX, brickY - 34, brickX, brickY);
    }
  }
  g.fillStyle(INK, 1).fillRect(x + 18, y + 16, width - 36, 64);
  addWorldLabel(scene, x + width / 2, y + 29, building.label, WHITE, building.kind === 'apartment' ? 17 : 23, true);

  if (building.kind === 'homes') drawHomes(scene, g, building);
  if (building.kind === 'plants') drawPlants(scene, g, building);
  if (building.kind === 'apartment') drawApartment(scene, g, building);
}

function drawBuySellBuilding(scene: Phaser.Scene, building: Building): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(5);
  const x = building.x;
  const y = building.y;
  const entranceCenterX = BUY_SELL_ENTRANCE.x;

  // A shallow roof cap and sparse masonry keep the shop legible as a
  // building without turning the facade into a dense UI-like border.
  g.fillStyle(0x5e6669, 1).fillRect(x + 8, y + 8, building.width - 16, building.height - 8);
  g.fillStyle(0x252a2d, 1).fillRect(x - 8, y - 8, building.width + 16, 18);
  g.fillStyle(0x858d8d, 1).fillRect(x + 4, y + 10, building.width - 8, 8);
  g.lineStyle(4, INK, 0.95).strokeRect(x + 8, y + 8, building.width - 16, building.height - 8);

  const brickPatches = [
    [x + 22, y + 91, 54, 12], [x + 88, y + 92, 36, 12], [x + 274, y + 91, 42, 12],
    [x + 18, y + 286, 68, 13], [x + 286, y + 270, 34, 13], [x + 238, y + 300, 42, 12],
  ];
  g.fillStyle(0x747c7d, 0.7);
  brickPatches.forEach(([patchX, patchY, patchWidth, patchHeight]) => {
    g.fillRect(patchX, patchY, patchWidth, patchHeight);
  });

  // One compact sign, kept separate from the window and entrance.
  g.fillStyle(INK, 1).fillRect(x + 90, y + 32, 170, 38);
  g.lineStyle(3, WHITE, 0.9).strokeRect(x + 90, y + 32, 170, 38);
  addWorldLabel(scene, x + building.width / 2, y + 51, 'BUY / SELL', WHITE, 17, true);

  // Modest display window with a few decorative, non-collectible goods.
  const windowX = x + 30;
  const windowY = y + 116;
  g.fillStyle(DEEP, 1).fillRect(windowX, windowY, 116, 148);
  g.lineStyle(4, INK, 0.95).strokeRect(windowX, windowY, 116, 148);
  g.lineStyle(3, 0x7f8888, 0.75).lineBetween(windowX + 58, windowY + 8, windowX + 58, windowY + 136);
  g.lineStyle(3, 0x8b9392, 0.55).lineBetween(windowX + 14, windowY + 22, windowX + 42, windowY + 4);
  g.lineBetween(windowX + 74, windowY + 44, windowX + 104, windowY + 22);
  g.fillStyle(0x8a9291, 1).fillRect(windowX + 10, windowY + 110, 96, 8);
  drawPot(g, windowX + 34, windowY + 105, 0.52);
  drawPot(g, windowX + 80, windowY + 105, 0.46);

  // Keep the dark opening and frame behind Alex so the entrance animation can
  // show him stepping into the doorway before he fades out.
  const door = scene.add.graphics().setDepth(29);
  drawBuySellDoor(door, false);

  // Two shallow steps meet the pavement; there is no deep rectangle below the
  // door for input or decoration to accidentally read as an entrance.
  const doorX = entranceCenterX - BUY_SELL_DOOR_WIDTH / 2;
  g.fillStyle(0x6e7677, 1).fillRect(doorX - 10, BUY_SELL_DOOR_BOTTOM, BUY_SELL_DOOR_WIDTH + 20, 8);
  g.fillStyle(0x858d8d, 1).fillRect(doorX - 6, BUY_SELL_DOOR_BOTTOM + 8, BUY_SELL_DOOR_WIDTH + 12, 8);
  g.lineStyle(2, WHITE, 0.75).lineBetween(doorX - 10, BUY_SELL_DOOR_BOTTOM, doorX + BUY_SELL_DOOR_WIDTH + 10, BUY_SELL_DOOR_BOTTOM);
  g.lineBetween(doorX - 6, BUY_SELL_DOOR_BOTTOM + 8, doorX + BUY_SELL_DOOR_WIDTH + 6, BUY_SELL_DOOR_BOTTOM + 8);
  return door;
}

function drawBuySellDoor(g: Phaser.GameObjects.Graphics, open: boolean): void {
  const doorX = BUY_SELL_ENTRANCE.x - BUY_SELL_DOOR_WIDTH / 2;
  g.clear();
  if (open) {
    g.fillStyle(0x07090a, 1).fillRect(doorX, BUY_SELL_DOOR_TOP, BUY_SELL_DOOR_WIDTH, BUY_SELL_DOOR_HEIGHT);
    g.fillStyle(0x252a2d, 1).fillRect(doorX + 8, BUY_SELL_DOOR_TOP + 8, BUY_SELL_DOOR_WIDTH - 16, BUY_SELL_DOOR_HEIGHT - 8);
    g.fillStyle(0x111416, 1).fillRect(doorX + 12, BUY_SELL_DOOR_TOP + 68, BUY_SELL_DOOR_WIDTH - 24, 28);
  } else {
    g.fillStyle(WHITE, 1).fillRect(doorX, BUY_SELL_DOOR_TOP, BUY_SELL_DOOR_WIDTH, BUY_SELL_DOOR_HEIGHT);
    g.fillStyle(0x9ea5a5, 1).fillRect(doorX + 12, BUY_SELL_DOOR_TOP + 14, BUY_SELL_DOOR_WIDTH - 24, 42);
    g.lineStyle(3, INK, 1).strokeRect(doorX + 12, BUY_SELL_DOOR_TOP + 14, BUY_SELL_DOOR_WIDTH - 24, 42);
    g.fillStyle(INK, 1).fillRect(doorX + BUY_SELL_DOOR_WIDTH - 15, BUY_SELL_DOOR_TOP + 72, 5, 5);
  }
  g.lineStyle(4, WHITE, 1).strokeRect(doorX, BUY_SELL_DOOR_TOP, BUY_SELL_DOOR_WIDTH, BUY_SELL_DOOR_HEIGHT);
}

export function setBuySellDoorOpen(door: Phaser.GameObjects.Graphics, open: boolean): void {
  drawBuySellDoor(door, open);
}

function drawHomes(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, building: Building): void {
  const x = building.x;
  const y = building.y;
  g.fillStyle(0x15191b, 1).fillRect(x + 20, y + 102, building.width - 40, 184);
  g.lineStyle(5, WHITE, 0.9).strokeRect(x + 20, y + 102, building.width - 40, 184);
  drawMiniHome(g, x + 40, y + 147, 112, 90, true);
  drawMiniHome(g, x + 170, y + 147, 78, 90, false);
  drawMiniHome(g, x + 263, y + 147, 78, 90, false);
  addWorldLabel(scene, x + 96, y + 154, 'TO LET', BLACK, 13, true);
  addWorldLabel(scene, x + 208, y + 255, 'FUTURE', WHITE, 11, true);
  addWorldLabel(scene, x + 301, y + 255, 'FUTURE', WHITE, 11, true);
}

function drawPlants(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, building: Building): void {
  const x = building.x;
  const y = building.y;
  g.fillStyle(0x222729, 1).fillRect(x + 24, y + 101, building.width - 48, 184);
  g.lineStyle(6, WHITE, 0.95).strokeRect(x + 24, y + 101, building.width - 48, 184);
  for (let shutterX = x + 38; shutterX < x + building.width - 36; shutterX += 30) {
    g.lineStyle(4, 0x9aa1a1, 0.85).lineBetween(shutterX, y + 116, shutterX, y + 271);
  }
  addWorldLabel(scene, x + building.width / 2, y + 225, 'OPENING SOON', WHITE, 18, true);
  drawPot(g, x + 74, y + 272, 0.85);
  drawPot(g, x + building.width - 76, y + 272, 0.85);
}

function drawApartment(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, building: Building): void {
  const x = building.x;
  const y = building.y;
  g.fillStyle(0x1b2022, 1).fillTriangle(x - 18, y + 10, x + building.width / 2, y - 62, x + building.width + 18, y + 10);
  g.lineStyle(8, WHITE, 0.95)
    .lineBetween(x - 18, y + 10, x + building.width / 2, y - 62)
    .lineBetween(x + building.width / 2, y - 62, x + building.width + 18, y + 10);
  g.lineStyle(4, 0x6e7677, 0.95).lineBetween(x - 12, y + 12, x + building.width + 12, y + 12);
  g.fillStyle(0x242a2c, 1).fillRect(x + 28, y + 100, building.width - 56, 204);
  g.lineStyle(6, WHITE, 0.9).strokeRect(x + 28, y + 100, building.width - 56, 204);
  for (let windowX = x + 58; windowX < x + building.width - 50; windowX += 86) {
    g.fillStyle(0xadb4b3, 1).fillRect(windowX, y + 130, 54, 62);
    g.lineStyle(4, INK, 1).strokeRect(windowX, y + 130, 54, 62);
    g.lineBetween(windowX + 27, y + 130, windowX + 27, y + 192);
    g.lineBetween(windowX, y + 161, windowX + 54, y + 161);
  }
  g.fillStyle(INK, 1).fillRect(x + building.width / 2 - 30, y + 218, 60, 86);
}

function drawMiniHome(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, actual: boolean): void {
  g.fillStyle(actual ? 0xd3d8d7 : 0x747c7d, 1).fillRect(x, y + 26, width, height - 26);
  g.fillStyle(actual ? 0xf2f3ef : 0xb4bab9, 1).fillTriangle(x - 8, y + 28, x + width / 2, y - 4, x + width + 8, y + 28);
  g.fillStyle(INK, 1).fillRect(x + width / 2 - 10, y + height - 38, 20, 38);
  g.lineStyle(3, INK, 1).strokeRect(x + 12, y + 42, 20, 18);
}

function drawVacantLot(scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string): void {
  const g = scene.add.graphics().setDepth(-2);
  g.fillStyle(0x555d5e, 1).fillRect(x, y, width, height);
  g.lineStyle(6, 0xd2d7d5, 0.9).strokeRect(x, y, width, height);
  for (let fenceX = x + 18; fenceX < x + width; fenceX += 64) {
    g.lineStyle(4, 0xdee2df, 0.82).lineBetween(fenceX, y, fenceX, y + height);
  }
  g.lineStyle(5, 0xe1e4e1, 0.85).lineBetween(x, y + 58, x + width, y + 58);
  g.fillStyle(0x1a1f21, 1).fillRect(x + 18, y + 18, Math.min(width - 36, 250), 34);
  addWorldLabel(scene, x + Math.min(width - 36, 250) / 2 + 18, y + 21, label, WHITE, 12, true);
  for (let weedX = x + 28; weedX < x + width - 20; weedX += 116) {
    drawWeed(g, weedX, y + height - 24);
    if (weedX % 3 === 0) drawRubbish(g, weedX + 32, y + height - 22);
  }
}

function drawConstructionSite(scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string): void {
  const g = scene.add.graphics().setDepth(-1);
  g.fillStyle(0x2c3234, 1).fillRect(x, y, width, height);
  g.lineStyle(6, 0xe2e5e2, 0.9).strokeRect(x, y, width, height);
  g.lineStyle(8, 0x969e9d, 0.9);
  g.lineBetween(x + 80, y + height, x + 80, y + 70);
  g.lineBetween(x + 80, y + 70, x + width - 90, y + 70);
  g.lineBetween(x + width - 90, y + 70, x + width - 90, y + height);
  g.lineBetween(x + 80, y + 210, x + width - 90, y + 210);
  g.lineStyle(4, 0xced4d2, 0.7);
  g.lineBetween(x + width - 75, y + 55, x + width - 75, y + 240);
  g.lineBetween(x + width - 115, y + 74, x + width - 30, y + 74);
  addWorldLabel(scene, x + width / 2, y + 25, label, WHITE, 15, true);
  drawLockedBadge(scene, g, x + width - 82, y + 27);
  drawBarrier(g, x + 28, y + height - 16, width - 56);
  drawWeed(g, x + 60, y + height - 25);
  drawRubbish(g, x + width - 120, y + height - 26);
}

function drawLockedBadge(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x111416, 0.96).fillRect(x - 56, y - 18, 112, 36);
  g.lineStyle(3, WHITE, 0.95).strokeRect(x - 56, y - 18, 112, 36);
  g.lineStyle(3, WHITE, 0.95).strokeRect(x - 42, y - 7, 14, 12);
  g.lineBetween(x - 40, y - 7, x - 40, y - 15);
  g.lineBetween(x - 40, y - 15, x - 30, y - 15);
  g.lineBetween(x - 30, y - 15, x - 30, y - 7);
  addWorldLabel(scene, x + 22, y + 1, 'LOCKED', WHITE, 9, true);
}

function drawBarrier(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number): void {
  g.lineStyle(5, WHITE, 0.95).lineBetween(x, y, x + width, y);
  g.fillStyle(INK, 1).fillRect(x - 5, y - 13, 10, 26).fillRect(x + width - 5, y - 13, 10, 26);
  for (let stripeX = x + 10; stripeX < x + width - 4; stripeX += 24) {
    g.lineStyle(4, 0x696f70, 0.9).lineBetween(stripeX, y - 8, stripeX + 12, y + 8);
  }
}

function drawStreetDetails(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(2);
  for (let x = 90; x < WORLD_WIDTH; x += 280) {
    g.fillStyle(0x15191b, 1).fillRect(x, PAVEMENT_Y - 70, 9, 70);
    g.fillStyle(0xd6dbd9, 1).fillRect(x - 12, PAVEMENT_Y - 78, 33, 11);
  }
  for (const x of [340, 2760, 3170, 3920]) {
    drawWeed(g, x, PAVEMENT_Y + 88);
    drawRubbish(g, x + 30, PAVEMENT_Y + 90);
  }
}

export function drawPot(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
  g.fillStyle(0x222729, 1).fillRect(x - 22 * scale, y - 34 * scale, 44 * scale, 9 * scale);
  g.fillStyle(0xdfe3df, 1)
    .fillTriangle(x - 16 * scale, y - 25 * scale, x + 16 * scale, y - 25 * scale, x + 11 * scale, y + 15 * scale)
    .fillTriangle(x - 16 * scale, y - 25 * scale, x + 11 * scale, y + 15 * scale, x - 11 * scale, y + 15 * scale);
  g.fillStyle(0x3b4244, 1).fillRect(x - 4 * scale, y - 53 * scale, 8 * scale, 28 * scale);
  g.fillStyle(0x697173, 1).fillRect(x - 14 * scale, y - 58 * scale, 28 * scale, 7 * scale);
}

function drawWeed(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(4, 0x222729, 1);
  g.lineBetween(x, y, x - 11, y - 32);
  g.lineBetween(x, y, x + 4, y - 44);
  g.lineBetween(x, y, x + 16, y - 27);
  g.fillStyle(0x6d7677, 1).fillRect(x - 18, y, 38, 11);
}

function drawRubbish(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x252b2d, 1).fillRect(x, y - 13, 22, 15);
  g.lineStyle(3, 0xbfc5c3, 0.8).strokeRect(x, y - 13, 22, 15);
}

export function addWorldLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  size: number,
  centered = false,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    color: `#${color.toString(16).padStart(6, '0')}`,
    fontFamily: 'monospace',
    fontSize: `${size}px`,
    fontStyle: 'bold',
    align: centered ? 'center' : 'left',
    stroke: `#${BLACK.toString(16).padStart(6, '0')}`,
    strokeThickness: centered ? 2 : 1,
  }).setOrigin(centered ? 0.5 : 0, 0.5).setDepth(10);
}
