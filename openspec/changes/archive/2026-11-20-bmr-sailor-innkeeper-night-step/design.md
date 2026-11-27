# Design

## The removed branches

`completeBmrStep` resolved both roles in place:

1. The Sailor ended every drunk effect it had given, except the Goon's, and
   the Innkeeper ended every protection and every drunk effect it had given,
   except the Goon's. This ran first, also for an impaired owner.
2. An impaired owner got the failure note and nothing else.
3. The Sailor made the host's choice drunk until the next night. The
   Innkeeper made each of its two players safe until dawn, then the host's
   choice drunk until the next night. The Innkeeper's branch ran only with
   two players.

The resolvers return the same effects in the same order, and the engine
writes them with the same ids, keys and flags.

## The timing of each role

- **The Sailor: `any`.** "Each night, choose an alive player"; "Each night,
  wake the Sailor" (r1768). The printed order lists the Sailor on the first
  night and on the other nights.
- **The Innkeeper: `other`.** "Each night\*"; "Each night except the first,
  wake the Innkeeper" (r3160). The printed first-night order does not list
  the Innkeeper.

The test "a night-step arm agrees with the printed night order of its
edition" accepts only these timings. For the first night the legacy field
gave the Innkeeper a step and the arm gives none; as for the Gambler, no
reader asks for it, because the queue builder and `restoreResurrectedSteps`
look a role up only when it is in the order of the night.

## The drunk answer is a fact

Who is drunk is the Storyteller's choice: "Either the Sailor or this chosen
player becomes drunk" (r1768), "One of the chosen players becomes drunk"
(r3160). It reaches the resolver as `drunkId`, a host answer beside the
Courtier's character, and the role cannot write it. The check that the
answer names the Sailor or a chosen player, and that a working owner gives
one, stays in `night.ts`: it rejects a command before anything is written,
like the other command checks.

## Two kinds of dated effect

`drunk` is stored as the drunk effect the engine already reads. `safe` is a
player who cannot die tonight from any ability. It is not `protected`, which
is the Monk's safety from the Demon only. The death path already tells the
two apart by a marker on the Innkeeper's protection, so `safe` is stored as
that protection. The marker and its reader are one constant in
`effects.ts`, and a role cannot write a marker of its own.

## Ending last night's choice

The removed branches ended the earlier effects before they read the owner's
health. Two forms were possible.

- **An intent**, returned with the decision. The resolver reads `impaired`
  before any intent is applied, so the order would change. On the
  `suppressed` path the engine also ends nothing, by the rule of the Butler's
  change: a failed ability must not end another ability's effect. An ending
  intent would have to be the one exception.
- **A declaration of the arm.** `endsOnUse` names the kinds each use
  replaces. The engine ends the effects of those kinds that the ability gave
  before it builds the context, so the order is the order of the removed
  branches, and the `suppressed` path keeps its rule.

The declaration is used. In a game the order changes no outcome: the
effects of one use expire at the next dusk or dawn, before the next use, so
ending them only clears the stored flag. The order is still the contract,
and an engine test pins it with an effect that is still working. An arm that
attacks does not declare `endsOnUse`, because an attack may wait for the
Mayor's redirect before anything is written.

## The Goon

The Goon makes its first chooser drunk before the chooser's ability
resolves, and that effect names the chooser as its source (Goon r2977). The
removed branches kept it. `givenBy` in `effects.ts` is now the one rule for
"this ability gave the effect", used by `endsOnUse` and by
`replacesPrevious`. For the kinds `replacesPrevious` already used (poison,
protection and the Butler's master) no Goon effect matches, so the Monk,
the Poisoner and the Butler are unchanged.

## One difference no command reaches

The Innkeeper's branch did nothing unless the step had two players. The
resolver keeps that guard, but the arm's ending runs before the resolver.
A completion with another number of players is rejected before the step
resolves (`error.39`: the Innkeeper's step takes exactly two), so no command
reaches the difference.

## What does not move

- `night.ts` names both roles in the check of the drunk answer.
- `effects.ts` names the Sailor for "You can't die" and the Innkeeper for
  the marker of its protection; both are read by the death path.
- `bmr.ts` names the Sailor among the roles that must choose a living
  player, and the Goon's trigger still runs before the step resolves.
- The table names both roles for the drunk picker.

## The ledger

Both rows declare `capability:night-step` and move from "engine branch" to
"capability + engine reference": the Sailor keeps `effects.ts`×1 and
`night.ts`×3, the Innkeeper `effects.ts`×2 and `night.ts`×1. The counts
become 17 and 49. The Goon gains `effects.ts`×1 for `givenBy` and loses two
of its `bmr.ts` references; the Drunk's count in `bmr.ts` drops from 6 to 2,
because the removed branches wrote "drunk" effects by name.
