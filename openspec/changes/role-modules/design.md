# Design

## Context

Measured on `origin/main` at `4cf1746`:

- `src/core/engine/index.ts` is a 127-line re-export façade; the role logic lives
  in `bmr.ts` (1557 lines), `sv.ts` (1460), `day.ts` (972), `night.ts` (956),
  `death.ts` (491), `setup.ts` (393), `information.ts` (346) and `effects.ts`
  (209).
- `RoleId` is `string` (`src/core/model/types.ts:105`); `TB`, `BMR` and `SNV`
  are typed `RoleId[]`. A `Record<RoleId, RoleModule>` therefore enforces
  nothing.
- The supported set is 72 ids, exposed as `SUPPORTED_ROLES` in
  `src/core/model/rules.ts`.
- `targetModeFor` has one call site (`src/core/engine/night.ts:186`); BMR and
  Sects & Violets build their steps from per-role records spread into
  `makeRoleStep`.
- `scripts/check-acceptance.mjs` already runs each cited test file and fails
  when a `verified` matrix row names a test that does not exist or does not
  pass. `scripts/openspec-check.mjs` does not run tests at all.
- The three scenario suites hold 290 tests and are the behaviour-preservation
  proof.

## Goals / Non-Goals

**Goals:**

- Each role has one module, and the compiler sees a missing or unknown role.
- The two behavior points a module owns (night step, death) come from the
  module, with no change to any observable state.
- One rule document per role, and one check that ties a verified matrix row to a
  test whose name carries a rule identifier.
- One command that prints everything known about a role.

**Non-Goals:**

- Moving rule information, protection, day actions or win checks into modules.
- A module hook that ends the game.
- Narrowing `RoleId` from `string`.
- Golden snapshots of the night queue.
- Any schema, command, storage, UI or rules change.

## Decisions

### Role modules live in `src/core/roles/<role-id>/`

`src/core/roles/types.ts` holds the contract, `registry.ts` the typed map, and
each role directory holds `role.ts` and, from the traceability stage, `rule.md`.
The layer policy treats all of `src/core/` as `core`, so the move adds no import
edge. Alternatives: keep modules under `src/core/engine/` (rejected: the point is
that a role is not an engine concern), one file per scenario (the status quo the
issue replaces).

### A literal role-id tuple makes the registry exhaustive

New `src/core/model/role-ids.ts`:

```ts
export const SUPPORTED_ROLE_IDS = ["washerwoman", /* … 72 ids */] as const;
export type SupportedRoleId = (typeof SUPPORTED_ROLE_IDS)[number];
```

The registry is an object literal checked with
`satisfies Record<SupportedRoleId, RoleModule>`; a missing key or an extra key is
a type error. `RoleId` stays `string`, so no call site changes. Alternatives:
narrow `RoleId` to `SupportedRoleId` (rejected: touches the catalog, script
import, UI and the `window.PG` boundary for no behaviour gain); keep
`Record<RoleId, …>` (rejected: enforces nothing). Drift is a test, not a comment:
`src/core/model/role-ids.test.ts` compares the tuple with `SUPPORTED_ROLES` and
with `docs/official/roles.json` — the snapshot's entries whose edition is `tb`,
`bmr` or `snv` and whose team is not `traveller` are exactly the 72 supported
ids (the snapshot holds 87 such entries including 15 Travellers), and each id's
edition must match.

### The module contract has exactly two optional hooks

```ts
export type TargetMode = "none" | "one-any" | "one-other" | "two" | "po";

export interface NightStepSpec {
  readonly target?: TargetMode;
  readonly minTargets?: number;
  readonly maxTargets?: number;
  readonly optional?: boolean;
  readonly canKill?: boolean;
  readonly canResurrect?: boolean;
  /** Absent means "wake when the role is in play and can act tonight". */
  readonly present?: (state: GameState, night: number) => boolean;
  /** Extra step fields, or null when the step must not be built tonight. */
  readonly extra?: (state: GameState, night: number) => Record<string, unknown> | null;
}

export interface RoleDeathEvent {
  readonly playerId: string;
  readonly cause: string;
  readonly at: DeadAt;
}

export interface RoleModule {
  readonly id: SupportedRoleId;
  readonly edition: "tb" | "bmr" | "snv";
  readonly nightStep?: NightStepSpec;
  readonly onDeath?: (state: GameState, event: RoleDeathEvent) => void;
}
```

Every other role-keyed branch (information, protection, day actions, win checks,
madness) stays where it is. Alternative: a hook per concern (rejected for this
change: each new hook is a behaviour move without a spec requirement or a test
that isolates it). A module with no hooks is legal and expected for passive
roles.

The issue proposed six hooks. Each was checked against the current code:

| Proposed hook | Disposition | Where the code lives today |
| --- | --- | --- |
| `nightStep` | In scope | `targetModeFor` and `infoKindFor` switch on role literals in `night.ts`; the Bad Moon Rising and Sects & Violets builders spread per-role records into `makeRoleStep` |
| `onDeath` | In scope | `resolveDemonDeath`, `becomeDemon` and `bmrCannotDie` in `death.ts`; the death-time handling in `bmr.ts`; Fang Gu and Zombuul in `sv.ts` |
| `setup` | Out | `compositionFor` (`src/core/model/rules.ts:529`) shifts the whole bag from a role list for `baron`, `godfather`, `fanggu` and `vigormortis`. It is pure model data that the bag, setup and the seat flow all call; a hook would move it behind an engine registry and invert that direction for four ids |
| `onExecution` | Out | Virgin and Minstrel are inline in `execute`, Pacifist in the `survives` flag, Saint in `checkWin`; each is entangled with the nomination and vote flow that the refactor must not touch |
| `registersAs` | Out | already declarative: `spy: ["good"], recluse: ["evil", "demon"]` in `host-choice.ts:124`. Moving two table entries to two modules buys no completeness the type checker does not already have |
| `winCheck` | Out | see "The death hook never sets a winner" |

