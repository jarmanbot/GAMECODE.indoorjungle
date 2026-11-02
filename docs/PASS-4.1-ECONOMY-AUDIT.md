# Indoor Jungle — Pass 4.1 progression and economy assessment

This is the single handoff document for reviewing the current progression and
planning the next economy pass. It reflects the code constants on 2 November
2026. No economy values
were changed in Pass 4.1. Route timings are deterministic growth-time
calculations plus explicitly labelled interaction estimates; they are not a
physical-phone stopwatch run.

## Executive summary

- Pass 4.1 progression corrections are implemented and compile successfully.
- The Rare Spotted Begonia is now an optional 300-coin shortcut and does not
  gate the first rental.
- The first rental is achievable from mandatory opening income: Alex receives
  94 coins and has 34 remaining after the 60-coin POVO bond.
- The two-bedroom property is listed at 600 coins, applies the existing
  60-coin bond as credit, and deducts exactly 540 coins.
- Without the Begonia, herb-only earning routes are far too repetitive.
- Peace Lily is the dominant strategy. Efficient three-slot play is close to,
  but does not reliably satisfy, the 15–20 minute target.
- The smallest current proposal is to raise the window job from 4 to 10 coins
  and Peace Lily from 60 to 75 coins. These proposals are **not implemented**.

## Pass 4.1 progression corrections

### Final building-state progression

| Event | Buy/Sell | Real Estate Agent | POVO Apartments | Nursery |
|---|---|---|---|---|
| Fresh game | Green CRT | Green CRT | Green CRT | Atari B&W vacant lot |
| Cleaning job accepted, still inside | Green CRT | Green CRT | Green CRT | Atari B&W vacant lot |
| Exit Buy/Sell after accepting | Atari B&W | Green CRT | Green CRT | Atari B&W vacant lot |
| Repaired-pot graphics upgrade | Atari B&W | Green CRT | Green CRT | Green CRT construction |
| Room-key colour upgrade | Atari colour | Atari colour | Atari colour | Green CRT construction |

Each building uses its saved building-specific state. The global Alex graphics
selection does not choose a building facade. Nursery remains independently
controlled.

### Graphics Module interface

The repaired-pot Graphics Module prompt, progress display, completion state and
final acknowledgement now use black, white and neutral grey throughout. The
approved 2.3-second installation timing, persistence and input blocking remain
unchanged.

### First-rental checklist

Mandatory conditions are now:

1. Sell or deliver the opening Golden Pothos.
2. Complete the paid Real Estate window-cleaning job.
3. Repair the special pot.
4. Hold 60 coins for the POVO bond.

The Begonia appears as an optional checklist shortcut only. It does not unlock
POVO, trigger the room-key sequence or advance a mandatory tutorial objective.

### Herb harvesting

Harvesting Basil or Mint removes the plant and leaves the pot in its grow slot.
The pot retains usable medium under the current rules. Whole-plant lifting is
unchanged: Dwarf Marigold and Peace Lily leave the grow table together with
their basic pot and therefore require a replacement pot for another cycle.

### Save policy

- Current progression namespace: `indoor-jungle-progress-v5`.
- Current v5 states reload through the validated `ProgressState` sanitizer.
- Incompatible v3/v4 progression is no longer imported into v5.
- Development saves remain isolated from normal saves.
- Controls, audio, handedness and display preferences remain in separate
  storage and are not deliberately reset with progression.

## Current implemented journey

1. Start a New Game and complete Alex's eviction/fall sequence.
2. Collect and deliver the Small Golden Pothos for 15 coins.
3. Accept the Casual Window Washer job.
4. Exit Buy/Sell, causing its independent Atari B&W upgrade.
5. Clean two Real Estate windows with three completed sprays each.
6. Receive glue and the repair tool, collect four pieces and repair the pot.
7. Pick up the repaired pot and complete the B&W Graphics Module sequence.
8. Sell the repaired pot for 75 coins.
9. Optionally find and sell the Rare Spotted Begonia for 300 coins.
10. Pay the 60-coin POVO bond and receive the key and Welcome Gift.
11. Complete the room-key colour upgrade.
12. Grow and sell at least one genuine Basil and one genuine Mint harvest.
13. Continue earning until Alex has the 540-coin amount due.
14. Transfer the 60-coin bond and pay 540 coins for the two-bedroom rental.
15. Reach the current `PLAYTEST COMPLETE` endpoint.

