# Pure domain

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Own game rules, state validation and command contracts here. Do not import UI, application or infrastructure implementations, or read browser storage/time directly. Use injected runtime ports for nondeterminism.

Return the existing result unions for expected invalid actions. Preserve stable player IDs, seat order and explicit Storyteller choices.

For rules changes, consult [rules sources](../../docs/rules-sources.md), the relevant verified spec and asserting tests before implementation.

Check: `npm run typecheck`, `npm test` and `node scripts/check-types-policy.mjs`.
