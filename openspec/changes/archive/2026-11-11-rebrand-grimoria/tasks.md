# Tasks

## 1. RED: identity contract in the browser checks

- [x] 1.1 Add assertions to `scripts/browser-check.mjs`: the document title is `Grimoria`, `/manifest.webmanifest` reports `name` and `short_name` `Grimoria`, the table and setup headers contain no `PG` text, `img.brand-mark` and `img.brand-lockup` resolve with HTTP 200, and a downloaded game export suggests a `grimoria-` file name while its JSON keeps `"format": "pocket-grimoire"`. Rebuild the harness artifact (`node scripts/browser-check.mjs`, `PLAYWRIGHT_MODULE` set as in `.github/workflows/ci.yml`) and record the failing assertions as the RED evidence.
- [x] 1.2 Keep the existing `/pocket-grimoire/` assertion on the exported JSON and verify it still targets the format value, not a file name.

## 2. Logo assets

- [x] 2.1 Add `public/grimoria-logo.svg` from the supplied SVG: keep the 320×130 viewBox and the glyph, wordmark and tagline text, replace `currentColor` with `#ededed`, keep the star and tagline `#B79665`, and drop the inline `style`, `data-d-component` and root `font-family` attributes. Verify it parses and renders by opening the file in the browser at 190 px and 320 px wide.
- [x] 2.2 Replace `public/favicon.svg` with the square 64×64 mark: rounded `#0c0f11` tile, `#ededed` book glyph with thicker strokes, gold star. Verify the tab icon at 16 px and 32 px in both light and dark browser themes.
- [x] 2.3 Update `public/manifest.webmanifest` to `"name": "Grimoria"` and `"short_name": "Grimoria"`, keep the `favicon.svg` icon entry, `start_url`, scope and colours. Verify the manifest loads without errors in the browser Application panel and the new browser check from 1.1 passes for the manifest fields.

## 3. In-app brand and shell

- [x] 3.1 Replace the `PG` text in the table header (`js/table.js`) and setup header (`js/bag.js`) with `<img class="brand-mark" src="${assetUrl("favicon.svg")}" alt="Grimoria">`; import `assetUrl` where missing; add `.brand-mark` and remove `.host-mark`/`.setup-mark`. Verify both headers render at 390 px without horizontal overflow and the image loads.
- [x] 3.2 Replace the `PG` mark and "Pocket Grimoire" label in the role-sheet header (`js/sheet.js`) with the lockup image, and add the same lockup to the help header (`js/help.js`); add `.brand-lockup` (`width: clamp(140px, 40vw, 190px)`) and remove `.sheet-mark`. Verify both screens show the wordmark, the tagline and no clipped layout at 390 px.
- [x] 3.3 Update the shell and fallback names: `index.html` `<title>` and `<noscript>`, the console fallback label in `js/app.js`, and the title and message in `scripts/build-fallback.mjs`. Verify the served document title is `Grimoria` and the generated `dist/404.html` shows the new name.
- [x] 3.4 Rename the download file names in `js/table.js` (`grimoria-tb.json`) and `js/bag.js` (`grimoria-library.json`); leave `exportGame` and `LIBRARY_FORMAT` identifiers unchanged. Verify the browser-check download assertion passes and an older `pocket-grimoire` export still imports through the existing unit test.

## 4. Project rename and documentation

- [x] 4.1 Change `"name"` to `"grimoria"` in `package.json` and in the root entries of `package-lock.json`. Verify `npm ci` succeeds and `npm run typecheck` passes.
- [x] 4.2 Update project names in `README.md`, `AGENTS.md` and `SPEC.md` (titles and prose), and the console messages in `scripts/serve.mjs` and `scripts/serve-dist.mjs`. Verify `grep -rn "Pocket Grimoire"` returns no hit in those files and that the README headings describe Grimoria. Leave the historical `docs/improvement-research.md` title and the upstream `pocketgrimoire.co.uk` reference in `docs/rules-sources.md` unchanged.
- [x] 4.3 Add a note to the README that the repository is `grimoria` and the Pages URL is `hose1021.github.io/grimoria/`, without changing the documented run command. Verify the README commands still run as written.

## 5. Integration verification

- [x] 5.1 Run `npm run verify` and `node scripts/browser-check.mjs`; verify a clean pass, no console errors, and record the GREEN result.
- [x] 5.2 Inspect the built artifact: `dist/favicon.svg`, `dist/grimoria-logo.svg` and `dist/manifest.webmanifest` exist, `dist/sw.js` lists both logo files in `ASSETS`, and the cache hash changed. Verify the app loads once offline after the update flow.
- [x] 5.3 Smoke the table, setup, role sheet and help screens at 390 px and desktop width: the new mark and lockup render, the old `PG` and "Pocket Grimoire" strings are gone, and no layout overflows.

## Evidence

- RED: `node scripts/browser-check.mjs` -> `AssertionError: document title`, actual `Pocket Grimoire`, expected `Grimoria` (scripts/browser-check.mjs:296). A second RED run after the markup change failed on `bag brand alt`: `'' !== 'Grimoria'`, which exposed the unlabelled header marks.
- GREEN: `npm run verify` passed (typecheck, 234 unit tests, Vite build, fallback with base `/`, offline cache `pg-static-b5754eb68dc4aabe` with 403 assets, source policy). `node scripts/browser-check.mjs` passed: phone/tablet, night/day, Virgin, route cleanup, privacy, reload, cross-tab, languages, role-sheet scenario filters, offline project-subpath reload, safe PWA update, plus the new identity and download assertions.
- Merged: https://github.com/hose1021/grimoria/pull/55 squash `7abbfdc`; all checks passed, owner merged.
- Changed: `public/favicon.svg`, `public/grimoria-logo.svg` (new), `public/manifest.webmanifest`, `index.html`, `js/app.js`, `js/table.js`, `js/bag.js`, `js/sheet.js`, `js/help.js`, `css/app.css`, `css/host.css`, `css/setup.css`, `css/sheet.css`, `scripts/build-fallback.mjs`, `scripts/serve.mjs`, `scripts/serve-dist.mjs`, `scripts/browser-check.mjs`, `package.json`, `package-lock.json`, `README.md`, `AGENTS.md`.

## Workflow follow-up

- The owner renames the GitHub repository from `pocket-grimoire-go` to `grimoria`, updates the local `origin`, and confirms the Pages URL.
- After the owner merges the pull request, sync the spec delta and archive this change.
