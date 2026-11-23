# Al vs Al readiness

Status: **not implemented**; separate scope under [issue #481](https://github.com/hose1021/grimoria/issues/481).
No Al vs Al character is added by #475 or PR #480.

## Verified roster and sources

The readiness gap in the previous version of this note is closed. The script is
**AL VS AL 2.3 by Ekin** on the Ravenswood Archive:
<https://ravenswoodarchive.com/scripts/0f5b95a3-5140-48c2-bd77-6d2c5a7ef44f>.

The archive lists 24 characters. Fourteen are already supported:
`librarian`, `investigator`, `chef`, `empath`, `dreamer`, `savant`, `seamstress`,
`sweetheart`, `barber`, `recluse`, `drunk`, `poisoner`, `spy`, `baron`.

The ten new characters are official *carousel* characters in
`docs/official/roles.json`. Each has a wiki page; the revision below is the
current page revision checked on 2026-11-23 through the MediaWiki API. They are
**proposals** until the owner approves and `docs/official/manifest.json` is
extended. No existing pin is changed.

| Character | Team | Setup | Ability | Wiki pin |
| --- | --- | --- | --- | ---: |
| Bounty Hunter | Townsfolk | yes | You start knowing 1 evil player. If the player you know dies, you learn another evil player tonight. [1 Townsfolk is evil] | r3396 |
| General | Townsfolk | no | Each night, you learn which alignment the Storyteller believes is winning: good, evil, or neither. | r3417 |
| Balloonist | Townsfolk | yes | Each night, you learn a player of a different character type than last night. [+0 or +1 Outsider] | r3392 |
| Alsaahir | Townsfolk | no | Each day, if you publicly guess which players are Minion(s) and which are Demon(s), good wins. | r3386 |
| Fisherman | Townsfolk | no | Once per game, during the day, visit the Storyteller for some advice to help your team win. | r3414 |
| Banshee | Townsfolk | no | If the Demon kills you, all players learn this. From now on, you may nominate twice per day and vote twice per nomination. | r3395 |
| Plague Doctor | Outsider | no | When you die, the Storyteller gains a Minion ability. | r3455 |
| Harpy | Minion | no | Each night, choose 2 players: tomorrow, the 1st player is mad that the 2nd is evil, or one or both might die. | r3471 |
| Marionette | Minion | yes | You think you are a good character, but you are not. The Demon knows who you are. [You neighbor the Demon] | r3474 |
| Al-Hadikhia | Demon | no | Each night*, you may choose 3 players (all players learn who): each silently chooses to live or die, but if all live, all die. | r3492 |

Cross-check: the official `roles.json` text matches the wiki Summary for all
ten, and the archive roster matches the official character ids. This is a
roster/source verification, not a certification of any mechanic.

## What the engine already provides

- `ScriptDefinition` and the compatibility verdict: a script is data, not an
  engine selector.
- The typed `RoleModule` registry and `night-step`, `information`,
  `transformation`, `adjudication`, `day-action` and `death-trigger`
  capabilities.
- Mixed-edition composition through `buildMixedNightQueue` and
  `appendConditionalSteps`; no scenario-specific builder.
- The source-versioned `interactions` registry with `verified`,
  `requires-storyteller-choice` and `unsupported` verdicts.
- One command pipeline, effect graph, journal and `pg.game.v4` state.

A supported character that needs no new mechanic should require only a role
module, capabilities and tests. A genuinely new mechanic may require a new
shared capability, not a new engine.

## Work required

The full character-by-character scope, owner decisions and acceptance are in
[issue #481](https://github.com/hose1021/grimoria/issues/481). In short:

1. **Setup and script definition.** The 24-role pool, the Bounty Hunter's evil
   Townsfolk, the Balloonist's +0/+1 Outsider choice and the Marionette's
   Demon-neighbour placement.
2. **Role modules and capabilities.** One module per new character; reuse the
   existing typed capabilities, and add a new capability only with its own
   design decision.
3. **Mechanics that need a decision.** Al-Hadikhia's sequential public
   announcement of each chosen player, the individual silent live/die
   responses (not public), the dawn report of all three outcomes, and
   resurrection; Banshee's public death and double vote, Plague Doctor's
   Storyteller Minion ability, Harpy's madness and conditional death,
   Marionette's fake good ability, Alsaahir's day win, Fisherman's advice,
   General's host judgment, Bounty Hunter's chained information and Balloonist's
   character-type sequence.
4. **Interactions.** Register every official pair as behavior with a pinned
   source and a test; a pair without behavior stays `unsupported`.
5. **UI and privacy.** All host choices in `/table` and the private flows at
   360–390 px in RU/EN/AZ; the Marionette and Plague Doctor facts, and the
   Al-Hadikhia individual responses, stay out of public and player projections.
   The Al-Hadikhia chosen players and the dawn life states are public.
6. **Evidence.** Per character and per interaction: source → spec → failing
   regression → implementation → passing regression, then full verify, strict
   OpenSpec, gates, mutation, scenarios and Playwright on the exact head.

## Remaining unsupported mechanics

- All ten Al vs Al characters and every pair involving them: not in
  `SUPPORTED_ROLES`.
- Any character outside `SUPPORTED_ROLES`, including Travellers, Fabled and
  Loric.
- Any registered pair without a behavior test remains `unsupported`; the whole
  pool then stays manual-only.
- The 13 engine-branch roles in `docs/audits/211-remaining-adapters.md` are
  documented #211 exceptions, not unsupported gameplay.
