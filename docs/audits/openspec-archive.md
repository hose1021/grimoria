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
  squash removed that commit object, the accepted origin is kept as-is.
- No retention decision may weaken the pinned-rule, licensing or verification
  guarantees.
