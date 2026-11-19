# Independent audit of the verification gates

Audited: `feat/verification-gates` at `92373b2`, `dev` at `c4ccbdc`, 2026-11-19.
Method: every claim in this directory was treated as a hypothesis and checked
against the code or a command in a throwaway copy of the worktree. The
verification system's own defects are listed first, because a gate that reports
false confidence is worse than no gate.

## Verdict

The gate detected what it was built to detect, but four of its mechanisms could
pass while the property they guard was broken, and its central claim —
`ENGINE_VERIFIED` for 437 official rules — was not supported by the data. Those
five defects are fixed here. Everything else that remains is listed in
[known-findings.md](known-findings.md) and [uncovered.json](uncovered.json).

## Defects found and their disposition

| # | Defect | Evidence | Disposition |
|---|---|---|---|
| A-01 | Official rules were mapped by role, so `ENGINE_VERIFIED` meant "some row for this character has a passing test". `ROLE-EMPATH-001` (the two-neighbour count) inherited the registration and impairment rows. 437 of 523 rules claimed verification this way. | `build-trace.ts` expanded every official rule to `byRole.get(roleKey(rule.role))`; `traceability.json` showed `ROLE-EMPATH-001 → TB-EMPATH-01/02/03`. | Fixed: an official rule is verified only through an explicit `atomic-map.json` entry. Without one it is `ROLE_LEVEL_ONLY` and is registered as uncovered. One rule (`WIN-001`) is mapped and proven end to end below; 522 await review. |
| A-02 | The manifest counted declarations that cannot run: one test identity was a string fixture, and a commented-out `test(...)` would have been indexed too. | `scripts/check-types-policy.test.ts` contained `extractSpecifiers('test("export and import", () => {});')`; the committed manifest listed it as a test. | Fixed: `source-text.ts` scans code positions only. The phantom identity is gone (the manifest lost exactly one entry and gained the new self-tests). |
| A-03 | Skipped and todo tests were evidence. `test("x", { skip: true })` matched the indexer, was counted as a current citing test, and no gate refused it. | In a copy, `BMR-GODFATHER-01`'s only citing test was changed to `{ skip: true }`: the previous gate printed `passed`. | Fixed: declarations carry `skipped`, the gate fails when a verified rule's citing test is skipped, and `coveragePinFailures` treats a new skip as removal. |
| A-04 | Command reachability was a raw substring search over UI source, so a comment satisfied it. | In a copy, `useSlayer`'s only dispatch site was commented out: the previous gate printed `passed`; the current gate reports `UI command useSlayer has no dispatch site outside comments`. | Fixed: comments are stripped before the search; `source-text.test.ts` pins the behaviour. |
| A-05 | Stale matrix citations were findings, not failures, so `--scope=verified` was green with 51 stale citations. | `gates.ts` recorded them through `finding()`; `gates.ts --scope=verified` printed `passed`. | Partly fixed: citations are still findings in `verified` (they do not prove a current contract) but they fail `findings`. The stale rows themselves are corrected in `docs/rules-matrix.md` and the role rule documents. |
| A-06 | Mutation probes had no baseline: a probe whose target suite already failed was reported `DETECTED`. | `mutation.ts` treated any non-zero exit as detection. | Fixed: each probe runs its suite before mutating and fails as `MUTATION_BASELINE_FAIL`. |
| A-07 | Nine of the eighteen "regression tests" still assert source text, not behaviour. | `findings.test.ts` F-001, F-003, F-005, F-006, F-007, F-008, F-011, F-014, F-018 read production files and match strings or regexes. | **Open.** They reproduce the defect but do not prove the fix. Each product fix must replace its text assertion with a behavioural one; see the corrected tasks in `known-findings.md`. |
| A-08 | No branch protection or ruleset exists on `main` or `dev`; no status check is required. A red PR can be merged. | `gh api repos/hose1021/grimoria/branches/dev/protection` → 404; `gh api .../rulesets` → `[]`. | **Owner action.** The exact configuration is in [ci.md](ci.md). The agent must not weaken or bypass this. |
| A-09 | Documentation contradicted the code, and seven UI contracts named browser scenarios that the suite never runs (`table surface`, `languages`, `script switching`, `acceptance`, `demo isolation`, `poisoned-card`). The manifest indexed only `focusedChecks`, not the `fullChecks` phases. | `README` claimed 15 browser cases (16); `known-findings` said the Po no-one was missing (implemented at `roles/po/role.ts:22`, asserted in `bmr.test.ts`), and that Juggler and Klutz need `hasAbility` (they already use it); `survivalAllowed` is not exported, so the prescribed fix was impossible. | Fixed here: the documents state the audited status; the index now includes the 13 `phase(...)` scenarios, `languages` was replaced with the phases that actually switch language, `acceptance` with `phone acceptance`, and the stray `poisoned-card` reference was removed. Each product issue keeps its own scope. |
| A-10 | UI contract → test links are free text. 41 of 98 referenced `.test.ts` files mention none of the contract's rule IDs. | `testRefsOf` extracts paths with a regex from `tests`/`source`; the gate only checks the file exists. | **Open.** Recorded in `uncovered.json`; a stricter check needs reviewed per-contract test identities. |
| A-11 | The four independent audits that produced the data are untracked, so the committed data cannot be regenerated or diffed. | `git ls-files docs/audits` lists only `verification-gates/`; the upstream directories are present but untracked. | **Owner decision.** The vendored copies are committed and reviewable; tracking the upstream audits is a licensing/content decision. |
| A-12 | The findings gate mixed matrix hygiene with product defects, so a red job could mean either. | 51 stale citations and 17 product regressions produced one failure list. | Fixed by A-05 and by keeping the product regressions in their own suite; the job stays red until both are clean. |
| A-13 | A verified official rule could lose its atomic mapping and the gate stayed green. | Removing the WIN-001 entry kept `--scope=verified` green. | Fixed: `removed-verification.json` plus a base-branch comparison; a dropped mapping fails without an allowlist entry. |

