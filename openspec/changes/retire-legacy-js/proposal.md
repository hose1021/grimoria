# Proposal

Issue: #132

## Why

`js/` no longer owns the domain: the engine, model, rules and script catalog
live in `src/core`, and `js/` is left with five re-export shims, the complete
test suite, twelve runtime modules and a type shim. The folder mixes layers,
forces `src` to import `js`, and makes the type programs, the policy scan, the
lint scope, the Tailwind sources and the documentation describe paths that no
longer match the architecture.

## What Changes

- Move every runtime module out of `js/` into its layer:
  - `strings.js`, `i18n.js` and `locales/*` → `src/ui/i18n/`;
  - `roles.js` → `src/infrastructure/catalog/`;
  - `router.js` → `src/infrastructure/routing/`;
  - `library.js` → `src/infrastructure/library/`;
  - `presets.js` → `src/core/model/presets.ts` (pure data and functions);
  - `store.js`, `guidance.js`, `offline.js`, `help.js`, `demo.js` and
    `test-entry.js` → `src/entry/`;
  - `ui.js` keeps only `esc` and the asset URL helper, in `src/ui/dom.ts` and
    `src/infrastructure/platform/asset-url.ts`.
- Move all eighteen test files beside their modules as `src/**/*.test.ts`; the
  shim-surface test is deleted with the shims.
- Delete the five shims, `js/types.d.ts`, `js/types.test-d.ts` and the folder
  `js/` together with `js/AGENTS.md` and `js/locales/AGENTS.md`.
- Update every path-based surface in the same change: `package.json`,
  `tsconfig*.json`, oxlint/oxfmt, the Vite test entry, the Tailwind `@source`
  directives, `scripts/check-types-policy.mjs`, `scripts/check-acceptance.mjs`,
  both CI workflows, `docs/rules-matrix.md`, `SPEC.md`, `AGENTS.md`,
  `docs/architecture.md` and the main-spec test citations.
- Retire the `allowJs`/`checkJs` program and the legacy `any` ratchet, because
  the files they measured no longer exist.

**BREAKING** for repository tooling only: `npm test`, `npm run lint`,
`npm run format` and the typecheck programs stop accepting `js/**`. No runtime
API, route, storage key, export envelope or player-visible behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/architecture-layers`: the domain-ownership requirement that keeps `js/`
  as shim storage becomes a single-source-tree requirement; the automated
  boundary check and production/test source sets follow the retired tree.
- `app/static-types`: the strict gate no longer runs `checkJs` over legacy
  JavaScript; coverage is every module under `src/`, and the contract tests
  move to `src/core/model/types.test-d.ts`.
- `app/lint-and-format`: the lint and format scope drops `js/`, because the
  directory no longer exists.

## Impact

- `js/`, `src/entry/`, `src/ui/`, `src/infrastructure/`, `src/core/model/`,
  `scripts/`, `.github/workflows/`, `package.json`, `tsconfig*.json`,
  `vite.config.ts`, `docs/`, `SPEC.md`, `AGENTS.md`.
- The 472-test baseline becomes 470: the two tests in
  `js/shim-exports.test.mjs` assert a surface that is deleted, so they cannot
  survive. The acceptance baseline in `docs/rules-matrix.md` records the new
  number, and every behavioral test moves unchanged.
- The built artifact, the offline asset list and the service-worker protocol
  are unchanged in shape; only hashed chunk bytes change.
- OpenSpec main specs that cite `js/*.test.mjs` need their citations updated in
  the implementation pull request, because the consistency check fails on a
  missing cited file. This is a path edit, not a requirement change, except in
  the three capabilities listed above.
