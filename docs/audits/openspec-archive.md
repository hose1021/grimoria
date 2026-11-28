# OpenSpec archive storage

The archived changes stay in Git so a squash merge cannot lose them. The
directories under `openspec/changes/archive/` are the current fallback. They
are not the final storage form.

## Implemented now

Each index entry records the archived change, its issue line, its origin commit and
the asserting test files its delta specs name. These are existing references for a
reviewer to trace a closed checklist item; an introduction commit alone is not
proof that the work was done. The entry also records two different facts. `commit` and `date` are the
historical origin: where the change was first added. Retrieval does not depend on
those commits, which a squash merge may drop: the evidence is the archived tree
in the integrated tree, pinned by `treeHash`, the index and the baseline fixture.

- Every archived change keeps its full tree in the repository.
- `scripts/archive-index.ts` records one entry per change: the introducing
  commit, its date, the path and a SHA-256 of the complete tree, and refuses to
  drop an earlier entry.
- `npm run verify` and CI run `archive:index --check`, which recomputes every
  tree hash and fails on a changed or missing file.

## Planned, not implemented

- Not built yet. The plan packs the archive into one content-addressed file,
  `docs/audits/openspec-archive.bundle`, created with `git bundle create` over
  the archived commits.
- Record its SHA-256 in `docs/audits/openspec-archive-index.json` and verify the
  digest before any retrieval.
- Retrieve with `git bundle verify` and `git bundle unbundle` into a scratch
  directory; no network access and no dependency on the original branch.
- Delete the archive directories only after a fresh clone retrieves every entry
  from the bundle and the digest matches.

## Pre-release provenance preflight

Before a release pull request, run:

```sh
npm run release:preflight -- origin/main
```

The command compares every indexed origin with the first add on the target
branch. When the target first add differs — as it does for every archive that a
squash release does not carry from `dev` — the archive needs an origin record in
`fixtures/conformance/archive-origins.json`. The command names every archive
without a matching record and fails. It reads the gate's inputs and changes no
validation rule.

Run it after the archive sync and before the release pull request. The release
checklist records the result.

## Rules

- The archive is a squash-safe file in the integrated tree, never a reference to
  an intermediate PR commit.
- The index is append-only: a later archive adds entries and cannot remove them.
- Tree hashes hash the canonical text form (CRLF to LF, as `.gitattributes`
  requires) and binary bytes raw, so an accepted tree keeps the same hash across
  checkouts with a different stored line ending.
- A content change to an archived tree fails the gate until a reviewed commit
  records it in `fixtures/conformance/archive-corrections.json` with the old
  hash, the new hash and a reason, and updates the index, baseline and anchor.
- The index declares `canonicalization: "text-lf-binary-raw-v1"`: text hashes the
  LF form, binary bytes are hashed raw.
- A recorded origin must be the first add of the change path. A squash that
  removed that commit needs a reviewed record in
  `fixtures/conformance/archive-origins.json` with the name, commit, date and
  reason; the target branch keeps the origin it accepted. An origin written in
  the same commit as the archive is self-attestation and fails.
- The original anchor fixture records only the archives the target branch
  accepted at introduction; a new archive is pinned by the current baseline and
  is checked by the readiness gate. The anchor is immutable: the target's copy
  must keep exactly its names and hashes.
- `archive:index` appends a new archive to the current baseline. It refuses to
  rewrite an accepted record, so a changed tree needs a correction entry.
- An archive outside the anchor must be complete and applied: no open checklist
  item, non-empty RED/GREEN evidence, and every ADDED or MODIFIED requirement
  present in the baseline while a REMOVED one is gone. The requirement's
  normative text, without its `Source` and `Tests` citations, must equal the
  baseline's text at the transition; a body the baseline legitimately refined
  after the sync carries a reviewed record in
  `fixtures/conformance/archive-content-corrections.json` with the archive, the
  requirement and a reason. A record whose body already matches is stale, and a
  record that names no archived requirement fails. Accepted archives are checked
  only for integrity, not against the current spec forever.
- An archived delta spec may name a historical `.mjs` or type-test file. A
  reviewed record in `fixtures/conformance/legacy-test-paths.json` maps it to the
  current file; when a delta spec names none, the change's task and design
  evidence is read. An unresolved reference fails the gate.
- A test reference must be a regular file inside the repository; a symbolic
  link or a directory fails, and a runnable test must also be in the test
  manifest. A delta spec may name a file that never existed only through a
  reviewed record in `fixtures/conformance/archive-test-corrections.json`.
- No retention decision may weaken the pinned-rule, licensing or verification
  guarantees.
