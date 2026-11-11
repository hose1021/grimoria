# Shared UI primitives

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Reuse the installed React/Radix primitives and existing components before adding another. Keep game state and role rules out of shared presentation components.

Preserve semantic controls, accessible names, dialog focus restoration and keyboard operation. Expose only the props required by actual callers.

Check: `npm run typecheck`; exercise affected screens with keyboard and mobile layout after interaction changes.
