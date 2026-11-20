# Tasks

## 1. Product context

- [x] 1.1 Capture the durable product truth in `PRODUCT.md`: in-person
      Storyteller, one device, offline and account-free, honest support levels,
      Russian-first. Verified by reading the file against the repository.
- [x] 1.2 Record the incumbent visual world and the rejected direction; pin the
      replacement from the owner's references in the surface brief.

## 2. Store system

- [x] 2.1 Replace the Arcane tokens with the store palette in `css/app.css`;
      add self-hosted Oswald, Golos Text and PT Mono. Verify: `npm run
      typecheck`, `npm run build`; the built CSS references only files under
      `public/assets/fonts/`.
- [x] 2.2 Add the store materials (`.tape-box`, `.tape-sticker`, `.hazard`,
      `.barcode`, `.screen`, `.marquee`) and the one entrance animation. Verify:
      the detector reports no finding.
- [x] 2.3 Restyle the app bar: Home tab, 1200 px breakpoint, seven route links,
      language switch visible at desktop. Verify: 1280 px and 390 px captures.

## 3. Welcome page

- [x] 3.1 Add `/` with the storefront composition: headline, one yellow action,
      continue action when a game is in progress, five real first-night roles and
      one struck role, staff picks, membership card, tag row, closing band.
      Verify: 1440, 1280 and 390 px captures; `/public` falls back to `/table`.
- [x] 3.2 Route the default to `/` and keep the unknown-path fallback `/table`.
      Verify: root renders the welcome screen; `data-route` is `home`.
- [x] 3.3 Label the sample as a sample and prove the page does not write the
      saved game.

## 4. Operate screens

- [x] 4.1 Table: dark shelf mat with the hazard on the outer rail, seat labels
      above/below their medallion, hub as a black screen, yellow dock action.
      Verify: seeded 8-player night at 1280 and 390, no name hidden by the hub.
- [x] 4.2 Add a visible close control to the step sheet and the heir sheet;
      Escape and the backdrop keep working. Verify: open the sheet and close it
      with the button at 390 px.
- [x] 4.3 Bag, seat, secrets, player and sheet take the store tokens; the bag
      footer respects the safe area; role names wrap instead of truncating; the
      applied set expands.
- [x] 4.4 Player handoff: the primary action returns the device to the host;
      the seat grid wraps its three lines without overlap.

## 5. Remove the public screen

- [x] 5.1 Delete `src/ui/screens/public.tsx`, its route, nav link, screen type
      and the three public-only locale keys. Verify: `/public` renders
      `/table` and no nav item names it.
- [x] 5.2 Retarget the checks: `browser-check.ts` privacy case to `/player`, the
      two-window update case to `/sheet`; rename the privacy scenario and read
      the projection instead of the page.
- [x] 5.3 Update `SPEC.md`, `README.md`, `PRODUCT.md`, `docs/architecture.md`,
      `docs/rules-matrix.md` and the `manifest.webmanifest` start URL.

## 6. Verification

- [x] 6.1 `npm run verify` passes: typecheck, lint, format, 1323 tests, build,
      fallback, offline, policy, official, acceptance, version, role ownership.
- [x] 6.2 `node scripts/openspec-check.ts` passes.
- [x] 6.3 Adversarial design review returned FIX; the blocker and the listed
      majors are corrected. The remaining open item is the bag desktop
      re-composition.

## 7. Evidence

- RED: the night step sheet rendered no close control; in the seeded build
  `document.querySelectorAll('[aria-modal="true"] [data-act="close"]').length`
  returned 0.
- GREEN: the same measurement returns 1, and activating it closes the dialog
  (`[aria-modal="true"]` count goes from 1 to 0).
- RED: the old browser checks opened `/public` and selected `.public`; after the
  screen was deleted those selectors matched nothing.
- GREEN: `/public` renders `/table` (`data-route="table"`) and no nav item names
  a public screen.
- RED: the adversarial design review returned FIX with a blocker: four
  `[data-seat-name]` rectangles sat inside the hub at 390 px and 1280 px.
- GREEN: the revised captures show every seat label above or below its medallion
  with no intersection against the hub.

