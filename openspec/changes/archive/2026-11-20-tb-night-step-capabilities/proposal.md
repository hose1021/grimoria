# Trouble Brewing night steps as capabilities: Poisoner and Monk

Issue: #200

## Why

`completeStep` in `night.ts` still resolves the Trouble Brewing night choices
in role branches. The Poisoner and the Monk each repeat the same shape: check
impairment, end the earlier effect, push a dated effect with an id from the
command ports, write a note. That is role rule data in the engine, and the
modules of both roles declare only a target mode.

ADR 0002 names this slice: "Night steps: Trouble Brewing remainder", with the
`night-step` capability as its contract addition. The arm does not exist in
code yet; the two migrated night roles (Gambler, Pukka) use the earlier
`ability` field.

## What changes

- `RoleCapability` gains the `night-step` arm: the nights it covers (`first`,
  `other` or `any`), the step the queue builds and an optional resolver over
  the existing read-only ability facts.
- `RoleEffect` gains `timed-effect`: a dated effect of the acting ability on
  one player, with an optional replacement of the ability's earlier effect.
  The engine mints the id and stamps the source and the start.
- `AbilityContext` gains `nameOf` for rule notes.
- `src/core/roles/night-step.ts` is the one lookup for a declared step and
  resolver. The queue builders of the three editions and both step
  completions use it instead of reading `nightStep`, `firstNightStep` and
  `ability` directly.
- The Poisoner and the Monk declare the arm and resolve their choice in their
  modules. `night.ts` keeps no branch for either role.
- `scripts/role-ownership.ts` reports only the arms of a `capabilities` array,
  not the decision and intent kinds a resolver returns.

## Impact

Behavior is unchanged. The effect record, the step record, the note, the log
line, the id scheme, the order of draws from the command ports, the error
codes and the command results stay the same, so saved games and journals
replay as before. No storage, command payload, schema or pin changes.

The Butler, the Imp attack and the Trouble Brewing information roles are not
part of this change.
