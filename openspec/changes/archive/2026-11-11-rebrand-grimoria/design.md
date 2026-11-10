# Design

## Context

See `proposal.md` for motivation. The app is a Vite build. `public/` is copied
verbatim into `dist/`, `index.html` uses Vite's `%BASE_URL%` placeholder for
scripts, and `js/ui.js` exposes `assetUrl(name)` so runtime images respect the
deployed subpath. The manifest and favicon are declared in `index.html` with
root-absolute paths that Vite rewrites to the configured base. The deployed
service worker is generated from `dist/` by `scripts/build-offline.mjs`; the
tracked root `sw.js` is a pre-Vite artifact and is not deployed.

The supplied SVG is a 320×130 lockup: a book-and-star glyph at
`translate(160 41)`, a `GRIMORIA` wordmark in a serif face, and a gold
`MASTER THE NIGHT` tagline. It uses `currentColor` and `#B79665`.

## Goals / Non-Goals

**Goals:**

- The app identifies itself as Grimoria everywhere a person sees the product
  name, and shows one consistent mark.
- The logo renders correctly on the dark theme, at favicon size and inside the
  project subpath.
- Existing saves, exports, libraries and installed workers keep working.

**Non-Goals:**

- No change to the teal interaction accent, layout, typography or colour
  palette.
- No persistence-key, command, rule or schema migration.
- No new dependency, build step or font.

## Decisions

### Two assets, one art source

`public/favicon.svg` is replaced with a square 64×64 mark: a `#0c0f11` rounded
tile, the book glyph stroked in `#ededed`, and the gold star. The tile keeps
the mark readable on light and dark browser chrome, where a transparent icon
would vanish. The glyph is enlarged and its strokes thickened relative to the
lockup so it survives a 16 px render.

`public/grimoria-logo.svg` is the lockup with the viewBox kept at 320×130 and
explicit `#ededed` / `#B79665` colours. The `currentColor`, inline `style` and
`data-d-component` attributes are removed; `width`/`height` stay 320/130. The
wordmark stays SVG text so no font file is added.

Alternative: one inline SVG component for every header. Rejected because the
manifest needs a file, and inlining the art four times duplicates it. Header
marks reuse the favicon through `assetUrl("favicon.svg")`, which is already
base-aware.

### Brand markup

- Table and setup headers replace the `PG` text with
  `<img class="brand-mark" src="${assetUrl("favicon.svg")}" alt="Grimoria">`.
  Their adjacent text names the script and phase, not the app, so the mark
  carries the accessible name.
- The role-sheet header replaces its `PG` mark and "Pocket Grimoire" label with
  the lockup image, `alt="Grimoria"`, then keeps its existing `h1` and filter
  summary.
- The help header gains the same lockup above its existing `h1`.
- The console fallback screen and the generated `404.html` use the word
  Grimoria; they do not load the logo.

New CSS is limited to `.brand-mark` (28–34 px, rounded, no border box around
the tile) and `.brand-lockup` (block, `width: clamp(140px, 40vw, 190px)`,
`height: auto`). The existing `.host-mark`, `.setup-mark` and `.sheet-mark`
rules are removed with the `PG` spans.

### Name and identifier boundaries

User-visible surfaces change: document title, manifest `name`/`short_name`,
README and documentation titles, in-app labels, download filenames and console
messages. Machine identifiers stay as they are:

- `pg.game.v4`, `pg.game.v3`, `pg.game.v2`, `pg.lang`, `pg.guided`,
  `pg.library.v1`, `pg.game.broken.<timestamp>`, `pg.redirect`;
- the `pocket-grimoire` and `pocket-grimoire-library` format identifiers;
- the `pocket-grimoire-writer` lock name and the `pg-static-` cache prefix.

Renaming them would strand a live game, break earlier exports and force a
migration for no user-visible gain; the app would also need to keep reading the
old keys forever. A later punctuation of those identifiers needs its own
migration change.

### Repository rename

`package.json` and `package-lock.json` take the name `grimoria`. The GitHub
repository rename is an owner action in the repository settings; the build is
base-relative, so code does not depend on the repository name. Existing issue
and PR URLs redirect after the rename.

## Risks / Trade-offs

- [The lockup wordmark uses SVG text and a serif fallback] → Georgia is absent
  on some Linux and Android systems, so the wordmark falls back to the platform
  serif. The glyph and spacing stay stable; converting the wordmark to paths is
  a follow-up if the fallback looks wrong.
- [A dark tile icon on a dark toolbar can look like a dark square] → Keep the
  light glyph and gold star at maximum contrast; the tile is only 64 units, so
  the mark fills it. Verify at 16 px and 32 px in the browser.
- [Two logo files can drift] → The mark art is small and both files come from
  the same owner SVG; the design lists both paths. There is no generator.
- [Renaming the repository breaks bookmarks to the old Pages URL] → GitHub
  redirects a renamed repository, and the Pages site moves with it. The owner's
  explicit rename is the rollout step.
- [Old installs keep the old worker until the update flow runs] → That is the
  existing update contract; the new worker only changes the cache hash and the
  precache list.

## Migration Plan

1. Land the branch with assets, name changes and tests; CI builds and deploys
   `dist/`.
2. The owner renames the repository to `grimoria` and updates the local remote.
3. Rollback is a revert of the branch; no stored data changes, so no data
   rollback exists.

## Open Questions

None.
