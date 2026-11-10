// Legacy compatibility shim. The domain types live in `src/core/model/types.ts`;
// this file keeps the checkJs program and the screens importing `./types.js`
// unchanged until `retire-legacy-ui` deletes the legacy tree.
export type * from "../src/core/model/types.js";
