// A host correction for the Evil Twin pair. The pin leaves the partner to the
// Storyteller; this command rebuilds the stored pair from the host's choice.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, realTeamOf } from "../model/state.ts";
import { sectsAndVioletsScript } from "../model/scripts.ts";
import { applyCommand, dealGame, manualCorrection } from "./index.ts";
import { evilTwinPair, evilTwinPartnerMissing } from "./death.ts";
import type { GameState, RoleId } from "../model/types.ts";

function snvGame(): GameState {
  const state = createGame(8);
  state.script = sectsAndVioletsScript();
  state.scriptId = "snv";
  state.setup.count = 8;
  state.setup.roles = [
    "clockmaker",
    "eviltwin",
    "fanggu",
    "dreamer",
    "artist",
    "sage",
    "barber",
    "klutz",
  ];
  state.setup.evilTwinGoodId = "clockmaker";
  state.setup.bluffs = ["oracle", "juggler", "savant"];
  const assignment: Record<string, RoleId> = {
    "1": "clockmaker",
    "2": "eviltwin",
    "3": "fanggu",
    "4": "dreamer",
    "5": "artist",
    "6": "sage",
    "7": "barber",
    "8": "klutz",
  };
  const dealt = dealGame(state, { assignment });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  return state;
}

test("the host can set the Evil Twin's good partner (SNV-EVILTWIN-05)", () => {
  const state = snvGame();
  state.setup.evilTwinGoodPlayerId = null;
  state.setup.evilTwinPlayerId = null;
  const result = manualCorrection(state, {
    kind: "twin",
    playerId: "2",
    value: "1",
    reason: "the Storyteller pairs the twins",
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.setup.evilTwinPlayerId, "2", "the minion holder is the evil side");
  assert.equal(state.setup.evilTwinGoodPlayerId, "1", "the host chose the good side");
  assert.equal(state.setup.evilTwinGoodId, "clockmaker", "the setup role follows the good twin");
});

test("the host can pair a good player who became the Evil Twin with an evil player (SNV-EVILTWIN-05)", () => {
  const state = snvGame();
  state.players["4"].roleId = "eviltwin";
  state.players["4"].team = "good";
  state.players["2"].roleId = "cerenovus";
  state.players["2"].team = "evil";
  const result = manualCorrection(state, {
    kind: "twin",
    playerId: "4",
    value: "2",
    reason: "the good holder needs an evil twin",
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(realTeamOf(state.players[state.setup.evilTwinGoodPlayerId!]!), "good");
  assert.equal(realTeamOf(state.players[state.setup.evilTwinPlayerId!]!), "evil");
  assert.equal(state.setup.evilTwinGoodPlayerId, "4");
  assert.equal(state.setup.evilTwinPlayerId, "2");
  assert.equal(
    state.setup.evilTwinGoodId,
    "clockmaker",
    "a mid-game good holder keeps the setup role",
  );
});

test("the twin correction runs through the command path and records the entry", () => {
  const state = snvGame();
  state.setup.evilTwinGoodPlayerId = null;
  state.setup.evilTwinPlayerId = null;
  const result = applyCommand(state, {
    id: "twin-command",
    type: "manualCorrection",
    payload: {
      change: { kind: "twin", playerId: "2", value: "1", reason: "the host pairs the twins" },
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.setup.evilTwinGoodPlayerId, "1");
  assert.equal(state.applied["twin-command"].type, "manualCorrection");
});

test("a twin correction requires an Evil Twin holder (SNV-EVILTWIN-05)", () => {
  const state = snvGame();
  const before = JSON.stringify(state.setup);
  const result = manualCorrection(state, {
    kind: "twin",
    playerId: "1",
    value: "2",
    reason: "not the holder",
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "error.75");
  assert.equal(JSON.stringify(state.setup), before);
});

test("a dead good partner is legal when the Storyteller chooses it (SNV-EVILTWIN-05)", () => {
  const state = snvGame();
  state.players["1"].alive = false;
  const result = manualCorrection(state, {
    kind: "twin",
    playerId: "2",
    value: "1",
    reason: "the final-night Storyteller choice",
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.setup.evilTwinGoodPlayerId, "1");
  assert.equal(state.setup.evilTwinPlayerId, "2");
});

test("a same-alignment pair becomes invalid and needs a new choice (SNV-EVILTWIN-05)", () => {
  const state = snvGame();
  const first = manualCorrection(state, {
    kind: "twin",
    playerId: "2",
    value: "1",
    reason: "initial pair",
  });
  assert.equal(first.ok, true, JSON.stringify(first));
  state.players["1"].team = "evil";
  assert.equal(evilTwinPair(state), null, "the same-alignment pair has no ability");
  assert.equal(evilTwinPartnerMissing(state), true, "the host must pick a new twin");
  const replacement = manualCorrection(state, {
    kind: "twin",
    playerId: "2",
    value: "4",
    reason: "the good twin became evil",
  });
  assert.equal(replacement.ok, true, JSON.stringify(replacement));
  assert.equal(state.setup.evilTwinGoodPlayerId, "4");
  assert.equal(evilTwinPartnerMissing(state), false);
});

test("a same-alignment partner is rejected (SNV-EVILTWIN-05)", () => {
  const state = snvGame();
  const before = JSON.stringify(state.setup);
  const result = manualCorrection(state, {
    kind: "twin",
    playerId: "2",
    value: "3",
    reason: "both are evil",
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "error.76");
  assert.equal(JSON.stringify(state.setup), before, "the state is unchanged");
  assert.equal(state.corrections.length, 0, "a refused correction is not recorded");
});
