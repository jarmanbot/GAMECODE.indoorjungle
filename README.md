# Indoor Jungle prototype

A first playable visual prototype built directly in the workspace root with TypeScript, Vite, and Phaser 4.2.1. The original empty `indoor.jungle` file is preserved.

For the current progression, economy, controls, save schema, checkpoints and known limitations, see [PROJECT_STATUS_REPORT.md](./PROJECT_STATUS_REPORT.md).

## Run

```bash
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173/`.

## Netlify deployment

The production build is a static Vite site served from the root of its Netlify
domain. The repository-level `netlify.toml` supplies the required settings:

- Base directory: leave blank (repository root).
- Build command: `npm run build`.
- Publish directory: `dist`.
- Functions directory: none.
- Required environment variables: none.

To review the exact production output locally before connecting Netlify:

```bash
npm install
npm run build
npm run preview
```

Open the preview address printed by Vite, normally
`http://127.0.0.1:4173/`. The preview command serves the generated `dist`
directory; it is not the development server.

To connect the existing GitHub repository without publishing manually:

1. Push the reviewed commit to the branch you intend Netlify to deploy.
2. In Netlify, choose **Add new project → Import an existing project** and
   select GitHub and this repository.
3. Select the intended production branch. Keep the base directory blank.
4. Confirm the detected build command is `npm run build` and the publish
   directory is `dist`. These values are also enforced by `netlify.toml`.
5. Review the configuration, then start the first deploy when ready.

No SPA redirect is currently required because the game has one document at
the site root and does not use URL-based client routing. Keep ordinary releases
on the same Netlify site/domain: browser progress is stored under the unchanged
`indoor-jungle-progress-v1` localStorage key and therefore survives asset/code
updates on that origin. Browser saves do not automatically transfer between
`localhost`, a Netlify preview URL, and the production domain because each is a
different browser origin.

Production builds do not expose Developer tools or activate the separate test
save. Their source remains available for local `npm run dev` testing.

## Controls

