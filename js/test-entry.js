// Test-mode entry for the browser harness. It re-exports the same module
// instances the app uses, so the harness can seed state and read results
// without reaching into hashed chunks. A production build does not emit it.
export * as model from "./model.js";
export * as engine from "./engine.js";
export * as store from "./store.js";
export * as rules from "./rules.js";
export * as probe from "../src/ui/test-probe.tsx";
