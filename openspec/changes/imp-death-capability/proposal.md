# Imp death capability

Issue: #212

## Why

The Imp's `onDeath` hook imports `becomeDemon` and `isImpaired` from the engine,
so the role mutates state and duplicates a shared mechanic. ADR 0002 removes
those exceptions by making death a typed capability: the module returns an
`inherit` or `choose-heir` decision, and one coordinator applies it.

## What changes

- `RoleCapability` gains the `death-trigger` arm with a read-only
  `DeathContext` and `DeathDecision`.
- `src/core/engine/death-ability.ts` applies the decision through
  `becomeDemon`; it does not import `death.ts`, so no cycle forms.
- `resolveDemonDeath` asks the role's capability first, then the Imp fallback.
- The Imp module declares the capability and no longer imports the engine.
- The architecture exception map drops both Imp entries.
- The legacy `RoleModule.onDeath` field is removed: no role used it after the
  move.

## Impact

Behavior is unchanged: Scarlet Woman first, one living Minion inherits, several
living Minions produce the existing host choice. Tests are the existing
succession suites. No storage, command, journal or winner shape changes.
