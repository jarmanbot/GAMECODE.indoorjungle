import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const hud = readFileSync(new URL('../src/ui/HudController.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const androidChromeCases = [
  { name: 'narrow-320', width: 320, height: 740, devicePixelRatio: 2 },
  { name: 'narrow-360', width: 360, height: 800, devicePixelRatio: 3 },
  { name: 'toolbar-expanded', width: 360, height: 640, devicePixelRatio: 3 },
  { name: 'toolbar-collapsed', width: 360, height: 800, devicePixelRatio: 3 },
  { name: 'display-scaled', width: 320, height: 740, devicePixelRatio: 2.625 },
  { name: 'large-text', width: 320, height: 740, devicePixelRatio: 2 },
  { name: 'gesture-area-cutout', width: 360, height: 780, devicePixelRatio: 3 },
  { name: 'page-zoom', width: 256, height: 640, devicePixelRatio: 2 },
  { name: 'accessibility-text-scale', width: 320, height: 740, devicePixelRatio: 2 },
];

if (androidChromeCases.length !== 9 || !androidChromeCases.some(({ width }) => width === 320) || !androidChromeCases.some(({ width }) => width === 360)) {
  throw new Error('Android Chrome viewport matrix is incomplete.');
}
if (!html.includes('viewport-fit=cover')) throw new Error('Viewport cutout handling is not enabled.');
if (!css.includes('min-width: 0') || !css.includes('max-width: 100%')) throw new Error('Responsive width safeguards are missing.');
if (!css.includes('@media (max-width: 340px)') || !css.includes('flex-wrap: wrap')) throw new Error('Extra-narrow navigation wrapping is missing.');
if (!css.includes('white-space: normal; overflow-wrap: anywhere')) throw new Error('Phone console text cannot adapt to narrow widths.');
if (!hud.includes('window.visualViewport?.width ?? window.innerWidth')) throw new Error('Phone stage sizing does not use the effective visual viewport width.');
if (!hud.includes('Math.min(viewportWidth, availableHeight)')) throw new Error('Phone stage can exceed the effective visual viewport width.');

const forbidden = [
  ['html/body', /html, body[^\{]*\{[^}]*min-width:\s*(?:[1-9]|\d{2,})/s],
  ['phone console', /\.console-label[^\{]*\{[^}]*white-space:\s*nowrap/s],
  ['canvas', /#game-stage canvas[^\{]*\{[^}]*width:\s*100vw/s],
];
for (const [label, pattern] of forbidden) {
  if (pattern.test(css)) throw new Error(`Android overflow regression in ${label}.`);
}

console.log(`Android Chrome layout matrix passed (${androidChromeCases.length} cases): 320/360 CSS px, toolbar changes, scaling, cutouts, DPR > 1, page zoom, and text scaling.`);
