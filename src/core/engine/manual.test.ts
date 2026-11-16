import test from "node:test";
import assert from "node:assert/strict";
import { createGame, normalizeScriptState, validateState } from "../model/state.ts";
import { ALL_ROLES } from "../model/rules.ts";
import {
  applyCommand,
  autoSecrets,
  checkWin,
  dealGame,
  endDay,
  endNight,
  executeByDecision,
  kill,
  setWinner,
  setupErrors,
  startNight,
  manualCorrection,
} from "./index.ts";

function mixedGame(count = 5) {
  const game = createGame(count);
  game.script = {
    id: "custom-mixed",
    name: "Mixed manual pool",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"],
    manualOnly: true,
  };
  game.scriptId = game.script.id;
  game.setup.count = count;
  game.setup.roles = ["fortuneteller", "chambermaid", "monk", "poisoner", "imp"];
  game.setup.bluffs = [];
  return game;
}

const FIVE = { 1: "fortuneteller", 2: "chambermaid", 3: "monk", 4: "poisoner", 5: "imp" };

test("a mixed-edition custom script deals and plays in manual-only mode (SYS-SCRIPTS-06)", () => {
  const game = mixedGame(5);
  assert.deepEqual(setupErrors(game), []);
  const dealt = dealGame(game, { assignment: FIVE });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  assert.equal(game.phase, "deal");

  // Mixed manual games must not need a Fortune Teller herring or other
  // automatic setup secrets.
  assert.equal(startNight(game).ok, true);
  assert.deepEqual(game.night.queue, [], "manual night has no automatic steps");
  assert.equal(endNight(game).ok, true);
  assert.equal(game.phase, "day");

  assert.ok(kill(game, "1", "night"));
  assert.equal(game.players["1"].alive, false);
  assert.equal(game.winner, null);

  assert.equal(executeByDecision(game, "2").ok, true);
  assert.equal(game.day.ended, true);
  assert.equal(game.winner, null, "no automatic win check in manual mode");

  assert.equal(endDay(game).ok, true);
  assert.equal(game.phase, "night");
  assert.deepEqual(game.night.queue, []);

  setWinner(game, "good", "manual");
  assert.equal(game.phase, "over");
  assert.equal(game.winner!.team, "good");
  assert.equal(game.winner!.reason, "manual");
  assert.deepEqual(validateState(game), []);
});

test("a mixed pool without manual-only mode is rejected before dealing (SYS-SCRIPTS-05)", () => {
  const game = mixedGame(5);
  game.script.manualOnly = false;
  const result = dealGame(game, { assignment: FIVE });
  assert.equal(result.ok, false);
  const errors = Array.isArray(result.errors) ? (result.errors as Array<{ code: string }>) : [];
  assert.ok(errors.some((error) => error.code === "mixed-edition"));
});

test("a same-edition custom script uses the supported Trouble Brewing engine (SYS-SCRIPTS-04)", () => {
  const game = createGame(7);
  game.script = {
    id: "custom-tb",
    name: "Custom TB",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ALL_ROLES.slice(),
  };
  game.scriptId = game.script.id;
  game.setup.count = 7;
  game.setup.roles = [
    "chef",
    "empath",
    "fortuneteller",
    "undertaker",
    "washerwoman",
    "poisoner",
    "imp",
  ];
  game.setup.bluffs = ["librarian", "investigator", "monk"];
  const assignment = {
    1: "chef",
    2: "empath",
    3: "fortuneteller",
    4: "undertaker",
    5: "washerwoman",
    6: "poisoner",
    7: "imp",
  };
  assert.equal(dealGame(game, { assignment }).ok, true);
  autoSecrets(game);
  assert.equal(startNight(game).ok, true);
  assert.ok(
    game.night.queue.some((step) => step.roleId === "chef"),
    "the automatic TB queue is used",
  );
});

