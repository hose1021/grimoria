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
ask whether the owner intentionally wants to depart from official play, then
end the turn and wait for the answer. Do not merely flag the deviation and
continue. Do not list consequences or role interactions that you have not
checked in the pinned sources. Then end the turn and wait for the answer. Do not merely flag the deviation
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

Before editing a subtree, read its nearest nested `AGENTS.md` under
`src/`, `src/core/`, `src/application/`, `src/infrastructure/`, `src/ui/`,
`src/entry/`, `css/`, `public/`, `scripts/`, `.github/`, `docs/` or
`openspec/`. Nested files add only scope-specific rules; this file still applies.

Keep each nested file to its own responsibility, constraints and verification.
Do not copy root rules into it. Do not add `AGENTS.md` to generated, vendor or
archive directories. Link to canonical sources rather than copying requirements,
rule inventories, test counts or release results. Use `npm run docs:inventory -- <ref>`
to measure committed documentation; generated reports are evidence, not authority.

## Commands

`package.json` is the canonical command list; run `npm run <script>`. The gates
that matter in every PR: `npm run verify`, `node scripts/openspec-check.ts`,
`openspec validate --changes --strict`, and `npm run docs:inventory -- HEAD`.

Only what the scripts cannot express:

- oxlint and oxfmt are the only lint/format tools; do not add ESLint or Prettier.
- `scripts/` is strict TypeScript run directly by Node; no `.js`, `.mjs`, `.cjs`
  or `.jsx` there.
- `sw.js` and `404.html` are generated into `dist/` and never committed.
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
  hotfix branches from `origin/main`.
- Behavior changes: write the failing test first and record RED and GREEN.
  Documentation and tooling changes: record the command that proves the result.
- An independent review gates the merge and continues until every acceptance
  criterion is satisfied; there is no fixed review-round limit.
- Run the done checklist before reporting complete.

### Risk tiers

Every PR states `Risk: R0`, `R1`, `R2` or `R3` and an `Evidence:` line. The diff
decides the tier; `node scripts/check-risk-tier.ts <pr-body> <changed-files>`
rejects a declaration below it, and a reviewer may elevate it.

R0 covers docs, typos and non-behavior tooling; R1 a UX or behavior-preserving
refactor; R2 a localized gameplay fix with a pinned source, stable rule ID and
RED then GREEN; R3 a new role or script, cross-role interaction, command/state,
storage, privacy, offline or verification policy, with the full OpenSpec package
and an ADR when consequential. Tiers control authoring artifacts; every gate
still runs at every tier.

## Workflow

1. **Issue.** New functionality starts from a GitHub issue; doc-only changes
   name the issue without an OpenSpec change.
2. **OpenSpec change.** `openspec/changes/<name>/` with a proposal naming
   `Issue: #N`, at least one delta spec, design and tasks;
   `openspec validate --changes --strict` must pass.
3. **Branch.** Work in its own worktree: `git worktree add ../grimoria-<topic> -b
   <type>/<topic> origin/dev`. A production hotfix branches from `origin/main`.
   `main` holds released code; `dev` collects everything else.
4. **RED → GREEN.** Behavior changes: spec and failing test first, then the fix;
   record both commands. Docs and tooling: record the proving command.
5. **PR.** Target `dev` (or the branch it stacks on); only a `hotfix/*` PR and
   the release PR target `main`. The body keeps `Issue: #N` and, when it closes
   the issue, `Closes #N`. An independent review runs until every acceptance
   criterion is met and CI is green on the current HEAD; then squash-merge a
   `dev` PR. A `main` PR waits for the owner.
6. **After merge.** Remove the worktree and local branch. A merge into `main`
   changes the version and tags `vX.Y.Z`; merge `main` back into `dev` at once.

`DECISIONS.md` records why a process choice was made, is appended to and never
rewritten; a change that makes it wrong fixes it in the same PR.

Commits and PR titles: `type(scope): lowercase imperative subject (#N)`, with
`feat fix docs refactor test chore ci perf build style revert`. PRs are
squash-merged; the title becomes the commit.

Spec rules: baseline specs describe behavior already proven by a test; each
requirement cites its official source and asserting test. `openspec-check`
proves the file exists, not that it asserts the requirement, so requirement
verification stays a review task.

## Versioning and releases

`VERSION` is the canonical release number; `package.json` and the newest
released `CHANGELOG.md` heading must match it (`node scripts/check-version.ts`).
Semantic Versioning: major for a saved-state or storage-key break, minor for a
capability release, patch for a hotfix or fixes-only release. A release PR moves
`## [Unreleased]` entries under `## [X.Y.Z] - <date>`; feature and fix PRs into
`dev` add their entry under `## [Unreleased]` without a version change.

## Architecture

Durable decisions live as ADRs in [docs/adr/](docs/adr/); start with
[0005 runtime boundaries](docs/adr/0005-runtime-boundaries.md). `SPEC.md` and
the nested `AGENTS.md` files hold renderer, store and subsystem detail. The
single mutation path, seat contract and projections are never bypassed.

## Code conventions

Only what linters and the type checker do not enforce lives in
[src/AGENTS.md](src/AGENTS.md) "Code conventions".

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

Tests are DOM-free; build state with `createGame()`, `dealGame()`, `autoSecrets()`,
and engine fixtures with `make(assignment, options)`. Test names are complete
behavioral sentences that assert state, counts, phases, roles and winner reason
codes; add a focused regression test for a real bug. Keep even and odd execution
cases (`ceil(living / 2)`). Suites, the browser harness and scenario workers
live in `scripts/AGENTS.md`; PR CI runs them in parallel jobs. A gate that cannot
run is reported as not run, never as a pass.

## Done checklist
