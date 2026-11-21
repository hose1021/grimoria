# Changelog

All notable changes to Grimoria are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Correct the Evil Twin's two-alive evil win, the Barber swap without a living Demon, duplicate No Dashii effect records, the Mastermind's no-execution reason, and the 5–6 player Lunatic bluffs; close the Po and Shabaloth multi-kill evidence gaps (#200)

### Added

- Add a table redo control beside Undo, with journal replay and persistence (#200)

### Changed

- Remove the Bad Moon Rising and Sects & Violets beta labels after independent certification found no remaining mechanical gaps (#200)
- On a phone, show the scenario picker and the composition summary directly after the player count on `/bag`, before the pickers and the bluffs (#467)

## [0.7.0] - 2026-11-21

### Fixed

- Make an executed evil-aligned Saint win for good, as Saint r3119 requires, while a good Saint still loses for good (#200)
- Let the Pit-Hag create the Philosopher's chosen absent character, make the new holder drunk, and reconcile the drunk after a Fang Gu jump or a manual role correction (#200)
- Reveal the Goon's new alignment on the player handoff: `shownAlignment` is populated only for the Goon, the role card shows good or evil after the turn, and the Lunatic and every other masked role stay hidden (#200)
- Close the Trouble Brewing, Bad Moon Rising and Sects & Violets mechanical gaps with named regression tests, including the evil-Saint, Philosopher, Goon, Courtier, Gambler, Mastermind, No Dashii, Sweetheart and Witch branches (#200)

### Added

- Add an engine-derived Storyteller reference at `/reference` and `/reference/:roleId`: all 72 supported characters, the engine's rule decisions, the host's decisions, verified scenarios, official interactions and a complete Russian translation (#396)
- Type the Dreamer pair and the Evil Twin introduction as information capabilities; the stored records preserve the legacy journal, replay, undo/redo and privacy gates (#211)
- Add an independent source-derived cross-role oracle with 13 scenarios covering Mayor, Spy/Recluse registration, Pukka order, Zombuul, Mastermind, Pit-Hag, Barber, Snake Charmer and Vortox (#220)
- Record every uncovered official rule in TB/BMR/S&V/shared exception registers, generate the per-script readiness matrix and map the covered rules to their asserting tests (#221, #332)

### Changed

- Accept `release-x.y.z` branches in the Git conventions check, so the release branch no longer needs a `chore/` name (#464)

## [0.6.0] - 2026-11-20

### Fixed

- Make the console step action honest and block it while the step has unresolved blockers, and require confirmation before an execution (#311)
- Clear stale step and day drafts when the target, step or day changes, so a previous answer or execution target cannot leak into the next one (#322)
- Let a character created mid-game start knowing at that point: a Pit-Hag-created Clockmaker or a Barber swap onto a start-knowing character wakes immediately, a dead created character does not, and a living Vortox falsifies the answer (#314)
- Refuse the same seat twice in every multi-target night step: Innkeeper, Shabaloth, Po, Barber, Fortune Teller and Chambermaid (#316)
- Use a borrowed day ability for the Philosopher: the Slayer shoots, the Tinker dies and the Virgin triggers, while a Drunk's shown ability stays inert (#320)
- Give the Klutz death choice a day control, reachable after the execution ended the day (#319)
- Derive the Pacifist survival control from the engine rule and clear it when the target or the day changes (#317)
- Offer shown-role and effect corrections, with the reason in the journal (#325)
- Show a seat that is drunk and poisoned as both, and delete the duplicate public projections and the unreachable hidden card mode (#331)
- Make the `/secrets` tick and role options agree with the engine's secrets errors (#324)
- Commit the host notes after a pause, on blur and on unmount, instead of once per character (#330)
- Match the dead-execution requirement to States r1039: a dead target is executed and the day's execution is spent (#327)
- Treat a Pukka self-target as a host-adjudicated default and record a different reading through the correction dialog (#200)
- Let the Storyteller choose which living Demon makes the Barber swap, while still rejecting a swap between two Demons (#219)
- Judge the Moonchild's impairment at the night resolution, so a choice made while poisoned still kills when the Moonchild is sober and healthy at night, and a Pukka's night poison stops a sober choice (#218)
- Reveal a daytime Scarlet Woman succession before the new Demon's Imp step, so the new Demon acts that night; a night self-kill still wakes the heir after its spent action (#217)
- End a dead source's persistent drunk effect when its ability created it before the death; keep the Sweetheart's on-death drunk and the Goon's permanent drunk (#218)
- Let an impaired Librarian give the zero as false information, and ask for setup when a prepared pair relies on an impaired Spy or Recluse registration (#217)
- Suspend the Cerenovus's madness while its source is drunk or poisoned, end it when the source dies, and resume it when the source is healthy; a Vigormortis-retained Cerenovus keeps it (#219)
- Record a Vortox's mandatory false answer as false information in the Storyteller journal instead of a Spy or Recluse registration ambiguity (#220)

### Added

- Verify every supported role's ability in the ru, en and az catalogs and the audited mechanical terms, and correct the Russian Juggler and Tinker wording (#326, #332)
- Close the verification register: every UI contract has gate-covered evidence, the queue panel and the Klutz control are tested, and the findings gate is green (#332)
- Add the storefront welcome page at `/`: one yellow action, the first night as a shelf of real role tapes with one struck victim, the three scripts as staff picks, the offline and no-account facts, and a membership card; the page never changes the saved game (#384)
- Add a visible close control to the night step sheet and the heir sheet, so the sheet no longer depends on Escape or the backdrop (#384)

### Changed

- Run CI and the documented verification commands on Node.js 26 LTS (#349)
- Replace the Arcane Instrument system with the store system: tube black, bone print, one rental-yellow action, rent red, signal blue, cream labels, hazard strips, self-hosted Oswald, Golos Text and PT Mono, and one shelf entrance (#384)
- Move the app bar's inline navigation breakpoint from 1440 to 1200 CSS pixels and add the Home tab (#384)

### Removed

- Remove the `/public` screen and its navigation link; `/public` now falls back to `/table`, and the `publicGameView` projection and its privacy tests stay (#384)

## [0.5.0] - 2026-11-20

### Fixed

- Fix the seat circle once the game starts: `setOrder` is rejected during a day or night and `/seat` renders a locked state, so a mid-game reorder cannot silently change Empath, Chef, Tea Lady, No Dashii and Clockmaker neighbours and distances; journals recorded before the new ruleset still replay and undo their recorded order (#328)
- Keep the poisoned Washerwoman's role, two players and wording in one draft, so the card previews and the command records the same answer and the journal names the character instead of the player ids (#217)
- Restore the two-neighbour count in the Russian Empath ability, so the card states the pinned rule (#326)
- Refuse a skip of a living actor's mandatory night step, so the Imp's attack, the Exorcist's choice and the Pukka's poison cannot disappear; keep the optional, system and dead-actor skips, hide the console's Skip control where the engine refuses it, and record the Po's "no one" through its normal confirmation so the next night takes three targets (#318)
- Record the apparent Slayer shot of a Drunk shown the Slayer without killing the target (#315)
- Offer only registered-living players in the Virgin nomination picker, so a registered-dead Zombuul cannot be nominated through the UI either (#313)

### Added

- Mark Bad Moon Rising and Sects and Violets as beta beside the script name in the setup picker, because their printed abilities need more Storyteller adjudication than Trouble Brewing (#341)
- Make the verification gate reject evidence that cannot prove itself: skipped or commented-out tests, comment-only UI dispatch sites, a verified rule with no explicit official mapping, a removed test identity, and a duplicate rule identifier (#332)
- Add an independent audit of the gate, its own scanner and coverage-pin tests, explicit evidence rules for atomic and skipped citations, a verification-downgrade guard, and nine mutation probes with a green baseline (#332)
- Add permanent semantic verification gates: a committed Official Rule to Engine Test to UI Contract to UI Test trace, architecture and action-scope checks, selector/model tests, a test-identity manifest, a red known-findings suite and a separate verification workflow (#332)
- Count a registered-dead Zombuul as dead in the day path: it cannot nominate and its first vote spends the vote token (#313)

- Record the Dreamer's and the Sage's shown pair as checked, secret Storyteller choices: the engine offers only the pinned legal pairs, a Vortox forbids the true answer, and the pair survives save, reload, replay and undo without reaching the public view (#216)
- Keep 0.4.1 journals with free-text Dreamer and Sage answers replayable under the new ruleset, and record the attacking Demon on a death so the Sage's pair names the killer, not the current Demon holder (#216)
- Write a secret Pacifist-survival choice line, and render the host-choice journal titles and role pairs in Russian, English and Azerbaijani (#216)

## [0.4.1] - 2026-11-18

### Added

- Add an independent 22-role Trouble Brewing rules audit with 59 rule-derived regression tests and an evidence report (#217)

### Changed

- Pin the Dreamer and Sage host answers as information-only: a legal answer changes no seat, effect, death or winner, stays out of the public view, and survives export and import (#216)
- Correct the rules matrix: Pacifist survival and Tinker death have asserted state models (the execution `survives` flag and a real ability death), so the stale "no state model" claim is gone and the transition table names their tests (#221)
- Document that the export is the host's complete private backup and not a shareable redacted file: it keeps the host and player notes and the journal payloads, and the compact applied-command identities sanitize nothing; a regression test proves the round trip and the public projection (#222)

### Fixed

- Offer the Pit-Hag's arbitrary deaths only after the chosen character creates a Demon, and reject a marked death on a step whose ability allows none; a command recorded under an earlier ruleset keeps the deaths it marked (Pit-Hag r2998, #219)

## [0.4.0] - 2026-11-18

### Changed

- Replace the table setup card with a roster board on the setup stage: a four-step rail derived from the saved state, one chip per seat with its number and claimed or unclaimed name, one primary action per step, and the manual-script warning, the secrets error list and the first-night caution kept with the board (#291)

### Fixed

- Make a replacement persistence failure atomic: `reset`, `replaceState` and `importGame` no longer publish a state they could not save, and every accepted record-only command stays idempotent after journal coalescing, undo, redo and reload (#213)

## [0.3.0] - 2026-11-18

### Changed

- Give the seat screen the table composition — the app bar, a scrollable stage, the measured stadium rail and a fixed action dock — with round medallions that carry the player initial, the seat number from 620 px and the table label-side rule, and share the measured surface between `/table` and `/seat` through `useTableLayout` and `TableFelt` (#282)
- Re-compose `/secrets` as a setup checksheet: an obligations index with one open obligation and a pinned footer, each one-of-two answer read as the spoken sentence, and the Drunk mask and Librarian zero kept, with the strings in `ru`, `en` and `az` (#284)
- Rebuild the setup screen around a commit dock that carries the team counts, the bluff count, the legality list and the deal button; the three suggested bags share one team-row grid, the forced secrets move under the bench, and the bag in play carries a tag, with commands, projections, validators, routes and browser-check selectors unchanged (#289)

### Fixed

- Group the seven app bar destinations into three labelled groups on one row from 1440 px and inside the compact burger panel below it, mark the current destination with a 2 px accent rule instead of a boxed chip, and attach the panel to its trigger (#287)

## [0.2.0] - 2026-11-18

### Added

- Add one lifecycle policy that declares every command's allowed phase and one guard helper for the documented transition owners; a wrong-phase command is rejected atomically, so a stale tab can no longer rebuild the day, re-deal a running game or leave the documented path (#215)
- Reject `manualOnly: true` on a single-edition custom script at import and migrate a legacy saved flag to the automatic engine on load, since manual mode is reserved for a pool that mixes editions (#215)
- Prove the coordinator order for protection, death, execution, transformation and win with a source-backed cross-role acceptance suite, and add an executable ownership check that only the coordinator modules call the shared death, execution, transformation, effect and win writers (#212)

### Changed

- Make the table one measured stadium: two straight sides and two semicircular caps carry the rail, the felt surface and every seat centre; seats sit at equal arc distance for five to fifteen players, labels stay inside the box, and the table reads vertical on a phone and horizontal on a desktop (#266)
- Apply the obsidian and antique gold palette to the shared token layer so every route reads it, restyle the seats as identity blocks and the dock as a fixed action dock, and apply the shared component standard to the setup and secrets screens (#266)
- Move the night steps of the Sailor, Innkeeper, Devil's Advocate, Exorcist, Tinker, Po and Shabaloth from the engine into their role capabilities, with behavior pinned by tests before each move; the night-step contract gains the `endsOnUse` and `givenBy` arm fields, the `drunk`, `safe` and `survives-execution` timed effects, and the `record-choice`, `record-choices`, `record-no-one` and `block-demon` intents (#200)
- Move the night steps of the four Sects & Violets Demons (Fang Gu, No Dashii, Vigormortis and Vortox) from legacy fields to their role capabilities, with behavior pinned by tests before the move; the Sects & Violets step completion now hands a role that owns a resolver to the shared capability coordinator, as the Bad Moon Rising one does (#200)
- Move the Cerenovus's night step to its role capability, with behavior pinned by tests before the move; the night-step contract gains the `madness` intent, which writes the madness token with the id saved games already hold (#200)
- Declare the night steps of the Sects & Violets Clockmaker, Dreamer, Evil Twin, Flowergirl, Mathematician, Oracle and Town Crier on their role capabilities, with behavior pinned by tests before the move; their answers stay in the engine until the information slice (#200)
- Move the Snake Charmer's swap to its transformation capability and declare the Snake Charmer's and the Pit-Hag's night steps on their capabilities, with behavior pinned by tests before the move; the transformation contract gains the `swap` decision (#200)

### Fixed

- Wake a new Demon once, the night it takes the role: a named heir is woken right after the host's choice, and the next night no longer repeats the YOU ARE wake; saved games keep the wakes they recorded (#200)
- Let a Pukka poisoned by its own poison choose a sober Goon: the Pukka is drunk until dusk and the Goon turns evil, where the choice was refused as an effect cycle (#200)
- Ask the host for the Mayor's fate: choosing the Mayor as the Demon's target from a seat leaves the redirect unanswered and the step blocked, where the tap answered "the Mayor dies" (#200)
- Ask for the Demon's heir first: after an Imp self-kill with several Minions alive, the dock and the centre of the table name the heir question and offer the Minions, and no control of the next step is shown until the host names one (#200)
- Label a registration as one: the count of a healthy Chef beside a Spy is labelled a registration, not false information (#200)
- Let only a working Tinker die on the Tinker's night step: the step refuses the death of a drunk or poisoned Tinker, as the day already did, and the death of any other player; saved games keep the deaths they recorded (#200)
- Bring a player back only on the Professor's or the Shabaloth's night step: the outcome of any other Bad Moon Rising night step, a Lunatic shown the Shabaloth included, refuses a resurrection; saved games keep the resurrections they recorded (#200)

## [0.1.1] - 2026-11-17

### Changed

- Move the night steps of the Poisoner, Monk, Butler, Imp, Spy, Gambler and Pukka, and the information answers of the Empath, Fortune Teller, Chef, Undertaker, Ravenkeeper, Washerwoman, Librarian and Investigator, from the engine into their role capabilities, with behavior pinned by tests before each move (#200)
- Let a role module answer its own step: the information decision now returns `answer`, `prepared` or `grimoire` beside the legal alternatives, and the ownership ledger counts five roles on typed capabilities alone, up from one, with fifteen more holding a capability and an engine reference (#200)
- Show a stored "zero are in play" as an answer in the secrets screen only for the Librarian; the Washerwoman and Investigator editors keep the fields the host prepares one with (#200)
- Record the new ownership in ADR 0002, `docs/role-ownership.md`, the per-role `rule.md` dossiers and the eleven OpenSpec changes behind the migration (#200)

### Fixed

- Answer a prepared "zero are in play" only for the Librarian; a zero held for another role no longer answers its step, and commands recorded under earlier ruleset versions replay unchanged (#200)

## [0.1.0] - 2026-11-16

### Added

- Add the release identity: a canonical `VERSION`, the mirrored `package.json` version, `CHANGELOG.md`, and `node scripts/check-version.ts` in `npm run verify` and CI; the build reports the version on the help screen
- Add the host table for Trouble Brewing, Bad Moon Rising and Sects & Violets: seating, first night, other nights, dawn, day, nominations, execution and win resolution through one command journal with undo
- Add the role sheet, player handoff, public view and Storyteller help over the pinned `ru`, `en` and `az` catalogues
- Add the command journal and deterministic replay behind undo/redo and save recovery
- Add save versioning with schema v4 migration, import/export with the secrets warning, and the teaching demo on its own in-memory game
- Add the offline app: a precached service worker, an update prompt that saves every open window before activation, and a 404 fallback for project subpaths
- Add the OpenSpec workflow, the pinned official rule snapshots and the per-role rule documents behind every verified mechanism
- Add the obsidian palette, the stadium table console and the shared setup and secrets component standard

### Changed

- Adopt GitFlow: `dev` integrates work, `hotfix/*` merges into `main` and back, every merge into `main` changes the version, and commit and PR titles end with the issue reference `(#N)`

### Security

- Add the public and player projections that omit secret roles, bluffs and notes from shared views

[Unreleased]: https://github.com/hose1021/grimoria/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/hose1021/grimoria/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/hose1021/grimoria/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/hose1021/grimoria/releases/tag/v0.4.1
[0.4.0]: https://github.com/hose1021/grimoria/releases/tag/v0.4.0
[0.3.0]: https://github.com/hose1021/grimoria/releases/tag/v0.3.0
[0.2.0]: https://github.com/hose1021/grimoria/releases/tag/v0.2.0
[0.1.1]: https://github.com/hose1021/grimoria/releases/tag/v0.1.1
[0.1.0]: https://github.com/hose1021/grimoria/releases/tag/v0.1.0
