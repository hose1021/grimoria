// Cross-role interaction checks that need more than one ability in the same
// night or day. Each expectation is taken from the pinned official text named in
// docs/rules-matrix.md, not from the current implementation.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, orderedPlayers, publicGameView, validateState } from "../model/state.ts";
import { deriveBagExtras } from "../model/presets.ts";
import {
  ALL_ROLES,
  BMR,
  BMR_ALL,
  SNV,
  SNV_ALL,
  TB,
  compositionFor,
  roleTeam,
} from "../model/rules.ts";
import {
  badMoonRisingScript,
  sectsAndVioletsScript,
  troubleBrewingScript,
} from "../model/scripts.ts";
import {
  applyCommand,
  buildSvNightQueue,
  chooseDemonHeir,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  execute,
  infoForStep,
  isImpaired,
  kill,
  moonchildChoice,
  nominate,
  openNominations,
  recordVotes,
  startNight,
  targetBounds,
  validateCommand,
} from "./index.ts";
import type { GameState, NightStep, RoleId, Script } from "../model/types.ts";
import type { InfoResult } from "./information.ts";

const EDITIONS: Record<string, { script: () => Script; table: typeof TB; all: RoleId[] }> = {
  tb: { script: troubleBrewingScript, table: TB, all: ALL_ROLES },
  bmr: { script: badMoonRisingScript, table: BMR, all: BMR_ALL },
  snv: { script: sectsAndVioletsScript, table: SNV, all: SNV_ALL },
};

// Builds a legal same-edition bag containing every requested role and deals
// the requested roles to their seats; the remaining seats come from the same
// composition and the setup extras are derived deterministically.
function make(
  scriptId: "tb" | "bmr" | "snv",
  assignment: Record<string, RoleId>,
  count: number,
): GameState {
  const edition = EDITIONS[scriptId];
  assert.ok(edition, scriptId);
  const state = createGame(count);
  state.script = edition.script();
  state.scriptId = scriptId;
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const have: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) have[roleTeam(id)!] += 1;
  const target = compositionFor(count, required);
  assert.ok(target, "a composition exists for " + count);
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"] as const) {
    const need = target[team] - have[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = edition.table[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles");
    roles.push(...pool.slice(0, need));
  }
  assert.equal(roles.length, count);
  state.setup.roles = roles;
  const extras = deriveBagExtras(count, roles, edition.all);
  state.setup.bluffs = extras.bluffs;
  state.setup.drunkShownId = extras.drunkShownId;
  state.setup.lunaticShownId = extras.lunaticShownId;
  state.setup.lunaticShownExplicit = extras.lunaticShownExplicit;
  state.setup.lunaticBluffs = extras.lunaticBluffs;
  state.setup.godfatherOutsider = extras.godfatherOutsider;
  state.setup.evilTwinGoodId = extras.evilTwinGoodId;
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) if (!full[id]) full[id] = spare.shift()!;
  const dealt = dealGame(state, { assignment: full });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function stepFor(state: GameState, roleId: RoleId): NightStep {
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === roleId && !candidate.skipped && !candidate.done,
  );
  assert.ok(step, roleId + " has an open step");
  return step;
}

function givenFor(info: InfoResult): Record<string, unknown> | undefined {
  if (!info.needsChoice) return undefined;
  const first = info.options?.[0];
  if (info.kind === "number") return { kind: "number", value: Number(first), needsChoice: false };
  if (info.kind === "yes-no") return { kind: "yes-no", value: Boolean(first), needsChoice: false };
  if (info.kind === "role-pair" || info.kind === "player-pair")
    return { kind: info.kind, pair: String(first).split("|"), needsChoice: false };
  if (info.kind === "character" || info.kind === "one-of-two")
    return { kind: info.kind, roleId: String(first), needsChoice: false };
  return { kind: info.kind, needsChoice: false };
}

// Completes every open step with legal defaults. `pukkaFirst` names the Pukka's
// first-night victim so a later choice can be the Moonchild.
function finishNight(state: GameState, pukkaFirst?: string): void {
  for (let guard = 0; guard < 80; guard += 1) {
    const pending = state.night.queue.find((step) => step.pending?.kind === "demon-inheritance");
    if (pending) {
      const option = pending.pending!.options?.[0] as { id: string } | undefined;
      assert.ok(option, "the pending inheritance offers an heir");
      assert.equal(chooseDemonHeir(state, pending.key, option.id).ok, true);
      continue;
    }
    const step = currentStep(state);
    if (!step) return;
    if (step.kind === "system") {
      assert.equal(completeStep(state, step.key, {}).ok, true);
      continue;
    }
    const pool = state.order.filter(
      (id) => state.players[id].alive && id !== step.actorId && id !== step.previousTarget,
    );
    let targetIds = pool.slice(0, targetBounds(step).min);
    if (step.roleId === "pukka" && state.night.number === 1 && pukkaFirst) targetIds = [pukkaFirst];
    const info = infoForStep(state, step, { targetIds });
    const given = givenFor(info);
    const payload: Record<string, unknown> = { targetIds };
    if (given) payload.given = given;
    if ((step.roleId === "sailor" || step.roleId === "innkeeper") && targetIds.length)
      payload.drunkId = targetIds[0];
    const result = completeStep(state, step.key, payload);
    assert.equal(result.ok, true, step.key + ": " + JSON.stringify(result));
  }
  assert.fail("night did not finish");
}

