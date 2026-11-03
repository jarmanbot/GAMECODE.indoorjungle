import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });

try {
  const plants = await server.ssrLoadModule('/src/game/plants.ts');
  const world = await server.ssrLoadModule('/src/game/world.ts');
  const definitions = Object.fromEntries(plants.PLANT_SPECIES.map((species) => [species, plants.getPlantDefinition(species)]));
  const mandatoryOpeningIncome = world.OPENING_POTHOS_DELIVERY_REWARD + world.WINDOW_JOB_REWARD + world.REPAIRED_POT_SALE_PRICE;
  const postBondBalance = mandatoryOpeningIncome - world.RENTAL_BOND_COST;
  const tutorialIncome = world.BASIL_DELIVERY_REWARD + definitions.mint.harvestPrice;
  const target = world.SECOND_RENTAL_MOVE_COST;
  const packPrice = (species) => definitions[species].seedPrice * definitions[species].seedPackQuantity;

  const simulate = ({ name, pattern, slots = 3, begonia = false, parlourPalm = false }) => {
    let balance = postBondBalance + tutorialIncome
      + (begonia ? world.RARE_BEGONIA_SALE_PRICE : 0)
      + (parlourPalm ? world.COMMON_PARLOUR_PALM_SALE_PRICE : 0);
    const seeds = Object.fromEntries(plants.PLANT_SPECIES.map((species) => [species, 0]));
    let reusablePot = true;
    let cycles = 0;
    let seedCosts = 0;
    let potCosts = 0;
    let seedPurchases = 0;
    let potPurchases = 0;
    const slotAvailableAt = Array.from({ length: slots }, () => 60_000);
    let serialGrowthMs = 60_000;
    while (balance < target && cycles < 1000) {
      const species = pattern[cycles % pattern.length];
      const definition = definitions[species];
      if (seeds[species] < 1) {
        const cost = packPrice(species);
        if (balance < cost) throw new Error(`${name} cannot afford the next ${species} seed pack.`);
        balance -= cost;
        seedCosts += cost;
        seedPurchases += 1;
        seeds[species] += definition.seedPackQuantity;
      }
      seeds[species] -= 1;
      if (definition.yieldMode === 'whole-plant') {
        if (!reusablePot) {
          balance -= world.SMALL_BASIC_PLASTIC_POT_PRICE;
          potCosts += world.SMALL_BASIC_PLASTIC_POT_PRICE;
          potPurchases += 1;
        }
        reusablePot = false;
      } else if (!reusablePot) {
        balance -= world.SMALL_BASIC_PLASTIC_POT_PRICE;
        potCosts += world.SMALL_BASIC_PLASTIC_POT_PRICE;
        potPurchases += 1;
        reusablePot = true;
      }
      if (balance < 0) throw new Error(`${name} cannot afford its configured inputs.`);
      balance += definition.harvestPrice;
      const slot = slotAvailableAt.indexOf(Math.min(...slotAvailableAt));
      slotAvailableAt[slot] += definition.growthDurationMs;
      serialGrowthMs += definition.growthDurationMs;
      cycles += 1;
    }
    const saleActions = cycles + 2 + (begonia ? 1 : 0) + (parlourPalm ? 1 : 0);
    const activeSeconds = Math.round(cycles * 16 + saleActions * 6 + (seedPurchases + potPurchases) * 8 + 150);
    const parallelGrowthMs = Math.max(...slotAvailableAt);
    return { name, slots, begonia, parlourPalm, cropCycles: cycles + 2, postTutorialCycles: cycles, saleActions, seedCosts, potCosts,
      serialGrowthMinutes: Number((serialGrowthMs / 60_000).toFixed(2)), parallelGrowthMinutes: Number((parallelGrowthMs / 60_000).toFixed(2)),
      estimatedActiveMinutes: Number((activeSeconds / 60).toFixed(2)), estimatedElapsedMinutes: Number(((activeSeconds * 1000 + parallelGrowthMs) / 60_000).toFixed(2)), finalBalance: balance };
  };

  const routes = [
    simulate({ name: 'Basil-focused', pattern: ['basil'] }),
    simulate({ name: 'Mint-focused', pattern: ['mint'] }),
    simulate({ name: 'Marigold-focused', pattern: ['dwarf-marigold'] }),
    simulate({ name: 'Peace Lily-focused', pattern: ['peace-lily'] }),
    simulate({ name: 'Mixed all-crop', pattern: ['basil', 'mint', 'dwarf-marigold', 'peace-lily'] }),
    simulate({ name: 'Efficient three-slot', pattern: ['basil', 'mint', 'mint'], slots: 3 }),
    simulate({ name: 'Casual two-slot', pattern: ['basil', 'mint', 'dwarf-marigold', 'peace-lily'], slots: 2 }),
    simulate({ name: 'Mixed with optional Begonia', pattern: ['basil', 'mint', 'dwarf-marigold', 'peace-lily'], begonia: true }),
    simulate({ name: 'Mixed without Begonia', pattern: ['basil', 'mint', 'dwarf-marigold', 'peace-lily'], begonia: false }),
    simulate({ name: 'Mixed with Common Parlour Palm', pattern: ['basil', 'mint', 'dwarf-marigold', 'peace-lily'], parlourPalm: true }),
    simulate({ name: 'Mixed with Palm and optional Begonia', pattern: ['basil', 'mint', 'dwarf-marigold', 'peace-lily'], parlourPalm: true, begonia: true }),
  ];
  const expected = { basil: { sale: 8, net: 6, rate: 12 }, mint: { sale: 14, net: 12, rate: 12 }, 'dwarf-marigold': { sale: 35, net: 17, rate: 11.33 }, 'peace-lily': { sale: 50, net: 25, rate: 10 } };
  const cropEconomy = plants.PLANT_SPECIES.map((species) => {
    const definition = definitions[species];
    const potCost = definition.yieldMode === 'whole-plant' ? world.SMALL_BASIC_PLASTIC_POT_PRICE : 0;
    const net = definition.harvestPrice - definition.seedPrice - potCost;
    const rate = Number((net / (definition.growthDurationMs / 60_000)).toFixed(2));
    if (definition.harvestPrice !== expected[species].sale || net !== expected[species].net || rate !== expected[species].rate) throw new Error(`Unexpected calibrated crop economy for ${species}.`);
    return { species, seedCost: definition.seedPrice, potCost, sale: definition.harvestPrice, net, growthSeconds: definition.growthDurationMs / 1000, netPerGrowthMinute: rate, buyback: world.getShopBuybackPrice(definition.harvestPrice) };
  });
  if (world.WINDOW_JOB_REWARD !== 10 || world.BASIL_DELIVERY_REWARD !== 10 || world.RARE_BEGONIA_SALE_PRICE !== 150 || world.COMMON_PARLOUR_PALM_SALE_PRICE !== 250) throw new Error('Approved opening economy constants are not calibrated.');
  if (world.SECOND_RENTAL_TOTAL_BOND !== 600 || world.RENTAL_BOND_COST !== 60 || target !== 540) throw new Error('Housing payment constants are inconsistent.');
  if (routes.some((route) => route.finalBalance < target)) throw new Error('A deterministic route failed to reach the move amount.');
  const dominant = [...routes.slice(0, 4)].sort((a, b) => a.estimatedElapsedMinutes - b.estimatedElapsedMinutes)[0].name;
  console.log(JSON.stringify({ mandatoryOpeningIncome, postBondBalance, tutorialIncome, target, cropEconomy, routes, dominantStrategy: dominant }, null, 2));
} finally {
  await server.close();
}
