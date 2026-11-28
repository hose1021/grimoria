# Proposal

Issue: #17

## Why

The Random tab on the Setup screen only offered a "random legal bag" button.
The host could not see which roles came up without switching to the manual
grid, and could not replace one unwanted role without rerolling everything or
editing the bag by hand into an illegal state. In the role grid a picked role
was marked only by a small checkmark, so the bag was hard to read at a glance.

## What Changes

- The Random tab lists the rolled roles grouped by type, with their ability
  text. Selecting a role opens a list of legal replacements: roles of the same
  type from the script that keep the setup-sheet composition. The host can pick
  one, reroll that role, or reroll the whole bag.
- A swap keeps every other setup choice that is still legal and repairs only
  what broke: Demon bluffs that became in-play are refilled, a Drunk mask that
  became in-play is redrawn, the Lunatic's automatic mask follows the Demon,
  and the Evil Twin's good twin follows the swapped role.
- Picked cards in the role grid wear their team: a thick team-coloured spine, a
  team-tinted fill, a ringed icon and a check in the team colour.
- Team names on the Setup screen come from the UI catalog, so AZ and EN no
  longer show Russian team names.

## Impact

- `src/core/model/rules.ts`: `swapCandidates`, `swapBagRole`.
- `src/ui/screens/bag.tsx`, the three UI locales.
- No schema, storage or command contract change. A swap is an ordinary
  `bagUpdate`; the bag validator still gates the deal.
