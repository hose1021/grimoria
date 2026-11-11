# Proposal

Issue: #42
Parent: #19

## Why

The audited rules matrix lists the discretionary rows as `host-choice`, and the
engine already offers legal options for the information roles (Trouble Brewing,
Bad Moon Rising and Sects and Violets), the Mayor redirect, the Demon heir and
the madness penalty. What was missing is one contract around those answers:

- some steps accepted any answer instead of one of the offered options;
- a Spy or Recluse registration accepted a player who cannot register or a
  value the information functions never read;
- no answer wrote its case and Storyteller reason to the journal, so the host
  could not see why a choice existed or what had been chosen.

Issue #42 asks for one contract: every discretionary decision offers only legal
options, records the chosen reason in the host journal, and a hidden choice
never reaches the public or player projection.

## What Changes

- Add `src/core/engine/host-choice.ts`: a closed case list, a Storyteller-facing
  reason per case, a case mapping for a step, an answer-legality check, the
  legal Spy/Recluse registrations and one journal writer that stores the case,
  the chosen value and the reason as a secret entry.
- Enforce answer legality where the engine already computes options: a completed
  Sects and Violets or Trouble Brewing information step accepts only an offered
  answer and rejects anything else with `error.66`, leaving the step open.
- Enforce registration legality: only a Spy or a Recluse may register, and only
  with a value the information functions read; anything else is `error.67`.
- Record every accepted host answer in the secret journal with its case and
  reason.
- The public and player projections are unchanged and carry no case, reason or
  hidden role.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game/command-engine`: adds the shared host-choice contract, answer and
  registration legality, and the journal record for a discretionary answer.
- `app/ui-shell`: the console keeps one control per legal option; the case and
  reason stay in the secret journal, never in a public or player projection.

## Impact

- Runtime: `src/core/engine/host-choice.ts` (new), `night.ts`, `context.ts`,
  `index.ts`.
- Tests: `js/host-choice.test.mjs` (new).
- Docs: none beyond the change; the matrix rows keep their existing levels.
- No schema change, migration or new dependency.
