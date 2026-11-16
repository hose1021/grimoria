# AGENTS.md

Grimoria is a single-device Storyteller aid for **Blood on the Clocktower**
(Trouble Brewing, Bad Moon Rising, Sects & Violets). It is a static browser app:
React 19 + TypeScript + Tailwind v4, built by Vite, state in `localStorage`.
No backend, accounts, network play or database. Russian-first; role catalogs
exist for `ru`, `en`, `az`.

## Stop before changing game behavior

Grimoria implements the pinned official rules; house rules are out of scope.
Treat a requested outcome as a proposal to validate, not evidence that it is
legal. A direct or repeated implementation request does not establish an
intentional change of product scope. Correct an incorrect premise explicitly.

**Source first, then stop on conflict:** for every game-rule question or
behavior request, read the relevant pinned official text before giving a
substantive rules answer, including a refusal or clarification. Restore missing
sources using **Rules sources** below. A progress message may announce this
check, but must not assert rules from memory. Do not explore implementation
paths, plan a fix, create a branch or write tests before the source check.

If the source establishes a conflict, explain it, cite the exact `oldid` and
ask whether the owner intentionally wants to depart from official play. For
example, after checking the affected pinned rules:

> Making every Demon immortal would depart from the official rules and change
> Demon-death victory and role interactions. Are you intentionally requesting
> a house rule against the official rules, or should I preserve official play?
> I will not change the engine until you clarify.

Then end the turn and wait for the answer. Do not merely flag the deviation
and continue. Do not list consequences or role interactions that you have not
checked in the pinned sources. If source recovery and the permanent URL both
fail, report `Rules check: unverified`, the attempted commands and errors, and
stop; do not substitute memory or repository tests for the missing source.
The owner's original imperative is not an answer to this clarification.
An explicit answer requesting a house rule starts the separate scope proposal
described below; it is not permission to silently replace official behavior.

Before editing game scenarios, rules-related UI, engine code, specs or tests:

1. Read the relevant pinned official text using **Rules sources** below.
   Compare the request with its timing, exceptions and Storyteller choices.
2. Report a short verdict **before the first edit**: `Rules check: compliant`,
   `Rules check: conflict` or `Rules check: unverified`. Include the pinned
   source and relevant rule, plus the asserting test or missing coverage.
3. Only `compliant` permits implementation. For `conflict`, explain the
   contradiction and offer the official behavior, then stop and wait for a
   revised request. For `unverified` (including inaccessible sources), explain
   the missing evidence and stop. Reading to investigate is allowed; changing
   behavior, specs or test expectations while blocked is not.

Do not infer house-rule authorization, weaken tests, or change a source pin to
make the requested outcome pass. Even confirmation of the outcome does not
resolve a rules conflict. A variant requires a separate explicit product-scope
proposal before any implementation; it must not replace official behavior.
Passing tests or agreement between code, specs and generated references is
not independent verification of the official rule.

## Read first

