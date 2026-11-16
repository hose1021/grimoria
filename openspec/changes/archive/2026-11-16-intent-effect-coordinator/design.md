# Design

## Context

Measured on `origin/main` at `2fac8b3` (2026-11-16), after PR #254 (`ff0bfdb`)
and ADR 0002:

- `src/core/model/effect-graph.ts` is the one impairment graph: creation order,
  dependency order, future-time probes and typed cycle errors.
- `orderCascade` and the frozen `EVENT_PRIORITY` live in the same module.
- `src/core/engine/ability.ts` applies capability decisions through `kill`,
  the Pukka helpers and `checkWin`.
- `src/core/engine/death.ts` owns `kill`, `attackBlockReason`, `resolveAttack`,
  `resolveDemonDeath`, `checkWin` and `setWinner`.
- `src/core/engine/day.ts` owns `executePlayer`, the Minstrel effect and the
  day actions; `src/core/engine/night.ts` owns the queue and its win calls.
- `bmr.ts` and `sv.ts` still hold most BMR/S&V role branches, including their
  own `kill`, `setWinner`, `replaceCharacter` and `swapCharacters` call sites.
- `docs/role-ownership.md` reports 10 capability roles and 61 engine-branch
  roles of 72.
- The command path already clones, validates, applies, checks invariants and
  commits once (`commands.ts`); the store persists and restores on failure.
- Existing suites assert individual roles; no suite asserts stage boundaries
  across roles, and no executable check names the shared writers.

## Goals / Non-Goals

**Goals:**

- One acceptance suite whose failures point at a stage boundary, not at a role.
- One source pin per boundary, taken from `docs/rules-matrix.md`.
- One executable ownership check for the shared writers.
- Spec requirements that make reordering or a second writer a reviewable
  regression, not a style question.

**Non-Goals:**

- Migrating the 61 legacy roles or changing the coordinator architecture.
- A second effect graph, journal or transaction boundary.
- Reading wiki text at test runtime, or parsing wikitext in the engine.
- A new state field, storage key, command, error code or winner reason.

## Decisions

### 1. Boundary fixtures, not role suites

`src/core/engine/coordinator.test.ts` holds a table of boundaries:

| Boundary | Fixture outcome | Pinned source |
| --- | --- | --- |
| Protection before redirect | protected Mayor attack yields no redirect choice | Monk r3124 |
| Earlier protection spares the Fool | Tea Lady or Innkeeper prevention keeps `used.fool` unset | Fool r2636 |
| Bypass versus impairment | sober Assassin kills through Tea Lady; impaired Assassin kills nobody | Assassin r1786 |
| Death before transformation | Fang Gu jump records the old death and the new evil Demon | Fang Gu r2974 |
| Transformation before win | Mastermind suppresses the Demon-execution win, then the extra day decides | Mastermind r2993 |

Each boundary is a `test()` named `<boundary> (<role> r<oldid>)`. A manifest
test asserts that every boundary id and revision is present. A missing entry
fails the manifest before a reader has to notice a thin suite.

Rationale: the role suites prove a role's outcome in its own edition; the
coordinator suite proves the order between two roles that meet at a stage.
Rejected alternative: extending each role suite. It would duplicate fixtures
and still not name the boundary.

### 2. One writer allowlist, scanned as text

Extend `src/core/roles/architecture.test.ts` with a second check:

- `src/core/roles`, `src/application`, `src/infrastructure`, `src/ui` and
  `src/entry` must not call `kill`, `setWinner`, `replaceCharacter`,
  `swapCharacters` or `becomeDemon`, and must not push or assign the matching
  records (`state.deaths`, `state.executions`, `state.effects`, the current
  character, `state.winner`).
- `src/core/engine` calls are allowed only from the recorded owners:
  `kill` from `ability.ts`, `bmr.ts`, `day.ts`, `death.ts`, `pukka.ts`,
  `sv.ts`; `setWinner` from `commands.ts`, `day.ts`, `death.ts`, `sv.ts`;
  `replaceCharacter` and `swapCharacters` from `sv.ts`; `becomeDemon` from
  `death.ts` and `death-ability.ts`.
- `src/core/model/state.ts` is exempt for the legacy-load normalisation that
  builds death records and resets records; it is not a resolution stage.

The scan strips line and block comments before matching, so prose cannot
trigger a failure, and matches a word boundary plus `(` for calls. A new file
needs an explicit allowlist entry with a reason, which makes the owner visible
in review.

Rejected alternatives: an ESLint rule (the project forbids a second lint
tool); a type-level restriction (roles already receive no state, but the check
also covers non-engine layers and documents the engine owners); relying on
review alone (the ADR already asks for it and it did not prevent the spread).

### 3. Atomicity is proven through the command path

The suite uses `previewCommand` and `applyCommand` where the outcome crosses a
stage, and compares the canonical state before and after:

- a Mayor redirect that needs an answer returns `requires-storyteller-choice`
  and leaves the state and journal byte-identical;
- a Slayer shot on the last Demon commits the death and the winner together,
  and the preview reports the same without committing;
- a store save failure restores the pre-command state.

Rationale: atomicity is a property of the command boundary, not of `kill`.
Rejected alternative: asserting only engine function returns. It would not
prove that no death record escaped before a host choice.

### 4. No production change without a failing fixture

The suite is written first. A boundary that already passes is a regression
test; a boundary that fails is fixed at the shared function that owns the
stage, never in the fixture. Behavior changes require a RED result, the root
cause and a GREEN result in the task evidence.

### 5. Pins stay in the matrix

The test name carries the revision, and a code comment points to
`docs/rules-matrix.md`. The suite does not read `docs/official/wiki/` at
runtime: the pinned text is a review authority, and a test that parses it
would couple a game rule to wikitext formatting.

## Risks / Trade-offs

- Textual ownership scan can hit a string or a renamed helper → strip comments,
  match calls with a word boundary, and keep the engine allowlist explicit;
  review is the second control.
- A boundary fixture can pass for the wrong reason (for example, a dead source
  instead of protection) → each fixture asserts the negative that names the
  stage (no redirect option, unspent Fool, no winner), not just survival.
- The allowlist can grow silently → a missing entry fails the test; an added
  entry is a visible review line with a reason.
- Cross-role fixtures are more expensive to build than role fixtures → one
  fixture per boundary, using the existing `make` helper and deterministic
  assignments.
- Existing engine behavior may already violate a boundary → the failing case
  is the finding; fix it at the root or, if it needs a rules decision, stop and
  ask the owner with the pinned source.

## Migration Plan

No data or API migration. The change is additive: one test file, one check in
an existing test, two spec deltas and task evidence. Rollback is deleting the
new test file and the allowlist block; no saved game, command or storage path
changes.

## Open Questions

None.
