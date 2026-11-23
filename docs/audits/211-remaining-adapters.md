# #211 remaining capability adapters

Updated 2026-11-23. This is the explicit exception list required by issue #211
and the verified-jinx change. The ten legacy night-step declarations were moved
onto `night-step` capabilities in #477. The entries below are the remaining pure
`engine branch` roles in `docs/role-ownership.md`.

This pass re-read every pinned Summary and How-to-Run text, traced the engine
path named by the ledger, and classified each branch. **No code is migrated in
this stabilization pass.** Ten branches are shared mechanics that a role
capability must not duplicate. Two are genuine role-specific day actions,
Artist and Savant; each needs a decision shape the current capability contract
does not have. The Mutant is a shared adjudication slice with the Cerenovus,
not a Mutant-owned capability. They are queued with the exact prerequisite
below.

| Role | Pinned source | Engine path | Classification | Verdict |
| --- | --- | --- | --- | --- |
| Artist | [r3156](https://wiki.bloodontheclocktower.com/index.php?title=Artist&oldid=3156): "Once per game, during the day, privately ask the Storyteller any yes/no question." | `day.ts` (`artistQuestion`, `dayAbilityHolder`) | Host-choice day action | **Role-specific; queued.** The free-text question and the host answer need a `day-action` input and rejection shape. |
| Drunk | [r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165): "You do not know you are the Drunk. You think you are a Townsfolk character, but you are not." | model/setup/information/day effects | Shared identity mechanic | Keep. The mask is read by every information and step path; the Drunk has no ability to own. |
| Fool | [r2636](https://wiki.bloodontheclocktower.com/index.php?title=Fool&oldid=2636): "The 1st time you die, you don't." | `effects.ts`, `death.ts`, `bmr.ts` | Shared death protection | Keep. The first-death replacement is applied by the shared death path for any edition. |
| Goon | [r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977): "Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment." | `effects.ts`, `bmr.ts`, `sv.ts` | Shared passive trigger | Keep. The trigger reacts to any player's choice, not to a Goon step, and uses the shared effect and step writer. |
| Mastermind | [r2993](https://wiki.bloodontheclocktower.com/index.php?title=Mastermind&oldid=2993): "If the Demon dies by execution (ending the game), play for 1 more day. If a player is then executed, their team loses." | `death.ts`, `day.ts` | Shared succession/win state | Keep. The extra day is a multi-day state armed at a Demon execution and read at day end. |
| Mayor | [r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995): "If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead." | `effects.ts`, `death.ts`, `night.ts` | Shared redirect/passive win | Keep. The redirect is part of the shared attack path; the three-player win is the shared end-day rule. |
| Minstrel | [r2600](https://wiki.bloodontheclocktower.com/index.php?title=Minstrel&oldid=2600): "When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow." | `day.ts` | Shared execution consequence | Keep. The all-drunk effect follows any Minion execution and is applied by the day path. |
| Mutant | [r1755](https://wiki.bloodontheclocktower.com/index.php?title=Mutant&oldid=1755): "If you are 'mad' about being an Outsider, you might be executed." | `sv.ts`, `day.ts` | Shared madness adjudication | Keep for now. The review is shared with the Cerenovus; `AdjudicationCase` has only `registration`. A `madness` case is a shared slice, not Mutant-owned. |
| Savant | [r2910](https://wiki.bloodontheclocktower.com/index.php?title=Savant&oldid=2910): "Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false." | `day.ts` (`savantVisit`, `savantTruthChoices`) | Host-choice day answer | **Role-specific; queued.** The free-text statements and the truth choice need the same `day-action` input shape, and the UI reads `savantTruthChoices` through a query. |
| Scarlet Woman | [r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117): "If there are 5 or more players alive & the Demon dies, you become the Demon." | `becoming.ts` | Shared succession | Keep. The inheritance is the Demon death trigger's fallback; the living-Demon guard is part of it. |
| Soldier | [r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121): "You are safe from the Demon." | `effects.ts` | Shared protection | Keep. The protection is read by the shared death and No Dashii paths. |
| Tea Lady | [r1777](https://wiki.bloodontheclocktower.com/index.php?title=Tea_Lady&oldid=1777): "If both your alive neighbors are good, they can't die." | `effects.ts` | Shared protection | Keep. The neighbour protection is read by the shared death path. |
| Virgin | [r1729](https://wiki.bloodontheclocktower.com/index.php?title=Virgin&oldid=1729): "The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately." | `day.ts` | Shared first-nomination trigger | Keep. The trigger is part of the nomination path and the shared win check. |

## Why the shared ten stay

Moving any of the shared ten into a role would duplicate protection, death,
execution, succession, passive-trigger or win logic. That breaks the one-writer
invariant and the shared effect graph. The role owns what the rule says it owns;
these rules say the *shared path* reacts to another player's action.

## The two queued role-specific slices

`Artist` and `Savant` are not shared: the rule is a host exchange owned by that
role. The current `day-action` context carries only target and registration
facts, and `DayDecision` has no rejection arm. A faithful migration needs:

1. free-text input on `DayContext` (the Artist question, the Savant statements);
2. a rejection decision so the role can own the empty-input and allowed-answer
   checks without a second validator;
3. a query for `savantTruthChoices`, because the table UI reads the legal truth
   choices before the command.

The `Mutant` is a third candidate, but its madness review is the same review as
the Cerenovus's. A `madness` adjudication case is a shared slice, not a
Mutant-owned capability. It must move with the Cerenovus, not alone.

## Capability + engine reference roles

Roles that already declare a capability but still have a named engine reference
are not exceptions to ownership: the reference is the shared mechanic they
use (setup, information facts, death, win, correction or the step writer). The
generated ledger keeps each count visible and the architecture test keeps the
role import edge closed.

## Verification

`node scripts/role-ownership.ts --check` passes on the branch. The ledger is
unchanged by this pass: 5 typed-capability-only, 53 typed capability with an
engine reference, 13 engine branch, 1 declarative shared mechanic, 0 missing
module, 72 total. This document is the audit evidence; no role behavior, test
expectation or ledger classification was changed.

## Next slice

Open the `day-action` input/rejection shape as its own reviewed change, migrate
`Artist` first, then `Savant` with the UI query, then move the shared madness
review with the Cerenovus. Until then the three remain documented exceptions,
not silent fallbacks.
