# OpenSpec archive storage

The archived changes stay in Git so a squash merge cannot lose them. The
directories under `openspec/changes/archive/` are the current fallback. They
are not the final storage form.

## Current shape

- Every archived change keeps its full tree in the repository.
- `scripts/archive-index.ts` records one entry per change: the introducing
  commit, its date, the path and a SHA-256 of the complete tree, and refuses to
  drop an earlier entry.
- `npm run verify` and CI run `archive:index --check`, which recomputes every
  tree hash and fails on a changed or missing file.

## Target shape

- Pack the archive into one content-addressed file,
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
- A content change to an archived tree fails the gate until a reviewed commit
  updates both the index and docs/audits/openspec-archive-baseline.json.
- No retention decision may weaken the pinned-rule, licensing or verification
  guarantees.
