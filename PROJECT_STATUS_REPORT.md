# Indoor Jungle — Current Project Status Report

Audit date: 24 October 2026

Workspace: /Users/jarmandonohue/GAMECODE.indoorjungle

Branch: first-basil-sold-and-seeds-bought

Latest commit before this implementation: 7c1b266

Working tree at audit: growing-system implementation changes in progress

Remote: https://github.com/jarmanbot/GAMECODE.indoorjungle.git

This report describes the current implementation in the source code and is
intended as the document-ready project status reference for ChatGPT and
project tracking. The source code is authoritative where older prompts or
README wording differ.

## Current implementation summary

The game currently contains:

- A playable starting street.
- BUY / SELL shop interior.
- HOMES estate-agent window-cleaning job.
- Broken-pot collection and repair loop.
- Starter apartment rental.
- Starter kit and a three-slot grow table.
- Three independent growing pots with stable IDs, reusable medium, basil and mint crops, growth timing, fertiliser and harvest state.
- Basil and mint seed purchasing, fresh-leaf selling and species-specific shop stacks.
- City map with locked future districts.
- Phone hybrid controls with joystick and A/B buttons.
- Desktop keyboard, mouse, tap-to-walk and zoom controls.
- Local normal saves and separate development test saves.
- Procedural monochrome Atari-style artwork.
- Music and sound-effect settings.
- Development checkpoints for progression testing.

The current implemented progression reaches:

> First basil harvest sold → ready to buy more basil seeds.

Not implemented: house expansion, PLANTS shop stock, district unlock
progression, fast travel, accounts, backend services or additional playable
districts.

## Important source files

- src/game/world.ts — world geometry, interaction positions and economy constants.
- src/game/progress.ts — validated save schema, defaults and migrations.
- src/game/GameScene.ts — Phaser scene, movement, camera, interactions and progression.
- src/ui/HudController.ts — HUD, panels, phone controls and developer tools.
- src/game/devCheckpoints.ts — development checkpoint registry and state builders.
- src/game/art.ts — procedural monochrome world and item artwork.
- src/style.css — responsive layout, phone controls, panels and map styling.
- src/main.ts — Phaser/Vite application startup.
- AGENTS.md — developer checkpoint and save-maintenance instructions.

## Starting street

Building order:

1. BUY / SELL
2. HOMES estate agent
3. PLANTS — shuttered and labelled OPENING SOON
4. STARTER APARTMENT

World dimensions:

~~~text
World width:  4200
World height: 1800
~~~

Playable street bounds:

~~~text
Starting X range:  540–2540
Front pavement:    Y 850–932
Road:              Y 932–1188
Opposite pavement: Y 1188–1240
Crossing X range: 1406–1666
~~~

Alex cannot walk through buildings, the road, scenery or locked future areas.
The road can only be crossed through the marked crossing. Cars are decorative
and do not create collision or traffic gameplay.

Current world positions:

| Destination | Position |
|---|---:|
| Alex start | (560, 890) |
| Opening Golden Pothos | (1648, 930) |
| BUY / SELL entrance | (1165, 864) |
| HOMES left window section | (1332, 860) |
| HOMES centre window section | (1450, 860) |
| HOMES right window section | (1568, 860) |
| Broken-pot pieces | (1880, 910) |
| Starter apartment entrance | (2275, 864) |

The zebra crossing currently uses horizontal bars spanning the crossing. The
road and world geometry are not rotated.

## Movement mathematics

Keyboard and joystick movement:

~~~text
235 world units per second
~~~

Tap-to-walk movement:

~~~text
190 world units per second
~~~

Movement delta is capped to 32 milliseconds per frame. Diagonal movement is
normalised, so diagonal movement is not faster than horizontal or vertical
movement.

Approximate walking times:

