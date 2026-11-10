// The compatibility shims must keep the whole surface the screens and the
// suites import. A dropped re-export fails here instead of at a screen.
import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "./engine.js";
import * as model from "./model.js";

const ENGINE_NAMES = [
  "startNight", "completeStep", "endNight", "skipStep", "execute", "nominate",
  "recordVotes", "checkWin", "infoForStep", "validateCommand",
  "previewCommand", "applyCommand", "RULESET_VERSION", "buildSvNightQueue",
  "reconcileNoDashiiPoison"
];

const MODEL_NAMES = [
  "createGame", "clone", "validateState", "importGame", "exportGame",
  "livingPlayers", "orderedPlayers", "playerById", "publicGameView",
  "STORAGE_KEY", "SCHEMA_VERSION"
];

test("the engine shim re-exports the public domain API", () => {
  for (const name of ENGINE_NAMES) {
    assert.ok(name in engine, "engine shim lost " + name);
  }
});

test("the model shim re-exports the state API", () => {
  for (const name of MODEL_NAMES) {
    assert.ok(name in model, "model shim lost " + name);
  }
});
