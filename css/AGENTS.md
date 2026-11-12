# The global stylesheet

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root.

`app.css` is the only stylesheet. It declares the layer order, imports the
Tailwind theme and utilities, safelists the utilities the static document in
`index.html` uses, holds the one `@theme` block and keeps the small
`@layer base` reset. Add a visual value to `@theme` before using it; a
`var(--…)` reference that nothing declares fails the policy check.

Screen styling lives in the markup or in a shared component under
`src/ui/components/`. Do not add a rule for a screen, a second stylesheet or a
Preflight import: Preflight changes margins and heading weights, and the
recorded baseline in `scripts/fixtures/computed-styles.json` rejects it.

Legacy class names stay on converted elements only as inert hooks for
`scripts/browser-check.mjs`; they must carry no declarations.

Check: `node scripts/check-types-policy.mjs`, `npm run build` and
`node scripts/style-parity.mjs --check`; inspect the changed route at desktop
and about 390 px.
