# The table asks the host's questions instead of answering or hiding them

Issue: #200

## Why

Three host prompts on the table were wrong. Each was found while the Trouble
Brewing roles moved to their modules (PRs #6 and #9) and kept for its own fix,
because a move changes no behavior. The owner asked for the fix.

1. **The Mayor redirect was answered for the host.** Tapping the Mayor's seat
   as the Demon's target stored "the Mayor dies", so the step could be
   confirmed without the host ever choosing. Mayor r2995 leaves the choice to
   the Storyteller ("another player might die instead"), `AGENTS.md` forbids
   auto-filling the Mayor redirect, and `app/ui-shell` "Matching control
   state" already requires the select to stay unanswered and the step blocked
   until the host picks.
2. **The Demon's heir hid behind the next step.** After an Imp self-kill with
   several Minions alive, the dock and the centre of the table showed the
   next step (the Empath's, in the game where it was found), with its
   complete and skip buttons. The heir question appeared only inside the step
   sheet, above that step's skip and confirm, which completed it before the
   heir was named. Imp r3116 has
   the Storyteller choose the Minion first; `AGENTS.md` forbids auto-filling
   the Demon heir.
3. **A registration was labelled false information.** For a healthy Chef
   beside a Spy, the host picks the count among the registrations (Chef r2510,
   Example 4), and the journal records a registration. The select was
   labelled "False information", because only character answers got the
   registration label.

## What changes

- A seat tap no longer answers the Mayor redirect. A new victim still resets
  it, now to unanswered.
- While the heir is owed, the dock and the centre of the table name the
  question, the dock offers the Minions, and nothing on the table controls a
  later step. The step sheet shows only the question.
- The label of a host-chosen information answer follows its reason: false
  information for an impaired actor or a Vortox, the Storyteller's answer for
  a missing data source, and a registration otherwise (`givenLabelKey`).

## What stays

- **The engine.** No command, payload, ruleset version or stored state
  changes. The table sends the same `completeNightStep` and `chooseDemonHeir`
  commands.
- **The Mayor's choices.** The select still offers "the Mayor dies" and every
  other player, with the dead and protected ones marked.
- **The other labels.** A character answer of a healthy Undertaker or
  Ravenkeeper stays a registration; an impaired actor's answer stays false
  information; a missing day stays the Storyteller's answer.

## Impact

UI only. A host who confirmed the Mayor's step without choosing now has to
pick the Mayor's fate first, and a host can no longer reach the next step
before naming the heir from the table.
