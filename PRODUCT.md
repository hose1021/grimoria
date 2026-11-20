# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a Storyteller running a Blood on the Clocktower game in person. One
phone, tablet or laptop sits on the table for the whole session; the Storyteller
holds it while running the night and the day, and hands it to a player when that
player must see their role or night information.

Success is two-sided: the Storyteller runs a full night and day without paper
and without errors in action order, and a person who has never hosted can run
their first game without outside help.

## Product Purpose

Grimoria is a standalone Storyteller aid for Blood on the Clocktower. It carries
the game state, the official night order, the setup choices and the death
bookkeeping for Trouble Brewing, Bad Moon Rising and Sects & Violets, and it
gives the Storyteller every decision the official rules leave to them.

## Positioning

Three properties together, none of which a hosted competitor can copy without
giving up its own model:

1. **Offline and account-free.** A static artifact, no backend, no database, no
   accounts, no network play. Game state lives in the browser, and the app keeps
   working with no connection at all.
2. **An honest rules engine.** Every role carries a published support level —
   fully automated, Storyteller choice, or unsupported. The engine never
   invents a Storyteller decision; it presents the allowed options and the
   reason.
3. **Russian-first, trilingual catalogs.** Russian is the primary interface
   language, with English and Azerbaijani role catalogs and a role sheet in all
   three.

## Operating Context

- One device at a real table, used across a whole session: setup, deal, seat
  order, night, day, execution, win and review.
- Device handoff is a first-class screen: a player sees a public-only
  projection, never the grimoire.
- Games run from the three official scenarios or from an imported script. Mixed
  or custom pools are explicitly Storyteller-resolved where the engine cannot
  play them.
- The Storyteller may prepare at home and then play offline; an update is an
  explicit action and never interrupts an active game.
- Exports contain secret roles and notes; they are Storyteller material.

## Capabilities and Constraints

- Scenarios: Trouble Brewing, Bad Moon Rising, Sects & Violets, plus custom
  script import and named bag pools.
- Per-role support is derived from `docs/rules-matrix.md` and enforced by
  `scripts/check-acceptance.ts`; the UI shows the counts.
- Routes: `/`, `/table`, `/bag`, `/seat`, `/secrets`, `/player`, `/help`,
  `/demo`, `/sheet` and the three localized sheet routes.
- State: `localStorage` key `pg.game.v4`, with migration from v3 and v2, a
  backup on corruption, and JSON export/import.
- One mutation path: a screen action dispatches a validated command; the store
  is idempotent by command id and rolls back on save failure.
- Pin: no backend, accounts or network play; offline cache URLs stay relative;
  the app may live under a GitHub Pages subpath.
- Pinned rules: `docs/rules-matrix.md` is the only place that pins a wiki
  revision, and no rule changes without reading the pinned text.
- Interface languages: `ru`, `en`, `az`. Azerbaijani coverage is incomplete and
  must not be assumed complete.
- Layout is verified down to roughly 390 px width.

## Brand Commitments

The product name is Grimoria. No logo, voice, or identity guideline has been
confirmed beyond that.

## Evidence on Hand

- `docs/rules-matrix.md` — per-role audit table with pinned wiki revisions.
- `docs/official/wiki/` — pinned official rules text (local recovery via
  `node scripts/fetch-official.ts`).
- `src/core/roles/<role-id>/rule.md` — per-role rule identifiers and asserting
  tests; `node scripts/rules-for.ts <roleId>` prints one dossier.
- `openspec/specs/` — verified behavior contract with asserting tests.
- `README.md` support table, generated from the matrix.

Absent, and not to be invented: customer counts, testimonials, press,
benchmarks, pricing, or deployment claims beyond a static GitHub Pages artifact.

## Product Principles

1. Never guess a rule. If a pinned source does not settle it, stop and ask.
2. Never make a Storyteller decision. Offer the allowed options with the reason.
3. Keep the promise of offline play. No dependency on a server for a game in
   progress.
4. Keep secrets in their place. Player views and the exported public projection
   are projections, never the full state.
5. Prefer the boring, verifiable path: a rule is verified only when a test
   asserts it.
