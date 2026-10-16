# Indoor Jungle prototype

A first playable visual prototype built directly in the workspace root with TypeScript, Vite, and Phaser 4.2.1. The original empty `indoor.jungle` file is preserved.

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
- `Q` (or phone `B`): use the equipped tool. Cleaner is held; repair uses one press per step.
- Tap or click the world: walk to that point.
- Mouse wheel, the single IN/OUT zoom button, or `,` / `.`: switch between Normal and Close (`.` zooms in, `,` zooms out).
- Tap/click the loose pot or BUY / SELL entrance to walk there and interact on arrival.
- Inside BUY / SELL, tap the counter to open the shop panel and use the exit door to return outside.
- Open More → Restart Prototype to reset the session.

On portrait phones, the hybrid-control trial adds a fixed joystick below the world
viewport. Drag it to steer Alex; releasing it stops movement. The single IN/OUT
zoom toggle sits in the bottom navigation beside the Bag–More controls. Settings →
Controls can swap the joystick and A/B groups; the choice is stored locally.

## Implemented

- Strict Atari-inspired black, white, and neutral-grey art.
- Shared neighbourhood geometry across the Close and Normal camera views, plus a separate city map.
- Starting order: BUY / SELL → HOMES → PLANTS → starter apartment.
- HOMES advertises the actual nearby starter apartment as `TO LET` plus future-home cards.
- PLANTS is shuttered and labelled `OPENING SOON`.
- Small narrow Alex robot with movement, readable camera follow, and walkable-ground limits.
- Responsive top/bottom HUD with coin balance, objective, settings, navigation panels, safe-area padding, and touch-sized controls.
- Reversible portrait phone layout trial with an outside-the-world joystick, pointer capture, dead-zone handling, and shared tap/keyboard/zoom actions. Set `PHONE_HYBRID_CONTROLS` in `src/game/config.ts` to `false` to restore the previous phone layout.
- Opening loop: collect one loose empty pot, sell it once at BUY / SELL for 5 coins, then optionally accept the opening window-cleaning job from the same counter.
- Window job: hold the equipped cleaner while Alex is near and facing the BUY / SELL display. Completion rewards 3 coins, a reusable repair tool, and one starter glue charge.
- Repair job: collect the single broken pot after cleaning, choose Repair from Bag, press B for Align pieces / Join cracks / Finish repair, then explicitly sell the repaired pot for 10 coins.
- Progress is stored in the single `indoor-jungle-progress-v1` local-storage record. Missing or older records use the original opening state; no external service is involved.
- Decorative cars, crossing, skyline, vacant lots, weeds, rubbish, construction, and future roads.

## Provisional decisions

- The pot sale value is temporary prototype tuning, fixed at 5 coins.
- Window reward (3 coins) and repaired-pot sale value (10 coins) are provisional prototype tuning.
- World movement is intentionally lightweight and constrained to the front pavement, marked crossing, and opposite pavement; cars are decoration only.
- Art is code-drawn so the same world geometry can later receive Atari colour, 16-bit, or 32-bit renderers.

## Known limitations

- No accounts, backend, renting, plant growth, bills, or additional playable districts. Local progress can be cleared with Restart Prototype.
- This session can verify the TypeScript/Vite build and static interaction wiring, but not physical-device input or visual layout without browser/device tooling.
