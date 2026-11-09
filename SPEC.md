# Static app spec (GitHub Pages)

One static Storyteller app for Trouble Brewing, Bad Moon Rising and Sects &
Violets. Vanilla ES modules, no framework, no backend, state in `localStorage`. The app is a local one-device
aid. It is not a security boundary against a player with DevTools access to the
same browser profile.

## Runtime

- `index.html` loads `assets/data/ru_RU.js` as a classic script, then `js/app.js`
  as a module. The language switch loads `en_GB` or `az_AZ` through
  `js/roles.js`.
- `window.PG.roles` is the catalog. `assets/` is committed at the project root.
- Routes are paths: `/bag`, `/seat`, `/secrets`, `/table`, `/player`,
  `/public`, `/help`, `/demo`, `/sheet` and `/sheet/{ru,en,az}`. Default
  route is `/table`.
- `/table` is the Storyteller console. `/player` and `/public` are
  player-facing and must never render full grimoire state.

## Modules

| File | Responsibility |
|---|---|
| `js/model.js` | schema v4, script metadata, player defaults, public projection, migration, import/export validation |
| `js/scripts.js` | official script catalog, BotC script JSON parsing and validation |
| `js/rules.js` | Trouble Brewing, Bad Moon Rising and Sects & Violets composition, bag validation, recommended sets, night order, labels |
| `js/engine.js` | stable API for `js/engine/` domain modules: deal, night, BMR/S&V queues and outcomes, effects, information, day, host execution, win, corrections |
| `js/store.js` | one saved game, migration, corruption backup, autosave, undo, import/export |
| `js/bag.js` | setup screen: scenario picker, count, legal bag, bluffs, Drunk mask |
| `js/seat.js` | seat order and swaps |
| `js/secrets.js` | red herring, one-of-two pairs, reminder checklist |
| `js/table.js` | host console: deal, night, day, host-recorded execution, win, review |
| `js/player.js` | safe handoff with a public-only role projection |
| `js/public.js` | public screen with no roles, bluffs, notes or effects |
| `js/help.js` | compact rules and all-role reference |
| `js/demo.js` | separate scripted 10-player teaching game |
| `js/sheet.js` | all-role sheet in Russian, English and Azerbaijani |
| `js/strings.js` | keyed en/ru/az UI catalogs in `js/locales/`; role names come from the role catalog |
| `js/i18n.js` | existing text translator and language switch |

No screen reads or writes `localStorage` directly. Screens mutate the singleton
through engine functions, then call `save()`/`run()` from `store.js`.

## State v4

Key: `pg.game.v4`. Legacy `pg.game.v3` and `pg.game.v2` are migrated on load. A
corrupt value is kept under `pg.game.broken.<timestamp>` and the UI reports the
problem.

