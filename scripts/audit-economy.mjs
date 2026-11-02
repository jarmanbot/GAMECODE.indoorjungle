import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });

try {
  const plants = await server.ssrLoadModule('/src/game/plants.ts');
  const world = await server.ssrLoadModule('/src/game/world.ts');
  const definitions = Object.fromEntries(plants.PLANT_SPECIES.map((species) => [species, plants.getPlantDefinition(species)]));
  const mandatoryOpeningIncome = world.OPENING_POTHOS_DELIVERY_REWARD + world.WINDOW_JOB_REWARD + world.REPAIRED_POT_SALE_PRICE;
  const postBondBalance = mandatoryOpeningIncome - world.RENTAL_BOND_COST;
  const tutorialIncome = world.BASIL_DELIVERY_REWARD + definitions.mint.harvestPrice;
  const extraPotCost = 2 * world.SMALL_BASIC_PLASTIC_POT_PRICE;
  const packCost = (species, packs) => definitions[species].seedPrice * definitions[species].seedPackQuantity * packs;
  const route = ({ name, start = postBondBalance, basil = 0, mint = 0, marigold = 0, lily = 0, basilPacks = 0, mintPacks = 0, marigoldPacks = 0, lilyPacks = 0, pots = extraPotCost }) => {
    const gross = tutorialIncome
      + basil * definitions.basil.harvestPrice
      + mint * definitions.mint.harvestPrice
      + marigold * definitions['dwarf-marigold'].harvestPrice
      + lily * definitions['peace-lily'].harvestPrice;
    const seeds = packCost('basil', basilPacks) + packCost('mint', mintPacks)
      + packCost('dwarf-marigold', marigoldPacks) + packCost('peace-lily', lilyPacks);
    const final = start + gross - seeds - pots;
    const serialMinutes = (definitions.basil.growthDurationMs + definitions.mint.growthDurationMs
      + basil * definitions.basil.growthDurationMs + mint * definitions.mint.growthDurationMs
      + marigold * definitions['dwarf-marigold'].growthDurationMs + lily * definitions['peace-lily'].growthDurationMs
      - world.BASIC_FERTILIZER_GROWTH_REDUCTION_MS) / 60_000;
    return { name, start, gross, seedCosts: seeds, replacementPotCosts: pots, final, plantingCycles: 2 + basil + mint + marigold + lily, serialMinutes };
  };

  const routes = [
    route({ name: 'Mint-focused · three slots', mint: 87, mintPacks: 18 }),
    route({ name: 'Basil-focused · three slots', basil: 170, basilPacks: 17 }),
    route({ name: 'Mixed Basil/Mint · three slots', basil: 90, mint: 40, basilPacks: 9, mintPacks: 8 }),
    route({ name: 'Whole potted Peace Lily · three slots', lily: 14, lilyPacks: 7, pots: 13 * world.SMALL_BASIC_PLASTIC_POT_PRICE }),
    route({ name: 'All crops mixed · three slots', basil: 10, mint: 5, marigold: 2, lily: 12, basilPacks: 1, mintPacks: 1, marigoldPacks: 1, lilyPacks: 6, pots: 13 * world.SMALL_BASIC_PLASTIC_POT_PRICE }),
    route({ name: 'Begonia shortcut · Peace Lily', start: postBondBalance + world.RARE_BEGONIA_SALE_PRICE, lily: 6, lilyPacks: 3, pots: 5 * world.SMALL_BASIC_PLASTIC_POT_PRICE }),
  ];
  for (const result of routes) if (result.final < world.SECOND_RENTAL_MOVE_COST) throw new Error(`${result.name} does not reach the 540-coin amount due.`);
  if (mandatoryOpeningIncome !== 94 || postBondBalance !== 34) throw new Error('Mandatory opening economy changed unexpectedly.');
  if (world.SECOND_RENTAL_TOTAL_BOND !== 600 || world.RENTAL_BOND_COST !== 60 || world.SECOND_RENTAL_MOVE_COST !== 540) throw new Error('Housing payment constants are inconsistent.');

  const cropEconomy = plants.PLANT_SPECIES.map((species) => {
    const definition = definitions[species];
    const potCost = definition.yieldMode === 'whole-plant' ? world.SMALL_BASIC_PLASTIC_POT_PRICE : 0;
    const net = definition.harvestPrice - definition.seedPrice - potCost;
    return {
      species,
      packQuantity: definition.seedPackQuantity,
      packPrice: packCost(species, 1),
      growthSeconds: definition.growthDurationMs / 1000,
      sale: definition.harvestPrice,
      buyback: world.getShopBuybackPrice(definition.harvestPrice),
      netPerCycle: net,
      netPerGrowthMinute: Number((net / (definition.growthDurationMs / 60_000)).toFixed(2)),
    };
  });
  console.log(JSON.stringify({ mandatoryOpeningIncome, postBondBalance, tutorialIncome, cropEconomy, routes }, null, 2));
} finally {
  await server.close();
}
