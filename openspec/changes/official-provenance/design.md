# Design

## Context

See `proposal.md` - Why. Current state that shapes the approach:

- `docs/rules-matrix.md` holds every pin as a Markdown link
  `https://wiki.bloodontheclocktower.com/index.php?title=<Title>&oldid=<N>`.
  There are 79 distinct links: 72 role pages plus 7 rules pages. The link set is
  the single source of truth for pins; nothing may copy it.
- `docs/official/` holds exactly `roles.json`, `nightsheet.json` and
  `jinxes.json`. Only `jinxes.json` names its source; it also holds `committed`.
- The repository has no runtime dependencies and no network access in CI. Policy
  scripts (`scripts/check-types-policy.ts`, `scripts/check-toolchain.ts`,
  `scripts/check-acceptance.ts`) share one shape: `fail()` collects messages,
  `process.exit(1)` at the end, a focused `*.test.mjs` next to the script.
- `.gitattributes` forces `eol=lf` for all text, so a byte hash of a working-tree
  file equals the committed blob on every platform.

## Goals / Non-Goals

**Goals:**

- One machine-checkable provenance record for `official/` and for every pin.
- Offline verification fast enough for `npm run verify` and PR CI.
- Snapshot and drift tooling that never edits a pin, a matrix row or a status.
- Failure modes provable by fixtures, not by editing the real tree.

**Non-Goals:**

- Scheduled drift CI, issue filing on drift, readability tooling for wikitext,
  and any rules review automation. Each is a separate issue.
- Changing the official JSON files, the engine, or any test.

## Decisions

### Manifest shape: one JSON document with `version` and `files`

`docs/official/manifest.json`:

```json
{
  "version": 1,
  "files": [
    {
      "path": "docs/official/roles.json",
      "source": "https://release.botc.app/resources/data/roles.json",
      "retrieved": "2026-11-03",
      "commit": "43d2128",
      "sha256": "…"
    }
  ]
}
```

Wiki entries add `revid`, `revisionTimestamp`, `title`, and optionally
`localOnly`. Alternative: a sidecar `.meta.json` per snapshot. Rejected because a
new file per snapshot doubles the tree and complicates the "unlisted file" rule.
A `jinxes.json`-style inline metadata object was rejected: those files must stay
byte-identical.

`commit` for the three existing files comes from `git log`: `43d2128`
(2026-11-03) for `roles.json` and `nightsheet.json`, `69bb3ba` (2026-11-11) for
`jinxes.json`. `retrieved` uses the dates the matrix states.

### Licensing gate: `localOnly` entries, Path B default

The issue leaves the wiki licence undecided and forbids committing wiki text
until the owner decides. The default is Path B:

- `docs/official/wiki/` is listed in `.gitignore`; snapshots are generated
  locally.
- Manifest entries for wiki revisions are committed with `localOnly: true` and
  the hash of the fetched text, so the pin coverage stays checkable in the
  repository.
- `check-official.mjs` verifies the hash of a `localOnly` entry only when the
  file exists, and never fails for its absence.

Path A is a two-line switch: remove the `.gitignore` entry, commit the snapshots,
drop `localOnly`. No spec or script change is needed. Alternative: commit nothing
about revisions and keep a local manifest. Rejected because the pinned revisions
would then not be recorded in the repository at all.

### Shared pin parser: `scripts/official-pins.ts`

Exports:

- `parsePinnedRevisions(matrixText)` → sorted unique
  `{ title, revid, source }`, title decoded from the URL
  (`Sects_%26_Violets` → `Sects & Violets`), `revid` an integer.
- `snapshotFileName(title, revid)` → `<Title>.r<revid>.wikitext` with spaces
  replaced by `_`; other characters stay literal.
- `snapshotPath(title, revid)` → `docs/official/wiki/<file>`.

Both `check-official.mjs` and `fetch-official.mjs` import it, so the definition of
"a pin" exists once. Alternative: duplicate the regex. Rejected: two parsers drift.

