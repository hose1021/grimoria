// Release-blocking regressions found by the independent Sects & Violets audit.
// Each test states the pinned rule it protects.
import test from "node:test";
import assert from "node:assert/strict";

import { SNV, SNV_ALL, compositionFor, roleTeam } from "../model/rules.ts";
import { createGame, validateState } from "../model/state.ts";
import { sectsAndVioletsScript } from "../model/scripts.ts";
import type { GameState, RoleId } from "../model/types.ts";
import {
  appendConditionalSteps,
  checkWin,
  completeStep,
  dealGame,
  kill,
  reconcileNoDashiiPoison,
  startNight,
} from "./index.ts";

function make(assignment: Record<string, RoleId>, count: number): GameState {
  const state = createGame(count);
  state.script = sectsAndVioletsScript();
  state.scriptId = "snv";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)!] += 1;
  const target = compositionFor(count, required)!;
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"] as const) {
    const need = target[team] - counts[team];
    assert.ok(need >= 0, "too many " + team);
    const pool = SNV[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles");
    roles.push(...pool.slice(0, need));
  }
  state.setup.roles = roles;
  state.setup.bluffs = SNV_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  state.setup.evilTwinGoodId = roles.includes("eviltwin")
    ? roles.find((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider")!
    : null;
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) if (!full[id]) full[id] = spare.shift()!;
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  return state;
}

test("two living Evil Twins with no Demon win for evil when only two players live (SNV-EVILTWIN-02)", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "fanggu" }, 7);
  const good = state.setup.evilTwinGoodPlayerId!;
  const evil = state.setup.evilTwinPlayerId!;
  for (const id of state.order) {
    if (id !== good && id !== evil) state.players[id].alive = false;
  }
  assert.equal(state.order.filter((id) => state.players[id].alive).length, 2);
  const winner = checkWin(state);
  assert.equal(winner?.team, "evil", "Rules Explanation r1310: two alive means evil wins");
  assert.equal(winner?.reason, "two-alive");
});

test("a dead Barber opens no swap step while no Demon is alive (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 3: "artist", 6: "eviltwin", 7: "fanggu" }, 8);
  startNight(state);
  kill(state, "7", "ability", { phase: "night", number: 1 }, { ability: "fanggu" });
  kill(state, "2", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  assert.equal(
    state.order.some(
      (id) => state.players[id].alive && roleTeam(state.players[id].roleId!) === "demon",
    ),
    false,
    "the Demon is dead; the twin pair keeps the game running",
  );
  appendConditionalSteps(state);
  assert.equal(
    state.night.queue.find((step) => step.roleId === "barber"),
    undefined,
    "Barber r1757: with no living Demon there is no chooser",
  );
});

test("a Barber swap already queued does nothing if the last Demon died (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "fanggu" }, 8);
  startNight(state);
  kill(state, "2", "ability", { phase: "night", number: 1 }, { ability: "barber" });
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "barber");
  assert.ok(step, "the living Demon had a swap to offer");
  const before = state.players["1"].roleId;
  kill(state, "7", "ability", { phase: "night", number: 1 }, { ability: "fanggu" });
  const result = completeStep(state, step.key, { targetIds: ["1", "3"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.players["1"].roleId, before, "no living Demon can make the swap");
});

test("a No Dashii neighbour that leaves and re-enters Townsfolk keeps one effect record (SNV-NODASHII-01)", () => {
  const state = make(
    { 2: "clockmaker", 3: "dreamer", 4: "nodashii", 5: "artist", 6: "juggler" },
    7,
  );
  startNight(state);
  assert.ok(state.effects.some((effect) => effect.sourceId === "4" && effect.targetId === "3"));
  state.players["3"].roleId = "klutz";
  reconcileNoDashiiPoison(state);
  state.players["3"].roleId = "dreamer";
  reconcileNoDashiiPoison(state);
  const ids = state.effects.map((effect) => effect.id);
  assert.equal(new Set(ids).size, ids.length, "effect ids stay unique");
  assert.deepEqual(validateState(state), []);
});
