# Indoor Jungle development instructions

When a new progression milestone is implemented, add or update its developer
checkpoint in `src/game/devCheckpoints.ts` and verify the next intended player
action from that checkpoint. When mechanics or save fields change, update all
affected earlier checkpoints and recheck their generated state.

Developer checkpoints must remain development-only, use the validated
`ProgressState` schema, and never overwrite the normal player save.

Shop stock is part of progression state. When item, condition, identity, or
transaction fields change, update affected checkpoints and verify both the
normal-save migration and the buyback path.

The first graphics upgrade is separate from Alex's selected appearance. Keep
its prompt, installation, acknowledgement, save migration, and developer
checkpoints in sync when graphics or repair milestones change.

## Authoritative opening graphics progression

The POVO room key and rental handover **must never** trigger, queue, restore,
or imply an Atari Colour graphics upgrade. They grant access and the Welcome
Gift only.

The one-time Common Parlour Palm is the sole approved trigger for the opening
Atari Colour module: after the player's first genuine Basil or Mint harvest
sale, it appears at the original Small Golden Pothos location. Collecting the
Palm starts the colour-module prompt and, once acknowledged, advances
Buy/Sell, Real Estate and POVO to Atari Colour. Selling, placing, buying back,
reloading, save migration, or developer checkpoints must not duplicate the
Palm, its module trigger, or its 250-coin sale.

When editing graphics progression, preserve this separation and update the
Common Parlour Palm developer checkpoints and regression checks. Do not
reintroduce a key-based colour trigger as a fallback for older saves.
