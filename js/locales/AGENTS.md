# UI translations

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Add the same translation key to `ru.js`, `en.js` and `az.js`; preserve interpolation variable names and the existing `t()` fallback contract.

These are UI strings. Role names and abilities come from the role catalogs, not duplicated UI translations.

Keep product/domain terminology in its intended language and escape at the rendering boundary rather than embedding markup in ordinary labels.

Check: `node --test js/strings.test.mjs` and `npm run typecheck`; inspect changed labels in all three locales.