- WASD or arrow keys: walk Alex on the front pavement and through the marked crossing.
- `E` near the BUY / SELL entrance or shop counter: select entry or open the panel.
- `Space` (or phone `A`): one visual hop. It does not move Alex’s ground position or bypass collisions.
- `Q` (or phone `B`): use the equipped tool. Cleaner uses six one-second sprays across two window sections; repair uses ten taps beside the visible ground pot.
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
- Opening loop: find and collect one Small Golden Pothos, then accept the opening window-cleaning job from the BUY / SELL counter. The Wanted tab pays the displayed 15-coin special-delivery reward; choosing an ordinary sale instead pays 5 coins and leaves the delivery request open.
- Pass 2 opening: normal mode now uses a start screen with Continue/New Game and a six-second, unskippable boot-out/drop from a separate upper doorway in the six-times-height old city tower. On landing it immediately flashes Close → Normal → Close, then starts the “I need a place to stay” objective. It is not a recurring eviction or rent system.
- Housing Pass 1: before renting, the main objective is “Find a place to live” with a tappable progress dropdown. Alex shows a three-second housing thought immediately after loading or restarting an unrented save, then repeats it every 30 seconds of active play; tapping Alex shows the current objective. Paying the 60-coin bond grants one persistent apartment key, shown in the Bag and migrated automatically for older rented saves.
- Starter apartment loop: claim the one-time starter pot, used medium, one basil seed, one mint seed, watering can and one Basic Fertiliser pellet; place up to three independent Small basic plastic pots in the starter home, choose an owned seed for each pot, water once, optionally fertilise, then collect the mature output. Each Basic Fertiliser pellet removes 30 seconds from the active growth timer; Buy/Sell stocks repeatable boxes of 10 pellets for 20 coins. Basil and mint are reusable-pot herbs: they grow in 30/60 seconds and harvest as leaves. Dwarf Marigold and Peace Lily are whole-plant crops: their seeds become available in the shop for 8/15 coins, grow in 90/150 seconds, and lift into the Bag with their basic pot before selling for 35/60 coins. The repaired special pot is not valid for either whole-plant crop. Replacement basic pots remain purchasable. The second rental expands the shared grow table to six positions.
- Pass 3 graphics upgrade: picking up the special pot after the tenth repair unlocks a saved, explicit installation prompt. The 2.3-second B&W-to-green-screen installation changes Alex's selectable appearance, colourises the Buy/Sell and plant/pot presentation, and marks the nursery under construction. The installation is checkpointed and does not alter the economy or crop state.
- Pass 4 Buy/Sell presentation: the interior exit mirrors the exterior entrance on the front/right wall, and successful buy/sell transactions commit state once before a short shopkeeper handover animation. Sold stock uses its actual Pothos, repaired-pot, or harvested-leaf appearance; purchases animate from shelves/supply positions to Alex. The shopkeeper remains upgraded independently of Alex's selected style.
- Pass 5 rental expansion: after genuine basil and mint harvest sales, the existing Real Estate listing can arrange a second two-room rental. The 60-coin starter bond transfers, the additional payment is 540 coins, the recorded bond becomes 600 coins, and placed pots/crops move without resetting their identities or timers. The second interior has six growing positions; the rental supplies space, not free pots.
- Opening job: collect the Small Golden Pothos first, accept the job at the counter, then tap each of the two REAL ESTATE AGENT windows and use the equipped cleaner three times per window. Completion rewards 4 coins, a reusable repair tool, and one starter glue charge.
- Repair job: collect the three broken-pot pieces after cleaning by selecting each piece and pressing B, choose Repair from Bag, then tap B ten times beside the visible ground pot to repair it. Explicitly sell the repaired pot for 75 coins.
- Housing search: the starter rental checklist now requires one repaired item and three genuinely found pots. The post-upgrade third find is a Rare Spotted Begonia at the far-right edge of the accessible neighbourhood; it is an ordinary 300-coin Buy/Sell purchase, not a special delivery, and its collected state prevents respawning.
- BUY / SELL shows the outstanding Golden Pothos request in its street window, followed by a one-unit basil request after the Atari Colour upgrade. The Golden Pothos special delivery pays 15 coins and the basil special delivery pays 9 coins; ordinary sales do not clear an outstanding request. Items Alex sells become persistent shop stock: the opening Small Golden Pothos, repaired pot, Rare Spotted Begonia, herb harvests and whole potted crops all retain their own type/condition and use the configured 1.4× buyback price. Three one-time premium plants are visible from the start and cost 250, 750 and 2,000 coins; purchases persist in the Bag. Matching products stack only within the same species/type, quality and condition. Basic growing pots cost 10 coins; replacements remain available when lifting a whole plant leaves an open grow-table capacity.
- Normal progress is stored in `indoor-jungle-progress-v1`. Development checkpoints use the separate `indoor-jungle-progress-dev-test-v1` namespace, plus development-only session metadata; no external service is involved.
- Decorative cars, crossing, skyline, vacant lots, weeds, rubbish, construction, and future roads.

## Provisional decisions

- The pot sale value is temporary prototype tuning, fixed at 5 coins.
- Pass 5 second-rental values are provisional: 600 coins total refundable bond, 60 coins transferred from the starter rental, and 540 coins additional payment. There is no recurring rent, bill, moving fee, or extra deposit yet.
- Basil harvest value (5 coins), mint harvest value (8 coins), and their seed price (2 coins) remain provisional. Dwarf Marigold seeds cost 8 coins, grow in 90 seconds, and the whole potted plant sells for 35 coins. Peace Lily seeds cost 15 coins, grow in 150 seconds, and the whole potted plant sells for 60 coins. Herbs leave their basic pot on the grow table; whole plants lift into the Bag with the basic pot and require a replacement pot after sale.
- Basic Fertiliser tuning is provisional: 20 coins buys one box of 10 pellets, and each pellet removes exactly 30 seconds from a crop that is already watered and growing.
- Window reward (4 coins) and repaired-pot sale value (75 coins) are provisional prototype tuning.
- World movement is intentionally lightweight and constrained to the front pavement, marked crossing, and opposite pavement; cars are decoration only.
- Art is code-drawn so the same world geometry can later receive Atari colour, 16-bit, or 32-bit renderers.
- Alex's future meaningful repair (component, cost, unlock conditions, and gameplay effect) remains deliberately unresolved. It is separate from the special-pot repair and graphics upgrade.

## Known limitations

- No accounts, backend, bills, or additional playable districts. The second rental is the only expanded home; future districts remain locked. Local progress can be cleared with Restart Prototype.
- This session can verify the TypeScript/Vite build and static interaction wiring, but not physical-device input or visual layout without browser/device tooling.
