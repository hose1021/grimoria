# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic activation of the opening update

A worker that finishes installing during the opening check SHALL activate
without confirmation outside an active game. That window SHALL save best-effort,
send `SKIP_WAITING` and reload once. During an active game the window SHALL
wait for Update and a successful save before activation or reload. A failed
active-game save SHALL keep the session open and offer a retry. A worker first
exposed while the opening check is in progress follows this same policy.

**Source**: `SPEC.md` "Reliability and live-play additions"; issue #156;
[Issue #184](https://github.com/hose1021/grimoria/issues/184)
**Tests**: `src/entry/offline.test.ts`, `scripts/browser-check.ts`, `src/infrastructure/offline/offline-worker.test.ts`

#### Scenario: Opening update applies by itself

- **WHEN** a changed worker reaches the installed state during the opening check
  in a controlled window outside an active game
- **THEN** the window sends `SKIP_WAITING` and reloads once with no user action

#### Scenario: Waiting worker at boot

- **WHEN** the registration exposes a waiting worker after the initial adoption
  calls, before the opening check ends
- **THEN** the opening check offers Update during active play and applies the
  worker automatically outside active play

#### Scenario: Failed save does not block

- **WHEN** a window outside an active game cannot save before reload
- **THEN** it reloads anyway and runs the new version

#### Scenario: Opening update during active play

- **WHEN** the opening check finds a waiting worker during an active game
- **THEN** the host can defer it or choose Update, and a failed save leaves
  the session open for retry

#### Scenario: Another window activates the worker

- **WHEN** a different window activates an update during active play
- **THEN** the active window keeps its session open until the host chooses
  Update and it saves successfully

#### Scenario: First install does not reload

- **WHEN** no worker controls the page yet
- **THEN** the page does not reload, because there is no version to replace

#### Scenario: One reload only

- **WHEN** the reloaded page runs its own opening check against the version it
  already runs
- **THEN** no further worker installs and no further reload happens
