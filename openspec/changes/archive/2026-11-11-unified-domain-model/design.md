# Design

## Context

`src/core/model/state.ts` is schema v4 for one saved game; `js/model.js` is a
re-export shim that keeps the legacy `.mjs` suites unchanged. The model is the
single source of truth for the engine: `src/core/engine/*` reads it, never the
other way round. Saves are an external boundary, so `validateState` (direct
saves and imports) and `migrateV2` / `migrateV3` (legacy saves) are the only
doors into the engine.

The model already carries quietly overlapping notions: `player.team` is stored
for swapped roles but derivable from `roleId`; `registeredDead` is a stored
flag while `publicGameView` re-derives the announced deaths; poison and drunk
are effects, but a player's ability health is not a field. Without a map, the
next role can add `healthy` or `winCandidates` and create a second truth.

## Goals / Non-Goals

**Goals:**

- One row per issue notion: the field that owns it, or the function that
  derives it and why it must not be stored.
- A save validator that refuses an effect the engine cannot place in time.
- Old saves keep loading; no role, mechanic or UI change.

**Non-Goals:**

- No new state field, no schema bump, no migration code: the audit found no
  missing field, and the tasks gate says a field is added only after a RED test
  proves it absent.
- No change to command payloads, exports, projections or the engine.

## Audit: notion -> storage

`stored` means the fact is written once and read by the engine. `derived` means
the fact is computed from stored fields and must never be mirrored, because two
copies drift after a correction, resurrection or new effect.

| Notion | Storage | Field or derivation | Test |
|---|---|---|---|
| Player | stored | `players` keyed by stable ID; `order` is the seat contract and identity is never an array position | `js/commands.test.mjs` |
| Character | stored | `player.roleId` is the real character, `player.shownRoleId` is the card the player saw; `effectiveRoleId()` returns the shown role for a Drunk | `js/engine.test.mjs` |
| Team | stored when changed, else derived | `player.team` records an explicit alignment change (Fang Gu jump, Imp heir, manual role correction); otherwise `realTeamOf()` derives it from `roleId` through `roleTeam()` | `js/snv.test.mjs` |
| Life and death | stored | `player.alive` and `player.deadAt` hold the current state; `deaths[]` is the immutable history and `day.morning[]` the announced night deaths | `js/engine.test.mjs` |
| Registered death | stored | `player.registeredDead` marks a Zombuul who registers dead while alive; views derive the announced list from it | `js/bmr.test.mjs` |
| Drunk mask | stored | `player.shownRoleId` plus `setup.drunkShownId`; the real role stays `roleId: "drunk"` and the effective role is derived | `js/engine.test.mjs` |
| Lunatic mask | stored | `player.shownRoleId` plus `setup.lunaticShownId`; the false Demon and false Minions are never written to `team` | `js/engine.test.mjs` |
| Ability health | derived, not stored | `effectGraph(state)` returns `activePoison`, `activeDrunk` and `impaired`; `isImpaired()`, `effectActive()` and `protectionFor()` are the readers. A per-player `healthy` flag would duplicate the graph and survive the effect that caused it | `js/engine.test.mjs`, `js/bmr.test.mjs` |
| Drunk/poison with source and interval | stored | `state.effects[]` with `kind: "poison" \| "drunk"`, `sourceId`, `targetId`, `start`, `expires` (absent or `null` = open-ended), `active`; the graph resolves a living, unimpaired source | `src/core/model/state.test.ts`, `js/engine.test.mjs` |
| Protections and immunities | stored effects, derived role immunities | Ongoing protections are effects (`protected`, `devilsadvocate`, `butler`, `witch`); unconditional role immunities (Soldier, Fool, Sailor, Zombuul first death, Tea Lady neighbours) are derived in `bmrCannotDie()` from the role and impairment | `js/bmr.test.mjs` |
| Temporary effects | stored | `start` is required; `expires` is a cycle marker or absent/`null`, where absent or `null` means until the game ends, not "unknown". A pending effect also carries `resolve` | `src/core/model/state.test.ts` |
| Reminders | stored | `player.reminders` is a free string list owned by the host; the engine never rewrites it | `js/engine.test.mjs` |
| Used abilities | stored | `player.used` records one-shot spends (`slayer`, `virgin`, `fool`, `professor`, per-role targets); it is the once-per-game ledger | `js/engine.test.mjs` |
| Storyteller choices | stored where the decision lives | `setup.info` holds the first-night pairs; `night.queue[].given` holds shown information; `day.nominations[].votes` and `day.execution` hold the day decision; `winner` the result; `corrections[]` the manual overrides. No generic choice list, because a choice's payload differs by step | `js/engine.test.mjs`, `js/commands.test.mjs` |
| Day and night | stored | `phase`, `night.number`, `day.number`, `day.open`, `day.ended`, `night.demonChanged` | `js/engine.test.mjs` |
| Step order | stored | `night.queue[]` fixes the order, `night.currentIndex` the cursor and `step.done` the completion; the queue is rebuilt per night, never re-sorted by the UI | `js/engine.test.mjs`, `js/bmr.test.mjs` |
| Win candidates | stored result, derived candidates | `winner` stores the decided outcome; `checkWin()` derives who wins from the living roster, teams and active effects, so candidates are never persisted | `js/engine.test.mjs`, `js/bmr.test.mjs` |

## Decisions

**No schema bump.** A RED test could not prove any listed notion missing: each
one already maps to a stored field or an explicit derivation above. Adding
`healthy`, `winCandidates` or a generic `choices` list would introduce a second
source of truth, so the audit is the deliverable and the schema stays v4.

**Effect interval is required and shaped.** `validateState` now requires
`start` to be a cycle marker (`phase` from the phase list plus an integer
`number`) and, when present, `expires` to have the same shape. `expires: null`
and an absent `expires` stay valid: open-ended effects are real (No Dashii,
Sweetheart, Pukka poison). The check reuses one phase list for `phase` and the
marker, so the two cannot drift. This is the smallest change that makes the
"source, target, interval" rule enforceable.

**Source and target stayed required.** The previous validator already
rejected an effect whose `sourceId` or `targetId` was not an existing player.
The change only splits the single `"Invalid effect."` message into nameable
per-field messages so a failing import says which part is missing; no test
asserted the old text.

**Migration stays a no-op.** Effects have carried `start` since the initial
commit (`git log -S "start: at"`), and `migrateV2` creates none, so every save
the engine ever wrote passes the new rule. A regression test migrates a v3 save
that contains an effect and asserts `validateState` accepts the result; no
filling of invented timestamps is needed.

**Alternative rejected:** normalizing a missing `start` to the current night
in `migrateV3`. Inventing a cycle changes when an effect becomes active, which
is exactly the timing rule the validator exists to protect.

## Risks / Trade-offs

- **Hand-edited saves.** A v4 save whose effect lacks `start` now fails to
  load instead of being silently active from the beginning. That is the
  intended tightening; the corrupt-save backup path keeps the raw value.
- **Effect producers.** A new role must set `start` (and `expires` when it is
  temporary). The engine suites exercise every existing producer, so a missed
  `start` fails the typecheck and a missed `expires` fails a test, rather than
  a live game.
- **Table drift.** The audit table is only useful while it is maintained; the
  requirement in the delta spec names this file as the place to update.