test("an in-progress custom draft with fewer than five roles survives validation", () => {
  const game = createGame(8);
  game.script = {
    id: "custom-draft",
    name: "Draft",
    edition: "custom",
    source: "manual",
    author: "",
    roles: [],
    manualOnly: false,
  };
  game.scriptId = game.script.id;
  game.phase = "setup";
  assert.deepEqual(validateState(game), []);
  game.phase = "deal";
  assert.ok(validateState(game).some((error) => /script roster/.test(error)));
});

test("manual-only kills bypass automatic BMR protection", () => {
  const game = createGame(5);
  game.script = {
    id: "custom-mixed",
    name: "Mixed manual pool",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ["fool", "chambermaid", "goon", "poisoner", "fanggu"],
    manualOnly: true,
  };
  game.scriptId = game.script.id;
  game.setup.count = 5;
  game.setup.roles = ["fool", "chambermaid", "goon", "poisoner", "fanggu"];
  game.setup.bluffs = [];
  const assignment = {
    1: "fool",
    2: "chambermaid",
    3: "goon",
    4: "poisoner",
    5: "fanggu",
  };
  assert.equal(dealGame(game, { assignment }).ok, true);
  const death = kill(game, "1", "demon");
  assert.ok(death, "the host records the death directly");
  assert.equal(game.players["1"].alive, false);
  assert.equal(checkWin(game), null, "the host declares victory");
});

test("manual corrections survive validation and can be cleared", () => {
  const game = mixedGame(5);
  assert.equal(dealGame(game, { assignment: FIVE }).ok, true);
  assert.equal(
    manualCorrection(game, {
      kind: "alive",
      playerId: "1",
      value: false,
      reason: "manual test",
    }).ok,
    true,
  );
  assert.equal(game.players["1"].alive, false);
  assert.deepEqual(validateState(game), []);
});

test("an old custom draft id is normalized before validation", () => {
  const game = createGame(8);
  game.script = {
    id: "custom",
    name: "Old draft",
    edition: "custom",
    source: "manual",
    roles: [],
  };
  game.scriptId = "custom";
  game.phase = "setup";
  normalizeScriptState(game);
  assert.equal(game.script.id, "custom-draft");
  assert.equal(game.scriptId, "custom-draft");
  assert.deepEqual(validateState(game), []);
});

test("an old mixed save receives the manual-only flag", () => {
  const game = mixedGame(5);
  delete game.script.manualOnly;
  normalizeScriptState(game);
  assert.equal(game.script.manualOnly, true);
  assert.deepEqual(validateState(game), []);
});

test("manual-only mode is rejected for a same-edition script (SYS-SCRIPTS-10)", () => {
  const game = createGame(7);
  const before = game.script;
  const result = applyCommand(game, {
    id: "same-edition-manual",
    type: "bagUpdate",
    payload: {
      patch: {
        script: {
          id: "custom-tb-manual",
          name: "Custom TB manual",
          edition: "custom",
          source: "manual",
          roles: ALL_ROLES.slice(),
          manualOnly: true,
        },
      },
    },
  });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "error.79");
  assert.equal(game.script, before, "the previous script stays selected");
});

test("a same-edition custom script keeps automatic win resolution (SYS-SCRIPTS-10)", () => {
  const game = createGame(5);
  game.script = {
    id: "custom-tb-win",
    name: "Custom TB win",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ALL_ROLES.slice(),
  };
  game.scriptId = game.script.id;
  game.setup.count = 5;
  game.setup.roles = ["chef", "empath", "fortuneteller", "poisoner", "imp"];
  game.setup.bluffs = [];
  const assignment = {
    1: "chef",
    2: "empath",
    3: "fortuneteller",
    4: "poisoner",
    5: "imp",
  };
  assert.equal(dealGame(game, { assignment }).ok, true);
  autoSecrets(game);
  assert.equal(game.script.manualOnly, undefined, "the automatic engine stays selected");
  assert.equal(startNight(game).ok, true);
  assert.ok(game.night.queue.length > 0, "the automatic night queue is built");

  kill(game, "4", "ability");
  kill(game, "5", "ability");
  const winner = game.winner || checkWin(game);
  assert.equal(winner?.team, "good", "the automatic demon-dead win runs");
  assert.equal(game.phase, "over");
});