```js
{
  v: 4,
  scriptId: "tb",
  script: { id, name, edition: "tb" | "custom", source, author, roles: [roleId] },
  phase: "setup" | "deal" | "seat" | "night" | "day" | "over",
  setup: {
    count, roles: [roleId], bluffs: [roleId], drunkShownId, herringId,
    lunaticShownId, godfatherOutsider, grandmotherId, evilTwinGoodId,
    info: { washerwoman, librarian, investigator }, ready
  },
  order: ["1", "2"],
  players: {
    "1": {
      id, seat, name, roleId, shownRoleId, team, alive, claimed,
      reminders: [], used: {}, voteToken, butlerMasterId,
      changedFrom, deadAt, registeredDead, notes
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
  gossip, mastermind,
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
- Bad Moon Rising keeps the official order, setup (Godfather ±1 Outsider,
  Lunatic mask), conditional wakes, death protections, Po/Shabaloth/
  Professor outcomes, Minstrel and the Mastermind extra day in the engine. The
  Storyteller resolves each printed ability; the night card exposes the role
  ability and the outcome controls.
- Sects & Violets keeps the official order, Evil Twin setup, Fang Gu/Vigormortis
  composition, No Dashii poison, Fang Gu succession, Sweetheart drunk, the
  Vortox/Evil Twin wins and the Witch curse (lost at three living). Madness,
  swaps, Pit-Hag changes and
  the remaining abilities are host-adjudicated; the UI carries a visible
  warning.
- The host chooses false information, registration variants, Mayor redirects
  and a Demon heir when several Minions are eligible. The engine offers only
  allowed choices.

## Screens

- `/bag`: scenario picker; 5–15 players; exact composition; Baron adjustment;
  random legal bag from the selected script; recommended sets for 7/10/12;
  Drunk real/shown split; three good bluffs not in play, excluding the Drunk
  mask; bluffs and the Drunk mask are role tokens with names under them; 5–6
  player games have no bluffs.
- `/seat`: ring in seat order, swap, shuffle, undo; names only, after players
  have entered them in `/player`. New games start with blank names; the player
  flow requires a non-empty name before it claims a number.
- `/secrets`: host-chosen red herring and one-of-two pairs (no auto-fill),
  reminder checklist, host-only role roster.
- `/table`: one obvious next step; five-part guidance (host, player, grimoire,
  public line, check); target picker; information card; night queue; day
  announcement; host-recorded execution result; win; review gate. The app does
  not keep a vote ledger in the UI.
- `/player`: number picker, opaque cover, shown role only, name entry,
  auto-hide, warning before returning to the host console.
- `/public`: phase, alive count, public deaths, winner. No roles, bluffs,
  notes, effects or hidden information.
- `/help`: rules and all-role reference without the current game's secrets.
- `/demo`: separate scripted game; never touches the saved real game.
- `/sheet/{ru,en,az}`: scenario-filtered Trouble Brewing, Bad Moon Rising,
  Sects & Violets or all-standard reference with names, abilities and role art
  in the selected language. Travellers live in a separate toggle/section, and
  the filter is a UI preference that never mutates the saved game.

## Scenarios

- Trouble Brewing, Bad Moon Rising and Sects & Violets are playable from the
  picker.
- Bad Moon Rising is host-adjudicated: the engine owns the official order,
  setup choices (Godfather Outsider shift, Lunatic mask), targets, conditional
  wakes, death/resurrection recording, protections and the Mastermind extra
  day. The Storyteller resolves each printed ability; the night card exposes
  the role ability and the outcome controls.
- A custom script is stored with the game and constrains the bag, bluffs and
  Drunk mask to its roles. Custom scripts must use roles from a single
  supported edition: all Trouble Brewing, all Bad Moon Rising or all Sects &
  Violets. Mixed scripts are rejected.
- Accepted import sources: JSON file, URL (the host must allow CORS), clipboard
  text. The BotC format is an array of role ids or `{ id }` objects with an
  optional `_meta` entry; an object with `roles` is also accepted. `_meta.name`
  and `_meta.author` are shown in the preview.
- Travellers are ignored during the deal. Unknown role ids and unsupported
  roles are rejected with a message naming them.
- Changing the script resets the deal; the script travels with export/import.

## CSS and accessibility

- Tokens live in `css/app.css`. New screens use `css/setup.css` and
  `css/host.css`; seat/player keep their existing files.
- Dark surfaces, role art, touch targets at least 44px, visible focus, labels on
  controls, no horizontal overflow at 360–390px.
- Secret states use text and icons, not color alone.
- `prefers-reduced-motion` disables animation and smooth scrolling.
- Player-facing views build a projection object. They do not receive the full
  secret state and do not rely on blur or opacity for privacy.

## Pages

The project root contains the static artifact. `assets/` and `.nojekyll` are
committed. The Pages workflow runs the tests, stages the static files in
`public/` and uploads that directory.

## Acceptance

- `node --test js/*.test.mjs` passes.
- Bag → Seat → Secrets → Table → Player → Public works, reload preserves state.
- A 7/10/12-player bag deals, names are entered by players, a full night and day
  resolve, the host records the execution, and the win screen gates the role
  review.
- No console errors, no horizontal overflow at 360 and 1440.
- Public and player views expose no real role, bluffs, notes or effects.

## Reliability and live-play additions

- Screens return a cleanup function from `mount`; the router disposes it before
  navigating, changing locale, or clearing the screen. `unmount` also supports
  cleanup after a partial mount failure.
- `js/ui.js` provides shared escaping and modal focus containment; guidance and
  console overlays live in `js/guidance.js` and `js/table-dialogs.js`.
- `store.run` rolls back rejected or throwing actions and reports `persisted`
  separately from domain success. Save revisions and disk snapshots detect
  conflicts. Public views subscribe to cross-tab save updates.
- `js/writer.js` holds an exclusive Web Lock for host tabs when supported.
  Without Web Locks, disk snapshot checks prevent stale sequential overwrites.
- Public/player transitions cover host routes. Player role lookup occurs only
  for the selected seat; the number-picker projection contains no role details.
  Auto-hide uses a fixed deadline and survives rerendering without extending it.
- Phone console tabs expose one of Play, Players, or Queue & Tools. Instructions
  are collapsible and stored under `pg.guided`. Live controls target 44px minimum.
- The Virgin action records triggering or non-triggering first nominations
  without requiring a vote ledger. A correction can reopen a claimed number.
- Voting requires `ceil(living / 2)` votes plus a sole highest total.
- `manifest.webmanifest`, `js/offline.js` and generated `sw.js` support offline
  loading. `scripts/build-offline.mjs` hashes the complete runtime asset set.
  A fully precached update waits for an explicit **Update** confirmation. Every
  open window must confirm its game is saved first; the waiting worker performs
  that preflight, then an explicit `SKIP_WAITING` message activates it and every
  controlled window reloads exactly once. A window that cannot save aborts
  activation, and a window that still cannot save at `controllerchange` keeps
  its code and shows a recovery message instead of reloading. **Later** keeps
  the current worker. Old caches are pruned only when the new worker activates.
  An installation older than this flow needs one close/reopen to load it.
