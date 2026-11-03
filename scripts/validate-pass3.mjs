import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const assetPath = new URL('../public/assets/storefronts/buy-sell-facade-green-crt.png', import.meta.url);
const png = readFileSync(assetPath);
const signature = '89504e470d0a1a0a';
if (png.subarray(0, 8).toString('hex') !== signature) throw new Error('Buy/Sell facade is not a PNG.');

let offset = 8;
let width = 0;
let height = 0;
let colourType = -1;
const idat = [];
while (offset < png.length) {
  const length = png.readUInt32BE(offset);
  const type = png.subarray(offset + 4, offset + 8).toString('ascii');
  const data = png.subarray(offset + 8, offset + 8 + length);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    if (data[8] !== 8) throw new Error('Buy/Sell facade must use 8-bit channels.');
    colourType = data[9];
  }
  if (type === 'IDAT') idat.push(data);
  offset += length + 12;
}

if (width !== 366 || height !== 333) throw new Error(`Buy/Sell facade is ${width}×${height}; expected 366×333.`);
if (colourType !== 6) throw new Error(`Buy/Sell facade must be RGBA (PNG colour type 6), received ${colourType}.`);

const bytesPerPixel = 4;
const stride = width * bytesPerPixel;
const inflated = inflateSync(Buffer.concat(idat));
const pixels = Buffer.alloc(stride * height);
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
for (let y = 0, source = 0; y < height; y += 1) {
  const filter = inflated[source++];
  for (let x = 0; x < stride; x += 1) {
    const raw = inflated[source++];
    const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0;
    const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
    const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * stride + x - bytesPerPixel] : 0;
    const value = filter === 0 ? raw
      : filter === 1 ? raw + left
      : filter === 2 ? raw + up
      : filter === 3 ? raw + Math.floor((left + up) / 2)
      : filter === 4 ? raw + paeth(left, up, upperLeft)
      : (() => { throw new Error(`Unsupported PNG filter ${filter}.`); })();
    pixels[y * stride + x] = value & 0xff;
  }
}

for (let y = 229; y < 333; y += 1) {
  for (let x = 261; x < 325; x += 1) {
    if (pixels[y * stride + x * 4 + 3] !== 0) throw new Error(`Opaque Buy/Sell door-aperture pixel at ${x},${y}.`);
  }
}
if (![0, width - 1].some((x) => pixels[x * 4 + 3] === 0)) throw new Error('Buy/Sell facade lacks expected transparent exterior pixels.');

const style = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const moduleStart = style.indexOf('.graphics-upgrade-overlay');
const moduleStyles = style.slice(moduleStart, style.indexOf('.phone-control-panel', moduleStart));
if (!moduleStyles.includes('.graphics-upgrade-card.is-green-crt-upgrade')
  || !moduleStyles.includes('#39ff5a') || !moduleStyles.includes('#f6f7f3')) {
  throw new Error('Graphics installation must provide Green CRT install states and a B&W completion state.');
}
const hud = readFileSync(new URL('../src/ui/HudController.ts', import.meta.url), 'utf8');
if (!hud.includes("this.graphicsUpgradeOverlay.classList.add('is-green-crt-upgrade')")
  || !hud.includes("this.graphicsUpgradeOverlay.classList.add('is-bw-upgrade')")) {
  throw new Error('Graphics upgrade sequence does not switch from Green CRT installation to B&W acknowledgement.');
}

const buildingProgress = readFileSync(new URL('../src/game/buildingProgress.ts', import.meta.url), 'utf8');
for (const expected of [
  "'buy-sell': { operationalState: 'operational', graphicsEra: 'green-crt' }",
  "'starter-apartment': { operationalState: 'operational', graphicsEra: 'green-crt' }",
  "'real-estate': { operationalState: 'operational', graphicsEra: 'green-crt' }",
  "nursery: { operationalState: 'vacant', graphicsEra: 'green-crt' }",
]) {
  if (!buildingProgress.includes(expected)) throw new Error(`Missing approved building default: ${expected}`);
}

const progress = readFileSync(new URL('../src/game/progress.ts', import.meta.url), 'utf8');
if (!progress.includes('buySellBwUpgradePending: boolean')) throw new Error('Persisted Buy/Sell B&W pending state is missing.');
if (!progress.includes('buySellBwUpgradeAcknowledged: boolean')) throw new Error('Persisted Buy/Sell B&W acknowledgement state is missing.');
if (/^\s*nurseryConstructionComplete:\s*boolean/m.test(progress)) throw new Error('Legacy parallel Nursery construction state remains in ProgressState.');

const scene = readFileSync(new URL('../src/game/GameScene.ts', import.meta.url), 'utf8');
if (scene.includes("localStorage.getItem('indoor-jungle-progress-v4')")
  || scene.includes("localStorage.getItem('indoor-jungle-progress-v3')")) throw new Error('Obsolete progression migration remains active.');
for (const expected of [
  "this.progress.buildings['buy-sell'].graphicsEra = 'atari-bw'",
  "this.progress.buildings['real-estate'].graphicsEra = 'green-crt'",
  "this.progress.buildings['starter-apartment'].graphicsEra = 'green-crt'",
  "this.progress.buildings['buy-sell'].graphicsEra = 'atari-colour'",
  "this.progress.buildings['real-estate'].graphicsEra = 'atari-colour'",
  "this.progress.buildings['starter-apartment'].graphicsEra = 'atari-colour'",
]) {
  if (!scene.includes(expected)) throw new Error(`Missing approved two-stage transition: ${expected}`);
}
if (!scene.includes('this.coins -= SECOND_RENTAL_MOVE_COST')
  || !scene.includes('if (this.coins < SECOND_RENTAL_MOVE_COST)')) {
  throw new Error('Second-rental affordability and deduction must both use the 540-coin move cost.');
}
if (!scene.includes('!this.progress.saleComplete || !this.progress.windowJobComplete || this.progress.repairStep < 10')
  || scene.includes('this.progress.repairStep < 10 || foundPotCount < 3')) {
  throw new Error('Starter-rental gate must use mandatory sale/work/repair milestones, not the optional Begonia.');
}
if (!scene.includes("if (definition.yieldMode === 'whole-plant')") || !scene.includes('pot.crop = null;')) {
  throw new Error('Harvest crops must clear only the crop while whole-plant lifting removes the pot.');
}

console.log('Pass 4.1 regression validation passed: building states, Green-to-B&W module UI, optional Begonia gate, herb pot retention, and 540-coin move rule.');
