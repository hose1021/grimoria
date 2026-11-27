# Design

## Context

See `proposal.md` — Why.

The update path is one page module and one generated worker:

- `src/entry/offline.ts` registers `sw.js`, watches `updatefound`, offers a
  banner, and on Apply runs `saveIfNeeded`, a `PREPARE_UPDATE` preflight over the
  other windows, then `SKIP_WAITING`; `controllerchange` saves again and reloads.
- `scripts/build-offline.mjs` emits `sw.js` from the built `dist/`: it hashes the
  script and every file into a cache name, precaches the list with `addAll`,
  prunes older `pg-static-` caches on activation, and answers `PREPARE_UPDATE` by
  fanning out to every other window.

Measured state of the built artifact: 15 MB precached — 8.0 MB of role art,
5.7 MB of locale catalogs, 0.8 MB of fonts, 0.8 MB of code. The catalog loader
maps three files (`ru_RU`, `en_GB`, `az_AZ`); the other 24 catalogs in
`public/assets/data` are copied into `dist/` and can never be requested.

The current-step draft (targets, registrations, given answers) is persisted in
`pg.stepDraft` on every edit and restored on mount, so a reload mid-night loses
no step input. The game is written on every dispatch. A reload therefore costs
overlays, the day timer and an open player handoff, not game data.

## Goals / Non-Goals

**Goals:**

- A page opened after a deploy runs the new version without user action.
- The opening update starts installing within the first second of the page.
- No save condition can stop an update from landing.
- The install transfer shrinks by the catalogs the loader cannot reach.

**Non-Goals:**

- Trimming role art, moving art to a runtime cache, or a second media cache
  generation. The full art set stays precached.
- Tolerating a partial precache. A broken deploy must not replace a working one.
- Any change to game rules, state schema, storage keys or routes.
- Changing the prompt for updates found after the opening check.

## Decisions

**Check with `registration.update()` at registration, not with the interval.**
The throttle currently starts at boot (`lastCheck = Date.now()`), so the first
own check waits 30 minutes. The fix calls `reg.update()` once right after
`register()` resolves and lets the throttle govern only later checks.
Alternative considered: rely on `register()` to run an update check by itself.
Rejected — the registration algorithm does not guarantee a check for an existing
registration, and browsers cap their own navigations checks at 24 hours.

**Auto-apply only the worker installed by the opening check.** The worker that
`updatefound` reports while the opening check is in flight is auto-applied; a
worker found later keeps the prompt. A worker already waiting when the page
opens is treated the same way as an opening install, because the page is fresh.
The distinction is the worker object, not a timer, so a slow install that lands
after the host starts playing is still auto-applied — the opening check owns it.

**Best-effort save, never a veto.** `saveIfNeeded()` stays as the last attempt to
write the game, and its result is ignored. `PREPARE_UPDATE`, its reply channel,
the per-window answer, and the phases `failed`, `peerFailed`, `unconfirmed` and
`reloadBlocked` go away. `activateFailed` stays: a worker that never activates
still needs a message and a retry. Alternative considered: keep the preflight for
the prompted path and drop it only for the opening path. Rejected — the prompt
would still refuse to update mid-game, which is the complaint.

**Keep `addAll` atomic.** One failed asset must fail the install, so the old
cached version keeps serving. Alternative considered: cache assets one by one and
activate with whatever arrived. Rejected — that ships a version with holes.

**One locale map, imported by both sides.** `FILES` moves from
`src/infrastructure/catalog/role-catalog.ts` into a data-only module
(`src/infrastructure/catalog/locale-files.ts`) that the loader and
`scripts/build-offline.mjs` both import; the generator skips `assets/data/*.js`
entries outside that map. Node strips the types on import (`node:` 24 in CI, 26
locally). Alternative considered: hardcode the three names in the generator —
rejected, the two lists drift. Alternative considered: delete the 24 unreachable
catalogs from `public/` — rejected as unrelated removal; they stay in `dist/`
and stay fetchable, just not precached.

**Keep one transitional `PREPARE_UPDATE` responder in the worker.** A page still
running the previous page code cannot activate the new worker unless the new
worker answers its preflight. The generated worker therefore replies
`{ ok: true }` to `PREPARE_UPDATE` without fanning out. Remove the responder in a
later release, once no client predates this change.

## Risks / Trade-offs

- A reload lands while a player holds the phone in the handoff card → the card
  closes and the seat picker returns. Mitigation: only the opening install and a
  worker already waiting at open auto-apply; a worker found mid-session prompts.
- Two windows both auto-apply → each saves best-effort and reloads once. No
  coordination is needed, but a window whose write fails loses its in-memory
  game. Mitigation: the game is written on every dispatch, so the exposure is one
  failed write; the storage warning already tells the host to export.
- The first rollout reaches old clients only through the old code: their first
  own check is 30 minutes after open. Mitigation: the transitional responder, plus
  the existing fallback of closing every window, which activates a waiting worker.
- The generator imports TypeScript from a Node script. Mitigation: the module is
  data-only and erasable; `npm run offline` in CI proves it on every merge.
- Cache names change with the asset list, so every client downloads the app again
  once. Unavoidable and paid once.

## Migration Plan

1. Merge; Pages publishes the new artifact and worker.
2. A client on the previous page code finds the new worker on its own check, taps
   Apply, the new worker answers the preflight, and the window reloads once into
   the new page code.
3. A client on the new page code updates on open from then on.
4. Rollback: revert the PR. Page code and worker are deployed together, and the
   old worker protocol is a superset of the new one during the transition.

## Open Questions

None.
