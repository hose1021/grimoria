import test from "node:test";
import assert from "node:assert/strict";
import { createGame, validateState } from "../../../js/model.js";
import { validatedFromUnknown } from "./validated.ts";

test("a value the validator accepts becomes a validated state", () => {
  const outcome = validatedFromUnknown({ v: 4 }, () => []);
  assert.equal(outcome.ok, true);
});

test("validator messages become errors and no state", () => {
  const outcome = validatedFromUnknown({ v: 4 }, () => ["Missing script."]);
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.deepEqual(outcome.errors, [{ code: "state-invalid", message: "Missing script." }]);
});

test("a non-object value is rejected without calling the validator", () => {
  let called = false;
  const outcome = validatedFromUnknown("text", () => {
    called = true;
    return [];
  });
  assert.equal(outcome.ok, false);
  assert.equal(called, false);
});

test("a throwing validator becomes a validation error", () => {
  const outcome = validatedFromUnknown({}, () => {
    throw new Error("boom");
  });
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.errors[0]?.code, "state-validator-failed");
  assert.match(outcome.errors[0]?.message ?? "", /boom/);
});

// The real runtime validator stays the only producer on the new path. The
// composition root supplies it until the model module moves into core.
test("a complete saved game passes the real validator", () => {
  const outcome = validatedFromUnknown(createGame(7), validateState);
  assert.equal(outcome.ok, true);
});

test("a saved game without a player table is rejected by the real validator", () => {
  const game = createGame(7);
  const players = game.players as Record<string, unknown>;
  delete players["1"];
  const outcome = validatedFromUnknown(game, validateState);
  assert.equal(outcome.ok, false);
});

test("an unknown schema version is rejected by the real validator", () => {
  const outcome = validatedFromUnknown({ ...createGame(7), v: 99 }, validateState);
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.ok(outcome.errors.some((error) => /schema version/i.test(error.message)));
});
