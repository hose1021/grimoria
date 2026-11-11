// Issue #42: every discretionary decision is a named case with a Storyteller
// reason, only legal answers are accepted, and the choice is recorded.
import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, isGoodRole, roleTeam } from "../model/rules.ts";
import { createGame, orderedPlayers, publicGameView } from "../model/state.ts";
import { badMoonRisingScript, sectsAndVioletsScript } from "../model/scripts.ts";
import {
  HOST_CHOICE_CASES,
  HOST_CHOICE_REASONS,
  applyMadnessPenalty,
  autoSecrets,
  caseForStep,
  chefCount,
  completeStep,
  dealGame,
  infoForStep,
  startNight,
} from "./index.ts";
import type { GameState, NightStep, Script } from "../model/types.ts";

// `completeStep` unions its result with plain records; the assertions read the
// error list without narrowing, so name that view locally.
type StepOutcome = { ok: boolean; errorCode: string; error: string; step: NightStep };

function outcome<T>(value: T): T & StepOutcome {
  return value as T & StepOutcome;
}

function make(
  assignment: Record<string, string>,
  options: { count?: number; script?: () => Script } = {},
) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  if (options.script) {
    state.script = options.script();
    state.scriptId = options.script().id;
  }
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
  state.setup.count = count;
  state.setup.roles = roles;
  const pool = state.script ? state.script.roles : ALL_ROLES;
  const bluffPool = pool.filter((id) => isGoodRole(id) && !roles.includes(id));
  state.setup.bluffs = count >= 7 ? bluffPool.slice(0, 3) : [];
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  autoSecrets(state);
  return state;
}

function stepFor(state: GameState, roleId: string): NightStep {
  return state.night.queue.find((step) => step.roleId === roleId && !step.done)!;
}

function poison(state: GameState, playerId: string, sourceId = "7") {
  state.effects.push({
    id: "test-poison-" + playerId,
    kind: "poison",
    sourceId,
    targetId: playerId,
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
}

const seven = {
  1: "chef",
  2: "empath",
  3: "monk",
  4: "soldier",
  5: "mayor",
  6: "poisoner",
  7: "imp",
};

test("every host-choice case names its Storyteller reason", () => {
  for (const caseId of HOST_CHOICE_CASES) {
    assert.equal(typeof HOST_CHOICE_REASONS[caseId], "string", caseId);
    assert.ok(HOST_CHOICE_REASONS[caseId].length > 20, caseId + " reason is too short");
  }
  assert.equal(caseForStep({ roleId: "flowergirl" } as NightStep), "flowergirl-answer");
  assert.equal(caseForStep({ roleId: "towncrier" } as NightStep), "towncrier-answer");
  assert.equal(
    caseForStep({ roleId: "chef" } as NightStep, { impaired: true }),
    "false-information",
  );
  assert.equal(
    caseForStep({ roleId: "chef" } as NightStep, { impaired: false }),
    "registration-ambiguity",
  );
});

test("an answer outside the offered options is rejected and the step stays open", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  poison(state, "1");
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true, "an impaired Chef chooses the false answer");
  const rejected = outcome(
    completeStep(state, step.key, {
      given: { kind: "number", value: 99, needsChoice: false },
    }),
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.66");
  assert.equal(step.done, false, "a rejected answer leaves the step incomplete");
  assert.equal(
    state.log.some((entry) => entry.kind === "choice"),
    false,
    "a rejected answer records nothing",
  );
});

test("a legal answer is recorded with its case, reason and value", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  poison(state, "1");
  const info = infoForStep(state, step);
  const value = info.options![0];
  const accepted = completeStep(state, step.key, {
    given: { kind: "number", value, needsChoice: false },
  });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  const line = state.log.find((entry) => entry.kind === "choice");
  assert.ok(line, "the choice is in the journal");
  assert.equal(line.case, "false-information");
  assert.equal(line.secret, true, "the choice stays out of the public log view");
  assert.equal(line.title, HOST_CHOICE_REASONS["false-information"]);
  assert.equal(line.detail, String(value));
});

