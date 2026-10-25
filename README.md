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
- `Q` (or phone `B`): use the equipped tool. Cleaner uses eight one-second sprays; repair uses ten taps beside the visible ground pot.
- Tap or click the world: walk to that point.
- Mouse wheel, the single IN/OUT zoom button, or `,` / `.`: switch between Normal and Close (`.` zooms in, `,` zooms out).
- Tap/click the Small Golden Pothos or BUY / SELL entrance to walk there and interact on arrival. Alex shows front, back, left and right poses; window cleaning requires the back-facing pose toward the HOMES display. After the window job, tap a broken-pot piece and press B to pick up each piece.
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
- Starting order: BUY / SELL → HOMES → PLANTS → starter apartment.
- HOMES advertises the actual nearby starter apartment as `TO LET` plus future-home cards.
- PLANTS is shuttered and labelled `OPENING SOON`.
- Small narrow Alex robot with movement, readable camera follow, and walkable-ground limits.
- Responsive top/bottom HUD with coin balance, objective, settings, navigation panels, safe-area padding, and touch-sized controls.
- Dependency-free procedural arcade music plus jump and tool-use sound effects, unlocked on the first user interaction for browser autoplay compatibility.
- Reversible portrait phone layout trial with an outside-the-world joystick, pointer capture, dead-zone handling, and shared tap/keyboard/zoom actions. Set `PHONE_HYBRID_CONTROLS` in `src/game/config.ts` to `false` to restore the previous phone layout.
- Opening loop: find and collect one Small Golden Pothos, then accept the opening window-cleaning job from the BUY / SELL counter. Selling the first delivery remains available for 5 coins but is no longer the next required objective.
- Starter apartment loop: claim the one-time starter pot, used medium, one basil seed, one mint seed, watering can and fertiliser; place up to three independent Small basic plastic pots, choose basil or mint for each pot, water once, wait 60 seconds, optionally fertilise to mature instantly, harvest, sell fresh leaves for 5 coins, and buy further seeds for 2 coins. Each pot retains its own crop, slot and growth timing, and its usable medium remains after harvest.
- Opening job: collect the Small Golden Pothos first, accept the job at the counter, then tap the HOMES estate-agent window and tap the equipped cleaner eight times. Completion rewards 3 coins, a reusable repair tool, and one starter glue charge.
- Repair job: collect the three broken-pot pieces after cleaning by selecting each piece and pressing B, choose Repair from Bag, then tap B ten times beside the visible ground pot to repair it. Explicitly sell the repaired pot for 75 coins.
- BUY / SELL shows the outstanding Golden Pothos request in its street window. Items Alex sells become persistent shop stock: the opening Small Golden Pothos can be bought back for 7 coins, repaired pots for 105 coins, and fresh basil or mint leaves for 7 coins each. Matching harvest stacks remain species-specific; basil seeds, mint seeds, living crops and fresh leaves remain distinct. The two additional growing pots cost 10 coins each and are one-time stock.
- Normal progress is stored in `indoor-jungle-progress-v1`. Development checkpoints use the separate `indoor-jungle-progress-dev-test-v1` namespace, plus development-only session metadata; no external service is involved.
- Decorative cars, crossing, skyline, vacant lots, weeds, rubbish, construction, and future roads.

## Provisional decisions

- The pot sale value is temporary prototype tuning, fixed at 5 coins.
- Basil harvest value (5 coins), seed price (2 coins), and the 60-second growth duration are provisional prototype tuning.
- Window reward (3 coins) and repaired-pot sale value (75 coins) are provisional prototype tuning.
- World movement is intentionally lightweight and constrained to the front pavement, marked crossing, and opposite pavement; cars are decoration only.
- Art is code-drawn so the same world geometry can later receive Atari colour, 16-bit, or 32-bit renderers.

## Known limitations

- No accounts, backend, bills, or additional playable districts. Local progress can be cleared with Restart Prototype.
- This session can verify the TypeScript/Vite build and static interaction wiring, but not physical-device input or visual layout without browser/device tooling.
