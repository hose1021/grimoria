# AGENTS.md

Grimoria is a single-device Storyteller aid for **Blood on the Clocktower**
(Trouble Brewing, Bad Moon Rising, Sects & Violets). It is a static browser app:
React 19 + TypeScript + Tailwind v4, built by Vite, state in `localStorage`.
No backend, accounts, network play or database. Russian-first; role catalogs
exist for `ru`, `en`, `az`.

## Read first

Before editing a subtree, read its nearest nested `AGENTS.md`. Nested files add
only scope-specific rules; everything in this file still applies.

- Layers: [src](src/AGENTS.md) → [core](src/core/AGENTS.md), [application](src/application/AGENTS.md), [infrastructure](src/infrastructure/AGENTS.md), [ui](src/ui/AGENTS.md), [entry](src/entry/AGENTS.md)
- [Translations](src/ui/i18n/AGENTS.md), [stylesheet](css/AGENTS.md), [public assets](public/AGENTS.md), [scripts](scripts/AGENTS.md), [CI](.github/AGENTS.md), [docs](docs/AGENTS.md), [OpenSpec](openspec/AGENTS.md)

Keep each nested file to its own responsibility, constraints and verification.
Do not copy root rules into it. Do not add `AGENTS.md` to generated, vendor or
archive directories.

## Commands

```sh
npm ci                  # once after checkout
npm run dev             # Vite dev server (never open index.html via file://)
npm run typecheck       # app, DOM-free core, entry and test programs
npm run lint            # oxlint
npm run format          # oxfmt (format:check fails on unformatted files)
npm test                # node --test "src/**/*.test.ts"
npm run build           # Vite → dist/
npm run verify          # typecheck + lint + format:check + test + build + fallback + offline + policy
node scripts/check-types-policy.mjs      # layer, source-set and suppression policy
node scripts/openspec-check.mjs          # spec ↔ test consistency
openspec validate --changes --strict     # active changes
node --test src/core/engine/engine.test.ts                             # one file
node --test --test-name-pattern="at least half" src/core/engine/engine.test.ts   # one test
```

- oxlint and oxfmt are the only lint/format tools. Do not add ESLint, Prettier
  or their configs (`node scripts/check-toolchain.mjs` fails on them).
- `sw.js` and `404.html` are generated into `dist/` and never committed.
  Regenerate after asset edits (`npm run fallback`, `npm run offline`).
- Node 24, `node:test` + `node:assert/strict`. Tests import `.ts` directly.

## Boundaries

### Never

- Merge a PR, enable auto-merge, approve your own changes, or bypass a required
  check. Only an owner message `merge PR #N` authorizes merging that one PR.
- Commit to `main` directly or create long-lived branches (`develop`, `release/*`).
- Edit a requirement or weaken/delete a test to make CI pass.
- Claim a mechanic is verified without a test.
- Write game state outside `store.dispatch` (see Architecture).
- Auto-fill a Storyteller decision (false info, Spy/Recluse registration, Mayor
  redirect, Demon heir). Offer the allowed options with the reason.
- Put secret roles or notes into public or player projections.
- Add ESLint, Prettier or their configs, or new CSS rules where a Tailwind
  utility works.
