# Spec Delta

## MODIFIED Requirements

### Requirement: Route table and fallback

The app SHALL serve the static routes `/`, `/bag`, `/seat`, `/secrets`,
`/table`, `/player`, `/help`, `/demo`, `/sheet` and `/sheet/{ru,en,az}`, SHALL
fall back to `/table` for an unknown path, SHALL treat `/public` as an unknown
path, and SHALL dispose the previous screen before mounting the next.

**Source**: `SPEC.md` "Runtime" and "Reliability and live-play additions"; issue #384
**Tests**: `scripts/browser-check.ts:1226`

#### Scenario: Unknown path

- **WHEN** the browser opens a path the router does not know
- **THEN** the app renders `/table`

#### Scenario: Removed public path

- **WHEN** the browser opens `/public`
- **THEN** the app renders `/table` and no screen offers a public route

#### Scenario: Welcome route

- **WHEN** the browser opens `/`
- **THEN** the welcome page renders and `document.body.dataset.route` is `home`

#### Scenario: Route change

- **WHEN** the host navigates from `/table` to `/bag`
- **THEN** the table screen cleanup runs and the bag screen mounts