## Confirmed defects that remain product issues

The 15 linked issues were re-checked against the code and the pinned wiki text.
All reproduce. Two partial corrections to the issue text are in
`known-findings.md`: the Po no-one half of #318 is implemented, and the Klutz
command of #319 exists — only its day control is missing.

## End-to-end proof: WIN-001

1. **Pinned text.** `docs/official/wiki/Glossary.r3168.wikitext`, line 161: "Win: … Good wins when the Demon dies." Permanent: <https://wiki.bloodontheclocktower.com/index.php?title=Glossary&oldid=3168>. `node scripts/check-official.ts` passes for the 82 pinned entries.
2. **Official rule.** `WIN-001` — "Good wins when the Demon dies", source {Glossary, r3168, Win}.
3. **Atomic mapping.** `atomic-map.json`: `"WIN-001": ["SYS-WINS-02"]`.
4. **Engine row.** `SYS-WINS-02` "Win order" documents "no living Demon" among the win conditions.
5. **Trace.** `traceability.json`: `status: ENGINE_VERIFIED`, `mapping: atomic`, and `engineTests` includes `engine.test.ts::win priorities: no living Demon is checked before the two-alive evil win (SYS-WINS-02)`.
6. **Execution.** `node --test --test-name-pattern="win priorities: no living Demon is checked before the two-alive evil win" src/core/engine/engine.test.ts` reports `pass 1 / fail 0`.
7. **Consequence.** Replacing `return setWinner(state, "good", "demon-dead", ports);` with `return null;` makes that test fail with `AssertionError: null !== 'good'` at the winner assertion. The committed probe `demon-dead win silenced` reports the same failure in the mutation job.
8. **Negative checks.** A citing test changed to `{ skip: true }` makes the gate fail with `cites a skipped test`; a test renamed without the rule ID fails with `has no current citing test whose name carries the rule id`; removing the mapping turns the rule into `ROLE_LEVEL_ONLY`, and with a base branch the downgrade fails unless `removed-verification.json` records it. The pure rules are covered by `scripts/verification/gate-rules.test.ts`.

All other official rules stay `ROLE_LEVEL_ONLY`. The 1379 indexed tests are not a substitute for the per-sentence review.

## What the gate now proves, and what it does not

Proves: the committed trace is current; every engine rule marked `verified` has
a current, executing test whose name carries its ID; no test identity disappeared
without an allowlist entry; every command is classified and every `ui` command has
a non-comment dispatch site; the layer policy holds; a UI contract does not claim
a browser test it does not have; the artifacts match their inputs.

Does not prove: that a test asserts the rule it names (no static check can —
mutation probes and review are the control); that an official sentence is
equivalent to the engine rows that implement it (that is the atomic review);
that a UI contract's listed test exercises it (A-10). The gate is a floor.

## Reproduction

```sh
node scripts/verification/gates.ts --scope=verified
node scripts/verification/gates.ts --scope=findings   # expected red
node --test scripts/verification/source-text.test.ts scripts/verification/gate-rules.test.ts
node scripts/verification/mutation.ts
```
