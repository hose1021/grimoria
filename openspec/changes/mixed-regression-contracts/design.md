# Design

## One shared rule per mechanic

The mixed script already composes role steps, effects and the command path.
The defects were edition gates on shared rules:

- `kill` applied `bmrCannotDie` only for a pure BMR script. The Fool, Tea Lady,
  Sailor, Soldier and Zombuul protections are shared mechanics; a mixed script
  must apply them to any attack.
- `checkWin` ran the S&V Evil Twin/Vortox block only for a pure S&V script and
  the Mastermind block only for a pure BMR script. A mixed script must run the
  block for the characters it actually contains; each block already guards on
  the character's presence.
- The S&V death writer did not check the Monk's generic `protected` effect.
  The BMR protections are inside `kill`; the Monk's effect is not a BMR role,
  so the S&V death writer checks it before the kill and journals a prevention.

The gates become `isBmrScript || isMixedEdition` and
`isSnvScript || isMixedEdition`. No new state is added. The existing effect
graph and win capabilities remain the only writers.

## Coverage

`mixed.test.ts` adds:

- `MIXED-PROTECTION-02`: a mixed Vortox cannot kill a Monk-protected or Soldier
  player; the prevention is journaled, and a non-Demon ability still kills the
  Soldier.
- `MIXED-PROTECTION-03`: the BMR Fool survives its first mixed Demon attack and
  its ability is spent.
- `MIXED-VICTORY-01`: a living Vortox wins a mixed day with no execution.
- `MIXED-VICTORY-02`: a mixed Mastermind execution arms the extra day.
- `MIXED-TRANSFORM-01`: a Barber swaps a TB and an S&V character.

The existing `MIXED-PROTECTION-01`, `MIXED-SUCCESSION-01`, `MIXED-EFFECT-01`
and `MIXED-QUEUE-01` keep the poison, succession, replay and timing coverage.

## Replay and privacy

The changes use the existing death, win and journal records, so a replay writes
the same state. The prevention log is secret; the public projection already
names deaths only, not their cause or source.

## Verification

- RED: the mixed protection assertion failed and a direct mixed Vortox probe
  returned no winner; the Mastermind extra day was unreachable under the
  edition gate.
- GREEN: focused `mixed.test.ts` 11/11; `npm test` 1593/1593; `npm run verify`,
  strict OpenSpec, gates, mutation, scenarios and Playwright on the head.
