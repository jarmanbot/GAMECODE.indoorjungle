import Phaser from 'phaser';
import {
  BUILDINGS,
  BUY_SELL_DOOR_BOTTOM,
  BUY_SELL_DOOR_HEIGHT,
  BUY_SELL_DOOR_TOP,
  BUY_SELL_ENTRANCE,
  BUY_SELL_DOOR_WIDTH,
  BUY_SELL_WINDOW,
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
  farBuildings.forEach(([x, y, width, height], index) => {
    far.fillRect(x, y, width, height);
    if (index % 4 === 1) far.fillRect(x + width / 2 - 3, y - 18, 6, 18);
  });
  far.lineStyle(3, 0x565e60, 0.32);
  farBuildings.forEach(([x, y, width, height], index) => {
    if (index % 3 === 1) return;
    for (let windowY = y + 44; windowY < y + height - 28; windowY += 60) {
      far.strokeRect(x + 24, windowY, 12, 9);
      if (width > 180 && index % 2 === 0) far.strokeRect(x + width - 38, windowY, 12, 9);
    }
  });

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
    g.lineStyle(3, 0x555e60, 0.38);
    if (index % 3 === 1) return;
    for (let windowY = y + 46; windowY < y + height - 28; windowY += 58) {
      g.strokeRect(x + 22, windowY, 16, 12);
      if (width > 170 && index % 2 === 0) g.strokeRect(x + width - 42, windowY, 16, 12);
    }
  });
  g.fillStyle(0x111416, 0.7).fillRect(0, 405, WORLD_WIDTH, 34);

  // A quiet, low-rise layer closes the visual gap above the playable shops.
  // It stays behind the street buildings and uses fewer details than the
  // nearer skyline so the sign and Alex remain the strongest focal points.
  const horizon = scene.add.graphics().setDepth(-75);
  const lowRise = [
    [0, 446, 220, 72], [250, 424, 170, 94], [455, 454, 240, 64],
    [740, 430, 188, 88], [978, 448, 244, 70], [1270, 418, 160, 100],
    [1480, 452, 230, 66], [1745, 426, 182, 92], [1960, 446, 260, 72],
    [2260, 420, 190, 98], [2500, 450, 240, 68], [2780, 430, 170, 88],
    [3000, 448, 250, 70], [3290, 416, 190, 102], [3540, 450, 260, 68],
    [3840, 430, 220, 88],
  ];
  horizon.fillStyle(0x343b3d, 0.72);
  lowRise.forEach(([x, y, width, height], index) => {
    horizon.fillRect(x, y, width, height);
    if (index % 3 === 0) horizon.fillRect(x + 18, y - 8, width - 36, 8);
  });
  horizon.lineStyle(2, 0x697271, 0.24);
  lowRise.forEach(([x, y, width], index) => {
    if (index % 3 === 2) horizon.strokeRect(x + 28, y + 22, 12, 8);
  });
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
    [x + 20, y + 91, 42, 11], [x + 64, y + 103, 28, 10],
    [x + 276, y + 91, 38, 11], [x + 250, y + 103, 22, 10],
    [x + 18, y + 286, 48, 12], [x + 70, y + 298, 30, 10],
    [x + 286, y + 270, 34, 11], [x + 242, y + 300, 42, 10],
  ];
  g.fillStyle(0x747c7d, 0.7);
  brickPatches.forEach(([patchX, patchY, patchWidth, patchHeight]) => {
    g.fillRect(patchX, patchY, patchWidth, patchHeight);
  });

  // One compact sign, kept separate from the window and entrance.
  g.fillStyle(INK, 1).fillRect(x + 90, y + 32, 170, 38);
  g.lineStyle(3, WHITE, 0.9).strokeRect(x + 90, y + 32, 170, 38);
  addWorldLabel(scene, x + building.width / 2, y + 51, 'BUY / SELL', WHITE, 17, true);

  // The display is now the dominant facade feature. It stays decorative and
  // non-collectible, while the entrance sits clearly beside it on the right.
  const windowX = BUY_SELL_WINDOW.x;
  const windowY = BUY_SELL_WINDOW.y;
  const windowWidth = BUY_SELL_WINDOW.width;
  const windowHeight = BUY_SELL_WINDOW.height;
  g.fillStyle(DEEP, 1).fillRect(windowX, windowY, windowWidth, windowHeight);
  g.lineStyle(6, WHITE, 0.95).strokeRect(windowX, windowY, windowWidth, windowHeight);
  g.lineStyle(3, 0x7f8888, 0.75).lineBetween(windowX + windowWidth / 2, windowY + 10, windowX + windowWidth / 2, windowY + windowHeight - 12);
  g.lineStyle(3, 0x8b9392, 0.55).lineBetween(windowX + 18, windowY + 30, windowX + 62, windowY + 6);
  g.lineBetween(windowX + windowWidth - 70, windowY + 56, windowX + windowWidth - 22, windowY + 24);
  g.fillStyle(0x8a9291, 1).fillRect(windowX + 14, windowY + windowHeight - 34, windowWidth - 28, 10);
  drawPot(g, windowX + 48, windowY + windowHeight - 30, 0.62);
  g.fillStyle(0x9ea5a5, 1).fillRect(windowX + windowWidth / 2 - 10, windowY + windowHeight - 56, 20, 24);
  g.lineStyle(2, INK, 1).strokeRect(windowX + windowWidth / 2 - 10, windowY + windowHeight - 56, 20, 24);
  g.fillStyle(INK, 1).fillRect(windowX + windowWidth / 2 - 6, windowY + windowHeight - 49, 3, 3).fillRect(windowX + windowWidth / 2 + 1, windowY + windowHeight - 49, 3, 3);
  drawPot(g, windowX + windowWidth - 50, windowY + windowHeight - 30, 0.56);

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
  g.lineStyle(4, open ? WHITE : INK, 1).strokeRect(doorX, BUY_SELL_DOOR_TOP, BUY_SELL_DOOR_WIDTH, BUY_SELL_DOOR_HEIGHT);
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

