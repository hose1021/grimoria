# Changelog

All notable changes to Grimoria are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

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

[Unreleased]: https://github.com/hose1021/grimoria/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/hose1021/grimoria/releases/tag/v0.4.0
[0.3.0]: https://github.com/hose1021/grimoria/releases/tag/v0.3.0
[0.2.0]: https://github.com/hose1021/grimoria/releases/tag/v0.2.0
[0.1.1]: https://github.com/hose1021/grimoria/releases/tag/v0.1.1
[0.1.0]: https://github.com/hose1021/grimoria/releases/tag/v0.1.0
