# Tasks

## 1. Rules and characterization

- [x] 1.1 Read the pinned Snake Charmer (r2905) and Pit-Hag (r2998) text,
      the Philosopher (r2421) text on a borrowed ability, the official night
      sheet, both `rule.md` files and their matrix rows. "Each night, wake
      the Snake Charmer… If that player is the Demon… swap… The new Snake
      Charmer is poisoned"; "Each night except the first, wake the Pit-Hag…
      If the chosen character is in play, nothing happens." Rules check:
      compliant.
- [x] 1.2 Add six characterization tests to `snv.test.ts` on the untouched
      modules and commit them first. They pin both steps on the first two
      nights; a Snake Charmer who chooses the Demon (the seats, every effect
      in order, the note, the draws and the requeued steps); one who chooses
      a Minion, one who is poisoned, and a dead player refused through
      `applyCommand`; a Philosopher with the Snake Charmer's ability who
      becomes the Demon; and the Pit-Hag's change, its no-op, its failure
      while poisoned and a Demon it makes.

## 2. Contract

- [x] 2.1 Add the `swap` transformation decision and the `not-demon` reason.
- [x] 2.2 Add compile-time checks: a swap cannot name the poison's id or the
      seat it starts from and must say whether the alignments are
      exchanged; a role cannot invent a reason.

## 3. Roles

- [x] 3.1 Declare the Snake Charmer's step on an `any` arm and its rule on a
      `transformation` capability.
- [x] 3.2 Declare the Pit-Hag's step on an `other` arm beside its
      transformation.
- [x] 3.3 Apply the swap in `sv.ts` through the shared swap, then the
      poison; build both roles' facts in one place.
- [x] 3.4 Add role tests for both modules.

## 4. Ledger and documents

- [x] 4.1 Regenerate `docs/role-ownership.md` and add a ledger test for the
      two rows.
- [x] 4.2 Update `docs/architecture.md`, the slice 4 note in ADR 0002, the
      `rule.md` files and the matrix rows.

## 5. Verification

- [x] 5.1 The characterization tests pass unchanged after the move.
- [x] 5.2 A seeded driver plays Sects & Violets games through
      `applyCommand` on main and on this change; every digest is equal.
- [x] 5.3 Mutation checks.
- [x] 5.4 `npm run verify` passes (Node 26.13.0 on this machine; CI runs
      Node 24).
- [x] 5.5 `node --test scripts/*.test.ts` passes.
- [x] 5.6 A Snake Charmer step is driven through the table at 390 px on
      main and on this change.
- [x] 5.7 `node scripts/openspec-check.ts` passes.

## Evidence

- RED: on the base of this change (`refactor/snv-information-night-steps`)
  the Snake Charmer's role test reports 3 tests, 0 passed, 3 failed: the
  module has no transformation capability and declares a legacy step. The
  Pit-Hag's reports 2 tests, 1 passed, 1 failed: its transformation existed,
  its step was the legacy field. The ledger test "the Snake Charmer and the
  Pit-Hag declare their step and resolve their change on capabilities"
  fails (22 tests, 21 passed, 1 failed). The compile-time checks report 11
  errors on the base, which has no `swap` decision.
- GREEN: the six characterization tests passed on the untouched modules
  (`snv.test.ts`: 160 plus 6, 166 passed). They pass unchanged after the
  move: the diff of `snv.test.ts` since their commit is empty.
- GREEN: the seeded driver gave the same digest of the canonical state for
  every game on main `6731b83` and on this change, and the same counters.
  Three runs, 800 games, all played: seed 31 with any bag; seeds 32 and 33
  with bags that lean toward the Snake Charmer, the Pit-Hag, the
  Philosopher and the No Dashii. The Snake Charmer took 1,362 steps, 445 of
  them drunk or poisoned and 41 by a Philosopher with its ability, and
  swapped into the Demon 111 times; the Pit-Hag took 961 steps.
- GREEN: mutation checks. Twelve single changes were made and reverted;
  eleven failed at least one test:
  - the Snake Charmer swaps while impaired (2), swaps with any player (8),
    keeps the alignments (4), poisons nobody (6) or skips the first night
    (5);
  - the Pit-Hag wakes every night (2) or cannot kill (3);
  - the swap is not applied (6), the poison is written before the swap (1),
    the poison's id lacks the acting seat (2), or a dead player is no
    longer refused (2).

  One change failed no test: the engine always exchanges the alignments,
  whatever the decision says. Every swap today is the Snake Charmer's,
  which exchanges them; the Barber's swap, which does not, will cover it,
  and also the swap without the poison.
- GREEN: `npm run verify` exited 0 on Node 26.13.0, the only Node on this
  machine (1,183 tests passed); Node 24 runs in CI. `node --test
  scripts/*.test.ts` passed (132 tests).
- GREEN: at 390 px, the eight-player game with the Snake Charmer and the No
  Dashii was seeded on the second night and driven through the table on the
  development server of main and of this change. The host tapped P8 (the No
  Dashii), opened the Snake Charmer's sheet and confirmed. Both builds
  printed the same record (equal hashes of the queue, the effects, the
  seats and the log): P3 the No Dashii, P8 the poisoned Snake Charmer, the
  poison `eff-snakecharmer-3-8`, and the Pit-Hag's step next. On both
  builds this sheet's content is 29 px wider than the sheet (395 against
  366), so the confirm button ends at 407 px of a 390 px page; it stays
  reachable and the page does not scroll sideways. That predates this
  change, which touches no screen.
- GREEN: `node scripts/openspec-check.ts` passed. `openspec validate
  --changes --strict` and `--specs --strict` with the CLI version CI pins
  (`@fission-ai/openspec@1.16.1`) passed after the requirements longer than
  500 characters were split; upstream CI had reported them on
  hose1021/grimoria#280.
