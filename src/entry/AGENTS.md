# Composition root

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Wire concrete adapters, the store facade, legacy screens and `ShellPorts` here. Keep UI independent of legacy imports and concrete storage implementations.

Preserve locale initialization, storage status and offline preparation order. Do not put game rules in boot code.

Check: `npm run typecheck`, `npm run build` and `node scripts/check-types-policy.mjs`; smoke startup and reload after boot changes.
