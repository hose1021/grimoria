## ADDED Requirements

### Requirement: The host answers the Mayor redirect

Choosing the Mayor as the Demon's target from a seat SHALL leave the Mayor
redirect unanswered. The redirect select SHALL show its placeholder, the dock
and the step sheet SHALL name the missing answer, and the step SHALL stay
blocked until the host picks the Mayor's fate. A new victim SHALL reset the
answer to unanswered.

**Source**: [Mayor r2995](https://wiki.bloodontheclocktower.com/index.php?title=Mayor&oldid=2995) "If you die at night, another player might die instead."; `AGENTS.md` "Auto-fill a Storyteller decision (... Mayor redirect ...)"; `app/ui-shell` "Matching control state"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `scripts/browser-check.ts`

#### Scenario: The Imp chooses the Mayor

- **WHEN** at 390 px the host taps the healthy Mayor's seat on the Imp's step
- **THEN** the dock lists the redirect as missing, the sheet's redirect select is empty and its confirm is disabled, and after the host picks "the Mayor dies" the step completes and the Mayor dies

#### Scenario: The Demon changes its target

- **WHEN** the host answered the redirect, then taps another seat and the Mayor again
- **THEN** the redirect select is empty and the confirm is disabled

### Requirement: The Demon's heir leads the night

While the host owes the Demon's heir, the dock and the centre of the table SHALL
name that question, the dock SHALL offer the living Minions the engine lists,
and the table SHALL offer no control of a later step: no complete, skip, reset
or end of night, and no seat as a target. The step sheet SHALL show only the
question.

**Source**: [Imp r3116](https://wiki.bloodontheclocktower.com/index.php?title=Imp&oldid=3116) "How to Run": "If the Imp killed themself at night, choose an alive Minion ... Wake the new Imp"; `AGENTS.md` "Auto-fill a Storyteller decision (... Demon heir)"; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `scripts/browser-check.ts`

#### Scenario: The Imp kills itself with two Minions alive

- **WHEN** at 390 px the Imp kills itself on night 2, the Fortune Teller's step comes next, and the Poisoner and the poisoned Scarlet Woman are alive
- **THEN** the dock and the centre of the table name the heir question, the dock offers both Minions and no step control, no seat is a target of the Fortune Teller's step, and a seat tap opens that player's correction

#### Scenario: A step sheet is open when the heir becomes owed

- **WHEN** at 390 px the host's step sheet is open and another window records the Imp's self-kill with the Poisoner and the poisoned Scarlet Woman alive
- **THEN** the sheet offers both Minions and no skip or confirm, and the host names the heir from it

#### Scenario: The host names the heir

- **WHEN** the host picks the Poisoner in the dock
- **THEN** the Poisoner becomes the Imp, the new Imp's wake is the current step, the dock offers its controls again, and after it the Fortune Teller's step opens with no target chosen

### Requirement: An information answer is labelled by its reason

The select of a host-chosen information answer SHALL be labelled false
information when the actor is drunk or poisoned or a Vortox falsifies it, the
Storyteller's answer when its data source is missing, and a registration
otherwise, because a working ability then offers several answers only through
a player who may register either way.

**Source**: [Chef r2510](https://wiki.bloodontheclocktower.com/index.php?title=Chef&oldid=2510) Example 4; `docs/rules-matrix.md` TB-CHEF-02, SYS-EFFECTS-01; [Issue #200](https://github.com/hose1021/grimoria/issues/200)
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.ts`

#### Scenario: A healthy Chef beside a Spy

- **WHEN** the Chef sits beside the Spy, who sits beside the Imp, and the host opens the Chef's step at 390 px
- **THEN** the count select is labelled as a registration, not as false information

#### Scenario: The other reasons

- **WHEN** the actor is drunk or poisoned, a Vortox falsifies a healthy answer, or a missing day makes the answer the Storyteller's
- **THEN** the label is false information, false information or the Storyteller's answer respectively
