# Role Modules Specification

## Purpose

Defines the per-role ownership contract for the game engine: one module for each
supported character, a registry the type checker keeps complete, and the two
behavior points a module owns. Game outcomes stay identical.

## Requirements

### Requirement: One module per supported role

The engine SHALL keep exactly one role module for each of the 72 supported
characters. The module set SHALL be checked against the supported role list at
compile time.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177)
**Tests**: `src/core/roles/registry.test.ts`

#### Scenario: A supported role has no module

- **WHEN** a supported role is removed from the module registry
- **THEN** `npm run typecheck` reports the missing registry property and fails

#### Scenario: A module names an unsupported role

- **WHEN** a module declares an identifier outside the supported role list
- **THEN** `npm run typecheck` rejects the registry entry

#### Scenario: The registry is complete

- **WHEN** the test suite loads the registry
- **THEN** it has one entry per supported role, and each entry carries its identifier and edition

### Requirement: A role module declares its night step

Each role module SHALL own the night step its role contributes: the target
mode, target bounds, optional and lethal flags, and any night-dependent
presence rule. A module SHALL declare the step either as a `night-step`
capability or, until it moves, in its night step fields. The night queue SHALL
be built from those declarations through the one lookup.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/roles/night-step.test.ts`

#### Scenario: A waking role contributes its step

- **WHEN** the night queue is built and a role's player is in play and may wake
- **THEN** the step carries the target mode and bounds declared by that role's module

#### Scenario: A role does not wake

- **WHEN** the role is passive, absent, or dead and not death-triggered
- **THEN** the role adds no step to the queue

### Requirement: A role module declares its death behavior

Role-specific death handling SHALL run from the dead role's module through the
`death-trigger` capability, SHALL return a read-only `inherit`, `choose-heir` or
`no-effect` decision, and SHALL keep the existing state effects, result codes,
journal entries, pending heir payload and winner reasons. The engine coordinator
SHALL apply the decision through the shared succession path.

**Source**: [Issue #212](https://github.com/hose1021/grimoria/issues/212), [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116), [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A role with a death hook dies

- **WHEN** a role that declares a death capability dies
- **THEN** the capability returns its decision, the coordinator applies it, and the shared death bookkeeping still runs

#### Scenario: A role without a death hook dies

- **WHEN** a role that declares no death capability dies
- **THEN** only the shared death bookkeeping runs

#### Scenario: The Imp dies with a living Scarlet Woman

- **WHEN** the Imp dies while a living, unimpaired Scarlet Woman is in play and at least five players lived before the death
- **THEN** the capability returns `inherit` for the Scarlet Woman and the coordinator makes her the Demon

#### Scenario: The Imp self-kills with several Minions

- **WHEN** the Imp self-kills with more than one living Minion
- **THEN** the capability returns `choose-heir` with the living Minions and the engine records the existing host choice

#### Scenario: The dead role has no capability

- **WHEN** another Demon dies
- **THEN** the engine applies the Imp's fallback death capability exactly as the previous shared hook

### Requirement: Game outcomes are unchanged

The refactor SHALL NOT change any night queue, command status, state field,
winner reason or error code for the same starting state.

**Source**: [Issue #177](https://github.com/hose1021/grimoria/issues/177) "behaviour-preserving refactor"
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: The same game produces the same queue

- **WHEN** a seeded game for each supported scenario builds its night queue
- **THEN** the queue equals the one the previous implementation built

#### Scenario: The same command produces the same result

- **WHEN** a command is validated and applied before and after the refactor
- **THEN** the status, state and journal entries are identical

### Requirement: A role module may declare a resolvable ability

The role module contract SHALL allow a role to declare an ability resolver, on
a `night-step` capability and in no other field. The resolver SHALL receive
only read-only facts: the actor, the validated targets, the host's character
answer, the host's answer for who is drunk, the impairment fact and an
actual-character lookup; it SHALL NOT receive the game state. A module that declares no resolver SHALL keep its
existing engine path.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200); `Gambler` r3073; [Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768); `docs/adr/0002-engine-contracts.md` §2
**Tests**: `src/core/roles/gambler/role.test.ts`, `src/core/roles/sailor/role.test.ts`, `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/night-step.test.ts`

#### Scenario: A migrated role declares its resolution

- **WHEN** the Gambler module is loaded
- **THEN** it declares an ability resolver on its `night-step` capability, and the engine keeps no Gambler resolution branch

#### Scenario: The resolver reads facts, not state

- **WHEN** a resolver builds a decision for a target and a character answer
- **THEN** it uses the actor, the targets, the answer, the impairment fact and the actual character of a seat
- **AND** the contract exposes no game state that the resolver could mutate

#### Scenario: A resolver outside a capability

- **WHEN** a module declares a resolver in a field of its own
- **THEN** the type check rejects the module

#### Scenario: The host's drunk answer

- **WHEN** a Sailor or Innkeeper step is completed with the host's answer for who is drunk
- **THEN** the resolver reads the answer as a fact and cannot change it
- **AND** the command path, not the role, checks that the answer names a player the step allows

### Requirement: The engine applies ability intents through shared mechanics

The engine SHALL apply every effect an ability returns through the existing
shared mechanic, in the returned order, and SHALL record the same death entry,
note and journal output the previous implementation produced. A `suppressed`
decision SHALL write the shared impairment note and change nothing else. A
resolver SHALL NOT write state, set a winner or add its own journal line.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200); `Gambler` r3073
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/roles/gambler/role.test.ts`

#### Scenario: A wrong guess kills the Gambler

- **WHEN** the Gambler guesses a character the chosen player does not have
- **THEN** the actor dies through the shared death path, and the death entry records cause `ability`, ability `gambler` and the Bad Moon Rising marker

#### Scenario: A correct guess has no effect

- **WHEN** the Gambler guesses the character the chosen player actually has
- **THEN** the ability returns no effect and the actor stays alive

#### Scenario: A dead player is a legal target

- **WHEN** the Gambler chooses a player who is already dead
- **THEN** the step completes and the guess is compared with that player's actual character

#### Scenario: Impairment suppresses the ability

- **WHEN** the Gambler is drunk or poisoned when the step completes
- **THEN** the engine writes the shared `note.abilityFailed` note and no death occurs

#### Scenario: Existing outcomes do not change

- **WHEN** the same Gambler game is completed before and after the migration
- **THEN** the queue, status, state, notes and journal entries are identical

### Requirement: Pukka delayed poison capability

The Pukka role module SHALL resolve its night step through the capability
contract. It SHALL receive the night number and the pending deaths it owns, and
SHALL return the poison, delayed death, suspension, poison release and previous
death resolution as typed intents. The engine SHALL apply those intents through
the shared effect helpers in the order returned, with no Pukka branch in the
edition file.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Issue #200](https://github.com/hose1021/grimoria/issues/200); [ADR 0001](../adr/0001-role-capability-contract.md)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: New poison before the previous death

- **WHEN** a healthy Pukka chooses a new target and owns a pending death
- **THEN** the resolver returns the new poison, the new delayed death and the
  resolution of the old pending, in that order, and the engine applies them

#### Scenario: Self-target suspension

- **WHEN** the Pukka chooses itself
- **THEN** the resolver treats the new poison as first, suspends the previous
  death until the source is healthy, and releases the source's other poisons

#### Scenario: Impaired Pukka

- **WHEN** the Pukka is drunk or poisoned
- **THEN** the resolver returns the `suppressed` decision, suspends only the due
  pending deaths, writes `note.pukkaSuspended` and no new poison or kill

#### Scenario: Effect identity

- **WHEN** the resolver output is applied
- **THEN** the poison and pending-death ids, fields, step result and command
  outcome are the same as before the migration

### Requirement: Delayed-effect intents and suppressed note

The capability contract SHALL expose `poison`, `delay-death`, `suspend-death`,
`release-poisons` and `resolve-death` intents, SHALL let an `effects` decision
carry a rule note and a step result, and SHALL let `suppressed` carry
suspension intents, a rule note and a result.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200), [ADR 0001](../adr/0001-role-capability-contract.md)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/roles/gambler/role.test.ts`, `src/core/engine/bmr.test.ts`

#### Scenario: Built-in note

- **WHEN** a resolver returns a decision without a note
- **THEN** the engine writes its generic failure note for `suppressed`

#### Scenario: Rule note and result

- **WHEN** a resolver returns a note and a result
- **THEN** the engine writes the rule note and stores the result, adding the
  actual death when a `resolve-death` intent kills

### Requirement: A role module returns intents, never shared mechanics

A role module SHALL express its rule as a typed decision over read-only facts.
It SHALL NOT call a shared resolution writer, mutate a game record, or keep a
second implementation of protection, death, execution, transformation, effect
resolution or win for the engine to call. A role-specific predicate that only
reads facts is allowed.

**Source**: `docs/adr/0002-engine-contracts.md` §1 and §2; [Issue #212](https://github.com/hose1021/grimoria/issues/212)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/engine/coordinator.test.ts`

#### Scenario: The engine applies a returned intent

- **WHEN** a capability resolver decides that a player dies
- **THEN** it returns a `kill` intent and the engine records the death through the shared death path

#### Scenario: A role calls a shared writer

- **WHEN** a role module calls a shared writer or imports the engine to reach one
- **THEN** the architecture test and the ownership check fail

#### Scenario: A role keeps its own fact predicate

- **WHEN** a role reads deaths, effects or seat order to answer its own rule question
- **THEN** the read is allowed, because it neither writes state nor replaces a shared mechanic

### Requirement: A role module declares its registration options

