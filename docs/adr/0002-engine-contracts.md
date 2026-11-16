# ADR 0002: Engine contracts, capability model and migration order

- Status: Accepted
- Implementation: architecture contracts accepted by the owner on 2026-11-16;
  the foundation is implemented on `dev`, while the full 72-role capability
  migration remains tracked in #211 under epic #200
- Date: 2026-11-15
- Issue: [#209](https://github.com/hose1021/grimoria/issues/209)
- Epic: [#200](https://github.com/hose1021/grimoria/issues/200)
- Extends: [ADR 0001](0001-role-capability-contract.md)

## Context

ADR 0001 proved one capability shape on the Gambler and the Pukka. It does not
cover the rest of the engine. The current tree still has these facts:

- `src/core/roles/types.ts` gives a module `nightStep`, `firstNightStep`,
  `deathStep`, `onDeath` and the optional `ability` from ADR 0001.
- `src/core/engine/bmr.ts`, `src/core/engine/sv.ts` and
  `src/core/engine/night.ts` still contain role branches for the remaining
  Trouble Brewing, Bad Moon Rising and Sects & Violets characters.
- `src/core/engine/day.ts` contains day actions for the Slayer, Artist, Savant,
  Juggler, Gossip, Moonchild, Klutz, Tinker and madness. `day.ts` also owns the
  execution path.
- `src/core/engine/death.ts` owns attack resolution, protection, death records,
  the Demon succession hook, and every win condition.
- `src/core/engine/information.ts`, `bmr.ts` and `sv.ts` compute information
  and offer host choices. `src/core/engine/host-choice.ts` names the legal
  Storyteller cases.
- `src/core/engine/effects.ts` is the one effect graph. `retention.ts` owns the
  Vigormortis retained ability.
- At the start of this slice `src/core/roles/imp/role.ts` imported
  `becomeDemon` and `isImpaired`, and `src/core/roles/sv-common.ts` imported
  `nightAt` and `minionRetainsAbility`. Both files now read only the model and
  the role contract.

No role module depends on the engine now. The registry is clean.
`src/core/roles/architecture.test.ts` fails on any role-to-engine import, so
the dependency direction is enforced in CI.

The command path is already atomic. `src/core/commands/prepare.ts` prepares one
identity. `src/core/engine/commands.ts` validates and applies on a clone. The
store in `src/application/store/create-game-store.ts` persists and publishes.
When this slice started, the command path depended on module-level clock and
random helpers: `src/core/model/state.ts` had `withClock`/`clockOverride` and
`src/core/engine/execution.ts` had one active context with a fallback to
`Math.random`, so a role handler could reach those helpers. Section 5 records
the replacement that is now implemented.

The lifecycle is a plain string union in `src/core/model/types.ts` and
`src/core/commands/contracts.ts`: `setup`, `deal`, `seat`, `night`, `day`,
`over`. At the time this ADR was written, guards were scattered through
`setup.ts`, `night.ts`, `day.ts` and `commands.ts`; section 6 now names the
single policy module. A mixed-edition custom script requires `script.manualOnly`
(`src/core/model/rules.ts`).

This ADR changes no game rule, pin, command payload, state field, storage key,
error code, note or winner reason. It defines contracts. Later slices move
existing behavior into those contracts.

## Decision

### 1. Dependency direction

The dependency direction is one way:

```text
src/core/model  <-  src/core/roles  <-  src/core/engine
```

| Module | May import | Must not import |
| --- | --- | --- |
| `src/core/roles/**` | `src/core/model`, `src/core/roles` | `src/core/engine`, `application`, `infrastructure`, `ui`, `entry` |
| `src/core/engine/**` | `src/core/model`, `src/core/roles` | `application`, `infrastructure`, `ui`, `entry` |
| `src/core/roles/registry.ts` | `src/core/roles`, `src/core/model` | everything else |

Role modules must not import `src/core/engine`. The engine owns shared
mechanics: the effect graph, protection, death, retention, information facts,
host-choice legality, journal and win. A role owns only its own rule. An engine
import in a role module lets the role duplicate or bypass those mechanics.

No exceptions remain: the Imp death capability and the S&V model-fact helpers
removed the last two edges.

`src/core/roles/architecture.test.ts` locks this contract. It fails on any new
`roles -> engine` import. It also fails when `registry.ts` imports outside `src/core/roles` and
`src/core/model`. The exception map shrinks in the slices that remove each
edge. It never grows.

### 2. Typed capability model

A role declares capabilities as a discriminated union. There is no one giant
optional interface.

```ts
// Target contract. The first arm is implemented; later arms arrive with the
// first role that needs them.
export type RoleCapability =
  | {
      readonly kind: "night-step";
      readonly timing: "first" | "other" | "any";
      readonly step: NightStepSpec;
      readonly resolve?: (context: NightContext) => NightDecision;
    }
  | {
      readonly kind: "day-action";
      readonly action: DayActionKind;
      readonly resolve: (context: DayContext) => DayDecision;
    }
  | {
      readonly kind: "death-trigger";
      readonly step?: NightStepSpec;
      readonly resolve?: (context: DeathContext) => NightDecision;
      readonly onDeath?: (context: DeathContext) => DeathDecision;
    }
  | {
      readonly kind: "execution";
      readonly resolve: (context: ExecutionFacts) => ExecutionDecision;
    }
  | {
      readonly kind: "information";
      readonly infoKind: string;
      readonly resolve: (context: InformationContext) => InformationDecision;
    }
  | {
      readonly kind: "adjudication";
      readonly cases: readonly HostChoiceCase[];
      readonly resolve: (context: AdjudicationContext) => AdjudicationDecision;
    }
  | {
      readonly kind: "transformation";
      readonly cause: TransformationCause;
      readonly resolve: (context: TransformationContext) => TransformationDecision;
    }
  | {
      readonly kind: "win";
      readonly resolve: (context: WinContext) => WinDecision;
    };
```

`RoleModule.capabilities?: readonly RoleCapability[]` is the migration target.
The existing `nightStep`, `firstNightStep`, `deathStep`, `onDeath` and
`ability` fields remain until a slice moves a role. A role uses either its
legacy field or its capability for one behavior, never both. The legacy field is
deleted in the same slice as the move.

Every context exposes facts, never `GameState`. All arms share one base:

```ts
interface CapabilityFacts {
  readonly actorId: string;
  readonly impaired: boolean;
  readonly at: DeadAt;
  actualRoleOf(playerId: string): RoleId | null;
  hasPlayer(playerId: string): boolean;
}

interface NightContext extends CapabilityFacts {
  readonly timing: "first" | "other" | "any";
  readonly targetIds: readonly string[];
  readonly chosenRoleId: RoleId | null;
  readonly pendings: readonly PendingDeathFact[];
}

interface DayContext extends CapabilityFacts {
  readonly action: DayActionKind;
  readonly targetIds: readonly string[];
  readonly text: string | null;
  readonly truth: boolean | null;
  readonly guesses: readonly { readonly playerId: string; readonly roleId: RoleId }[];
  readonly marks: readonly { readonly playerId: string; readonly reason: string }[];
}

interface DeathContext extends CapabilityFacts {
  readonly deadId: string;
  readonly deadRoleId: RoleId | null;
  readonly cause: string;
  readonly livingBefore: number;
  readonly livingMinionIds: readonly string[];
  retainsAbility(playerId: string): boolean;
}

// ExecutionFacts is the read-only execution arm. It is not the engine's
// runWithExecutionContext helper from src/core/engine/execution.ts.
interface ExecutionFacts extends CapabilityFacts {
  readonly executedId: string;
  readonly executedRoleId: RoleId | null;
  readonly cause: string;
  readonly death: Death | null;
  readonly executionToday: Execution | null;
  readonly livingCount: number;
}

interface InformationContext extends CapabilityFacts {
  readonly step: NightStep;
  readonly targetIds: readonly string[];
  readonly registrations: Readonly<Record<string, string>>;
  readonly roleChoices: readonly RoleId[];
  aliveNeighbors(playerId: string): readonly string[];
  executionsToday(): readonly Execution[];
  votesToday(): readonly { readonly playerId: string; readonly nominationId: string }[];
  activeEffects(
    kind: string,
  ): readonly { readonly id: string; readonly kind: string; readonly targetId: string | null }[];
}

interface AdjudicationContext extends CapabilityFacts {
  readonly case: HostChoiceCase;
  readonly legalOptions: readonly string[];
  readonly answer: string | null;
}

interface TransformationContext extends CapabilityFacts {
  readonly targetId: string;
  readonly newRoleId: RoleId;
  readonly cause: TransformationCause;
}

interface WinContext extends CapabilityFacts {
  readonly livingCount: number;
  readonly demons: readonly string[];
  readonly execution: Execution | null;
  readonly death: Death | null;
  readonly endOfDay: boolean;
  readonly twins: { readonly goodId: string; readonly evilId: string } | null;
}
```

`ChoiceOption` is the existing type from `src/core/commands/result.ts`.

| Step kind | Read-only context fields | Decision | Current owner |
| --- | --- | --- | --- |
| Night step, first/other | `targetIds`, `chosenRoleId`, `pendings`, `timing` | `effects`, `suppressed`, `no-effect` | `night.ts`, `bmr.ts`, `sv.ts`, `engine/ability.ts` |
| Day action | `action`, `targetIds`, action facts (`text`, `truth`, `guesses`, `marks`) | `effects`, `record`, `host-choice`, `no-effect` | `day.ts`, `sv.ts` |
| Death trigger | `deadId`, `deadRoleId`, `cause`, `livingBefore`, `livingMinionIds`, `retainsAbility` | `effects`, `suppressed`, `no-effect` for the wake; `inherit`, `choose-heir` for succession | `deathStep`, `onDeath`, `appendSvConditionalSteps` |
| Execution contribution | `executedId`, `executedRoleId`, `cause`, `death`, `executionToday`, `livingCount` | `survives`, `dies`, `win`, `effects`, `no-effect` | `executePlayer`, `checkWin` |
| Information | `step`, `targetIds`, `registrations`, `roleChoices`, `aliveNeighbors`, `executionsToday`, `votesToday`, `activeEffects` | `answer`, `options`, `host-choice`, `note` | `information.ts`, `bmr.ts`, `sv.ts` |
| Registration and host adjudication | `case`, `legalOptions`, `answer` | `legal`, `answer`, `reject` | `host-choice.ts`, `options.registrations` |
| Transformation | `targetId`, `newRoleId`, `cause` | `replace`, `swap`, `no-effect` | `sv.ts`, `becoming.ts` |
| Win contribution | `livingCount`, `demons`, `execution`, `death`, `endOfDay`, `twins` | `win`, `suppress`, `no-effect` | `death.ts` (`checkWin`) |

The decision unions are small and named by mechanic:

```ts
export type NightDecision = AbilityDecision; // ADR 0001

export type HeirOption = {
  readonly id: string;
  readonly name: string;
  readonly roleId: RoleId | null;
};

export type DeathDecision =
  | { readonly kind: "inherit"; readonly heirId: string; readonly via: string }
  | { readonly kind: "choose-heir"; readonly options: readonly HeirOption[] }
  | { readonly kind: "effects"; readonly effects: readonly RoleEffect[] }
  | { readonly kind: "no-effect" };

export type DayActionKind =
  | "slayer-shot"
  | "artist-question"
  | "savant-visit"
  | "juggler-guess"
  | "gossip-statement"
  | "moonchild-choice"
  | "klutz-choice"
  | "madness-penalty";

export type DayDecision =
  | { readonly kind: "effects"; readonly effects: readonly RoleEffect[] }
  | { readonly kind: "record"; readonly result: Readonly<Record<string, unknown>> }
  | { readonly kind: "host-choice"; readonly case: HostChoiceCase; readonly options: readonly ChoiceOption[] }
  | { readonly kind: "no-effect" };

export type ExecutionDecision =
  | { readonly kind: "survives" }
  | { readonly kind: "dies" }
  | { readonly kind: "win"; readonly team: Alignment; readonly reason: string }
  | { readonly kind: "effects"; readonly effects: readonly RoleEffect[] }
  | { readonly kind: "no-effect" };

export type InformationDecision =
  | { readonly kind: "answer"; readonly value: unknown }
  | { readonly kind: "options"; readonly options: readonly string[] }
  | { readonly kind: "host-choice"; readonly case: HostChoiceCase; readonly options: readonly string[]; readonly text?: string }
  | { readonly kind: "note"; readonly key: string; readonly text: string };

export type AdjudicationDecision =
  | { readonly kind: "legal"; readonly options: readonly string[] }
  | { readonly kind: "answer"; readonly value: string }
  | { readonly kind: "reject"; readonly reason: string };

export type TransformationCause =
  | "pithag"
  | "snakecharmer"
  | "barber"
  | "fanggu"
  | "philosopher";

export type TransformationDecision =
  | { readonly kind: "replace"; readonly playerId: string; readonly roleId: RoleId }
  | { readonly kind: "swap"; readonly firstId: string; readonly secondId: string }
  | { readonly kind: "no-effect" };

export type WinDecision =
  | { readonly kind: "win"; readonly team: Alignment; readonly reason: string }
  | { readonly kind: "suppress" }
  | { readonly kind: "no-effect" };
```

Rules for every arm:

- A capability receives only read-only facts. It never receives `GameState`, a
  `Player` reference or an `Effect` reference that it could mutate.
- A capability never writes state, the journal, the log or a winner. It returns
  a decision. The coordinator applies it.
- A capability never names a shared mechanic it did not invoke through its
  decision. The engine derives the ability name and edition marker.
- The union grows only with a migrated role. An arm with no real consumer is
  not added.
- A check for one step kind is one capability. A role with two step kinds
  declares two entries.

### 3. One coordinator

`src/core/engine/ability.ts` is the first coordinator. It becomes the single
resolution coordinator for all capabilities. It is not an event bus. It owns no
second journal. The resolution order is fixed:

1. **Intent.** The role capability returns a decision from read-only facts.
   Target validation, registration validation and host answers already ran in
   `night.ts` or `day.ts`.
2. **Attack.** `resolveAttack` in `src/core/engine/death.ts` starts a lethal
   attack. `executePlayer` in `src/core/engine/day.ts` starts an execution.
3. **Protection and redirect.** `attackBlockReason`, `protectionFor`,
   `soldierSafe`, `mayorRedirects` and `bmrCannotDie` in
   `src/core/engine/effects.ts` and `death.ts` decide whether the attack
   happens and who dies. The Mayor redirect stays a host choice.
4. **Death or execution.** `kill` in `src/core/engine/death.ts` is the only
   death writer. It applies protection, the Fool, the Zombuul, the Sailor, the
   Tea Lady and the impairment record. `executePlayer` adds the execution
   record and the Minstrel consequence.
5. **On-death and character change.** `resolveDemonDeath` calls the dead role's
   `onDeath` capability. `becomeDemon`, `replaceCharacter` and
   `swapCharacters` apply a transformation. `reconcileNoDashiiPoison` and
   `reconcileVigormortisPoison` restore effect state after a change.
6. **Win.** `checkWin` evaluates every win contribution and calls `setWinner`.
   A pending Demon heir blocks every win check.

The coordinator calls `isImpaired` and the effect graph before it calls a
capability. A role sees the resulting `impaired` fact and decides what its own
rule does with it. The coordinator applies the returned intents in order. A
`kill` intent goes through `kill`. A delayed effect goes through the shared
helper (`engine/pukka.ts` for the Pukka). Order is part of the rule: the new
Pukka poison lands before the previous victim's death resolves.

The existing history stays the only history:

- `state.log` is the human-readable table log.
- `state.journal` is the command history for undo and replay.
- `state.applied` is the idempotency ledger.
- `DomainEvent[]` is derived from the before/after state in `deriveEvents`.

No capability, coordinator or role may push to a second ledger or publish an
event. Replay in `src/core/engine/replay.ts` must reproduce the same state.

### 4. Command transaction boundary

The boundary is already one path. The ADR fixes it as the only path.

| Stage | Owner | State effect |
| --- | --- | --- |
| prepare | `src/core/commands/prepare.ts` | none; assigns `id`, `at`, `rulesetVersion`, `fingerprint` |
| validate | `validateCommand` in `src/core/engine/commands.ts` | none; runs the command on a clone |
| draft apply | `runDraft` in `src/core/engine/commands.ts` | clone only; runs `runCommand` |
| invariants | `effectGraph` and `checkInvariants` in `runDraft` | clone only; a violation discards the draft |
| commit | `applyCommand` in `src/core/engine/commands.ts` | replaces the live state after success; records `state.applied` and one journal entry |
| persist | `src/application/store/create-game-store.ts` | writes `pg.game.v4`; restores the pre-command clone on failure |
| publish | `createGameStore` | new snapshot and notification |

- `prepareCommand` rejects an unknown type, an unknown payload field, a wrong
  payload type, an invalid timestamp and an unsupported ruleset version before
  any state is read.
- `fingerprintOf(type, payload, rulesetVersion)` binds the id to its content.
  A repeated id with a different fingerprint returns `command-id-conflict`.
- A repeated id with the same fingerprint is idempotent. `state.applied` is the
  record. A record-only command uses its journal entry.
- The expected version is the command `rulesetVersion` plus the saved schema
  version. `RULESET_VERSION` and `SUPPORTED_RULESET_VERSIONS` live in
  `src/core/engine/commands.ts`. `SCHEMA_VERSION` and the key `pg.game.v4` live
  in `src/core/model/state.ts`. This ADR adds no optimistic game-revision
  precondition.
- `previewCommand` builds a clone, runs the same command and returns derived
  events, changes and a future view. It never commits.
- A rejected command and a `requires-storyteller-choice` result return before
  `replaceContents`. They leave the live state, journal, log and revision
  unchanged.
- A failed save restores the pre-command clone and reports `persist-failed`.
  The live game does not keep a half-applied command.

### 5. Execution context ports

The target is one injected context per command. Domain handlers receive it. They
do not read the platform directly. This is the implemented contract
(`src/core/model/ports.ts`):

```ts
export interface CommandExecutionContext {
  readonly clock: { readonly now: () => string };
  readonly rng: { readonly next: () => number };
  readonly idFactory: { readonly suffix: (length: number) => string };
}
```

- `runDraft` builds the record with `createExecutionContext(clock, rng)` and
  passes it to `runCommand` and every domain function below it. The store keeps
  its own runtime; nothing module-level holds the current context.
- No domain handler calls `Date.now`, `new Date()` for game time, or
  `Math.random`. `src/core/model/state.ts` has no clock override,
  `src/core/engine/execution.ts` is removed, and `addLog`, `kill`, `checkWin`,
  `setWinner`, the night queue, the day actions and the BMR/S&V outcome paths all
  take the record explicitly.
- The platform default `systemPorts` is an immutable value used only by direct
  engine calls outside a command (tests and host tooling). An applied or
  previewed command always passes its own ports.
- State ids (`death-*`, `eff-*`, `log-*`) come from `idFactory.suffix`, seeded by
  the command runtime. A role cannot choose an id.

Compatibility rules:

| Artifact | Rule |
| --- | --- |
| Journal entry | Keep `id`, `type`, `payload`, `at`, `rulesetVersion`, `fingerprint`, `undoable` |
| Preview/apply timestamp | Keep the capture key `id + "|" + fingerprint + "|" + hash(canonical state)` |
| Replay | Replay each entry through `applyCommand` with the same seeded stream; a different result is `journal-dependency` |
| Generated ids | Derive from the seeded command stream; do not add time or global counters |
| Saved state | Keep `pg.game.v4`; no new field is required for the ports |

### 6. Lifecycle

The phase union is explicit and stays a plain union. There is no XState and no
new state machine dependency.

```text
setup -> deal -> seat -> night <-> day -> over
```

| Transition | Owner | Source phases and guard |
| --- | --- | --- |
| `setup -> deal` | `dealGame` in `setup.ts` | `setup`, `deal` or `seat`; a valid bag and seat count |
| `deal/seat -> night` | `startGame` in `setup-commands.ts`, `startNight` in `night.ts` | `setup`, `deal`, `seat` or a resumable `night`; secrets are complete; no winner |
| `night -> day` | `endNight` in `night.ts` | `night` only; every queued step is done or skipped; no pending Demon heir |
| `day -> night` | `endDay` in `day.ts` | `day` only; no pending madness review; no winner |
| any -> `setup` | `bagUpdate` in `setup-commands.ts` | a `resetRoster` or `count` reset; no other bag edit reaches a running game |
| any -> `over` | `setWinner` in `death.ts` | a declared win reason |
| `over -> day/night` | `manualCorrection` in `corrections.ts` | the cleared-winner correction |

- `src/core/engine/lifecycle.ts` owns `COMMAND_PHASES`, the phase list for every
  command type, and `lifecycleGuard`. A phase-sensitive handler calls the guard
  before it writes; a wrong-phase command is rejected with no state change.
- A screen does not change `state.phase`. Non-phase preconditions
  (`day.open`, `day.ended`, step existence, nomination existence) stay in the
  handler that owns them.
- Same-edition custom scripts use the normal path. The script edition predicates
  (`isBmrScript`, `isSnvScript`) select the queue and the completion function.
- `manualOnly` is legal only for a mixed-edition script. The model rejects the
  flag on a single-edition pool and clears a stray legacy flag on load
  (`src/core/model/state.ts`, `normalizeScript` in `setup-commands.ts`). A
  manual-only game has no automatic night queue (`buildNightQueue` returns
  `[]`), no automatic win (`checkWin` returns `null`), and no automatic secret
  resolution. The host records effects and the winner.
- `over` is terminal for commands that change play. The cleared-winner
  correction is the one escape back to `day` or `night`; `setWinner` sets
  `phase = "over"` and closes review.

### 7. Versioning and migration

| Version | Owner | Rule |
| --- | --- | --- |
| `pg.game.v4` | `src/core/model/state.ts` | one storage key; no slice changes it |
| `SCHEMA_VERSION = 4` | `src/core/model/state.ts` | one saved-state shape; a new field is optional on load first |
| `RULESET_VERSION` | `src/core/engine/commands.ts` | one accepted ruleset string per build |
| `SUPPORTED_RULESET_VERSIONS` | `src/core/engine/commands.ts` | a command with another version is rejected before state |
| `state.v` | `src/core/model/state.ts` | validates as 4; older saves migrate on import |

Every slice proves preservation in the same order:

1. Add a characterization test that pins the current outcome, command status,
   queue, note, journal and state fields.
2. Run it before the move and record the result.
3. Move one role or one mechanic into the contract.
4. Run the same test and the full suite.
5. Compare `canonicalState` before and after for the same fixture.
6. For a saved game, export, import and replay: the canonical state must match.
7. Keep every existing error code and winner reason.

No slice changes a pinned rule. No slice adds a state field without a migration
rule. No slice changes a command payload, the storage key or the export
envelope.

## Migration order

Each slice is one owner-reviewed pull request. A slice is behavior-preserving
unless its own OpenSpec change proves a rule change. A slice may not merge out
of order with its base.

| Slice | Scope | Contract addition | Proof |
| --- | --- | --- | --- |
| 0 (this change) | ADR, OpenSpec change, architecture test | none | `node --test src/core/roles/architecture.test.ts`; existing suite |
| 1 | Removed the two role-to-engine exceptions | `DeathContext` facts; `imp` and `sv-common` are engine-free | architecture test with an empty exception map; `bmr.test.ts`, `snv.test.ts` |
| 2 | Night steps: Trouble Brewing remainder | `night-step` arm; one role per review | characterization tests per role; `engine.test.ts` |
| 3 | Night steps: Bad Moon Rising remainder | `night-step` arm plus effect intents as needed | `bmr.test.ts`, `engine/ability.ts` tests |
| 4 | Night steps: Sects & Violets remainder | `night-step` arm; retained-ability facts | `snv.test.ts` |
| 5 | Information and host choice | `information` and `adjudication` arms; Dreamer, Savant, Mathematician, Artist | `snv.test.ts`, `bmr.test.ts`, `engine.test.ts` |
| 6 | Death triggers, execution and transformation | `death-trigger`, `execution` and `transformation` arms; Assassin, Mastermind, Evil Twin, Barber, Pit-Hag, Snake Charmer, Fang Gu | `bmr.test.ts`, `snv.test.ts`, `engine.test.ts` |
| 7 | Win contributions | `win` arm; Mayor, Saint, Mastermind, Vortox, Evil Twin, Klutz | `engine.test.ts`, `bmr.test.ts`, `snv.test.ts` |
| 8 | Day actions | `day-action` arm; Slayer, Juggler, Gossip, Moonchild, Klutz, Tinker, madness | `engine.test.ts`, `snv.test.ts` |
| 9 | Lifecycle and ports | `CommandExecutionContext` injection; `withClock` and the global active context removed | `commands.test.ts`, `create-game-store.test.ts`, replay fixtures — implemented |

Slice 1 started with `imp` and `sv-common`, because the architecture test could
not shrink its exception map until they were clean; that map is now empty.
Slice 9 was last because it touched every handler and needed the smallest
reviewable diff per command family.

The existing `openspec/changes/role-capability-contract`,
`openspec/changes/pukka-capability`, `openspec/changes/artist-savant-workflows`
and `openspec/changes/mathematician-abnormal-count` remain the owners of their
own behavior. This ADR defines the contract they fill in.

## Non-goals

- A rewrite of all 72 role modules in one pull request.
- An event bus, a pub/sub layer or a second engine.
- A second journal, a second effect graph or a second death path.
- A backend, a database, network play or a new runtime dependency.
- XState or another state-machine library.
- A new state field, storage key, schema version or command payload in this
  slice.
- A game-rule change, a new pin or a house rule.
- A UI redesign.

## Consequences

- The architecture test makes the role-to-engine edge visible in CI. A new
  import fails with the file and specifier.
- The capability model stays small per slice. A role owns its rule. The engine
  owns the shared mechanic.
- One coordinator keeps attack, protection, death, character change and win in
  one order. Replay, undo and the journal keep one owner.
- The cost is one `capabilities` lookup per step and one context object per
  capability-driven step.
- The legacy fields and the new capabilities coexist during migration. Review
  must reject a role that keeps both for one behavior.

## Risks and trade-offs

- A capability arm without a real consumer would become scaffolding. The rule
  is one arm per migrated role.
- A read-only context can still hide a needed fact and force a role to ask the
  host. That is the correct direction for a registration or a false answer.
- The ports slice touches many handlers. It must land after the behavior moves
  so its diff is mechanical.
- The architecture test is a textual scan. A runtime-assembled import can
  bypass it. Review remains the second control.

## Verification

- `node --test src/core/roles/architecture.test.ts`
- `openspec validate --changes --strict`
- `node scripts/openspec-check.mjs`
- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run format:check`
