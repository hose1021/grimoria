## ADDED Requirements

### Requirement: Restore the saved custom pool with its bag

Loading a saved custom bag SHALL restore its saved role pool even when the
current custom script has the same identifier and a different pool.

**Source**: `SPEC.md` `/bag` saved-pool library contract; [Setup r1361](https://wiki.bloodontheclocktower.com/index.php?title=Setup&oldid=1361).
**Tests**: `scripts/browser-check.ts`

#### Scenario: Reload after editing a same-ID custom pool

- **WHEN** a host saves a bag, removes one of its roles from the custom pool,
  then loads the saved bag without changing the script identifier
- **THEN** the saved pool and selected bag roles are restored successfully
