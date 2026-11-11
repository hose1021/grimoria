import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, isGoodRole } from "./rules.js";
import { clone, createGame, validateState } from "./model.js";
import { autoSecrets, dealGame, endDay, endNight, skipStep, startNight } from "./engine.js";
import {
  RULESET_VERSION,
  applyCommand,
  canonicalState,
  checkInvariants,
  previewCommand,
  replay,
  validateCommand,
} from "./engine.js";
import { CYCLIC_CASCADE, EVENT_PRIORITY, effectGraph, orderCascade } from "./effect-graph.js";
import { effectActive } from "./engine.js";

function make(assignment, options = {}) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
  state.setup.count = count;
  state.setup.roles = roles;
  const bluffPool = ALL_ROLES.filter(
    (id) => isGoodRole(id) && !roles.includes(id) && id !== options.drunkShownId,
  );
  state.setup.bluffs = count >= 7 ? bluffPool.slice(0, 3) : [];
  state.setup.drunkShownId = options.drunkShownId || null;
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  autoSecrets(state);
  return state;
}

function toDay(state) {
  const result = startNight(state);
  assert.equal(result.ok, true, JSON.stringify(result));
  while (state.night.queue.some((step) => !step.done && !step.skipped)) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    const result = skipStep(state, step.key, "test");
    assert.equal(result.ok, true, JSON.stringify(result));
  }
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  return state;
}

test("validate rejects an unknown command without touching the state", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);
  const result = validateCommand(state, { id: "c1", type: "notACommand" });
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "command-unknown");
  assert.deepEqual(canonicalState(state), before);
});

test("validate reports a Storyteller choice for a Mayor redirect", () => {
  const state = make({
    1: "mayor",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  endDay(state);
  const imp = state.night.queue.find((step) => step.roleId === "imp");
  assert.ok(imp, "imp step exists");
  const before = canonicalState(state);
  const result = validateCommand(state, {
    id: "c2",
    type: "completeStep",
    payload: { key: imp.key, options: { targetIds: ["1"] } },
  });
  assert.equal(result.status, "requires-storyteller-choice");
  assert.equal(result.choice.kind, "redirect");
  assert.ok(result.choice.options.some((option) => option.id === "2"));
  assert.deepEqual(canonicalState(state), before, "validate must not mutate");
});

test("preview reports consequences and delayed effects without mutating", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const poisoner = state.night.queue.find((step) => step.roleId === "poisoner");
  const before = canonicalState(state);
  const result = previewCommand(state, {
    id: "c3",
    type: "completeStep",
    payload: { key: poisoner.key, options: { targetIds: ["2"] } },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.ok(result.events.some((event) => event.type === "effect.added"));
  assert.ok(result.events.every((event) => event.commandId === "c3"));
  assert.ok(
    result.future.activeEffects.some(
      (effect) => effect.kind === "poison" && effect.targetId === "2",
    ),
  );
  assert.ok(
    result.future.delayedEffects.some((effect) => effect.kind === "poison" && effect.expires),
  );
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");
});

test("apply is atomic: a rejected correction leaves no record", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  state.corrections = [];
  const before = canonicalState(state);
  const bad = applyCommand(state, {
    id: "c4",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "missing", value: false, reason: "test" } },
  });
  assert.equal(bad.status, "rejected");
  assert.equal(state.corrections.length, 0, "the draft correction must be discarded");
  assert.deepEqual(canonicalState(state), before);

  const good = applyCommand(state, {
    id: "c5",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "1", value: false, reason: "test" } },
  });
  assert.equal(good.status, "allowed", JSON.stringify(good));
  assert.equal(state.corrections.length, 1);
  assert.equal(state.players["1"].alive, false);
});

