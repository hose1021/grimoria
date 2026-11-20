# Spec Delta

## ADDED Requirements

### Requirement: Role catalog ability text

The Russian, English and Azerbaijani role catalogs SHALL state every
mechanically significant count, condition and timing of an ability, so a card
reads the same rule as the pinned official text. A catalog entry SHALL NOT omit
a count that the ability uses.

**Source**: [Empath r1724](https://wiki.bloodontheclocktower.com/index.php?title=Empath&oldid=1724); `docs/rules-matrix.md` row `TB-EMPATH-01`; [Issue #326](https://github.com/hose1021/grimoria/issues/326)
**Tests**: `scripts/verification/findings.test.ts`

#### Scenario: Russian Empath count

- **WHEN** the Russian catalog is loaded
- **THEN** the Empath ability states that the count covers the 2 alive neighbours

#### Scenario: Count removed

- **WHEN** an ability loses the count its pinned rule states
- **THEN** the F-015 regression fails on the shipped catalog
