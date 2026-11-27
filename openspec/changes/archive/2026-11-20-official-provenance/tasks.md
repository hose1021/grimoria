# Tasks

## 1. PR 1 baseline

- [x] 1.1 Create the worktree from current `origin/main`:
      `git worktree add ../grimoria-official-provenance-manifest -b docs/official-provenance-manifest origin/main`;
      verify with `git worktree list`.
- [x] 1.2 Derive the introducing commits with
      `git log --format="%h %ad %s" --date=short -- docs/official/roles.json docs/official/nightsheet.json docs/official/jinxes.json`
      and record `43d2128` (2026-11-03) for the first two and `69bb3ba` (2026-11-11)
      for `jinxes.json` in the manifest.
- [x] 1.3 Write `docs/official/manifest.json` version 1 with one entry per file:
      `path`, `source` from `docs/rules-sources.md`, `retrieved`, `commit`,
      `sha256` computed from the bytes on disk; verify every hash with
      `node -e "…createHash('sha256')…"` and confirm
      `git diff --stat -- docs/official/roles.json docs/official/nightsheet.json docs/official/jinxes.json`
      is empty.

## 2. PR 1 verification script

- [x] 2.1 RED: add `scripts/check-official.test.ts` with fixtures under a temp
      root for a mutated byte, an extra unlisted file, a missing listed file, an
      absent `localOnly` file and a clean tree; run
      `node --test scripts/check-official.test.ts` and record that it fails
      because `scripts/check-official.ts` does not exist.
- [x] 2.2 Implement `scripts/check-official.ts` with `--root`, both directions
      (entry without file, file without entry), `localOnly` exemption and one
      `fail()` list; `node --test scripts/check-official.test.ts` passes all
      fixtures and the messages name the offending path.
- [x] 2.3 Run `node scripts/check-official.ts` on the real tree; exit 0 and the
      summary names the entry count. Record the RED failure from 2.1 and this
      GREEN result for the PR body.

## 3. PR 1 documentation and wiring

- [x] 3.1 Write `docs/official/README.md`: source URL and retrieval date for each
      file, the licensing decision and its effect, the refresh procedure, and the
      `node scripts/check-official.ts` command; verify every relative link
      resolves with `ls`.
- [x] 3.2 Add one pointer line to `docs/AGENTS.md` that names the README and
      `check-official`; verify the rest of the file is unchanged in `git diff`.
- [x] 3.3 Append `node scripts/check-official.ts` to the `verify` script in
      `package.json`; `npm run verify` passes.
- [x] 3.4 Add `node --test scripts/check-official.test.ts` and
      `node scripts/check-official.ts` to the `lint` job of
      `.github/workflows/ci.yml`; inspect the diff and confirm the pull-request CI
      run reports both steps green.
