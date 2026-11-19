# Coverage and evidence policy

## Evidence levels

| Level | Meaning | Gate |
|---|---|---|
| `CONTRACT_TESTED` | engine/application contract test with an independent expected state | `verified` |
| `COMPONENT_TESTED` | pure view-model/selector test or a browser component check | `verified` |
| `BROWSER_VERIFIED` | Playwright regression case | `verified` |
| `STATIC_VERIFIED` | reviewed code trace only; no executable oracle | `findings` (red) |
| `UNREACHABLE` | no production caller | `findings` (red) |
| `OUT_OF_SCOPE` | not part of the saved-game surface, with a reason | `findings` (red) |

`STATIC_VERIFIED` is not a passing gate. Every non-COMPLIANT or static-only UI contract is in `uncovered.json` with its issue and task.

## No silent deletion

`test-manifest.json` is a committed list of test identities (`file::name`) and browser cases. `test-index.ts --check` fails when:

- a manifest test is no longer in the tree (removal);
- a new test is not in the manifest (stale manifest).

A deliberate removal must update the manifest in the same PR; the diff is visible and reviewed. The gate does not accept a skip, a changed expected value or a weakened assertion as a replacement.

## No line-coverage percentage as a criterion

Line coverage is not used. A contract is covered only by a named test with an independent expected result. `check-acceptance.ts` remains the rule-ID/test-name check; the new gate additionally resolves current tests and UI test artifacts.

## Known gaps

- The official rule mapping is role/topic-level.
- The matrix has 51 stale citations; they are reported as findings and do not hide current tests.
- The component layer is browser-tested; no jsdom/TSX test dependency is added.
- Property-based tests are seeded, deterministic hand-rolled generators; no external property library.
