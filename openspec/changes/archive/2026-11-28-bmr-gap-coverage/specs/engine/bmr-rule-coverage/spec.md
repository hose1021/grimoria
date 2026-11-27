# Spec Delta

## ADDED Requirements

### Requirement: Every mechanical Bad Moon Rising sentence cites a current test

Each audited Bad Moon Rising sentence with a mechanical consequence SHALL be
either a documented non-mechanical exception or backed by a current test that
asserts the rule-visible outcome. The exception register SHALL cite the exact
test identity for a covered row.

**Source**: [Issue #200](https://github.com/hose1021/grimoria/issues/200); pinned wiki `docs/official/wiki/*.wikitext` revisions listed in `docs/audits/rule-exceptions/bmr.json`
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: Covered row

- **WHEN** a mechanical row is backed by a current test
- **THEN** its status is `covered-but-unmapped` and its evidence names `src/core/engine/bmr.test.ts::<test name>`

#### Scenario: Impaired waker

- **WHEN** a drunk or poisoned player completes their ability step
- **THEN** the Chambermaid still counts that player as having woken

### Requirement: Living-target checks use registered life

The pure Bad Moon Rising target restriction helper SHALL refuse a target that
does not register as alive, matching the night flow. A registered-dead Zombuul
SHALL be refused by the Devil's Advocate and the Chambermaid.

**Source**: `docs/official/wiki/Devil's_Advocate.r2594.wikitext` § Summary; `docs/official/wiki/Chambermaid.r2966.wikitext` § Summary
**Tests**: `src/core/engine/bmr.test.ts`

#### Scenario: Registered-dead Zombuul

- **WHEN** the Devil's Advocate chooses a Zombuul that registers as dead
- **THEN** the step is refused with `error.55` and the pure helper reports the target must be alive
