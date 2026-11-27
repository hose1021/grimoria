# Migrate the remaining death-step roles

Issue: #211

## Why

The `death-step` capability and `deathStepOf` accessor landed with the Klutz.
Barber, Sage and Sweetheart still declare legacy `nightStep`/`deathStep` fields
and keep the engine accessor on the fallback path. Their step shapes and actor
predicates are already identical; only the declaration form differs.

## What changes

- Barber declares both its night and death steps on `night-step`/`death-step`
  capabilities with `timing: "other"` and the same `barberAfterSoberDeath`.
- Sage and Sweetheart declare both steps on the same two arms with the same
  actor predicates.
- The legacy `deathStep` fallback remains only for modules that still use it.
- A combined role test pins all three declarations; the existing Sage and
  Sweetheart tests read the step through `nightStepFor`.
- The ownership ledger shows `capability:night-step, capability:death-step`.

## Out of scope

- Dreamer and Evil Twin answer ownership.
- Any change to the death step's effect, journal, projection or replay.
