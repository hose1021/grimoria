# Design

## Context

Two defects block `npm run verify` on Windows:

- `src/ui/screens/structure.test.ts` compares `relative(ROOT, path)`, which
  contains `\` on Windows, with exclusions written as `src/entry/screens/`.
  The forbidden-import check itself is correct; only the path text differs.
- `scripts/check-acceptance.mjs` passes `join(ROOT, …)` to `import()`. The ESM
  loader parses `C:` or `F:` as a URL scheme and rejects the path.

The browser suite serves `dist/` and `dist-root/` in the checkout. Both are
rewritten by every build, so a build running beside the check can replace
assets under the served artifact. The observed worker-settling failure is
consistent with that mutation, not with a confirmed product defect.

## Goals / Non-Goals

**Goals:**

- `npm run verify` passes on Windows on the supported Node 24.
- The structural scanner keeps rejecting the same forbidden imports.
- Browser checks own a build artifact that no concurrent build can mutate.
- A future settle failure reports the worker and cache state instead of only
  the expected cache name.

**Non-Goals:**

- Changing game rules, the service-worker protocol, the update UI or CI runners.
- Raising a timeout to make an intermittent failure disappear.
- Certifying Node 26; it is observed separately from the supported runtime.

## Decisions

### Normalize repository-relative paths at the scanner output

Add `portableRelative(path)` to the test that returns
`relative(ROOT, path).split(sep).join("/")`. The scanner still reads the real
filesystem path; only the reported and filtered text becomes portable. A
regression test asserts that a file under `src/entry` reports `src/entry/main.ts`
on every platform, and the existing boot-module test still fails when a real
forbidden import appears.

### Convert filesystem paths to file URLs at the import boundary

`check-acceptance.mjs` keeps `join(ROOT, …)` for filesystem work and passes the
result through `pathToFileURL(join(ROOT, path)).href` to `import()`. The checks
against the matrix, support model and README are unchanged.

### Build and serve a private artifact per browser-check run

`browser-check.mjs` creates `mkdtemp(join(tmpdir(), "pg-browsercheck-"))`, builds
the project-subpath and root-subpath bundles there, serves `dist` from that
directory, and removes the directory on process exit. It never uses the
checkout's `dist/` unless `PG_SKIP_BUILD` is set; that flag remains the explicit
way to drive an already-built artifact and is not used by CI.

### Diagnose a settle timeout, do not extend it

`settle()` keeps its 450-attempt window. On failure it adds the last worker
version, the last load count, whether a worker is waiting, the controller state
and the cache keys. The timeout is unchanged, so the contract still fails when
the page never settles.

### Mark the waiting worker as the opening check's worker

The diagnostic from the CI failure showed a waiting worker and the old cache
after the full window. `register()` can resolve before the registration exposes
the already waiting worker, so the `adopt()` calls can miss it and the explicit
`installed(reg.waiting)` call only raised the prompt. The opening check now adds
that worker to its `automatic` set before calling `installed`, so it activates
without a prompt. Workers found by a later check remain prompt-only.

## Risks / Trade-offs

- Each run pays one build in a temp directory. The previous harness also built
  on every run, so the cost is unchanged; only the destination moves.
- A killed process can leave a temp directory. `process.on("exit")` removes it
  on normal completion and assertion failures; the OS temp policy covers a
  hard kill.
- `PG_SKIP_BUILD` retains the shared-artifact risk by design; a caller that
  opts in owns that risk.

## Validation

- Node 24.22.3: `npm run verify`; focused structure and acceptance checks.
- Node 26.13.0: the same verify command, reported separately.
- Browser suite: three consecutive full runs on Windows with Playwright 1.65.0
  and Chromium, including the fast-update scenario.
