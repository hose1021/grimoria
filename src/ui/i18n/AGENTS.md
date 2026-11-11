# UI translations

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Add the same translation key to `locales/ru.ts`, `locales/en.ts` and `locales/az.ts`; preserve interpolation variable names and the existing `t()` fallback contract.

These are UI strings. Role names and abilities come from the role catalogs, not duplicated UI translations.

Keep product/domain terminology in its intended language and escape at the rendering boundary rather than embedding markup in ordinary labels.

Check: `node --test src/ui/i18n/strings.test.ts` and `npm run typecheck`; inspect changed labels in all three locales.
