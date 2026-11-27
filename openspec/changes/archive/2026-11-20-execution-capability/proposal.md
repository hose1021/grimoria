# Execution capability for the Pacifist

Issue: #212

## Why

`survivalAllowed` in `day.ts` hardcodes the Pacifist: it scans for a living
unimpaired Pacifist and decides whether an executed good player may survive.
That is role rule data in the engine.

## What changes

- `RoleCapability` gains the `execution` arm with read-only facts and a
  `survives` / `dies` / `win` / `no-effect` decision.
- The Pacifist declares the arm: a good target with a living unimpaired
  Pacifist may survive; another target cannot.
- `survivalAllowed` builds the facts and asks the Pacifist module. The command
  path keeps its validation, error code, death path and journal.

## Impact

No command, state, journal or winner shape changes. The host still decides
whether to use the survival option.