export function drawGoldenPothos(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
  drawPot(g, x, y, scale);

  // Keep the existing pot silhouette and footprint, adding only three chunky
  // leaves so the opening collectible reads as a Small Golden Pothos.
  g.lineStyle(2, INK, 1)
    .lineBetween(x, y - 48 * scale, x - 14 * scale, y - 70 * scale)
    .lineBetween(x, y - 48 * scale, x + 14 * scale, y - 70 * scale)
    .lineBetween(x, y - 50 * scale, x + 4 * scale, y - 82 * scale);
  g.fillStyle(0xbfc5c3, 1)
    .fillTriangle(x - 2 * scale, y - 53 * scale, x - 31 * scale, y - 68 * scale, x - 11 * scale, y - 79 * scale)
    .fillTriangle(x + 2 * scale, y - 54 * scale, x + 30 * scale, y - 68 * scale, x + 11 * scale, y - 79 * scale)
    .fillTriangle(x + 2 * scale, y - 57 * scale, x + 5 * scale, y - 88 * scale, x + 19 * scale, y - 72 * scale);
  g.lineStyle(2, INK, 0.9)
    .lineBetween(x - 2 * scale, y - 53 * scale, x - 31 * scale, y - 68 * scale)
    .lineBetween(x + 2 * scale, y - 54 * scale, x + 30 * scale, y - 68 * scale)
    .lineBetween(x + 2 * scale, y - 57 * scale, x + 5 * scale, y - 88 * scale);
}