A later change can add `setup` or `registersAs` on their own evidence. Neither is
needed to reach the goal of this change: the compiler-checked module set and one
place per role for the behaviour that moves.

### The death hook never sets a winner

`onDeath` runs after the death entry is written and after protection resolves,
in seat order, before the single `checkWin` pass. A hook may mutate its own
player, effects and journal; it must not call `setWinner`. Alternative: a
`winCheck` hook (rejected: two simultaneous role wins would depend on hook
order, while the current pass has one deterministic precedence).

### The night queue reads declarations, not role literals

`makeRoleStep` takes the step shape from the acting role's module. The generic
Trouble Brewing loop keeps its sequence order from
`src/core/model/rules.ts:nightSequence`; only the per-role shape and presence
leave `night.ts`. The BMR and Sects & Violets builders shrink role by role and
keep their scenario-level conditional steps until their stage.

### Migration is staged by scenario, with the old suites as the proof

Stage 1 adds the contract, tuple, 72 modules and registry without moving
behaviour. Stages 2–4 move Trouble Brewing, then Bad Moon Rising, then Sects &
Violets, each deleting the branches it replaced; stage 5 adds the references and
the checks. No committed golden queue: the existing suites already assert
official order, conditional wakes and every recorded winner, and a golden file
would pin implementation detail and need an update on every rules change.

### Rule identifiers are declared once, in the role's `rule.md`

`rule.md` is a reference table, not a second copy of the rules: one row per
engine-relevant rule holding the identifier, the matrix row it audits, the pinned
source revision and the asserting test names. The matrix stays the audit table
and `docs/official/roles.json` stays the text source, so no official ability
text is duplicated.

The identifier format is an owner decision that is still open. The checker is
format-agnostic: it reads the identifiers declared in the role's `rule.md` and
fails when a verified row's cited test name contains none of them. The issue's
proposed `<SCENARIO>-<ROLE>-<NN>` shape (for example `TB-IMP-03`) is a candidate,
not a constraint, so a later choice changes document content only.

`rule.md` carries a leading `Edition:` line so the checker does not parse
TypeScript for the mapping.

### The check extends `check-acceptance.mjs`, not `openspec-check.mjs`

`check-acceptance.mjs` already spawns each cited test file, reads the matrix and
enforces file-plus-name citations; `openspec-check.mjs` proves only that a spec
cites a resolvable file. Extending the checker that already runs tests avoids a
second test runner and a duplicated matrix parser. This deviates from the
issue's wording ("extend `scripts/openspec-check.mjs`") by keeping the criterion
— a `verified` row without a test carrying its identifier fails — in the check
that owns that data.

The check skips matrix rows whose first cell names no role (composition, jinx
and transition rows), requires `rule.md` and `role.ts` to exist for every
supported role in both directions, rejects duplicate identifiers, and rejects an
identifier documented as `host-choice` or `unsupported` when cited by a verified
row.

### `rules-for.mjs` imports the model the same way the acceptance check does

`scripts/rules-for.mjs` imports `src/core/model/rules.ts` and `jinxes.ts` with
Node type stripping, reads the ability text from `docs/official/roles.json`, and
reads `docs/rules-matrix.md`, `openspec/specs/**` and the role's `rule.md`. It
greps the test tree for identifiers. No dependency is added.

## Risks / Trade-offs

- Night order or death resolution drifts during a move → the 290 existing tests
  stay unchanged and are run at every stage; each stage moves one scenario only;
  a stage that needs an assertion change is reverted, not re-pinned.
- The tuple disagrees with `SUPPORTED_ROLES`, the official snapshot or the
  documented edition → `role-ids.test.ts` compares all three and fails on the
  first mismatch.
- 72 directories add file count without runtime weight → the alternative (one
  dispatch table) is exactly the structure the issue rejects; the files are
  small and generated once.
- Test renames break matrix citations → the same change updates
  `docs/rules-matrix.md`; `check-acceptance.mjs` proves every citation resolves
  and passes.
- A `rule.md` row references a matrix row that no longer exists or changed its
  level → the acceptance check fails on the dangling reference.
- A role hook mutates shared state in an unexpected order → the hook contract
  limits it to its own player and effects; the single `checkWin` pass is
  unchanged.

## Migration Plan

1. Contract, tuple, 72 modules, registry, registry and tuple tests. No behaviour
   movement; `npm run verify` green.
2. Trouble Brewing: move step shape and death handling into modules, delete the
   replaced branches. Existing suites unchanged.
3. Bad Moon Rising: same, one batch.
4. Sects & Violets: same, one batch.
5. Traceability: 72 `rule.md`, identifiers in the cited test names, matrix Test
   cells, checker extension with its test, `rules-for.mjs` with its test, and
   removal of any adapter left by stages 2–4.

Rollback is per stage: every stage is independently green, so a failing stage is
reverted to the previous commit without touching the others.

## Open Questions

- The identifier format is the owner's decision. The checker reads declared
  identifiers from `rule.md`, so the choice changes those documents and the test
  names, not the check, the specs or the registry.
- Should `NightStep.targetMode` narrow from `string` to `TargetMode`? Deferred; it
  would touch step literals in tests without changing behavior.
