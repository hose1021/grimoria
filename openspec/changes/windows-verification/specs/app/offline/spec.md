# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic activation of the opening update

A worker that finishes installing during the opening check SHALL activate
without a confirmation: the window SHALL save its game best-effort, send
`SKIP_WAITING`, and reload once. A failed save SHALL NOT prevent the reload. A
waiting worker that the registration exposes only after the opening check has
started SHALL still count as the opening check's worker.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #156;
[Issue #184](https://github.com/hose1021/grimoria/issues/184)
**Tests**: `scripts/browser-check.ts`, `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Opening update applies by itself

- **WHEN** a changed worker reaches the installed state during the opening check
  in a controlled window
- **THEN** the window sends `SKIP_WAITING` and reloads once with no user action

#### Scenario: Waiting worker at boot

- **WHEN** the registration exposes a waiting worker after the initial adoption
  calls, before the opening check ends
- **THEN** the opening check marks it as automatic, sends `SKIP_WAITING` and
  reloads once with no prompt

#### Scenario: Failed save does not block

- **WHEN** the window cannot write the game before the reload
- **THEN** it reloads anyway and runs the new version

#### Scenario: First install does not reload

- **WHEN** no worker controls the page yet
- **THEN** the page does not reload, because there is no version to replace

#### Scenario: One reload only

- **WHEN** the reloaded page runs its own opening check against the version it
  already runs
- **THEN** no further worker installs and no further reload happens
