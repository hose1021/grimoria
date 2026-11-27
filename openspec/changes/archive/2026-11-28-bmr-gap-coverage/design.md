# Design

## Context

The triage of the Bad Moon Rising register read every mechanical-gap row
against the pinned wiki text, the engine path and the nearest existing test.
Every engine branch matched its pinned sentence; the gaps were coverage and
citations, plus one latent helper inconsistency.

## Decisions

### Assert the outcome, not the command

Each new test drives the public domain API (`completeStep`, `kill`,
`recordBmrOutcome`, `executeByDecision`, `bmrInfoForStep`) and asserts the
state, death, effect, winner or information a player would observe. It does not
restate the payload it passed in.

### One target check

`bmrTargetError` is the pure helper behind the Sailor, Devil's Advocate,
Chambermaid and Grandmother restrictions. It now uses `registersAlive`, the
same predicate as `completeStep` and the night flow, so a registered-dead
Zombuul is refused in both paths. Deleting the helper was rejected because the
existing restriction test uses it as a pure seam.

### Fixtures stay local

Every new test uses the existing `make`, `startNight`, `finishNight`,
`skipRemaining`, `impair` and `deadToday` fixtures. No new harness or helper
module is added.

### The register names the test

A covered row carries `test: src/core/engine/bmr.test.ts::<exact test name>`.
The checker proves the citation form, not the assertion; the review proves the
assertion.

## Risks

- A test can drift from the pinned sentence. Mitigation: the register row keeps
  its pinned source and the assertion quotes the rule in its message.
- `bmrTargetError` is exported and used by the test seam; changing it is a
  behavior fix only for registered-dead targets, which the command path already
  refused.
