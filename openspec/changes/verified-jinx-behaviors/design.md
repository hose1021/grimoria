# Design

## One ledger per fact

Each jinx uses an existing record:

| Pair | Record | Decision owner |
| --- | --- | --- |
| Chambermaid + Mathematician | `state.night.queue` steps | `roles/chambermaid` information capability reads `wokeTonight` |
| Drunk + Mathematician | `state.abnormal` | `recordJinxAbnormalities` writes the mark at a completed Drunk step |
| Fang Gu + Scarlet Woman | `state.deaths`, `state.fangguJumped` | Demon death trigger refuses inheritance while another living Demon exists |
| Goon + Pit-Hag | `player.used.goonFromEvil` | `replaceCharacter(cause: "pithag")` writes it; the Goon trigger reads it |
| Lunatic + Mathematician | step `targetIds`/`result`, `state.abnormal` | `recordJinxAbnormalities` compares the completed Lunatic and acting Demon steps |
| Mastermind + Vigormortis | death record `demon`/`ability`, `state.mastermind` | `mastermindRetainsAbility` arms the extra day |
| Recluse + Sage | Sage step `given` pair, `step.registrations` | the engine writes the implied registration after the pair answer |

The ABNORMAL ledger is already the Mathematician's one ledger. The new writes
are deterministic from completed steps and are persisted, so a journal replay
writes the same state. No new command, event or store is added.

## Pinned behavior

- The Mathematician counts **characters** with ABNORMAL reminders, not events.
- The Chambermaid counts characters who woke to use an ability; the whole
  night is considered, including a later Mathematician.
- The Drunk's false information or failed ability is the jinx authorization to
  add the mark; the Storyteller's information choice remains the existing host
  answer.
- The Lunatic acts before the Demon and the Mathematician acts last, so the
  comparison is resolved before the count is read.
- The Fang Gu possession creates one new Demon and dies; the Scarlet Woman
  remains a Minion. The same guard covers a Pit-Hag-created second Demon.
- The Mastermind's retention is the pinned exception to the Vigormortis's
  normal "while the Vigormortis lives" rule.
- The Recluse may register as the Demon to the Sage; choosing a pair naming the
  Recluse is the registration, and the engine records it as the existing secret
  registration choice.

## UI and replay

No new control is added. The Sage pair list gains the Recluse options; the
Mathematician count reflects the automatic marks; the Goon log line explains the
alignment. The registration and pair choices are journaled and replay from the
same stored records.

## #211

Legacy night-step declarations are moved onto `night-step` capabilities. The
remaining edition-specific completion branches are role-specific or shared
mechanics and are documented with a reason and a follow-up slice in
`docs/audits/211-remaining-adapters.md`.

## Verification

`src/core/engine/jinxes.test.ts` has one test per behavior plus negative edge
cases; the RED run on `origin/dev` fails 10/11 (the Fang Gu possession already
left the Scarlet Woman a Minion, which the new test preserves). All full
repository checks run on the integration head.
