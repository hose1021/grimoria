# Spec Delta

## MODIFIED Requirements

### Requirement: Setup secrets

The secrets screen SHALL edit the one-of-two pairs, the Drunk mask pair and the
red herring through commands, SHALL list the reminders and the host-only roster,
and SHALL start the first night only when the secrets are complete. A checklist
tick SHALL be shown only while the engine reports no problem for that
obligation. Each script SHALL render its own setup summary and reminder
checklist, a manual script SHALL render the manual pane, and the Librarian zero
and a registering Spy or Recluse SHALL extend the offered answers only when the
registering player is one of the two chosen players.

**Source**: `SPEC.md` `/secrets`; issue #82; issue #171 SET9, SET10, TB2, TB8
**Tests**: `scripts/browser-check.ts`, `src/ui/screens/secrets-options.test.ts`,
`src/ui/screens/secrets-contract.test.ts`, `src/core/engine/setup.test.ts`

#### Scenario: Red herring

- **WHEN** the Fortune Teller is in play
- **THEN** the herring picker offers every good player, including the Fortune
  Teller, and records the choice

#### Scenario: Incomplete secrets

- **WHEN** a required pair or the herring is missing
- **THEN** the start control is disabled and the errors are listed

#### Scenario: Tick follows the engine

- **WHEN** a stored answer has a wrong team, an absent role without a
  registering player in the pair, or an illegal Librarian zero
- **THEN** the obligation is not marked done and the start gate reports the same
  problem

#### Scenario: Librarian zero

- **WHEN** the Librarian is in play and every Outsider in play is a Recluse
- **THEN** the zero control is offered and the recorded zero is legal

#### Scenario: Drunk shown the Librarian

- **WHEN** the Drunk is shown the Librarian
- **THEN** the false-information editor offers the zero answer

#### Scenario: Registering Spy or Recluse

- **WHEN** a Spy is one of the two chosen players for a Townsfolk or Outsider
  answer, or a Recluse is one of the two for a Minion answer
- **THEN** the role selector also offers the not-in-play characters of that team,
  and without that player in the pair it offers no absent character

#### Scenario: Mixed manual pool

- **WHEN** a manual script contains Trouble Brewing and Bad Moon Rising roles
- **THEN** the screen renders the manual secrets pane and not the Bad Moon
  Rising pane

#### Scenario: Reminder checklist

- **WHEN** the active script is Bad Moon Rising or Sects & Violets and the game
  is dealt
- **THEN** the pane lists the Storyteller reminders of every role in play

#### Scenario: Drunk mask label

- **WHEN** the Drunk is in play
- **THEN** the mask editor states that it sets the Drunk's shown role and is not
  part of the Demon bluff group
