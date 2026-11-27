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
archive directories. Link to canonical sources rather than copying requirements,
rule inventories, test counts or release results. Use `npm run docs:inventory -- <ref>`
to measure committed documentation; generated reports are evidence, not authority.
The current OpenSpec artifact and verification policies remain mandatory until
an explicitly reviewed workflow migration changes them.

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
npm run docs:inventory -- HEAD          # read-only tracked documentation baseline
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
- Node 26 LTS, `node:test` + `node:assert/strict`. Tests import `.ts` directly.

## Boundaries

### Never

- Merge a PR into `main`, enable auto-merge, approve your own changes, or bypass
  a required check. A PR into `dev` may be squash-merged once CI is green; a
  merge into `main` needs an owner message `merge PR #N`.
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

### Risk tiers

Every PR states `Risk: R0`, `R1`, `R2` or `R3` and an `Evidence:` line. The diff
decides the tier; `node scripts/check-risk-tier.ts <pr-body> <changed-files>`
rejects a declaration below it, and a reviewer may elevate it.

- R0: docs, typos, non-behavior tooling — issue plus focused checks.
- R1: UX or behavior-preserving refactor — regression or characterization evidence.
- R2: localized gameplay fix — pinned source, stable rule ID, RED then GREEN.
- R3: new role or script, cross-role interaction, command/state, storage,
  privacy, offline or verification policy — full OpenSpec package and, when
  consequential, an ADR.

Tiers control authoring artifacts, not whether checks run: every existing gate
still applies at every tier.

## Workflow

Pipeline: `GitHub issue → OpenSpec change → branch + PR → CI → merge → sync/archive`;
the agent merges into `dev`, the owner merges into `main`.

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
   `main`. Open it and run the checks; once CI is green, squash-merge a
   `dev`-targeted PR. A PR targeting `main` is reported and **left for the
   owner**. Review fixes go to the same branch. The body SHALL keep the
   `Issue: #N` line the specification check reads. A PR that closes its issue
   SHALL also carry a closing keyword line (`Closes #N`); the issue reference
   in the title alone is not enough. Write the closing line every time, and
   keep it when the body is edited. GitHub resolves the keyword on the default
   branch (`main`), so a PR into `dev` still states it. Before any merge verify
   the current HEAD SHA and the green CI result on it; a merge into `main` also
   needs the owner's permission for that exact PR. A release PR (`dev` → `main`)
   and a back-merge PR (`main` → `dev`) name no issue and no OpenSpec change in
   the body, and skip the `Specifications` job: the changes were validated in
   `dev` before the release. The title keeps the issue reference line only
   because the conventions check requires one.
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

`VERSION` is the only release number; `package.json` and the newest released
`CHANGELOG.md` heading must match it, and `node scripts/check-version.ts` fails
otherwise. The SemVer rules, tag flow and changelog placement live in
[TEAM.md](TEAM.md) "Versioning and releases". For `main`, the owner's
`merge PR #N` is the only decision; the agent approves nothing else.

## Architecture

Layer boundaries, the single mutation path, projections and routing contracts
live in [docs/architecture.md](docs/architecture.md) "Runtime boundaries";
renderer and store details stay in `SPEC.md` and the nested `AGENTS.md` files.

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

The pinned wiki revisions are the only normative source for BotC rules;
`docs/rules-matrix.md` is the only place that pins a revision. The exact pinned
`oldid` per rule claim, the source-recovery sequence, the pin-drift rule and the
reference-digest rules live in [docs/rules-sources.md](docs/rules-sources.md)
"Source recovery". For every rules task, read that section, then open the actual
local wiki text; merely finding a filename, running a checker or reading the
generated digest is not reading the official rule. If no pinned source can be
read, stop with `Rules check: unverified` and report the failed recovery and URL
attempts.

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
  `scripts/browser-check.ts` runs Playwright checks on demand and in PR CI;
  `PG_BROWSER_CHECK=<case>` runs one case, and `scripts/run-scenarios.ts` runs the
  full-game suite with 3 workers by default (`PG_SCENARIO_WORKERS` overrides).
  PR CI runs the checks and the scenarios as separate parallel jobs.

## Done checklist

Before reporting a task complete:

- [ ] `npm run verify` passes (or list exactly which checks fail and why, with proof they reproduce on the branch it targets).
- [ ] Behavior change: RED and GREEN recorded. Docs or tooling: the proving command recorded.
- [ ] UI change: app run at `http://localhost:8010/`, real route exercised, console clean, checked at ~390 px width.
- [ ] `src/core/engine/` change: affected screen checked with a real game state.
- [ ] The PR targets `dev`; only a `hotfix/*` PR or the `dev` release PR targets `main`.
- [ ] `openspec validate --changes --strict` passes; PR names the issue and the OpenSpec change, unless it is a release or back-merge PR.
- [ ] PR title is a valid Conventional Commit and ends with the issue reference `(#N)`.
- [ ] PR opened and CI reported; a `dev` PR merged only from the verified HEAD SHA with green CI, a `main` PR left to the owner.