test("apply is idempotent by command id and rejects id conflicts", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  const deaths = state.deaths.length;
  const first = applyCommand(state, {
    id: "kill-imp",
    type: "executeByDecision",
    payload: { playerId: "7" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.deaths.length, deaths + 1);
  const afterFirst = canonicalState(state);

  const second = applyCommand(state, {
    id: "kill-imp",
    type: "executeByDecision",
    payload: { playerId: "7" },
  });
  assert.equal(second.status, "allowed");
  assert.equal(second.idempotent, true);
  assert.deepEqual(canonicalState(state), afterFirst, "a repeated command must not apply twice");

  const conflict = applyCommand(state, { id: "kill-imp", type: "endDay" });
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");
});

test("invariants reject broken references and premature winners", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  assert.deepEqual(checkInvariants(state), []);

  const duplicateOrder = clone(state);
  duplicateOrder.order.push(duplicateOrder.order[0]);
  assert.ok(checkInvariants(duplicateOrder).length > 0);

  const brokenEffect = clone(state);
  brokenEffect.effects.push({
    id: "eff-x",
    kind: "poison",
    sourceId: "missing",
    targetId: "1",
    active: true,
  });
  assert.ok(checkInvariants(brokenEffect).length > 0);

  const prematureWinner = clone(state);
  prematureWinner.winner = { team: "good", reason: "test" };
  assert.ok(checkInvariants(prematureWinner).some((error) => /Победитель/.test(error)));
});

test("apply records command metadata but no event log in the state", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "chef");
  const result = applyCommand(state, {
    id: "c7",
    type: "completeStep",
    payload: { key: step.key },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.ok(result.events.length > 0);
  assert.ok(result.events.every((event) => event.commandId === "c7"));
  assert.equal(state.applied["c7"].type, "completeStep");
  assert.equal(state.applied["c7"].rulesetVersion, RULESET_VERSION);
  assert.equal(typeof state.applied["c7"].fingerprint, "string");
  assert.equal(Object.hasOwn(state, "events"), false);
});

test("canonical state compares the domain model, not serialization order", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const reordered = {
    ...state,
    players: Object.fromEntries(Object.entries(state.players).reverse()),
  };
  assert.deepEqual(canonicalState(state), canonicalState(reordered));
  const changed = clone(state);
  changed.players["1"].alive = false;
  assert.notDeepEqual(canonicalState(state), canonicalState(changed));
});

test("a legacy state without an action ledger accepts a command", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  delete state.applied;
  const result = applyCommand(state, { id: "legacy-1", type: "startNight" });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.applied["legacy-1"].type, "startNight");
  assert.deepEqual(validateState(state), []);
});

test("setup commands validate order, herring and bag patches", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);

  const duplicate = applyCommand(state, {
    id: "order-bad",
    type: "setOrder",
    payload: { order: [...state.order, state.order[0]] },
  });
  assert.equal(duplicate.status, "rejected");
  assert.deepEqual(canonicalState(state), before);

  const order = applyCommand(state, {
    id: "order-good",
    type: "setOrder",
    payload: { order: state.order.slice().reverse() },
  });
  assert.equal(order.status, "allowed", JSON.stringify(order));
  assert.deepEqual(state.order, ["7", "6", "5", "4", "3", "2", "1"]);

  const herring = applyCommand(state, {
    id: "herring-good",
    type: "setHerring",
    payload: { playerId: "1" },
  });
  assert.equal(herring.status, "allowed");
  assert.equal(state.setup.herringId, "1");

  const evilHerring = applyCommand(state, {
    id: "herring-bad",
    type: "setHerring",
    payload: { playerId: "6" },
  });
  assert.equal(evilHerring.status, "rejected");
  assert.equal(state.setup.herringId, "1");

  const cleared = applyCommand(state, {
    id: "herring-clear",
    type: "setHerring",
    payload: { playerId: null },
  });
  assert.equal(cleared.status, "allowed");
  assert.equal(state.setup.herringId, null);
});