| Route | Distance | Tap route | Keyboard / joystick |
|---|---:|---:|---:|
| Start → Golden Pothos | 1088.7 | 5.73 s | 4.63 s |
| Start → BUY / SELL | 605.6 | 3.19 s | 2.58 s |
| BUY / SELL → HOMES left section | 167.1 | 0.88 s | 0.71 s |
| HOMES left → centre | 118 | 0.62 s | 0.50 s |
| HOMES centre → right | 118 | 0.62 s | 0.50 s |
| HOMES right → broken pot | 316.0 | 1.66 s | 1.34 s |
| HOMES right → apartment | 707.0 | 3.72 s | 3.01 s |
| Start → apartment | 1715.2 | 9.03 s | 7.30 s |
| Full playable X span | 2000 | 10.53 s | 8.51 s |

These are ideal straight-line estimates. Tap routes can be slightly longer
when crossing between pavements or stopping for interaction thresholds.

## Camera and zoom

Only two street zoom levels remain:

- Close
- Normal

The game starts in Close mode. The single phone zoom button toggles between
the two modes. Desktop controls are mouse wheel, comma to zoom out and period
to zoom in.

Close and Normal use the same world coordinates and object sizes. The camera
changes viewport framing and zoom rather than moving or stretching scenery.

### Close camera

Close uses reference bounds of approximately:

~~~text
World width: 690
World height: 461
Padding factor: 1.45
~~~

Formula:

~~~text
zoom = min(viewportWidth / 690, viewportHeight / 461) × 1.45
~~~

Example values:

| Viewport | Approximate Close zoom |
|---|---:|
| 1280×720 desktop | 2.265 |
| 390×390 portrait world viewport | 0.820 |
| 320×320 portrait world viewport | 0.672 |

The numerical zoom value therefore changes by orientation and viewport size.
A phone does not use the same numerical zoom value as a desktop.

### Normal camera

Desktop Normal framing uses approximately:

~~~text
World width: 1970
World height: 850
Fit padding: 0.94
Additional scale: 0.92
Minimum zoom: 0.58
~~~

Portrait Normal framing uses approximately:

~~~text
World width: 1120
World height: 850
Fit padding: 0.94
Additional scale: 0.92
Minimum zoom: 0.42
~~~

Typical results:

~~~text
1280×720 desktop Normal: 0.58 minimum
390×390 phone Normal:    0.42 minimum
~~~

Camera follow keeps Alex near the horizontal centre on portrait phones. The
portrait horizontal dead zone scales with viewport width. Close mode uses
faster follow easing than Normal. When Alex reaches the opposite pavement,
Close mode changes vertical framing to keep the full character visible.

## Fresh-start walkthrough

### 1. Find the Small Golden Pothos

Fresh state:

~~~text
Coins: 0
Inventory: empty
Objective: Find a Small Golden Pothos
Scene: street
Zoom: Close
Alex: (560, 890)
Pot: (1648, 930)
~~~

The pot has a visible world position, an enlarged invisible interaction target
and a collection range of 110 world units. Tapping it does not collect it
remotely. Alex routes to approximately (1576, 930) and collects only after
reaching range.

On collection:

~~~text
inventoryPot = ordinary
inventoryItem = small-golden-pothos
inventoryInstanceId = opening-golden-pothos-1
task = clean
~~~

The pot disappears, Bag highlights and the message is:

~~~text
Found a Small Golden Pothos.
~~~

The original item cannot respawn after sale because completion and shop stock
are persisted.

### 2. Enter BUY / SELL

BUY / SELL can be entered by tapping the visible door or walking into the
threshold with arrows, WASD or the joystick.

Door geometry:

~~~text
Width: 64
Height: 104
Top: 726
Bottom: 830
Entrance point: (1165, 864)
~~~

Movement entry requires Alex to be in the door lane, moving upward and
crossing the actual threshold. Walking sideways past the door does not enter.

The transition opens the door, moves Alex into the doorway, fades Alex, shows
the shop interior and restores control. Duplicate transitions are blocked.

### 3. Sell the Golden Pothos

Selling the first Pothos is available but is no longer technically required
before accepting the window job. The canonical progression route sells it
first.

~~~text
Opening Pothos sale price = 5 coins
~~~

After sale:

~~~text
Coins: 0 + 5 = 5
Inventory: empty
saleComplete: true
shopGoldenPothosStock: true
Shop stock: Small Golden Pothos ×1
~~~

Stable item identity:

~~~text
opening-golden-pothos-1
~~~

The exterior sign changes from:

~~~text
WANTED
GOLDEN POTHOS
CASH PAID
~~~

to:

~~~text
NO DELIVERIES
WANTED
~~~

The buyback price uses:

~~~text
ceil(normal sale price × 1.4)
ceil(5 × 1.4) = 7 coins
~~~

### 4. Accept the window-cleaning job

The job is available from the start through the BUY / SELL Wanted tab.

~~~text
Wanted: Casual Window Washer
Location: REAL ESTATE window
Reward: 9 coins + repair tool and glue
Requirement: 3 sections, 3 sprays per section
~~~

Three future jobs are shown as locked:

- Wanted: Full-time cleaner
- Wanted: Cleaning contract
- Wanted: Service robot nursery worker

Accepting the job sets:

~~~text
windowJobAccepted = true
cleanerOwned = true
equippedTool = cleaner
task = clean
~~~

The cleaner is equipped immediately. The current acceptance method does not
explicitly assign the cleaner into a tool slot, while the checkpoint builder
does. This is a small consistency point to check when testing the Tools popup.

### 5. Clean the HOMES window

The HOMES window has three sequential sections:

| Section | Position | Sprays |
|---|---:|---:|
| Left | x 1280–1384 | 3 |
| Centre | x 1398–1502 | 3 |
| Right | x 1516–1620 | 3 |

Total:

~~~text
3 sections × 3 sprays = 9 sprays
~~~

For each section, the player taps the section, walks to its pavement
approach, moves close enough for Alex’s head to touch the facade, faces the
window and presses B once per spray.

The valid approach requires approximately:

~~~text
Alex Y − 43 <= 834
Alex Y <= 877
Horizontal distance from the section lane <= 96
~~~

Each B press starts a one-second spray animation with droplets and a splash.
Holding B does not repeat. A fresh press is required for every spray.

Each section visibly becomes cleaner. After a section is complete:

~~~text
Already clean. Move to the next window.
~~~

After all 9 sprays:

~~~text
Coins: 5 + 9 = 14
windowJobComplete = true
cleanerOwned = false
repairToolOwned = true
glueCharges = 1
equippedTool = repair
brokenPotAvailable = true
brokenPotPiecesRemaining = 3
task = repair
~~~

Nominal spray time:

~~~text
9 × 1 second = 9 seconds
~~~

The README still says 8 sprays and a 3-coin reward. That is obsolete; the
current source uses 9 sprays and a 9-coin reward.

### 6. Collect the broken special pot

The broken pot appears at (1880, 910) as three separate visible pieces.
Each piece must be tapped, approached, selected and collected by pressing B.

~~~text
Pieces: 3 → 2 → 1 → 0
Pickup range: approximately 105 world units
~~~

After all pieces are collected:

~~~text
inventoryPot = broken
inventoryItem = special-repair-pot
inventoryInstanceId = special-repair-pot-1
brokenPotOwned = true
brokenPotAvailable = false
repairStep = 0
task = repair
~~~

### 7. Repair the special pot

Repair requires the broken pot, the Repair Tool and one glue charge. The
repair presentation is placed beside Alex rather than directly underneath.

Repair interaction range:

~~~text
125 world units
~~~

Repair actions:

~~~text
10 B presses
360 ms per press
10 × 360 ms = 3600 ms nominal uninterrupted repair time
~~~

The pot visibly changes at each repair stage and retains visible seams when
finished. Glue is consumed only when the repair completes:

~~~text
glueCharges: 1 → 0
repairStep: 0 → 10
~~~

The completed empty pot remains visible and is tapped to collect. After pickup:

~~~text
inventoryPot = repaired
inventoryItem = special-repair-pot
task = sell-repaired
~~~

A repaired pot placed back on the street remains repaired and empty. A broken
pot placed back on the street returns to three pieces.