export function drawBrokenPot(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1, repairStage = 0): void {
  g.fillStyle(0x222729, 1).fillRect(x - 22 * scale, y - 34 * scale, 44 * scale, 9 * scale);
  g.fillStyle(0xdfe3df, 1)
    .fillTriangle(x - 16 * scale, y - 25 * scale, x + 2 * scale, y - 25 * scale, x - 3 * scale, y + 15 * scale)
    .fillTriangle(x + 3 * scale, y - 25 * scale, x + 16 * scale, y - 25 * scale, x + 11 * scale, y + 15 * scale);
  // The special repair pot has a dark empty opening and a small diamond
  // ornament. It never receives leaves or a stem, including when repaired.
  g.fillStyle(0x3b4244, 1).fillRect(x - 14 * scale, y - 32 * scale, 28 * scale, 5 * scale);
  g.lineStyle(2, 0xbfc5c3, 0.9)
    .lineBetween(x, y - 18 * scale, x + 7 * scale, y - 7 * scale)
    .lineBetween(x + 7 * scale, y - 7 * scale, x, y + 4 * scale)
    .lineBetween(x, y + 4 * scale, x - 7 * scale, y - 7 * scale)
    .lineBetween(x - 7 * scale, y - 7 * scale, x, y - 18 * scale);
  // The repair interaction has ten deliberate taps. Keep the cracks legible
  // throughout the process so the pot visibly progresses from broken to
  // repaired instead of changing only at the last step.
  if (repairStage < 7) g.lineStyle(3, 0x111416, 1).lineBetween(x - 2 * scale, y - 23 * scale, x + 4 * scale, y - 2 * scale);
  if (repairStage < 4) g.lineStyle(3, 0x111416, 1).lineBetween(x + 4 * scale, y - 2 * scale, x - 1 * scale, y + 12 * scale);
  if (repairStage >= 1) g.lineStyle(3, 0x697173, 1).lineBetween(x, y - 21 * scale, x, y + 12 * scale);
  if (repairStage >= 5) g.lineStyle(3, 0x697173, 1).lineBetween(x - 11 * scale, y - 29 * scale, x + 11 * scale, y - 29 * scale);
  if (repairStage >= 8) g.lineStyle(2, 0xbfc5c3, 1).lineBetween(x - 12 * scale, y + 8 * scale, x + 12 * scale, y + 8 * scale);
}

export function drawBrokenPotPieces(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1, piecesRemaining = 3): void {
  g.fillStyle(0x111416, 0.28).fillEllipse(x, y + 22 * scale, 88 * scale, 14 * scale);

  // Three distinct chunky pieces remain on the ground until each is picked
  // up. They sit close enough to read as one broken pot, but separate enough
  // that collection progress is visible.
  if (piecesRemaining >= 1) {
    g.fillStyle(0xdfe3df, 1)
      .fillTriangle(x - 42 * scale, y - 20 * scale, x - 7 * scale, y - 20 * scale, x - 18 * scale, y + 16 * scale);
    g.lineStyle(5, 0x111416, 1).strokeTriangle(x - 42 * scale, y - 20 * scale, x - 7 * scale, y - 20 * scale, x - 18 * scale, y + 16 * scale);
    g.lineStyle(3, 0x697173, 1).lineBetween(x - 11 * scale, y - 18 * scale, x - 20 * scale, y + 9 * scale);
  }
  if (piecesRemaining >= 2) {
    g.fillStyle(0xdfe3df, 1)
      .fillTriangle(x + 7 * scale, y - 20 * scale, x + 42 * scale, y - 20 * scale, x + 19 * scale, y + 16 * scale);
    g.lineStyle(5, 0x111416, 1).strokeTriangle(x + 7 * scale, y - 20 * scale, x + 42 * scale, y - 20 * scale, x + 19 * scale, y + 16 * scale);
    g.lineStyle(3, 0x697173, 1).lineBetween(x + 11 * scale, y - 18 * scale, x + 20 * scale, y + 9 * scale);
  }
  if (piecesRemaining >= 3) {
    g.fillStyle(0x222729, 1).fillRect(x - 17 * scale, y - 29 * scale, 34 * scale, 7 * scale);
    g.lineStyle(4, 0xf6f7f3, 1).strokeRect(x - 17 * scale, y - 29 * scale, 34 * scale, 7 * scale);
    g.fillStyle(0x3b4244, 1).fillRect(x - 4 * scale, y - 54 * scale, 8 * scale, 27 * scale);
    g.lineStyle(4, 0x111416, 1).strokeRect(x - 4 * scale, y - 54 * scale, 8 * scale, 27 * scale);
    g.fillStyle(0x697173, 1).fillRect(x - 13 * scale, y - 60 * scale, 26 * scale, 7 * scale);
    g.lineStyle(3, 0xf6f7f3, 1).strokeRect(x - 13 * scale, y - 60 * scale, 26 * scale, 7 * scale);
  }
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
