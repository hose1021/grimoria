# Tasks

## 1. Toolchain configuration and the policy check

- [x] 1.1 Write `scripts/check-toolchain.test.mjs` first, covering a `prettier`
  entry in `dependencies`, an `eslint` entry in `devDependencies`, a
  `.prettierrc` file, an `eslint.config.js` file, a `.prettierignore` file, a
  script that calls `prettier`, and the clean tree; verify it fails because
  `scripts/check-toolchain.mjs` does not exist
- [x] 1.2 Add `.oxlintrc.json` with the `correctness` category at `error`,
  `no-unused-vars` with `argsIgnorePattern: "^_"` and `options.maxWarnings: 0`,
  and `.oxfmtrc.json` with `$schema` and `ignorePatterns: ["package-lock.json"]`;
  verify `npx --yes oxlint@1.93.0 --print-config js/app.js` shows the configured
  rule and `npx --yes oxfmt@0.78.0 --check js src scripts` uses the root config
- [x] 1.3 Add `scripts/check-toolchain.mjs`, which reads `package.json`, the root
  directory listing and `.github/workflows/ci.yml`; verify
  `node --test scripts/check-toolchain.test.mjs` passes and
  `node scripts/check-toolchain.mjs` exits zero on this tree
- [x] 1.4 Add `oxlint@1.93.0` and `oxfmt@0.78.0` as exact devDependencies and the
  `lint`, `format` and `format:check` scripts; verify `npm ls oxlint oxfmt`
  prints both exact versions, `npm ls eslint prettier --all` prints an empty
  tree, `npm run lint` reports the 76 findings and `npm run format:check`
  reports 84 files

## 2. Line endings

- [x] 2.1 Add `.gitattributes` with `* text=auto eol=lf`; verify
  `git check-attr text eol -- js/app.js` reports `text: auto` and `eol: lf`,
  `git add --renormalize .` reports no content change because the index already
  stores LF, and `node scripts/check-toolchain.mjs` still passes

## 3. Lint baseline

- [x] 3.1 Remove the dead imports and bindings the gate reports, and rewrite the
  three `unicorn` spread findings; verify `npm run lint` exits zero,
  `npm test` passes all 255 tests and `npm run typecheck` reports no diagnostic
- [x] 3.2 Check every suppression: verify `grep -rn "oxlint-disable" js src
  scripts` lists only lines with a stated reason and no file-level
  `oxlint-disable` at the top of a module

## 4. Format baseline

- [x] 4.1 Run `npm run format` in one commit; verify `npm run format:check`
  exits zero and `npm test` still passes
- [x] 4.2 Confirm the scope held: verify `git show --name-only --format=` lists
  only files under `js/`, `src/`, `scripts/`, `vite.config.ts` and the root
  `*.json` files, and names no `docs/`, `public/`, `css/`, Markdown or
  `package-lock.json` path

## 5. Gate and documentation

- [x] 5.1 Add `lint` and `format:check` to `npm run verify` before the build
  steps; verify `npm run verify` passes end to end
- [x] 5.2 Add the `Lint and format` job to `.github/workflows/ci.yml` running
  `npm ci`, `npm run lint` and `npm run format:check`; verify the workflow file
  parses with `node -e "1"` on a YAML-free check and the job appears in the pull
  request's check list
- [x] 5.3 Document `npm run lint`, `npm run format` and `npm run format:check`
  in `AGENTS.md` "Development Commands", state that ESLint and Prettier are not
  used, and verify each documented command runs as written

## 6. Integration

- [x] 6.1 Verify `npm run verify`, `node scripts/openspec-check.mjs` and
  `openspec validate --changes --strict` all pass on the branch

## Evidence

- RED: `node --test scripts/check-toolchain.test.mjs` fails with
  `ERR_MODULE_NOT_FOUND` for `scripts/check-toolchain.mjs`, and `npm run lint`
  fails with `npm error Missing script: "lint"`.
- GREEN: `node --test scripts/check-toolchain.test.mjs` passes, `npm run lint`
  exits zero, `npm run format:check` exits zero and `npm run verify` passes.

## Workflow follow-up

- Commit, push the branch and open the pull request; the owner decides the merge.
- After the merge, remove the worktree, delete the local branch and archive the
  change.
