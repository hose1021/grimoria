# Design

## Registry and the matrix

`rules/roles/*.json` and `rules/shared.json` are canonical: identifier, level,
revision, requirement text and asserting tests. The matrix keeps the pinned wiki
links and the audit columns an author writes (role, level, revision, citations,
status). Its requirement column is generated from the registry and checked by
`scripts/sync-rules-matrix.ts`; `--write` renders the column, `--check` fails on
drift, missing, unknown or duplicated identifiers.

## Archive protection

Three facts are separate. `commit`/`date` record the historical origin of a
change. `treeHash` pins the archived bytes. Retrieval reads the tree in the
integrated repository; the commits are provenance, not the retrieval path. The
index is append-only, the current baseline must cover every indexed tree, and
`fixtures/conformance/openspec-archive-baseline.json` holds the original anchor.
A change accepted on the target branch is protected by comparing the branch
baseline with the current index, so a later archive cannot be removed by
rewriting the archive, index and current baseline together.

## Evidence

- The citation parity test compares rule id, file and test name; the one renamed
  Artist test is recorded as a correction with its reason.
- The R3 artifact check validates issue ownership: the named change's proposal
  must carry the PR issue. A verification-policy migration may set
  `Policy migration: true` and skip gameplay delta specs.
