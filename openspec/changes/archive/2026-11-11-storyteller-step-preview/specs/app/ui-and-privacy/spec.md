## ADDED Requirements

### Requirement: Storyteller step explanation

The night step card SHALL show who wakes, what the Storyteller is allowed to do,
the chosen targets, the active effects that touch the step, and every mandatory
decision that is still unanswered, each with its reason.

**Source**: [Issue #45](https://github.com/hose1021/grimoria/issues/45) "Область", `SPEC.md` "Screens"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Unanswered target

- **WHEN** the current step requires a target and none is chosen
- **THEN** the card marks the step blocked, lists the target reason and disables the confirm button

#### Scenario: Complete target selection

- **WHEN** the host chooses the required target
- **THEN** the blocking reason disappears and the confirm button is enabled

### Requirement: Consequence preview and separation

The step and phase cards SHALL preview the consequences of the command before it
is confirmed, and the preview SHALL keep "target chosen", "state applied",
"death scheduled", "death happened", "death prevented" and "player revived"
distinct in the card and in the saved log line.

**Source**: [Issue #45](https://github.com/hose1021/grimoria/issues/45) "Область", `src/core/commands/result.ts` "DomainEvent", `src/core/model/types.ts` "LogEntry"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `js/bmr.test.mjs`, `js/engine.test.mjs`, `scripts/browser-check.mjs`

#### Scenario: Preview before confirming

- **WHEN** the host changes the step input
- **THEN** the card shows the separated consequence list without mutating or saving the game

#### Scenario: Scheduled versus happened

- **WHEN** a delayed effect only carries an expiry, such as poison or protection
- **THEN** the preview shows no "death scheduled" line

#### Scenario: Real scheduled death

- **WHEN** the Pukka's delayed death carries a resolve mark
- **THEN** the preview shows "death scheduled" and not "death happened"

#### Scenario: Blocked attack

- **WHEN** the engine reports `noDeath` for an Imp attack on a healthy Soldier
- **THEN** the preview shows "death prevented"

#### Scenario: Log line category

- **WHEN** the engine records a death, a prevention or a resurrection
- **THEN** the log entry carries `consequence` and the side panel renders that stable category, falling back to the line kind for old saves

### Requirement: Phase transition preview

Ending the night or the day SHALL show the engine preview of that transition
before it is confirmed, and the engine remains the authority on whether the
transition is allowed.

**Source**: [Issue #45](https://github.com/hose1021/grimoria/issues/45) "Область", `src/core/engine/night.ts` "endNight", `src/core/engine/day.ts` "endDay"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Day transition

- **WHEN** the host is on the day card
- **THEN** the end-of-day button stays enabled and its preview lists the engine consequences

### Requirement: Rejected command reason

A command rejected by the engine, or one that requires a Storyteller choice,
SHALL show its reason in a dismissible console banner and the game SHALL stay
unchanged.

**Source**: [Issue #45](https://github.com/hose1021/grimoria/issues/45) "Область", `src/core/commands/result.ts`
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.mjs`

#### Scenario: Rejected command

- **WHEN** the engine returns a rejection with a reason
- **THEN** the console shows the reason and a dismiss control, and the published state is unchanged

#### Scenario: Rejected import

- **WHEN** the host applies an unreadable import
- **THEN** the console shows the rejection reason instead of a browser alert

#### Scenario: Storyteller choice required

- **WHEN** the engine returns a Storyteller-choice outcome
- **THEN** the console shows that outcome's reason instead of silently choosing a default

### Requirement: Correcting a step input

A step's local draft SHALL be clearable without applying it, so a corrected
target is previewed from the empty draft and no trigger is processed twice.

**Source**: [Issue #45](https://github.com/hose1021/grimoria/issues/45) "Область", `AGENTS.md` "Code Conventions"
**Tests**: `src/ui/screens/table/helpers.test.ts`, `scripts/browser-check.mjs`, `js/commands.test.mjs`

#### Scenario: Clear a wrong target

- **WHEN** the host clears the step input
- **THEN** the targets, redirect, given answer, registrations and role drafts are empty and nothing is dispatched

#### Scenario: Preview stays read-only

- **WHEN** the host previews a step repeatedly before confirming
- **THEN** the saved state and the applied-command ledger are unchanged

### Requirement: Guidance parity

The storyteller step guidance SHALL be semantically complete in the Russian,
English and Azerbaijani catalogs, with matching keys and parameters for every
key the step card and the consequence preview use.

**Source**: [Issue #45](https://github.com/hose1021/grimoria/issues/45) "Область", `openspec/specs/app/ui-and-privacy/spec.md` "Interface string parity"
**Tests**: `js/strings.test.mjs`

#### Scenario: Missing guidance key

- **WHEN** a step or consequence key is missing from one catalog
- **THEN** the parity test fails and names the language and key

#### Scenario: Placeholder mismatch

- **WHEN** one catalog uses a different placeholder set for a shared key
- **THEN** the parity test reports the key
