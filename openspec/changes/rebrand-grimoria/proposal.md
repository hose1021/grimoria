# Proposal

Issue: #54

## Why

The app is still named Pocket Grimoire, a name shared with an unrelated
reference site, and it shows a generic favicon and a "PG" text mark. The owner
chose a distinct product identity, Grimoria, with a dedicated logo. The rename
must not lose an in-progress game or an exported file.

## What Changes

- Replace the user-visible product name "Pocket Grimoire" with "Grimoria" in
  the page title, the no-script notice, the web app manifest, the generated
  `404.html`, the in-app brand labels, the console fallback screen, the README
  and the project documentation headings.
- Ship two static assets derived from the owner's SVG:
  - `public/favicon.svg` becomes the square mark (book and star) on a dark
    tile; it stays the favicon and the manifest icon, and also becomes the
    compact brand image in the table, setup and role-sheet headers;
  - `public/grimoria-logo.svg` is the cleaned full lockup (mark, GRIMORIA
    wordmark, "MASTER THE NIGHT" tagline) shown in the help and role-sheet
    headers.
- The logo assets carry their own colours, so no theme token is added and the
  interaction accent stays teal.
- Rename `package.json` to `grimoria` and the GitHub repository to `grimoria`
  (owner action). The Pages URL becomes `hose1021.github.io/grimoria/`; builds
  use a relative base, so no path change is required in code.
- Rename the export download filenames to `grimoria-tb.json` and
  `grimoria-library.json`.
- Keep compatibility identifiers unchanged: `pg.game.v4`, `pg.game.v3`,
  `pg.game.v2`, `pg.lang`, `pg.guided`, `pg.library.v1`, the
  `pocket-grimoire` and `pocket-grimoire-library` import formats, the
  `pocket-grimoire-writer` lock, the `pg-static-` service-worker cache prefix
  and the `pg.redirect` fallback key. Existing saves, exports, libraries and
  installed workers continue to work, and no migration is needed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app/ui-and-privacy`: adds the application identity requirement that fixes
  the product name and logo on the app shell, headers and install metadata.

## Impact

- Static assets: `public/favicon.svg` is replaced, `public/grimoria-mark.svg`
  and `public/grimoria-logo.svg` are added, `public/manifest.webmanifest` is
  updated. The offline worker regenerates its asset list and cache hash.
- Shell and UI: `index.html`, `js/app.js`, `js/table.js`, `js/bag.js`,
  `js/sheet.js`, `js/help.js`, `css/app.css`, `css/host.css`, `css/setup.css`,
  `css/sheet.css`.
- Build and tooling: `package.json`, `scripts/build-fallback.mjs`,
  `scripts/serve.mjs`, `scripts/serve-dist.mjs`, `scripts/browser-check.mjs`.
- Documentation: `README.md`, `AGENTS.md`, `SPEC.md`.
- No rule, state schema, storage key, command or public API changes. The logo
  is decorative; every mark keeps `aria-hidden` or an accessible name.
