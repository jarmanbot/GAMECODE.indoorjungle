import { createServer } from 'vite';

const server = await createServer({
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'silent',
});

try {
  const module = await server.ssrLoadModule('/src/game/devCheckpoints.ts');
  const progressModule = await server.ssrLoadModule('/src/game/progress.ts');
  const options = module.getDevCheckpointOptions();
  const ids = new Set();
  const snapshots = new Map();
  for (const option of options) {
    if (ids.has(option.id)) throw new Error(`Duplicate checkpoint id: ${option.id}`);
    ids.add(option.id);
    const snapshot = module.createDevCheckpoint(option.id);
    if (!snapshot) throw new Error(`Checkpoint did not build: ${option.id}`);
    if (snapshot.progress.coins < 0) throw new Error(`Checkpoint has negative coins: ${option.id}`);
    if (!snapshot.progress.buildings?.['buy-sell'] || !snapshot.progress.buildings?.['starter-apartment']
      || !snapshot.progress.buildings?.['real-estate'] || !snapshot.progress.buildings?.nursery) {
      throw new Error(`Checkpoint lacks complete building state: ${option.id}`);
    }
    const reloaded = progressModule.sanitizeProgress(JSON.parse(JSON.stringify(snapshot.progress)));
    if (JSON.stringify(reloaded) !== JSON.stringify(snapshot.progress)) throw new Error(`Current v5 checkpoint is not reload-stable: ${option.id}`);
    snapshots.set(option.id, snapshot);
  }
  const accepted = snapshots.get('window-job-accepted')?.progress;
  if (!accepted?.buySellBwUpgradePending || accepted.buildings['buy-sell'].graphicsEra !== 'green-crt') throw new Error('Cleaning-job checkpoint does not preserve the pending Green CRT shop state.');
  const bw = snapshots.get('buy-sell-bw-online')?.progress;
  if (bw?.buySellBwUpgradePending || bw?.buildings['buy-sell'].graphicsEra !== 'atari-bw') throw new Error('Buy/Sell B&W exit checkpoint is inconsistent.');
  const raster = snapshots.get('graphics-upgrade-installed')?.progress;
  if (!raster?.graphicsUpgradeInstalled || raster.colourUpgradeInstalled
    || raster.buildings['buy-sell'].graphicsEra !== 'atari-bw'
    || raster.buildings['starter-apartment'].graphicsEra !== 'green-crt'
    || raster.buildings['real-estate'].graphicsEra !== 'green-crt') throw new Error('First graphics-module checkpoint has the wrong building eras.');
  const colour = snapshots.get('welcome-gift-claimed')?.progress;
  if (!colour?.colourUpgradeInstalled || colour.buildings['buy-sell'].graphicsEra !== 'atari-colour'
    || colour.buildings['starter-apartment'].graphicsEra !== 'atari-colour'
    || colour.buildings['real-estate'].graphicsEra !== 'atari-colour') throw new Error('Room-key colour checkpoint has the wrong building eras.');
  const rentedWithoutBegonia = snapshots.get('apartment-rented')?.progress;
  if (!rentedWithoutBegonia?.rentalBondPaid || rentedWithoutBegonia.rareBegoniaCollected) throw new Error('POVO rental checkpoint must prove the Begonia is optional.');
  console.log(`Checkpoint validation passed: ${options.length} current-schema checkpoints.`);
} finally {
  await server.close();
}
