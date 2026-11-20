# Sects & Violets night steps as capabilities: the information roles

Issue: #200

## Why

Slice 4 of ADR 0002 continues with the Sects & Violets information roles
whose wake reads no game state: the Clockmaker, the Dreamer, the Evil Twin,
the Flowergirl, the Mathematician, the Oracle and the Town Crier. Their
steps are still the legacy `nightStep` and `firstNightStep` fields. Their
answers are computed in `svInfoForStep`, with the Vortox's rule that a
Townsfolk ability yields false information; moving the answers is slice 5
of ADR 0002, as the Empath's answer was its own change after its step.

## What changes

- The seven modules declare their step on a `night-step` capability with
  the timing of the pinned text: the Clockmaker (r2967) and the Evil Twin
  (r3101) on the first night only; the Dreamer (r2904) and the
  Mathematician (r3153) every night; the Flowergirl (r2907), the Oracle
  (r2909) and the Town Crier (r3145) every night except the first.
- The steps keep the shape the legacy fields declared. No module owns a
  resolver, so the completion keeps its path.

## What stays

- **The answers.** `svInfoForStep` still computes each answer, asks the
  host for a drunk or poisoned owner and for a living Vortox, and the
  Flowergirl's and the Town Crier's host answer when the day is missing.
- **The Mathematician's ledger.** `completeSvStep` still removes the
  ABNORMAL marks when the step completes.
- **The command checks.** The Dreamer still cannot choose themself.
- **A borrowed or a created ability.** A Philosopher who gains one of these
  abilities wakes for it as before, at once for the Clockmaker on a later
  night; a Pit-Hag who creates one adds its step tonight when its slot is
  still ahead.

## Impact

Behavior is unchanged. The queue of every night, the record of each step,
the stored answers, the effects, the log lines, the command results and the
order of draws from the command ports stay the same, so saved games and
journals replay as before. No storage, command payload, schema, ruleset
version or pin changes.

The ownership ledger counts the seven roles as "capability + engine
reference". For them the remaining engine references are the answers,
which slice 5 moves.
