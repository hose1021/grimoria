# Pocket Grimoire (Go)

A rewrite of [Pocket Grimoire](https://www.pocketgrimoire.co.uk) as a single Go
binary. No PHP, no Doctrine, no SQL database.

## Why Go

- Static HTML is served by `net/http`, templates are parsed once per locale at
  startup, and every request is handled concurrently.
- One `pg.exe` (about 13 MB) plus `web/`, `data/`, `templates/`. No interpreter
  or database server to install.
- On the same machine the game page went from ~198 ms median (Symfony dev
  server) to ~1 ms median.

## No database

Roles, teams, jinxes and scripts are static files:

- `web/build/data/{locale}.js` — the `var PG = {...}` payload used by the front
  end.
- `data/i18n/{locale}.json` — UI translations (converted from the old YAML).
- `data/locales.json` — the language list.

The only persistent user data is a shared homebrew script. It is stored as one
JSON file per game under `data/homebrew/{uuid}.json`; the UUID is the file name.
There is no SQL database, no schema and no migration step.

## Run

```sh
go run .
# or
go build -o pg.exe . && ./pg.exe
```

Open <http://localhost:8000/az_AZ/>.

Environment variables:

| Variable          | Default     | Meaning                     |
|-------------------|-------------|-----------------------------|
| `PG_ADDR`         | `:8000`     | listen address              |
| `PG_WEB_DIR`      | `web`       | static files                |
| `PG_DATA_DIR`     | `data`      | translations and homebrew   |
| `PG_TEMPLATE_DIR` | `templates` | Go templates                |
| `PG_ENV`          | `dev`       | `prod` enables indexing     |

## Static Storyteller app (GitHub Pages)

`site/` is a standalone Storyteller app for GitHub Pages. It is plain HTML, CSS
and ES modules, with the game state in `localStorage`. It uses the role catalog,
role art and Inter font from `web/`, copied into `site/assets/`.

The app covers the full Trouble Brewing loop: setup, rules, deal, seat order,
secret setup, first night, dawn, discussion, host-recorded execution, win check,
next night, and a host-controlled review. Players enter their own names after
the deal; the app does not prefill names. The Storyteller runs nominations and
votes at the table and records only the execution result. The Storyteller console is
separate from the player handoff and the public screen; the player handoff
receives only a shown-role projection, never the grimoire.

```sh
node build.mjs          # copies data, role art, fonts and favicon
node --test site/js/night.test.mjs site/js/engine.test.mjs
python -m http.server 8010
```

Open <http://localhost:8010/site/>.

The app routes are hash-based:

- `#/bag` — player count, legal bag, recommended teaching sets, Drunk mask, bluffs.
- `#/seat` — seat order, swap, shuffle.
- `#/secrets` — red herring, host-chosen one-of-two information pairs, reminder checklist.
- `#/table` — host console for deal, night, day, execution result, win and review.
- `#/player` — safe device handoff: number, cover, shown role, name.
- `#/public` — public screen without roles, bluffs, notes or effects.
- `#/help` — compact rules and full role reference.
- `#/demo` — separate scripted 10-player teaching game.

State moves through domain actions in `site/js/engine.js`; `site/js/store.js`
persists one game under `pg.game.v3`, migrates `pg.game.v2`, keeps a backup when
a save is corrupt, and offers export/import with schema validation. Export files
contain secrets, so treat them as Storyteller material.

Rules sources and the exact interpretations used by the engine are listed in
[`docs/rules-sources.md`](docs/rules-sources.md). Official data snapshots from
2026-11-03 are in `docs/official/`.

Deployment:

- In the GitHub repository, set Pages source to **GitHub Actions**.
- Push to `main`. `.github/workflows/pages.yml` builds `site/` and deploys it.
- `site/assets/` is generated and ignored by git.

The design study that led to this app lives in `design/`; it is not part of the deployment.

## Layout

```
main.go                 entry point and graceful shutdown
internal/app/
  server.go             routes, handlers, page data
  render.go             per-locale template sets and form helpers
  i18n.go               JSON translator with en_GB fallback
  locales.go            locale list
  assets.go             manifest.json / entrypoints.json resolution
  homebrew.go           homebrew validation and file storage
  fetch.go              SSRF-safe HTTPS JSON fetching
  botc.go               botcscripts.com result conversion
  *_test.go             unit and HTTP integration tests
templates/              Go templates converted from Twig
translations/           original YAML (reference only)
data/                   runtime data, homebrew files
web/                    webpack output, images, icons
```

Routes match the old application:

- `GET /` and `GET /sheet` redirect to the default locale.
- `GET /{locale}/` and `GET /{locale}/sheet` render the pages.
- `POST /{locale}/homebrew`, `GET /{locale}/data/get-game`,
  `GET /{locale}/data/url`, `GET /{locale}/data/get-botc`.
- `POST /_js-log` writes front-end errors to the process log.

## Design

The look lives in `web/css/theme.css`: light Kayak-inspired surfaces, one orange
primary action per step, rounded cards, and the Inter variable font
(`web/fonts/inter`). The play board stays dark because the character and
reminder tokens are drawn for a dark background. Print rules stay in the
webpack CSS, so the printable character sheet is unchanged.

## Tests

```sh
go test ./...
node --test site/js/night.test.mjs site/js/engine.test.mjs
node build.mjs
```

`site/js/engine.test.mjs` covers composition and Baron, Drunk masks, night order,
information, poison and protection, Ravenkeeper, Undertaker, Scarlet Woman
thresholds, Imp self-kill, Virgin, Slayer, dead votes, ties, execution versus
death, Saint, Mayor, win priority, import/migration, public projection and
idempotent steps. The demo uses the same engine.

## Known gaps

- `web/build` and `web/build/data` are produced by the old PHP/Node pipeline.
  Porting that generator to Go is the next step; until then run the old
  `pocket-grimoire:translate` and `yarn build`, then copy the output here.
- `/_js-log` does not map stack traces through source maps yet; it logs the
  original message and location.
- `vi_VN` has no data file (`vi_VI.js` exists), the same mismatch as before the
  rewrite.
- The new host screens are Russian-first. Role names and abilities still follow
  the en/ru/az language switch; the detailed help copy is Russian.
- Travellers and Fabled are outside the supported setup flow. The site app is a
  local one-device aid, not a secure multi-user client.
