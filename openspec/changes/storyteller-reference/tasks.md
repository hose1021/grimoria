# Tasks

## 1. Data

- [x] Parse `docs/rules-matrix.md` into 72 roles and 130 rules: status, `When`,
      engine behaviour, host decision and asserting test titles.
- [x] Clean rule ids, code paths and internal citations out of the examples.
- [x] Read official interactions from `docs/official/jinxes.json`, filtered to
      supported pairs.
- [x] Write `public/assets/data/reference.json` with `npm run reference`.
- [x] Translate every rule and interaction into
      `public/assets/data/reference.ru.json`, keeping the English shape.

## 2. Screen

- [x] Add `/reference` and `/reference/:roleId` to the shell route resolver,
      with the app bar reference group.
- [x] Build the discovery list with scenario groups, a name filter, the
      RU/EN/AZ switch and links to each page.
- [x] Build the detail sections: ability, basic information, how to run,
      clarifications, special conditions, interactions, examples, quick
      reference and sources.
- [x] Read engine facts through `ShellPorts.reference.facts`; the UI never
      imports the role registry.
- [x] Use the localized role note keys as the first "how to run" instructions.
- [x] Add the reference tokens to `css/app.css`; keep two-column tables that
      stack below 520 px.
- [x] Add the reference keys to `ru`, `en` and `az`.

## 3. Verification

- RED: not applicable; the route did not exist before the change. The new parity
  test is the regression check for the data pipeline.
- GREEN: `node --test src/ui/screens/reference/reference-data.test.ts` — 2 tests
  pass: the Russian dataset mirrors 72 roles / 130 rules / every example count,
  and no `SYS-` or `INFO-` id remains in user-facing text.
- [x] `npm run reference` — 72 roles, 130 rules.
- [x] `npm run verify` — typecheck, oxlint, format check, tests, build, fallback,
      offline cache, source policy, official provenance, acceptance, version and
      role ownership all pass.
- [x] `openspec validate --changes --strict`.
- [x] `node scripts/openspec-check.ts`.
- [x] Real browser at `http://localhost:8011/reference/assassin`:
      ten sections, Russian dataset, console clean, 1440×900 and 390×844
      without horizontal overflow.
- [x] Language switch RU → EN → RU loads both datasets; the ability and labels
      change.
- [x] Production build under `/grimoria/`: a direct deep link
      `/grimoria/reference/assassin` is restored by `404.html`, and the page
      requests `/grimoria/assets/data/reference.ru.json`.
- [x] Desktop and mobile screenshots in `docs/evidence/reference/`.

## 4. Before the PR

- [x] Tracking issue opened: #396.
- [ ] Open the PR against `dev`, record the CI result and stop.
