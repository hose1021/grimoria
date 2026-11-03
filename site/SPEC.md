# Static app spec (GitHub Pages)

One static Storyteller app for Trouble Brewing. Vanilla ES modules, no
framework, no backend, state in `localStorage`. The app is a local one-device
aid. It is not a security boundary against a player with DevTools access to the
same browser profile.

## Runtime

- `site/index.html` loads `assets/data/ru_RU.js` as a classic script, then
  `js/app.js` as a module. The language switch loads `en_GB` or `az_AZ` through
  `js/roles.js`.
- `window.PG.roles` is the catalog. `assets/` is produced by `node build.mjs`
  from `web/`.
- Routes are hashes: `#/bag`, `#/seat`, `#/secrets`, `#/table`, `#/player`,
  `#/public`, `#/help`, `#/demo`. Default route is `#/table`.
- `#/table` is the Storyteller console. `#/player` and `#/public` are
  player-facing and must never render full grimoire state.

## Modules

| File | Responsibility |
|---|---|
| `js/model.js` | schema v3, player defaults, public projection, migration, import/export validation |
| `js/rules.js` | Trouble Brewing composition, bag validation, recommended sets, night order, labels |
| `js/engine.js` | domain actions: deal, night, effects, information, day, host execution, win, corrections |
| `js/store.js` | one saved game, migration, corruption backup, autosave, undo, import/export |
| `js/bag.js` | setup screen: count, legal bag, bluffs, Drunk mask |
| `js/seat.js` | seat order and swaps |
| `js/secrets.js` | red herring, one-of-two pairs, reminder checklist |
| `js/table.js` | host console: deal, night, day, host-recorded execution, win, review |
| `js/player.js` | safe handoff with a public-only role projection |
| `js/public.js` | public screen with no roles, bluffs, notes or effects |
| `js/help.js` | compact rules and all-role reference |
| `js/demo.js` | separate scripted 10-player teaching game |
| `js/strings.js` | UI labels; role names still come from the locale catalog |
| `js/i18n.js` | existing text translator and language switch |

No screen reads or writes `localStorage` directly. Screens mutate the singleton
through engine functions, then call `save()`/`run()` from `store.js`.

## State v3

Key: `pg.game.v3`. Legacy `pg.game.v2` is migrated on load. A corrupt value is
kept under `pg.game.broken.<timestamp>` and the UI reports the problem.

```js
{
  v: 3,
  scriptId: "tb",
  phase: "setup" | "deal" | "seat" | "night" | "day" | "over",
  setup: {
    count, roles: [roleId], bluffs: [roleId], drunkShownId, herringId,
    info: { washerwoman, librarian, investigator }, ready
  },
  order: ["1", "2"],
  players: {
    "1": {
      id, seat, name, roleId, shownRoleId, team, alive, claimed,
      reminders: [], used: {}, voteToken, butlerMasterId,
      changedFrom, deadAt, notes
    }
  },
  bluffs: [roleId],
  herringId,
  night: { number, queue: [step], currentIndex, demonChanged },
  day: {
    number, morning: [death], nominations: [],
    activeNominationId, execution, ended, open
  },
  deaths: [], executions: [], effects: [], corrections: [],
  log: [], notes, winner, reviewOpen, publicRevealed, applied
}
```

An effect records `kind`, `sourceId`, `targetId`, `start`, `expires` and
`active`. A night step records its stable key, role or system kind, actor,
target mode, targets, registrations, computed/given information, completion
state and optional pending Demon-heir choice.

## Domain rules

- The engine is the only place that applies game rules. UI code may render
  options and host decisions, but must call `engine.js`.
- Every completed step and recorded vote is idempotent: applying it twice
  returns `{ ok: false }`.
- Saint, Scarlet Woman inheritance, Imp self-kill, Mayor redirect, Ravenkeeper,
  Undertaker, Drunk, Virgin, Slayer, Soldier, Monk, Butler, Spy and Recluse
  behaviour is covered by tests.
- The host chooses false information, registration variants, Mayor redirects
  and a Demon heir when several Minions are eligible. The engine offers only
  allowed choices.

## Screens

- `#/bag`: 5–15 players; exact composition; Baron adjustment; random legal bag;
  recommended sets for 7/10/12; Drunk real/shown split; three good bluffs not in
  play, excluding the Drunk mask; bluffs and the Drunk mask are role tokens with
  names under them; 5–6 player games have no bluffs.
- `#/seat`: ring in seat order, swap, shuffle, undo; names only, after players
  have entered them in `#/player`. New games start with blank names; the player
  flow requires a non-empty name before it claims a number.
- `#/secrets`: host-chosen red herring and one-of-two pairs (no auto-fill),
  reminder checklist, host-only role roster.
- `#/table`: one obvious next step; five-part guidance (host, player, grimoire,
  public line, check); target picker; information card; night queue; day
  announcement; host-recorded execution result; win; review gate. The app does
  not keep a vote ledger in the UI.
- `#/player`: number picker, opaque cover, shown role only, name entry,
  auto-hide, warning before returning to the host console.
- `#/public`: phase, alive count, public deaths, winner. No roles, bluffs,
  notes, effects or hidden information.
- `#/help`: rules and all-role reference without the current game's secrets.
- `#/demo`: separate scripted game; never touches the saved real game.

## CSS and accessibility

- Tokens live in `css/app.css`. New screens use `css/setup.css` and
  `css/host.css`; seat/player keep their existing files.
- Dark surfaces, role art, touch targets at least 44px, visible focus, labels on
  controls, no horizontal overflow at 360–390px.
- Secret states use text and icons, not color alone.
- `prefers-reduced-motion` disables animation and smooth scrolling.
- Player-facing views build a projection object. They do not receive the full
  secret state and do not rely on blur or opacity for privacy.

## Build and Pages

`node build.mjs` copies `web/build/data`, role images, fonts and the favicon
into `site/assets/` and writes `site/.nojekyll`. The Pages workflow builds
`site/` and deploys it.

## Acceptance

- `node build.mjs` succeeds.
- `node --test site/js/night.test.mjs site/js/engine.test.mjs` passes.
- `go test ./...` passes.
- Bag → Seat → Secrets → Table → Player → Public works, reload preserves state.
- A 7/10/12-player bag deals, names are entered by players, a full night and day
  resolve, the host records the execution, and the win screen gates the role
  review.
- No console errors, no horizontal overflow at 360 and 1440.
- Public and player views expose no real role, bluffs, notes or effects.
