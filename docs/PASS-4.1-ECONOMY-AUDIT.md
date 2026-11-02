# Indoor Jungle Pass 4.1 economy audit

This audit reflects the code constants on 1 November 2026. No economy values
were changed in Pass 4.1. Route timings are deterministic growth-time
calculations plus explicitly labelled interaction estimates; they are not a
physical-phone stopwatch run.

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
