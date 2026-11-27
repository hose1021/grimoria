# Design

## The removed branches

`completeBmrStep` resolved the three roles in place. Their deaths were never
there: the host marks them on the outcome of the step, and
`recordBmrOutcome` checks and applies them.

- **The Po** wrote `used.poNoOne`: true when the step named no player, false
  otherwise. It did so before any other check, so also for a drunk or
  poisoned Po and for a Po who chose the Goon.
- **The Shabaloth**, when the step named players and the Shabaloth was
  sober and healthy, moved its record aside and wrote the new one, in this
  order: `shabalothPreviousTargets` (a copy of the record it replaced, or no
  players), `shabalothPreviousNight` (the night of that record, unset on
  the first use), `shabalothTargets` (at most two players, in the host's
  order) and `shabalothTargetsNight`. A drunk or poisoned Shabaloth, the
  Goon's chooser included, wrote nothing.
- **The Tinker** did nothing.

None of them wrote a note, an effect or a log line, or drew from the command
ports. The step then got the shared "step finished" note and log line, as
before. The resolvers return intents that write the same records in the
same key order.

## The timing of each role

All three are `other`. The printed first-night order lists none of them:
"Each night except the first, wake the Po" (r3104), "Each night except the
first, wake the Shabaloth" (r1790), and the Tinker is on the order of the
other nights only. As for the Gambler, the Innkeeper and the Exorcist, the
legacy field gave each a first-night step that no reader asked for: the
first-night sequence does not name them, and the Lunatic reads its Demon's
step only on the other nights.

## The Po's record

"If your last choice was no-one, choose 3 players tonight" is about the
choice, not about whether the ability worked: "If the Po was drunk or
poisoned when they chose nobody last night, they still choose three players
tonight" (r3104). `record-no-one` says whether the acting seat chose no one,
and the engine writes it as `<role>NoOne` on that seat, the record the step
builder reads to size the next step. The Po returns it on the `effects`
path whether or not it is impaired: its completion has no other effect, its
kills are the host's marks, which the outcome checks against its health,
and the removed branch wrote no failure note. A Po kept asleep by the
Exorcist does not complete its step, so its record stays, as r3104 asks:
the Exorcist's night "does not count as a night where the Po chose no one".

The Lunatic who was shown the Po keeps its own branch: it writes the same
record, under the Po's name, and waits for a wake contract with the
Lunatic's other hooks.

## The Shabaloth's record

"A dead player you chose last night might be regurgitated" needs the
players chosen last night. `record-choices` names the players chosen
tonight. The engine keeps the record it replaces as last night's, then
writes tonight's, under the acting role on the acting seat, so a role
cannot write another role's record, another seat's, or last night's. The
key order is the removed branch's, and the first use writes the unset night
of the record before it, because a saved game keeps the order in which keys
were written. The engine stores a copy of the players.

The Shabaloth returns the intent only when it is sober and healthy and the
step names players, and `no-effect` otherwise, as the removed branch did.
The pinned text does not say whether a choice made while impaired may be
regurgitated; this change keeps the behavior and does not decide it.

`recordBmrOutcome` still writes the Shabaloth's current record after the
host marks a death or a regurgitation, and reads the previous one for the
regurgitation. That is the outcome, not the completion, and stays.

## The Tinker

"At any time, you may decide that the Tinker dies" (r1782): the Tinker
chooses nothing, so its resolver returns `no-effect`. The step stays in the
queue as the host's reminder, with `canKill` for the outcome, and the
death is marked there as before. `recordBmrOutcome` still names the Tinker
where it exempts the step from the rule that a death must be one of the
chosen players, and `day.ts` names it for the death during the day.

The two paths disagree on a drunk or poisoned Tinker: the `tinkerDeath`
command refuses its death, while the outcome lets the host mark it, and
also lets the host mark the death of a player other than the Tinker on the
Tinker's step. This change moves neither path and keeps both as they are.

## What does not move

- `bmr.ts` names the Po and the Shabaloth in the Demon set, the Po where
  the step builder sizes its step and where the Lunatic is shown the Po,
  and the Shabaloth where a Demon kept asleep keeps its regurgitation and
  where the outcome checks and applies it.
- `bmr.ts` names the Tinker in the outcome, and `day.ts` in the
  `tinkerDeath` command.

## The ledger

The three rows declare `capability:night-step` and move from "engine
branch" to "capability + engine reference": the Tinker keeps `day.ts`×2 and
`bmr.ts`×1, the Po and the Shabaloth `bmr.ts`×6 each. The counts become 22
and 44.
