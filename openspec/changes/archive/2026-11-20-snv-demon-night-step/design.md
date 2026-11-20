# Design

## What the completion did

`completeSvStep` had no branch for the four Demons. It found the actor,
created the seat's record (`used`) when it was missing, read the actor's
health and fell through every role branch to `{ ok: true }`. The step then
got the shared "step finished" note and log line from `finishStep`. A
drunk or poisoned Demon got the same note: the failure is the outcome's,
which refuses its kill with `error.52`.

The host marks the death on the outcome of the step, `recordSvOutcome`,
which also applies the Fang Gu's jump into the first Outsider it kills and
the poison of the Townsfolk beside a Minion the Vigormortis kills. The
outcome reads nothing the completion writes.

## The timing of each role

All four are `other`. The pinned text of each says "Each night except the
first, wake the Fang Gu" (r2974), the No Dashii (r3158), the Vigormortis
(r3015) and the Vortox (r3017), and the official night sheet lists none of
them on the first night. The legacy field gave each a step on the first
night that no reader asked for: `SV_NIGHT_FIRST` does not name them, so
`buildSvNightQueue` never built it, and `requeueForCharacter` returns before
it for a role without a slot that night. A Snake Charmer who swaps with the
Demon on the first night therefore gets no Demon step that night, before
and after.

## The resolver

The Demon "points at any player"; whether that player dies is the host's
mark on the outcome. The resolver therefore returns `no-effect`, healthy
or impaired, and the coordinator writes nothing. It does not read
`impaired`: the outcome refuses an impaired Demon's kill, as before. This
is the Tinker's shape.

## The dispatch

`completeSvStep` now does what `completeBmrStep` does: when the step's
module owns a resolver for the night, it calls `applyRoleAbility` and
returns. The call comes after the seat's record is created, so the seat
keeps the record it had. It passes the host's character answer, which the
Sects & Violets steps carry for the Philosopher, the Pit-Hag and the
Cerenovus, and ignores the coordinator's outcome as the Bad Moon Rising
completion does: neither an attack nor a redirect can come from a resolver
of this change.

A step built for a Philosopher's borrowed ability names the borrowed role,
so a resolver would run for the Philosopher's seat. No such role has a
resolver yet; the four Demons are not good characters and cannot be
borrowed.

## Retained abilities

ADR 0002 names a retained-ability fact for slice 4. It is not added: no
resolver of this change reads it. A Minion the Vigormortis kills keeps its
ability through `stillWakes`, which the queue builder applies to a step
without an `actor` hook, and through the dead-actor check of the step
completion. Neither changes.

## What does not move

- `sv.ts` names the four in the Demon set that marks an outcome death as a
  Demon's and refuses an impaired Demon's kill; the Fang Gu in its
  once-per-game record and its jump; the No Dashii in its poison; the
  Vigormortis in its poison; the Vortox where Townsfolk information is
  false.
- `death.ts` names the Vortox for its win at dusk.

## The ledger

The four rows declare `capability:night-step` and move from "engine branch"
to "capability + engine reference": the Fang Gu keeps `sv.ts`×5, the No
Dashii `sv.ts`×3, the Vigormortis `sv.ts`×2 and the Vortox `death.ts`×2 and
`sv.ts`×2. The counts become 26 and 40.
