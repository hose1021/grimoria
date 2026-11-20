# Design

## One source

`secretsErrors` already decides whether the first night may start. The tick
must not have a second, weaker rule. `obligationDone` maps a checklist id to the
error codes the engine emits for it (`herring`, `herring-team`, `info-<id>`,
`info-*-<id>` and the Librarian's `librarian-zero`). No matching code means the
row is done; any matching code means it is not.

## Pair-derived options

`infoRoleChoices` previously accepted `registering: boolean`. The caller
computed it from the whole roster, which is exactly the bug: a Spy elsewhere in
the game made an absent role selectable, but the engine checks the pair. The
options now take `pairRoles`, the roles of the two currently chosen players, and
add the not-in-play characters only when a Spy (Townsfolk and Outsider answers)
or a Recluse (Minion answers) is in that pair.

## Consequences

Selecting an absent role first and the Spy second keeps the answer legal;
changing the pair afterwards can make it illegal, and the engine's error then
clears the tick. The host sees the same rejection reason the start gate shows.
