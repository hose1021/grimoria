# Proposal

Issue: #219

## Why

Three Sects & Violets rules were wrong against the pinned text:

- States r1039: "A drunk or poisoned player has no ability… a poisoned Demon
  cannot kill anyone." The S&V outcome path applied recorded Demon deaths
  without checking the Demon's impairment.
- Fang Gu r2974: "If the Fang Gu attacks an Outsider but that Outsider does not
  die, that Outsider does not become an evil Fang Gu and the Fang Gu does not
  die." The jump fired for an already-dead Outsider.
- States r1039: an impaired Townsfolk may receive false information, but
  "You're not required to give incorrect info." The engine removed the true
  value from the offered answers whenever the actor was impaired, even without
  a Vortox.

## What Changes

- `recordSvOutcome` rejects recorded deaths from an impaired S&V Demon with
  `error.52`, matching the BMR path.
- The Fang Gu jump requires a living Outsider target.
- The numeric and yes-no info paths offer the true value when only impairment
  applies; a living Vortox still removes it.

## Out of Scope

- The Barber, Sweetheart, Klutz and Evil Twin findings, reported separately.
- Mixed-edition protection interactions; supported scripts reject mixing.
