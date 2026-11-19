# Coverage and evidence policy

## Evidence levels

| Level | Meaning | Gate |
|---|---|---|
| `CONTRACT_TESTED` | engine/application contract test with an independent expected state | `verified` |
| `COMPONENT_TESTED` | pure view-model/selector test or a browser component check | `verified` |
| `BROWSER_VERIFIED` | Playwright case or `fullChecks` phase | `verified` |
| `STATIC_VERIFIED` | reviewed code trace only; no executable oracle | `findings` (red) |
| `UNREACHABLE` | no production caller | `findings` (red) |
| `OUT_OF_SCOPE` | not part of the saved-game surface, with a reason | `findings` (red) |

`STATIC_VERIFIED` is not a passing gate. Every non-COMPLIANT or static-only UI
contract is in `uncovered.json` with its issue and task.

## An official rule needs its own mapping

`atomic-map.json` maps one official rule ID to the engine rows whose documented
requirement covers that sentence. No entry means `ROLE_LEVEL_ONLY`: the rule is
not verified, whatever the other rows for that character prove. A mapping entry
must reference a known engine rule and must not be empty; the builder rejects
both. The review that adds an entry reads the official statement and the row's
matrix requirement, and records the pair in the same commit.

## Evidence must execute

- A `test(...)` declaration inside a comment or a string is not a test.
- `test.skip`, `test.todo`, `{ skip: true }`, `{ todo: true }`, a skipped
  `describe`, and a body-level `t.skip()` all make a declaration or the whole
  file non-evidence. The body-level case is conservative: the declaration cannot
  be attributed statically.
- `gates.ts --scope=verified` runs every test file cited by a `verified` engine
  rule. A named test that exists but fails is not evidence.
- Name identity is still not assertion strength. Mutation probes and review are
  the control; the gate cannot prove an assertion tests what its name says.

## No silent deletion

`test-manifest.json` is a committed list of executing test identities
(`file::name`) and browser cases. With `VERIFICATION_BASE_REF` set, the gate
compares against the base branch manifest and fails when an identity:

- disappears, or
- becomes skipped.

A deliberate removal must be listed in `removed-tests.json` with a reason. An
entry for a test that still exists fails the gate, so the allowlist cannot rot.
Regenerating the manifest is not a justification.

## Duplicate identifiers

A role document, the shared document and the matrix may declare the same rule
ID once each (that is how the matrix and the dossier merge). Two declarations in
the same source, or two matrix rows with one ID, stop the builder.

## No line-coverage percentage as a criterion

Line coverage is not used. A contract is covered only by a named test with an
independent expected result. `check-acceptance.ts` remains the rule-ID/test-name
check; the gate additionally resolves current tests, skip state and the
execution of the cited files.

## Known gaps

- The atomic map is empty; all 523 official rules are `ROLE_LEVEL_ONLY` until
  each is reviewed.
- UI contract → test links are free text. A named browser scenario is checked
  against the index; a node test file is not checked against the contract's rule
  IDs.
- 11 of the 17 regression tests assert source text; they must become behavioural
  oracles with their fixes.
- The component layer is browser-tested; no jsdom/TSX test dependency is added.
- Property-based tests are seeded, deterministic hand-rolled generators; no
  external property library.
