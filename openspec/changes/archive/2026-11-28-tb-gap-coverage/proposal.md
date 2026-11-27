# Correct the evil Saint win and cover Trouble Brewing branches

Issue: #200

## Why

The Trouble Brewing exception register still listed one real defect and 18
mechanical gaps. Saint r3119, How to Run says the executed Saint's team loses,
so an evil-aligned Saint must make good win; the Saint win capability returned
`evil` for every unimpaired execution. The other 18 entries described behavior
the engine already implements but no test asserted.

## What Changes

- Add `WinContext.teamOf(playerId)`, backed by `realTeamOf` in the win resolver,
  so a role module can read the executed player's real alignment without
  importing the engine.
- Make the Saint's win capability return the executed Saint's opposing team.
- Add 18 engine tests for the missing Trouble Brewing branches.
- Map ROLE-FORTUNE-TELLER-004 atomically to its asserting tests.
- Re-pin ROLE-DRUNK-005 to the How to Run section and record its Outsider
  evidence.
- Reclassify the five Traveller/Fabled rows as documented out-of-scope
  exceptions and regenerate the readiness matrix.

## Out of Scope

- Travellers, Fabled and exile are not modelled in this edition.
