# Design

## Direction

The last video store. Tonight's game is the only tape on the shelf; the
Storyteller is the clerk. State is merchandise: a tape, a spine label, a staff
pick, a price sticker, a rewind notice — never a dashboard card.

Direction contract, as agreed with the owner:

- THESIS: one store desk where every screen is shelf furniture, refusing the
  dark SaaS dashboard and its panel grid.
- OWN-WORLD: tube black `#0b0b0d`, shelf `#16161b`, bone print `#f2efe6`,
  rental yellow `#ffc93c` for the one action, rent red `#ff4d3d`, signal blue
  `#3d7bff`, cult purple `#a06bff`, cream labels `#f4efe4`. Hard 2–3 px borders,
  hazard stripes, barcodes, team-coloured tape spines.
- STORY: understand in one line that this is the Storyteller's console; believe
  it because the shelf shows the real first-night roles with one crossed victim;
  start with the single yellow action.

The world was pinned by the owner's references, so no direction roll ran. The
earlier detective-board world built in this session was rejected and replaced
whole, not polished.

## Decisions

- **Welcome route.** `/` becomes the default and the one Persuade surface.
  `/table` stays the console and every other route keeps its path. An unknown
  path still falls back to `/table`, and `/public` now does the same.
- **Public screen removed.** The room-facing facts are the console's business;
  the projection (`publicGameView`) stays as the privacy contract and its tests,
  but no route renders it.
- **Type.** Oswald (display, 400–700), Golos Text (prose, 400–700) and PT Mono
  (system tags, 400), all self-hosted with Cyrillic, Latin and the Azerbaijani
  `ə`. Inter is no longer loaded.
- **One action.** Yellow appears on one action per viewport; red is loss, blue
  is the forward path on the same task, purple separates the third script.
- **Shape.** Corners 2–3 px; hazard stripes and barcodes are materials, never
  decoration behind text; the table mat carries the hazard on its outer rail.
- **Motion.** One entrance: the shelf tapes rise 10 px on first paint (420 ms,
  40 ms stagger, visible by default, disabled under reduced motion). Everything
  else is state feedback.
- **Density.** Operate screens stay dark; cream is a label material and the
  player card, never a page ground.
- **Review.** An adversarial design review returned FIX; the blocker (seat names
  under the hub), the 1200 px bar, the duplicate sample victim, the bag footer
  and safe area, the public hierarchy and the player action were corrected.

## Risks

- The computed-style fixture in `scripts/fixtures/computed-styles.json` records
  the previous world. `scripts/style-parity.ts` is not part of `npm run verify`
  or CI and is not re-recorded here.
- The bag's desktop composition still uses a scenario rail and set cards; only
  the selected set expands to a full-width order slip. Further re-composition is
  open work.
