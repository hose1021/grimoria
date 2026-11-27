## ADDED Requirements

### Requirement: A role module declares its night step as a capability

A role module that has moved to the capability contract SHALL declare its
night step as a `night-step` capability: the nights it covers, the step the
queue builds and an optional resolver over the read-only ability facts. Every
reader of a declared night step or resolver SHALL use one lookup in
`src/core/roles`. A module SHALL NOT declare a night step in both forms.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and "Migration order"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/roles/night-step.test.ts`, `src/core/roles/ability.test-d.ts`

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
- **THEN** the lookup returns its first-night field or else its night field on the first night, its night field on later nights, and its `ability` as the resolver

#### Scenario: One form per module

- **WHEN** the registry is checked
- **THEN** no module declares a `night-step` capability together with `nightStep`, `firstNightStep` or `ability`

#### Scenario: Timing agrees with the printed night order

- **WHEN** a module declares a `night-step` capability
- **THEN** it covers the first night exactly when its role is in the first-night order of its edition, and the other nights exactly when its role is in the other-night order

### Requirement: Dated effect intent

The capability contract SHALL expose a `timed-effect` intent that names an
effect kind from a closed set, the affected player and the moment the effect
expires, and MAY ask to replace the earlier effect of the same kind from the
same source. The engine SHALL apply it through the effect graph: it SHALL
stamp the acting seat as the source and the current night as the start, and
SHALL take the effect id from the identifier stream of the command.

**Source**: `docs/adr/0002-engine-contracts.md` §2 and §3; [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/ability.test-d.ts`

#### Scenario: The effect record

- **WHEN** a resolver returns a `timed-effect` intent
- **THEN** the engine adds one active effect of that kind with the acting seat as source, the named player as target, the current night as start and the named expiry

#### Scenario: The id comes from the command

- **WHEN** the intent is applied inside a command
- **THEN** the effect id uses the identifier stream of that command, and a replay of the command produces the same id

#### Scenario: Replacement

- **WHEN** the intent asks to replace the previous effect
- **THEN** every earlier effect of the same kind from the same source becomes inactive, and an effect of that kind from another source is left as it is

#### Scenario: Closed kinds

- **WHEN** a resolver names an effect kind outside the set
- **THEN** the type check rejects the module

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

## MODIFIED Requirements

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
