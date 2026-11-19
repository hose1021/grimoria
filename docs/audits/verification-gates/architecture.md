# Architecture gates

The existing policy already owns the layer contract: `scripts/check-types-policy.ts` classifies every static import and rejects core→application/infrastructure/ui/entry, application→infrastructure/ui/entry, infrastructure→ui/entry and ui→infrastructure/entry. It also rejects browser globals and ambient clocks in core/application, `as ValidatedState`/`as unknown as` outside the two boundary files, alias imports, the retired `js/` tree and a second stylesheet.

The verification layer adds two executable checks:

1. `src/verification/architecture.test.ts` — calls `checkDirectory()` and fails on any forbidden edge.
2. The same test scans `src/ui` and rejects a value import of `src/core/engine/**`. UI reads engine facts through `ShellPorts`, application read models, core model types and projections.

`src/ui/screens/structure.test.ts` remains the screen-level guard (no screen imports the engine or the legacy tree).

## Limitations

- The scan is textual and line-based; a specifier assembled at runtime can escape it. The policy file states this limitation; review is the second control.
- `src/ui` may import core **model/types**; that is the intended read-only contract. The new scan rejects only the engine subtree.
- The component tests are browser-based because the stack has no TSX test transformer and no new dependency is added. The browser suite is the component oracle.

## Run

```sh
node scripts/check-types-policy.ts
node --test src/verification/architecture.test.ts
```

Both are part of `gates.ts --scope=verified` and the `semantic` CI job.
