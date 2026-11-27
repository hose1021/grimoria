# Design

## Context

`bmrCannotDie` returned `"zombuul"` before it looked for an active
`devilsadvocate` effect on an execution. The Advocate effect only applies when
`effect.day === at.number`.

`moonchildChoice` stored only the target id. `completeBmrStep` read
`target.team` when the next night resolved the curse.

## Decisions

- Move the execution/Advocate block above the Zombuul block. The Advocate
  protects against an execution death; the Zombuul's replacement applies when no
  other protection resolved first. The Assassin's `bypassProtection` still
  returns after the Zombuul check, which preserves the existing unpinned
  ordering.
- Store `used.moonchildTargetEvil` at choice time with `realTeamOf`. At
  resolution, a stored boolean decides; a save without it falls back to the
  current alignment.

## Risks / Trade-offs

- The stored alignment is a raw fact about the chosen seat, not a registration.
  The Moonchild asks whether the chosen player was good; the Goon's alignment
  change is the pinned edge case.
- Legacy saves keep the old behavior until the next choice, which is the only
  safe fallback.

## Test plan

- `bmr.test.ts`: Advocate-protected Zombuul execution keeps life and first
  death; Moonchild's chosen Goon dies after turning evil.
- Full `npm test`, typecheck, acceptance, OpenSpec checks.
