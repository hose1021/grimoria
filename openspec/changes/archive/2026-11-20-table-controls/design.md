# Design

## Rules and scope

Rules check: compliant. Lunatic r3112 explicitly allows the same or a different
Demon mask and any three good bluff characters, including in-play characters.
Glossary r3168 and Imp r3116 describe the real Demon's three out-of-play good
bluffs at seven or more players. Rules Explanation r1310 and Glossary r3168
describe vote totals and one dead vote; Zombuul r3022 applies that vote token
to a registered-dead Zombuul. Flowergirl r2907 and Town Crier r3145 need actual
voter and nominator information, which totals cannot provide.

## Setup decisions

`setup.lunaticShownId` remains the effective mask. An optional
`lunaticShownExplicit` flag distinguishes the host's choice from the default.
New and reset bags follow the current Demon; an explicit mask survives later
role changes while legal. A legacy save with a mask but no flag preserves its
sticky choice. Missing metadata remains absent during historical command
replay, including roster resets: adding fields would change the canonical
state that seeds later random deals. Current UI edits stamp the inferred mode,
so an old empty setup adopts automatic following and an old existing mask is
preserved. Invalid masks still normalize to a legal default. Saved bags and
setup undo preserve both the mask and its mode.

Optional `setup.lunaticBluffs` holds a separate good-character list. Missing
legacy lists fall back to the existing Demon list. Present empty or partial
lists remain host-editable without adding a new deal prerequisite. The Demon
list keeps its existing eligibility and player-count rules; Lunatic choices
may include in-play good roles. Explicit shuffle clicks sample three distinct
eligible roles through injected command randomness, preserving deterministic
replay. No automatic false information is introduced by navigation.

## Voting decisions

`setVoteCount({playerId,count})` records a nonnegative integer no greater than
the roster size in optional `day.voteCounts`. These host-entered totals do
not invent a nomination, nominator or voter list and do not execute or consume
tokens. `setDeadVoteUsed({playerId,used})` updates the existing vote token only
for a dead or registered-dead player. Both commands require an active,
unended day and no winner, use dispatch, log, persist, replay and undo.

Presence of `day.voteCounts`, including an empty map after token-only
bookkeeping, marks incomplete external voting records. End-day copies that
presence to `lastDay`; the next day clears the current tallies. Flowergirl and
Town Crier require the existing host-answer flow when such records exist,
instead of treating the partial nomination ledger as complete. Tokens retain
their normal lifetime across days. No automatic execution follows a tally.

## Compatibility and privacy

All fields are optional additions within v4; old saves and bags remain valid,
and the storage key/version are unchanged. Validate present fields at the
external-state boundary. Test old absent fields, valid new round trips and
malformed values. The synthetic `legacy-lunatic-game.json` fixture was generated
using `daa9db4` and proves historical mask, deal, replay and undo compatibility.
Public and player projections remain explicit allowlists;
the Lunatic card uses only its shown Demon, selected false Minions and own
bluffs, and does not automatically identify the actual Demon.

## Validation

Write failing regressions before behavior changes. Assert command rejection
without mutation, preview/apply/replay equivalence, saved-bag restoration,
undo, daily reset, independent shuffle pools and manual override persistence.
Run the real setup and table routes at phone width and desktop, check reload
and privacy, retain Fortune Teller self-selection, and run repository checks.
