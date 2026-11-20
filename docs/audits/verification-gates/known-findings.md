# Known findings register

The findings gate is the defect register: it fails while any recorded finding is
open, and it passes when the register is empty. On the integrated `dev` tree the
register has no open finding, so `node scripts/verification/gates.ts
--scope=findings` passes with `VERIFICATION_BASE_REF` set to the PR base.

Run it locally against the PR base:

```sh
VERIFICATION_BASE_REF=origin/dev node scripts/verification/gates.ts --scope=all
```

## How a finding is recorded

A finding is one of:

- a UI contract in `ui-contracts.json` whose `status` is not `COMPLIANT`, or
  whose evidence is `STATIC_VERIFIED`, `UNREACHABLE` or `OUT_OF_SCOPE`;
- an engine rule in the traceability data whose level is
  `implemented-unverified` or `unsupported`;
- a legal command with no UI caller (`command-scope.json` `missing`);
- a failing regression test in `scripts/verification/findings.test.ts`;
- a removed test without an entry in `removed-tests.json`, or a removed atomic
  mapping without an entry in `removed-verification.json`.

A regression test starts as a failing source or behaviour assertion, names its
issue, and becomes behavioural before it can stand as evidence. A fixed row is
moved to the fixed state and the test becomes a contract; the finding is then
deleted from the register rather than skipped.

## History

The 2026-11-0x audit recorded eighteen regression tests and twenty-two
uncovered UI contracts. The fixes, by issue, are:

| Issue | Change | Evidence |
|---|---|---|
| #313 | A registered-dead Zombuul cannot nominate and its first vote spends the token | `snv.test.ts`, `engine.test.ts` |
| #314 | A character created mid-game starts knowing at that point | `snv.test.ts` |
| #315 | The Drunk may attempt the believed Slayer shot | `engine.test.ts` |
| #316 | A repeated seat is refused in every multi-target step | `bmr.test.ts`, `snv.test.ts` |
| #317 | The Pacifist survival control comes from `survivalProjection` | `table.test.ts`, browser `pacifist-survival` |
| #318 | A mandatory living step cannot be skipped; the Po no-one is a decision | `engine.test.ts`, browser `mandatory-skip` |
| #319 | The Klutz death choice has a day control | browser `klutz-day` |
| #320 | A borrowed day ability acts; a Drunk's shown one does not | `snv.test.ts`, `helpers.test.ts` |
| #321 | An impaired card opens for a chosen given answer | `helpers.test.ts` |
| #322 | A day or phase change clears the execution drafts | `helpers.test.ts`, browser `day-reset` |
| #324 | `/secrets` ticks and options agree with `secretsErrors` | `secrets-contract.test.ts`, browser `secrets-checks` |
| #325 | The correction dialog changes the shown role and deactivates an effect | browser `corrections` |
| #326 | The role catalogs keep their mechanical terms | `role-catalog.test.ts` |
| #327 | The dead-execution requirement matches States r1039 | `day-and-win/spec.md`, F-013 |
| #328 | A mid-game seat reorder is refused and the seat screen locks | `lifecycle.test.ts`, browser `seat-lock` |
| #330 | The notes field commits after a pause, not per keystroke | browser `notes-debounce` |
| #331 | A drunk and poisoned seat shows both states; duplicate projections are deleted | `table.test.ts`, `read-models.test.ts` |

## Counting

The traceability artifacts (`traceability.json`, `uncovered.json`,
`ui-contract-test-matrix.md`) are generated from `ui-contracts.json`,
`official-rules.json`, the rule dossiers and the test manifest. Regenerate and
check them with:

```sh
node scripts/verification/test-index.ts
node scripts/verification/build-trace.ts
node scripts/verification/build-uncovered.ts
node scripts/verification/render-matrix.ts
```

The verified scope is an integrity gate: it checks the trace and the cited
tests, not the absence of defects. The findings scope adds the register and the
regression suite, and it is the release gate.
