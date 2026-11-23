import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCommand,
  canonicalState,
  createRuntime,
  replay,
  appendConditionalSteps,
  resolveDemonDeath,
  checkWin,
  completeStep,
  dayAt,
  infoForStep,
  kill,
  pruneDeadSteps,
  replaceCharacter,
  recordSvOutcome,
} from "./index.ts";
import { applyBmrGoonTrigger } from "./bmr.ts";
import { isImpaired } from "./effects.ts";
import { buildMixedNightQueue, makeRoleStep } from "./night.ts";
import { createGame } from "../model/state.ts";
import { systemPorts } from "../model/ports.ts";
import { roleTeam } from "../model/rules.ts";
import type { GameState, NightStep, RoleId } from "../model/types.ts";

function mixed(roles: RoleId[], assignment: Record<string, RoleId>): GameState {
  const count = Object.keys(assignment).length;
  const state = createGame(count);
  state.script = {
    id: "custom-jinx-proof",
    name: "Jinx proof",
    edition: "custom",
    source: "file",
    roles,
  };
  state.scriptId = state.script.id;
  state.setup.count = count;
  state.setup.roles = [...new Set(Object.values(assignment))];
  state.setup.bluffs = [];
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id];
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
  }
  state.phase = "night";
  state.night.number = 2;
  state.night.queue = buildMixedNightQueue(state);
  return state;
}

function stepFor(state: GameState, roleId: RoleId): NightStep {
  const step = state.night.queue.find((candidate) => candidate.roleId === roleId);
  assert.ok(step, roleId + " has no step");
  return step;
}

