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
import { EVIL_TWIN_SHOWN_RULESET_VERSION } from "./command-versions.ts";
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

// A Drunk shown the Sage: the death-triggered pair step exists, every pair is
// legal, and the true set is the killing Demon or the Recluse.
function drunkSage(): { state: GameState; step: NightStep } {
  const state = mixed(
    ["drunk", "mathematician", "sage", "recluse", "soldier", "imp", "poisoner", "monk"],
    {
      "1": "drunk",
      "2": "mathematician",
      "3": "soldier",
      "4": "recluse",
      "5": "chef",
      "6": "imp",
      "7": "poisoner",
      "8": "monk",
    },
  );
  state.setup.roles = [...new Set([...state.setup.roles, "sage"])];
  state.setup.drunkShownId = "sage";
  state.players["1"].shownRoleId = "sage";
  assert.ok(
    kill(
      state,
      "1",
      "ability",
      { phase: "night", number: 2 },
      { demon: true, ability: "imp", attackerId: "6" },
    ),
  );
  appendConditionalSteps(state);
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === "sage" && candidate.actorId === "1",
  );
  assert.ok(
    step,
    JSON.stringify(
      state.night.queue.map((candidate) => ({ role: candidate.roleId, actor: candidate.actorId })),
    ),
  );
  return { state, step };
}

test("a Demon completed before the Lunatic still marks the different attack (JINX-LUNATIC-07)", () => {
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
  const imp = stepFor(state, "imp");
  const lunatic = stepFor(state, "lunatic");
  assert.equal(completeStep(state, imp.key, { targetIds: ["4"] }).ok, true);
  assert.equal(state.abnormal.length, 0, "the mark waits for the Lunatic step");
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3"] }).ok, true);
  assert.equal(state.abnormal.length, 1);
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1);
});

test("the Mathematician's clear survives a later Lunatic completion (JINX-LUNATIC-09)", () => {
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
  const imp = stepFor(state, "imp");
  const mathematician = stepFor(state, "mathematician");
  const lunatic = stepFor(state, "lunatic");
  assert.equal(completeStep(state, imp.key, { targetIds: ["4"] }).ok, true);
  assert.equal(completeStep(state, mathematician.key, {}).ok, true);
  assert.equal(state.abnormal.length, 0);
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3"] }).ok, true);
  assert.equal(state.abnormal.length, 0, "the clear is not undone by a later Lunatic step");
});

test("a Demon that dies in its own step still marks the Lunatic comparison (JINX-LUNATIC-08)", () => {
  const state = mixed(
    ["lunatic", "mathematician", "scarletwoman", "chef", "empath", "soldier", "clockmaker", "imp"],
    {
      "1": "lunatic",
      "2": "mathematician",
      "3": "scarletwoman",
      "4": "chef",
      "5": "empath",
      "6": "soldier",
      "7": "clockmaker",
      "8": "imp",
    },
  );
  const lunatic = stepFor(state, "lunatic");
  const imp = stepFor(state, "imp");
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["4"] }).ok, true);
  assert.equal(completeStep(state, imp.key, { targetIds: ["8"] }).ok, true);
  assert.equal(state.players["8"].alive, false, "the Imp killed itself");
  assert.equal(state.players["3"].roleId, "imp", "the Scarlet Woman inherited");
  assert.equal(state.abnormal.length, 1, "the completed choice is still compared");
});

