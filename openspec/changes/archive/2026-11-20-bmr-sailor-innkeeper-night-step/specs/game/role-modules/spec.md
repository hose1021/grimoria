## MODIFIED Requirements

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

### Requirement: Dated effect intent

The capability contract SHALL expose a `timed-effect` intent that names an
effect kind from a closed set, the affected player and the moment the effect
expires, and MAY ask to replace the earlier effect of the same kind that the
same ability gave. The set SHALL include a drunk effect, a `safe` effect
for a player who cannot die tonight from any ability, and a
`survives-execution` effect for a player who does not die if executed the
next day. The engine SHALL store `safe` as the protection the death path
reads for the Innkeeper, and `survives-execution` as the protection the
execution check reads for the Devil's Advocate, with the day it covers. An
effect the Goon put on its chooser SHALL NOT count as given by the chooser's
ability. The engine SHALL apply it through the effect graph: it SHALL
stamp the acting seat as the source and the current night as the start, and
SHALL take the effect id from the identifier stream of the command.

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

### Requirement: A role module declares its night step as a capability

A role module that has moved to the capability contract SHALL declare its
night step as a `night-step` capability: the nights it covers, the step the
queue builds, the kinds of dated effect each use of the ability replaces
and an optional resolver over the read-only ability facts. The engine SHALL
end the effects of those kinds that the ability gave before the resolver
reads the owner's health, also when the ability does not work. Every
reader of a declared night step or resolver SHALL use one lookup in
`src/core/roles`. A module SHALL NOT declare a night step in both forms, and a
module without a `night-step` capability SHALL own no resolver.

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

## ADDED Requirements

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
