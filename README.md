# Pocket Grimoire

A standalone Storyteller aid for **Blood on the Clocktower: Trouble Brewing**.
It runs as static HTML, CSS and ES modules. There is no backend, database or
build step. Game state stays in `localStorage`.

## Run

```sh
python -m http.server 8010
```

Open <http://localhost:8010/>.

You can also open `index.html` through any static file server. A `file://` page
does not load the ES modules and language catalogs reliably.

## Routes

- `#/table` — Storyteller console: deal, night, dawn, execution result, win and
  review. Nominations and votes are run at the table; the app records only the
  execution result.
- `#/bag` — player count, legal bag, teaching sets, Drunk mask, Demon bluffs.
- `#/seat` — seat order, swap, shuffle.
- `#/secrets` — red herring, host-chosen one-of-two pairs, reminders.
- `#/player` — safe device handoff: number, cover, shown role, name.
- `#/public` — public screen without roles, bluffs, notes or effects.
- `#/help` — compact rules and role reference.
- `#/demo` — scripted 10-player teaching game.
- `#/sheet` — role sheet in the current language.
- `#/sheet/ru`, `#/sheet/en`, `#/sheet/az` — the same role sheet in Russian,
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
node --test js/night.test.mjs js/engine.test.mjs
```

The tests cover composition, the Drunk, bluffs, night order, all Trouble
Brewing roles, effects, execution versus death, the strict-majority vote
threshold, win priorities, migration and import/export.

## Rules

The implemented rules and sources are in
[`docs/rules-sources.md`](docs/rules-sources.md). Official data snapshots are in
`docs/official/`.

## Deploy

The project root is the GitHub Pages artifact. Set Pages to **GitHub Actions**.
The workflow runs the tests, copies the static files to a temporary Pages
folder and uploads it. Keep `.nojekyll`.
