# Game mechanics

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Trace the shared mechanic and every caller before changing a role-specific path. Reuse the existing effects, information, death and queue helpers; expose public operations through `index.ts`.

Keep Validate/Preview/Apply atomic and deterministic. Preserve command identity checks, preview/apply agreement and idempotency; rejected actions must leave state unchanged.

Do not invent false information, registrations, redirects or heirs on behalf of the Storyteller.

Add a RED regression in the relevant engine/commands, BMR or Sects & Violets suite beside the module, then prove GREEN. Check: `npm test`; also exercise the affected screen with a real game state.