## Starting economy

### Mandatory opening income

| Source | Coins |
|---|---:|
| Golden Pothos special delivery | 15 |
| Real Estate window-cleaning job | 4 |
| Repaired special pot sale | 75 |
| Other unavoidable income | 0 |
| **Total before POVO** | **94** |

After the 60-coin POVO bond, Alex has **34 coins**. The Welcome Gift adds one
basic pot with usable medium, a watering can, one Basil seed, one Mint seed and
one free fertiliser pellet, but no coins.

### Optional and repeatable income

| Source | Value | Repeatable? |
|---|---:|---|
| Rare Spotted Begonia | 300 | No; optional shortcut |
| Basil special delivery | 9 | No; one outstanding request |
| Ordinary Basil leaves | 5 | Yes, through growing |
| Ordinary Mint leaves | 8 | Yes, through growing |
| Potted Dwarf Marigold | 35 | Yes, through growing and replacing its pot |
| Potted Peace Lily | 60 | Yes, through growing and replacing its pot |
| Window-cleaning job | 4 | No |

The heavy starting pot is not collectible and produces no income. The three
premium shelf plants are purchases, not income sources: Snake Plant 250,
Monstera 750 and Variegated Pothos 2,000 coins.

## Housing

| Item | Coins |
|---|---:|
| POVO refundable bond | 60 |
| Two-bedroom listed total | 600 |
| Existing POVO bond credit | −60 |
| **Amount deducted on move** | **540** |

The move requires one genuine Basil sale, one genuine Mint sale and 540
spendable coins. It does not require Alex to hold 600 coins and does not deduct
the first bond again.

## Seed packs and supplies

| Seed | Pack quantity | Pack price | Cost per seed |
|---|---:|---:|---:|
| Basil | 10 | 20 | 2 |
| Mint | 5 | 10 | 2 |
| Dwarf Marigold | 2 | 16 | 8 |
| Peace Lily | 2 | 30 | 15 |

- Small basic plastic pot: 10 coins.
- Basic Fertiliser box: 20 coins for 10 pellets, or 2 coins per pellet.
- Each pellet removes 30 seconds. Fertiliser is optional for every crop.
- Every crop must be watered once. The watering can is reusable.
- Usable medium is retained by harvested herbs under the current rules.

## Crop and product economy

Every planting produces one saleable inventory unit. Herb harvesting removes
the plant and leaves its pot and usable medium in the grow slot. Whole-plant
lifting removes the plant, pot and medium together.

| Crop | Growth | Water | Fertiliser | Yield action | Pot result | Sale | Buyback | Marginal cost | Net/cycle | Net/growth min |
|---|---:|---|---|---|---|---:|---:|---:|---:|---:|
| Basil | 30s | 1 | Optional | Harvest leaves | Pot remains | 5 | 7 | 2 seed | 3 | 6.00 |
| Mint | 60s | 1 | Optional | Harvest leaves | Pot remains | 8 | 12 | 2 seed | 6 | 6.00 |
| Dwarf Marigold | 90s | 1 | Optional | Lift whole | Pot consumed | 35 | 49 | 8 seed + 10 pot | 17 | 11.33 |
| Peace Lily | 150s | 1 | Optional | Lift whole | Pot consumed | 60 | 84 | 15 seed + 10 pot | 35 | 14.00 |

The first Basil can fulfil the one-time 9-coin Wanted delivery. Its marginal
net is 7 coins with a purchased seed, or the full 9 coins with the free Welcome
Gift seed. Shop buyback prices use the configured 1.4× ceiling rule and are not
an earning route because buying stock back costs more than Alex received.

