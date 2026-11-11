import test from "node:test";
import assert from "node:assert/strict";
import { createGame, migrateV3, validateState } from "../../../js/model.js";
import type { Effect } from "./types.ts";

// The saved game is an external boundary. `validateState` is the only gate
// between a saved or imported game and the engine, so an effect that reaches
// the engine must carry the source, the target and the interval it needs.

type Json = Record<string, unknown>;

function poison(overrides: Json = {}): Json {
  return {
    id: "eff-1",
    kind: "poison",
    sourceId: "1",
    targetId: "2",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
    ...overrides,
  };
}

function errorsFor(effect: Json): string[] {
  const game = createGame(7);
  game.effects.push(effect as Effect);
  return validateState(game);
}

test("an effect with a source, a target and an interval passes validation", () => {
  assert.deepEqual(errorsFor(poison()), []);
});

test("an effect without a source is rejected", () => {
  const effect = poison();
  delete effect.sourceId;
  assert.ok(errorsFor(effect).includes("Invalid effect source."));
});

test("an effect without a target is rejected", () => {
  const effect = poison();
  delete effect.targetId;
  assert.ok(errorsFor(effect).includes("Invalid effect target."));
});

test("an effect without an interval is rejected", () => {
  const effect = poison();
  delete effect.start;
  assert.ok(errorsFor(effect).includes("Invalid effect interval."));
});

test("an effect with a malformed interval is rejected", () => {
  assert.ok(errorsFor(poison({ start: { phase: "night" } })).includes("Invalid effect interval."));
});

test("an effect with a malformed expiry is rejected", () => {
  assert.ok(
    errorsFor(poison({ expires: { phase: "night" } })).includes("Invalid effect interval."),
  );
});

test("an open-ended effect with a null expiry passes validation", () => {
  assert.deepEqual(errorsFor(poison({ expires: null })), []);
  assert.deepEqual(errorsFor(poison({ expires: undefined })), []);
});

test("a v3 save with an effect keeps loading after the interval rule", () => {
  const saved = JSON.parse(JSON.stringify(createGame(7))) as Json;
  saved.v = 3;
  saved.scriptId = "tb";
  delete saved.script;
  (saved.effects as Json[]).push(poison());
  const migrated = migrateV3(saved);
  assert.equal(migrated.v, 4);
  assert.equal(migrated.effects.length, 1);
  assert.deepEqual(migrated.effects[0]?.start, { phase: "night", number: 1 });
  assert.deepEqual(validateState(migrated), []);
});

test("migration does not invent an interval for an undated effect", () => {
  const saved = JSON.parse(JSON.stringify(createGame(7))) as Json;
  saved.v = 3;
  saved.scriptId = "tb";
  delete saved.script;
  const effect = poison();
  delete effect.start;
  (saved.effects as Json[]).push(effect);
  const migrated = migrateV3(saved);
  assert.equal(migrated.effects[0]?.start, undefined);
  assert.ok(validateState(migrated).includes("Invalid effect interval."));
});
