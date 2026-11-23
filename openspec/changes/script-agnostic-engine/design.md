# Design

## Script definition

A script is a character set plus evidence. `defineScript` is pure:

```ts
type ScriptDefinition = {
  script: Script;
  origin: "official" | "imported";
  rulesetRevision: string | null;
  roles: RoleId[];
  mixed: boolean;
  editions: Array<"tb" | "bmr" | "snv">;
  teams: { townsfolk: number; outsider: number; minion: number; demon: number };
  nightOrder: { first: RoleId[]; other: RoleId[] };
  compatibility: ScriptCompatibility;
};
```

The compatibility verdict is recomputed from `support.ts` and
`interactions.ts`, never trusted from storage.

## One verdict

```
role levels + interaction statuses -> weakest level
automatic = !manualOnly && level !== "unsupported" && no unknown role
```

- `verified`: every role and every applicable interaction is behavior-tested.
- `requires-storyteller-choice`: a printed discretion remains; the existing
  `requires-storyteller-choice` command result, journal entry and replay path
  carry it.
- `unsupported`: a role or interaction has no implemented behavior, or a
  character is unknown. Automatic play is refused; manual-only mode is the
  explicit fallback.

## Queue composition

The existing builders already produce role-driven steps with immutable keys.
A certified mixed script:

1. calls the TB, BMR and S&V role-step builders;
2. drops their system steps;
3. adds one `minioninfo`/`demoninfo` pair when the game has seven or more
   players;
4. ranks every step by `docs/official/nightsheet.json`, with an unprinted step
   after the printed ones;
5. writes that rank into `step.order` and sorts by it;
6. repeats the normalizer after every conditional insert.

Exact single-edition scripts keep their builder. That preserves the recorded
keys of every journal, because a key embeds the compressed edition index.

Completion stays per step. `step.bmr` and `step.sv` already select the existing
adapter; a TB step takes the shared path. `completeNightStep` records outcomes
from those flags, so no second command path exists.

## Conditional steps

A mixed script runs the BMR, S&V and TB conditional contributors. The TB
contributor runs last so its dead-step prune sees the other contributors'
steps. The S&V reconciliation runs before the normalize. A contributor whose
roles are absent adds nothing.

## Interactions

`interactions.ts` maps each official jinx to a status and a reason:

- `verified` requires an asserting behavioral test;
- `requires-storyteller-choice` is an implemented behavior with a host answer;
- `unsupported` means the engine has no joint behavior.

The registry throws on an official pair without a classification, so a snapshot
update cannot silently ship an unclassified rule. Today all seven pairs are
`unsupported`; the ADR records the exact gap for each.

## Preservation

- No new state field is required. `Script.rulesetRevision` is optional.
- No key, schema or command payload changes.
- No `RULESET_VERSION` bump: released journals cannot contain an automatic
  mixed script.
- The seven jinx behaviors, Al vs Al and Travellers remain separate scopes.

## Verification

- Night order projection test against the official snapshot and each edition's
  published sequence.
- Compatibility tests for verified, host-choice, jinxed, unknown and manual
  pools.
- Mixed engine test: one queue across three editions, Sailor drunk on a
  Clockmaker, Poisoner poison on a Sailor, Courtier drunk on a Monk, Clockmaker
  information, night two, journal replay.
- Full `npm test`, typecheck, lint, format check; existing edition suites.
