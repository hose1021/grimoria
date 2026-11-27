# Design

## Context

See `proposal.md` for motivation. The constraints that shape the approach:

- Current gates: `npm run typecheck` (four `tsc` programs, `checkJs` on `js/`),
  `npm test` (255 tests), `build`, `fallback`, `offline` and
  `node scripts/check-types-policy.mjs`. No linter, no formatter, no
  `.gitattributes`.
- This checkout has `core.autocrlf=true`, so the working tree holds CRLF while
  the index holds LF.
- The source set is 97 files under `js/`, `src/` and `scripts/`, plus
  `vite.config.ts` and four `tsconfig*.json` files. `feat/react-ui-shell` is
  adding `src/ui/**` in parallel.
- `oxfmt` 0.78.0 is pre-1.0. `oxlint` 1.93.0 is 1.x.
- Measured on `b863343`:
  - `oxfmt` on `js/`, `src/`, `scripts/` at default settings changes 10,005
    added and 5,214 removed lines; with `printWidth: 80` it changes 14,660 and
    6,246. Passed the whole tree, 231 of 232 files differ, because that includes
    `docs/official/*.json` and the `public/assets/data/` catalogs.
  - `oxlint -D correctness` reports 76 findings in 31 files: 73
    `no-unused-vars`, 2 `unicorn/no-useless-fallback-in-spread`, 1
    `unicorn/no-useless-spread`. Other categories report `suspicious` 171,
    `pedantic` 735, `perf` 134, `style` 9085, `restriction` 898.

## Goals / Non-Goals

**Goals:**

- One lint and one format tool, pinned, with configuration committed.
- A clean baseline: `lint` and `format:check` pass on the merge commit.
- The same result on this Windows checkout and on the Linux runner.
- A repository check that rejects ESLint and Prettier.

**Non-Goals:**

- Enabling the `suspicious`, `pedantic`, `perf`, `style` or `restriction`
  categories.
- Formatting CSS, HTML, Markdown, YAML or the official JSON snapshots.
- A pre-commit hook or a lint-staged setup.
- Editor setup beyond the `$schema` reference in each config file.

## Decisions

### Oxc pair instead of ESLint 9 and Prettier

`oxlint` and `oxfmt` are two Rust binaries with no plugin dependency graph.
`oxlint` reads an ESLint-compatible config and rule names; `oxfmt` follows
Prettier's output. Alternatives: Biome (one tool, but the issue names Oxc and
its ESLint rule coverage is smaller), or ESLint 9 with Prettier (rejected by the
request).

### Formatter defaults, no width override

Keep `printWidth: 100`. The measured diff is 10,005/5,214 against 14,660/6,246
at 80, and the default needs no option to maintain. The one-time reflow is part
of adopting a formatter; a width setting would only trade one reflow for another.

### Explicit paths in the scripts

`format` and `format:check` pass an explicit list: `js src scripts
vite.config.ts`, `package.json`, the four `tsconfig*.json` files and the two
`.ox*rc.json` files. A quoted glob argument such as `*.json` makes `oxfmt` treat
the whole invocation as a glob set and drop the directory arguments, so the list
is spelled out instead. A repository-root run would rewrite
`docs/official/roles.json`, `docs/official/nightsheet.json`, the 30 locale
catalogs under `public/assets/data/`, `css/`, `index.html` and every Markdown
file. Passing paths keeps those byte-identical and avoids adding a
`.prettierignore` to a repository that rejects Prettier. `.oxfmtrc.json` keeps
`ignorePatterns: ["package-lock.json"]` for a bare `npx oxfmt` run.

### `.gitattributes` with LF

`oxfmt` defaults to `endOfLine: "lf"` and ignores nothing about the checkout,
so a CRLF working tree fails `format:check` on every file while CI passes.
`.gitattributes` with `* text=auto eol=lf` fixes that for every contributor and
keeps the formatter output identical across platforms. Rejected: `endOfLine:
"crlf"`, which breaks the Linux runner and any LF checkout.

The index already stores LF (`git ls-files --eol` reports `i/lf w/crlf` for
`js/app.js`, `package.json` and `vite.config.ts`), so the attribute file needs no
renormalization commit. The current working tree keeps CRLF until the format
baseline rewrites it with LF, and every later checkout writes LF.

### Lint on `correctness` only

Enable the `correctness` category at `error`, configure `no-unused-vars` with
`argsIgnorePattern: "^_"`, and set `options.maxWarnings: 0` so a later
warning-level rule cannot pass silently. The other categories stay off: they
report 171 to 9,085 findings and would force style decisions this change does
not own (`no-array-sort` against the mutating engine queues, `no-underscore-
dangle` against the Playwright hooks).

### Fix the 76 findings instead of disabling the rules

73 findings are `no-unused-vars`: dead imports and bindings that the strict type
check does not report because `noUnusedLocals` is off. Deleting them is the
change's own cleanup. Rejected: a warning ratchet, because oxlint has no
baseline file and a growing unsuppressed set is not a gate.

### Policy script with tests

`scripts/check-toolchain.mjs` mirrors `scripts/check-types-policy.mjs`: it reads
`package.json`, the repository root listing and the CI workflow, and reports
every violation. `scripts/check-toolchain.test.mjs` covers the classification
with fixture objects. Rejected: `npm ls eslint prettier` in CI, which misses a
leftover config file or a script that still calls `prettier`.

### Commit order inside the branch

Configuration and scripts, then the `.gitattributes` renormalization, then the
lint fixes, then the `style:` reformat. The PR uses squash merge, so each commit
stays reviewable in the pull request's commit list while the merge keeps one
commit on `main`.

## Risks / Trade-offs

- **`oxfmt` 0.78 may change output in a minor release** → exact pin; a bump
  carries its own `style:` commit, and `format:check` fails loudly if it does
  not.
- **The reformat conflicts with `feat/react-ui-shell`** → rebase that branch and
  rerun `npm run format`; a formatting hunk is never resolved by hand.
- **Removing 73 bindings touches engine and screen modules** → `npm test` (255
  tests) and `npm run typecheck` fail if a removed binding was used.
- **The `.gitattributes` change is invisible in the diff until a checkout** → the
  format baseline rewrites the tree with LF in the same pull request, so
  `format:check` is validated before merge.
- **A genuine false positive in the new gate** → suppress that line with
  `// oxlint-disable-next-line <rule>` and a reason; never disable the rule.

## Migration Plan

1. Add `.oxlintrc.json`, `.oxfmtrc.json`, the scripts, `scripts/check-toolchain.mjs`
   and its test.
2. Add `.gitattributes`; no renormalization commit is needed because the index
   already holds LF.
3. Fix the `correctness` findings.
4. Run `npm run format` in one `style:` commit; it rewrites the working tree with
   LF.
5. Add the CI job and the `AGENTS.md` commands.

Rollback is the revert of the pull request: it removes tooling and reflowed
whitespace and changes no runtime behavior.
