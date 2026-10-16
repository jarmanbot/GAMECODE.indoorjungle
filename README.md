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
- Tap or click the world: walk to that point.
- Mouse wheel, the −/+ buttons, or `,` / `.`: switch between Normal and Close (`.` zooms in, `,` zooms out).
- Tap/click the loose pot or BUY / SELL entrance to walk there and interact on arrival.
- Inside BUY / SELL, tap the counter to open the shop panel and use the exit door to return outside.
- Open More → Restart Prototype to reset the session.

## Implemented

- Strict Atari-inspired black, white, and neutral-grey art.
- Shared neighbourhood geometry across the Close and Normal camera views, plus a separate city map.
- Starting order: BUY / SELL → HOMES → PLANTS → starter apartment.
- HOMES advertises the actual nearby starter apartment as `TO LET` plus future-home cards.
- PLANTS is shuttered and labelled `OPENING SOON`.
- Small narrow Alex robot with movement, readable camera follow, and walkable-ground limits.
- Responsive top/bottom HUD with coin balance, objective, settings, navigation panels, safe-area padding, and touch-sized controls.
- One playable task: collect one loose empty pot, sell it once at BUY / SELL for provisional 5 coins, and complete the task. Collection and sale happen once, on arrival/explicit confirmation respectively.
- Decorative cars, crossing, skyline, vacant lots, weeds, rubbish, construction, and future roads.

## Provisional decisions

- The pot sale value is temporary prototype tuning, fixed at 5 coins.
- World movement is intentionally lightweight and constrained to the front pavement, marked crossing, and opposite pavement; cars are decoration only.
- Art is code-drawn so the same world geometry can later receive Atari colour, 16-bit, or 32-bit renderers.

## Known limitations

- No persistence, accounts, backend, renting, plant growth, bills, or additional playable districts.
- This session can verify the TypeScript/Vite build and static interaction wiring, but not physical-device input or visual layout without browser/device tooling.