## Implemented paid work

| Work | Actions and stages | Consumables | Reward | Repeatable | Approx. active return |
|---|---|---|---:|---|---:|
| Golden Pothos delivery | Find, collect, enter shop, deliver | None | 15 | No | Depends on travel; strong opening reward |
| Window washer | Accept, exit, visit two windows, 3 completed one-second sprays per window | Borrowed cleaner; no paid consumable | 4 + repair tool/glue progression | No | About 2–4 coins per active minute |
| Repair and sell special pot | Collect 4 pieces, place, use 1 glue and 10 repair presses, collect and sell | One granted glue charge | 75 | No | Roughly 19–38 coins per active minute |
| Basil Wanted delivery | Grow/harvest one Basil, return and deliver | One seed; water; pot retained | 9 | No | 14 net coins per growth minute with a purchased seed |

The three additional job cards are locked future descriptions with no approved
reward and are not implemented jobs.

## Route assumptions

- Starting cash is 34 after paying the POVO bond.
- The free Basil is delivered for 9 and the free Mint is sold for 8, satisfying
  the two crop-sale gates.
- One free fertiliser pellet removes 30 seconds from the first crop.
- Three-slot routes buy two additional pots for 20 coins.
- Whole-plant routes count every purchased replacement pot. They do not charge
  for the first free pot and do not buy an unnecessary pot after the final sale.
- Shop trips are minimum practical estimates using stacked sales and pack buys.
- Active-time estimates include the 0.76-second plant/water/harvest animations,
  selections, walking and shop handling; they need physical-phone measurement.

## Routes to 540 coins due — Begonia excluded

| Route | Start | Gross | Seeds | Pots | Cycles / sale actions | Shop trips | Serial wait | 3-slot wait | Active estimate | Elapsed estimate | Final |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Mint-focused | 34 | 713 | 180 | 20 | 89 | ~5 | 88m | ~30m | 18–25m | 48–55m | 547 |
| Basil-focused | 34 | 867 | 340 | 20 | 172 | ~6 | 86m | ~29.3m | 25–35m | 54–64m | 541 |
| 9 Basil packs + 8 Mint packs | 34 | 787 | 260 | 20 | 132 | ~6 | 86m | ~29.3m | 22–30m | 51–59m | 541 |
| Peace Lily-focused | 34 | 857 | 210 | 130 | 16 | ~5 | 36m | ~13.5m | 6–9m | 19.5–22.5m | 551 |
| All crops: 10 Basil, 5 Mint, 2 Marigold, 12 Lily, plus free herbs | 34 | 897 | 226 | 130 | 31 | ~7 | 44m | ~15.3m | 9–13m | 24–28m | 575 |

The efficient three-slot strategy is the Peace Lily route: after the free
herbs, the first two Lilies bootstrap enough cash for three-slot batches. With
one slot often idle, its growth wait rises to about 18.5 minutes and total
elapsed time to roughly 24–28 minutes.

“Casual” therefore misses the target. Efficient play is close to the target,
but only by concentrating on Peace Lilies rather than demonstrating the full
crop set.

## Optional Begonia shortcut

Selling the Begonia before paying the bond changes the post-bond balance from
34 to 334 coins. After the free Basil and Mint, six Peace Lilies are enough:

| Start | Gross | Seed cost | Pot cost | Cycles | Serial wait | 3-slot wait | Active estimate | Elapsed | Final |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 334 | 377 | 90 | 50 | 8 | 16m | ~5m | 4–7m | ~9–12m | 571 |

The player must still grow and sell Basil and Mint, so the basic loop cannot be
skipped completely. However, the Begonia removes roughly 10–16 minutes and
more than half of the whole-plant cycles. It currently bypasses most of the
intended POVO earning loop.

## Target assessment

- The 15–20 minute target is not reliably met without the Begonia.
- Efficient three-slot Peace Lily play is approximately 19.5–22.5 minutes.
- Casual two-slot play is approximately 24–28 minutes.
- Herbs are equally efficient at only 6 net coins per growth minute and require
  89–172 cycles, so they are not rational savings strategies.
