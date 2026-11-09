# Pocket Grimoire

A standalone Storyteller aid for **Blood on the Clocktower**. The rules engine
implements **Trouble Brewing**, **Bad Moon Rising** and **Sects & Violets**.
Bad Moon Rising and Sects & Violets are host-adjudicated: the app supplies the
official night order, setup choices, targets, death bookkeeping and the
scenario win conditions, while the Storyteller resolves the printed abilities. It runs as static HTML,
CSS and ES modules. There is no backend, database or build step. Game state
stays in `localStorage`.

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
- `/bag` — player count, scenario picker, legal bag, teaching sets, Drunk mask,
  Demon bluffs. Scripts can be imported from a JSON file, a URL or the
  clipboard.
- `/seat` — seat order, swap, shuffle.
- `/secrets` — red herring, host-chosen one-of-two pairs, reminders.
- `/player` — safe device handoff: number, cover, shown role, name.
- `/public` — public screen without roles, bluffs, notes or effects.
- `/help` — compact rules and role reference.
- `/demo` — scripted 10-player teaching game.
- `/sheet` — role sheet in the current language.
- `/sheet/ru`, `/sheet/en`, `/sheet/az` — the same role sheet in Russian,
  English and Azerbaijani.

The role sheet filters between Trouble Brewing (22 roles), Bad Moon Rising
(25 roles), Sects & Violets (25 roles) and all standard scenarios (72 roles).
The five Travellers used by the reference sheet — Scapegoat, Gunslinger,
Beggar, Bureaucrat and Thief — are a separate toggle, so they are not counted
with the selected scenario. The filter and the Travellers toggle are reading
preferences: they never change the saved game.

## Data

`assets/data/` contains the locale catalogs, `assets/img/roles/` the role art
and `assets/fonts/inter/` the font. These files are part of the deployment.

Game state uses `pg.game.v4`. The store migrates `pg.game.v3` and `pg.game.v2`, keeps a backup
when a save is corrupt, and supports JSON export/import. Exports contain secret
roles and notes; treat them as Storyteller material.

## Test

```sh
node --test js/*.test.mjs
```

The tests cover composition, the Drunk, bluffs, night order, all Trouble
Brewing and Bad Moon Rising roles, effects, execution versus death, the
at-least-half vote threshold, win priorities, the Mastermind extra day,
migration and import/export, script parsing and custom-script bags.

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
reloads, including GitHub Pages project subpaths. When a newer release has been
fully precached, the app offers **Update** or **Later**. **Update** first saves
the current game and asks every other open window to save; only then does it
activate the new worker and reload each window once. **Later** keeps playing on
the version already loaded. An update is never forced during a game, and a
failed save in any window cancels activation; a window that still cannot save
at reload time keeps its code and shows a recovery message.

The first upgrade from a release older than this update flow cannot show the
prompt: that version's code does not know about it. It keeps working while the
new worker waits. Close every open Pocket Grimoire window (on a phone, close
the installed app from the app switcher); the next launch runs the new version
and later releases use the prompt.

After changing application assets, regenerate the committed cache manifest:

```sh
node scripts/build-offline.mjs
```

Actions also regenerates it before staging the Pages artifact. Running the app
still needs no dependency installation or bundler.

## Browser verification

`scripts/browser-check.mjs` is a Playwright check that runs in pull-request CI
and can also be run locally on demand. With Playwright and its Chromium browser
installed outside the repo, set `PLAYWRIGHT_MODULE` to its `index.mjs`, then run
`node scripts/browser-check.mjs`. It starts its own local
server under a project subpath, checks phone/tablet/desktop routes, completes
7- and 12-player scenarios, and exercises privacy, dialogs, cross-tab updates,
locales, offline reloads, and the stale-to-new service-worker update flow,
including a pre-update client's first upgrade. Screenshots are written to the
system temp folder.

See [implementation notes](docs/improvement-implementation.md) for validation
results and the scope of the research recommendations.
