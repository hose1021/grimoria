# Proposal

Issue: #326

## Why

The pinned Empath page (r1724) says "Each night, you learn how many of your 2
alive neighbors are evil." The Russian catalog drops the count: "Каждой ночью вы
узнаете, сколько из ваших живых соседей - злые." A Storyteller who reads the
Russian card cannot tell that the Empath counts exactly two neighbours, and the
audit finding F-015 records the omission.

## What Changes

- Restore `2` in the Russian Empath ability in `public/assets/data/ru_RU.js`, so
  it reads "сколько из ваших 2 живых соседей".
- Make the F-015 regression require the count to belong to the alive
  neighbours, not merely that the ability contains a digit.
- Record the fixed finding in the verification register.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: the role catalog states a mechanically significant
  count in every locale; the Russian Empath is the covered case.

## Impact

- Data: `public/assets/data/ru_RU.js`. The English and Azerbaijani abilities
  already state `2`, and the Russian reminder already shows `(0, 1, 2)`.
- Test: `scripts/verification/findings.test.ts`.
- Register: `docs/audits/verification-gates/known-findings.md`.
- No engine, command, persistence, source pin or dependency change.
- The other #326 items (RU Juggler, RU Tinker, AZ Godfather, AZ Exorcist, F-016)
  stay open: they are Bad Moon Rising or UI-copy findings, outside the Trouble
  Brewing release scope.
