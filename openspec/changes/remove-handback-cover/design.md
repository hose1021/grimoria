# Design

## Context

See `proposal.md` - Why.

- `src/ui/shell.tsx` computes
  `handback = previousPath ∈ {/player, /public} && key ∈ {/bag, /seat, /secrets}`
  and returns `<HandbackCover>` until its `acknowledged` state equals the current
  route key. `acknowledged` resets on every key change.
- `src/ui/components/handback-cover.tsx` renders `playerCover`,
  `playerWarning` and `playerBack`, and is imported only by the shell.
- `playerCover` ("Закройте экран", "Cover the screen", "Ekranı örtün") exists
  only in that component and the three locale catalogs.
- The console gate is a different path: `covered = key === "/table" && previousPath
  private` reaches `TableScreen` and its hide overlay. It does not use
  `HandbackCover`.
- `src/ui/router.ts` keeps `previousPath` on the route snapshot for both gates,
  so the field stays after this change.

## Goals / Non-Goals

**Goals:**

- `/bag`, `/seat` and `/secrets` render on the first frame after `/player` or
  `/public`, with no cover and no extra control.
- Delete the component, the gate branch and the string that only they used.

**Non-Goals:**

- No change to the player screen's back dialog, the role-card note or the number
  picker note, which keep `playerWarning`.
- No change to `/table`'s hide overlay or to its requirement.
- No change to the legacy `translate.ts` mappings left by the earlier cover
  removals.

## Decisions

**Delete the gate instead of gating it behind a preference.** A preference would
add storage, a settings control and a second code path for one screen the owner
called useless. Deletion has no state and no regression surface.

**Drop `acknowledged` with the branch.** The state exists only to remember that
the cover was accepted for the current key; nothing else reads it.

**Remove `playerCover` from all three catalogs.** `t()` falls back to the key
name, so a stale entry would resurface as `playerCover` if a screen used it
again. The catalogs stay in lockstep because `missingTranslations()` derives
from the `en` keys.

**Reuse the existing browser check.** `scripts/browser-check.mjs` already walks
`/player` → `/bag` and clicks `#return-host`; the change replaces the click with
an assertion that the bag renders and no return control exists. That keeps the
regression on the exact route pair the gate served, and the phone walkthrough
drops its conditional `#return-host` click.

## Risks / Trade-offs

- A player holding the device can tap "Настройка" on the empty handoff and reach
  the bag screen directly → `SPEC.md` defines the app as a local aid, not a
  security boundary. If this matters, the fix is to drop that link from the
  empty handoff, not to restore the cover.
- `previousPath` stays on the router for `covered` alone → the `ui-shell`
  requirement for the console overlay documents why the field is needed.
- A deleted import or an unused key can fail `npm run typecheck` or the locale
  parity check → the task list runs both after the deletion.