### 8. Sell the repaired pot

~~~text
Repaired pot sale price = 75 coins
~~~

Canonical coin ledger:

~~~text
0 + 5 + 9 + 75 = 89 coins
~~~

After sale:

~~~text
Coins: 89
Inventory: empty
repairedPotSaleComplete = true
task = complete
~~~

Buyback price:

~~~text
ceil(75 × 1.4) = 105 coins
~~~

### 9. Rent the starter apartment

The HOMES window advertises the actual nearby starter apartment as TO LET.

~~~text
Rental bond = 60 coins
89 − 60 = 29 coins after renting
~~~

The rental unlocks the apartment door. No new district is unlocked.

The current task enum does not contain a separate rental task, so the task can
remain complete until the starter kit is claimed.

### 10. Claim the starter kit

The one-time starter kit contains:

~~~text
Reusable starter pot and used medium
1 basil seed portion
Basic watering can
1 basic fertiliser charge
~~~

After claiming:

~~~text
starterKitClaimed = true
starterKitGranted = true
basilSeeds = 1
wateringCanOwned = true
basicFertilizerCharges = 1
task = place-pot
~~~

### 11. Place the pot on the grow table

The grow table has three selectable positions:

~~~text
Slot 1: (380, 470)
Slot 2: (495, 470)
Slot 3: (610, 470)
~~~

The current starter pot uses one selected slot. The other slots are prepared
for future expansion, but the current system supports only one active starter
pot.

The approach point is 54 units to the left of the selected slot. The
contextual interaction radius is 96 world units.

After placement:

~~~text
starterPotPlaced = true
starterPotSlot = 0, 1 or 2
task = plant-basil
~~~

### 12. Plant basil

Planting consumes one seed:

~~~text
basilSeeds: 1 → 0
basilPlanted: true
basilGrowthStartedAt: null
basilCycleCount: +1
task = water-basil
~~~

Stage: PLANTED.

### 13. Water basil

The player selects the pot, equips the watering can and presses B. The player
must be within 115 world units and cannot be moving during the watering
animation.

Watering duration:

~~~text
720 ms
~~~

On completion:

~~~text
basilGrowthStartedAt = current time
task = grow-basil
stage = seedling
~~~

Natural growth duration:

~~~text
60,000 ms = 60 seconds
~~~

Remaining time:

~~~text
max(0, 60,000 − (currentTime − basilGrowthStartedAt))
~~~

### 14. Use basic fertiliser

One basic fertiliser charge is supplied by the starter kit. It can only be
used while basil is actively growing.

Using it changes the growth timestamp to:

~~~text
currentTime − 60,001 ms
~~~

The normal maturity path then runs. It does not directly award a harvest or
coins.

Result:

~~~text
stage = mature
task = harvest-basil
basicFertilizerCharges: 1 → 0
~~~

Plants shop fertiliser stock is not implemented yet.

### 15. Harvest basil

Harvesting requires mature basil.

~~~text
basilHarvests: +1
basilPlanted: false
basilGrowthStartedAt: null
task = sell-basil
~~~

The grow-table pot becomes EMPTY POT again and remains reusable.

### 16. Sell basil

Basil harvest value:

~~~text
5 coins each
~~~

For the first basil harvest:

~~~text
Coins: 29 + 5 = 34
basilHarvests: 1 → 0
task = buy-seeds
~~~

Equivalent basil harvests stack by item type, quality and condition. Seven
matching harvests display as Basil harvest ×7.

Basil buyback price:

~~~text
ceil(5 × 1.4) = 7 coins each
~~~

### 17. Buy more seeds

Basil seed portion price:

~~~text
2 coins
~~~

After buying one seed from the first-basil-sale state:

~~~text
Coins: 34 − 2 = 32
basilSeeds: +1
task = plant-basil
~~~

This begins the repeatable basil-growing loop.

## Economy ledger

