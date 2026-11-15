# Design

## Context

See proposal.md. The first-night Lunatic step had `targetMode: "none"` and the
card filled its Minion section from the real Minion roles. The official text
says the Storyteller points at a number of players equaling the Minions in play
and that those players may be any players. The card is a privacy surface shown
to the Lunatic, so it must not name the real Demon's player.

## Goals / Non-Goals

**Goals:**

- Let the Storyteller choose the Minion players without inventing a choice.
- Keep the Lunatic card structurally identical to the Demon card.
- Keep the first-night picks out of the Demon's attack report.

**Non-Goals:**

- A new saved field or schema version: the existing step targets and the step
  draft already persist the picks.
- Changing later Lunatic nights: they still attack as the shown Demon and are
  reported to the Demon.
- Changing the Demon card or the real Minion list.

## Decisions

- **The picks are the step targets.** The first-night Lunatic step uses
  `targetMode: "one-any"` with `minTargets = maxTargets = Minions in play`. The
  ring already selects targets, the dock already blocks an incomplete step and
  the step draft already restores a reload. A new field would duplicate that
  machinery.
- **Guard the report.** `used.lunaticTarget` and `reportLunaticChoice` run only
  after night 1. First-night targets are information for the Lunatic, not an
  attack, and the Demon already learns the Lunatic from the Demon info step.
- **No automatic fallback.** The card renders the live draft, then the
  completed step targets. It never falls back to the real Minions, so the app
  does not show a choice the host did not make.
- **Split the guidance by the first-night note key.** `note.bmr.lunaticFirst`
  selects the picker copy; later nights keep the attack copy.

## Risks / Trade-offs

- The host must pick N players before confirming the step. A skipped step
  records no tips; this is the host's explicit choice.
- A legacy save with a completed first-night Lunatic step has no picks. The
  card is only shown for the current step, so it cannot display stale data.
- The sampled acceptance game changes its random path because the step now
  consumes a target candidate. The test accepts the legal `mastermind` finale
  as well.