test("a Bad Moon Rising step with options rejects an answer outside them", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "exorcist",
      3: "gambler",
      4: "gossip",
      5: "tinker",
      6: "godfather",
      7: "zombuul",
    },
    { count: 7, script: badMoonRisingScript },
  );
  startNight(state);
  const step = stepFor(state, "chambermaid");
  assert.ok(step, "the Chambermaid has a step");
  poison(state, "1", "6");
  const targets = ["2", "3"];
  const info = infoForStep(state, step, { targetIds: targets });
  assert.ok(info.options!.length > 0, "the step offers numbers");
  const rejected = outcome(
    completeStep(state, step.key, {
      targetIds: targets,
      given: { kind: "number", value: 99, needsChoice: false },
    }),
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.66");
});

test("a registration for another character is rejected", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  const rejected = outcome(completeStep(state, step.key, { registrations: { 2: "evil" } }));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.67");
  assert.equal(step.done, false);
});

test("a registration value the abilities never read is rejected", () => {
  const state = make({ ...seven, 6: "spy", 7: "imp" });
  startNight(state);
  const spy = orderedPlayers(state).find((player) => player.roleId === "spy");
  assert.ok(spy, "the Spy is in play");
  const step = stepFor(state, "chef");
  const rejected = outcome(
    completeStep(state, step.key, { registrations: { [spy.id]: "townsfolk" } }),
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.67");
});

test("a legal Spy registration is recorded and changes what the ability sees", () => {
  const state = make({ ...seven, 6: "spy", 7: "imp" });
  startNight(state);
  const spy = orderedPlayers(state).find((player) => player.roleId === "spy")!;
  const plain = chefCount(state);
  const registered = chefCount(state, { [spy.id]: "good" });
  assert.equal(roleTeam("spy"), "minion");
  assert.ok(registered <= plain, "a Spy registered as good cannot add evil pairs");

  const step = stepFor(state, "chef");
  const result = completeStep(state, step.key, { registrations: { [spy.id]: "good" } });
  assert.equal(result.ok, true, JSON.stringify(result));
  const line = state.log.find((entry) => entry.case === "registration");
  assert.ok(line, "the registration choice is recorded");
  assert.match(line.detail, /P6/, "the line names the player");
});

test("a rejected step writes no choice line", () => {
  const state = make(
    {
      1: "clockmaker",
      2: "oracle",
      3: "artist",
      4: "sage",
      5: "seamstress",
      6: "klutz",
      7: "nodashii",
      8: "witch",
    },
    { count: 8, script: sectsAndVioletsScript },
  );
  startNight(state);
  const step = stepFor(state, "seamstress");
  assert.ok(step, "the Seamstress has a step");
  poison(state, "5", "7");
  const info = infoForStep(state, step, { targetIds: ["1", "1"] });
  const given =
    Array.isArray(info.options) && info.options.length
      ? { kind: info.kind, value: info.options[0] }
      : { kind: "note", text: "fixture" };
  const rejected = completeStep(state, step.key, { targetIds: ["1", "1"], given });
  assert.equal(rejected.ok, false);
  assert.equal(step.done, false);
  assert.equal(
    state.log.some((entry) => entry.kind === "choice"),
    false,
    "a rejected step leaves no choice line",
  );
});

test("the madness penalty records its case", () => {
  const state = createGame(7);
  state.effects.push({
    id: "eff-madness-mutant-1",
    kind: "madness",
    madness: "mutant",
    roleId: null,
    sourceId: "1",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  state.phase = "day";
  state.day = {
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  const result = applyMadnessPenalty(state, "1", "none", "was mad");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(state.log.some((entry) => entry.case === "madness-penalty"));
});

test("a host choice never reaches the public projection", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  poison(state, "1");
  const value = infoForStep(state, step).options![0];
  completeStep(state, step.key, { given: { kind: "number", value, needsChoice: false } });
  const view = JSON.stringify(publicGameView(state));
  assert.equal(view.includes("choice"), false);
  assert.equal(view.includes("registration-ambiguity"), false);
  assert.equal(view.includes(HOST_CHOICE_REASONS["false-information"]), false);
});
