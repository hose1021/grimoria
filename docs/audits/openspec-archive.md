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
- A recorded origin is validated as the first add of the change path; when a
  squash removed that commit object, the index committed with that add keeps the
  accepted origin. A target branch keeps the origin it accepted.
- An origin introduced by the same commit that adds the archive is the only
  record the repository holds; no earlier one is observable. Review covers that
  record, and a later rewrite still fails.
- The original anchor fixture is immutable: the target branch's copy must keep
  exactly its names and hashes. A new archive is pinned by the current baseline,
  never by the anchor, so it cannot exempt itself from the readiness gate.
- `archive:index` appends a new archive to the current baseline. It refuses to
  rewrite an accepted record, so a changed tree needs a correction entry.
- An archived delta spec may name a test file that was renamed or never existed.
  A reviewed record in `fixtures/conformance/archive-test-corrections.json` maps
  it to the current asserting file; an unresolved reference fails the gate.
- An archive outside the original anchor must be complete: no open checklist
  item and a RED/GREEN evidence record. Anchor entries stay untouched.
- No retention decision may weaken the pinned-rule, licensing or verification
  guarantees.
