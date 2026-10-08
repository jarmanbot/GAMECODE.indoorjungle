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
- Tap or click the world: walk to that point.
- Mouse wheel, the −/+ buttons, or `,` / `.`: cycle Close, Normal, and Overview zoom (`.` zooms in, `,` zooms out).
- Use the contextual action button to collect and sell the pot.
- Open More → Restart Prototype to reset the session.

## Implemented

- Strict Atari-inspired black, white, and neutral-grey art.
- Shared neighbourhood geometry across Close, Normal, and Overview camera zooms.
- Starting order: BUY / SELL → HOMES → PLANTS → starter apartment.
- HOMES advertises the actual nearby starter apartment as `TO LET` plus future-home cards.
- PLANTS is shuttered and labelled `OPENING SOON`.
- Small narrow Alex robot with movement, readable camera follow, and walkable-ground limits.
- Responsive top/bottom HUD with coin balance, objective, settings, navigation panels, safe-area padding, and touch-sized controls.
- One playable task: collect one loose empty pot, sell it once at BUY / SELL for provisional 5 coins, and complete the task.
- Decorative cars, crossing, skyline, vacant lots, weeds, rubbish, construction, and future roads.

## Provisional decisions

- The pot sale value is temporary prototype tuning, fixed at 5 coins.
- World movement is intentionally lightweight and constrained to the front pavement, marked crossing, and opposite pavement; cars are decoration only.
- Art is code-drawn so the same world geometry can later receive Atari colour, 16-bit, or 32-bit renderers.

## Known limitations

- No persistence, accounts, backend, renting, plant growth, bills, or additional playable districts.
- Screenshots and device checks are browser viewport checks rather than physical-device testing.
