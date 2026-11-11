// Issue #42: every discretionary decision is a named case with a Storyteller
// reason, only legal answers are accepted, and the choice is recorded.
import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, isGoodRole, roleTeam } from "./rules.js";
import { createGame, orderedPlayers } from "./model.js";
import {
  HOST_CHOICE_CASES,
  HOST_CHOICE_REASONS,
  autoSecrets,
  caseForStep,
  chefCount,
  completeStep,
  dealGame,
  infoForStep,
  startNight,
} from "./engine.js";

function make(assignment, options = {}) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
  state.setup.count = count;
  state.setup.roles = roles;
  const bluffPool = ALL_ROLES.filter((id) => isGoodRole(id) && !roles.includes(id));
  state.setup.bluffs = count >= 7 ? bluffPool.slice(0, 3) : [];
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  autoSecrets(state);
  return state;
}

function stepFor(state, roleId) {
  return state.night.queue.find((step) => step.roleId === roleId && !step.done);
}

function poison(state, playerId) {
  state.effects.push({
    id: "test-poison-" + playerId,
    kind: "poison",
    sourceId: "7",
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
  assert.equal(caseForStep({ roleId: "dreamer" }), "dreamer-pair");
  assert.equal(caseForStep({ roleId: "flowergirl" }), "flowergirl-answer");
  assert.equal(caseForStep({ roleId: "towncrier" }), "towncrier-answer");
  assert.equal(caseForStep({ roleId: "mathematician" }), "mathematician-count");
  assert.equal(caseForStep({ roleId: "chef" }), "false-information");
});

test("an answer outside the offered options is rejected and the step stays open", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  poison(state, "1");
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true, "an impaired Chef chooses the false answer");
  const rejected = completeStep(state, step.key, {
    given: { kind: "number", value: 99, needsChoice: false },
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.66");
  assert.equal(step.done, false, "a rejected answer leaves the step incomplete");
});

test("a legal answer is recorded with its case, reason and value", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  poison(state, "1");
  const info = infoForStep(state, step);
  const value = info.options[0];
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

test("a registration for another character is rejected", () => {
  const state = make(seven);
  startNight(state);
  const step = stepFor(state, "chef");
  const rejected = completeStep(state, step.key, { registrations: { 2: "evil" } });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.67");
  assert.equal(step.done, false);
});

test("a registration value the ability never reads is rejected", () => {
  const state = make({ ...seven, 6: "spy", 7: "imp" });
  startNight(state);
  const spy = orderedPlayers(state).find((player) => player.roleId === "spy");
  assert.ok(spy, "the Spy is in play");
  const step = stepFor(state, "chef");
  const rejected = completeStep(state, step.key, { registrations: { [spy.id]: "demon" } });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.67");
});

test("a legal Spy registration changes what the ability sees", () => {
  const state = make({ ...seven, 6: "spy", 7: "imp" });
  startNight(state);
  const spy = orderedPlayers(state).find((player) => player.roleId === "spy");
  const plain = chefCount(state);
  const registered = chefCount(state, { [spy.id]: "good" });
  assert.equal(roleTeam("spy"), "minion");
  assert.ok(registered <= plain, "a Spy registered as good cannot add evil pairs");
});