const wakeSteps = (state: GameState) =>
  state.night.queue.filter((step) => step.system === "demonchange");

const pendingOptions = (step: NightStep) =>
  ((step.pending?.options || []) as Array<{ id: string; roleId: RoleId }>).map(
    (option) => option.id,
  );

// Imp r3116 and Scarlet Woman r3117: "If five or more players are alive when the
// Imp kills themself at night, the Scarlet Woman must become the new Imp" and
// "the Demonhood must always pass to the Scarlet Woman first before any other
// Minions." Ten players, two Minions, so the threshold holds after the death.
test("a sober Scarlet Woman takes an Imp self-kill ahead of another living Minion (TB-IMP-01, TB-SCARLETWOMAN-01)", () => {
  const state = make(
    "tb",
    {
      1: "chef",
      2: "monk",
      3: "empath",
      4: "soldier",
      5: "virgin",
      6: "slayer",
      7: "mayor",
      8: "poisoner",
      9: "scarletwoman",
      10: "imp",
    },
    10,
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const poisoner = stepFor(state, "poisoner");
  assert.equal(completeStep(state, poisoner.key, { targetIds: ["1"] }).ok, true);
  const imp = stepFor(state, "imp");
  const logged = state.log.length;
  const result = completeStep(state, imp.key, { targetIds: ["10"] });

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.deaths.at(-1)!.cause, "imp-self-kill");
  assert.equal(state.players["9"].roleId, "imp", "the Scarlet Woman inherits first");
  assert.equal(state.players["8"].roleId, "poisoner", "the other Minion keeps its role");
  assert.equal(imp.pending, null, "no host heir choice is needed");
  assert.equal(state.winner, null, "the new Demon keeps the game alive");
  assert.deepEqual(
    state.log.slice(logged).map((line) => line.kind),
    ["death", "role-change", "night"],
  );
  assert.equal(wakeSteps(state).length, 1, "the new Imp is woken once");
  assert.equal(
    state.night.queue.filter((step) => step.roleId === "imp" && !step.done).length,
    0,
    "the new Imp does not act again that night",
  );
  assert.deepEqual(validateState(state), []);
  for (const secret of ["roleId", "shownRoleId", "bluffs", "notes", "effects"]) {
    assert.equal(JSON.stringify(publicGameView(state)).includes(secret), false);
  }
});

// Imp r3116 and Scarlet Woman r3117 with a poisoned Scarlet Woman: her ability
// does not take the role, so the host chooses any alive Minion. The chosen heir
// is the Imp, is woken once in the same night, and does not take the Imp turn.
test("a poisoned Scarlet Woman leaves the heir to the host, and the chosen Minion wakes once (TB-IMP-01, TB-SCARLETWOMAN-01, TB-SCARLETWOMAN-02)", () => {
  const state = make(
    "tb",
    {
      1: "chef",
      2: "monk",
      3: "empath",
      4: "soldier",
      5: "virgin",
      6: "slayer",
      7: "mayor",
      8: "poisoner",
      9: "scarletwoman",
      10: "imp",
    },
    10,
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const poisoner = stepFor(state, "poisoner");
  assert.equal(completeStep(state, poisoner.key, { targetIds: ["9"] }).ok, true);
  assert.equal(isImpaired(state, "9"), true, "the Scarlet Woman is poisoned");
  const imp = stepFor(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["10"] });

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(imp.pending?.kind, "demon-inheritance");
  assert.deepEqual(pendingOptions(imp).sort(), ["8", "9"], "both living Minions are offered");
  assert.equal(state.players["9"].roleId, "scarletwoman", "the impaired ability did not fire");
  assert.equal(state.winner, null, "the win check waits for the host's choice");

  assert.equal(chooseDemonHeir(state, imp.key, "9").ok, true);
  assert.equal(imp.pending, null);
  assert.equal(state.players["9"].roleId, "imp", "the chosen heir becomes the Imp");
  assert.equal(state.winner, null);
  assert.equal(wakeSteps(state).length, 1, "the new Imp is woken once that night");
  assert.equal(
    state.night.queue.filter((step) => step.roleId === "imp" && !step.done).length,
    0,
    "the new Imp does not act again that night",
  );
  const wake = wakeSteps(state)[0]!;
  assert.equal(completeStep(state, wake.key, {}).ok, true);
  assert.equal(wakeSteps(state).length, 1, "the wake is not repeated");

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(wakeSteps(state).length, 0, "no second YOU ARE wake the next night");
  assert.equal(stepFor(state, "imp").actorId, "9", "the new Imp takes its own next-night step");
  assert.deepEqual(validateState(state), []);
});