A role that can change how abilities register SHALL declare an `adjudication`
capability with the `registration` case and its legal values. The engine SHALL
read those values from the role module, SHALL keep the host-choice case, reason,
journal and answer validation, and SHALL return no values for a role without the
capability.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3105](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3105)
**Tests**: `src/core/engine/host-choice.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Spy registers good

- **WHEN** the host chooses a Spy registration
- **THEN** the engine offers only `good` from the Spy module

#### Scenario: Recluse registers evil or demon

- **WHEN** the host chooses a Recluse registration
- **THEN** the engine offers only `evil` and `demon` from the Recluse module

#### Scenario: A role without the capability

- **WHEN** another role is named for a registration
- **THEN** the engine offers no values and rejects the answer

#### Scenario: A registration is answered

- **WHEN** the host supplies a legal value
- **THEN** the existing command, journal and information behavior is unchanged

### Requirement: No-one record intent

The capability contract SHALL expose a `record-no-one` intent that says
whether the acting seat chose no one tonight. The engine SHALL write it on
the acting seat as the record of the acting role that the step builder
reads for the next night's step. The intent SHALL NOT name the record or
the seat it is written on.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: No one chosen

- **WHEN** a resolver returns a `record-no-one` intent that says the seat chose no one
- **THEN** the acting seat's record for its role says so, and no other seat is written

#### Scenario: A player chosen

- **WHEN** the intent says the seat chose a player
- **THEN** the record says the seat did not choose no one

#### Scenario: The ability failed

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** the record is written as on the working path

#### Scenario: Another record or seat

- **WHEN** a role names the record or the seat to write
- **THEN** the type check rejects the module

### Requirement: Choices record intent

The capability contract SHALL expose a `record-choices` intent that names
the players the acting seat chose tonight. The engine SHALL keep the record
it replaces as last night's choice, then write tonight's players and night,
on the acting seat under the acting role and in the key order of the
stored record. The intent SHALL NOT name the record, the seat or last
night's choice.

**Source**: [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The first record

- **WHEN** a resolver returns a `record-choices` intent for two players on night N and the seat has no record yet
- **THEN** the record names no players for last night, no night for them, the two players in the host's order and night N, in that key order

#### Scenario: The next record

- **WHEN** the intent names one player on night N+1
- **THEN** last night's record names the two players of night N, and tonight's names the one player and night N+1

#### Scenario: The engine's copy

- **WHEN** the list of players the role returned changes after the step
- **THEN** the record does not change

#### Scenario: Another record, seat or night

- **WHEN** a role names the record, the seat or last night's players
- **THEN** the type check rejects the module

### Requirement: The Tinker declares its step from the second night

The Tinker role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. The resolver SHALL change nothing; the host
SHALL still mark the Tinker's death on the outcome of the step.

**Source**: [Tinker r1782](https://wiki.bloodontheclocktower.com/index.php?title=Tinker&oldid=1782); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/tinker/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Tinker in play
- **THEN** the queue holds no Tinker step, and the lookup returns no step and no resolver for that night

#### Scenario: The step is completed

- **WHEN** the Tinker's step is completed on a later night
- **THEN** no record, effect or death is written by the completion, and the step keeps the shared note and log line

#### Scenario: The host marks the death

- **WHEN** the host marks the Tinker's death on the step's outcome
- **THEN** the Tinker dies by ability, as before

### Requirement: The Po declares its step from the second night

The Po role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. Each completed step SHALL record whether the
Po chose no one, also when the Po is drunk or poisoned. After a night with
no choice the next step SHALL take three players.

**Source**: [Po r3104](https://wiki.bloodontheclocktower.com/index.php?title=Po&oldid=3104); [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/po/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: No one chosen

- **WHEN** the Po chooses no one on night N, sober or drunk or poisoned
- **THEN** the Po's step on night N+1 takes exactly three players

#### Scenario: Players chosen

- **WHEN** the Po chooses one or three players, or the Goon
- **THEN** the Po's next step takes no player or one

#### Scenario: The Po kept asleep

- **WHEN** the Po chose no one on night N and the Exorcist keeps it asleep on night N+1
- **THEN** the Po's step on night N+2 takes exactly three players

### Requirement: The Shabaloth declares its step from the second night

The Shabaloth role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. A sober and healthy Shabaloth SHALL record its
two players with last night's, so the outcome can regurgitate a player
chosen last night; a drunk or poisoned Shabaloth SHALL record nothing, as
before.

**Source**: [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790); [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/shabaloth/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Two players recorded

- **WHEN** a sober and healthy Shabaloth chooses two players on night N
- **THEN** its record names them and night N, and the players of the night before as last night's

#### Scenario: A regurgitation

- **WHEN** the host regurgitates a dead player the Shabaloth chose on night N, on night N+1
- **THEN** the outcome accepts it and the player is alive again

#### Scenario: A drunk or poisoned Shabaloth

- **WHEN** a drunk or poisoned Shabaloth, or one who chose the Goon, completes its step
- **THEN** its record is unchanged

### Requirement: Moving the Tinker, the Po and the Shabaloth changes no outcome

Moving the Tinker's, the Po's and the Shabaloth's resolution to the
`night-step` capability SHALL NOT change a night queue, a step record, an
effect with its id and flag, a role's record, a death, a log line, a
command result or the order of draws from the command ports for the same
starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Tinker, Po or Shabaloth step is completed before and after the move
- **THEN** the step, the effects, the role's record with its key order, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Tinker, Po and Shabaloth steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: A role capability names its step kind

The role module contract SHALL express each contribution as a discriminated
capability for one step kind: night step, day action, death trigger, execution,
information, adjudication, transformation or win. A capability SHALL receive
only the read-only facts of its kind and return a typed decision. It SHALL NOT
be one optional interface carrying every hook. A role SHALL use its legacy
field or its capability for one behavior, never both.

**Source**: `docs/adr/0002-engine-contracts.md` §2; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/roles/ability.test-d.ts`, `src/core/roles/gambler/role.test.ts`, `src/core/roles/pukka/role.test.ts`, `src/core/roles/architecture.test.ts`

#### Scenario: A night step declares its capability

- **WHEN** a role owns a night step
- **THEN** its capability names the night step and its first/other timing, and its resolver reads only the night context

#### Scenario: A context exposes no game state

- **WHEN** a capability resolver reads its context
- **THEN** the context offers the actor, targets, impairment fact and named lookups, and exposes no mutable game state

#### Scenario: A role does not use both paths

- **WHEN** a role migration moves one behavior into a capability
- **THEN** the same slice deletes the legacy field for that behavior

### Requirement: Role modules do not import the engine

A module under `src/core/roles` SHALL NOT import a module under
`src/core/engine`, except for the exact imports recorded in ADR 0002:
`src/core/roles/imp/role.ts` importing `engine/becoming.ts` and
`engine/effects.ts`, and `src/core/roles/sv-common.ts` importing
`engine/context.ts` and `engine/retention.ts`. `src/core/roles/registry.ts`
SHALL import only `src/core/roles` and `src/core/model`. The exception list
SHALL shrink with each removal slice and SHALL NOT grow.

