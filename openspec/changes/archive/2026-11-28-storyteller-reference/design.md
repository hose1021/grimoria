# Design

## Context

See `proposal.md`. The reference is a read-only route pair:

- `/reference` is the discovery list.
- `/reference/:roleId` is one reading surface.

The content comes from two places the project already owns:

- `docs/rules-matrix.md` — 130 role rules for the 72 supported characters, each
  with a status (`verified` or `host-choice`), a `When` category, the engine
  behaviour, the host decision and the asserting test titles.
- `src/core/roles/*/role.ts` — the night step, target mode, optional flag,
  lethal/resurrection flags and localized console note keys.

The official catalog (`docs/official/roles.json`, `jinxes.json`) supplies the
names, the ability used for usage detection and the jinx pairs.

## Goals / Non-Goals

**Goals:**

- Show what the engine decides and what remains a Storyteller decision.
- Keep every displayed rule traceable to a rule id and a pinned revision.
- Ship a complete Russian translation of all 72 characters and 130 rules.
- Keep the page read-only: no command dispatch, no save write.
- Match the supplied reference: one graphite surface, hairline section
  dividers, two-column tables that stack on phones.

**Non-Goals:**

- Shipping wiki prose or a second rules authority.
- Recomputing engine answers in the UI.
- Translating the Azerbaijani dataset while the AZ catalog itself is incomplete.
- A new global visual system: the reference tokens live beside the Arcane
  tokens and only this route consumes them.

## Decisions

**The matrix is the content source.** The English dataset is generated from
`docs/rules-matrix.md`, not hand-written. A rule change updates one audit row,
`npm run reference` rewrites `reference.json`, and the parity test forces the
Russian file to follow. Alternative considered: compose the sections from wiki
prose; rejected under the licensing gate and because it duplicates the engine
audit.

**The rule is shown as decision plus behaviour.** "How to run" renders the host
decision for each rule; "Clarifications" renders the engine behaviour with the
rule id and status. The Storyteller sees the actionable instruction and the
engine's resolution side by side, without a second rules text. The localized
console note from the role module appears first, because it is the exact
sentence the app shows during the night.

**Examples are the asserting scenarios.** The matrix test titles are filtered to
remove plumbing (`step`, `command`, `journal`, `record`, `preview`, `replay`,
`persist`, `shape`, `reject`, `duplicate`, `idempotent` and similar), stripped of
rule ids and code paths, capped at six per character, then translated. They are
concrete engine scenarios, not invented gameplay prose.

**Two locale files, one shape.** `reference.json` is English;
`reference.ru.json` is Russian. The screen loads the file for `ru` and the
English file for `en` and `az`. `reference-data.test.ts` asserts the same role
set, rule ids, statuses, example counts and interaction ids, and rejects
internal rule ids in the user-facing text. Alternative considered: one file with
both languages; rejected because it doubles the payload the page needs and
makes drift harder to see.

**Engine facts come through a port.** `roleFacts(id)` lives in
`src/application/reference/role-facts.ts` and is wired through `ShellPorts`. The
UI never imports the engine registry. The facts supply target mode, optional,
kill/resurrect flags, capability kinds and the localized note keys.

**Interactions come from the official catalog.** `jinxes.json` is filtered to
pairs where both ids are supported, so a link never points at a character
without a page. The reason is part of the dataset and is translated with the
rules.

**The Russian translation is a working translation.** The page names it as such
in the sources section. It is a translation of the project's audit text, not an
official localization; the English file remains the reference. This is the
honest boundary between the engine's decisions and the Russian reading.

**The layout is one surface.** The page uses `#111111` page, `#212121` surface,
`#484848` border, `#444444` section dividers and `#303030` row rules from the
reference screenshot. The only nested surface is the gameplay-example well and
the console-note well; there are no bordered cards inside sections. Tables are
two columns on desktop and stack label over value below 520 px.

## Risks / Trade-offs

- **Matrix text is audit prose, not player-facing prose.** → the page labels
  the rule id and status; the host decision is the actionable line, and the
  localized console note is the table-side instruction.
- **The model-assisted Russian translation can drift or mistranslate.** → the
  parity test catches structural drift; the page marks the translation as
  working; the English file is the fallback and the source.
- **The matrix changes without a new translation.** → the parity test fails on
  a changed rule id, status or example count, which blocks CI until the Russian
  file is updated.
- **A new route increases the app bundle.** → the dataset is a static asset
  loaded on the route, not imported into the screen; the offline worker
  precaches it.
- **AZ shows English rule text.** → AZ continues to use the English dataset
  until the AZ catalog is complete; the switch remains visible.

## Open Questions

None.