// Pukka r3074 example: "The Moonchild is executed, dies, and chooses the
// Courtier. That night, the Pukka chooses the Moonchild. The Courtier does not
// die because the Moonchild is poisoned." Moonchild r1783: the night-time state
// decides, not the healthy state when the choice was made.
test("a Pukka that poisons the dead Moonchild saves the Courtier (BMR-PUKKA-04, BMR-MOONCHILD-01)", () => {
  const state = make("bmr", { 1: "moonchild", 3: "courtier", 9: "pukka" }, 9);
  startNight(state);
  finishNight(state, "2");
  assert.equal(endNight(state).ok, true);

  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "4", "1");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const id = state.day.nominations[0]!.id;
  const alive = orderedPlayers(state)
    .filter((player) => player.alive)
    .map((player) => player.id);
  assert.equal(recordVotes(state, id, alive).ok, true);
  assert.equal(execute(state, id).ok, true);
  assert.equal(state.players["1"].alive, false, "the Moonchild is executed");
  assert.equal(isImpaired(state, "1"), false, "the choice is made sober and healthy");
  assert.equal(moonchildChoice(state, "3").ok, true, "the Moonchild chooses the Courtier");
  assert.equal(state.players["1"].used.moonchildTarget, "3");
  assert.equal(endDay(state).ok, true);

  const pukka = stepFor(state, "pukka");
  const result = completeStep(state, pukka.key, { targetIds: ["1"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(isImpaired(state, "1"), true, "the Pukka poisons the dead Moonchild tonight");

  const moonchild = stepFor(state, "moonchild");
  assert.equal(completeStep(state, moonchild.key, {}).ok, true);
  assert.equal(state.players["3"].alive, true, "the Courtier survives the poisoned curse");
  assert.equal(
    state.deaths.some((death) => death.playerId === "3"),
    false,
    "no death is recorded for the Courtier",
  );
  assert.equal(moonchild.noteKey, "note.abilityFailed");
  assert.deepEqual(validateState(state), []);
});

// Vortox r3017: "Townsfolk abilities yield false info." Oracle r2909: "Each
// night*, you learn how many dead players are evil." The true count must be
// absent from the offered answers and the host's false answer must be journaled
// as false information, not as a Spy/Recluse registration.
test("a living Vortox forces the Oracle's false answer and journals the reason (SNV-VORTOX-02, SNV-ORACLE-01)", () => {
  const state = make("snv", { 1: "oracle", 2: "cerenovus", 3: "vortox" }, 8);
  startNight(state);
  state.night.number = 2;
  state.night.queue = buildSvNightQueue(state);
  kill(state, "2", "test");
  const step = stepFor(state, "oracle");
  const info = infoForStep(state, step);

  assert.equal(info.needsChoice, true);
  assert.equal(info.falsifiedSuffix, true, "the Vortox makes the false answer mandatory");
  assert.equal(info.value, 1, "one dead evil player");
  assert.equal(info.options!.includes(1), false, "the true count is not offered");

  const rejected = validateCommand(state, {
    id: "vortox-true",
    type: "completeNightStep",
    payload: {
      key: step.key,
      targetIds: [],
      given: { kind: "number", value: 1, needsChoice: false },
    },
  });
  assert.notEqual(rejected.status, "allowed", "the true answer must be rejected");

  const falseValue = Number(info.options![0]);
  assert.notEqual(falseValue, 1);
  const seatsBefore = JSON.stringify(state.players);
  const effectsBefore = JSON.stringify(state.effects);
  const deathsBefore = JSON.stringify(state.deaths);
  const applied = applyCommand(state, {
    id: "vortox-false",
    type: "completeNightStep",
    payload: {
      key: step.key,
      targetIds: [],
      given: { kind: "number", value: falseValue, needsChoice: false },
    },
  });
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.deepEqual(state.night.queue.find((candidate) => candidate.key === step.key)!.given, {
    kind: "number",
    value: falseValue,
    needsChoice: false,
  });
  assert.equal(
    state.log.some((line) => line.case === "false-information" && line.secret === true),
    true,
    "the false-information reason is journaled in secret",
  );
  assert.equal(JSON.stringify(state.players), seatsBefore, "an answer changes no seat");
  assert.equal(JSON.stringify(state.effects), effectsBefore, "an answer adds no effect");
  assert.equal(JSON.stringify(state.deaths), deathsBefore, "an answer adds no death");
  assert.equal(
    JSON.stringify(publicGameView(state)).includes(String(falseValue)),
    false,
    "the answer stays out of the public view",
  );
  assert.deepEqual(validateState(state), []);
});
