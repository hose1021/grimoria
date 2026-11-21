## ADDED Requirements

### Requirement: Dreamer role-pair capability

The Dreamer role module SHALL declare an `information` capability with
`infoKind: "dreamer"`. Its resolver SHALL name the chosen target, the good and
evil character pools and the characters the target may register as (Spy
r3118, Recluse r3007).

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); `docs/adr/0002-engine-contracts.md` "Migration order"; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/dreamer/role.test.ts`, `src/core/engine/snv.test.ts`

#### Scenario: The Dreamer names the facts, not the answer

- **WHEN** the Dreamer's resolver runs for a chosen target
- **THEN** it returns the target, both character pools and the target's registration facts, and no pair, value, option or impairment flag

#### Scenario: A Spy or Recluse target passes its registrations through

- **WHEN** the chosen target may register as another character
- **THEN** the resolver returns exactly the characters the information facts allow

#### Scenario: No target and no seat

- **WHEN** the step has no chosen target, or the target is not in the game
- **THEN** the resolver asks for no pair, and the engine records an empty option list that refuses every answer

### Requirement: The Dreamer resolver reads no ability state

The Dreamer resolver SHALL NOT choose the pair, name a correct character, mark
the pair false, require the host, or read whether its owner is drunk or
poisoned. An impaired owner SHALL receive the same pools and registration
facts, because the engine decides who answers.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/dreamer/role.test.ts`

#### Scenario: An impaired owner changes no role fact

- **WHEN** the Dreamer is drunk or poisoned
- **THEN** the resolver returns the same pools and registration facts

### Requirement: The role-pair decision carries no final answer

The information contract SHALL offer one `role-pair` decision arm carrying the
target, the good and evil character pools and the characters the target may
register as. The arm SHALL carry no chosen pair, no correct character, no
options, no impairment flag and no host-answer flag. A role module SHALL NOT
reach the game state through it.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904); `docs/adr/0002-engine-contracts.md` §4; [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/roles/ability.test-d.ts`, `src/core/roles/dreamer/role.test.ts`

#### Scenario: A role cannot choose the pair

- **WHEN** a role returns a `role-pair` decision with a `pair`, `impaired` or `options` field
- **THEN** the type checker rejects it

#### Scenario: The engine builds the pairs

- **WHEN** the engine receives a `role-pair` decision
- **THEN** it derives the legal pairs from the target's character and the registration facts

### Requirement: The engine keeps the Dreamer answer wrapper

The engine SHALL keep the Vortox and impairment rules, the host-answer
requirement, the options derivation, the text, the suffixes and the stored
`role-pair` record unchanged. A command recorded before
`tb-bmr-snv-2026-11-18` SHALL replay as its free-text note.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904), [Vortox r3017](https://wiki.bloodontheclocktower.com/index.php?title=Vortox&oldid=3017), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`

#### Scenario: A sober Dreamer offers only legal pairs

- **WHEN** a sober Dreamer's step is completed
- **THEN** every option holds one good and one evil character, and one of them is the target's character or a legal registration

#### Scenario: An impaired owner or a Vortox

- **WHEN** the Dreamer is drunk or poisoned, or a living unimpaired Vortox is in play
- **THEN** the impaired owner may show any pair, and the Vortox may show neither true token

#### Scenario: A pre-pair journal still replays

- **WHEN** a journal recorded under `tb-bmr-snv-2026-11-17.4` is replayed
- **THEN** its Dreamer answer stays the free-text note and the journal and undo finish as written

### Requirement: The Dreamer pair is private and replayable

The pair SHALL stay out of the public projection and SHALL survive preview,
apply, replay, undo, export/import and reload.

**Source**: [Dreamer r2904](https://wiki.bloodontheclocktower.com/index.php?title=Dreamer&oldid=2904); [Issue #211](https://github.com/hose1021/grimoria/issues/211)
**Tests**: `src/core/engine/snv.test.ts`, `scripts/browser-check.ts`

#### Scenario: The pair is chosen on the table

- **WHEN** the host chooses the target and the pair on `/table`
- **THEN** the step stores the pair, the journal holds a secret `information-pair` entry, the public view omits it, and reload and replay reproduce it
