# Proposal

## Why

`docs/rules-matrix.md` pins every rule claim to a permanent wiki revision, but the
repository stores only the links, and the three files in `docs/official/` carry
provenance inconsistently. A silent edit or a vanished wiki revision can no longer
be detected, so a `verified` row loses the text it rests on.

Issue: #178

## What Changes

- Add `docs/official/manifest.json` (schema version 1) with one entry per official
  file: `path`, `source`, `retrieved`, `commit`, `sha256`, and for wiki snapshots
  `revid`, `revisionTimestamp` and an optional `localOnly` marker.
- Add `scripts/check-official.ts`: offline verification of both directions. It
  fails on a missing file, a hash mismatch and an unlisted file, and it accepts a
  `--root` so the failure modes are tested on fixtures.
- Add `docs/official/README.md` with the source of each file, retrieval dates, the
  licensing decision and the refresh procedure. Add one pointer line to
  `docs/AGENTS.md`.
- Add `scripts/fetch-official.ts`: read the pinned `index.php?title=…&oldid=…`
  links from `docs/rules-matrix.md`, fetch each revision through the MediaWiki API,
  write `docs/official/wiki/<Title>.r<revid>.wikitext` and extend the manifest. A
  second run produces no diff. `--check` reports pages whose latest revision moved,
  writes nothing and exits 1 on drift.
- Extend `check-official.mjs`: every unique pinned (title, revision) pair has a
  manifest entry, and a committed snapshot must match its hash.
- Replace manual step 1 of the matrix "Update procedure" with the script command.
  No row, `oldid` link or status changes.
- Add `node scripts/check-official.ts` to `npm run verify` and the pull-request
  `lint` job, with its fixture test.

The three files `roles.json`, `nightsheet.json` and `jinxes.json` stay
byte-identical; their provenance moves into the manifest only. No game rule,
requirement, test or application behavior changes.

## Capabilities

### New Capabilities

- `workflow/official-provenance`: how official rule sources and pinned wiki
  revisions carry provenance, and how the repository verifies it offline and
  reports drift.

### Modified Capabilities

None.

## Impact

- `docs/official/manifest.json`, `docs/official/README.md`, `docs/AGENTS.md`,
  `docs/rules-matrix.md` ("Update procedure" step 1).
- `scripts/check-official.ts`, `scripts/check-official.test.ts`,
  `scripts/fetch-official.ts`, `scripts/fetch-official.test.ts`,
  `scripts/official-pins.ts`.
- `package.json` `verify` script, `.github/workflows/ci.yml` lint job,
  `.gitignore` (Path B only).
- No runtime dependency; Node built-ins only. No network access in CI.
