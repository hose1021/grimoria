# Design

Lunatic r3112, How to Run, permits any three good characters as bluffs,
including characters in play. Sharing the host's existing Demon selection is
legal, while a separate host choice remains independent.

Treat missing and empty `setup.lunaticBluffs` as no separate choice when
reading the setup slots/count, first-night step note, first-night information
and player card. Keep any nonempty list, including an unfinished partial
selection. An empty list resumes the default; no generated choice is persisted.

Preserve the stored choice arrays. Queue notes and completed-step information
are themselves persisted, so their changed fallback must be versioned: new
commands use `tb-bmr-snv-2026-11-16`; recorded `tb-bmr-snv-2026-11-10`
commands retain their original empty-list semantics. Accept both versions and
carry the command version through its execution context. Direct information
reads use the current display behavior even for an older saved game. This
keeps historical canonical state, random seeds, replay and undo unchanged.

Use the setup Demon list before dealing and the dealt Demon list during the
night, as the existing missing-field fallback already does. Loading or undoing
a legacy bag with no separate list must keep the default unchosen (`[]`),
rather than materializing the Demon list as an independent override.

The regression starts from an ordinary new game, whose Lunatic array is
empty. Verify the generated step and information, later Demon selection,
explicit override, export/import and replay. An authentic baseline-generated
journal covers the persisted queue and completed-step information. The browser check exercises the
setup slots and actual private card at 390 px, retaining existing privacy
and explicit-selection assertions.