test("the Chambermaid counts the Mathematician's scheduled wake (JINX-CHAMBERMAID-01)", () => {
  const state = mixed(
    ["chambermaid", "mathematician", "soldier", "clockmaker", "chef", "poisoner", "imp"],
    {
      "1": "chambermaid",
      "2": "mathematician",
      "3": "soldier",
      "4": "clockmaker",
      "5": "chef",
      "6": "poisoner",
      "7": "imp",
    },
  );
  const step = stepFor(state, "chambermaid");
  const result = completeStep(state, step.key, { targetIds: ["2", "3"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(step.given, {
    kind: "number",
    value: 1,
    impaired: false,
    needsChoice: false,
    options: [],
  });
});

test("the Drunk's false information becomes a Mathematician abnormality (JINX-DRUNK-01)", () => {
  const state = mixed(
    ["drunk", "mathematician", "clockmaker", "soldier", "monk", "poisoner", "imp"],
    {
      "1": "drunk",
      "2": "mathematician",
      "3": "soldier",
      "4": "monk",
      "5": "poisoner",
      "6": "imp",
    },
  );
  state.setup.drunkShownId = "clockmaker";
  state.players["1"].shownRoleId = "clockmaker";
  state.night.number = 1;
  state.night.queue = buildMixedNightQueue(state);
  const drunk = stepFor(state, "clockmaker");
  assert.equal(drunk.actorId, "1");
  const info = infoForStep(state, drunk, {});
  const given =
    info.kind === "number" && Array.isArray(info.options) && info.options.length
      ? { kind: "number", value: info.options[0] as number }
      : undefined;
  const result = completeStep(state, drunk.key, given ? { given } : {});
  assert.equal(result.ok, true, JSON.stringify(result));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1);
});

test("the Lunatic's different attack becomes a Mathematician abnormality (JINX-LUNATIC-01)", () => {
  const state = mixed(
    ["lunatic", "mathematician", "chef", "empath", "soldier", "clockmaker", "poisoner", "imp"],
    {
      "1": "lunatic",
      "2": "mathematician",
      "3": "chef",
      "4": "empath",
      "5": "soldier",
      "6": "clockmaker",
      "7": "poisoner",
      "8": "imp",
    },
  );
  const lunatic = stepFor(state, "lunatic");
  const imp = stepFor(state, "imp");
  const lunaticResult = completeStep(state, lunatic.key, { targetIds: ["3"] });
  assert.equal(lunaticResult.ok, true, JSON.stringify(lunaticResult));
  const impResult = completeStep(state, imp.key, { targetIds: ["4"] });
  assert.equal(impResult.ok, true, JSON.stringify(impResult));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1, "the Lunatic is marked once");
});

test("the Fang Gu jump leaves the Scarlet Woman a Minion (JINX-FANGGU-01)", () => {
  const state = mixed(
    ["fanggu", "scarletwoman", "soldier", "monk", "chef", "empath", "clockmaker", "klutz"],
    {
      "1": "fanggu",
      "2": "scarletwoman",
      "3": "soldier",
      "4": "monk",
      "5": "chef",
      "6": "empath",
      "7": "clockmaker",
      "8": "klutz",
    },
  );
  const fanggu = stepFor(state, "fanggu");
  const outcome = recordSvOutcome(state, fanggu.key, { deathIds: ["8"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["2"].roleId, "scarletwoman");
  assert.equal(roleTeam(state.players["2"].roleId || ""), "minion");
  assert.equal(roleTeam(state.players["8"].roleId || ""), "demon");
});

test("an evil Goon made by the Pit-Hag cannot turn good (JINX-GOON-01)", () => {
  const state = mixed(["goon", "monk", "soldier", "chef", "empath", "baron", "imp"], {
    "1": "baron",
    "2": "monk",
    "3": "soldier",
    "4": "chef",
    "5": "empath",
    "6": "poisoner",
    "7": "imp",
  });
  state.night.queue = [];
  const changed = replaceCharacter(state, "1", "goon", { cause: "pithag" });
  assert.equal(changed.ok, true, JSON.stringify(changed));
  assert.equal(state.players["1"].team, "evil");
  const step = makeRoleStep(state, 0, "monk", state.players["2"]);
  const triggered = applyBmrGoonTrigger(state, step, ["1"]);
  assert.equal(triggered, true);
  assert.equal(state.players["1"].team, "evil", "the jinx blocks the good flip");
  assert.equal(isImpaired(state, "2"), true, "the chooser is still drunk");
});

test("a dead Mastermind retained by the Vigormortis still grants the extra day (JINX-MASTERMIND-01)", () => {
  const state = mixed(
    ["vigormortis", "mastermind", "soldier", "monk", "chef", "empath", "clockmaker"],
    {
      "1": "vigormortis",
      "2": "mastermind",
      "3": "soldier",
      "4": "monk",
      "5": "chef",
      "6": "empath",
      "7": "clockmaker",
    },
  );
  const night = { phase: "night" as const, number: 1 };
  const masterDeath = kill(state, "2", "ability", night, {
    demon: true,
    ability: "vigormortis",
  });
  assert.ok(masterDeath);
  state.phase = "day";
  state.day.number = 2;
  const vigDeath = kill(state, "1", "execution", dayAt(state), {});
  assert.ok(vigDeath);
  state.day.execution = {
    playerId: "1",
    cause: "vote",
    at: "2030-01-01T00:00:00.000Z",
    nominationId: null,
    deathId: vigDeath.id,
  };
  const winner = checkWin(state, {});
  assert.equal(winner, null, "the extra day suspends the win");
  assert.equal(state.mastermind?.active, true);
  assert.equal(state.mastermind?.playerId, "2");
});

test("the Recluse can be the Demon in the Sage's pair (JINX-SAGE-01)", () => {
  const state = mixed(["sage", "recluse", "soldier", "monk", "chef", "empath", "poisoner", "imp"], {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  });
  state.night.number = 2;
  state.night.queue = buildMixedNightQueue(state);
  const death = kill(
    state,
    "1",
    "ability",
    { phase: "night", number: 2 },
    {
      demon: true,
      ability: "imp",
      attackerId: "8",
    },
  );
  assert.ok(death);
  appendConditionalSteps(state);
  const sage = stepFor(state, "sage");
  const info = infoForStep(state, sage, {});
  assert.equal(info.kind, "player-pair");
  const reclusePair = ["2", "3"].sort().join("|");
  assert.ok(
    Array.isArray(info.options) && info.options.includes(reclusePair),
    "the Recluse pair is legal: " + JSON.stringify(info.options),
  );
  const neither = ["3", "4"].sort().join("|");
  assert.equal(
    Array.isArray(info.options) && info.options.includes(neither),
    false,
    "a pair without the Demon or the Recluse is not legal",
  );
});

test("a second living Demon blocks the Scarlet Woman's inheritance (JINX-FANGGU-02)", () => {
  const state = mixed(["po", "fanggu", "scarletwoman", "soldier", "monk", "chef", "empath"], {
    "1": "po",
    "2": "fanggu",
    "3": "scarletwoman",
    "4": "soldier",
    "5": "monk",
    "6": "chef",
    "7": "empath",
  });
  state.players["1"].alive = false;
  const outcome = resolveDemonDeath(state, {
    playerId: "1",
    roleId: "po",
    cause: "execution",
    livingBefore: 7,
  });
  assert.equal(outcome.inherited, false);
  assert.equal(state.players["3"].roleId, "scarletwoman");
});

test("a Drunk's failed non-information ability is a Mathematician abnormality (JINX-DRUNK-02)", () => {
  const state = mixed(["drunk", "mathematician", "monk", "clockmaker", "poisoner", "imp"], {
    "1": "drunk",
    "2": "mathematician",
    "3": "monk",
    "4": "clockmaker",
    "5": "poisoner",
    "6": "imp",
  });
  state.setup.drunkShownId = "monk";
  state.players["1"].shownRoleId = "monk";
  state.night.number = 2;
  state.night.queue = buildMixedNightQueue(state);
  const drunk = state.night.queue.find(
    (candidate) => candidate.roleId === "monk" && candidate.actorId === "1",
  );
  assert.ok(
    drunk,
    JSON.stringify(state.night.queue.map((step) => ({ role: step.roleId, actor: step.actorId }))),
  );
  const result = completeStep(state, drunk.key, { targetIds: ["4"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1);
});

test("the Mathematician's clear is not undone by the next completed step (JINX-LUNATIC-03)", () => {
  const state = mixed(
    ["lunatic", "mathematician", "chef", "empath", "soldier", "clockmaker", "poisoner", "imp"],
    {
      "1": "lunatic",
      "2": "mathematician",
      "3": "chef",
      "4": "empath",
      "5": "soldier",
      "6": "clockmaker",
      "7": "poisoner",
      "8": "imp",
    },
  );
  const lunatic = stepFor(state, "lunatic");
  const imp = stepFor(state, "imp");
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3"] }).ok, true);
  assert.equal(completeStep(state, imp.key, { targetIds: ["4"] }).ok, true);
  const mathematician = stepFor(state, "mathematician");
  const first = infoForStep(state, mathematician, {});
  assert.equal(first.kind, "number");
  assert.equal(first.value, 1);
  assert.equal(completeStep(state, mathematician.key, {}).ok, true);
  assert.equal(state.abnormal.length, 0);
  const poisoner = stepFor(state, "poisoner");
  assert.equal(completeStep(state, poisoner.key, { targetIds: ["5"] }).ok, true);
  assert.equal(state.abnormal.length, 0, "the clear survives a later completion");
});

test("a Lunatic killed before waking is not abnormal (JINX-LUNATIC-04)", () => {
  const state = mixed(
    ["lunatic", "mathematician", "chef", "empath", "soldier", "clockmaker", "poisoner", "imp"],
    {
      "1": "lunatic",
      "2": "mathematician",
      "3": "chef",
      "4": "empath",
      "5": "soldier",
      "6": "clockmaker",
      "7": "poisoner",
      "8": "imp",
    },
  );
  kill(state, "1", "ability", { phase: "night", number: 2 }, {});
  assert.equal(state.players["1"].alive, false);
  pruneDeadSteps(state, systemPorts);
  const lunatic = stepFor(state, "lunatic");
  assert.equal(lunatic.skipped, true);
  const imp = stepFor(state, "imp");
  assert.equal(completeStep(state, imp.key, { targetIds: ["3"] }).ok, true);
  assert.equal(state.abnormal.length, 0);
});

test("a Drunk given the true answer is not abnormal (JINX-DRUNK-03)", () => {
  const state = mixed(
    ["drunk", "mathematician", "clockmaker", "soldier", "monk", "poisoner", "imp"],
    {
      "1": "drunk",
      "2": "mathematician",
      "3": "soldier",
      "4": "monk",
      "5": "poisoner",
      "6": "imp",
    },
  );
  state.setup.drunkShownId = "clockmaker";
  state.players["1"].shownRoleId = "clockmaker";
  state.night.number = 1;
  state.night.queue = buildMixedNightQueue(state);
  const drunk = stepFor(state, "clockmaker");
  const info = infoForStep(state, drunk, {});
  assert.equal(info.kind, "number");
  assert.equal(typeof info.value, "number");
  const result = completeStep(state, drunk.key, {
    given: { kind: "number", value: info.value },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 0);
});

test("a Drunk may receive a true prepared one-of-two answer (JINX-DRUNK-04)", () => {
  const state = mixed(
    ["drunk", "mathematician", "washerwoman", "chef", "soldier", "monk", "poisoner", "imp"],
    {
      "1": "drunk",
      "2": "mathematician",
      "3": "chef",
      "4": "soldier",
      "5": "monk",
      "6": "poisoner",
      "7": "imp",
    },
  );
  state.setup.drunkShownId = "washerwoman";
  state.players["1"].shownRoleId = "washerwoman";
  state.setup.info.washerwoman = { roleId: "chef", pair: ["3", "4"], matchIndex: 0 };
  state.night.number = 1;
  state.night.queue = buildMixedNightQueue(state);
  const drunk = state.night.queue.find(
    (candidate) => candidate.actorId === "1" && candidate.roleId === "washerwoman",
  );
  assert.ok(drunk);
  const info = infoForStep(state, drunk, {});
  assert.equal(info.kind, "one-of-two");
  assert.equal(info.roleId, "chef");
  const result = completeStep(state, drunk.key, {
    given: { kind: "one-of-two", roleId: "chef", pair: ["3", "4"] },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 0, "true prepared information is not abnormal");
});

test("a Drunk accepting the synthetic false default is marked (JINX-DRUNK-05)", () => {
  const state = mixed(
    ["drunk", "mathematician", "washerwoman", "chef", "soldier", "monk", "poisoner", "imp"],
    {
      "1": "drunk",
      "2": "mathematician",
      "3": "chef",
      "4": "soldier",
      "5": "monk",
      "6": "poisoner",
      "7": "imp",
    },
  );
  state.setup.drunkShownId = "washerwoman";
  state.players["1"].shownRoleId = "washerwoman";
  state.night.number = 1;
  state.night.queue = buildMixedNightQueue(state);
  const drunk = state.night.queue.find(
    (candidate) => candidate.actorId === "1" && candidate.roleId === "washerwoman",
  );
  assert.ok(drunk);
  const info = infoForStep(state, drunk, {});
  assert.equal(info.kind, "one-of-two");
  const result = completeStep(state, drunk.key, {
    given: { kind: "one-of-two", roleId: info.roleId, pair: info.pair },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1, "the synthetic default is false information");
});

test("a Drunk giving another true one-of-two answer is not marked (JINX-DRUNK-06)", () => {
  const state = mixed(
    ["drunk", "mathematician", "washerwoman", "chef", "soldier", "monk", "poisoner", "imp"],
    {
      "1": "drunk",
      "2": "mathematician",
      "3": "chef",
      "4": "soldier",
      "5": "monk",
      "6": "poisoner",
      "7": "imp",
    },
  );
  state.setup.drunkShownId = "washerwoman";
  state.players["1"].shownRoleId = "washerwoman";
  state.setup.info.washerwoman = { roleId: "chef", pair: ["3", "4"], matchIndex: 0 };
  state.night.number = 1;
  state.night.queue = buildMixedNightQueue(state);
  const drunk = state.night.queue.find(
    (candidate) => candidate.actorId === "1" && candidate.roleId === "washerwoman",
  );
  assert.ok(drunk);
  const result = completeStep(state, drunk.key, {
    given: { kind: "one-of-two", roleId: "soldier", pair: ["3", "4"] },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 0, "one of the pair is the Soldier, so the answer is true");
});

test("a Lunatic and the Demon choosing the same protected target are not abnormal (JINX-LUNATIC-05)", () => {
  const state = mixed(["lunatic", "mathematician", "soldier", "chef", "monk", "poisoner", "imp"], {
    "1": "lunatic",
    "2": "mathematician",
    "3": "soldier",
    "4": "chef",
    "5": "monk",
    "6": "poisoner",
    "7": "imp",
  });
  const lunatic = stepFor(state, "lunatic");
  const imp = stepFor(state, "imp");
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3"] }).ok, true);
  assert.equal(completeStep(state, imp.key, { targetIds: ["3"] }).ok, true);
  assert.equal(state.abnormal.length, 0);
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 0);
});

test("a Mayor redirect compares the Demon's choice, not the death (JINX-LUNATIC-06)", () => {
  const state = mixed(["lunatic", "mathematician", "mayor", "chef", "monk", "poisoner", "imp"], {
    "1": "lunatic",
    "2": "mathematician",
    "3": "mayor",
    "4": "chef",
    "5": "monk",
    "6": "poisoner",
    "7": "imp",
  });
  const lunatic = stepFor(state, "lunatic");
  const imp = stepFor(state, "imp");
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["4"] }).ok, true);
  assert.equal(completeStep(state, imp.key, { targetIds: ["3"], redirectId: "4" }).ok, true);
  assert.equal(state.abnormal.length, 1, "the Demon chose the Mayor, not the redirected death");
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1);
});

test("a Drunk jinx game replays the same ABNORMAL ledger (JINX-REPLAY-01)", () => {
  const state = createGame(8);
  const runtime = createRuntime();
  let sent = 0;
  const run = (
    type: Parameters<typeof applyCommand>[1]["type"],
    payload: Record<string, unknown> = {},
  ) => {
    const result = applyCommand(
      state,
      { id: "jinx-replay-" + ++sent, type, payload, at: "2030-01-01T00:00:00.000Z" },
      runtime,
    );
    assert.equal(result.status, "allowed", type + ": " + JSON.stringify(result));
  };
  const assignment = {
    "1": "drunk",
    "2": "mathematician",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "poisoner",
    "7": "imp",
    "8": "artist",
  } as const;
  run("bagUpdate", {
    patch: {
      script: {
        id: "custom-jinx-replay",
        name: "Jinx replay",
        edition: "custom",
        source: "file",
        roles: [
          "drunk",
          "mathematician",
          "soldier",
          "monk",
          "chef",
          "poisoner",
          "imp",
          "artist",
          "clockmaker",
          "oracle",
          "ravenkeeper",
          "sailor",
        ],
      },
      count: 8,
      resetRoster: true,
      roles: Object.values(assignment),
      bluffs: ["oracle", "ravenkeeper", "sailor"],
      drunkShownId: "clockmaker",
    },
  });
  run("startGame", { options: { assignment } });
  run("startNight");
  const drunk = state.night.queue.find((candidate) => candidate.actorId === "1");
  assert.ok(
    drunk,
    JSON.stringify(state.night.queue.map((step) => ({ role: step.roleId, actor: step.actorId }))),
  );
  const info = infoForStep(state, drunk, {});
  assert.equal(info.kind, "number");
  const falseValue = (info.options as number[]).find((option) => option !== info.value);
  assert.notEqual(falseValue, undefined);
  run("completeNightStep", {
    key: drunk.key,
    given: { kind: "number", value: falseValue },
  });
  const mathematician = stepFor(state, "mathematician");
  assert.equal(infoForStep(state, mathematician, {}).value, 1);
  run("completeNightStep", {
    key: mathematician.key,
    given: { kind: "number", value: 1 },
  });
  assert.equal(state.abnormal.length, 0);
  const saved = canonicalState(state);
  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), saved);
});

test("an already recorded Sage registration is not written again (JINX-SAGE-05)", () => {
  const state = mixed(["sage", "recluse", "soldier", "monk", "chef", "empath", "poisoner", "imp"], {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  });
  kill(
    state,
    "1",
    "ability",
    { phase: "night", number: 2 },
    {
      demon: true,
      ability: "imp",
      attackerId: "8",
    },
  );
  appendConditionalSteps(state);
  const sage = stepFor(state, "sage");
  const info = infoForStep(state, sage, {});
  const pair = (info.options as string[]).find(
    (option) => option.split("|").includes("2") && !option.split("|").includes("8"),
  );
  assert.ok(pair);
  const result = completeStep(state, sage.key, {
    given: { kind: "player-pair", pair: pair.split("|") },
    registrations: { "2": "demon" },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(sage.registrations?.["2"], "demon");
  assert.equal(state.log.filter((entry) => entry.case === "registration").length, 1);
});

test("a Vortox Sage's Recluse pair records no registration (JINX-SAGE-03)", () => {
  const state = mixed(
    ["sage", "recluse", "vortox", "soldier", "monk", "chef", "poisoner", "empath"],
    {
      "1": "sage",
      "2": "recluse",
      "3": "soldier",
      "4": "monk",
      "5": "chef",
      "6": "empath",
      "7": "poisoner",
      "8": "vortox",
    },
  );
  kill(
    state,
    "1",
    "ability",
    { phase: "night", number: 2 },
    {
      demon: true,
      ability: "vortox",
      attackerId: "8",
    },
  );
  assert.equal(state.players["1"].alive, false);
  appendConditionalSteps(state);
  const sage = stepFor(state, "sage");
  const info = infoForStep(state, sage, {});
  assert.equal(info.kind, "player-pair");
  const pair = (info.options as string[]).find((option) => option.split("|").includes("2"));
  assert.ok(pair);
  const result = completeStep(state, sage.key, {
    given: { kind: "player-pair", pair: pair.split("|") },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(sage.registrations?.["2"], undefined);
  assert.equal(state.log.filter((entry) => entry.case === "registration").length, 0);
});

test("an impaired Sage's Recluse pair records no registration (JINX-SAGE-04)", () => {
  const state = mixed(["sage", "recluse", "soldier", "monk", "chef", "empath", "poisoner", "imp"], {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  });
  const poisoner = stepFor(state, "poisoner");
  assert.equal(completeStep(state, poisoner.key, { targetIds: ["1"] }).ok, true);
  assert.equal(isImpaired(state, "1"), true);
  kill(
    state,
    "1",
    "ability",
    { phase: "night", number: 2 },
    {
      demon: true,
      ability: "imp",
      attackerId: "8",
    },
  );
  appendConditionalSteps(state);
  const sage = stepFor(state, "sage");
  const info = infoForStep(state, sage, {});
  assert.equal(info.kind, "player-pair");
  const pair = (info.options as string[]).find(
    (option) => option.split("|").includes("2") && !option.split("|").includes("8"),
  );
  assert.ok(pair);
  const result = completeStep(state, sage.key, {
    given: { kind: "player-pair", pair: pair.split("|") },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(sage.registrations?.["2"], undefined);
  assert.equal(state.log.filter((entry) => entry.case === "registration").length, 0);
});

test("a Lunatic attack against a Demon that attacked nobody is abnormal (JINX-LUNATIC-02)", () => {
  const state = mixed(
    ["lunatic", "mathematician", "chef", "empath", "soldier", "clockmaker", "poisoner", "po"],
    {
      "1": "lunatic",
      "2": "mathematician",
      "3": "chef",
      "4": "empath",
      "5": "soldier",
      "6": "clockmaker",
      "7": "poisoner",
      "8": "po",
    },
  );
  const lunatic = stepFor(state, "lunatic");
  const po = stepFor(state, "po");
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3"] }).ok, true);
  assert.equal(completeStep(state, po.key, { targetIds: [] }).ok, true);
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1);
});

test("the Sage's Recluse pair records the implied registration (JINX-SAGE-02)", () => {
  const state = mixed(["sage", "recluse", "soldier", "monk", "chef", "empath", "poisoner", "imp"], {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  });
  state.night.number = 2;
  state.night.queue = buildMixedNightQueue(state);
  assert.ok(
    kill(
      state,
      "1",
      "ability",
      { phase: "night", number: 2 },
      {
        demon: true,
        ability: "imp",
        attackerId: "8",
      },
    ),
  );
  appendConditionalSteps(state);
  const sage = stepFor(state, "sage");
  const info = infoForStep(state, sage, {});
  assert.equal(info.kind, "player-pair");
  const pair = (info.options as string[]).find(
    (option) => option.split("|").includes("2") && !option.split("|").includes("8"),
  );
  assert.ok(pair);
  const result = completeStep(state, sage.key, {
    given: { kind: "player-pair", pair: pair.split("|") },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(sage.registrations?.["2"], "demon");
  const registrations = state.log.filter((entry) => entry.case === "registration");
  assert.equal(registrations.length, 1);
  assert.match(String(registrations[0].detail), /2.*demon/);

  const other = mixed(["sage", "recluse", "soldier", "monk", "chef", "empath", "poisoner", "imp"], {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  });
  other.night.number = 2;
  other.night.queue = buildMixedNightQueue(other);
  assert.ok(
    kill(
      other,
      "1",
      "ability",
      { phase: "night", number: 2 },
      { demon: true, ability: "imp", attackerId: "8" },
    ),
  );
  appendConditionalSteps(other);
  const otherSage = stepFor(other, "sage");
  const otherInfo = infoForStep(other, otherSage, {});
  const withDemon = (otherInfo.options as string[]).find(
    (option) => option.split("|").includes("2") && option.split("|").includes("8"),
  );
  assert.ok(withDemon);
  const otherResult = completeStep(other, otherSage.key, {
    given: { kind: "player-pair", pair: withDemon.split("|") },
  });
  assert.equal(otherResult.ok, true, JSON.stringify(otherResult));
  assert.equal(otherSage.registrations?.["2"], undefined);
  assert.equal(other.log.filter((entry) => entry.case === "registration").length, 0);
});
