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

Issue -> OpenSpec change -> worktree branch -> RED/GREEN -> PR -> CI -> merge.
Branches come from `origin/dev` (hotfixes from `origin/main`), PRs target `dev`,
and only `dev`-targeted PRs are squash-merged after green CI on the verified HEAD;
a `main` PR waits for the owner's `merge PR #N`. Commit types, the issue
reference, spec rules and the after-merge steps live in
[docs/workflow.md](docs/workflow.md).

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

## Testing and done checklist

Test conventions, suites, the browser harness and the task-completion checklist
live in [TEAM.md](TEAM.md) "Testing" and "Done checklist". A completed task needs
a passing `npm run verify`, recorded RED/GREEN for a behavior change, a real route
checked at ~390 px for a UI change, and a `dev` PR unless it is a hotfix or the
release PR.
