import test from "node:test";
import assert from "node:assert/strict";
import type { Command as LegacyCommand } from "../../core/model/types.ts";
import { toCommandInput } from "./adapt.ts";

test("the adapter preserves the identity a legacy caller supplied", () => {
  const input = toCommandInput({
    id: "cmd-1",
    type: "recordVotes",
    payload: { nominationId: "nom-1", voterIds: ["1"] },
    at: "2026-11-11T10:00:00.000Z",
    rulesetVersion: "tb-bmr-snv-2026-11-10",
  });
  assert.equal(input.id, "cmd-1");
  assert.equal(input.at, "2026-11-11T10:00:00.000Z");
  assert.equal(input.rulesetVersion, "tb-bmr-snv-2026-11-10");
  assert.deepEqual(input.payload, { nominationId: "nom-1", voterIds: ["1"] });
});

test("a numeric legacy timestamp becomes an ISO string", () => {
  const input = toCommandInput({ id: "cmd-2", type: "startNight", at: 0 });
  assert.equal(input.at, new Date(0).toISOString());
});

test("a missing payload becomes an empty object", () => {
  const input = toCommandInput({ id: "cmd-3", type: "endNight" });
  assert.deepEqual(input.payload, {});
});

test("every screen family keeps its supplied id", () => {
  const commands: LegacyCommand[] = [
    { id: "table-1", type: "completeStep", payload: { key: "step-1" } },
    { id: "player-1", type: "claimSeat", payload: { playerId: "1", name: "Ann" } },
    { id: "seat-1", type: "setOrder", payload: { order: ["1", "2"] } },
    { id: "secrets-1", type: "setHerring", payload: { playerId: null } },
    { id: "bag-1", type: "bagUpdate", payload: { patch: { count: 7 } } },
  ];
  for (const command of commands) {
    assert.equal(toCommandInput(command).id, command.id);
  }
});