test("a Drunk shown the Sage wakes for the pair step and accepts any pair (JINX-DRUNK-07)", () => {
  const { state, step } = drunkSage();
  const info = infoForStep(state, step, {});
  assert.equal(info.kind, "player-pair");
  const options = info.options as string[];
  assert.ok(options.includes(["6", "5"].sort().join("|")), "the true pair is offered");
  assert.ok(options.includes(["7", "8"].sort().join("|")), "a false pair is offered");
  const result = completeStep(state, step.key, {
    given: { kind: "player-pair", pair: ["7", "8"] },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(step.registrations?.["4"], undefined, "a Drunk records no Recluse registration");
});

test("a Drunk shown the Sage given a true pair is not abnormal (JINX-DRUNK-08)", () => {
  const { state, step } = drunkSage();
  const result = completeStep(state, step.key, {
    given: { kind: "player-pair", pair: ["5", "6"] },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.abnormal.length, 0);
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 0);
});

test("a Drunk shown the Sage given a Recluse pair is not abnormal (JINX-DRUNK-09)", () => {
  const { state, step } = drunkSage();
  const result = completeStep(state, step.key, {
    given: { kind: "player-pair", pair: ["4", "5"] },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.abnormal.length, 0, "the Recluse may register as the Demon");
  assert.equal(step.registrations?.["4"], undefined);
});

test("a Drunk shown the Sage given a false pair is abnormal (JINX-DRUNK-10)", () => {
  const { state, step } = drunkSage();
  const result = completeStep(state, step.key, {
    given: { kind: "player-pair", pair: ["7", "8"] },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.abnormal.length, 1);
  const mathematician = stepFor(state, "mathematician");
  const answer = infoForStep(state, mathematician, {});
  assert.equal(answer.kind, "number");
  assert.equal(answer.value, 1);
});

test("the Sage's implied Recluse registration replays deterministically (JINX-SAGE-06, JINX-REPLAY-02)", () => {
  const state = createGame(8);
  const runtime = createRuntime();
  let sent = 0;
  const run = (
    type: Parameters<typeof applyCommand>[1]["type"],
    payload: Record<string, unknown> = {},
  ) => {
    const result = applyCommand(
      state,
      { id: "sage-replay-" + ++sent, type, payload, at: "2030-01-01T00:00:00.000Z" },
      runtime,
    );
    assert.equal(result.status, "allowed", type + ": " + JSON.stringify(result));
  };
  const assignment = {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  } as const;
  run("bagUpdate", {
    patch: {
      script: {
        id: "custom-sage-replay",
        name: "Sage replay",
        edition: "custom",
        source: "file",
        roles: [
          "sage",
          "recluse",
          "soldier",
          "monk",
          "chef",
          "empath",
          "poisoner",
          "imp",
          "clockmaker",
          "oracle",
          "ravenkeeper",
          "sailor",
        ],
      },
      count: 8,
      resetRoster: true,
      roles: Object.values(assignment),
      bluffs: ["clockmaker", "oracle", "ravenkeeper"],
    },
  });
  run("startGame", { options: { assignment } });
  run("startNight");
  const firstNight = state.night.queue.slice();
  for (const step of firstNight) {
    run(
      "completeNightStep",
      step.roleId === "poisoner" ? { key: step.key, targetIds: ["3"] } : { key: step.key },
    );
  }
  run("endNight");
  run("endDay");
  assert.equal(state.night.number, 2);
  const imp = state.night.queue.find(
    (candidate) => candidate.roleId === "imp" && candidate.actorId === "8",
  );
  assert.ok(imp);
  run("completeNightStep", { key: imp.key, targetIds: ["1"] });
  const sage = state.night.queue.find(
    (candidate) => candidate.roleId === "sage" && candidate.actorId === "1",
  );
  assert.ok(sage, "the Demon's kill appends the Sage step");
  const info = infoForStep(state, sage, {});
  assert.equal(info.kind, "player-pair");
  const pair = (info.options as string[]).find(
    (option) => option.split("|").includes("2") && !option.split("|").includes("8"),
  );
  assert.ok(pair);
  run("completeNightStep", {
    key: sage.key,
    given: { kind: "player-pair", pair: pair.split("|") },
  });
  const completed = state.night.queue.find((candidate) => candidate.key === sage.key);
  assert.equal(completed?.registrations?.["2"], "demon");
  assert.equal(state.log.filter((entry) => entry.case === "registration").length, 1);
  const saved = canonicalState(state);
  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), saved);
});

test("a pre-change Imp attack journal keeps its death record and adds no Sage step (JINX-SAGE-07)", () => {
  const state = createGame(8);
  const runtime = createRuntime();
  const old = EVIL_TWIN_SHOWN_RULESET_VERSION;
  let sent = 0;
  const run = (
    type: Parameters<typeof applyCommand>[1]["type"],
    payload: Record<string, unknown> = {},
  ) => {
    const result = applyCommand(
      state,
      {
        id: "sage-old-" + ++sent,
        type,
        payload,
        at: "2030-01-01T00:00:00.000Z",
        rulesetVersion: old,
      },
      runtime,
    );
    assert.equal(result.status, "allowed", type + ": " + JSON.stringify(result));
  };
  const assignment = {
    "1": "sage",
    "2": "recluse",
    "3": "soldier",
    "4": "monk",
    "5": "chef",
    "6": "empath",
    "7": "poisoner",
    "8": "imp",
  } as const;
  run("bagUpdate", {
    patch: {
      script: {
        id: "custom-sage-old",
        name: "Sage old journal",
        edition: "custom",
        source: "file",
        roles: [
          "sage",
          "recluse",
          "soldier",
          "monk",
          "chef",
          "empath",
          "poisoner",
          "imp",
          "clockmaker",
          "oracle",
          "ravenkeeper",
          "sailor",
        ],
      },
      count: 8,
      resetRoster: true,
      roles: Object.values(assignment),
      bluffs: ["clockmaker", "oracle", "ravenkeeper"],
    },
  });
  run("startGame", { options: { assignment } });
  run("startNight");
  const firstNight = state.night.queue.slice();
  for (const step of firstNight) {
    run(
      "completeNightStep",
      step.roleId === "poisoner" ? { key: step.key, targetIds: ["3"] } : { key: step.key },
    );
  }
  run("endNight");
  run("endDay");
  assert.equal(state.night.number, 2);
  const imp = state.night.queue.find(
    (candidate) => candidate.roleId === "imp" && candidate.actorId === "8",
  );
  assert.ok(imp);
  run("completeNightStep", { key: imp.key, targetIds: ["1"] });
  const death = state.deaths.find((entry) => entry.playerId === "1");
  assert.ok(death);
  assert.equal(death.attackerId, "8", "the old version already recorded the attacker");
  assert.equal("demon" in death, false, "the old version did not record the Demon flag");
  assert.equal(
    state.night.queue.some((step) => step.roleId === "sage" && step.actorId === "1"),
    false,
    "the old journal adds no Sage step",
  );
  const saved = canonicalState(state);
  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), saved);
});
