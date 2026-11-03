import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
try {
  const access = await server.ssrLoadModule('/src/game/devAccess.ts');
  const plants = await server.ssrLoadModule('/src/game/plants.ts');
  const world = await server.ssrLoadModule('/src/game/world.ts');
  const memory = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  };
  const disabled = new access.DevAccessGate(false, 'test-code', memory());
  if (disabled.enabled || disabled.unlock('test-code')) throw new Error('Disabled developer tools can unlock.');
  const missingCode = new access.DevAccessGate(true, '', memory());
  if (missingCode.enabled || missingCode.unlock('')) throw new Error('Missing developer code did not fail closed.');
  const store = memory();
  const enabled = new access.DevAccessGate(true, 'test-code', store);
  if (!enabled.enabled || enabled.unlock('wrong') || enabled.isUnlocked()) throw new Error('Incorrect developer code unlocked tools.');
  if (!enabled.unlock('test-code') || !enabled.isUnlocked()) throw new Error('Correct developer code did not unlock this session.');
  enabled.lock();
  if (enabled.isUnlocked()) throw new Error('Developer lock did not clear the session unlock.');
  const taps = new access.DevUnlockTapTracker();
  for (let index = 0; index < 6; index += 1) if (taps.tap(1000 + index * 100)) throw new Error('Six taps unlocked developer tools.');
  if (!taps.tap(1700)) throw new Error('Seven taps did not request developer access.');

  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  if (packageJson.version !== '0.5.0-playtest.1') throw new Error('Application version is not authoritative in package.json.');
  const definitions = Object.fromEntries(plants.PLANT_SPECIES.map((species) => [species, plants.getPlantDefinition(species)]));
  if (world.WINDOW_JOB_REWARD !== 10 || world.BASIL_DELIVERY_REWARD !== 10 || world.RARE_BEGONIA_SALE_PRICE !== 150 || world.COMMON_PARLOUR_PALM_SALE_PRICE !== 250) throw new Error('Opening economy values are incorrect.');
  if (definitions.basil.harvestPrice !== 8 || definitions.mint.harvestPrice !== 14 || definitions['dwarf-marigold'].harvestPrice !== 35 || definitions['peace-lily'].harvestPrice !== 50) throw new Error('Crop sale values are incorrect.');
  if (world.SECOND_RENTAL_MOVE_COST !== 540) throw new Error('Two-bedroom deduction changed.');
  if (world.getShopBuybackPrice(8) !== 12 || world.getShopBuybackPrice(14) !== 20 || world.getShopBuybackPrice(50) !== 70 || world.getShopBuybackPrice(150) !== 210) throw new Error('Authoritative buyback pricing is incorrect.');

  const scene = readFileSync(new URL('../src/game/GameScene.ts', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../src/ui/HudController.ts', import.meta.url), 'utf8');
  const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  if (!scene.includes("indoor-jungle-progress-v5") || !scene.includes("indoor-jungle-progress-dev-test-v5")) throw new Error('Normal and development save namespaces are not isolated.');
  if (!scene.includes('areDevToolsUnlocked()') || !scene.includes('DEV_TOOLS_ENABLED')) throw new Error('Checkpoint methods can bypass the developer lock.');
  if (!scene.includes('shouldShowOpeningGoldenPothos()')
    || !scene.includes("this.progress.shopStock.some((entry) => entry.item === 'small-golden-pothos')")
    || !scene.includes('this.progress.openingGoldenPothosCollected = true;')) throw new Error('Opening Golden Pothos can respawn after collection or sale.');
  if (!scene.includes('shouldShowCommonParlourPalm()') || !scene.includes('this.progress.commonParlourPalmCollected = true;')
    || !scene.includes("this.progress.colourUpgradeStage = 'prompt'")) throw new Error('Common Parlour Palm colour-upgrade trigger is incomplete.');
  if (!hud.includes('CONFIRM PREMIUM PURCHASE') || !hud.includes('data-shop-confirm-premium')) throw new Error('Premium purchases lack explicit confirmation.');
  if (!vite.includes('COMMIT_REF') || !vite.includes("return 'local'") || !vite.includes('__APP_VERSION__')) throw new Error('Build identifier fallback/version injection is incomplete.');
  console.log('Playtest validation passed: version, economy, build identity, developer gate, save isolation and premium confirmation.');
} finally {
  await server.close();
}
