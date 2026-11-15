// Globals that exist only inside the application page these checks drive.
//
// The test-mode entry re-exports the same module instances the app uses, so the
// harness reads the real module shapes instead of a hand-written stub. This is
// the single place a script describes the page; the bodies passed to
// `page.evaluate` are ordinary TypeScript checked against these types.
import type * as engine from "../src/core/engine/index.ts";
import type * as rules from "../src/core/model/rules.ts";
import type * as model from "../src/core/model/state.ts";
import type * as store from "../src/entry/store.ts";

declare global {
  interface Window {
    PG_MODULES: () => Promise<{
      model: typeof model;
      engine: typeof engine;
      store: typeof store;
      rules: typeof rules;
      probe: typeof import("../src/ui/test-probe.tsx");
    }>;
    __dialogProbe?: () => void;
    __pgSetItem?: typeof Storage.prototype.setItem;
    __parityHeight?: number;
  }
}

export {};
