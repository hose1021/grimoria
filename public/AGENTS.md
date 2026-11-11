# Static assets

These instructions supplement the root AGENTS.md for this subtree. Run commands from the repository root (with the configured RTK wrapper).

Vite copies this directory into the build root. Source assets live under `public/assets/`; runtime URLs omit the `public/` prefix and must work under `BASE_PATH`.

Preserve `.nojekyll`, manifest paths and existing licenses. Do not commit generated `dist/404.html` or `dist/sw.js` here.

After asset edits check: `npm run build && npm run fallback && npm run offline`, then inspect the built site under a project subpath.