| Transaction | Amount |
|---|---:|
| Opening Golden Pothos sale | +5 |
| Window-cleaning reward | +9 |
| Repaired special pot sale | +75 |
| Starter apartment bond | −60 |
| Basil harvest sale | +5 |
| Basil seed portion purchase | −2 |
| Golden Pothos buyback | 7 |
| Repaired pot buyback | 105 |
| Basil harvest buyback | 7 |

Canonical progression:

~~~text
5 + 9 + 75 − 60 = 29 coins after renting
29 + 5 = 34 coins after first basil sale
34 − 2 = 32 coins after buying the next seed
~~~

If the optional Golden Pothos sale is delayed:

~~~text
9 + 75 − 60 = 24 coins after renting
~~~

The Golden Pothos can still be sold later for 5 coins.

## Save system

Normal save key:

~~~text
indoor-jungle-progress-v1
~~~

Development test save key:

~~~text
indoor-jungle-progress-dev-test-v1
~~~

Development session metadata:

~~~text
indoor-jungle-dev-test-session-v1
indoor-jungle-dev-test-mode-v1
~~~

All saves use browser localStorage. There is no account system, cloud save or
backend.

The save schema tracks coins, inventory, stable item identity, placed street
items, shop stock, window-job state, tools, glue, broken-pot pieces, repair
progress, rental state, starter-kit state, grow-table slot, basil seeds, basil
harvests, crop timestamps, fertiliser charges and the current objective.

Save migration handles older Pothos completion flags, carried and placed item
conflicts, old tool-slot layouts, older starter-kit records, pre-fertiliser
saves, crops that matured while the game was closed and legacy shop stock.

## Developer checkpoints

Current checkpoint registry:

1. Fresh start
2. Golden Pothos collected
3. First plant sold
4. Buyback stock ready
5. Window-cleaning job accepted
6. Window-cleaning job complete
7. Broken special pot collected
8. Repair partly complete
9. Special pot repaired
10. Repaired pot sold
11. Apartment rented — starter kit unclaimed
12. Starter kit claimed
13. Basil planted — needs water
14. Basil growing
15. Basil mature
16. Basil harvested — ready to sell
17. First basil sale complete — ready to buy seeds

Checkpoint coin states:

| Checkpoint | Coins |
|---|---:|
| Fresh start | 0 |
| Golden Pothos collected | 0 |
| First plant sold | 5 |
| Buyback stock ready | 7 |
| Window job accepted | 5 |
| Window job complete | 14 |
| Broken pot collected | 14 |
| Repair partly complete | 14 |
| Special pot repaired | 14 |
| Repaired pot sold | 89 |
| Apartment rented | 29 |
| Starter kit claimed | 29 |
| Basil planted | 29 |
| Basil growing | 29 |
| Basil mature | 29 |
| Basil harvested | 29 |
| First basil sale | 34 |

Checkpoint loading clears movement, tool actions, sprays, repair animations,
fades and transitions. Growing checkpoints use timestamps relative to load
time. The Growing checkpoint gives approximately 30 seconds remaining. The
Mature checkpoint is immediately ready for harvest.

The dropdown does not load immediately. Loading requires the explicit Load
Checkpoint button. Reset Test Save only changes the test namespace. Return to
Normal Save restores the normal namespace. Developer controls are guarded by
import.meta.env.DEV.

Extra development actions:

- Add 10 coins to the test save.
- Add 100 coins to the test save.
- Finish the current growing crop without harvesting it.

## Input controls

### Desktop

- Arrow keys: move.
- WASD: move.
- E: contextual interaction.
- Space: hop.
- Q: use the equipped tool.
- Mouse click: walk or select a world interaction.
- Mouse wheel: zoom.
- Comma: zoom out.
- Period: zoom in.
- Tool, map, Bag and shop panels block world input.

### Phone portrait

- Joystick: continuous movement.
- A: hop.
- B: use the equipped tool.
- Tap pavement: tap-to-walk.
- Tap collectibles: approach and collect.
- Tap doors: approach and enter.
- IN/OUT button: toggle Close/Normal.
- Tool selector: open three tool slots.
- Bag, Map, Tasks, Home and More remain available.