Wikitext and `sha256` are bytes: the fetch writes LF, the hash covers the stored
bytes.

### Verification entry point: `check-official.mjs --root <dir>`

Default root is the repository root. `--root` lets `check-official.test.mjs`
build a throwaway `docs/official/` with one mutated byte, an extra file and a
missing file, then assert exit codes and messages. The real tree is never touched.
The script reads the matrix through the same root, so the pin-coverage failure is
also fixture-testable.

Checks, in order: bytes and existence per entry, then unlisted files, then pin
coverage. `manifest.json` and `README.md` are the only exempt names; a stray
editor backup therefore fails.

### Fetch client: MediaWiki API with `Special:Export` fallback

Fetch one revision with
`api.php?action=query&prop=revisions&rvprop=ids|timestamp|content&rvslots=main&revids=<id>&format=json&formatversion=2`.
Batch drift checks use
`action=query&prop=revisions&rvprop=ids&titles=<up to 50 titles>&format=json&formatversion=2`.
Both are the calls the matrix already documents. Verified on 2026-11-15 against
`revids=2630`: the response returned `title: "Washerwoman"`,
`timestamp: 2024-12-08T15:02:41Z` and the wikitext in `slots.main.content`, so
`rvslots=main` is the working shape. `Special:Export/<Title>` with the revision
id remains the fallback for a single revision.

Client rules: explicit `User-Agent` naming the repository, one request at a time,
1 s delay, `maxlag=5`, `Accept-Encoding: identity`. A non-200 response, an API
`error`, a missing revision or a title mismatch aborts the run before any write
for that revision.

Idempotence: entries merge by `path`. When the fetched bytes hash equal to the
existing entry, keep the entry untouched, including `retrieved`. When they differ,
write the snapshot and update `sha256`, `retrieved`, `revisionTimestamp` and
`revid`. The manifest is written with two-space indent and a trailing newline, so a
repeat run produces no diff.

Drift: `--check` fetches no content and writes nothing. It prints
`<Title>: pinned r<N>, latest r<M>` per moved page and exits 1 when any pin is
behind.

### Wiring

`node scripts/check-official.ts` is appended to `npm run verify` after
`check-types-policy.mjs`, and added as a step in the CI `lint` job, together with
`node --test scripts/check-official.test.ts` and
`node --test scripts/fetch-official.test.ts`. Rationale: it is an offline, fast
file-policy check, like `check-toolchain`; it must not live in the network-facing
browser job. `fetch-official.test.mjs` uses an injected request function, so CI
never contacts the wiki.

## Risks / Trade-offs

- **Licence unresolved** → Path B is the default; PR 1 does not depend on the
  decision, and Path A needs no code change.
- **API shape differs from the matrix note** → verify in task 2.1; fall back to
  `Special:Export` for single revisions and `prop=revisions` by title for drift.
- **Hashes break on a CRLF checkout** → `.gitattributes` forces `eol=lf`; the
  fetch writes LF explicitly, and the check hashes the bytes on disk.
- **A legitimate snapshot refresh looks like tampering** → the README refresh
  procedure updates the manifest in the same commit; the failure message names the
  refresh procedure.
- **`localOnly` entries hide a deleted snapshot in Path B** → the check verifies
  the hash whenever the file exists, so a corrupted local snapshot still fails.
- **Drift check hits the wiki on every run** → it is manual-only in this change,
  never part of `verify` or CI.

## Migration Plan

1. PR 1 (`docs/official-provenance-manifest`) adds the manifest, README, check
   script, its tests and the wiring. Mergeable on its own.
2. PR 2 (`docs/official-wiki-snapshots`) adds the parser, fetch script and tests,
   extends the check with pin coverage, and rewrites step 1 of the matrix update
   procedure. It starts only after the licence decision; Path B is assumed until
   the owner says otherwise.
3. Rollback is a revert of either PR: no storage key, game state or spec baseline
   changes.
