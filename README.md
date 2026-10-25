# Indoor Jungle prototype

A first playable visual prototype built directly in the workspace root with TypeScript, Vite, and Phaser 4.2.1. The original empty `indoor.jungle` file is preserved.

For the current progression, economy, controls, save schema, checkpoints and known limitations, see [PROJECT_STATUS_REPORT.md](./PROJECT_STATUS_REPORT.md).

## Run

```bash
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173/`.

## Controls

- WASD or arrow keys: walk Alex on the front pavement and through the marked crossing.
- `E` near the BUY / SELL entrance or shop counter: select entry or open the panel.
- `Space` (or phone `A`): one visual hop. It does not move Alex’s ground position or bypass collisions.
- `Q` (or phone `B`): use the equipped tool. Cleaner uses nine one-second sprays across three window sections; repair uses ten taps beside the visible ground pot.
- Tap or click the world: walk to that point.
- Mouse wheel, the single IN/OUT zoom button, or `,` / `.`: switch between Normal and Close (`.` zooms in, `,` zooms out).
- Tap/click the Small Golden Pothos or BUY / SELL entrance to walk there and interact on arrival. Alex shows front, back, left and right poses; window cleaning requires the back-facing pose toward the REAL ESTATE AGENT display. After the window job, tap a broken-pot piece and press B to pick up each piece.
- Inside BUY / SELL, tap the counter to open the shop panel and use the exit door to return outside.
- Open More → Restart Prototype to reset the session.
- Settings → Music and Sound effects toggles control the procedural arcade soundtrack and jump/tool-use sounds. Preferences are stored locally.

On portrait phones, the hybrid-control trial adds a fixed joystick below the world
viewport. Drag it to steer Alex; releasing it stops movement. The single IN/OUT
zoom toggle sits in the bottom navigation beside the Bag–More controls. Settings →
Controls can swap the joystick and A/B groups; the choice is stored locally.

In development builds, Settings also includes Developer tools. Checkpoints and
test actions use a separate `indoor-jungle-progress-dev-test-v1` save namespace;
use Return to normal save before checking the regular player save.

## Implemented

- Strict Atari-inspired black, white, and neutral-grey art.
- Shared neighbourhood geometry across the Close and Normal camera views, plus a separate city map.
- Starting order: starter apartment → BUY / SELL → REAL ESTATE AGENT → nursery vacant lot.
- The starter apartment advertises `TO LET` and `60 COINS` until rented, then changes to `YOUR HOME`.
- The REAL ESTATE AGENT advertises the actual nearby starter apartment plus future-home cards.
- The nursery is a non-interactive vacant lot labelled `NURSERY COMING SOON`.
- Small narrow Alex robot with movement, readable camera follow, and walkable-ground limits.
- Responsive top/bottom HUD with coin balance, objective, settings, navigation panels, safe-area padding, and touch-sized controls.
- Dependency-free procedural arcade music plus jump and tool-use sound effects, unlocked on the first user interaction for browser autoplay compatibility.
- Reversible portrait phone layout trial with an outside-the-world joystick, pointer capture, dead-zone handling, and shared tap/keyboard/zoom actions. Set `PHONE_HYBRID_CONTROLS` in `src/game/config.ts` to `false` to restore the previous phone layout.
- Opening loop: find and collect one Small Golden Pothos, then accept the opening window-cleaning job from the BUY / SELL counter. Selling the first delivery remains available for 5 coins but is no longer the next required objective.
- Pass 2 opening: normal mode now uses a start screen with Continue/New Game and a six-second, unskippable boot-out/drop from a separate upper doorway in the six-times-height old city tower. On landing it immediately flashes Close → Normal → Close, then starts the “I need a place to stay” objective. It is not a recurring eviction or rent system.
- Housing Pass 1: before renting, the main objective is “Find a place to live” with a tappable progress dropdown. Alex shows a three-second housing thought immediately after loading or restarting an unrented save, then repeats it every 30 seconds of active play; tapping Alex shows the current objective. Paying the 60-coin bond grants one persistent apartment key, shown in the Bag and migrated automatically for older rented saves.
- Starter apartment loop: claim the one-time starter pot, used medium, one basil seed, one mint seed, watering can and fertiliser; place up to three independent Small basic plastic pots, choose basil or mint for each pot, water once, wait 30 seconds for basil or 60 seconds for mint, optionally fertilise to mature instantly, harvest, sell fresh basil leaves for 5 coins or fresh mint leaves for 8 coins, and buy further seeds for 2 coins. Each pot retains its own crop, slot and growth timing, and its usable medium remains after harvest.
- Pass 3 graphics upgrade: completing the tenth special-pot repair unlocks a saved, explicit installation prompt. The 2.3-second B&W-to-green-screen installation changes Alex's selectable appearance, colourises the Buy/Sell and plant/pot presentation, and marks the nursery under construction. The installation is checkpointed and does not alter the economy or crop state.
- Opening job: collect the Small Golden Pothos first, accept the job at the counter, then tap the REAL ESTATE AGENT window and use the equipped cleaner nine times across three sections. Completion rewards 9 coins, a reusable repair tool, and one starter glue charge.
- Repair job: collect the three broken-pot pieces after cleaning by selecting each piece and pressing B, choose Repair from Bag, then tap B ten times beside the visible ground pot to repair it. Explicitly sell the repaired pot for 75 coins.
- BUY / SELL shows the outstanding Golden Pothos request in its street window. Items Alex sells become persistent shop stock: the opening Small Golden Pothos can be bought back for 7 coins, repaired pots for 105 coins, fresh basil leaves for 7 coins each, and fresh mint leaves for 12 coins each (the configured 1.4× buyback price). Matching harvest stacks remain species-specific; basil seeds, mint seeds, living crops and fresh leaves remain distinct. The two additional growing pots cost 10 coins each and are one-time stock.
- Normal progress is stored in `indoor-jungle-progress-v1`. Development checkpoints use the separate `indoor-jungle-progress-dev-test-v1` namespace, plus development-only session metadata; no external service is involved.
- Decorative cars, crossing, skyline, vacant lots, weeds, rubbish, construction, and future roads.

## Provisional decisions

- The pot sale value is temporary prototype tuning, fixed at 5 coins.
- Basil harvest value (5 coins), mint harvest value (8 coins), seed price (2 coins), and the species-specific growth durations (30 seconds for basil, 60 seconds for mint) are provisional prototype tuning.
- Window reward (9 coins) and repaired-pot sale value (75 coins) are provisional prototype tuning.
- World movement is intentionally lightweight and constrained to the front pavement, marked crossing, and opposite pavement; cars are decoration only.
- Art is code-drawn so the same world geometry can later receive Atari colour, 16-bit, or 32-bit renderers.

## Known limitations

- No accounts, backend, bills, or additional playable districts. Local progress can be cleared with Restart Prototype.
- This session can verify the TypeScript/Vite build and static interaction wiring, but not physical-device input or visual layout without browser/device tooling.
