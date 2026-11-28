# Proposal

Issue: #200

## Why

The Bad Moon Rising exception register recorded 30 rules as `mechanical-gap`:
the engine already implements the pinned sentence, but no test asserts the
branch. One row was a citing error (the Pukka) and one a source pin that named
the wrong section (the Goon). A second inconsistency sat in `bmrTargetError`,
which checked real life while the command path checks registered life, so the
Devil's Advocate and Chambermaid helper disagreed with enforcement for a
registered-dead Zombuul.

## What Changes

- Add regression tests in `src/core/engine/bmr.test.ts` for every remaining
  Bad Moon Rising mechanical gap, asserting the rule-visible outcome.
- Make `bmrTargetError` read `registersAlive`, matching `completeStep` and the
  night flow.
- Move the 30 covered rows to `covered-but-unmapped` with the asserting test
  name, re-pin the Goon clause to `How to Run`, and correct the Shabaloth and
  Gossip reasons.
- Regenerate the readiness matrix and the verification gate data.

No role behavior, rule pin, public API or storage schema changes.

## Capabilities

### New Capabilities

- `engine/bmr-rule-coverage`: every audited Bad Moon Rising sentence that has a
  mechanical consequence now cites a current asserting test.

### Modified Capabilities

None.

## Impact

- `src/core/engine/bmr.test.ts` (new tests)
- `src/core/engine/bmr.ts` (target helper reads registered life)
- `docs/audits/rule-exceptions/bmr.json`, `docs/audits/release-readiness.md`
- `docs/audits/verification-gates/**` (regenerated)

## Out of Scope

- Changing a rule, a role module, the night order or a source pin revision.
- The five register rows that remain genuine mechanical gaps.
