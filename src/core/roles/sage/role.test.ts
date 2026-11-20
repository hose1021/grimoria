import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../model/state.ts";
import { role } from "./role.ts";

test("a player who did not die as the Sage gets no death information (SNV-SAGE-01)", () => {
  const state = createGame(7);
  state.night.number = 2;
  const candidate = state.players["1"]!;
  candidate.alive = false;
  candidate.roleId = "sage";
  state.deaths.push({
    playerId: "1",
    roleId: "clockmaker",
    cause: "ability",
    phase: "night",
    number: 2,
    at: { phase: "night", number: 2 },
    demon: true,
    impaired: false,
  } as never);
  const actor = role.nightStep?.actor;
  assert.ok(actor);
  assert.equal(actor(state, 2, candidate), null);
});