- Peace Lily is the dominant crop at 14 net coins per growth minute.
- Marigold is profitable but inferior to Peace Lily.
- Whole-plant replacement pots remain rational at 10 coins, but reinforce the
  Peace Lily advantage because its higher sale absorbs the same pot cost.
- The four-coin cleaning reward is negligible for six timed sprays and travel.
- Seed packs do not create a mathematical dead end, but low opening cash forces
  staged purchases.

## Proposed adjustment — not implemented

| Value | Current | Proposed | Reason | Expected target effect |
|---|---:|---:|---|---|
| Window-cleaning reward | 4 | 10 | Six timed sprays plus travel currently earn almost nothing; also raises the honest post-bond starting balance by 6 | Removes a small bootstrap delay |
| Peace Lily whole-plant sale | 60 | 75 | A high-impact late crop can carry the property goal with fewer repeated cycles | An all-crop route needs about 8 rather than 12 Lilies and should approach 17–20 minutes with three slots |

These two changes preserve the 600/60/540 housing rule and the 300-coin
Begonia. They deliberately avoid changing every seed pack and crop. A timed
physical-phone run should precede any implementation; if active interaction is
slower than estimated, one further adjustment should target Wanted bonuses or
shop-trip friction rather than another broad price rewrite.

## Verification completed

The following commands passed after the correction work:

```text
npm run build
npm run check:pass3
npm run check:regression
npm run check:checkpoints
npm run check:economy
git diff --check
```

Results:

- TypeScript and the Vite production build completed successfully.
- All 68 development checkpoints generated valid current-schema states.
- Every checkpoint was serialized, sanitized and compared for v5 reload
  stability.
- The POVO-rented checkpoint proves rental is possible with Begonia state
  still false.
- Automated assertions cover the final building table, B&W module interface,
  herb pot retention and the 540-coin affordability/deduction rule.
- The deterministic economy script reproduces all values and route totals in
  this document directly from the game constants.
- The built root document and Green CRT Buy/Sell facade returned HTTP 200 from
  the production preview.
- Vite still reports the existing warning that the main JavaScript chunk is
  larger than 500 kB. This is not a build failure.

## Manual checks still required

Browser automation and a physical iPhone were not available for this pass.
Before applying economy changes, manually verify:

1. Rent POVO on a fresh run without touching the Begonia.
2. Real Estate remains Green CRT through the repaired-pot upgrade.
3. Real Estate changes directly to Atari colour during the room-key upgrade.
4. All Graphics Module screens visibly remain B&W.
5. Harvested Basil and Mint visibly leave an empty reusable pot in place.
6. The property menu clearly communicates 600 total, −60 credit and 540 due.
7. A 540-coin balance permits the move and becomes zero after confirmation.
8. Time one efficient three-slot route and one casual two-slot route on a
   physical phone.

## Files relevant to this assessment

- `src/game/GameScene.ts` — rental gates, transactions, building transitions
  and harvesting behaviour.
- `src/game/progress.ts` — current v5 save validation and building state.
- `src/game/devCheckpoints.ts` — progression fixtures and validation.
- `src/game/plants.ts` — authoritative plant definitions.
- `src/game/world.ts` — rewards, housing, pot and fertiliser constants.
- `src/ui/HudController.ts` — rental checklist and property presentation.
- `src/style.css` — B&W Graphics Module presentation.
- `scripts/audit-economy.mjs` — reproducible route calculations.
- `scripts/validate-pass3.mjs` and `scripts/validate-checkpoints.mjs` — automated
  regression coverage.

## Recommended next economy workflow

1. Review this document and decide whether the target should favour the
   all-crop route or allow Peace Lily specialisation.
2. Perform one timed phone run with current values.
3. If the measured result confirms the estimates, implement only the approved
   adjustment rows.
4. Re-run the audit script with the new constants.
5. Playtest the adjusted no-Begonia and Begonia routes before changing any
   additional prices or timers.