At session start, verify the repository root and read its actual `AGENTS.md`
from disk. Instructions edited in another worktree do not update this checkout.
After instruction changes, start a fresh agent session in the intended worktree
and verify the loaded guidance before using it for a behavior test.

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
node scripts/check-types-policy.ts      # layer, source-set and suppression policy
node scripts/check-version.ts           # VERSION ↔ package.json ↔ CHANGELOG.md
node scripts/openspec-check.ts          # spec ↔ test consistency
openspec validate --changes --strict     # active changes
node --test src/core/engine/engine.test.ts                             # one file
node --test --test-name-pattern="at least half" src/core/engine/engine.test.ts   # one test
```

- oxlint and oxfmt are the only lint/format tools. Do not add ESLint, Prettier
  or their configs (`node scripts/check-toolchain.ts` fails on them).
- Every first-party file under `scripts/` is strict TypeScript, type-checked by
  `tsconfig.scripts.json` (part of `npm run typecheck`) and run directly by Node.
  `node scripts/check-toolchain.ts` fails on a `.js`, `.mjs`, `.cjs` or `.jsx`
  file there; `node_modules`, `dist` and the committed locale data in
  `public/assets/data/*.js` are outside it.
- `sw.js` and `404.html` are generated into `dist/` and never committed.
  Regenerate after asset edits (`npm run fallback`, `npm run offline`).
- Node 24, `node:test` + `node:assert/strict`. Tests import `.ts` directly.

## Boundaries

### Never

- Merge a PR, enable auto-merge, approve your own changes, or bypass a required
  check. Only an owner message `merge PR #N` authorizes merging that one PR.
- Commit directly to `main` or `dev`, or create long-lived branches other than
  `dev` (`develop`, `release/*`).
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

- Work in a separate git worktree on a short-lived branch from `origin/dev`; a
  hotfix branches from `origin/main` (see Workflow).
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
3. **Branch.** All non-hotfix work branches from current `origin/dev`, in its
   own worktree:
   `git worktree add ../grimoria-<topic> -b <type>/<topic> origin/dev`.
   A production hotfix branches from `origin/main`:
   `git worktree add ../grimoria-<topic> -b hotfix/<topic> origin/main`.
   Prefixes (identical to `scripts/check-git-conventions.ts`): `feat/ fix/ docs/
   refactor/ test/ chore/ ci/ perf/ hotfix/`. Rest is lowercase kebab-case.
   Edit, stage and commit only inside the worktree, including `/opsx-propose`
   artifacts. `main` holds released code; `dev` collects every other change and
   reaches `main` only as a release.
   When a change depends on an unmerged PR, branch from that PR's branch and
   target the new PR at it; retarget it to `dev` after the dependency merges.
   Never merge a stack out of order.
4. **RED → GREEN → REFACTOR.** For behavior changes: spec and scenarios first,
   then a failing test, then the fix; record both commands and results. For
   documentation, tooling and other non-behavior changes, record the command that
   proves the result instead.
5. **PR.** Targets `dev`, or the base branch of the dependency it stacks on
   (step 3). Only a `hotfix/*` PR and a release PR (`dev` → `main`) target
   `main`. Open it, run checks, report CI, then **stop and wait**. Review fixes
   go to the same branch. Before any merge verify the current HEAD SHA, CI result
   and the owner's permission for that exact PR.
6. **After merge.** Remove the worktree and local branch
   (`git worktree remove ../grimoria-<topic>`, `git branch -D <type>/<topic>`).
   A merge into `main` changes the version and creates tag `vX.Y.Z`; merge
   `main` back into `dev` at once, so a hotfix is not lost at the next release.
   These are follow-ups, not owner approvals (see **Versioning and releases**).
   Update main specs only from a verified change; archive it once `npm test`,
   `node scripts/openspec-check.ts` and `openspec validate --specs --strict` pass.

Commits and PR titles: Conventional Commits with the issue reference appended,
`type(scope): lowercase imperative subject (#N)`, where `#N` is the GitHub issue
the work belongs to. Optional scope; no trailing period (`feat(engine): correct
the Mayor redirect (#19)`). Types: `feat fix docs refactor test chore ci perf
build style revert` (`build`, `style` and `revert` are not branch prefixes;
`hotfix` is a branch prefix whose title uses `fix`). Every commit subject and
every PR title carries its issue reference, so GitHub links the commit to the
task. PRs are **squash-merged**; the PR title becomes the commit on `dev` or
`main`, and CI checks the type and the reference.

Spec rules: baseline specs in `openspec/specs/` describe behavior already proven
by a test; each requirement cites its official source and asserting test.
`openspec-check` proves the cited file exists, not that it asserts the
requirement, so requirement-level verification stays a review task. Partial,
host-adjudicated and unsupported mechanics stay as `docs/rules-matrix.md` rows or
issue items, not spec requirements.

## Versioning and releases

`VERSION` is the canonical release number. `package.json` and the newest
released heading in `CHANGELOG.md` carry the same number, and
`node scripts/check-version.ts` (part of `npm run verify` and CI) fails when they
disagree. The records hold `X.Y.Z` without a prefix; the git tag is `vX.Y.Z`
(`VERSION` = `1.0.1`, tag `v1.0.1`). The build injects the number as
`__APP_VERSION__`; the help screen shows it.

`main` holds released code, so every merge into it changes the version and
includes the bump in the merged PR. Use Semantic Versioning:

- major: a saved-state schema or storage-key break (`pg.game.v4` → next);
- minor: a release that adds a capability from `dev`;
- patch: a hotfix, or a release of fixes only (`1.0.0` → `1.0.1`).

The owner's `merge PR #N` is the only decision. The tag and the `main` → `dev`
merge follow the merge: the release workflow performs them, or the agent does
when no workflow is configured. The owner approves nothing else.

- Release: the `dev` → `main` PR moves `## [Unreleased]` entries under
  `## [X.Y.Z] - <date>` and carries the minor or major bump.
- Hotfix: the `hotfix/*` → `main` PR increments the patch component by one
  (`1.0.0` → `1.0.1`) and carries its changelog entry. Its merge tags `v1.0.1`
  and merges `main` back into `dev` like a release.

Feature, fix and documentation PRs into `dev` add their entry under
`## [Unreleased]` and do not change the version.

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
- Each supported role has one module in `src/core/roles/<role-id>/`: `role.ts`
  (id, edition, optional `nightStep`/`firstNightStep`/`deathStep`/`onDeath`/
  `ability`) and `rule.md` (rule identifiers, matrix revision, asserting tests).
  `src/core/roles/registry.ts` is complete by construction; the type checker
  fails when a supported id has no module or a module names an unknown role.
  `scripts/check-acceptance.ts` requires every `verified` matrix row's cited
  test to carry an identifier declared in that role's `rule.md`, and
  `node scripts/rules-for.ts <roleId>` prints one role's dossier.
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
   `node scripts/fetch-official.ts`; verify with `node scripts/check-official.ts`.
2. `src/core/roles/<role-id>/rule.md` — the per-role reference: rule identifiers,
   the matrix revision each audits, and the asserting tests. Look one role up with
   `node scripts/rules-for.ts <roleId>`.
3. `openspec/specs/` — the verified behavior contract, proven by tests.
4. `SPEC.md`, `docs/rules-sources.md`, the current source and tests.

`docs/reference/` is a generated, auxiliary digest for quick lookup. It can be
wrong or incomplete; never edit it by hand and never cite it as authority.
Rebuild with `node scripts/build-official-roles.ts`, or verify it with
`node scripts/build-official-roles.ts --check`, which fails on a missing, stale
or extra file and on an empty or unconverted section.

For every rules task, identify the exact revisions in `docs/rules-matrix.md`,
then open and read the relevant local wiki text, including the sections needed
for the timing, exceptions and interactions being claimed. Merely finding a
filename, running a checker or reading the reference digest is not reading the
official rule. Use this recovery sequence automatically from the repository
root when the required files are missing, invalid or stale:

1. If the required `docs/official/wiki/` snapshots are absent or invalid, run
   `node scripts/fetch-official.ts`, then `node scripts/check-official.ts`.
   Use the default local-only mode, never `--commit-snapshots`. `--check` on the
   fetcher only reports pin drift; it does not download missing snapshots.
2. If `docs/reference/` is absent or its check fails, run
   `node scripts/build-official-roles.ts`, then
   `node scripts/build-official-roles.ts --check`. Recover snapshots first if
   the builder needs them. The digest remains auxiliary; read the wiki text.
3. After recovery, open the actual relevant wiki files. If recovery fails,
   attempt the permanent URL from the matrix:
   `https://wiki.bloodontheclocktower.com/index.php?title=<Title>&oldid=<N>`.
   Never substitute the latest revision or silently bump a pin.
4. If no pinned source can be read, stop with `Rules check: unverified` and
   report the failed recovery and URL attempts. Preserve existing behavior;
   do not implement a guess or claim the official rule has been verified.

These local recovery commands are authorized preparation, not a licensing-path
change. They may update provenance metadata; inspect and report those diffs,
preserve unrelated edits, and never commit the ignored snapshots or digest.

`docs/official/` holds the manifest and official JSON (`roles`, `nightsheet`,
`jinxes`). `node scripts/fetch-official.ts --check` reports pin drift and never
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
  `scripts/browser-check.ts` runs Playwright checks on demand and in PR CI.

## Done checklist

Before reporting a task complete:

- [ ] `npm run verify` passes (or list exactly which checks fail and why, with proof they reproduce on the branch it targets).
- [ ] Behavior change: RED and GREEN recorded. Docs or tooling: the proving command recorded.
- [ ] UI change: app run at `http://localhost:8010/`, real route exercised, console clean, checked at ~390 px width.
- [ ] `src/core/engine/` change: affected screen checked with a real game state.
- [ ] The PR targets `dev`; only a `hotfix/*` PR or the `dev` release PR targets `main`.
- [ ] `openspec validate --changes --strict` passes; PR names the issue and the OpenSpec change.
- [ ] PR title is a valid Conventional Commit and ends with the issue reference `(#N)`.
- [ ] PR opened, CI result reported, agent stopped. No merge.
