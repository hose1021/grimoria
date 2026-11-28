# Design

`WinContext` already exposes read-only facts to role modules. Add
`teamOf(playerId)` beside `actualRoleOf`, backed by `realTeamOf` in
`resolveWinCapability`, so a registration can never change the win alignment
and the Saint module never imports the engine.

The Saint module returns `evil` when the executed Saint's real team is not
`evil`, and `good` when it is. The existing good-Saint behavior and the impaired
branch are unchanged.

The 18 missing tests use the existing independent TB audit fixture in
`src/core/engine/tb-audit.test.ts`; they assert rule-observable outcomes on the
public command paths rather than internal helpers.

The register moves each evidenced sentence to `covered-but-unmapped` with the
asserting test named. The five unmodelled Traveller/Fabled sentences become
`non-mechanical-exception` with the scope reason stated, because no engine input
exists for them in this edition. ROLE-FORTUNE-TELLER-004 gets an atomic map
entry; removing it from the register follows from the register's exact-union
contract.
