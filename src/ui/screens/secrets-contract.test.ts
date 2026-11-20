import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../core/model/state.ts";
import { dealGame, secretsErrors } from "../../core/engine/index.ts";
import { troubleBrewingScript } from "../../core/model/scripts.ts";
import { infoRoleChoices, obligationDone } from "./secrets-options.ts";
import type { GameState } from "../../core/model/types.ts";

function game(): GameState {
  const state = createGame(6);
  state.script = troubleBrewingScript();
  state.scriptId = "tb";
  state.setup.count = 6;
  state.setup.roles = ["washerwoman", "chef", "soldier", "saint", "spy", "imp"];
  state.setup.bluffs = [];
  const dealt = dealGame(state, {
    assignment: {
      1: "washerwoman",
      2: "chef",
      3: "soldier",
      4: "saint",
      5: "spy",
      6: "imp",
    },
  });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  return state;
}

function heldRoles(state: GameState): Array<NonNullable<GameState["players"][string]["roleId"]>> {
  return Object.values(state.players)
    .map((player) => player.roleId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
}

function washerwoman(state: GameState) {
  return infoRoleChoices({
    team: "townsfolk",
    forDrunk: false,
    held: heldRoles(state),
    scriptRoles: state.script?.roles ?? [],
    pairRoles:
      state.setup.info.washerwoman?.pair.map((id) => state.players[id]?.roleId ?? null) ?? [],
  });
}

test("every offered Washerwoman option with a fitting pair passes secretsErrors (TB-WASHERWOMAN-01)", () => {
  const state = game();
  state.setup.info.washerwoman = { roleId: "chef", pair: ["1", "2"] };
  for (const roleId of washerwoman(state)) {
    const holder = Object.values(state.players).find((player) => player.roleId === roleId);
    // The pair must fit the answer: the holder, or the Spy for an absent role.
    const pair = !holder ? ["1", "5"] : holder.id === "1" ? ["1", "2"] : ["1", holder.id];
    state.setup.info.washerwoman = { roleId, pair: pair as [string, string] };
    const problems = secretsErrors(state).filter(
      (problem) => problem.code === "info-washerwoman" || problem.code.endsWith("-washerwoman"),
    );
    assert.deepEqual(problems, [], roleId + " with the pair " + pair.join("/"));
  }
  // The registering Spy is one of the pair: the not-in-play Empath is offered
  // and accepted with that same pair.
  state.setup.info.washerwoman = { roleId: "chef", pair: ["1", "5"] };
  const options = washerwoman(state);
  assert.ok(options.includes("empath"), "a Spy in the pair offers the not-in-play Empath");
  state.setup.info.washerwoman = { roleId: "empath", pair: ["1", "5"] };
  assert.deepEqual(
    secretsErrors(state).filter((problem) => problem.code.endsWith("-washerwoman")),
    [],
    "the not-in-play Empath with the Spy in the pair is legal",
  );
});

test("the done mark agrees with the engine for every Washerwoman answer (TB-WASHERWOMAN-01)", () => {
  const state = game();
  state.setup.info.washerwoman = { roleId: "chef", pair: ["1", "2"] };
  assert.equal(obligationDone("washerwoman", secretsErrors(state)), true);
  state.setup.info.washerwoman = { roleId: "empath", pair: ["1", "2"] };
  assert.equal(
    obligationDone("washerwoman", secretsErrors(state)),
    false,
    "a not-in-play role without the Spy in the pair is not done",
  );
  state.setup.info.washerwoman = { roleId: "empath", pair: ["1", "5"] };
  assert.equal(obligationDone("washerwoman", secretsErrors(state)), true);
});

test("no not-in-play Minion is offered without a Recluse in the pair (TB-INVESTIGATOR-01)", () => {
  const state = game();
  const options = infoRoleChoices({
    team: "minion",
    forDrunk: false,
    held: heldRoles(state),
    scriptRoles: state.script?.roles ?? [],
    pairRoles: ["chef", "spy"],
  });
  assert.deepEqual(options, ["spy"], "a Spy is not a Minion registration");
  state.setup.info.investigator = { roleId: "spy", pair: ["5", "2"] };
  assert.deepEqual(
    secretsErrors(state).filter((problem) => problem.code.endsWith("-investigator")),
    [],
    "the in-play Minion with a fitting pair is legal",
  );
});
