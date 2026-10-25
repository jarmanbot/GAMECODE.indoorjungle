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