test("bag updates normalize a draft and reject roles outside the script", () => {
  const state = createGame(8);
  const updated = applyCommand(state, {
    id: "bag-1",
    type: "bagUpdate",
    payload: {
      patch: {
        count: 7,
        resetRoster: true,
        roles: ["chef", "empath", "monk", "soldier", "mayor", "poisoner", "imp"],
      },
    },
  });
  assert.equal(updated.status, "allowed", JSON.stringify(updated));
  assert.equal(state.setup.count, 7);
  assert.equal(state.order.length, 7);
  assert.deepEqual(state.setup.roles, [
    "chef",
    "empath",
    "monk",
    "soldier",
    "mayor",
    "poisoner",
    "imp",
  ]);

  const before = canonicalState(state);
  const bad = applyCommand(state, {
    id: "bag-2",
    type: "bagUpdate",
    payload: { patch: { roles: ["pukka"] } },
  });
  assert.equal(bad.status, "rejected");
  assert.deepEqual(canonicalState(state), before);

  const draft = applyCommand(state, {
    id: "bag-3",
    type: "bagUpdate",
    payload: {
      patch: {
        script: { id: "custom-draft", name: "Custom", edition: "custom", roles: [] },
        count: 7,
        resetRoster: true,
        roles: [],
      },
    },
  });
  assert.equal(draft.status, "allowed", JSON.stringify(draft));
  assert.equal(state.script.id, "custom-draft");
  assert.deepEqual(state.setup.roles, []);
});

test("claimSeat is a command and a claimed seat cannot be claimed twice", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const first = applyCommand(state, {
    id: "claim-1",
    type: "claimSeat",
    payload: { playerId: "1", name: "Alice" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.players["1"].claimed, true);
  assert.equal(state.players["1"].name, "Alice");

  const second = applyCommand(state, {
    id: "claim-2",
    type: "claimSeat",
    payload: { playerId: "1", name: "Bob" },
  });
  assert.equal(second.status, "rejected");
  assert.equal(state.players["1"].name, "Alice");
});

test("a repeated command id with a different payload is rejected", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner");
  const first = applyCommand(state, {
    id: "fp-1",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  const before = canonicalState(state);

  const conflict = applyCommand(state, {
    id: "fp-1",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["3"] } },
  });
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");
  assert.deepEqual(canonicalState(state), before);
});

test("unsupported ruleset versions are rejected before any mutation", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);

  const bad = validateCommand(state, {
    id: "version-1",
    type: "startNight",
    rulesetVersion: "future-ruleset-9",
  });
  assert.equal(bad.status, "rejected");
  assert.equal(bad.errorCode, "ruleset-version-unsupported");
  assert.deepEqual(canonicalState(state), before);

  const good = validateCommand(state, {
    id: "version-2",
    type: "startNight",
    rulesetVersion: RULESET_VERSION,
  });
  assert.equal(good.status, "allowed", JSON.stringify(good));

  const implicit = validateCommand(state, { id: "version-3", type: "startNight" });
  assert.equal(implicit.status, "allowed", JSON.stringify(implicit));
});

test("preview and apply produce the same events under controlled determinism", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner");
  const command = {
    id: "determinism-1",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
    at: "2026-01-01T00:00:00.000Z",
  };

  const preview = previewCommand(state, command);
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.ok(preview.events.some((event) => event.type === "effect.added"));

  const target = clone(state);
  const applied = applyCommand(target, command);
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.deepEqual(preview.events, applied.events);
  assert.deepEqual(preview.changes, applied.changes);
});

test("preview and apply agree without an explicit command timestamp", async () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner");
  const command = {
    id: "determinism-no-at",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
  };

  const preview = previewCommand(state, command);
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  await new Promise((resolve) => setTimeout(resolve, 5));

  const target = clone(state);
  const applied = applyCommand(target, command);
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.deepEqual(preview.events, applied.events);
  assert.deepEqual(preview.changes, applied.changes);

  const previewEffect = preview.events.find((event) => event.type === "effect.added").payload
    .effect;
  const appliedEffect = target.effects.at(-1);
  assert.deepEqual(previewEffect, appliedEffect, "the domain consequence must match");
});

