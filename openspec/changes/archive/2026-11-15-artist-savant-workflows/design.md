# Design

## Context

The day card already hosts role actions that happen away from the night queue:
the Slayer, the Gossip, the Juggler, the Klutz and the Tinker. Those actions
enter through `store.dispatch` → `applyCommand` → a domain function in
`day.ts` → a state record and a secret log entry. The Artist and the Savant are
the same shape and need no new layer.

## Goals

- One command per role, with a typed payload and the existing validation,
  fingerprint, idempotency, journal and replay path.
- No rule computed in React: the screen renders a projection and dispatches.
- No automatic interpretation of free-form language or statement truth.
- Private content out of the public and player projections.
- Old saves load and validate without a migration.

## Non-Goals

- A chat or note editor.
- Automatic truth evaluation, question parsing or answer generation.
- A Vortox-specific UI that resolves the lie for the host.
- A new storage key or schema version.

## Decisions

### Engine records, Storyteller decides

`artistQuestion` stores the trimmed question and one of `yes`, `no`,
`unknown`; `savantVisit` stores two trimmed statements and one of `first`,
`second`, `both`, `neither`. The engine never inspects the text. The official
answer set and the truth pattern are validated, but the truth value is the
host's declaration.

### Who may act, and when

The shared `dayAbilityHolder` guard requires an unended day, no winner, a
living player, and the effective character (so a Drunk shown as the Artist or
Savant is supported). The Artist is once per game through `used.artist`; the
Savant is once per day through `state.savant.day`.

### The permitted truth pattern

- Healthy Savant with no living unimpaired Vortox: `first` or `second`.
- Impaired Savant: any of the four values, because the printed text allows two
  true or two false statements.
- Living unimpaired Vortox: only `neither`, because Townsfolk information is
  false.

The same `savantTruthChoices` function feeds validation and the read-model
projection, so the select can never offer a value the command rejects.

### State and save compatibility

`artist` and `savant` are nullable fields on `GameState`, initialized by
`createGame` and cleared by a new game. The validator accepts a missing field,
so a `pg.game.v4` save from before this change still loads; no schema bump is
needed. Both records are exported with the other secrets under the existing
warning.

### Privacy and replay

The records live in the Storyteller state and in a `secret: true` log entry.
`publicGameView` and the player and public screens never read them. The
commands carry the host's text, so replay rebuilds the same record and answer.

## Risks / Trade-offs

- The host types the question and statements; the app cannot verify them. This
  is the honest limit of a free-form ability.
- A Savant who visits twice on the same day is rejected by the day number. A
  character change that creates a Savant after another Savant visited that day
  keeps the single visit; that follows the Storyteller's resolution of the
  change and is documented as a host decision.
- The panel is Storyteller-only. The player screen does not show the answer, so
  the host must speak it privately as the rules require.
