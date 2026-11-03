# Pocket Grimoire

A standalone Storyteller aid for **Blood on the Clocktower: Trouble Brewing**.
It runs as static HTML, CSS and ES modules. There is no backend, database or
build step. Game state stays in `localStorage`.

## Run

```sh
node scripts/serve.mjs 8010
```

Open <http://localhost:8010/>. Routes use real paths (`/table`, `/seat`), and
the script serves `index.html` for a direct link or a reload on any route. You
can also use any static server; direct links then need an `index.html` fallback.
A `file://` page does not load the ES modules and language catalogs reliably.

## Routes

- `/table` — Storyteller console: deal, night, dawn, execution result, win and
  review. Nominations and votes are run at the table; the app records only the
  execution result and the Virgin’s first nomination.
- `/bag` — player count, legal bag, teaching sets, Drunk mask, Demon bluffs.
- `/seat` — seat order, swap, shuffle.
- `/secrets` — red herring, host-chosen one-of-two pairs, reminders.
- `/player` — safe device handoff: number, cover, shown role, name.
- `/public` — public screen without roles, bluffs, notes or effects.
- `/help` — compact rules and role reference.
- `/demo` — scripted 10-player teaching game.
- `/sheet` — role sheet in the current language.
- `/sheet/ru`, `/sheet/en`, `/sheet/az` — the same role sheet in Russian,
  English and Azerbaijani.

The role sheet lists the 22 Trouble Brewing roles and the five Travellers used
by the reference sheet: Scapegoat, Gunslinger, Beggar, Bureaucrat and Thief.

## Data

`assets/data/` contains the locale catalogs, `assets/img/roles/` the role art
and `assets/fonts/inter/` the font. These files are part of the deployment.

Game state uses `pg.game.v3`. The store migrates `pg.game.v2`, keeps a backup
when a save is corrupt, and supports JSON export/import. Exports contain secret
roles and notes; treat them as Storyteller material.

## Test

```sh
node --test js/night.test.mjs js/engine.test.mjs js/store.test.mjs js/strings.test.mjs
```

The tests cover composition, the Drunk, bluffs, night order, all Trouble
Brewing roles, effects, execution versus death, the at-least-half vote
threshold, win priorities, migration and import/export.

## Rules

The implemented rules and sources are in
[`docs/rules-sources.md`](docs/rules-sources.md). Official data snapshots are in
`docs/official/`.

## Deploy

The project root is the GitHub Pages artifact. Set Pages to **GitHub Actions**.
The workflow runs the tests, copies the static files to a temporary Pages
folder and uploads it. Keep `.nojekyll`.

## Live play and recovery

On phones the console has Play, Players, and Queue & Tools tabs. Detailed
Storyteller guidance starts collapsed and remembers your preference. Use a
player's correction dialog to reopen a mistaken role claim; provide a reason.
Returning from a player-facing route covers the host's secrets before reveal.

One Storyteller tab holds the browser's exclusive writer lock when Web Locks
are available. Public tabs update from saved changes. Browsers without Web
Locks use optimistic save conflict detection; use one host tab on those browsers.
A failed save shows a persistent warning: export before closing the tab.

## Offline

The committed service worker caches the app, catalogs, fonts and role art.
Wait for **Ready offline** after the first online load. It then supports offline
reloads, including GitHub Pages project subpaths. A newly installed release waits
for existing tabs to close before taking over; it does not interrupt a game.

After changing application assets, regenerate the committed cache manifest:

```sh
node scripts/build-offline.mjs
```

Actions also regenerates it before staging the Pages artifact. Running the app
still needs no dependency installation or bundler.

## Browser verification

`scripts/browser-check.mjs` is an optional Playwright check. With Playwright and
its Chromium browser installed outside the repo, set `PLAYWRIGHT_MODULE` to its
`index.mjs`, then run `node scripts/browser-check.mjs`. It starts its own local
server under a project subpath, checks phone/tablet/desktop routes, completes
7- and 12-player scenarios, and exercises privacy, dialogs, cross-tab updates,
locales, and offline reloads. Screenshots are written to the system temp folder.

See [implementation notes](docs/improvement-implementation.md) for validation
results and the scope of the research recommendations.