function poisonEffect(id, sourceId, targetId, night) {
  return {
    id,
    kind: "poison",
    sourceId,
    targetId,
    start: { phase: "night", number: night },
    expires: null,
    active: true,
  };
}

function drunkEffect(id, sourceId, targetId, night, expiresNight = null) {
  return {
    id,
    kind: "drunk",
    sourceId,
    targetId,
    start: { phase: "night", number: night },
    expires: expiresNight ? { phase: "night", number: expiresNight } : null,
    active: true,
  };
}

function poisonFixture() {
  return make({
    1: "poisoner",
    2: "imp",
    3: "chef",
    4: "empath",
    5: "monk",
    6: "soldier",
    7: "mayor",
  });
}

test("valid sequential mutual poison resolves in chronological order", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("poison-a-b", "1", "2", 1),
    poisonEffect("poison-b-a", "2", "1", 2),
  );
  const graph = effectGraph(state, { phase: "night", number: 2 });
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.activePoison.has("poison-a-b"), true);
  assert.equal(graph.activePoison.has("poison-b-a"), false);
  assert.equal(graph.impaired.has("2"), true);
  assert.equal(graph.impaired.has("1"), false);
});

test("same-night mutual poison is rejected as a cyclic dependency", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("cycle-a-b", "1", "2", 1),
    poisonEffect("cycle-b-a", "2", "1", 1),
  );
  const before = canonicalState(state);
  for (const run of [validateCommand, previewCommand, applyCommand]) {
    const result = run(state, { id: "cycle-" + run.name, type: "startNight" });
    assert.equal(result.status, "rejected", JSON.stringify(result));
    assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
    assert.deepEqual(canonicalState(state), before, "a rejected cycle must not mutate");
  }
});

test("a three-source poison cycle is rejected", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("cycle-1-2", "1", "2", 1),
    poisonEffect("cycle-2-3", "2", "3", 1),
    poisonEffect("cycle-3-1", "3", "1", 1),
  );
  const result = validateCommand(state, { id: "cycle-three", type: "startNight" });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
});

test("cyclic poison rejection does not depend on effect array order", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("order-a-b", "1", "2", 1),
    poisonEffect("order-b-a", "2", "1", 1),
  );
  const reversed = clone(state);
  reversed.effects.reverse();
  const one = validateCommand(state, { id: "cycle-order-1", type: "startNight" });
  const two = validateCommand(reversed, { id: "cycle-order-2", type: "startNight" });
  assert.equal(one.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.equal(two.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.deepEqual(one.errors, two.errors);
});

test("effect start and expiry bound impairing effects", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("future-poison", "1", "2", 2),
    drunkEffect("future-drunk", "3", "4", 2),
  );
  const before = effectGraph(state, { phase: "night", number: 1 });
  assert.equal(before.ok, true, JSON.stringify(before));
  assert.equal(before.activePoison.has("future-poison"), false);
  assert.equal(before.activeDrunk.has("future-drunk"), false);
  assert.equal(before.impaired.has("2"), false);
  assert.equal(before.impaired.has("4"), false);

  const started = effectGraph(state, { phase: "night", number: 2 });
  assert.equal(started.activePoison.has("future-poison"), true);
  assert.equal(started.activeDrunk.has("future-drunk"), true);
  assert.equal(started.impaired.has("2"), true);
  assert.equal(started.impaired.has("4"), true);
});

test("expired impairing effects stop impairing", () => {
  const state = poisonFixture();
  state.effects.push(
    { ...poisonEffect("exp-poison", "1", "2", 1), expires: { phase: "night", number: 2 } },
    drunkEffect("exp-drunk", "3", "4", 1, 2),
  );
  const before = effectGraph(state, { phase: "night", number: 1 });
  assert.equal(before.activePoison.has("exp-poison"), true);
  assert.equal(before.activeDrunk.has("exp-drunk"), true);

  const at = effectGraph(state, { phase: "night", number: 2 });
  assert.equal(at.activePoison.has("exp-poison"), false);
  assert.equal(at.activeDrunk.has("exp-drunk"), false);
  assert.equal(at.impaired.has("2"), false);
  assert.equal(at.impaired.has("4"), false);
});

