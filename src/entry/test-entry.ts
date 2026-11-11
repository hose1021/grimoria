// Test-mode entry for the browser harness. It re-exports the same module
// instances the app uses, so the harness can seed state and read results
// without reaching into hashed chunks. A production build does not emit it.
export * as model from "../core/model/state.ts";
export * as engine from "../core/engine/index.ts";
export * as store from "./store.ts";
export * as rules from "../core/model/rules.ts";
export * as probe from "../ui/test-probe.tsx";