The joystick uses pointer capture and a dead zone. Diagonal movement is
normalised. Releasing the joystick stops movement. Joystick input cancels
pending tap destinations and interaction approaches. Opening a modal resets
held inputs.

With a 74-pixel joystick:

~~~text
Usable radius = 74 / 2 − 17 = 20 pixels
Dead zone ≈ 20 × 0.2 = 4 pixels
~~~

## City map

Street Overview mode was removed. The Map tab is now the city-wide overview.

Approximate map dimensions:

~~~text
1280 × 660 map world units
~~~

The map contains:

- Starting Neighbourhood.
- Willow Reserve — locked.
- East Gardens — locked.
- North Works — locked.
- South Plots — locked.
- Connecting roads.
- Construction and undeveloped areas.
- Alex’s location marker.
- Drag-to-pan.
- Pinch and wheel zoom.
- Centre-on-Alex control.
- Close control.

The map is inspection-only. It does not move Alex, unlock districts or provide
fast travel.

## Artwork and presentation

Artwork is procedurally drawn through Phaser graphics.

Current style:

- Strict black, white and neutral grey.
- Pixel-art rendering.
- Layered skyline.
- Sparse chunky brick patches.
- Simple storefronts.
- BUY / SELL sign.
- Clear door and display window.
- Shuttered PLANTS building labelled OPENING SOON.
- Peaked starter-apartment silhouette.
- Decorative cars and street details.
- Display-only future-era shelf items in the shop.

The shop interior contains Alex, a shopkeeper, counter, shelves, exit door,
player-sold stock and display-only B&W, NES-style and PlayStation-style items.
The premium display items are not purchasable.

## Known limitations and inconsistencies

### README documentation drift

The README contains older wording that says the window job uses eight sprays
and pays three coins. The current implementation uses nine sprays and pays
nine coins. This report and the source code use the current values.

### Tool-slot consistency

The window job equips the cleaner immediately, but the live acceptance method
does not explicitly assign the cleaner to a tool slot. The repair tool is
explicitly assigned after job completion. This should be checked when testing
the Tools popup after accepting the job.

### Growing-system migration

The authoritative growing state is now `growingPots`, `seedQuantities`,
`harvestQuantities` and `growingEvents` in `src/game/progress.ts`. The old
single-basil fields remain only as derived compatibility mirrors. Existing
saves migrate their starter pot, slot, crop timing, basil seeds and harvests;
legacy `basil-harvest` stock is renamed to `fresh-basil-leaves` without
awarding a duplicate item.

### Future Plants shop

The PLANTS building is present visually but remains shuttered. Fertiliser is
not purchasable there yet.

### Future districts

Future city districts are visible on the map but locked. There is no unlock
condition or travel system.

### Local-only progress

Progress is stored in browser localStorage. Clearing browser data or using a
different browser or device will not preserve the save.

## Verification status

Verified during the read-only audit:

- Source inspection of progression, movement, camera, controls, save schema and checkpoints.
- Current constants and economy calculations.
- Git branch, commit, remote and clean working tree.
- git diff --check.
- TypeScript/Vite production build using npm run build.
- Source-level checkpoint builders for fresh start, the opening loop,
  apartment/starter-kit stages, three ready pots, basil crop stages and
  second-pot mint stages.

The production build completed successfully. Vite emitted only the existing
large JavaScript chunk warning.

Not visually re-tested during this implementation:

- Real iPhone touch behaviour.
- Safari safe-area behaviour.
- Physical-device rotation.
- Browser screenshots.
- Camera appearance at actual phone dimensions.
- Audio playback on a physical device.
- End-to-end gameplay through every checkpoint.
- Real-device validation of buying both extra pots, selecting mint, and
  running three simultaneous crop timers.

## Running locally

~~~bash
npm install
npm run dev
~~~

The current Vite script binds to 127.0.0.1. For an iPhone on the same Wi-Fi,
start with a LAN host option:

~~~bash
npm run dev -- --host 0.0.0.0
~~~

Then use the Mac’s local IP address and the port printed by Vite in Safari.