test("a drunk effect suspends while its living source is impaired", () => {
  const state = poisonFixture();
  state.effects.push(drunkEffect("sailor-drunk", "1", "2", 1, 5), {
    ...poisonEffect("source-poison", "3", "1", 2),
    expires: { phase: "night", number: 4 },
  });
  const whilePoisoned = effectGraph(state, { phase: "night", number: 2 });
  assert.equal(whilePoisoned.activeDrunk.has("sailor-drunk"), false);
  assert.equal(whilePoisoned.impaired.has("2"), false);
  assert.equal(whilePoisoned.impaired.has("1"), true);

  const afterPoison = effectGraph(state, { phase: "night", number: 4 });
  assert.equal(afterPoison.activeDrunk.has("sailor-drunk"), true);
  assert.equal(afterPoison.impaired.has("2"), true);
});

test("a dead-source drunk effect stays active", () => {
  const state = poisonFixture();
  state.players["1"].alive = false;
  state.effects.push(drunkEffect("sweetheart-drunk", "1", "2", 1));
  const graph = effectGraph(state, { phase: "night", number: 2 });
  assert.equal(graph.activeDrunk.has("sweetheart-drunk"), true);
  assert.equal(graph.impaired.has("2"), true);
});

test("a source impaired by poison and drunk loses its own effects", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("hit-poison", "2", "1", 1),
    drunkEffect("hit-drunk", "3", "1", 1),
    poisonEffect("source-poison", "1", "4", 1),
    drunkEffect("source-drunk", "1", "5", 1),
  );
  const graph = effectGraph(state, { phase: "night", number: 1 });
  assert.equal(graph.impaired.has("1"), true);
  assert.equal(graph.activePoison.has("source-poison"), false);
  assert.equal(graph.activeDrunk.has("source-drunk"), false);
  assert.equal(graph.impaired.has("4"), false);
  assert.equal(graph.impaired.has("5"), false);
});

test("a mixed poison/drunk cycle is rejected", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("mix-poison", "1", "2", 1),
    drunkEffect("mix-drunk", "2", "1", 1),
  );
  const result = validateCommand(state, { id: "mix-cycle", type: "startNight" });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");

  const reversed = clone(state);
  reversed.effects.reverse();
  const mirrored = validateCommand(reversed, { id: "mix-cycle-reversed", type: "startNight" });
  assert.equal(mirrored.status, "rejected", JSON.stringify(mirrored));
  assert.equal(mirrored.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.deepEqual(result.errors, mirrored.errors);
});