- Commit `docs/official/wiki/` or `docs/reference/` (gitignored under the
  licensing gate; Path A vs B is the owner's decision).

### Ask the owner first

- Any ambiguous requirement or disputed rule. Stop and ask; a decision must
  rest on the pinned official source.
- A new dependency (with a recorded reason), a schema change (`pg.game.v4`) or a
  change to the licensing path. Prefer the standard library and the packages
  already installed.

### Always

- Work in a separate git worktree on a short-lived branch (see Workflow).
- Behavior changes: write the failing test first and record RED and GREEN.
  Documentation and tooling changes: record the command that proves the result.
- Run the verification checklist before reporting done.

## Workflow

Pipeline: `GitHub issue → OpenSpec change → branch + PR → CI → owner merge → sync/archive`.

1. **Issue.** New functionality starts from a GitHub issue. Doc-only and typo
   changes that alter no behavior may skip the OpenSpec change, but the PR still
   names the issue.
2. **OpenSpec change.** `openspec/changes/<name>/` with `proposal.md` (contains
   `Issue: #N`), at least one delta spec, `design.md`, `tasks.md`. Validate with
   `openspec validate --changes --strict`.
3. **Branch.** From current `origin/main`, in its own worktree:
   `git worktree add ../grimoria-<topic> -b <type>/<topic> origin/main`.
   Prefixes (identical to `scripts/check-git-conventions.mjs`): `feat/ fix/ docs/
   refactor/ test/ chore/ ci/ perf/`. Rest is lowercase kebab-case. Edit, stage
   and commit only inside the worktree, including `/opsx-propose` artifacts.
   When a change depends on an unmerged PR, branch from that PR's branch and
   target the new PR at it; retarget to `main` after the dependency merges. Never
   merge a stack out of order.
4. **RED → GREEN → REFACTOR.** For behavior changes: spec and scenarios first,
   then a failing test, then the fix; record both commands and results. For
   documentation, tooling and other non-behavior changes, record the command that
   proves the result instead.
5. **PR.** Targets `main`, or the base branch of the dependency it stacks on
   (step 3). Open it, run checks, report CI, then **stop and wait**. Review fixes
   go to the same branch. Before any merge verify the current HEAD SHA, CI result
   and the owner's permission for that exact PR.
6. **After merge.** Remove the worktree and local branch
   (`git worktree remove ../grimoria-<topic>`, `git branch -D <type>/<topic>`).
   Update main specs only from a verified change; archive it once `npm test`,
   `node scripts/openspec-check.mjs` and `openspec validate --specs --strict` pass.

Commits and PR titles: Conventional Commits, English, imperative, lowercase after
the prefix, no trailing period, optional scope (`fix(engine): correct the Mayor
redirect`). Types: `feat fix docs refactor test chore ci perf build style revert`
(`build`, `style`, `revert` are not branch prefixes). PRs are **squash-merged**;
the PR title becomes the commit on `main` and CI checks it, so keep it compliant.

Spec rules: baseline specs in `openspec/specs/` describe behavior already proven
by a test; each requirement cites its official source and asserting test.
`openspec-check` proves the cited file exists, not that it asserts the
requirement, so requirement-level verification stays a review task. Partial,
host-adjudicated and unsupported mechanics stay as `docs/rules-matrix.md` rows or
issue items, not spec requirements.

## Architecture

```
src/core/        game rules, state model, script catalog (DOM-free, storage-free)
src/application/ read models and ports
src/infrastructure/ catalog, routing, offline worker
src/ui/          React shell, screens, i18n, Tailwind tokens
src/entry/       composition root (main.ts), store, two DOM screens (help, demo)
```

- `src/ui/` imports ports, application read models and `src/core` model only,
  never the composition root. `src/core` never imports UI or storage.
- **Single mutation path:**
  `event → screen action → store.dispatch(command) → commands.ts validate/apply on a clone → state.applied + events → save → render`.
  `store.run` is a legacy escape hatch for tests and import/reset; screens never use it.
- `store.dispatch` is idempotent by command id (bound to a fingerprint of type,
  payload and ruleset version), rolls back and returns `persist-failed` when the
  save fails, and returns `allowed | rejected | requires-storyteller-choice`.
  `previewCommand` never mutates.
- Only `src/entry/store.ts` writes `pg.game.v4`. Other keys: `pg.lang`, `pg.guided`.
- Rules live in `src/core/engine/` and are exported through
  `src/core/engine/index.ts`. Domain functions return `{ ok: true, ... }` or
  `{ ok: false, error }`; validators return `{ ok: false, errors: [{ code, message }] }`.
  Expected invalid input returns a result; exceptions are for programming errors.
- `state.order` is the seat contract; players are keyed by stable IDs, never by
  array position.
- Read-only interaction state (selected targets, overlays) stays in the screen
  and is committed only when the host completes the step.
- Player/public views use projections (`publicRoleView`, `publicGameView`, the
  seat projection in `screens/player.tsx`). The app is a local aid, not a security boundary.
- `src/entry/screens/demo.ts` has its own in-memory game; it must never touch the saved game.
- Routing: `src/ui/router.ts` + `src/ui/shell.tsx`; unknown paths fall back to
  `/table`. Unmigrated screens mount through `src/ui/legacy-bridge.tsx`.

Detailed contracts: `SPEC.md` (state, screens, acceptance) and the nested files.

## Code conventions

Only what linters and the type checker do not enforce:

- ES modules with explicit `.js` extensions in relative imports.
- Tailwind utilities for styling; React 19, ReactDOM, Radix Dialog/Label are the only runtime dependencies.
- Domain actions are verb-first (`startNight`, `completeStep`, `recordVotes`,
  `executeByDecision`, `manualCorrection`). Screens dispatch commands with a unique id.
- Keep mutations idempotent where the engine already guards them (completed
  steps, recorded votes, dead targets, existing winners, repeated night starts).
- DOM screens (`help.ts`, `demo.ts`): delegated `data-*` events with `closest()`,
  listeners on `root`, cleanup through `AbortController`, escape with `esc()`
  from `src/ui/dom.ts`. Each screen exports `mount(root)` returning cleanup, and `unmount()`.
- UI strings go to `src/ui/i18n/locales/{ru,en,az}.ts` via `t(key, vars)`.
  Azerbaijani coverage is incomplete; do not assume it. Keep changes understandable in all three where practical.
- Role names and abilities come from `src/infrastructure/catalog/role-catalog.ts`
  / `window.PG.roles`, never hardcoded. `TB` is the supported non-Traveller
  set; use `allRoles()` for the sheet and Travellers.
- Export/import contains secret roles and notes. Keep the warning.
- Offline: cache URLs stay relative, never auto-activate a new worker during an
  active game (activation follows an explicit **Update** and a successful save),
  keep `.nojekyll` and relative asset paths (the app may live under a Pages subpath).

## Rules sources (how a role is played)

The pinned wiki revisions are the only normative source for BotC rules.
`docs/rules-matrix.md` is the per-role audit table and the **only** place that
pins a revision; each link names the exact `oldid` behind a rule claim.

1. `docs/official/wiki/<Title>.r<revid>.wikitext` — the pinned text. Refresh with
   `node scripts/fetch-official.mjs`; verify with `node scripts/check-official.mjs`.
2. `openspec/specs/` — the verified behavior contract, proven by tests.
3. `SPEC.md`, `docs/rules-sources.md`, the current source and tests.

`docs/reference/` is a generated, auxiliary digest for quick lookup. It can be
wrong or incomplete; never edit it by hand and never cite it as authority.
Rebuild with `node scripts/build-official-roles.mjs`, or verify it with
`node scripts/build-official-roles.mjs --check`, which fails on a missing, stale
or extra file and on an empty or unconverted section.

If the local snapshots or `docs/reference/` are absent, read the permanent
`https://wiki.bloodontheclocktower.com/index.php?title=<Title>&oldid=<N>` URL. If
no source is reachable, do not invent a rule: keep the mechanic `host-choice` or
`unsupported` and ask the owner.

`docs/official/` holds the manifest and official JSON (`roles`, `nightsheet`,
`jinxes`). `node scripts/fetch-official.mjs --check` reports pin drift and never
rewrites a pin; drift needs a rules review, not an automatic bump.
`docs/improvement-research.md` and `docs/improvement-implementation.md` are dated
snapshots, advisory only.

## Testing

- Tests are DOM-free; build state with `createGame()`, `dealGame()`, `autoSecrets()`.
  Engine fixtures use `make(assignment, options)` with `toDay`, `appoint`,
  `completeRole`, `completeSystem`, `skipNight`.
- Test names are complete behavioral sentences. Assert state, counts, phases,
  roles and winner reason codes; never random IDs.
- Add a focused regression test for a real bug. No tautological wiring/markup tests.
- Execution threshold is `ceil(living / 2)`. Keep even/odd cases (6 living → 3 votes).
- Suites: `engine.test.ts` (Trouble Brewing), `bmr.test.ts`, `snv.test.ts`,
  `setup.test.ts`, `commands.test.ts`, `scripts.test.ts`, `offline-worker.test.ts`.
  `scripts/browser-check.mjs` runs Playwright checks on demand and in PR CI.

## Done checklist

Before reporting a task complete:

- [ ] `npm run verify` passes (or list exactly which checks fail and why, with proof they reproduce on `origin/main`).
- [ ] Behavior change: RED and GREEN recorded. Docs or tooling: the proving command recorded.
- [ ] UI change: app run at `http://localhost:8010/`, real route exercised, console clean, checked at ~390 px width.
- [ ] `src/core/engine/` change: affected screen checked with a real game state.
- [ ] `openspec validate --changes --strict` passes; PR names the issue and the OpenSpec change.
- [ ] PR title is a valid Conventional Commit.
- [ ] PR opened, CI result reported, agent stopped. No merge.
