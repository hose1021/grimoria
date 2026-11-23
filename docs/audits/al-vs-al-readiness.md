# Al vs Al readiness

Status: **not implemented**; separate scope. This note records the prerequisite
and the work the engine still needs. No Al vs Al character is added by #475 or
PR #477.

## Evidence gap

The repository has no Al vs Al script file, roster, or pinned normative source.
Issue #475 names "the 10 new Al vs Al characters" but does not enumerate them.
A search of the repository and the public pinned sources found no roster. An
exact character or interaction list cannot be certified from current evidence,
and this note does not infer one.

**Blocking first step:** the owner supplies the Al vs Al script (the normalized
character IDs) and a pinned Wiki `oldid` or other normative source for every new
character and interaction. Until then every Al vs Al character is unknown to
`SUPPORTED_ROLES` and must stay unsupported and manual-only.

## What the engine already provides

- `ScriptDefinition` and the compatibility verdict: a script is data, not an
  engine selector.
- The typed `RoleModule` registry and `night-step`, `information`,
  `transformation`, `adjudication` and `death-trigger` capabilities.
- Mixed-edition composition through `buildMixedNightQueue` and
  `appendConditionalSteps`; no scenario-specific builder.
- The source-versioned `interactions` registry with `verified`,
  `requires-storyteller-choice` and `unsupported` verdicts.
- One command pipeline, effect graph, journal and `pg.game.v4` state.

A supported character that needs no new mechanic should require only a role
module, capabilities and tests. A genuinely new mechanic may require a new
shared capability, not a new engine.

## Work required in the separate scope

1. **Roster and sources.** Pin one exact revision per new character and each
   pair-specific interaction; record them in `docs/rules-matrix.md`.
2. **Role modules.** For each new character, add
   `src/core/roles/<id>/role.ts` and `rule.md`, declare the existing typed
   capabilities it uses, and add it to the registry. A new capability is a
   design decision with its own ADR; do not add a second coordinator or effect
   graph.
3. **Interaction registry.** Add each Al vs Al pair as an interaction with its
   source, status and asserting test. A pair without behavior stays
   `unsupported`; the whole script then remains manual-only.
4. **Setup and script definition.** Add the script's setup constraints,
   normalized roster and compatibility verdict; test unknown, unsupported and
   manual pools.
5. **UI.** Expose every new Storyteller choice in `/table` and the private
   flows at phone width in RU/EN/AZ, with secrets, notifications and errors;
   keep public projections free of roles and notes.
6. **Evidence.** Per character and per interaction: official source →
   specification → failing regression → implementation → passing regression →
   independent review. Add a full-game mixed scenario and a deterministic
   replay/privacy case.
7. **Acceptance.** Full verify, strict OpenSpec, gates, mutation, scenarios and
   Playwright on the exact head; independent rules, UI and compliance audits.
   Unsupported mechanics stay explicitly manual.

## Remaining unsupported mechanics

- All Al vs Al characters and interactions: unknown/not in the registry.
- Any character outside `SUPPORTED_ROLES`, including Travellers, Fabled and
  Loric.
- Any registered pair without a behavior test remains `unsupported`.
- 13 engine-branch roles remain documented #211 exceptions (not unsupported
  gameplay, but they do not yet own every completion slice).

The architectural foundation is ready for the roster; the roster is not ready
for certification.
