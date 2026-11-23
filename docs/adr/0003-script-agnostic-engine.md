# ADR 0003: Script definitions, capability composition and versioned interactions

- Status: Accepted for implementation by the owner directive in [#475](https://github.com/hose1021/grimoria/issues/475)
- Date: 2026-11-23
- Extends: [ADR 0001](0001-role-capability-contract.md), [ADR 0002](0002-engine-contracts.md)
- OpenSpec change: `openspec/changes/script-agnostic-engine`

## Context

The engine is capability-driven per role, but its **queue composition** is still
edition-routed. `src/core/model/rules.ts` derives an edition from role
membership, `isBmrScript` and `isSnvScript` return true for any pool that
contains one role of that edition, and `buildNightQueue` chooses exactly one
edition builder. A mixed pool therefore reaches one edition's queue at most.
The application compensates with `manualOnly`, which disables the automatic
queue, abilities and win checks.

The other half of the problem is the official jinx table. `jinxes.ts` stores
seven pairs, but a lookup returns `verified` from membership alone. No pair has
a joint behavioral implementation or an asserting test:

| Pair                        | Current engine behavior                                             |
| --------------------------- | ------------------------------------------------------------------- |
| Chambermaid + Mathematician | Chambermaid counts its own edition's wakes; no detection question   |
| Drunk + Mathematician       | Mathematician counts host-marked abnormalities; no Drunk derivation |
| Fang Gu + Scarlet Woman     | The Fang Gu jump bypasses the Scarlet Woman two-Demon rule          |
| Goon + Pit-Hag              | An evil player made Goon can later turn good                        |
| Lunatic + Mathematician     | Targets are recorded; no comparison for the Mathematician           |
| Mastermind + Vigormortis    | Retention covers dead Minions, not the Mastermind's extra day       |
| Recluse + Sage              | Sage names the recorded killer; no Recluse registration question    |

Presenting those pairs as supported contradicts the pinned source and the
repository rule that unverified combinations stay unsupported.

## Decision

### 1. A script is data, not an engine

`src/core/model/script-definition.ts` defines one `ScriptDefinition`:

- normalized character ids and origin (official or imported);
- edition membership derived from the characters, never from a scenario id;
- team counts and the script's applicable jinxes;
- the official first-night and other-night order for its characters;
- a compatibility verdict with per-role and per-interaction evidence.

`defineScript` is pure. It stores no compatibility result in `pg.game.v4`; the
verdict is recomputed from the pinned tables on every load, so a saved file
cannot claim support the build does not have.

### 2. One compatibility computation

`scriptCompatibility` is the only verdict:

- a role contributes its audited `SupportLevel` (`verified`,
  `requires-storyteller-choice`, `unsupported`);
- a registered interaction contributes its own status;
- the script level is the weakest contribution;
- `automatic` is true only when the level is not `unsupported`, every character
  is known, and the script is not in manual-only mode.

`requires-storyteller-choice` stays automatic: the existing command path asks
the host, validates the answer against the offered options, journals it and
replays it. A missing mechanic is different from a printed discretion. The first
is `unsupported`; the second is `requires-storyteller-choice`.

### 3. One queue per night, composed from role declarations

For a certified mixed script, `buildNightQueue` calls every supported edition's
role-step builder and merges the result:

- each builder keeps its own role declarations, actor predicates, step keys and
  conditional contributors;
- only `kind: "system"` steps are dropped before the merge, because one system
  pair is emitted for the whole script;
- the merged queue is ordered by the official `docs/official/nightsheet.json`
  list, and each step records that rank;
- every conditional insert is followed by the same normalizer;
- step keys are never recomputed, so a later command still addresses the same
  step.

An exact single-edition script still uses its own builder. This is not a second
engine: it preserves the recorded step keys and saved journals of the three
released editions. The composition branch is selected by the **script's
certified shape**, not by a scenario id.

Completion was already per step (`step.bmr`, `step.sv` and the shared path), so
a mixed queue routes each BMR or S&V role to the existing completion adapter and
every TB role to the shared path. `completeNightStep` still records BMR/SV
outcomes by the completed step's flags.

`appendConditionalSteps` runs the BMR, S&V and TB contributors for a mixed
script, then normalizes. A contributor whose characters are absent adds nothing.
The TB contributor runs last so its dead-step prune sees every added step.

There is still one coordinator (`engine/ability.ts`), one effect graph, one
journal and one canonical state.

### 4. Interactions are behavior-backed and versioned

`src/core/model/interactions.ts` is the versioned registry. Each entry names:

- the two characters and the rule kind;
- the pinned source and pin (`docs/official/jinxes.json` plus
  `JINX_RESOURCES_VERSION`);
- a status and the reason;
- the asserting test, or `null` when no test exists.

The registry refuses to load an official pair that has no classification. A
`verified` entry must name a test; an `unsupported` entry must not. Today all
seven official pairs are `unsupported` because their joint behavior is absent.
A pool that can trigger one is therefore `unsupported` for automatic play and
falls back to the explicit manual mode.

Ordinary cross-role effects (protection, impairment, death, registration,
transformation, information falsification) are not pair rules. They stay in the
shared mechanics and their existing cross-role tests. The registry contains
only rules that a pair, rather than a role, owns. A mixed-only path can expose a
gap in a shared mechanic; this change fixes the two it found, with tests: the
Scarlet Woman inherits the dead Demon's own character, and the No Dashii poison
respects the Soldier and the Monk's protection.

### 5. The UI reports the verdict before play

The bag picker and the setup screen show:

- the role-level counts and host-choice characters (already present);
- every non-verified interaction for the pool, by pair and status;
- whether a mixed pool is automatic or manual-only.

Manual-only mode remains an explicit, visible fallback for an uncertified mixed
pool. It is never selected silently as a "successful" import. Unknown roles and
traveller-only additions are still rejected at import.

### 6. Migration and rollback

- No storage key, schema version or command payload changes.
  `Script.rulesetRevision` is optional; a saved script without it stays valid.
- No `RULESET_VERSION` bump: no released journal can contain an automatic mixed
  script, because the old engine rejected or forced manual mode. Every existing
  journal keeps its single-edition builder and therefore its step keys.
- Rollback is the revert of the composition branch: mixed pools return to
  manual-only mode, and the single-edition path was never changed.
- A new supported character still needs one role module and its tests. A new
  script that uses supported characters needs no engine change.

## Invariants

1. No script id, script name or edition string selects a separate coordinator.
2. No second journal, effect graph or state store.
3. A step key is immutable for a recorded edition and night.
4. A Storyteller choice is validated, journaled and replayable.
5. A rule is `verified` only with a pinned source and an asserting test.
6. An unknown combination is `unsupported`, never a silent manual downgrade.

## Non-goals

- Implementing the seven jinx behaviors in this change.
- Supporting Al vs Al characters or any experimental roster.
- Travellers, Fabled and Loric.
- Automatic support for arbitrary imported JSON.

## Verification

- `node --test src/core/model/night-order.test.ts` — the supported order is the
  official projection and each edition keeps its published order.
- `node --test src/core/model/script-definition.test.ts` — role and interaction
  verdicts, the explicit fallback, and the rule that a verified interaction
  names a test.
- `node --test src/core/engine/mixed.test.ts` — one certified pool across TB,
  BMR and S&V builds one official queue, resolves cross-edition drunk and poison
  through the shared graph, reaches night two and replays; the Scarlet Woman
  inherits the dead Demon's own character, the No Dashii poison respects the
  Soldier and the Monk, a Drunk shown an S&V townsfolk wakes, and an
  unsupported pool cannot start automatically.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`.
- Existing TB/BMR/S&V suites and the journal/fixture suites unchanged.

## Pinned sources used by the proving case

- Official night order: `docs/official/nightsheet.json`.
- Soldier r3121, Monk r3124, Poisoner r1737, Imp r3116 (Trouble Brewing).
- Sailor r1768, Courtier r2968 (Bad Moon Rising).
- Clockmaker r2967 (Sects and Violets).
- Official jinx snapshot: `docs/official/jinxes.json`, committed 2026-11-11.

Each role's exact revision and asserting tests are in
`src/core/roles/<role>/rule.md` and `docs/rules-matrix.md`.