- [x] 3.5 Run `npm run lint`, `npm run format:check`, `npm run verify`,
      `node scripts/openspec-check.ts`; open PR 1
      (<https://github.com/hose1021/grimoria/pull/179>) with `Issue: #178` and
      `OpenSpec change: official-provenance`, report the CI result and stop.

## 4. PR 2 revision parser and fetcher

- [x] 4.1 Create the worktree stacked on PR 1:
      `git worktree add ../grimoria-official-wiki-snapshots -b docs/official-wiki-snapshots docs/official-provenance-manifest`,
      because PR 2 extends the check script and manifest that PR 1 adds; retarget
      the pull request to `main` after PR 1 merges. Path B is the default until
      the owner decides the licence.
- [x] 4.2 Verify the MediaWiki query against the live wiki for one pinned revision
      (`Washerwoman`, r2630): confirmed content and timestamp, or switch to
      `Special:Export`. Record the working query in `design.md`.
- [x] 4.3 RED: add `scripts/fetch-official.test.ts` with an injected request
      function: repeat run idempotent, title mismatch aborts, drift reports and
      exits 1 without writing, absent pin fails; run
      `node --test scripts/fetch-official.test.ts` and record the failure.
- [x] 4.4 Implement `scripts/official-pins.ts` with `parsePinnedRevisions`,
      `snapshotFileName` and `snapshotPath`; the test asserts 79 unique pairs and
      `Sects_%26_Violets` r3127 maps to `Sects_&_Violets.r3127.wikitext`.
- [x] 4.5 Implement `scripts/fetch-official.ts`: one revision per request,
      explicit `User-Agent`, 1 s delay, `maxlag`, LF writes, manifest merge that
      keeps an unchanged entry untouched; run it once against the live wiki and
      confirm the written files and manifest entries by re-hashing.
- [x] 4.6 Implement `--check`: batch latest-revision lookup, report
      `<Title>: pinned r<N>, latest r<M>`, no writes; run against the live wiki and
      confirm exit 0 on unchanged pins and exit 1 on a fixture with an older pin.

## 5. PR 2 coverage, docs and matrix

- [x] 5.1 Extend `scripts/check-official.ts` with pin coverage; RED: an
      uncovered pin fixture exits 1 and names title and revision; GREEN: the real
      tree passes with 79 covered pins.
- [x] 5.2 Apply the licensing path: Path B adds `docs/official/wiki/` to
      `.gitignore` and marks entries `localOnly`; Path A commits the snapshots.
      Verify with `git status --short --ignored docs/official/wiki` and
      `node scripts/check-official.ts`.
- [x] 5.3 Run `node scripts/fetch-official.ts` twice; the second run leaves
      `git status --short` unchanged for `docs/official/` and `manifest.json`.
- [x] 5.4 Replace step 1 of `docs/rules-matrix.md` "Update procedure" with the
      script command; `git diff docs/rules-matrix.md` changes only that step, and
      `node scripts/check-acceptance.ts` still passes.
- [x] 5.5 Extend `docs/official/README.md` with the snapshot command, the drift
      command and the licence decision; verify its commands run as written.
- [x] 5.6 Run `npm run verify`, `node scripts/openspec-check.ts` and
      `openspec validate --changes --strict`; open PR 2
      (<https://github.com/hose1021/grimoria/pull/180>) with `Issue: #178` and
      `OpenSpec change: official-provenance`, report the CI result and stop.

## 6. Integration verification

- [x] 6.1 Confirm the three JSON snapshots are byte-identical to `origin/main`:
      `git diff origin/main -- docs/official/roles.json docs/official/nightsheet.json docs/official/jinxes.json`
      is empty.
- [x] 6.2 Confirm no matrix pin, row status or test citation moved:
      `git diff origin/main -- docs/rules-matrix.md` shows only the update-procedure
      step.
- [x] 6.3 Run `npm test` and `npm run verify`; on Windows both hit two
      pre-existing failures that reproduce on `origin/main`
      (`src/ui/screens/structure.test.ts` backslash paths and
      `check-acceptance.mjs` absolute-path import), while every other verify step
      passes. `git diff --check` reports nothing.

## Evidence

- RED: `node --test scripts/check-official.test.ts` failed with
  `MODULE_NOT_FOUND` before `scripts/check-official.ts` existed.
- GREEN: `node --test scripts/check-official.test.ts` passes 9/9;
  `node scripts/check-official.ts` passes with 82 entries (3 app snapshots plus
  79 pinned revisions).
- RED: `node --test scripts/fetch-official.test.ts` failed because
  `official-pins.mjs` and `fetch-official.mjs` did not exist.
- GREEN: `node --test scripts/fetch-official.test.ts` passes 8/8 offline with
  the injected request function.
- GREEN: `node scripts/fetch-official.ts --delay 400` wrote 79 snapshots; a
  second run reported `0 written, 79 unchanged` and the manifest SHA-256 stayed
  `218576715e6abdeb52ea68cb560b7885c91e00736102f018344708c33f7f4464`.
- GREEN: `node scripts/fetch-official.ts --check` reported
  `Artist: pinned r3156, latest r3348`, wrote nothing and exited 1; the pin stays
  unchanged pending a rules review.
- GREEN: `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run build`, `npm run fallback`, `npm run offline`,
  `node scripts/check-types-policy.ts`, `node scripts/openspec-check.ts` and
  `openspec validate --changes --strict` pass.
- LIMIT: `npm test` and `node scripts/check-acceptance.ts` fail on Windows for
  two pre-existing reasons that reproduce on `origin/main`: the structure test
  compares backslash paths, and the acceptance script imports an absolute `F:`
  path as a module. CI runs Linux; neither file is touched by this change.

## Workflow follow-up

- Archive the change after the owner merges both pull requests and the checks pass.
- Sync the `workflow/official-provenance` capability into `openspec/specs/`, then
  remove both worktrees and their local branches.
