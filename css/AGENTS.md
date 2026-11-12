# The global stylesheet

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root.

`app.css` is the only stylesheet `index.html` loads. It declares the layer
order, imports the Tailwind theme, Preflight and utilities, safelists the
utilities the static document uses, holds the one `@theme` block (Arcane
Instrument materials plus the document aliases) and the small `@layer base`
reset. The shared `.btn`, `.field` and `.label` primitives stay here in the
`components` layer because the Arcane screens compose them; a utility can
still override them. Add a visual value to `@theme` before using
it; a `var(--…)` reference that nothing declares fails the policy check.

Screen styling lives in the markup or in a shared component under
`src/ui/components/`. Do not add a rule for a screen or a second stylesheet.

Preflight is enabled: a migrated element must not keep a legacy class for a
property a utility sets. Legacy class names stay on converted elements only as
inert hooks for `scripts/browser-check.mjs`; they must carry no declarations.
`docs/design-direction.md` records the Arcane Instrument palette and materials.

Preserve visible focus, the 44px touch target, contrast and reduced motion.

Check: `npm run build`, `node scripts/check-types-policy.mjs`, and the changed
route at desktop and about 390 px.
