# Catalogs and media

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Preserve role IDs, locale catalog shape and artwork lookup compatibility. Role catalogs are classic scripts consumed through `window.PG.roles`, not UI translation modules.

Keep original font/artwork license files. Avoid unrelated binary churn or regenerating catalogs for a text-only change.

Check catalog edits with `node --test js/library.test.mjs js/scripts.test.mjs`; inspect the role sheet and artwork for each affected supported locale, then rebuild the offline artifact.