**Source**: `docs/adr/0002-engine-contracts.md` §1; [Issue #209](https://github.com/hose1021/grimoria/issues/209)
**Tests**: `src/core/roles/architecture.test.ts`, `src/core/roles/registry.test.ts`

#### Scenario: A new role imports the engine

- **WHEN** a role module imports any engine module outside the documented entries
- **THEN** `node --test src/core/roles/architecture.test.ts` fails and names the file and the specifier

#### Scenario: A documented exception adds an import

- **WHEN** `src/core/roles/imp/role.ts` imports a third engine module
- **THEN** the architecture test fails, because the exception is an exact list

#### Scenario: The registry leaves its layer

- **WHEN** `src/core/roles/registry.ts` imports an application, infrastructure, UI or entry module
- **THEN** the architecture test fails

### Requirement: A new capability arm arrives with its role

A capability arm SHALL be added only with the first role that needs it. A slice
that adds an arm SHALL record a characterization result before and after the
move. The slice SHALL NOT change a queue, command status, state field, journal
entry, note or winner reason for the same starting state.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/engine/snv.test.ts`, `src/core/engine/commands.test.ts`

#### Scenario: An arm without a consumer

- **WHEN** a change adds a capability arm that no migrated role uses
- **THEN** review rejects it as unused scaffolding

#### Scenario: A migrated role keeps its outcome

- **WHEN** a role moves into a capability
- **THEN** the characterization test passes before and after, with the same canonical state and journal

### Requirement: A role module declares its execution contribution

A role that changes the outcome of an execution SHALL declare an `execution`
capability. The engine SHALL pass read-only facts and SHALL keep the command
validation, the host's survival choice, the death path and the journal. A
`survives` decision SHALL mean the option is legal; it SHALL NOT override the
host's choice.

**Source**: [Pacifist r2601](https://wiki.bloodontheclocktower.com/index.php?title=Pacifist&oldid=2601)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A good player with a sober Pacifist

- **WHEN** a good player is executed and a living, unimpaired Pacifist is in play
- **THEN** the Pacifist capability returns `survives` and the host's survival flag is accepted

#### Scenario: No living Pacifist

- **WHEN** the execution has no living, unimpaired Pacifist
- **THEN** the capability returns no effect and the survival flag is rejected with `error.57`

#### Scenario: An evil target

- **WHEN** an evil player is executed
- **THEN** the capability returns no effect and the survival flag is rejected

#### Scenario: The host declines survival

- **WHEN** the survival option is legal but the host does not use it
- **THEN** the normal execution death path runs unchanged

### Requirement: Madness intent

The capability contract SHALL expose a `madness` intent that names a
player, a character and the first moment the madness no longer applies.
The engine SHALL write the madness token under the acting ability, with an
id made of the acting ability, the acting seat, the player and the night,
the acting seat as its source and the current moment as its start, and
SHALL keep a copy of the end.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A working ability

- **WHEN** a resolver returns a `madness` intent for player P, character C and an end at dawn of day N+1, on night N
- **THEN** one active token is written with the id of the ability, the seat, P and N, the character C, the seat as source, the night as start and the end, and nothing is drawn from the command ports

#### Scenario: The role's copy

- **WHEN** the end the role returned changes after the step
- **THEN** the token's end does not change

### Requirement: The madness token is the engine's to write

The engine SHALL write the madness token's keys in the order of the stored
token and SHALL write nothing on the `suppressed` path. The intent SHALL
NOT name the id, the owning ability, the source or whether the token
applies.

**Source**: `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A failed ability

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** no token is written

#### Scenario: Another id, owner, source or state

- **WHEN** a role names the token id, the owning ability, the source or whether the token applies
- **THEN** the type check rejects the module

### Requirement: The Cerenovus declares its step on every night

The Cerenovus role module SHALL declare its step and its resolver on one
`night-step` capability for every night and SHALL NOT declare a legacy
night step. A sober and healthy Cerenovus that names a player and a good
character SHALL make that player mad about the character until the next
dawn.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048); [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/cerenovus/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** a night starts with a living Cerenovus
- **THEN** the queue holds its step, taking one player, with the good characters of the script to choose

#### Scenario: A player made mad

- **WHEN** a sober and healthy Cerenovus names a player and a good character on night N
- **THEN** the player is mad about that character until the dawn of day N+1, and the step's note says so

#### Scenario: A Cerenovus the Vigormortis killed

- **WHEN** the Vigormortis has killed the Cerenovus and still lives
- **THEN** the dead Cerenovus wakes and its choice makes the player mad

### Requirement: A Cerenovus without a character or an ability makes nobody mad

A Cerenovus that names no character, or a drunk or poisoned Cerenovus,
SHALL make nobody mad and SHALL get the shared step note. The completion
SHALL still refuse a character that is not a Townsfolk or an Outsider of
the script with `error.2`.

**Source**: [Cerenovus r3048](https://wiki.bloodontheclocktower.com/index.php?title=Cerenovus&oldid=3048); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/cerenovus/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: No character, or an impaired Cerenovus

- **WHEN** the Cerenovus names no character, or is drunk or poisoned
- **THEN** no token is written and the step gets the shared note

#### Scenario: An evil character

- **WHEN** the Cerenovus names a character that is not good
- **THEN** the command is rejected with `error.2` and the state is unchanged

### Requirement: Moving the Cerenovus changes no outcome

Moving the Cerenovus's resolution to the `night-step` capability SHALL NOT
change a night queue, a step record, an effect with its id and flag, a
seat's record, a death, a log line, a command result or the order of draws
from the command ports for the same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same Cerenovus step is completed before and after the move
- **THEN** the step, the madness token with its id, the seat's record, the log line and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Cerenovus steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: The Sects & Violets step completion hands a migrated role to the coordinator

When a Sects & Violets step is completed and the step's role module owns a
resolver for that night, the step completion SHALL run that resolver
through the capability coordinator after the seat's record exists, and
SHALL NOT run an edition branch for the step. A role module without a
resolver SHALL keep the existing completion.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/fanggu/role.test.ts`, `src/core/roles/nodashii/role.test.ts`, `src/core/roles/vigormortis/role.test.ts`, `src/core/roles/vortox/role.test.ts`

#### Scenario: A migrated role

- **WHEN** the step of a Sects & Violets role whose module owns a resolver is completed
- **THEN** the resolver's decision is applied through the coordinator, and the step finishes through the shared path

#### Scenario: A role that has not moved

- **WHEN** the step of a Sects & Violets role without a resolver is completed
- **THEN** its completion is the one it had

### Requirement: The four Sects & Violets Demons declare their step from the second night

The Fang Gu, the No Dashii, the Vigormortis and the Vortox role modules
SHALL each declare their step and their resolver on one `night-step`
capability for the nights after the first, choosing one player who may
die, and SHALL NOT declare a legacy night step. The resolver SHALL change
nothing, healthy or impaired; the host SHALL still mark the death on the
outcome of the step, which SHALL still refuse the kill of a drunk or
poisoned Demon.

**Source**: [Fang Gu r2974](https://wiki.bloodontheclocktower.com/index.php?title=Fang_Gu&oldid=2974); [No Dashii r3158](https://wiki.bloodontheclocktower.com/index.php?title=No_Dashii&oldid=3158); [Vigormortis r3015](https://wiki.bloodontheclocktower.com/index.php?title=Vigormortis&oldid=3015); [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/fanggu/role.test.ts`, `src/core/roles/nodashii/role.test.ts`, `src/core/roles/vigormortis/role.test.ts`, `src/core/roles/vortox/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with one of the four Demons in play
- **THEN** the queue holds no step for it, and the lookup returns no step and no resolver for that night

#### Scenario: A later night

- **WHEN** a later night starts
- **THEN** the Demon's living holder has a step that takes one player and can kill

#### Scenario: The step is completed

- **WHEN** the Demon's step is completed, sober or drunk or poisoned
- **THEN** no record, effect or death is written by the completion, and the step keeps the shared note and log line

#### Scenario: The host marks the death

- **WHEN** the host marks the chosen player's death on the step's outcome
- **THEN** the player dies by the Demon's ability, as before

#### Scenario: A drunk or poisoned Demon

- **WHEN** the host marks a death on the outcome of a drunk or poisoned Demon's step
- **THEN** the outcome is refused with `error.52` and the state is unchanged

#### Scenario: A new holder

- **WHEN** the Fang Gu jumps into an Outsider, or a Snake Charmer takes the Demon's character
- **THEN** the new holder wakes as that Demon from the next night that lists it

### Requirement: Moving the four Sects & Violets Demons changes no outcome

Moving the Fang Gu's, the No Dashii's, the Vigormortis's and the Vortox's
step to the `night-step` capability SHALL NOT change a night queue, a step
record, an effect with its id and flag, a seat's record, a death, a log
line, a command result or the order of draws from the command ports for
the same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same Demon step and outcome are recorded before and after the move
- **THEN** the step, the effects, the seat's record, the deaths, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Sects & Violets Demon steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: The Sects & Violets information roles declare their step on the night-step capability

The Clockmaker, the Dreamer, the Evil Twin, the Flowergirl, the
Mathematician, the Oracle and the Town Crier role modules SHALL each
declare their step on one `night-step` capability and SHALL NOT declare a
legacy night step: the Clockmaker and the Evil Twin for the first night
only, the Dreamer and the Mathematician for every night, and the
Flowergirl, the Oracle and the Town Crier for every night except the
first.

**Source**: [Clockmaker r2967](https://wiki.bloodontheclocktower.com/index.php?title=Clockmaker&oldid=2967); [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904); [Evil Twin r3101](https://wiki.bloodontheclocktower.com/index.php?title=Evil_Twin&oldid=3101); [Flowergirl r2907](https://wiki.bloodontheclocktower.com/index.php?title=Flowergirl&oldid=2907); [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); [Oracle r2909](https://wiki.bloodontheclocktower.com/index.php?title=Oracle&oldid=2909); [Town Crier r3145](https://wiki.bloodontheclocktower.com/index.php?title=Town_Crier&oldid=3145); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/clockmaker/role.test.ts`, `src/core/roles/dreamer/role.test.ts`, `src/core/roles/eviltwin/role.test.ts`, `src/core/roles/flowergirl/role.test.ts`, `src/core/roles/mathematician/role.test.ts`, `src/core/roles/oracle/role.test.ts`, `src/core/roles/towncrier/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with the seven roles in play
- **THEN** the Evil Twin, the Clockmaker, the Dreamer and the Mathematician have a step, and the Flowergirl, the Oracle and the Town Crier do not

#### Scenario: A later night

- **WHEN** a later night starts
- **THEN** the Dreamer, the Flowergirl, the Town Crier, the Oracle and the Mathematician have a step, and the Clockmaker and the Evil Twin do not

#### Scenario: A Philosopher who gains one of the abilities

- **WHEN** a Philosopher gains the Oracle on a later night, the Clockmaker on a later night, or the Flowergirl on the first night
- **THEN** they wake for the Oracle in its slot that night, for the Clockmaker right after their own step, and for the Flowergirl from the next night

#### Scenario: A character the Pit-Hag creates

- **WHEN** the Pit-Hag makes a player the Town Crier or the Clockmaker on a later night
- **THEN** the new Town Crier wakes in its slot that night, and the new Clockmaker does not wake

### Requirement: The information roles keep their answers in the engine until their own change

Until their answers move, none of the seven information roles SHALL own a
night-step resolver, so the step completion keeps their stored answer and
the Mathematician's removal of the ABNORMAL marks.

**Source**: [Mathematician r3153](https://wiki.bloodontheclocktower.com/index.php?title=Mathematician&oldid=3153); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/mathematician/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: A completed step

- **WHEN** one of the seven steps is completed
- **THEN** it stores the answer computed for it and the shared note, writes no effect, and the Mathematician's step clears the ABNORMAL marks

### Requirement: Moving the information roles' steps changes no outcome

Moving the seven steps to the `night-step` capability SHALL NOT change a
night queue, a step record, a stored answer, an effect, a log line, a
command result or the order of draws from the command ports for the same
starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same information step is completed before and after the move
- **THEN** the step with its stored answer, the effects, the log line and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with these steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: Swap decision

The transformation contract SHALL expose a `swap` decision that names the
player the acting seat swaps characters with, whether the two also
exchange alignments, and whether the player is then poisoned for good by
the acting ability. The `no-effect` decision SHALL accept the reason
`not-demon`.

**Source**: [Snake Charmer r2905](https://wiki.bloodontheclocktower.com/index.php?title=Snake_Charmer&oldid=2905); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/snakecharmer/role.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A swap

- **WHEN** a transformation capability swaps the acting seat with a player, with alignments and the poison
- **THEN** its decision names the player and both facts, and nothing else

#### Scenario: Nothing happens

- **WHEN** a transformation capability returns `no-effect` with the reason `not-demon`
- **THEN** the type check accepts it

### Requirement: The engine applies a swap

The engine SHALL apply a `swap` decision through the shared swap and, when
the player is poisoned, SHALL write one permanent poison after the swap
with an id made of the acting ability, the acting seat and the player. The
decision SHALL NOT name the poison's id, its source or the seat the swap
starts from.

**Source**: [Snake Charmer r2905](https://wiki.bloodontheclocktower.com/index.php?title=Snake_Charmer&oldid=2905); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A swap with the poison

- **WHEN** the Snake Charmer's capability returns a swap with the Demon, with alignments and the poison
- **THEN** the two seats exchange characters and alignments, tonight's steps are requeued, and a permanent poison from the acting seat on the old Demon is written after the swap's reconciled effects

#### Scenario: Another id, source or seat

- **WHEN** a role names the poison's id or the seat the swap starts from, or leaves out the alignments
- **THEN** the type check rejects the module

### Requirement: The Snake Charmer swaps with a chosen Demon through its capabilities

The Snake Charmer role module SHALL declare its step on one `night-step`
capability for every night, without a night-step resolver, and its rule
on a `transformation` capability. A sober and healthy Snake Charmer who
chooses the Demon SHALL swap characters and alignments with it, and the
old Demon SHALL be poisoned for good.

**Source**: [Snake Charmer r2905](https://wiki.bloodontheclocktower.com/index.php?title=Snake_Charmer&oldid=2905); [Philosopher r2421](https://wiki.bloodontheclocktower.com/index.php?title=Philosopher&oldid=2421); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/snakecharmer/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The Demon chosen

- **WHEN** a sober and healthy Snake Charmer chooses the Demon on a later night
- **THEN** the Snake Charmer becomes the evil Demon and wakes as it tonight, and the Demon becomes the good, poisoned Snake Charmer

#### Scenario: A Philosopher with the ability

- **WHEN** a Philosopher with the Snake Charmer's ability chooses the Demon
- **THEN** the Philosopher becomes the Demon and the Demon becomes a poisoned Philosopher

### Requirement: A Snake Charmer who finds no Demon changes nothing

A player who is not the Demon, or a drunk or poisoned Snake Charmer, SHALL
change nothing and the step SHALL get the shared note. The command SHALL
still refuse a dead player with `error.55`.

**Source**: [Snake Charmer r2905](https://wiki.bloodontheclocktower.com/index.php?title=Snake_Charmer&oldid=2905); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/snakecharmer/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: No Demon, or an impaired Snake Charmer

- **WHEN** the Snake Charmer chooses a Minion, or is drunk or poisoned
- **THEN** no character, alignment or effect changes and the step gets the shared note

#### Scenario: A dead player

- **WHEN** the Snake Charmer chooses a dead player
- **THEN** the command is rejected with `error.55` and the state is unchanged

### Requirement: The Pit-Hag declares its step from the second night

The Pit-Hag role module SHALL declare its step on one `night-step`
capability for the nights after the first, without a night-step resolver,
beside its `transformation` capability, and SHALL NOT declare a legacy night
step. Its change, its no-op for a character in play, its failure while
impaired and a Demon it makes SHALL stay as before.

**Source**: [Pit-Hag r2998](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2998); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/pithag/role.test.ts`, `src/core/engine/snv.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Pit-Hag in play
- **THEN** the queue holds no Pit-Hag step

#### Scenario: A Demon made

- **WHEN** the Pit-Hag makes a player a Demon on a later night
- **THEN** the new Demon does not wake tonight and the host marks the night's deaths on the Pit-Hag's step

### Requirement: Moving the Snake Charmer and the Pit-Hag changes no outcome

Moving the two steps and the Snake Charmer's rule to capabilities SHALL NOT
change a night queue, a step record, a character, an alignment, an effect
with its id, flag and order, a death, a log line, a command result or the
order of draws from the command ports for the same starting state and the
same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: The same commands

- **WHEN** the same Snake Charmer or Pit-Hag step is completed before and after the move
- **THEN** the step, the seats, the effects in order, the log line and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with these steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: A role module declares its day action

A role with a daytime action SHALL declare a `day-action` capability that
receives read-only facts and returns `effects`, `record` or `no-effect`. The
engine coordinator SHALL keep validation, the public choice log, the shared
death path, Demon succession, the win check and the spent marker.

**Source**: [Slayer r3181](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3181)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A healthy Slayer shoots the Demon

- **WHEN** the Slayer target is alive and registers as a Demon
- **THEN** the capability returns a kill effect and the engine kills the target, resolves succession and checks the win

#### Scenario: A Slayer misses

- **WHEN** the target is not a Demon or is already dead
- **THEN** the capability returns a miss result, the shot is spent and the existing miss log is written

#### Scenario: An impaired Slayer

- **WHEN** the Slayer is drunk or poisoned
- **THEN** the capability returns an impaired miss, the shot is spent and the existing secret failure log is written

#### Scenario: A Recluse registers as the Demon

- **WHEN** the host answers that a healthy Recluse registers as a Demon
- **THEN** the capability receives that fact and returns the kill effect

### Requirement: A role module declares its win contribution

A role with a win contribution SHALL declare a `win` capability that receives
read-only facts and returns `win` or `no-effect`. The engine SHALL gather the
day's execution death, ask the executed role's module, and apply a `win`
decision through the shared winner path.

**Source**: [Saint r2865](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=2865)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A healthy Saint is executed

- **WHEN** the Saint dies by execution while healthy on the current day
- **THEN** the capability returns a win for evil with reason `saint` and the engine declares it

#### Scenario: An impaired Saint is executed

- **WHEN** the Saint is drunk or poisoned at the execution
- **THEN** the capability returns no effect and good does not lose from that execution

#### Scenario: The execution was on another day

- **WHEN** the execution death belongs to an earlier day
- **THEN** the engine does not pass it as the current execution and the Saint does not win

### Requirement: A role module declares its transformation rule

A role that changes another character SHALL declare a `transformation`
capability for its cause. The capability SHALL return `replace` or a `no-effect`
reason; the engine SHALL keep target and role validation, apply the shared
`replaceCharacter`, suppress a created Demon's wake and write the existing
notes.

**Source**: [Pit-Hag r2988](https://wiki.bloodontheclocktower.com/index.php?title=Pit-Hag&oldid=2988)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A legal Pit-Hag change

- **WHEN** the target and an absent character are chosen and the Pit-Hag is healthy
- **THEN** the capability returns `replace` and the engine changes the character atomically

#### Scenario: The character is already in play

- **WHEN** the chosen character has a holder
- **THEN** the capability returns `no-effect` with reason `in-play` and the engine writes the existing no-op note

#### Scenario: The Pit-Hag is impaired

- **WHEN** the Pit-Hag is drunk or poisoned
- **THEN** the step records the existing failure note without changing a character

#### Scenario: A Demon is created

- **WHEN** the replacement character is a Demon
- **THEN** the engine suppresses its wake and lets the host record the night deaths

### Requirement: A role module declares its information rule

An information role SHALL declare an `information` capability for its info
kind. The capability SHALL receive read-only neighbour, registration and
impairment facts and return an `answer` or `no-effect`; the engine SHALL keep
the step shape, the impaired/Vortox option handling and the public/private
projections.

**Source**: [Empath r3169](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=3169)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Empath counts evil neighbours

- **WHEN** the Empath step resolves with living neighbours
- **THEN** the capability counts those whose registered team is evil and returns the number

#### Scenario: Spy and Recluse registration

- **WHEN** the host records a Spy or Recluse registration
- **THEN** the capability receives the registered team through the context and the count reflects it

#### Scenario: An impaired Empath

- **WHEN** the Empath is drunk or poisoned
- **THEN** the engine still offers the legal host numbers and the capability returns the computed count

### Requirement: Butler night capability

The Butler role module SHALL resolve its night choice through the
`night-step` capability on every night. A choice SHALL return the master
record and one dated `butler` effect on the chosen player that expires at the
next dusk. A healthy Butler SHALL return them with the `note.butlerMaster`
rule note; an impaired Butler SHALL return them as a `suppressed` decision.
The Trouble Brewing step completion SHALL keep no Butler branch.

**Source**: [Butler r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/butler/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A healthy Butler chooses a master

- **WHEN** a healthy Butler chooses another player on night `n`
- **THEN** the master is recorded on the Butler's seat, the Butler is bound to that master until dusk of night `n + 1`, the step records the target and the note, and one secret log line is written

#### Scenario: A new choice

- **WHEN** the Butler chooses again on the next night
- **THEN** the seat records the new master, the earlier effect is left to expire by its own date, and only the new choice binds the next day's votes

#### Scenario: An impaired Butler

- **WHEN** the Butler is drunk or poisoned when choosing
- **THEN** the master is still recorded on the seat, the effect is kept as a record that never applies, and the step records the shared failure note

#### Scenario: A wasted choice does not bind later

- **WHEN** the Butler chose while impaired and is healthy at the next day's vote
- **THEN** the Butler has no master for that vote and no private warning is recorded

#### Scenario: The Butler's own seat

- **WHEN** the Butler chooses themself
- **THEN** the shared target validation rejects the choice before the resolver runs, and nothing is recorded

#### Scenario: Outcomes do not change

- **WHEN** the same Butler choice is completed before and after the move
- **THEN** the master record, the effect, the step, the log line, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Master record intent

The capability contract SHALL expose a `record-master` intent that names the
chosen player. The engine SHALL write that player as the master on the acting
seat, on the `effects` path and on the `suppressed` path alike. The intent
SHALL NOT name the seat it is written on.

**Source**: [Butler r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The record is written on the acting seat

- **WHEN** a resolver returns a `record-master` intent
- **THEN** the acting seat's master is the named player, and the command reports the change as one master-changed event

#### Scenario: The ability failed

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** the master is recorded as on the working path

#### Scenario: Another seat

- **WHEN** a role names a seat to write the record on
- **THEN** the type check rejects the module

### Requirement: A suppressed dated effect is kept as a record

When a `suppressed` decision returns a `timed-effect` intent, the engine SHALL
add the effect with the same id scheme and the same draw from the identifier
stream of the command, SHALL mark it inactive so that it never applies, and
SHALL NOT end an earlier effect on its behalf. A role SHALL NOT be able to
choose whether a dated effect applies.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039) (an ability used while drunk or poisoned is wasted, with no effect now or later); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The record never applies

- **WHEN** a suppressed decision returns a dated effect
- **THEN** the effect is stored inactive, and it stays inactive after its owner becomes healthy

#### Scenario: Nothing is ended

- **WHEN** the suppressed dated effect asks to replace the previous effect
- **THEN** the earlier effect of that kind from the same source stays as it was

#### Scenario: The id is still drawn

- **WHEN** the record is added inside a command
- **THEN** it draws one identifier from the command stream, as a working effect does, and a replay produces the same id

#### Scenario: A role cannot switch the effect

- **WHEN** a role sets whether its dated effect is active
- **THEN** the type check rejects the module

#### Scenario: Suppressed decisions without a dated effect

- **WHEN** a suppressed decision returns no effect, or only suspension intents
- **THEN** the outcome is the same as before this requirement

### Requirement: Undertaker information capability

The Undertaker role module SHALL answer through an `information` capability
with the character recorded at the death by execution today. It SHALL name the
executed player as the subject of the answer, every character as the possible
answers and the characters that player may register as as the legal ones.
Without such a death it SHALL return a note. The engine's information and step
completion paths SHALL NOT name the Undertaker.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/undertaker/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Undertaker learns the executed character

- **WHEN** a player died by execution today and a healthy Undertaker's step is completed
- **THEN** the step stores that player's character and the player, lists that one character, asks nothing, and the secret log holds one step line

#### Scenario: An executed Drunk

- **WHEN** the executed player is the Drunk
- **THEN** the answer is the Drunk, not the Townsfolk the Drunk was shown

#### Scenario: An executed Spy or Recluse

- **WHEN** the executed player is a sober and healthy Spy or Recluse
- **THEN** the step waits for the host, who is offered the real character first and then every character that player may register as, and the host's answer is journaled as a registration ambiguity after the step line

#### Scenario: An answer that was not offered

- **WHEN** the step is sent with a character outside the offered list
- **THEN** the engine refuses it with `error.66` and the game is as it was

#### Scenario: No execution today

- **WHEN** the day ended without a death by execution
- **THEN** the night has no Undertaker step, also when a player died at night

#### Scenario: An impaired Undertaker waits for the host

- **WHEN** the Undertaker is drunk or poisoned, or is a Drunk shown the Undertaker, and the step is sent without an answer
- **THEN** the engine returns the question with every character as the options, and the game, the journal and the command stream are as they were

#### Scenario: Outcomes do not change

- **WHEN** the same Undertaker step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Ravenkeeper information capability

The Ravenkeeper role module SHALL declare one player, alive or dead, as its
target and the character shape of its answer. Its `information` capability
SHALL answer with the character of the first chosen player, name that player
as the subject, every character as the possible answers and the characters
that player may register as as the legal ones. The engine's information path
and the completion of the step SHALL NOT name the Ravenkeeper.

**Source**: [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/ravenkeeper/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Ravenkeeper learns the chosen character

- **WHEN** the Ravenkeeper died tonight, chooses a player and the healthy step is completed
- **THEN** the step stores the chosen player's character and the player, lists that one character, asks nothing, and the secret log holds one step line

#### Scenario: Any player may be chosen

- **WHEN** the Ravenkeeper chooses a dead player, the Demon or its own seat
- **THEN** the step is completed with that player's character

#### Scenario: A chosen Spy or Recluse

- **WHEN** the chosen player is a sober and healthy Spy or Recluse, alive or dead
- **THEN** the step waits for the host, who is offered the real character first and then every character that player may register as

#### Scenario: A poisoned Recluse

- **WHEN** the chosen Recluse is drunk or poisoned
- **THEN** the Recluse is the one legal character and the step asks nothing

#### Scenario: An impaired Ravenkeeper

- **WHEN** the Ravenkeeper was drunk or poisoned when it died, or is a Drunk shown the Ravenkeeper
- **THEN** the host is asked with every character as the options, and the answer is journaled as false information

#### Scenario: Outcomes do not change

- **WHEN** the same Ravenkeeper step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: The wake of a character role stays with its step

The Undertaker's step SHALL be built only on a night after a death by
execution, and the Ravenkeeper's step SHALL be appended on the night the
Ravenkeeper dies, as before this change. Both modules SHALL declare the
`character` shape in the step that holds their wake. A capability SHALL NOT
receive the game state to decide who wakes.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/undertaker/role.test.ts`, `src/core/roles/ravenkeeper/role.test.ts`, `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The Undertaker's step

- **WHEN** the second night starts after an execution
- **THEN** the queue holds the Undertaker's step with no target, the character shape and the executed player and character on it

#### Scenario: The Ravenkeeper's step

- **WHEN** the Imp kills the Ravenkeeper
- **THEN** the step is inserted after the Imp's step with one player of any state as its target, the character shape and the mark that its owner died tonight

#### Scenario: The ledger shows both forms

- **WHEN** the ownership ledger is generated
- **THEN** both rows declare the legacy step and the `information` capability, the Undertaker has no engine reference and the Ravenkeeper keeps the references of its appended step

### Requirement: A character answer names its player and lists the characters the host may show

The `answer` decision of the `information` capability MAY name the player the
answer is about. For a step that declares the `character` shape the engine
SHALL record the answer as the character and the subject as the player. It
SHALL list a copy of the legal characters for a working ability, also when
there is one, and of the possible characters for an impaired owner, and SHALL
ask the host when the owner is impaired or more than one character is legal.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115) Example 3, [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125) Example 2, [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §3 and §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: One legal character

- **WHEN** a module answers with a character, its player and one legal character for a sober and healthy owner
- **THEN** the record holds the character, the player and that one character as the list, and the host is not asked

#### Scenario: Several legal characters

- **WHEN** the module names two legal characters
- **THEN** the engine asks the host and offers those two

#### Scenario: The owner is impaired

- **WHEN** the owner is drunk or poisoned
- **THEN** the host is offered the possible characters, not the legal ones

#### Scenario: A role writes the record's own field

- **WHEN** a role returns an answer with the field of the step's record for the player
- **THEN** the type check rejects the module

### Requirement: A role with nothing to learn returns a note or no answer

The `information` capability MAY return a note with a text. The engine SHALL
store the text as the answer of the step and SHALL ask nobody, whether or not
the owner is impaired. When a role returns no answer for a step that declares
the `character` shape, the engine SHALL return a question with a copy of every
character; for any other shape it SHALL return no information.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A note

- **WHEN** a module returns a note for a healthy or an impaired owner
- **THEN** the answer of the step is the text of the note, with no question

#### Scenario: A note carries no answer

- **WHEN** a role returns a note with a value or with a demand for the host's answer
- **THEN** the type check rejects the module

#### Scenario: The Ravenkeeper before a player is chosen

- **WHEN** the Ravenkeeper's step is read with no chosen player
- **THEN** the engine returns a character question with every character, and a completion without a player is refused before anything is written

#### Scenario: Another shape without an answer

- **WHEN** a module of a number or a yes or no step returns no answer
- **THEN** the step has no information

### Requirement: An information role reads the execution of the day and the characters a player may register as

The engine SHALL give an `information` capability the player who died by
execution on the day before the night of the step, with the character
recorded at the death, and, for a player, the characters that player may
register as: their own first, then every Minion and Demon for a sober and
healthy Recluse, or every Townsfolk and Outsider for a sober and healthy Spy.
The owner's impairment SHALL NOT change that list.

**Source**: [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: An execution today

- **WHEN** a player was executed and died on the day before the night
- **THEN** the capability is told that player and the character recorded at the death

#### Scenario: No execution today

- **WHEN** it is the first night, the day had no execution, a player died at night, or the execution was on an earlier day
- **THEN** the capability is told that nobody died by execution today

#### Scenario: A Spy and a Recluse

- **WHEN** an information capability asks about a sober and healthy Spy or Recluse
- **THEN** the list starts with the real character and continues with the characters of the other side's types

#### Scenario: Other players and impaired registrants

- **WHEN** it asks about any other player, or about a drunk or poisoned Spy or Recluse
- **THEN** the list holds the player's own character only

#### Scenario: The role asks for the death records

- **WHEN** a role reads the list of deaths or the cause of the execution from its context
- **THEN** the type check rejects the module

### Requirement: Chef information capability

The Chef role module SHALL declare its step through the `night-step`
capability for the first night, with no target and the number shape. Its
`information` capability SHALL answer with the number of neighbouring pairs
around the seat ring whose players both register as evil, and SHALL name every
number from 0 to the seat count as the possible answers. The engine's
information and step completion paths SHALL NOT name the Chef.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/chef/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Chef learns the count

- **WHEN** a healthy Chef's step is completed and no Spy or Recluse can change the count
- **THEN** the step stores the number of pairs of neighbouring evil players as its answer, with no options, and the secret log holds one step line

#### Scenario: The ring closes

- **WHEN** evil players sit in the last seat and the first seat
- **THEN** they are one pair

#### Scenario: Three evil players in a row

- **WHEN** three evil players sit next to each other
- **THEN** the count is two, because the player in the middle is part of two pairs

#### Scenario: The Chef wakes once

- **WHEN** a later night starts
- **THEN** the night has no Chef step

#### Scenario: An impaired Chef waits for the host

- **WHEN** the Chef is drunk or poisoned, or is a Drunk shown the Chef, and the step is sent without an answer
- **THEN** the engine returns the question with every number from 0 to the player count as the options, and the game, the journal and the command stream are as they were

#### Scenario: The host answers for an impaired Chef

- **WHEN** the step is sent again with one of the offered numbers
- **THEN** the step stores that number and is marked impaired, and the answer is journaled as false information after the step line

#### Scenario: Outcomes do not change

- **WHEN** the same Chef step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: The Chef names the legal counts under registration

The Chef's `information` capability SHALL name as legal every count from the
pairs in which neither player may register as good to the pairs in which both
players may register as evil. The computed count SHALL follow the teams the
host registered for the step; the legal counts SHALL NOT. The role SHALL NOT
name the Spy or the Recluse or read their impairment.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) Example 4, [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); `docs/rules-matrix.md` TB-CHEF-02; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/chef/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A Recluse between two evil players

- **WHEN** a sober and healthy Recluse sits between the Imp and the Poisoner
- **THEN** the legal counts are 0, 1 and 2, and a healthy Chef's step waits for the host's count

#### Scenario: A Spy beside the Demon

- **WHEN** a sober and healthy Spy sits beside the Imp and no other evil players are neighbours
- **THEN** the legal counts are 0 and 1

#### Scenario: The host answers the range

- **WHEN** the step is sent with one of the legal counts
- **THEN** the step stores the host's answer as it was sent, and the answer is journaled as a registration ambiguity after the step line

#### Scenario: A count outside the range

- **WHEN** the step is sent with a count that no registration makes true
- **THEN** the engine refuses it with `error.66` and the game is as it was

#### Scenario: The host registers the Recluse for the step

- **WHEN** the step is sent with the Recluse registered as evil
- **THEN** the computed count rises, the offered range is the same, and the registration is journaled before the step line

#### Scenario: A poisoned Recluse

- **WHEN** the Recluse is drunk or poisoned
- **THEN** one count is legal, the step asks nothing, and a registration sent for the Recluse is refused with `error.67`

### Requirement: A working ability with several legal answers asks the host

The `answer` decision of the `information` capability MAY carry the values a
working ability may show when the answer depends on how a player registers.
When a working ability names more than one, the engine SHALL ask the host and
offer a copy of them. An impaired owner SHALL be offered the possible values
instead. A role SHALL return the same decision whether or not its owner is
impaired.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) Example 4, [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §3 and §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/chef/role.test.ts`

#### Scenario: Several legal answers

- **WHEN** a module answers for a sober and healthy owner and names two legal values
- **THEN** the engine asks the host and offers those two values

#### Scenario: One legal answer

- **WHEN** a module names one legal value or none
- **THEN** the engine shows the module's answer and asks nothing

#### Scenario: The owner is impaired

- **WHEN** a module names legal values and its owner is drunk or poisoned
- **THEN** the host is offered the possible values, not the legal ones

### Requirement: An information role reads the seats and who may register as a team

The engine SHALL give an `information` capability the seats in order around
the circle and, for a player and a team, whether the player may register as
that team to this ability: their own team, or the other one for a Recluse or a
Spy that is sober and healthy. The answer SHALL NOT depend on the
registrations the host sent with the step.

**Source**: [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: A Spy and a Recluse

- **WHEN** an information capability asks about a sober and healthy Spy or Recluse
- **THEN** the player may register as good and as evil

#### Scenario: Other players

- **WHEN** it asks about any other player
- **THEN** the player may register as their own team only

#### Scenario: A drunk or poisoned registrant

- **WHEN** the Spy or the Recluse is drunk or poisoned
- **THEN** that player may register as their own team only

#### Scenario: A role asks about a character type

- **WHEN** a role asks whether a player may register as anything but good or evil
- **THEN** the type check rejects the module

### Requirement: The Chef query holds no rule

The engine's exported query `chefCount` SHALL keep its signature and SHALL
answer by resolving the Chef module's `information` capability with the
engine's facts. The engine SHALL NOT hold a second copy of the count or of the
legal range.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/host-choice.test.ts`

#### Scenario: The query is asked outside a step

- **WHEN** a caller asks how many pairs a Chef would count, with or without registrations
- **THEN** the answer is the one the role module gives

### Requirement: Empath information capability

The Empath role module SHALL declare its step through the `night-step`
capability for every night, with no target and the number shape. Its
`information` capability SHALL answer with the count of its two nearest living
neighbours whose registered team is evil, and SHALL name 0, 1 and 2 as the
possible answers. The engine's information and step completion paths SHALL NOT
name the Empath.

**Source**: [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/empath/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Empath learns the count

- **WHEN** a healthy Empath's step is completed
- **THEN** the step stores the number of evil players among the two nearest living neighbours as its answer, with no options, and the secret log holds one step line

#### Scenario: A dead neighbour is skipped

- **WHEN** a neighbour of the Empath is dead
- **THEN** the count reads the closest living player in that direction

#### Scenario: The host registers a Spy or a Recluse

- **WHEN** the step is completed with a Spy registered as good or a Recluse registered as evil
- **THEN** the count reads the registered team, and the registration is journaled before the step line

#### Scenario: An impaired Empath waits for the host

- **WHEN** the Empath is drunk or poisoned, or is a Drunk shown the Empath, and the step is sent without an answer
- **THEN** the engine returns the question with 0, 1 and 2 as the options, and the game, the journal and the command stream are as they were

#### Scenario: The host answers for an impaired Empath

- **WHEN** the step is sent again with one of the offered numbers
- **THEN** the step stores that number and is marked impaired, and the answer is journaled as false information after the step line

#### Scenario: Outcomes do not change

- **WHEN** the same Empath step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: An information answer names its possible values

The `answer` decision of the `information` capability SHALL carry the value
the ability learns and MAY carry every value that answer can take. A role
SHALL return the same decision whether or not its owner is impaired. The
decision SHALL NOT state that the owner is impaired, that the host must
choose, or which options the host is offered.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/empath/role.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The owner is impaired

- **WHEN** an information capability resolves for a drunk or poisoned owner
- **THEN** it returns the same value and the same possible answers as for a working one

#### Scenario: A role names what the engine owns

- **WHEN** a role states impairment, a required host choice or the offered options in the decision, or reads the game state
- **THEN** the type check rejects the module

### Requirement: The engine asks the host for an impaired information role

For a role module that declares an `information` capability, the engine SHALL
show a working ability the module's answer and offer nothing. For an impaired
owner it SHALL ask the host and offer a copy of the values the module named as
possible. The shape of the answer SHALL come from the module's declared night
step. A module that returns `no-effect` SHALL yield no information.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The ability works

- **WHEN** a module answers for an owner who is sober and healthy
- **THEN** the engine returns the answer under the declared shape, asks the host nothing and offers no options

#### Scenario: The owner is impaired

- **WHEN** a module answers for a drunk or poisoned owner
- **THEN** the engine marks the answer impaired, asks the host and offers the values the module named, the true one among them

#### Scenario: The module names no possible answers

- **WHEN** a module answers for an impaired owner and names no possible values
- **THEN** the host is still asked, and the engine invents no list

#### Scenario: The role learns nothing

- **WHEN** a module returns `no-effect`
- **THEN** the step yields no information

#### Scenario: A module without the capability

- **WHEN** a module declares no `information` capability
- **THEN** the engine keeps its own path for that role

#### Scenario: The role reads facts, not the game

- **WHEN** the engine resolves the capability
- **THEN** the role is given its seat, the date of the night, the chosen targets, the living neighbours and the team each player registers as under the host's registrations

### Requirement: Fortune Teller information capability

The Fortune Teller role module SHALL declare its step through the `night-step`
capability for every night, with two players and the yes-or-no shape. Its
`information` capability SHALL answer yes when either chosen player is the red
herring or registers as a Demon, and SHALL name yes and no as the possible
answers. The engine's information and step completion paths SHALL NOT name the
Fortune Teller.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/fortuneteller/role.test.ts`, `src/core/roles/night-step.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Fortune Teller chooses the Demon

- **WHEN** a healthy Fortune Teller's step is completed with the Demon among the two chosen players
- **THEN** the step stores yes as its answer, with no options, and the secret log holds one step line

#### Scenario: The Fortune Teller chooses the red herring

- **WHEN** the red herring is among the two chosen players and neither is a Demon
- **THEN** the answer is yes

#### Scenario: Neither player is a Demon or the red herring

- **WHEN** the two chosen players are a Minion and a good player who is not the red herring
- **THEN** the answer is no

#### Scenario: The Fortune Teller chooses a dead player or their own seat

- **WHEN** one of the chosen players is dead or is the Fortune Teller
- **THEN** the step is accepted and answered by the same rule

#### Scenario: The step needs two different players

- **WHEN** the step is sent with fewer than two players, the same player twice or a seat that does not exist
- **THEN** the engine refuses it with the error it returned before the move, and the game is as it was

#### Scenario: The host registers a Recluse as the Demon

- **WHEN** the step is completed with a sober and healthy Recluse registered as the Demon
- **THEN** the answer is yes, and the registration is journaled before the step line

#### Scenario: An impaired Fortune Teller waits for the host

- **WHEN** the Fortune Teller is drunk or poisoned, or is a Drunk shown the Fortune Teller, and the step is sent without an answer
- **THEN** the engine returns the question with yes and no as the options, and the game, the journal and the command stream are as they were

#### Scenario: The host answers for an impaired Fortune Teller

- **WHEN** the step is sent again with yes or no
- **THEN** the step stores that answer and is marked impaired, and the answer is journaled as false information after the step line

#### Scenario: Outcomes do not change

- **WHEN** the same Fortune Teller step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: An information role reads Demon registration and the red herring

The engine SHALL give an `information` capability two more read-only facts:
whether a player registers as a Demon to this ability, and which player is the
red herring. A Demon SHALL register as one, alive or dead. Another player
SHALL register as a Demon only when the host registered them so for this step
and the engine accepts that registration. The role SHALL NOT read the host's
registrations or the setup secrets.

**Source**: [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/fortuneteller/role.test.ts`

#### Scenario: A Demon registers as a Demon

- **WHEN** an information capability asks about a Demon, living or dead
- **THEN** the fact is true

#### Scenario: The host registered a Recluse as the Demon

- **WHEN** the step carries a Demon registration for a sober and healthy Recluse
- **THEN** the fact is true for the Recluse, and false without that registration

#### Scenario: A registration as evil only

- **WHEN** the host registered the Recluse as evil and not as the Demon
- **THEN** the fact is false for the Recluse

#### Scenario: The game has a red herring

- **WHEN** the setup named a red herring
- **THEN** the role is given that player's id, and no id when the game has none

### Requirement: The Fortune Teller query holds no rule

The engine's exported query `fortuneTellerYes` SHALL keep its signature and
SHALL answer by resolving the Fortune Teller module's `information` capability
with the engine's facts. The engine SHALL NOT hold a second copy of the rule.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The query is asked outside a step

- **WHEN** a caller asks what a Fortune Teller would hear for two players, with or without registrations
- **THEN** the answer is the one the role module gives for those players

### Requirement: Imp night capability

The Imp role module SHALL resolve its night choice through the `night-step`
capability on every night except the first. A choice SHALL return an `attack`
decision on the chosen player under the Imp's log title, and the same decision
when the Imp is impaired. The Trouble Brewing step completion SHALL keep no
Imp branch.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116), [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995), [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [Soldier r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/imp/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: The Imp kills the chosen player

- **WHEN** a healthy Imp chooses a living, unprotected player who is not a working Mayor
- **THEN** that player dies of the Demon's attack, the step records the outcome and the victim's note, and the secret log holds the death line and then the attack line

#### Scenario: Nobody dies

- **WHEN** the Imp is drunk or poisoned, or the chosen player is dead, protected by the Monk or a healthy Soldier
- **THEN** no death is recorded, the step records the reason as its note, and the attack line is marked as prevented

#### Scenario: The Imp chooses themself

- **WHEN** a healthy Imp chooses their own seat and one Minion is alive
- **THEN** the Imp dies, that Minion becomes the Imp inside the same step, its remaining step is skipped and the new Demon's wake is queued

#### Scenario: Several Minions are alive

- **WHEN** a healthy Imp kills themself, no Scarlet Woman inherits and several Minions are alive
- **THEN** the step holds the heir question, no winner is declared and the night cannot end until the host names the heir

#### Scenario: The attack ends the game

- **WHEN** the Imp's kill leaves two players alive
- **THEN** evil wins from the attack step, after the attack line is written

#### Scenario: Outcomes do not change

- **WHEN** the same Imp attack is completed before and after the move
- **THEN** the death, the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Attack decision

The capability contract SHALL expose an `attack` decision that names the
chosen player and the title of the attack's log line. The engine SHALL resolve
it through the shared attack path with the acting seat as the attacker and the
host's answer as the Mayor's redirect. The decision SHALL NOT name the
attacker, the redirect or the cause of death.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The acting seat attacks

- **WHEN** a resolver returns an `attack` decision
- **THEN** the attack is resolved for the seat that takes the step, and the coordinator hands the outcome back under the title the role gave

#### Scenario: The step keeps the attack's own record

- **WHEN** an attack is resolved
- **THEN** the step result is the attack outcome and the secret log line carries the role's title, not the shared step line

#### Scenario: A role names what the engine owns

- **WHEN** a role names the attacker, the redirect or the cause of death in the decision
- **THEN** the type check rejects the module

### Requirement: An attack that needs the host waits untouched

When an attack would kill a working Mayor and the host has not answered the
redirect, the engine SHALL return the question with every other player as an
option and SHALL NOT change the game state, the journal or the log, nor draw
from the command clock or identifier stream. A step completed with the answer
SHALL journal the redirect before the attack line.

**Source**: [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995); `docs/adr/0002-engine-contracts.md` §4; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The host has not answered

- **WHEN** the Imp attacks a working Mayor and the command carries no redirect
- **THEN** the command returns a Storyteller choice with the redirect options, and the game, the journal and the command stream are as they were

#### Scenario: The host names another player

- **WHEN** the command is sent again with a living, unprotected player as the redirect
- **THEN** that player dies, the Mayor lives, and the secret log holds the death, the redirect and the attack line in that order

#### Scenario: The host lets the Mayor die

- **WHEN** the redirect answer is that nobody takes the Mayor's place
- **THEN** the Mayor dies, the answer is journaled and the death is not marked as redirected

#### Scenario: The attack would not kill the Mayor

- **WHEN** the Imp is impaired, or the Mayor is impaired, dead, protected by the Monk
- **THEN** the host is asked for no redirect

### Requirement: A role module declares its night step as a capability

A role module that has moved to the capability contract SHALL declare its
night step as a `night-step` capability: the nights it covers, the step the
queue builds, the kinds of dated effect each use of the ability replaces
and an optional resolver over the read-only ability facts. Every reader of a
declared night step or resolver SHALL use one lookup in `src/core/roles`.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/night-step.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/engine/engine.test.ts`

#### Scenario: One declaration covers every night

- **WHEN** a module declares one `night-step` capability with timing `any`
- **THEN** the lookup returns that step and resolver on the first night and on every later night

#### Scenario: A role does not act on the first night

- **WHEN** a module declares only a `night-step` capability with timing `other`
- **THEN** the lookup returns no step and no resolver on the first night, and returns them on every later night

#### Scenario: The first night differs

- **WHEN** a module declares a `first` capability beside an `other` or `any` capability
- **THEN** the lookup returns the `first` capability on the first night and the other one on every later night

#### Scenario: A module has not moved

- **WHEN** a module declares no `night-step` capability
- **THEN** the lookup returns its first-night field or else its night field on the first night, its night field on later nights, and no resolver on any night

#### Scenario: One form per module

- **WHEN** the registry is checked
- **THEN** no module declares a `night-step` capability together with `nightStep` or `firstNightStep`, and no module has an `ability` field
- **AND** a module without a `night-step` capability owns no resolver

#### Scenario: Timing agrees with the printed night order

- **WHEN** a module declares a `night-step` capability
- **THEN** it covers the first night exactly when its role is in the first-night order of its edition, and the other nights exactly when its role is in the other-night order

#### Scenario: A use replaces the last one

- **WHEN** an arm names the kinds of dated effect its use replaces and the step resolves
- **THEN** the effects of those kinds that the ability gave become inactive before the resolver reads the owner's health
- **AND** effects of other kinds, effects from other sources and the Goon's drunkenness are left as they are

#### Scenario: A failed use still replaces the last one

- **WHEN** the owner is drunk or poisoned and the resolver reports a suppressed ability
- **THEN** the effects of the named kinds that the ability gave are still inactive, and no new effect applies

### Requirement: Dated effect intent

The capability contract SHALL expose a `timed-effect` intent that names an
effect kind from a closed set, the affected player and the moment the effect
expires, and MAY ask to replace the earlier effect of the same kind that the
same ability gave. The set SHALL include a drunk effect, a `safe` effect
for a player who cannot die tonight from any ability, and a
`survives-execution` effect for a player who does not die if executed the
next day.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and §3; [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160); [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594); [Goon r2977](https://wiki.bloodontheclocktower.com/index.php?title=Goon&oldid=2977); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The effect record

- **WHEN** a resolver returns a `timed-effect` intent
- **THEN** the engine adds one active effect of that kind with the acting seat as source, the named player as target, the current night as start and the named expiry

#### Scenario: The id comes from the command

- **WHEN** the intent is applied inside a command
- **THEN** the effect id uses the identifier stream of that command, and a replay of the command produces the same id

#### Scenario: Replacement

- **WHEN** the intent asks to replace the previous effect
- **THEN** every earlier effect of the same kind that the same ability gave becomes inactive, and an effect of that kind from another source is left as it is

#### Scenario: Closed kinds

- **WHEN** a resolver names an effect kind outside the set
- **THEN** the type check rejects the module

#### Scenario: Safe tonight

- **WHEN** a resolver returns a `safe` effect for a player
- **THEN** the engine stores the Innkeeper's protection for that player, and the death path prevents a death by any ability tonight as before

#### Scenario: Survives tomorrow's execution

- **WHEN** a resolver returns a `survives-execution` effect for a player on night N
- **THEN** the engine stores the Devil's Advocate's protection for that player with day N after the start
- **AND** the execution check keeps that player alive if executed on day N, and on no other day and for no other cause

#### Scenario: The Goon's drunkenness

- **WHEN** the Goon made its chooser drunk and the chooser's ability ends or replaces its own drunk effects
- **THEN** the Goon's effect stays active

### Requirement: Poisoner night capability

The Poisoner role module SHALL resolve its night choice through the
`night-step` capability on every night. A healthy choice SHALL return one
`timed-effect` intent of kind `poison` on the chosen player that expires at
the next dusk and replaces the Poisoner's earlier poison, with the
`note.poisoned` rule note. An impaired Poisoner SHALL return the `suppressed`
decision. The Trouble Brewing step completion SHALL keep no Poisoner branch.

**Source**: [Poisoner r1737](https://wiki.bloodontheclocktower.com/index.php?title=Poisoner&oldid=1737), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/poisoner/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A healthy Poisoner chooses a player

- **WHEN** a healthy Poisoner chooses a player on night `n`
- **THEN** that player is poisoned until dusk of night `n + 1`, the step records the target and the note, and one secret log line is written

#### Scenario: A new choice

- **WHEN** the Poisoner chooses again on a later night
- **THEN** the poison it sourced before becomes inactive and a poison from another source stays active

#### Scenario: An impaired Poisoner

- **WHEN** the Poisoner is drunk or poisoned
- **THEN** no poison is added and the step records the shared failure note

#### Scenario: Outcomes do not change

- **WHEN** the same Poisoner choice is completed before and after the move
- **THEN** the effect, the step, the log line, the ids, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Monk night capability

The Monk role module SHALL resolve its night choice through the `night-step`
capability on every night except the first. A healthy choice SHALL return one
`timed-effect` intent of kind `protected` that expires at dawn and replaces
the Monk's earlier protection, with the `note.protected` rule note. An
impaired Monk SHALL return `suppressed`. The Trouble Brewing step completion
SHALL keep no Monk branch.

**Source**: [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/monk/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A healthy Monk chooses a player

- **WHEN** a healthy Monk chooses another player on night `n`
- **THEN** that player is protected until dawn of day `n`, the step records the target and the note, and one secret log line is written

#### Scenario: No first-night step

- **WHEN** the first-night queue is built with a Monk in play
- **THEN** the queue has no Monk step

#### Scenario: The Monk's own seat

- **WHEN** the Monk chooses themself
- **THEN** the shared target validation rejects the choice before the resolver runs

#### Scenario: A new choice

- **WHEN** the Monk chooses again on a later night
- **THEN** the protection it gave before becomes inactive

#### Scenario: An impaired Monk

- **WHEN** the Monk is drunk or poisoned, or a Drunk was shown the Monk
- **THEN** the step is taken, no protection is added and the Demon's attack on the chosen player kills

#### Scenario: Outcomes do not change

- **WHEN** the same Monk choice is completed before and after the move
- **THEN** the effect, the step, the log line, the ids, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Washerwoman, Librarian and Investigator declare a first-night step

The Washerwoman, Librarian and Investigator role modules SHALL each declare
their step on the `night-step` arm for the first night only, with the
`one-of-two` shape and no resolver. The engine's table of answer shapes, its
information path and its step completion SHALL NOT name the three roles.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/investigator/role.test.ts`, `src/core/engine/engine.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with the three roles in play
- **THEN** the queue holds one step for each, in the printed order after the Poisoner, with no target and the `one-of-two` shape

#### Scenario: Later nights

- **WHEN** the second night starts
- **THEN** the queue holds no step for any of the three roles

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the three rows declare the `night-step` and `information` capabilities and keep only their references in `setup.ts`

### Requirement: A role may answer with the answer prepared in setup

The `information` capability MAY return `prepared` with the characters the
answer can show, and with `orZero` when its ability has a zero answer. The
engine SHALL then read the answer the Storyteller prepared in setup under the
id of the role and record it. The role SHALL NOT be given the prepared answer,
SHALL NOT say whether zero are in play, and SHALL return the same decision
whether or not its owner is drunk or poisoned.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "How to Run", [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983); `docs/adr/0002-engine-contracts.md` §2 and §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/investigator/role.test.ts`

#### Scenario: A healthy owner

- **WHEN** a pair is prepared and the step of a sober and healthy owner is completed
- **THEN** the step stores the prepared character, the two players and the mark, offers nothing, and the secret log holds one step line

#### Scenario: The answer is read when the step is read

- **WHEN** the host changes the prepared answer during the first night, before the step
- **THEN** the step shows and stores the new answer

#### Scenario: The role reads nothing

- **WHEN** the capability of any of the three roles is resolved with a context that fails on every read
- **THEN** it returns the decision, and the decision holds only its kind, the possible characters and, for the Librarian, the declaration of the zero

#### Scenario: Only the Librarian declares the zero

- **WHEN** the decisions of the Washerwoman, the Librarian and the Investigator are read
- **THEN** the Librarian's holds `orZero: true` and the other two hold no `orZero`

#### Scenario: A role names the answer itself

- **WHEN** a role returns `prepared` with a character, two players, a `zero` or a mark that setup is incomplete, or without the possible characters
- **THEN** the type check rejects the module

#### Scenario: A declaration is not a fact

- **WHEN** a role returns `prepared` with `orZero: false`, or a computed answer with `orZero`
- **THEN** the type check rejects the module

#### Scenario: Outcomes of a prepared pair and of the Librarian's zero do not change

- **WHEN** a step with a prepared pair, or a Librarian's step with a zero, is completed before and after this change
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

#### Scenario: Outcomes do not change

- **WHEN** the same step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: Each one-of-two role names the characters of its type

The Washerwoman SHALL name every Townsfolk as the possible answers, the
Librarian every Outsider and the Investigator every Minion, in the order of
the script catalog. The engine SHALL offer an impaired owner a copy of the
characters its role names, SHALL refuse an answer outside them with
`error.66`, and SHALL journal the host's answer as false information.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/investigator/role.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: A poisoned Washerwoman

- **WHEN** the Washerwoman is poisoned and the step is sent without an answer
- **THEN** the engine returns the question with the thirteen Townsfolk, and the game, the journal and the command stream are as they were

#### Scenario: A poisoned Librarian or Investigator

- **WHEN** the Librarian or the Investigator is poisoned and a pair is prepared
- **THEN** the host is offered the four Outsiders, the Drunk among them, or the four Minions, and not the zero

#### Scenario: An answer that was not offered

- **WHEN** the host answers with a character of another type
- **THEN** the engine refuses it with `error.66` and writes nothing

#### Scenario: The host's answer

- **WHEN** the host answers with an offered character and two players
- **THEN** the step stores the answer as it was sent and the secret log holds the step line and then a false-information line with the two players

#### Scenario: A Drunk shown the role

- **WHEN** a Drunk shown one of the three roles takes the step with a false answer prepared for it
- **THEN** the host is asked with that answer and the characters of the shown role's type

### Requirement: A step without a prepared answer asks for setup

When the record of the role is absent, names no character, does not name two
players, or is a zero and the role declares none, the engine SHALL return a
record marked as missing, and the step completion SHALL refuse the step with
`error.44` and a request for setup, writing nothing. It SHALL do so for an
impaired owner as well and when an answer is sent with the step.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) "How to Run", [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The host cleared the character

- **WHEN** the prepared character is cleared during the night and the step is sent
- **THEN** the command asks for setup with `error.44`, and the game and the journal are as they were

#### Scenario: An answer does not stand in for setup

- **WHEN** the same step is sent with a pair as the host's answer
- **THEN** it is refused the same way

#### Scenario: The host prepares the answer

- **WHEN** the host then prepares a character and two players and sends the step again
- **THEN** the step is completed with that answer

#### Scenario: A zero for a role that declares none

- **WHEN** the record of the Washerwoman or the Investigator is a zero and the step is sent
- **THEN** the command asks for setup with `error.44`, whether the owner is healthy, poisoned or a Drunk shown the role

### Requirement: A Drunk with no prepared record is offered a default false answer

When a Drunk shown the role takes the step and setup holds no record for that
role at all, the engine SHALL ask the host and offer the characters the role
names, with the first of them and the first two other seats as the default. A
record that is present but incomplete SHALL ask for setup instead.

**Source**: [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A game saved before the false answer was asked for

- **WHEN** a Drunk shown the Investigator takes the step and no record exists
- **THEN** the host is asked with the four Minions, the Poisoner and the first two other seats as the default, and the answer is journaled as false information

#### Scenario: An incomplete record

- **WHEN** the record of the Drunk's shown role names no character
- **THEN** the step asks for setup

### Requirement: The zero record stays with the engine

When the prepared record is a zero and the role declares `orZero`, the engine
SHALL record for a working ability that no Outsider is in play, and SHALL
offer an impaired owner every Outsider and the zero with the first two other
seats as the default pair. It SHALL write that record for whichever role holds
a zero, as before this change. The role SHALL declare only that its ability has
a zero answer: the sentence, the options and whether zero are in play SHALL
stay outside the role.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/librarian/role.test.ts`

#### Scenario: A Librarian with no Outsider in play

- **WHEN** no Outsider is in play and the healthy Librarian's step is completed
- **THEN** the step stores the zero with its sentence and asks nothing

#### Scenario: A poisoned Librarian with a prepared zero

- **WHEN** the Librarian is poisoned and the zero is prepared
- **THEN** the host is offered every Outsider and the zero, an answer that claims the zero and names a character is refused with `error.66`, and the zero is journaled as false information with the detail "0"

#### Scenario: A Drunk shown the Librarian

- **WHEN** the zero is prepared as the false answer of a Drunk shown the Librarian
- **THEN** the night starts and the host is offered every Outsider and the zero

#### Scenario: A zero written for another role after the night began

- **WHEN** a zero is written for the Washerwoman or the Investigator during the first night
- **THEN** the step is answered as before this change, with the sentence and the options of the Librarian's zero, while the setup check reports the record as incomplete

#### Scenario: The declaration decides, not the id

- **WHEN** a module of any id declares `orZero` and holds a zero, and its owner is impaired
- **THEN** the host is offered every Outsider and the zero, not the characters the module names

#### Scenario: A role that declares no zero

- **WHEN** a module that declares no `orZero` holds a zero
- **THEN** the engine writes no zero record for it and the step is marked as missing

### Requirement: The Spy declares a step for every night

The Spy role module SHALL declare its step on the `night-step` arm for every
night, with the `grimoire` shape, no target and no resolver, and SHALL NOT
declare a legacy night step. The engine's information path and its step
completion SHALL NOT name the Spy for the answer of the step, and the engine
SHALL keep no table of answer shapes by role.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/spy/role.test.ts`, `src/core/engine/engine.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Spy in play
- **THEN** the queue holds the Spy's step last, with no target and the `grimoire` shape

#### Scenario: Later nights

- **WHEN** the second and the third night start
- **THEN** the queue holds the Spy's step again, last, with the same shape

#### Scenario: A Spy killed before its step

- **WHEN** the Demon kills the Spy on a night before the Spy's step
- **THEN** the step is closed with the note of a dead actor, cannot be completed, and the Spy has no step on later nights

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the Spy's row declares the `night-step`, `information` and `adjudication` capabilities and keeps the engine references of its registration

### Requirement: A role may answer that its ability shows the Grimoire

The `information` capability MAY return `grimoire`, which carries no value, no
possible values and no text. The engine SHALL then record
`{ kind: "grimoire" }` as the answer of the step, whatever shape the step
declares, SHALL ask the host nothing and SHALL write a new record on each
read. The Spy SHALL return this decision and SHALL read no fact.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118) "How to Run"; `docs/adr/0002-engine-contracts.md` §2 and §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`, `src/core/roles/spy/role.test.ts`

#### Scenario: A healthy Spy

- **WHEN** the step of a sober and healthy Spy is completed on the first or on the second night
- **THEN** the step stores the Grimoire record and the secret log holds one step line

#### Scenario: The role reads nothing

- **WHEN** the Spy's capability is resolved with a context that fails on every read
- **THEN** it returns the decision, and the decision holds only its kind

#### Scenario: A decision that names something

- **WHEN** a role returns `grimoire` with a value, possible values, a text or a mark of impairment
- **THEN** the type check rejects the module

#### Scenario: Another module

- **WHEN** a module returns `grimoire` on a step that declares another shape
- **THEN** the record is the Grimoire, and two reads give two records

#### Scenario: Outcomes do not change

- **WHEN** the same step is completed before and after the move
- **THEN** the step, the log lines, the ids, the command events, the order of draws from the command clock and identifier stream, and the command result are identical

### Requirement: An answer sent with a Grimoire step is not stored

When the record of a step is the Grimoire, the step completion SHALL store
that record and SHALL NOT store or check an answer sent with the step.
Players, a registration and a redirect sent with the step SHALL be handled by
the shared end of a step as before this change.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: An answer nobody asked for

- **WHEN** the Spy's step is sent with a number, a character or a Grimoire record that carries a text
- **THEN** the step is completed, stores the Grimoire record, and the secret log holds no choice line

#### Scenario: Players sent with the step

- **WHEN** a player is sent with the Spy's step
- **THEN** the step stores the player as sent

#### Scenario: The Spy's own registration

- **WHEN** the Spy's registration as good is sent with its step
- **THEN** the secret log holds a registration choice line and then the step line

#### Scenario: Another player's registration

- **WHEN** a registration for a player who has none is sent with the step
- **THEN** the step is refused with `error.67` and the game is as it was

#### Scenario: A redirect

- **WHEN** a redirect is sent with the Spy's step
- **THEN** it is journaled as before this change, and the step keeps no redirect

### Requirement: An impaired Spy has the same record

When the owner of a Grimoire step is drunk or poisoned, the engine SHALL
record the same `{ kind: "grimoire" }`, SHALL ask the host nothing and SHALL
mark the step as impaired. The role SHALL return the same decision whether or
not its owner is impaired. Showing a false Grimoire SHALL stay with the
Storyteller at the table.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Poisoner r1737](https://wiki.bloodontheclocktower.com/index.php?title=Poisoner&oldid=1737), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168) "Poisoned"; `docs/adr/0002-engine-contracts.md` §3; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/spy/role.test.ts`

#### Scenario: A poisoned Spy

- **WHEN** the Poisoner chooses the Spy and the Spy's step is completed without an answer
- **THEN** the step stores the Grimoire record and is marked as impaired, and the secret log holds one step line and no false-information line

#### Scenario: The role does not read impairment

- **WHEN** the Spy's capability is resolved with a context that records every read
- **THEN** no fact is read, `impaired` included

#### Scenario: Another module with an impaired owner

- **WHEN** a module returns `grimoire` and its owner is poisoned
- **THEN** the record has no question and no mark of impairment

### Requirement: A role step without an answer has no information

`infoForStep` SHALL return `{ kind: "none" }` for a step of a role whose module
owns no answer and for a step without a role. A role step SHALL take the shape
of its answer from the declaration of its module alone, and `none` when the
module declares no shape.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A role that owns no answer

- **WHEN** the information of a Poisoner, Monk or Imp step is read, with or without a chosen player
- **THEN** it is `{ kind: "none" }`

#### Scenario: A step without a role

- **WHEN** the information of a role step whose role is cleared is read
- **THEN** it is `{ kind: "none" }`

### Requirement: Choice record intent

The capability contract SHALL expose a `record-choice` intent that names the
player the acting seat chose tonight, or nobody. The engine SHALL write it
on the acting seat as the record of the acting role that the step builder
reads for "different to last night": the player and the night, or no player
and no night. It SHALL write the record on the `effects` path and on the
`suppressed` path alike. The intent SHALL NOT name the record or the seat it
is written on.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594); [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); `docs/adr/0002-engine-contracts.md` §2; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The choice is recorded

- **WHEN** a resolver returns a `record-choice` intent for a player on night N
- **THEN** the acting seat's record for its role names that player and night N, and the next night's step bars that player

#### Scenario: The ability failed

- **WHEN** the intent is returned by a `suppressed` decision
- **THEN** the choice is recorded as on the working path

#### Scenario: Nobody chosen

- **WHEN** the intent names nobody
- **THEN** the record names no player and no night, so the next night has no restriction

#### Scenario: Another record or seat

- **WHEN** a role names the record or the seat to write
- **THEN** the type check rejects the module

### Requirement: Demon block intent

The capability contract SHALL expose a `block-demon` intent that names the
seat of the Demon the ability keeps from waking tonight, the note for the
Demon's step and a log line. The engine SHALL keep that Demon's unfinished
step from waking, write the note on it and add the log line as a secret
line. The Demon's other abilities SHALL still resolve.

**Source**: [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); [Shabaloth r1790](https://wiki.bloodontheclocktower.com/index.php?title=Shabaloth&oldid=1790); [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The Demon does not wake

- **WHEN** a resolver returns a `block-demon` intent for the Po's seat
- **THEN** the Po's step is finished and skipped with the note the role wrote, and one secret log line with the role's title and detail is added

#### Scenario: The Shabaloth keeps its regurgitation

- **WHEN** the blocked Demon is the Shabaloth
- **THEN** its step stays open with no target and no kill, and may still resurrect

#### Scenario: The Pukka's waiting death

- **WHEN** the blocked Demon is the Pukka and its earlier choice waits to die
- **THEN** that player dies now through the shared death path, and the blocking step's result reports the death

#### Scenario: A finished Demon step

- **WHEN** the Demon's step is already finished
- **THEN** the step is left as it is and only the log line is added

#### Scenario: A block without its note

- **WHEN** a role returns a block without the note, or with a field that changes the Demon's step
- **THEN** the type check rejects the module

### Requirement: The Devil's Advocate declares a step for every night

The Devil's Advocate role module SHALL declare its step and its resolver on
`night-step` capabilities for the first night and for the other nights, and
SHALL NOT declare a legacy night step. Each use SHALL replace the
protection the Devil's Advocate gave before and SHALL record the choice. A
working Devil's Advocate SHALL protect the chosen player from the next
day's execution; a drunk or poisoned one SHALL protect nobody.

**Source**: [Devil's Advocate r2594](https://wiki.bloodontheclocktower.com/index.php?title=Devil%27s_Advocate&oldid=2594); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/devilsadvocate/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** the first and the second night start with a Devil's Advocate in play
- **THEN** the queue holds its step with one player to choose, with the first-night note on the first night and the other note on later nights

#### Scenario: A working choice

- **WHEN** a working Devil's Advocate chooses a player on night N
- **THEN** that player is protected from execution on day N until the next night, the protection from the night before is inactive, and the choice is recorded for night N

#### Scenario: A drunk or poisoned Devil's Advocate

- **WHEN** a drunk or poisoned Devil's Advocate's step is completed
- **THEN** nobody is protected, the step keeps the failure note, the protection from the night before is inactive and the choice is recorded

### Requirement: The Exorcist declares its step from the second night

The Exorcist role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. Each use SHALL record the choice. A working
Exorcist who chooses the Demon SHALL keep the Demon from waking tonight and
tell the host who the Demon learns; any other choice SHALL change nothing
else, and a drunk or poisoned Exorcist SHALL stop nobody.

**Source**: [Exorcist r2973](https://wiki.bloodontheclocktower.com/index.php?title=Exorcist&oldid=2973); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/exorcist/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with an Exorcist in play
- **THEN** the queue holds no Exorcist step, and the lookup returns no step and no resolver for that night

#### Scenario: The Exorcist chooses the Demon

- **WHEN** a working Exorcist chooses the Demon
- **THEN** the Demon does not wake tonight, its step names the Exorcist, and the choice is recorded

#### Scenario: Another player

- **WHEN** a working Exorcist chooses a player who is not the Demon
- **THEN** only the choice is recorded, and the Demon still wakes

#### Scenario: A drunk or poisoned Exorcist

- **WHEN** a drunk or poisoned Exorcist chooses the Demon
- **THEN** the Demon still wakes, the step keeps the failure note and the choice is recorded

### Requirement: Moving the Devil's Advocate and the Exorcist changes no outcome

Moving the Devil's Advocate's and the Exorcist's resolution to the
`night-step` capability SHALL NOT change a night queue, a step record, an
effect with its id and flag, a choice record, a death, a log line, a command
result or the order of draws from the command ports for the same starting
state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Devil's Advocate or Exorcist step is completed before and after the move
- **THEN** the step, the Demon's step, the effects, the choice record, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Devil's Advocate and Exorcist steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: The Gambler declares its step from the second night

The Gambler role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first, and SHALL NOT declare
a legacy night step. The step SHALL take one player, alive or dead, the
Gambler included, SHALL list the characters of the script to guess from and
SHALL offer no death to the outcome panel.

**Source**: [Gambler r3073](https://wiki.bloodontheclocktower.com/index.php?title=Gambler&oldid=3073); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/gambler/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with a Gambler in play
- **THEN** the queue holds no Gambler step, and the lookup returns no step and no resolver for that night

#### Scenario: Later nights

- **WHEN** the second and the third night start
- **THEN** the queue holds the Gambler's step with one player to choose, the note of the role, the characters of the script and no death control

#### Scenario: No character is named

- **WHEN** the Gambler's step is completed with a player and no character
- **THEN** the step is completed, nobody dies and the step keeps no result

#### Scenario: A wrong guess

- **WHEN** the Gambler names a character the chosen player does not have
- **THEN** the Gambler dies by the ability, the death is logged before the step line and the step keeps no result

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the Gambler's row declares the `night-step` capability alone and keeps the engine reference of its list of characters

### Requirement: The Pukka declares one step for every night

The Pukka role module SHALL declare its step and its resolver on one
`night-step` capability for every night, the first included, and SHALL NOT
declare a legacy night step. The step SHALL take one player, the Pukka
included, and SHALL offer no death to the outcome panel.

**Source**: [Pukka r3074](https://wiki.bloodontheclocktower.com/index.php?title=Pukka&oldid=3074); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/pukka/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** the first, the second and the third night start with a Pukka in play
- **THEN** the queue holds the Pukka's step with the same shape on each of them

#### Scenario: The first choice

- **WHEN** the Pukka's step is completed on the first night
- **THEN** the chosen player is poisoned, the death waits for the second night, nobody dies and the step records the poisoned player

#### Scenario: A drunk Pukka on the first night

- **WHEN** the Pukka is drunk and its step is completed on the first night
- **THEN** nobody is poisoned, no death waits and the step keeps the note of a suspended poison

#### Scenario: A Lunatic who is shown the Pukka

- **WHEN** a living Lunatic was shown the Pukka
- **THEN** the Lunatic's step of a later night takes one player, and the Pukka's step yields a note on every night

#### Scenario: The ledger

- **WHEN** the ownership ledger is generated
- **THEN** the Pukka's row declares the `night-step` capability alone and keeps its engine references

### Requirement: Moving a resolver to the capability changes no outcome

Moving the Gambler's and the Pukka's resolver to the `night-step` capability
SHALL NOT change a night queue, a step record, an effect, a death, a log
line, a command result or the order of draws from the command ports for the
same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Gambler or Pukka step is completed before and after the move
- **THEN** the step, the effects, the deaths, the log lines and the command result are identical

#### Scenario: A journal

- **WHEN** a journal with Gambler and Pukka steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state

### Requirement: The Sailor declares one step for every night

The Sailor role module SHALL declare its step and its resolver on one
`night-step` capability for every night and SHALL NOT declare a legacy
night step. Each use SHALL replace the drunk effect the Sailor gave before.
A working Sailor SHALL make the player the host names drunk until the next
dusk; a drunk or poisoned Sailor SHALL make nobody drunk.

**Source**: [Sailor r1768](https://wiki.bloodontheclocktower.com/index.php?title=Sailor&oldid=1768); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/sailor/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: Every night

- **WHEN** the first and the second night start with a Sailor in play
- **THEN** the queue holds the Sailor's step with one player to choose and the note of the role

#### Scenario: The host names the drunk player

- **WHEN** a working Sailor chooses a player and the host names the Sailor or that player
- **THEN** the named player is drunk until the next night, and the Sailor's drunk effect from the night before is inactive

#### Scenario: A drunk or poisoned Sailor

- **WHEN** a drunk or poisoned Sailor's step is completed
- **THEN** nobody becomes drunk, the step keeps the failure note, and the Sailor's drunk effect from the night before is inactive

#### Scenario: The Sailor chooses the Goon

- **WHEN** the Sailor is the Goon's first chooser
- **THEN** the Sailor is drunk by the Goon, the ability fails and the Goon's effect stays active

### Requirement: The Innkeeper declares its step from the second night

The Innkeeper role module SHALL declare its step and its resolver on one
`night-step` capability for the nights after the first and SHALL NOT
declare a legacy night step. Each use SHALL replace the safety and the
drunk effect the Innkeeper gave before. A working Innkeeper SHALL make both
chosen players safe until dawn and the one the host names drunk until the
next dusk; a drunk or poisoned Innkeeper SHALL do neither.

**Source**: [Innkeeper r3160](https://wiki.bloodontheclocktower.com/index.php?title=Innkeeper&oldid=3160); [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/innkeeper/role.test.ts`, `src/core/engine/bmr.test.ts`, `scripts/role-ownership.test.ts`

#### Scenario: The first night

- **WHEN** the first night starts with an Innkeeper in play
- **THEN** the queue holds no Innkeeper step, and the lookup returns no step and no resolver for that night

#### Scenario: Two players and one drunk

- **WHEN** a working Innkeeper chooses two players and the host names one of them
- **THEN** both players are safe until dawn, the named one is drunk until the next night, and the Innkeeper's effects from the night before are inactive

#### Scenario: A drunk or poisoned Innkeeper

- **WHEN** a drunk or poisoned Innkeeper's step is completed
- **THEN** nobody becomes safe or drunk, the step keeps the failure note, and the Innkeeper's effects from the night before are inactive

### Requirement: Moving the Sailor and the Innkeeper changes no outcome

Moving the Sailor's and the Innkeeper's resolution to the `night-step`
capability SHALL NOT change a night queue, a step record, an effect with its
id and flag, a death, a log line, a command result or the order of draws
from the command ports for the same starting state and the same commands.

**Source**: `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: The same commands

- **WHEN** the same Sailor or Innkeeper step is completed before and after the move
- **THEN** the step, the effects, the log lines and the draws from the command ports are identical

#### Scenario: A journal

- **WHEN** a journal with Sailor and Innkeeper steps recorded before the move is replayed after it
- **THEN** the replay ends in the same state
