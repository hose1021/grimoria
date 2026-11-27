# Design

## Context

The Gambler proves a resolver can return a kill through the shared death path.
The Pukka needs three facts the Gambler did not: the night number, the pending
deaths the actor owns, and an impairment branch that suspends those deaths
instead of only writing a note. Its effects must remain the same two entries:
`poison` with `pukka: true` and `pukka-death` with `resolve`, because the effect
graph, replay and `resolveSuspendedPukkaDeaths` depend on them.

## Goals

- The role decides poison, delayed death, self-target suspension, release of
  older poisons and resolution of the previous death.
- The coordinator applies those intents through the shared effect helpers.
- No edition branch for Pukka remains in `bmr.ts`.
- Effect ids, fields, step result and command behaviour are unchanged.

## Non-Goals

- A generic lifetime model for every delayed effect. The five intents are the
  smallest set this rule needs; a later role adds its own only when named.
- Moving the Exorcist's Pukka interaction into the Exorcist module. It still
  resolves the previous Pukka death through the shared helper.
- A new event bus or journal.

## Decisions

### Facts are read-only, effects are mechanics

`AbilityContext` gains `at: { phase: "night"; number }` and `pendings`, each
pending carrying an opaque id, target, suspension state, resume flag and
resolution night. The role never sees `GameState` or an `Effect` object.

`RoleEffect` gains:

- `poison { playerId }` — the indefinite poison owned by the ability;
- `delay-death { playerId, resolveAtNight }`;
- `suspend-death { pendingId, reason, resumeOnHealthy? }`;
- `release-poisons { keepPlayerId? }` — deactivate this source's poisons except
  the named player;
- `resolve-death { pendingId }`.

The coordinator applies them in the order the role returns them. That order is
the rule: the new poison lands before the previous death resolves, so a newly
poisoned protector cannot save the old victim.

### Suppressed still owns its suspension

The impaired Pukka must keep the pending death on hold and write a different
note. `suppressed` therefore accepts the suspension intents, an optional
`noteKey`/`text`, and a step result. It does not accept a kill or a new poison
semantically; the coordinator applies only the effects the resolver returns,
and the Pukka returns suspensions on this path.

### The role supplies the result; the engine adds the death

A resolver may return `result`, a plain record for the step. For the Pukka it
carries `poisonedId` and `suspended`, plus empty `deaths`/`resolved`
placeholders. When a `resolve-death` intent actually kills, the coordinator
replaces those two fields with the real death object. The result shape and
keys stay identical to the old branch.

### The effect helpers move, not the effects

`pukkaPendings`, `resolvePukkaDeath`, `resolveSuspendedPukkaDeaths` and the two
effect constructors move to `engine/pukka.ts`. `bmr.ts` still uses the first
and second for the Exorcist and outcome paths; `commands.ts` imports the
suspended resolver from the new module. No effect is duplicated.

## Risks / Trade-offs

- The intents name effect mechanics, not a general event model. That is
  deliberate: a generic lifetime model would be designed without a second
  consumer. A later role can extend the union with its own named mechanics.
- The step result is a plain record, so the coordinator cannot type-check its
  keys. The characterization tests pin every key and value for the Pukka.
- The Gambler resolver fixture gains two context fields; no resolver reads them.

## Verification

- Pure resolver tests for the normal, self-target, impaired and empty cases.
- All existing BMR Pukka and Exorcist tests, including export/import, validate/
  preview/apply and the effect-cycle cases.
- Full `npm run verify`.