test("a protected effect does not apply before its start", () => {
  const state = poisonFixture();
  state.effects.push({
    id: "future-protect",
    kind: "protected",
    sourceId: "1",
    targetId: "2",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  const effect = state.effects.at(-1);
  assert.equal(effectActive(state, effect, { phase: "night", number: 1 }), false);
  assert.equal(effectActive(state, effect, { phase: "night", number: 2 }), true);
});

// ---------------------------------------------------------------------------
// Shared event priority and cascade resolution (issue #29)

test("the shared event priority list is one ordered list for every script", () => {
  assert.deepEqual(Object.keys(EVENT_PRIORITY), [
    "death",
    "on-death",
    "delayed",
    "conditional-wake",
    "impairment",
    "win",
  ]);
  const values = Object.values(EVENT_PRIORITY);
  assert.deepEqual(
    values,
    [...values].sort((left, right) => left - right),
  );
  assert.equal(Object.isFrozen(EVENT_PRIORITY), true, "the list cannot be edited at runtime");
});

test("a cascade chain A to B to C resolves in one call", () => {
  const result = orderCascade([
    { key: "c", kind: "on-death", after: ["b"] },
    { key: "a", kind: "on-death" },
    { key: "b", kind: "on-death", after: ["a"] },
  ]);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(
    result.order.map((item) => item.key),
    ["a", "b", "c"],
  );
});

test("the cascade order does not depend on the insertion order", () => {
  const forward = [
    { key: "conditional-c", kind: "conditional-wake", after: ["delayed-b"] },
    { key: "death-a", kind: "death" },
    { key: "delayed-b", kind: "delayed", after: ["death-a"] },
  ];
  const reversed = [...forward].reverse().map((item) => ({ ...item }));
  const one = orderCascade(forward);
  const two = orderCascade(reversed);
  assert.equal(one.ok, true, JSON.stringify(one));
  assert.equal(two.ok, true, JSON.stringify(two));
  assert.deepEqual(
    one.order.map((item) => item.key),
    two.order.map((item) => item.key),
  );
  assert.deepEqual(
    one.order.map((item) => item.key),
    ["death-a", "delayed-b", "conditional-c"],
  );
});

test("a cyclic cascade is rejected with a typed error and leaves the input unchanged", () => {
  const items = [
    { key: "cascade-c", kind: "impairment", after: ["cascade-b"] },
    { key: "cascade-a", kind: "impairment", after: ["cascade-c"] },
    { key: "cascade-b", kind: "impairment", after: ["cascade-a"] },
  ];
  const snapshot = JSON.stringify(items);
  const forward = orderCascade(items);
  const backward = orderCascade([...items].reverse());
  assert.equal(forward.ok, false, JSON.stringify(forward));
  assert.equal(forward.errorCode, CYCLIC_CASCADE);
  assert.deepEqual(forward.keys, ["cascade-a", "cascade-b", "cascade-c"]);
  assert.equal(backward.ok, false);
  assert.deepEqual(backward.keys, forward.keys, "the reported cycle does not depend on order");
  assert.equal(JSON.stringify(items), snapshot, "the resolver never mutates its input");
});

test("an effect chain A to B to C resolves in one graph resolution", () => {
  const state = poisonFixture();
  state.effects.push(
    poisonEffect("chain-a-b", "1", "2", 1),
    poisonEffect("chain-b-c", "2", "3", 1),
  );
  const graph = effectGraph(state, { phase: "night", number: 1 });
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.activePoison.has("chain-a-b"), true);
  assert.equal(graph.activePoison.has("chain-b-c"), false, "B is impaired, so its poison is off");
  assert.equal(graph.impaired.has("2"), true);
  assert.equal(graph.impaired.has("3"), false);
});

test("the same effect set resolves identically in both insertion orders", () => {
  const forward = poisonFixture();
  forward.effects.push(
    poisonEffect("order-a-b", "1", "2", 1),
    drunkEffect("order-b-c", "2", "3", 1),
  );
  const reversed = clone(forward);
  reversed.effects.reverse();
  const one = effectGraph(forward, { phase: "night", number: 1 });
  const two = effectGraph(reversed, { phase: "night", number: 1 });
  assert.equal(one.ok, true, JSON.stringify(one));
  assert.equal(two.ok, true, JSON.stringify(two));
  assert.deepEqual([...one.activePoison].sort(), [...two.activePoison].sort());
  assert.deepEqual([...one.activeDrunk].sort(), [...two.activeDrunk].sort());
  assert.deepEqual([...one.impaired].sort(), [...two.impaired].sort());
});

// Issue #30: the recorded journal is the history. Replaying it must rebuild the
// saved state with the same pinned clock and seeded random values.
function replayFixture() {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const snapshots = [];
  const events = [];
  const run = (command) => {
    snapshots.push(canonicalState(state));
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", JSON.stringify(result));
    events.push(...(result.events || []));
  };
  run({ id: "journal-night", type: "startNight", at: "2026-02-01T20:00:00.000Z" });
  const poison = state.night.queue.find((step) => step.roleId === "poisoner");
  assert.ok(poison, "the Poisoner wakes");
  run({
    id: "journal-poison",
    type: "completeStep",
    payload: { key: poison.key, options: { targetIds: ["2"] } },
    at: "2026-02-01T20:05:00.000Z",
  });
  for (const step of state.night.queue.filter(
    (candidate) => !candidate.done && !candidate.skipped,
  )) {
    run({
      id: "journal-skip-" + step.key,
      type: "skipStep",
      payload: { key: step.key, reason: "replay fixture" },
      at: "2026-02-01T20:06:00.000Z",
    });
  }
  run({ id: "journal-dawn", type: "endNight", at: "2026-02-01T20:10:00.000Z" });
  run({
    id: "journal-execute",
    type: "executeByDecision",
    payload: { playerId: "7" },
    at: "2026-02-02T12:00:00.000Z",
  });
  return { state, snapshots, events };
}

test("replay rebuilds the saved state from the recorded journal", () => {
  const { state, snapshots, events } = replayFixture();
  const journal = state.journal;
  assert.ok(Array.isArray(journal.entries) && journal.entries.length > 0, "a journal is recorded");
  const poisonEntry = journal.entries.find((entry) => entry.id === "journal-poison");
  assert.equal(
    typeof poisonEntry.fingerprint,
    "string",
    "an entry keeps its canonical fingerprint",
  );
  assert.equal(poisonEntry.at, "2026-02-01T20:05:00.000Z", "an entry pins its resolved clock");
  assert.equal(poisonEntry.rulesetVersion, RULESET_VERSION);
  assert.deepEqual(
    poisonEntry.payload.options,
    { targetIds: ["2"] },
    "the host choice is recorded",
  );

  const replayed = replay(journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.deepEqual(
    canonicalState(replayed.state),
    canonicalState(state),
    "replaying the journal reproduces the saved state",
  );
  assert.deepEqual(replayed.events, events, "replaying the journal emits the recorded events");

  // Undo is the journal without its last entry, replayed from the same base.
  const undone = replay({
    base: journal.base,
    entries: journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  assert.deepEqual(
    canonicalState(undone.state),
    snapshots.at(-1),
    "undo plus replay equals the state before the undone command",
  );
  assert.notDeepEqual(canonicalState(undone.state), canonicalState(state));

  // Dependency check: the recorded completions cannot replay without startNight.
  const dependent = replay({ base: journal.base, entries: journal.entries.slice(1) });
  assert.equal(dependent.ok, false);
  assert.equal(dependent.errorCode, "journal-dependency");
  assert.ok(
    journal.entries.slice(1).some((entry) => entry.id === dependent.entryId),
    "the failing entry is named",
  );
});

test("a repeated command id appends no journal entry and no second effect", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const started = applyCommand(state, {
    id: "repeat-night",
    type: "startNight",
    at: "2026-02-03T20:00:00.000Z",
  });
  assert.equal(started.status, "allowed", JSON.stringify(started));
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner");
  const command = {
    id: "repeat-poison",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
    at: "2026-02-03T20:05:00.000Z",
  };
  const first = applyCommand(state, command);
  assert.equal(first.status, "allowed", JSON.stringify(first));
  const effects = state.effects.length;
  const entries = state.journal.entries.length;

  const second = applyCommand(state, command);
  assert.equal(second.idempotent, true);
  assert.equal(state.effects.length, effects, "a repeated step does not stack an effect");
  assert.equal(state.journal.entries.length, entries, "a repeated id appends no journal entry");
});

test("a rejected command never enters the journal", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const before = canonicalState(state);
  const result = applyCommand(state, {
    id: "rejected-journal",
    type: "completeStep",
    payload: { key: "missing-step" },
  });
  assert.equal(result.status, "rejected");
  assert.equal(state.journal.entries.length, 0, "a rejected command records nothing");
  assert.deepEqual(canonicalState(state), before);
});
