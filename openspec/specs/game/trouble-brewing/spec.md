# Trouble Brewing Specification

## Purpose

Defines the Trouble Brewing behaviors the engine resolves without host
adjudication: first-night and each-night information, protection from the
Demon, Demon succession, day abilities, registration and the Drunk mask.

## Requirements

### Requirement: Trouble Brewing information roles

The engine SHALL compute the Washerwoman, Librarian, Investigator, Chef, Empath,
Fortune Teller and Undertaker information from real seats, roles and
registrations, and SHALL expose only allowed Storyteller overrides.

**Source**: [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510), [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724), [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: First-night pair

- **WHEN** the first night resolves the Washerwoman step
- **THEN** the shown pair contains the real role and no pair without it validates

#### Scenario: Fortune Teller target choice

- **WHEN** the Fortune Teller may choose themself or a dead player
- **THEN** both choices are accepted

### Requirement: Demon protection and Mayor redirection

The engine SHALL stop a Demon attack on a Monk-protected or sober Soldier target,
SHALL ask for a Mayor redirect only when a sober Mayor would actually die, and
SHALL resolve a redirect to a dead, Soldier or Monk-protected player as no death.

**Source**: [Monk r3124](https://wiki.bloodontheclocktower.com/index.php?title=Monk&oldid=3124), [Soldier r3121](https://wiki.bloodontheclocktower.com/index.php?title=Soldier&oldid=3121), [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Protected target dies nowhere

- **WHEN** the Imp attacks a Mayor and the host redirects to a dead player
- **THEN** nobody dies and the Mayor stays alive

#### Scenario: Impaired abilities are not offered

- **WHEN** the Mayor is poisoned at the moment of the attack
- **THEN** the Mayor dies with no redirect prompt

### Requirement: Demon succession

The engine SHALL pass the Demon role to a sober Scarlet Woman only when at least
five players were alive immediately before the Demon died, SHALL pass the Imp's
self-kill to a living Minion below that threshold, and SHALL not let the new
Demon act again in the same night. When a player becomes the Demon, the engine
SHALL end every effect that player sourced.

**Source**: [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117), [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116), [Poisoner r1737](https://wiki.bloodontheclocktower.com/index.php?title=Poisoner&oldid=1737)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Five living before the death

- **WHEN** the Demon dies with five players alive and a sober Scarlet Woman
- **THEN** the Scarlet Woman becomes the Demon

#### Scenario: Four living before the death

- **WHEN** the Demon dies with fewer than five players alive
- **THEN** the Scarlet Woman does not inherit

#### Scenario: Poisoner becomes the Imp

- **WHEN** the Poisoner is the only living Minion and the Imp kills itself
- **THEN** the Poisoner becomes the Imp and the poison it sourced stops

#### Scenario: Redirected Imp death

- **WHEN** the Imp attacks the Mayor and the Storyteller redirects the attack
  onto the Imp
- **THEN** the Imp dies by a normal Demon death and no Minion inherits below
  five living players

### Requirement: Day abilities

The engine SHALL spend the Virgin's first nomination even when it does not
trigger, SHALL execute only an eligible Townsfolk nominator, SHALL spend the
Slayer ability when used while impaired without a kill, and SHALL count an
illegal Butler vote with a private warning. The engine SHALL also record the
Virgin's first nomination from the table control even when the day already
recorded an execution, and that record SHALL spend the ability.

**Source**: [Virgin r1729](https://wiki.bloodontheclocktower.com/index.php?title=Virgin&oldid=1729), [Slayer r3122](https://wiki.bloodontheclocktower.com/index.php?title=Slayer&oldid=3122), [Butler r3120](https://wiki.bloodontheclocktower.com/index.php?title=Butler&oldid=3120)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Drunk nominator

- **WHEN** a Drunk nominates the Virgin for the first time
- **THEN** the nomination spends the ability and nobody is executed

#### Scenario: Impaired Slayer

- **WHEN** a poisoned Slayer chooses the Demon
- **THEN** the ability is spent and the Demon survives

#### Scenario: First nomination after an execution

- **WHEN** the day already recorded an execution and the host records the
  Virgin's first nomination with the table control
- **THEN** the nomination is recorded, `used.virgin` is true, and no second
  execution is attempted

### Requirement: Registration and the Drunk mask

The engine SHALL treat Spy and Recluse registration as an explicit host choice
for each query, SHALL wake the Drunk under the shown role, and SHALL keep the
Drunk's real role out of Demon bluffs and public views.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Chef registration

- **WHEN** the host registers the Recluse as evil
- **THEN** the Chef count includes the adjacent evil pair

#### Scenario: Drunk wake

- **WHEN** the Drunk is shown the Washerwoman
- **THEN** the Washerwoman step wakes and the ability never works

### Requirement: Night queue skips unavailable actors

The engine SHALL skip a player killed before their wake, SHALL insert the
Ravenkeeper step only after a night death, and SHALL drop the old role step of a
Minion promoted to Demon during the night.

**Source**: [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125), `docs/rules-sources.md` "Interpretations" item 18
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Killed before the wake

- **WHEN** a player dies earlier in the night than their own step
- **THEN** that step is not offered

#### Scenario: Promoted Minion

- **WHEN** a Spy becomes the Demon mid-night
- **THEN** the Spy grimoire step is dropped

### Requirement: Trouble Brewing first-night pair information

The engine SHALL compute the Librarian and Investigator first-night
information from the real setup: a Librarian learns that one of two players is
a particular Outsider or that zero are in play, and an Investigator learns that
one of two players is a particular Minion. The zero SHALL stay legal while every
Outsider in play can register as something else, and a shown character SHALL NOT
have to be in the bag when one of the two players can register as it.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007)
**Tests**: `src/core/engine/setup.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Librarian pair

- **WHEN** the first night resolves the Librarian step and an Outsider is in play
- **THEN** the shown role is that Outsider and the pair contains that player

#### Scenario: Librarian zero

- **WHEN** no Outsider is in play on the first night
- **THEN** the Librarian learns that zero are in play and no pair is required

#### Scenario: Librarian zero with a registering Recluse

- **WHEN** the only Outsider in play is the Recluse and the Storyteller makes the Recluse register as a Minion
- **THEN** the Librarian's zero is accepted and the night is not blocked

#### Scenario: Outsider that cannot register away

- **WHEN** a non-Recluse Outsider is in play and the host records the Librarian's zero
- **THEN** setup secrets report `librarian-zero`

#### Scenario: Investigator pair

- **WHEN** the first night resolves the Investigator step
- **THEN** the shown role is a Minion in play and the pair contains that player

#### Scenario: A shown character held by a registering Spy or Recluse

- **WHEN** the Washerwoman or Librarian names a not-in-play character and one of the pair is the Spy, or the Investigator names a not-in-play Minion and one of the pair is the Recluse
- **THEN** the pair is accepted and no `info-inplay-*` reason is reported

#### Scenario: A shown character nobody can register as

- **WHEN** the pair names a character that is neither in the bag nor registrable through a pair member
- **THEN** setup secrets report `info-inplay-*` for that role

### Requirement: False information for every impaired Trouble Brewing role

The engine SHALL offer a Storyteller override with allowed options for every
Trouble Brewing information role while that role is drunk or poisoned,
including a Librarian whose setup result is zero.

**Source**: [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039), [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510), [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724), [Fortune Teller r3123](https://wiki.bloodontheclocktower.com/index.php?title=Fortune_Teller&oldid=3123), [Undertaker r3115](https://wiki.bloodontheclocktower.com/index.php?title=Undertaker&oldid=3115), [Ravenkeeper r3125](https://wiki.bloodontheclocktower.com/index.php?title=Ravenkeeper&oldid=3125)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: First-night role impaired

- **WHEN** a Washerwoman, Librarian, Investigator, Chef, Empath or Fortune Teller is impaired
- **THEN** the step requires a host choice and the options are the allowed results for that role

#### Scenario: Librarian with zero setup impaired

- **WHEN** a Librarian is impaired and the setup result is zero
- **THEN** the step still requires a false-information choice, does not claim that zero are in play, and offers a default pair

#### Scenario: Death-triggered role impaired

- **WHEN** an Undertaker or Ravenkeeper acts while impaired
- **THEN** the step offers any character as the false answer

### Requirement: Spy and Recluse registration

The engine SHALL apply Spy and Recluse registration overrides for alignment,
Demon, Minion, Townsfolk and Outsider queries, including for a dead Spy or
Recluse, and SHALL NOT treat a Recluse registered merely as evil as a Demon.
The engine SHALL apply an override only while the registrant is sober and
healthy: a drunk or poisoned Spy or Recluse registers normally, and a
registration recorded for that player SHALL be rejected before the step mutates.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118), [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007), [States r1039](https://wiki.bloodontheclocktower.com/index.php?title=States&oldid=1039)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/engine/host-choice.test.ts`

#### Scenario: Dead Recluse registration

- **WHEN** a dead Recluse is registered as evil, a Minion or a Demon
- **THEN** the matching alignment and role queries return that registration

#### Scenario: Evil is not Demon

- **WHEN** a Recluse is registered only as evil
- **THEN** a Demon query returns false

#### Scenario: Dead Spy registration

- **WHEN** a dead Spy is registered as good, a Townsfolk or an Outsider
- **THEN** the matching alignment and role queries return that registration

#### Scenario: Impaired registrant

- **WHEN** a poisoned Spy is registered as good or as a Townsfolk
- **THEN** the Chef and alignment queries keep the real evil alignment, the
  Virgin does not trigger, and a registration recorded for that Spy is rejected

#### Scenario: Impaired Recluse

- **WHEN** a drunk Recluse is registered as a Demon
- **THEN** the Fortune Teller and the Slayer see the Recluse's real character

### Requirement: Spy grimoire step

The engine SHALL create a grimoire step for the Spy on every night the Spy
acts.

**Source**: [Spy r3118](https://wiki.bloodontheclocktower.com/index.php?title=Spy&oldid=3118)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Spy wakes

- **WHEN** the night queue includes the Spy
- **THEN** the step reports a grimoire result

### Requirement: Saint under impairment

The engine SHALL NOT declare an evil win when a Saint dies by execution while
drunk or poisoned.

**Source**: [Saint r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Poisoned Saint

- **WHEN** a poisoned Saint dies by execution
- **THEN** the death is recorded as impaired and no winner is declared by the Saint ability

### Requirement: Official Trouble Brewing night order

The engine SHALL build the first-night and other-night queues from the
official Trouble Brewing order and SHALL wake the Spy last.

**Source**: [Trouble Brewing r3128](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=3128), `docs/official/nightsheet.json`
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: First night

- **WHEN** the first-night queue is built
- **THEN** the steps follow the official first-night sequence and the Spy is last

#### Scenario: Other nights

- **WHEN** another-night queue is built
- **THEN** the steps follow the official other-night sequence

### Requirement: Nomination limits

The engine SHALL allow each living player to nominate at most once per day and
SHALL allow each player to be nominated at most once per day.

**Source**: [Rules Explanation r1310](https://wiki.bloodontheclocktower.com/index.php?title=Rules_Explanation&oldid=1310), [Glossary r3168](https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Repeated nominator

- **WHEN** a player who already nominated tries to nominate again in the same day
- **THEN** the command is rejected with `error.13`

#### Scenario: Repeated nominee

- **WHEN** a player who was already nominated is nominated again in the same day
- **THEN** the command is rejected with `error.14`

#### Scenario: Dead nominator

- **WHEN** a dead player tries to nominate
- **THEN** the command is rejected with `error.11`

### Requirement: Trouble Brewing 5–15 end-to-end

The engine SHALL run a complete Trouble Brewing game from deal through a first
night, an execution and the next night at every player count from five to
fifteen.

**Source**: [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361), [Trouble Brewing r3128](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=3128)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Every supported count

- **WHEN** a printed Trouble Brewing preset bag is dealt at a count from five to fifteen
- **THEN** the secrets validate, the first night resolves, an execution is recorded, and the next night starts

### Requirement: Saint loss scope

The engine SHALL declare the Saint's evil win only for an unimpaired Saint death
by execution on the current day, and a later check SHALL NOT re-fire from an
earlier day's death log.

**Source**: [Saint r3119](https://wiki.bloodontheclocktower.com/index.php?title=Saint&oldid=3119)
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: Same-day loss

- **WHEN** an unimpaired Saint dies by execution during the current day
- **THEN** evil wins with the `saint` reason

#### Scenario: Cleared winner on a later day

- **WHEN** the recorded winner is cleared and the next day's check runs
- **THEN** the earlier Saint execution does not declare evil again

### Requirement: False information for the Drunk's setup information

The engine SHALL accept the false setup information the Storyteller gives a
Drunk under the shown information role. A Drunk shown the Librarian SHALL be
able to record the "zero Outsiders" answer without a role and a two-player
pair.

**Source**: [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165), [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721), `docs/rules-sources.md` "Interpretations that matter in code" item 3
**Tests**: `src/core/engine/setup.test.ts`, `src/core/engine/engine.test.ts`

#### Scenario: Drunk shown the Librarian

- **WHEN** the bag contains the Drunk shown the Librarian and the host records the zero answer
- **THEN** setup secrets accept it and report no `drunk-info`

#### Scenario: Drunk shown the Washerwoman

- **WHEN** the Drunk's false pair is missing or names the wrong team
- **THEN** setup secrets still report `drunk-info` or `drunk-info-team`

### Requirement: The Chef offers every registration-consistent count

The Chef information step SHALL require a Storyteller answer when a sober,
healthy Spy or Recluse can change the number of adjacent evil pairs, and SHALL
offer every count the pinned registration rule permits for that query. The
engine SHALL NOT choose a registration on the Storyteller's behalf.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) "Examples"; [Recluse r3007](https://wiki.bloodontheclocktower.com/index.php?title=Recluse&oldid=3007) "Summary"; Issue #217
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: A Recluse registers differently for each adjacent pair

- **WHEN** a Recluse sits between two evil players and the Chef wakes
- **THEN** the step offers 0, 1 and 2, requires an answer, and accepts 1

#### Scenario: A count outside every registration is rejected

- **WHEN** the Chef step offers 0, 1 and 2 and the host answers 3
- **THEN** the completion is rejected and the step stays open

#### Scenario: No registrant means no answer

- **WHEN** no sober, healthy Spy or Recluse can change the count
- **THEN** the step reports the computed count and requires no answer

#### Scenario: An impaired Chef keeps the false range

- **WHEN** the Chef is drunk or poisoned
- **THEN** any count from 0 to the player count is offered, as before

### Requirement: A daytime Demon succession still wakes the new Demon

When a Demon dies during the day and a successor takes the role, the next night
queue SHALL contain the `demonchange` step that wakes the new Demon and shows
the YOU ARE token. The obligation SHALL survive the day-to-night reset and a
reload before that night.

**Source**: [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) "How to Run"; [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run"; Issue #217
**Tests**: `src/core/engine/engine.test.ts`

#### Scenario: The Demon is executed

- **WHEN** the Demon is executed with five or more players alive and a sober
  Scarlet Woman becomes the Demon
- **THEN** ending the day builds the next night with a `demonchange` step

#### Scenario: The wake-up step completes

- **WHEN** the Storyteller completes the `demonchange` step
- **THEN** the step is marked done and the night continues

#### Scenario: A night self-kill keeps its existing wake-up

- **WHEN** the Demon kills themself at night and a Minion inherits
- **THEN** the same night keeps the `demonchange` step, as before

### Requirement: The new Demon is woken the night of the change

When a Minion becomes the Demon during the night, that night SHALL hold one
`demonchange` step that wakes the new Demon and shows the YOU ARE token. When
the host names the heir, the step SHALL be queued with the choice, so that it
is the next step of the night and the night cannot end before it is completed
or skipped.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run": "If the Imp killed themself at night, choose an alive Minion ... Wake the new Imp, show them the YOU ARE info token, then show them the Imp token."; [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) "How to Run": "That night, wake the new Imp ..."; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `scripts/browser-check.ts`

#### Scenario: The host names the heir

- **WHEN** the Imp kills themself, several Minions are alive and the host names one of them
- **THEN** the `demonchange` step is queued at the Imp's slot plus a half and is the current step, before the Empath's

#### Scenario: The Imp's step was the night's last

- **WHEN** the host names the heir and no other step is left that night
- **THEN** the night cannot end until the `demonchange` step is completed

#### Scenario: The table at 390 px

- **WHEN** the host plays night 2 of a ten-player game at 390 px, the Poisoner poisons the Scarlet Woman, the Imp kills themself and the host names the Poisoner from the step sheet
- **THEN** the next step is the new Imp's wake, before the Empath's, and the page has no horizontal overflow

### Requirement: The next day does not wake the new Demon again

Ending the day after a night Demon change SHALL NOT queue the `demonchange`
step again. It SHALL queue it only when a Demon died that day and was
replaced, or when the change of the night before left no `demonchange` step in
that night's queue.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run": "If the Imp killed themself at night, choose an alive Minion ... Wake the new Imp, show them the YOU ARE info token, then show them the Imp token."; [Scarlet Woman r3117](https://wiki.bloodontheclocktower.com/index.php?title=Scarlet_Woman&oldid=3117) "How to Run": "That night, wake the new Imp ..."; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `scripts/browser-check.ts`

#### Scenario: The only Minion inherits

- **WHEN** a healthy Imp kills themself with one Minion alive, the night's `demonchange` step is completed or skipped, and the next day ends with or without a death that is not a Demon's
- **THEN** the next night holds no `demonchange` step, the new Imp wakes for their own Imp step and the Demon-change flag is cleared

#### Scenario: A named heir

- **WHEN** the host named the heir, the wake was completed and the next day ends
- **THEN** the next night holds no `demonchange` step

#### Scenario: A succession by day after a night change

- **WHEN** a Minion became the Imp at night and was woken, and the next day that Imp is executed and the Scarlet Woman takes the role
- **THEN** the next night holds one `demonchange` step, and the night after holds none

#### Scenario: A Demon who died on an earlier day

- **WHEN** the Scarlet Woman took the role on day 1 and, on night 2, she kills herself and the last Minion becomes the Imp
- **THEN** night 2 holds one `demonchange` step, after the Imp's step, and night 3 holds none

#### Scenario: A heir an older ruleset left unwoken

- **WHEN** a heir was named under the older ruleset after the night's last step, so no `demonchange` step was queued, and the day is ended by a command sent now
- **THEN** the next night wakes the new Imp with a `demonchange` step

#### Scenario: The table at 390 px

- **WHEN** the host has woken the named heir at 390 px, finishes the night and ends day 2 with no execution
- **THEN** night 3 opens on the new Imp's own step with no `demonchange` step

### Requirement: A recorded command keeps the wakes it queued

The correction SHALL apply to commands of the ruleset version
`tb-bmr-snv-2026-11-17.1` and later. A command recorded under
`tb-bmr-snv-2026-11-10`, `tb-bmr-snv-2026-11-16` or `tb-bmr-snv-2026-11-17`
SHALL keep the wakes it queued: a recorded heir choice queues none, and a
recorded end of day carries the flag of a night change into the next night, so
that a saved journal replays and undoes to the game that was saved.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116); `openspec/specs/game/command-engine/spec.md` "ruleset version"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Historical command replay

- **WHEN** a journal saved under `tb-bmr-snv-2026-11-17`, in which the new Imp was woken on night 2 and again on night 3, is replayed
- **THEN** the replay succeeds and its canonical state equals the saved game, both wakes included

#### Scenario: A command sent now

- **WHEN** that journal is taken back to the heir choice or to the end of day 2 and the same command is sent now
- **THEN** the heir choice queues the wake at once and the end of day queues none, while the recorded commands applied again give the saved game

#### Scenario: Each older version

- **WHEN** an Imp self-kill with a named heir is recorded under each of the three older versions
- **THEN** the recorded heir choice queues no wake, the recorded next step queues it, the recorded end of day queues it again, and the journal replays to the same game

#### Scenario: Undo in an older save

- **WHEN** the host loads that game at dawn of day 2, ends the day and takes it back
- **THEN** the next night holds no second wake, the undo replays the journal and returns the loaded game, and the redo returns the continued one

### Requirement: The zero is the Librarian's answer alone

Only a role whose ability has a zero answer SHALL be answered a zero held in
setup: the Librarian, and a Drunk shown the Librarian. A zero held for the
Washerwoman or the Investigator, real or a Drunk's mask, SHALL be no prepared
answer: the step SHALL be marked as missing, SHALL offer no Outsider and no
zero, and its completion SHALL ask for setup with `error.44`, writing nothing.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721) "(Or that zero are in play.)", [Washerwoman r2630](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630), [Investigator r2983](https://wiki.bloodontheclocktower.com/index.php?title=Investigator&oldid=2983), [Drunk r3165](https://wiki.bloodontheclocktower.com/index.php?title=Drunk&oldid=3165); [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/core/roles/librarian/role.test.ts`, `src/core/roles/washerwoman/role.test.ts`, `src/core/roles/investigator/role.test.ts`, `scripts/browser-check.ts`

#### Scenario: A zero written for the Washerwoman or the Investigator

- **WHEN** a zero is written for the Washerwoman or the Investigator during the first night and the step of a sober and healthy owner is sent
- **THEN** the command asks for setup with `error.44`, the step stores no sentence about Outsiders, and the game, the journal and the command stream are as they were

#### Scenario: A drunk or poisoned owner

- **WHEN** the owner of that step is poisoned, or is a Drunk shown the role
- **THEN** the step asks for setup the same way and the host is not offered the Outsiders or the zero

#### Scenario: An answer does not stand in for setup

- **WHEN** that step is sent with the zero or with a pair as the host's answer
- **THEN** it is refused the same way

#### Scenario: The host prepares an answer

- **WHEN** the host then prepares a character and two players for that role and sends the step again
- **THEN** the step is completed with that character and those players, and the journal replays to the same game

#### Scenario: The setup check agrees

- **WHEN** the same record is checked before the first night
- **THEN** setup secrets report `info-washerwoman`, `info-investigator` or `drunk-info`, as they did

#### Scenario: The Librarian

- **WHEN** a zero is prepared for a Librarian, a poisoned Librarian or a Drunk shown the Librarian
- **THEN** the step stores the zero, or offers every Outsider and the zero, exactly as before this change

### Requirement: A recorded command keeps the zero it answered

The correction SHALL apply to commands of the ruleset version
`tb-bmr-snv-2026-11-17` and later. A command recorded under
`tb-bmr-snv-2026-11-10` or `tb-bmr-snv-2026-11-16` SHALL keep the answer it
gave to a zero held for any role, so that a saved journal replays and undoes
to the game that was saved. A read outside a command SHALL follow the rule.

**Source**: [Librarian r1721](https://wiki.bloodontheclocktower.com/index.php?title=Librarian&oldid=1721); `openspec/specs/game/command-engine/spec.md` "ruleset version"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/core/engine/engine.test.ts`, `src/application/store/create-game-store.test.ts`

#### Scenario: Historical command replay

- **WHEN** a journal saved under the previous ruleset, whose Washerwoman and Investigator steps answered a zero, is replayed
- **THEN** the replay succeeds and its canonical state equals the saved game, the stored sentence and the host's chosen zero included

#### Scenario: Undo in an older save

- **WHEN** the host loads that game, completes the next step and takes it back
- **THEN** the undo replays the journal and returns the loaded game, and the redo returns the continued one

#### Scenario: A command sent now

- **WHEN** a recorded step is undone and the same step is sent as a new command
- **THEN** the new command asks for setup, while the recorded command applied again gives the saved game
