# Design

## Context

Sects and Violets madness is the last unmodelled S&V mechanic named by issue #40.
The Cerenovus already has a night step (`completeSvStep` with `targetMode:
"one-any"` and `roleChoices`), and its note tells the host to enforce madness at
the table. The Mutant is a passive Outsider with no step and an `unsupported`
matrix row. Nothing in the state says who must be mad, about what, or until
when, so the Storyteller decision to execute "or not" cannot be recorded.

The engine already models time-bounded state as `Effect` records: `kind`,
`sourceId`, `targetId`, `start`, `expires`, `active`, plus free-form fields.
`effectActive` compares `start`/`expires` by phase cycle, and `validateState`
requires those fields on every effect. `src/core/engine/sv.ts` owns the S&V
queue, the conditional steps, No Dashii poison reconciliation, and the night
step completion for S&V roles.

Constraints:

- `src/core/engine/` is DOM-free and storage-free; state changes go through the
  command registry and a draft.
- A Storyteller decision is never automated: offer legal options and a reason.
- `publicGameView` and the player handoff stay closed; effects are host data.
- The save schema stays v4. `effects` is already validated and exported.

## Goals / Non-Goals

**Goals:**

- A stored madness token with a source, a target and an expiry, ended by its
  expiry or by an explicit removal.
- One command that applies either legal penalty, records and explains it.
- Cerenovus and Mutant coverage with asserting tests.
- Prove that no madness data reaches the public or player projection.

**Non-Goals:**

- Model the player's table talk or verify whether a player *was* mad. The host
  observes that; the engine only stores the requirement and the decision.
- New madness for other scripts, a Madness screen, or a public reminder.
- A schema change or a new state field: effects already carry the shape.

## Decisions

### 1. Madness is an effect, not a new state field

The token is `{ kind: "madness", madness: "cerenovus" | "mutant", roleId,
sourceId, targetId, start, expires, active }`. Reusing `Effect` means the save
format, `validateState`, `checkInvariants`, export/import, the effect diff and
the existing `manualCorrection` `effect` kind all work without changes.
Rejected alternative: a `state.madness` array, which would need its own
validation, migration, projection review and event diff.

### 2. The Cerenovus token lasts from its night to the next night

`completeSvStep` creates one token per night and target with id
`eff-madness-cerenovus-<source>-<target>-<night>` and expiry
`{ phase: "night", number: night + 1 }`, the same cycle boundary the Witch curse
uses. The next night's choice therefore produces a fresh token while the old one
is already expired. The effect is created only when the host supplies a target
and a good character from the script; without the choice the step keeps its note
and no requirement is invented.

A Cerenovus token survives its source: the choice was made at night and the
player is mad during that day even if the Cerenovus is executed that day.
`effectActive` returns `true` for a `cerenovus` madness before the source-alive
check, mirroring the existing `role-change` bypass. An impaired Cerenovus never
creates the token because `completeSvStep` checks `isImpaired` first.

### 3. The Mutant requirement is reconciled from its character holder

The Mutant has no night step and can enter or leave play through a Pit-Hag
change, so the token is derived state, not a one-off write. `reconcileNoDashiiPoison`
already runs after every S&V role change, death and night build; it now also
calls `reconcileMutantMadness`, which:

- creates `eff-madness-mutant-<player>` for each living `mutant` with
  `expires: null` and `roleId: null` (the requirement is "an Outsider");
- sets `active` to whether the stored target is still a living `mutant`.

`expires: null` is deliberate: the requirement has no calendar end; death, a
character change or an explicit removal ends it. `effectActive` already treats a
dead or impaired source as inactive, which is the Mutant's own condition.

### 4. One command, two legal penalties, one recorded reason

`madnessPenalty { playerId, penalty, reason }`:

- rejects when the player has no active madness, when the day is over, or when a
  decision was already recorded for that token on that day;
- returns `requires-storyteller-choice` with `options: ["execute", "none"]` for
  any other penalty value, so a caller is shown the legal set instead of a
  silent failure;
- requires a non-empty `reason`, which is stored on the token
  (`decidedDay`, `decidedPenalty`, `decidedReason`) and in the secret log;
- `execute` runs the normal day execution through `executeByDecision` with
  `cause: "madness"`, so the day's execution, the death, the win check and the
  execution ledger stay in one path. `none` only records the decision.

The token is not deactivated by a decision: the requirement is still true for
that day and the next one, and the per-day guard stops a second decision.

### 5. Projections stay closed

`publicGameView` is unchanged and `publicRoleView` never reads effects; the
player handoff projects only `seat`, `name`, `claimed` and `shownRoleId`. The
test asserts that a state with an active madness serializes without the token,
the source role, the required character or the target, and that the public role
view keeps its exact key set.

## Risks / Trade-offs

- **Per-day decision guard** → The host decides once per token per day. A
  deliberate second decision needs the next day or a new token; this is
  intentional to keep one recorded reason per observed failure.
- **Mutant token exists during the night** → It is only actionable in the day
  because the penalty command rejects outside the day. The extra token in the
  state is harmless and mirrors the printed standing condition.
- **No table-talk verification** → The engine cannot know whether a player was
  mad. The matrix rows stay `host-choice`: the host observes and records.

## Migration Plan

No schema, key or data migration. Old saves load unchanged; the Mutant token is
created by the next S&V reconciliation. Rollback is the previous commit.
