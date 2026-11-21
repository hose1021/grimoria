import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SNV,
  SNV_ALL,
  SV_NIGHT_FIRST,
  SV_NIGHT_OTHER,
  bagErrors,
  compositionFor,
  isSnvRole,
  isSupportedRole,
  randomBag,
  roleTeam,
} from "../model/rules.ts";
import {
  clone,
  createGame,
  exportGame,
  importGame,
  publicGameView,
  realTeamOf,
  setRoster,
  validateState,
} from "../model/state.ts";
import {
  applyCommand,
  appendConditionalSteps,
  tinkerDeath,
  useSlayer,
  buildSvNightQueue,
  canonicalState,
  checkWin,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  effectActive,
  executeByDecision,
  infoForStep,
  isImpaired,
  madnessEffects,
  activeMadness,
  madnessReviewsDue,
  MADNESS_PENALTIES,
  jugglerGuess,
  kill,
  nominate,
  openNominations,
  previewCommand,
  reconcileVigormortisPoison,
  recordKlutzChoice,
  recordSvOutcome,
  recordVotes,
  reportJugglerGuesses,
  replaceCharacter,
  replay,
  setupErrors,
  skipStep,
  startNight,
} from "./index.ts";
import { reconcileNoDashiiPoison } from "./index.ts";
import { minionRetainsAbility } from "./retention.ts";
import { parseScript, sectsAndVioletsScript } from "../model/scripts.ts";
import type { Command, GameState, NightStep, RoleId, Role } from "../model/types.ts";
import type { InfoResult } from "./index.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { systemPorts } from "../model/ports.ts";
import { ANY_STEP_RESURRECTS_RULESET_VERSION } from "./command-versions.ts";
import { FIRST_NIGHT_TINKER_RULESET_VERSION } from "./command-versions.ts";
import { OPEN_PITHAG_STEP_RULESET_VERSION } from "./command-versions.ts";

// A fixture skips a step as the recorded ruleset did, so its journal, notes and
// log ids stay the ones the expectations name.
const FIXTURE_PORTS: CommandExecutionContext = {
  ...systemPorts,
  rulesetVersion: ANY_STEP_RESURRECTS_RULESET_VERSION,
};

type MakeOptions = { count?: number };

// completeStep returns several structural shapes; this view names the fields
// the tests read after an ok/needsChoice assertion.
type StepOutcome = {
  ok: boolean;
  errorCode?: string;
  error?: string;
  needsChoice?: boolean;
  step?: NightStep;
};

function stepOutcome(value: unknown): StepOutcome {
  return value as StepOutcome;
}

function make(assignment: Record<string, RoleId>, options: MakeOptions = {}): GameState {
  const count = options.count || Object.keys(assignment).length;
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
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = SNV[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles for fixture");
    roles.push(...pool.slice(0, need));
  }
  state.setup.roles = roles;
  state.setup.bluffs = SNV_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  state.setup.evilTwinGoodId = roles.includes("eviltwin")
    ? roles.find((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider")!
    : null;
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) {
    if (!full[id]) full[id] = spare.shift()!;
  }
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function finishNight(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = currentStep(state);
    if (!step) return;
    const pool = state.order.filter((id) => state.players[id].alive && id !== step.actorId);
    const targets = pool.slice(0, step.minTargets || 0);
    const options: { targetIds: string[]; given?: Record<string, unknown> } = {
      targetIds: targets,
    };
    const info = infoForStep(state, step, { targetIds: targets });
    if (info.needsChoice) options.given = falseInfo(info);
    completeStep(state, step.key, options);
  }
  throw new Error("night did not finish");
}

test("Sects and Violets roster and composition follow the official data", () => {
  assert.equal(SNV_ALL.length, 25);
  assert.deepEqual(
    [SNV.townsfolk.length, SNV.outsider.length, SNV.minion.length, SNV.demon.length],
    [13, 4, 4, 4],
  );
  for (const id of SNV_ALL) assert.equal(isSnvRole(id), true);
  assert.equal(isSupportedRole("vanggu"), false);
  assert.equal(isSupportedRole("fanggu"), true);
  assert.deepEqual(compositionFor(8, ["fanggu"]), {
    townsfolk: 4,
    outsider: 2,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(compositionFor(8, ["vigormortis"]), {
    townsfolk: 6,
    outsider: 0,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(SV_NIGHT_FIRST, [
    "philosopher",
    "info",
    "snakecharmer",
    "eviltwin",
    "witch",
    "cerenovus",
    "clockmaker",
    "dreamer",
    "seamstress",
    "mathematician",
  ]);
  assert.equal(SV_NIGHT_OTHER.length, 19);
  assert.equal(SV_NIGHT_OTHER.at(-1), "mathematician");
});

test("random Sects and Violets bags are legal at every player count", () => {
  for (const count of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
    const bag = randomBag(count, Math.random, SNV_ALL);
    const errors = bagErrors({ count, roles: bag.roles, bluffs: bag.bluffs, pool: SNV_ALL });
    assert.deepEqual(errors, [], count + ": " + JSON.stringify(errors));
  }
});

test("a seven-player Vigormortis bag is legal with no Outsider to remove", () => {
  // Vigormortis r3015: "if there are no Outsider tokens to remove, do not add
  // a Townsfolk token". The base composition at seven players has no Outsider,
  // so the -1 Outsider changes nothing and the bag stays legal.
  assert.deepEqual(compositionFor(7, ["vigormortis"]), {
    townsfolk: 5,
    outsider: 0,
    minion: 1,
    demon: 1,
  });
  const roles: RoleId[] = [...SNV.townsfolk.slice(0, 5), SNV.minion[0]!, "vigormortis"];
  assert.equal(roles.length, 7);
  const bluffs = SNV_ALL.filter((id) => !roles.includes(id)).slice(0, 3);
  const errors = bagErrors({ count: 7, roles, bluffs, pool: SNV_ALL });
  assert.equal(
    errors.some((error) => error.code === "vigormortis-minus"),
    false,
    "the Vigormortis is not blamed for an Outsider it never removes",
  );
  assert.deepEqual(errors, []);
});

test("an Sects and Violets game deals, validates and builds the first night", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "vortox" }, { count: 7 });
  assert.deepEqual(setupErrors(state), []);
  assert.deepEqual(validateState(state), []);
  assert.equal(startNight(state).ok, true);
  const queue = state.night.queue.map((step) => step.roleId || step.system);
  assert.ok(queue.includes("minioninfo"));
  assert.ok(queue.includes("demoninfo"));
  assert.ok(queue.includes("eviltwin"));
  assert.ok(queue.includes("clockmaker"));
  assert.equal(queue.includes("witch"), false);
  assert.equal(
    infoForStep(
      state,
      state.night.queue.find((step) => step.roleId === "clockmaker")!,
    ).kind,
    "number",
  );
});

test("the Clockmaker learns the distance from the Demon to its nearest Minion (SNV-CLOCKMAKER-01)", () => {
  const state = make({ 1: "clockmaker", 7: "eviltwin", 6: "vortox" }, { count: 7 });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "clockmaker")!;
  const info = infoForStep(state, step);
  assert.equal(info.kind, "number");
  assert.equal(info.value, 1);
});

test("an impaired Clockmaker may still receive the true distance (SNV-CLOCKMAKER-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  state.effects.push({
    id: "clockmaker-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night" as const, number: 1 },
    expires: { phase: "night" as const, number: 2 },
    active: true,
  });
  const info = infoForStep(state, stepFor(state, "clockmaker"));
  assert.equal(info.needsChoice, true);
  assert.ok(
    info.options!.includes(info.value),
    "pinned: the Storyteller is not required to give incorrect information",
  );
  assert.equal(info.falsifiedSuffix, false, "impairment alone is not mandatory false info");
  assert.equal(info.mayBeFalseSuffix, true, "the host may give false or true information");
});

test("a living Vortox forbids the true Clockmaker distance (SNV-CLOCKMAKER-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(state);
  const info = infoForStep(state, stepFor(state, "clockmaker"));
  assert.equal(info.needsChoice, true);
  assert.equal(info.falsifiedSuffix, true, "under a Vortox the false answer is mandatory");
  assert.equal(info.mayBeFalseSuffix, false);
  assert.equal(
    info.options!.includes(info.value),
    false,
    "a living, unimpaired Vortox removes the true value",
  );
});

test("a drunk Sects and Violets Demon kills nobody (SNV-FANGGU-04)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.effects.push({
    id: "drunk-fanggu",
    kind: "drunk",
    sourceId: "2",
    targetId: "8",
    start: { phase: "night" as const, number: 2 },
    expires: null,
    active: true,
  });
  const step = stepFor(state, "fanggu");
  assert.equal(completeStep(state, step.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, false, "pinned: a poisoned Demon cannot kill anyone");
  assert.equal(outcome.errorCode, "error.52");
  assert.equal(state.players["1"].alive, true);
});

test("the Clockmaker counts a Minion who is dead (SNV-CLOCKMAKER-03)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  state.players["2"].alive = false;
  startNight(state);
  const info = infoForStep(state, stepFor(state, "clockmaker"));
  assert.equal(info.value, 2, "the distance ends at a Minion who is in play but dead");
});

test("the Clockmaker counts a Demon who is dead but in play (SNV-CLOCKMAKER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  state.players["8"].alive = false;
  startNight(state);
  const info = infoForStep(state, stepFor(state, "clockmaker"));
  assert.equal(info.value, 2, "the distance ends at the Demon in play, alive or dead");
});

test("an impaired Clockmaker under a living Vortox is offered only false numbers (SNV-CLOCKMAKER-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(state);
  state.effects.push({
    id: "clockmaker-poison-vortox",
    kind: "poison",
    sourceId: "2",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  const info = infoForStep(state, stepFor(state, "clockmaker"));
  assert.equal(info.needsChoice, true);
  assert.equal(info.falsifiedSuffix, true, "the Vortox keeps the answer mandatory false");
  assert.equal(info.mayBeFalseSuffix, false, "the impaired branch does not overwrite the Vortox");
  assert.equal(info.options!.includes(info.value), false, "the true distance is not offered");
  assert.ok(info.options!.length > 0, "a false distance remains available");
});

test("an impaired Clockmaker's answer is journaled as false information (SNV-CLOCKMAKER-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  state.effects.push({
    id: "clockmaker-poison-journal",
    kind: "poison",
    sourceId: "2",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  const step = stepFor(state, "clockmaker");
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true);
  const applied = applyCommand(state, {
    id: "clockmaker-impaired-answer",
    type: "completeNightStep",
    payload: {
      key: step.key,
      targetIds: [],
      given: { kind: "number", value: info.value, needsChoice: false },
    },
  });
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.equal(
    state.log.some((line) => line.case === "false-information" && line.secret === true),
    true,
    "the host's answer is journaled as false information in secret",
  );
});

test("the Clockmaker answer survives preview, apply, replay, undo and export (SNV-CLOCKMAKER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "clockmaker");
  const command: Command = {
    id: "clockmaker-answer-replay",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: [] },
    at: "2030-01-01T00:00:00.000Z",
  };
  const before = clone(state);
  const snapshot = clone(before);
  const base = clone(before);
  delete (base as Partial<GameState>).journal;
  state.journal = { base, entries: [] };
  state.applied = {};

  const preview = previewCommand(before, command) as { status: string };
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(
    canonicalState(before),
    canonicalState(snapshot),
    "preview leaves the canonical state unchanged",
  );

  const applied = applyCommand(state, command) as { status: string };
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.deepEqual(state.night.queue.find((candidate) => candidate.key === step.key)!.given, {
    kind: "number",
    value: 2,
    impaired: false,
    needsChoice: false,
    options: [],
    textKey: "note.sv.clockmaker",
    textVars: { value: 2 },
    falsifiedSuffix: false,
    mayBeFalseSuffix: false,
    text: "Расстояние от Демона до ближайшего Приспешника: 2.",
  });
  assert.equal(
    state.night.queue.find((candidate) => candidate.key === step.key)!.completedAt,
    command.at,
    "the step is stamped with the command time",
  );
  assert.equal(
    JSON.stringify(publicGameView(state)).includes("Расстояние от Демона"),
    false,
    "the answer stays out of the public view",
  );

  const replayed = replay({ base: clone(before), entries: state.journal.entries });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));

  const undone = replay({ base: clone(before), entries: state.journal.entries.slice(0, -1) });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), canonicalState(before));

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, JSON.stringify(restored));
  if (!restored.ok) return;
  assert.deepEqual(
    restored.state.night.queue.find((candidate) => candidate.roleId === "clockmaker")!.given,
    state.night.queue.find((candidate) => candidate.roleId === "clockmaker")!.given,
  );
});

test("executing the good Evil Twin wins the game for evil (SNV-EVILTWIN-01)", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "vortox" }, { count: 7 });
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
  executeByDecision(state, "1");
  assert.equal(state.winner!.team, "evil");
  assert.equal(state.winner!.reason, "evil-twin");
});

test("the Vortox wins when the day ends without an execution (SNV-VORTOX-01)", () => {
  const state = make({ 1: "clockmaker", 7: "vortox" }, { count: 7 });
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
  checkWin(state, { endOfDay: true });
  assert.equal(state.winner!.team, "evil");
  assert.equal(state.winner!.reason, "vortox");
});

test("the Witch curse kills the nominator but keeps the nomination (SNV-WITCH-01)", () => {
  const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const witch = state.night.queue.find((step) => step.roleId === "witch")!;
  assert.ok(witch);
  assert.equal(completeStep(state, witch.key, { targetIds: ["1"] }).ok, true);
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
  const result = nominate(state, "1", "2");
  assert.equal(result.ok, true);
  assert.equal(result.curse, true);
  assert.equal(result.nomination.nominatorId, "1");
  assert.equal(result.nomination.nomineeId, "2");
  assert.equal(state.players["1"].alive, false, "the cursed nominator dies");
  assert.equal(state.day.nominations.length, 1, "the nomination is still recorded");
  assert.equal(
    state.day.activeNominationId,
    result.nomination.id,
    "the nomination can still be voted on",
  );
  assert.equal(state.day.ended, false, "the game continues");
  const voters = state.order.filter((id) => state.players[id].alive);
  const votes = recordVotes(state, result.nomination.id, voters);
  assert.equal(votes.ok, true, votes.error);
  assert.equal(
    votes.nomination!.count,
    voters.length,
    "the surviving players still vote on the cursed nominator's nomination",
  );
});

test("the Witch curse lasts one day and may curse the same seat again (SNV-WITCH-01)", () => {
  const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const first = stepFor(state, "witch");
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
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
  const curse = state.effects.find((effect) => effect.kind === "witch")!;
  assert.equal(effectActive(state, curse, { phase: "day", number: 1 }), true);

  assert.equal(endDay(state).ok, true);
  assert.equal(
    effectActive(state, curse, { phase: "day", number: 2 }),
    false,
    "the curse lasts only the day it was placed for",
  );

  const second = stepFor(state, "witch");
  assert.equal(completeStep(state, second.key, { targetIds: ["2"] }).ok, true);
  const active = state.effects.filter((effect) => effect.kind === "witch" && effect.active);
  assert.equal(active.length, 1, "a repeated curse leaves one active Witch effect");
  assert.equal(active[0].targetId, "2");

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "2", "3");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  assert.equal(nomination.curse, true, "the repeated curse triggers again");
  assert.equal(state.players["2"].alive, false);
});

test("official Witch curse retains the Vigormortis exception and suspends on impairment", () => {
  const state = make({ 1: "clockmaker", 2: "witch", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const witch = stepFor(state, "witch");
  assert.equal(completeStep(state, witch.key, { targetIds: ["4"] }).ok, true);
  const vigo = stepFor(state, "vigormortis");
  assert.equal(completeStep(state, vigo.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordSvOutcome(state, vigo.key, { deathIds: ["2"] }).ok, true);
  const curse = state.effects.find((effect) => effect.kind === "witch" && effect.active)!;
  assert.ok(curse);
  state.phase = "day";
  state.day.number = 2;
  state.day.open = true;
  assert.equal(minionRetainsAbility(state, "2"), true);
  assert.equal(effectActive(state, curse), true);
  const poison = {
    id: "retained-witch-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "2",
    start: { phase: "day" as const, number: 2 },
    expires: null,
    active: true,
  };
  state.effects.push(poison);
  assert.equal(effectActive(state, curse), false);
  poison.active = false;
  assert.equal(effectActive(state, curse), true);
  assert.equal(nominate(state, "4", "5").curse, true);
  assert.equal(state.players["4"].alive, false);
});

test("official Witch curse stops while its source is dead, drunk or poisoned", () => {
  for (const condition of ["dead", "drunk", "poison"]) {
    const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
    startNight(state);
    const witch = state.night.queue.find((step) => step.roleId === "witch")!;
    assert.equal(completeStep(state, witch.key, { targetIds: ["1"] }).ok, true);
    if (condition === "dead") kill(state, "6", "test");
    else
      state.effects.push({
        id: "witch-impairment",
        kind: condition,
        sourceId: "7",
        targetId: "6",
        start: { phase: "day", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      });
    state.phase = "day";
    state.day.number = 1;
    state.day.open = true;
    const result = nominate(state, "1", "2");
    assert.equal(result.ok, true, condition);
    assert.equal(result.curse, false, condition);
    assert.equal(state.players["1"].alive, true, condition);
    assert.equal(state.day.nominations.length, 1);
  }
});

test("official Witch curse resumes when the Witch becomes healthy before nomination", () => {
  const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const witch = state.night.queue.find((step) => step.roleId === "witch")!;
  assert.equal(completeStep(state, witch.key, { targetIds: ["1"] }).ok, true);
  const poison = {
    id: "witch-recover",
    kind: "poison",
    sourceId: "7",
    targetId: "6",
    start: { phase: "day" as const, number: 1 },
    expires: { phase: "night" as const, number: 2 },
    active: true,
  };
  state.effects.push(poison);
  state.phase = "day";
  state.day.number = 1;
  state.day.open = true;
  assert.equal(isImpaired(state, "6"), true);
  poison.active = false;
  assert.equal(isImpaired(state, "6"), false);
  assert.equal(nominate(state, "1", "2").curse, true);
  assert.equal(state.players["1"].alive, false);
});

test("a placed Witch curse does not kill after the Witch dies or is impaired (SNV-WITCH-01)", () => {
  // States r1039 explicitly suspends an already placed Witch curse.
  for (const impair of ["dead", "poison"]) {
    const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
    startNight(state);
    const witch = state.night.queue.find((step) => step.roleId === "witch")!;
    completeStep(state, witch.key, { targetIds: ["1"] });
    if (impair === "dead") {
      state.players["6"].alive = false;
    } else {
      state.effects.push({
        id: "test-poison",
        kind: "poison",
        sourceId: "7",
        targetId: "6",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      });
    }
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
    const result = nominate(state, "1", "2");
    assert.equal(result.ok, true, impair);
    assert.equal(result.curse, false, impair + ": the placed curse is inactive");
    assert.equal(state.players["1"].alive, true, impair + ": the nominator survives");
    assert.equal(state.day.nominations.length, 1, impair + ": the nomination stands");
  }
});

test("the Witch loses a placed curse only when exactly three players live (SNV-WITCH-01)", () => {
  const state = make({ 1: "clockmaker", 6: "witch", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const witch = state.night.queue.find((step) => step.roleId === "witch")!;
  completeStep(state, witch.key, { targetIds: ["1"] });
  for (const id of ["2", "3", "4", "5"]) state.players[id].alive = false;
  assert.equal(state.order.filter((id) => state.players[id].alive).length, 3);
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
  const result = nominate(state, "1", "6");
  assert.equal(result.ok, true);
  assert.equal(result.curse, false, "with three living the Witch has no ability");
  assert.equal(state.players["1"].alive, true);
});

test("a Fang Gu attack on an already dead Outsider does not jump (SNV-FANGGU-03)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "fanggu");
  state.players["1"].alive = false;
  assert.equal(completeStep(state, step.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.deepEqual(outcome.deaths, [], "an already-dead target causes no death");
  assert.equal(state.players["1"].roleId, "klutz", "no jump without a death");
  assert.equal(state.players["8"].alive, true, "the Fang Gu does not die");
});

test("a protected Outsider does not become the new Fang Gu (SNV-FANGGU-01, BMR-TEALADY-01)", () => {
  const state = make(
    { 1: "clockmaker", 2: "klutz", 3: "artist", 4: "oracle", 8: "fanggu" },
    { count: 8 },
  );
  // A custom mixed script: the Tea Lady at seat 3 protects seat 2 on both
  // sides; seat 4 is good. The Fang Gu attacks the protected Outsider.
  laterNight(state);
  state.script.roles.push("tealady");
  state.players["3"].roleId = "tealady";
  state.players["3"].team = "good";
  state.players["4"].roleId = "clockmaker";
  state.players["4"].team = "good";
  const step = stepFor(state, "fanggu");
  assert.equal(recordSvOutcome(state, step.key, { deathIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, true, "the Tea Lady prevents the death");
  assert.equal(state.players["2"].roleId, "klutz", "a protected target does not jump");
  assert.equal(state.players["8"].alive, true, "the old Fang Gu does not die");
});

test("a first Outsider death makes the Outsider the new Fang Gu and kills the old Demon (SNV-FANGGU-01)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu")!;
  assert.ok(step, "Fang Gu wakes on a later night");
  completeStep(state, step.key, { targetIds: ["1"] });
  recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(state.players["1"].alive, true, "the Outsider survives as the new Fang Gu");
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["1"].team, "evil");
  assert.equal(state.players["7"].alive, false, "the old Demon dies");
  assert.equal(state.winner, null, "a Demon is still alive");
});

test("the new Fang Gu's death wins for good and a jump queues no Demon information (SNV-FANGGU-01)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu")!;
  assert.ok(step, "Fang Gu wakes on a later night");
  assert.equal(completeStep(state, step.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.winner === null, true, "a Demon is still alive");
  assert.equal(
    state.night.queue.some(
      (candidate) => candidate.system === "demoninfo" || candidate.system === "demonchange",
    ),
    false,
    "the jump wakes no new Demon-information step",
  );

  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  checkWin(state, {});
  assert.equal(state.winner?.team, "good", "killing the new Fang Gu leaves no living Demon");
  assert.equal(state.winner?.reason, "demon-dead");
});

test("the No Dashii poisons the nearest Townsfolk even when that seat is dead (SNV-NODASHII-01)", () => {
  const state = make(
    {
      2: "clockmaker",
      3: "dreamer",
      4: "nodashii",
      5: "artist",
      6: "juggler",
    },
    { count: 7 },
  );
  state.players["3"].alive = false;
  startNight(state);
  const poisoned = state.effects.filter((effect) => effect.kind === "poison");
  assert.equal(
    poisoned.some((effect) => effect.targetId === "3"),
    true,
    "the dead Townsfolk at seat 3 is still the nearest Townsfolk",
  );
  assert.equal(
    poisoned.some((effect) => effect.targetId === "2"),
    false,
    "the living Townsfolk farther away is not poisoned",
  );
});

test("the No Dashii poison ends when the No Dashii dies (SNV-NODASHII-02)", () => {
  const state = make(
    { 2: "clockmaker", 3: "dreamer", 4: "nodashii", 5: "artist", 6: "juggler" },
    { count: 7 },
  );
  startNight(state);
  const poisons = state.effects.filter(
    (effect) => effect.kind === "poison" && effect.sourceId === "4" && effect.active,
  );
  assert.ok(poisons.length > 0);
  kill(state, "4", "ability", { phase: "night", number: 1 }, { ability: "nodashii" });
  reconcileNoDashiiPoison(state);
  assert.ok(
    poisons.every((effect) => effect.active === false),
    "a dead No Dashii no longer poisons",
  );
});

test("No Dashii poison is reconciled when the source or a target changes character", () => {
  const state = make(
    {
      2: "clockmaker",
      3: "dreamer",
      4: "nodashii",
      5: "artist",
      6: "juggler",
    },
    { count: 7 },
  );
  startNight(state);
  const initial = state.effects.filter(
    (effect) => effect.kind === "poison" && effect.sourceId === "4",
  );
  assert.ok(initial.length > 0);
  state.players["4"].roleId = "vortox";
  reconcileNoDashiiPoison(state);
  assert.ok(
    initial.every((effect) => effect.active === false),
    "poison from a source that is no longer the No Dashii is removed",
  );

  const next = make(
    {
      2: "clockmaker",
      3: "dreamer",
      4: "nodashii",
      5: "artist",
      6: "juggler",
    },
    { count: 7 },
  );
  startNight(next);
  const before = next.effects.filter(
    (effect) => effect.kind === "poison" && effect.targetId === "3",
  );
  assert.ok(before.length);
  next.players["3"].roleId = "klutz";
  reconcileNoDashiiPoison(next);
  assert.ok(
    before.every((effect) => effect.active === false),
    "poison on a former Townsfolk target is removed",
  );
  assert.ok(
    next.effects.some(
      (effect) => effect.kind === "poison" && effect.targetId === "2" && effect.active,
    ),
    "the new nearest Townsfolk is poisoned",
  );
});

test("a custom all-Sects-and-Violets script is accepted and a mixed one is rejected", () => {
  const script = sectsAndVioletsScript();
  assert.equal(script.id, "snv");
  assert.equal(script.edition, "snv");
  assert.equal(script.roles.length, 25);
  assert.deepEqual(script.roles, SNV_ALL);
});

test("the Evil Twin setup requires a good twin", () => {
  const state = make({ 1: "clockmaker", 7: "eviltwin", 6: "vortox" }, { count: 7 });
  state.setup.evilTwinGoodId = null;
  assert.ok(setupErrors(state).some((error) => error.code === "evil-twin-good"));
});

test("the script parser accepts a full Sects and Violets custom script and rejects mixing", () => {
  const catalog: Role[] = SNV_ALL.flatMap((id) => {
    const team = roleTeam(id);
    return team ? [{ id, name: id, team, edition: "snv" }] : [];
  });
  catalog.push({ id: "washerwoman", name: "Washerwoman", team: "townsfolk", edition: "tb" });
  const all = parseScript(JSON.stringify(SNV_ALL.map((id) => ({ id }))), catalog);
  if (!all.ok) assert.fail(all.error);
  assert.equal(all.script.roles.length, 25);
  assert.equal(all.script.edition, "custom");
  const mixed = parseScript(
    JSON.stringify([...SNV_ALL.map((id) => ({ id })), { id: "washerwoman" }]),
    catalog,
  );
  if (mixed.ok) assert.fail("a mixed script must be rejected");
  assert.match(mixed.error, /Смешивать/);
});

test("the Fang Gu jump can happen only once per game (SNV-FANGGU-02)", () => {
  // Wiki r2974: "This can only happen once per game. If the new Fang Gu
  // attacks an Outsider, the Outsider dies as normal." The ONCE reminder
  // stays in the centre even if the Fang Gu dies or changes character.
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const otherOutsider = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId || "") === "outsider",
  )!;
  assert.ok(otherOutsider, "the +1 Outsider setup puts a second Outsider in play");
  const otherRole = state.players[otherOutsider].roleId;

  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  let step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "Fang Gu wakes on a later night");
  completeStep(state, step.key, { targetIds: ["1"] });
  recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["8"].alive, false);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  step = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(step, "the new Fang Gu wakes next night");
  assert.equal(step.actorId, "1");
  completeStep(state, step.key, { targetIds: [otherOutsider] });
  recordSvOutcome(state, step.key, { deathIds: [otherOutsider] });

  assert.equal(state.players[otherOutsider].alive, false, "the second Outsider dies as normal");
  assert.equal(
    state.players[otherOutsider].roleId,
    otherRole,
    "no second jump: the Outsider keeps its role",
  );
  assert.equal(state.players["1"].alive, true, "the new Fang Gu survives");
  assert.equal(state.players["1"].roleId, "fanggu");
});

test("redealing starts a fresh game with the Fang Gu limit available", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const assignment: Record<string, RoleId> = Object.fromEntries(
    state.order.map((id) => [id, state.players[id].roleId!]),
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu")!;
  completeStep(state, step.key, { targetIds: ["1"] });
  recordSvOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(state.fangguJumped, true);

  const rejected = dealGame(state, { assignment });
  assert.equal(rejected.ok, false, "a running game is not re-dealt");
  assert.equal("errorCode" in rejected ? rejected.errorCode : null, "error.47");
  assert.equal(state.fangguJumped, true, "the running game keeps its ONCE reminder");

  state.phase = "deal";
  const redeal = dealGame(state, { assignment });
  assert.equal(redeal.ok, true, JSON.stringify(redeal));
  assert.equal(state.fangguJumped, false, "a fresh deal clears the ONCE reminder");
  assert.equal(state.players["1"].roleId, "klutz");
  assert.equal(state.players["8"].roleId, "fanggu");
});

test("a save without the game-scoped flag still honours the old Fang Gu marker", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const otherOutsider = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId || "") === "outsider",
  )!;
  const otherRole = state.players[otherOutsider].roleId;

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);
  assert.equal(state.players["8"].used.fanggu, true, "the old code marked the acting Demon");

  // A save written before the game-scoped flag existed has only this marker.
  Reflect.deleteProperty(state, "fangguJumped");
  assert.deepEqual(validateState(state), []);

  nextNight(state);
  jumpFangGu(state, otherOutsider);

  assert.equal(state.players[otherOutsider].alive, false);
  assert.equal(state.players[otherOutsider].roleId, otherRole, "no second jump from a legacy save");
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.players["1"].roleId, "fanggu");
});

test("setRoster clears the Fang Gu limit and a fresh deal allows one jump", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const assignment: Record<string, RoleId> = Object.fromEntries(
    state.order.map((id) => [id, state.players[id].roleId!]),
  );
  const roles = state.setup.roles.slice();
  const bluffs = state.setup.bluffs.slice();

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);

  setRoster(state, 8);
  assert.equal(state.fangguJumped, false, "setRoster clears the ONCE reminder");
  state.setup.roles = roles;
  state.setup.bluffs = bluffs;
  const redeal = dealGame(state, { assignment });
  assert.equal(redeal.ok, true, JSON.stringify(redeal));

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true, "a fresh game allows its first jump");
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["8"].alive, false);
});

test("a bag reset clears the Fang Gu once-per-game limit", async () => {
  const { applyCommand } = await import("./index.ts");
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);

  const reset = applyCommand(state, {
    id: "reset-bag",
    type: "bagUpdate",
    payload: { patch: { count: 8 } },
  });
  assert.equal(reset.status, "allowed", JSON.stringify(reset));
  assert.equal(state.fangguJumped, false, "the setup reset clears the ONCE reminder");
  assert.equal(state.phase, "setup");
});

test("the Fang Gu limit survives an export and import", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  const otherOutsider = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId || "") === "outsider",
  )!;
  const otherRole = state.players[otherOutsider].roleId;

  reachFangGuNight(state);
  jumpFangGu(state, "1");
  assert.equal(state.fangguJumped, true);

  const restored = importGame(exportGame(state));
  if (!restored.ok) assert.fail(restored.error);
  assert.equal(restored.state.fangguJumped, true, "the ONCE reminder is persisted");

  const next = restored.state;
  nextNight(next);
  jumpFangGu(next, otherOutsider);

  assert.equal(next.players[otherOutsider].alive, false, "the second Outsider dies as normal");
  assert.equal(next.players[otherOutsider].roleId, otherRole);
  assert.equal(next.players["1"].alive, true);
  assert.equal(next.players["1"].roleId, "fanggu");
});

function reachFangGuNight(state: GameState): NightStep {
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu")!;
  assert.ok(step, "Fang Gu wakes on a later night");
  return step;
}

function jumpFangGu(state: GameState, targetId: string): void {
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu")!;
  assert.ok(step, "Fang Gu wakes on a later night");
  completeStep(state, step.key, { targetIds: [targetId] });
  recordSvOutcome(state, step.key, { deathIds: [targetId] });
}

function nextNight(state: GameState): void {
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

// ---------------------------------------------------------------------------
// Character and team replacements (Pit-Hag, Barber, Snake Charmer, Philosopher)

function reviewMadness(state: GameState): void {
  for (const effect of madnessReviewsDue(state)) {
    const result = applyCommand(state, {
      id: "test-madness-review-" + effect.id + "-" + state.day.number,
      type: "madnessPenalty",
      payload: {
        playerId: effect.targetId,
        effectId: effect.id,
        penalty: "none",
        reason: "The test Storyteller reviewed the player.",
      },
    });
    assert.equal(result.status, "allowed", JSON.stringify(result));
  }
}

function laterNight(state: GameState): NightStep[] {
  if (state.phase === "day") {
    reviewMadness(state);
    assert.equal(endDay(state).ok, true);
    return state.night.queue;
  }
  assert.equal(startNight(state).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  reviewMadness(state);
  assert.equal(endDay(state).ok, true);
  return state.night.queue;
}

function stepFor(state: GameState, roleId: string): NightStep {
  const step = state.night.queue.find((candidate) => candidate.roleId === roleId);
  assert.ok(step, roleId + " has a night step");
  return step;
}

function runStep(state: GameState, id: string, payload: Record<string, unknown>) {
  return applyCommand(state, { id, type: "completeNightStep", payload });
}

function rolesInPlay(state: GameState): Array<RoleId | null> {
  return Object.values(state.players).map((player) => player.roleId);
}

function assertNoDuplicateCharacters(state: GameState): void {
  const roles = rolesInPlay(state);
  assert.equal(
    new Set(roles).size,
    roles.length,
    "no duplicate characters: " + JSON.stringify(roles),
  );
}

test("the Pit-Hag replaces a character atomically (SNV-PITHAG-01)", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const target = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId || "") === "townsfolk",
  )!;
  const previous = state.players[target].roleId;
  // An evil character proves that the alignment does not follow the change.
  const roleId = SNV.minion.find((id) => !rolesInPlay(state).includes(id));
  assert.ok(roleId, "an absent Minion role exists");
  state.bluffs = [roleId, ...state.bluffs];

  const result = runStep(state, "pithag-create", { key: step.key, targetIds: [target], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players[target].roleId, roleId);
  assert.equal(state.players[target].shownRoleId, roleId);
  assert.equal(state.players[target].changedFrom, previous);
  assert.equal(state.players[target].team, "good", "the character changes, the alignment does not");
  assert.equal(state.bluffs.includes(roleId), false, "the new character leaves the bluffs");
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("a Pit-Hag replacement replays and undoes to its canonical state (SNV-PITHAG-01)", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const target = state.order.find(
    (id) => id !== "1" && roleTeam(state.players[id].roleId || "") === "townsfolk",
  )!;
  const previous = state.players[target].roleId;
  const roleId = SNV.minion.find((id) => !rolesInPlay(state).includes(id))!;
  // The fixture makes the new character a bluff so the journal proves the
  // replacement re-derives the bluff list instead of copying it.
  state.bluffs = [roleId, ...state.bluffs];
  const beforeBluffs = [...state.bluffs];
  const before = canonicalState(state);

  const result = runStep(state, "pithag-replay", { key: step.key, targetIds: [target], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  const live = canonicalState(state);

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), live, "the journal rebuilds the same state");
  assert.equal(replayed.state.players[target].roleId, roleId);
  assert.equal(replayed.state.players[target].shownRoleId, roleId);
  assert.equal(replayed.state.players[target].changedFrom, previous);
  assert.equal(
    replayed.state.bluffs.includes(roleId),
    false,
    "the rebuilt bluffs drop the new role",
  );
  assertNoDuplicateCharacters(replayed.state);

  const undone = replay({
    base: state.journal.base,
    entries: state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), before, "undo restores the journal base");
  assert.equal(undone.state.players[target].roleId, previous);
  assert.equal(undone.state.players[target].shownRoleId, previous);
  assert.equal(undone.state.players[target].changedFrom, null);
  assert.equal(undone.state.bluffs.includes(roleId), true, "undo restores the bluff list");
  assert.deepEqual(undone.state.bluffs, beforeBluffs, "undo restores the exact bluff order");
  assertNoDuplicateCharacters(undone.state);
});

test("the Pit-Hag choosing a character already in play records that nothing happens (SNV-PITHAG-01)", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  assert.ok(
    (step.roleChoices || []).includes("clockmaker"),
    "a character already in play stays selectable so the no-op is recordable",
  );
  const target = "2";
  const previous = state.players[target].roleId;

  const result = runStep(state, "pithag-duplicate", {
    key: step.key,
    targetIds: [target],
    roleId: "clockmaker",
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players[target].roleId, previous, "the character does not change");
  const finished = state.night.queue.find((candidate) => candidate.key === step.key)!;
  assert.equal(finished.done, true, "the step is complete");
  assert.equal(finished.noteKey, "note.pithagInPlay");
  assert.match(finished.note || "", /уже в игре/, "the host is told nothing happens");
  assertNoDuplicateCharacters(state);
});

test("a character created mid-game gains its start-knowing information that night (INFO-006, ROLE-PITHAG-003, SNV-PITHAG-01)", () => {
  const state = make(
    {
      1: "dreamer",
      2: "oracle",
      3: "artist",
      4: "savant",
      5: "mutant",
      6: "pithag",
      7: "fanggu",
      8: "sweetheart",
    },
    { count: 8 },
  );
  assert.equal(
    rolesInPlay(state).includes("clockmaker"),
    false,
    "the fixture keeps the Clockmaker out of play",
  );
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-clockmaker", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "clockmaker",
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.equal(state.players["3"].roleId, "clockmaker");
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "3",
  );
  assert.ok(step, "the Clockmaker created mid-game wakes at the point of creation");
  assert.equal(step.done, false);
  assert.ok(
    (step.order ?? 0) > (pithag.order ?? 0),
    "the new step follows the step that created the character",
  );
  const info = infoForStep(state, step);
  assert.equal(info.kind, "number", "the created Clockmaker learns its distance");
});

test("a character created mid-game by a dead Pit-Hag target gets no information (INFO-006, SNV-PITHAG-01)", () => {
  const state = make(
    {
      1: "dreamer",
      2: "oracle",
      3: "artist",
      4: "savant",
      5: "mutant",
      6: "pithag",
      7: "fanggu",
      8: "sweetheart",
    },
    { count: 8 },
  );
  laterNight(state);
  kill(state, "3", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-dead-clockmaker", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "clockmaker",
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.equal(state.players["3"].roleId, "clockmaker");
  assert.equal(
    state.night.queue.some(
      (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "3",
    ),
    false,
    "a dead character does not wake",
  );
});

test("a Vortox falsifies the information of a Clockmaker created mid-game (INFO-006, SNV-CLOCKMAKER-02)", () => {
  const state = make(
    {
      1: "dreamer",
      2: "oracle",
      3: "artist",
      4: "savant",
      5: "flowergirl",
      6: "pithag",
      7: "vortox",
      8: "mutant",
    },
    { count: 8 },
  );
  // A Vortox wins the day with no execution, so the fixture executes first.
  assert.equal(startNight(state).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(executeByDecision(state, "2").ok, true);
  reviewMadness(state);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.night.number, 2);
  assert.equal(state.winner, null);
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-vortox-clockmaker", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "clockmaker",
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "3",
  );
  assert.ok(step);
  const info = infoForStep(state, step);
  assert.equal(info.falsifiedSuffix, true, "a living Vortox forbids the true distance");
});

test("a Barber swap grants the start-knowing ability to the new holder (ROLE-BARBER-004, SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const result = runStep(state, "barber-swap-clockmaker", {
    key: barber.key,
    targetIds: ["1", "3"],
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["3"].roleId, "clockmaker");
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "3",
  );
  assert.ok(step, "a player who becomes a start-knowing character gains the ability now");
  assert.equal(step.done, false);
  assert.equal(infoForStep(state, step).kind, "number");
});

test("a Barber swap gives the new holder a fresh once-per-game ability (ROLE-BARBER-004)", () => {
  const state = make(
    { 1: "artist", 2: "barber", 3: "clockmaker", 6: "pithag", 8: "fanggu" },
    { count: 8 },
  );
  dayOne(state);
  const first = applyCommand(state, {
    id: "artist-before-swap",
    type: "artistQuestion",
    payload: { playerId: "1", question: "Is the Demon here?", answer: "yes" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.players["1"].used.artist, true, "the first Artist is spent");

  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const swapped = runStep(state, "barber-swap-artist", {
    key: barber.key,
    targetIds: ["1", "3"],
  });
  assert.equal(swapped.status, "allowed", JSON.stringify(swapped));
  assert.equal(state.players["3"].roleId, "artist");
  assert.equal(
    state.players["3"].used.artist,
    undefined,
    "the new holder has not spent the ability",
  );

  for (const remaining of state.night.queue) {
    if (!remaining.done && !remaining.skipped)
      skipStep(state, remaining.key, "test", FIXTURE_PORTS);
  }
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  const ask = applyCommand(state, {
    id: "artist-after-swap",
    type: "artistQuestion",
    payload: { playerId: "3", question: "Is the Demon here?", answer: "no" },
  });
  assert.equal(ask.status, "allowed", JSON.stringify(ask));
  assert.equal(state.players["3"].used.artist, true);
});

test("a Pit-Hag change that removes the Demon wins the game for good", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));

  const result = runStep(state, "pithag-demon", { key: step.key, targetIds: ["7"], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["7"].roleId, roleId);
  assert.equal(state.winner && state.winner.team, "good");
  assert.equal(state.winner!.reason, "demon-dead");
});

test("the Snake Charmer swaps characters and alignments with the chosen Demon (SNV-SNAKECHARMER-01)", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");

  const result = runStep(state, "snake-swap", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["6"].roleId, "fanggu");
  assert.equal(state.players["6"].team, "evil");
  assert.equal(state.players["7"].roleId, "snakecharmer");
  assert.equal(state.players["7"].team, "good");
  const poison = state.effects.find(
    (effect) => effect.kind === "poison" && effect.targetId === "7" && effect.active,
  );
  assert.ok(poison, "the new Snake Charmer is poisoned");
  assert.equal(poison.expires, null, "the poison is permanent");
  assertNoDuplicateCharacters(state);
  const demonStep = state.night.queue.find(
    (candidate) => candidate.roleId === "fanggu" && !candidate.done && !candidate.skipped,
  );
  assert.ok(demonStep, "the new Demon wakes tonight in the Demon slot");
  assert.equal(demonStep.actorId, "6");
  assert.equal(
    state.night.queue.filter(
      (candidate) => candidate.actorId === "7" && !candidate.done && !candidate.skipped,
    ).length,
    0,
    "the new Snake Charmer does not wake again this night",
  );
  assert.deepEqual(validateState(state), []);
});

test("a Snake Charmer swap replays and undoes with its poison and the new Demon wake (SNV-SNAKECHARMER-01)", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  const before = canonicalState(state);

  const result = runStep(state, "snake-replay", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  const live = canonicalState(state);

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), live, "the journal rebuilds the same state");
  assert.equal(replayed.state.players["6"].roleId, "fanggu");
  assert.equal(replayed.state.players["6"].team, "evil");
  assert.equal(replayed.state.players["7"].roleId, "snakecharmer");
  assert.equal(replayed.state.players["7"].team, "good");
  const rebuiltPoison = replayed.state.effects.find(
    (effect) => effect.kind === "poison" && effect.targetId === "7" && effect.active,
  );
  assert.ok(rebuiltPoison, "the permanent poison is rebuilt");
  assert.equal(rebuiltPoison.permanent, true);
  assert.equal(rebuiltPoison.expires, null, "the rebuilt poison is permanent");
  const rebuiltDemon = replayed.state.night.queue.find(
    (candidate) => candidate.roleId === "fanggu" && !candidate.done && !candidate.skipped,
  );
  assert.ok(rebuiltDemon, "the new Demon wakes tonight");
  assert.equal(rebuiltDemon.actorId, "6");
  assert.equal(
    replayed.state.night.queue.filter(
      (candidate) => candidate.actorId === "7" && !candidate.done && !candidate.skipped,
    ).length,
    0,
    "the new Snake Charmer does not wake again",
  );

  const undone = replay({
    base: state.journal.base,
    entries: state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), before, "undo restores the journal base");
  assert.equal(undone.state.players["6"].roleId, "snakecharmer");
  assert.equal(undone.state.players["6"].team, "good");
  assert.equal(undone.state.players["7"].roleId, "fanggu");
  assert.equal(undone.state.players["7"].team, "evil");
  assert.equal(
    undone.state.effects.some((effect) => effect.kind === "poison" && effect.targetId === "7"),
    false,
    "undo removes the permanent poison",
  );
  const restoredDemon = undone.state.night.queue.find(
    (candidate) => candidate.roleId === "fanggu" && !candidate.done && !candidate.skipped,
  );
  assert.ok(restoredDemon, "the original Demon wakes again after undo");
  assert.equal(restoredDemon.actorId, "7");
});

test("the Snake Charmer leaves a non-Demon target unchanged", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  const beforeTarget = state.players["1"].roleId;
  const beforeActor = state.players["6"].roleId;

  const result = runStep(state, "snake-non-demon", { key: step.key, targetIds: ["1"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].roleId, beforeTarget);
  assert.equal(state.players["6"].roleId, beforeActor);
  assert.equal(
    state.effects.some((effect) => effect.kind === "poison"),
    false,
    "no poison without a swap",
  );
});

test("the Snake Charmer cannot choose a dead player", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  state.players["7"].alive = false;

  const result = runStep(state, "snake-dead", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(result.errorCode, "error.55", "a dead target is rejected with error.55");
  assert.equal(state.players["6"].roleId, "snakecharmer");
  assert.equal(state.players["7"].roleId, "fanggu");
  assert.equal(
    state.effects.some((effect) => effect.kind === "poison"),
    false,
    "a dead target cannot be swapped",
  );
  assert.equal(state.night.queue.find((candidate) => candidate.key === step.key)!.done, false);
});

test("the Snake Charmer's poison outlives the new Demon", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  const result = runStep(state, "snake-permanent-poison", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(isImpaired(state, "7"), true, "the new Snake Charmer is poisoned");

  state.players["6"].alive = false;
  assert.equal(isImpaired(state, "7"), true, "the poison does not end when the Demon dies");
  assert.deepEqual(validateState(state), []);
});

test("a No Dashii reconcile keeps the Snake Charmer's permanent poison", () => {
  const state = make(
    { 1: "clockmaker", 2: "dreamer", 3: "artist", 4: "nodashii", 8: "snakecharmer" },
    { count: 8 },
  );
  laterNight(state);
  const step = stepFor(state, "snakecharmer");
  const result = runStep(state, "snake-nodashii", { key: step.key, targetIds: ["4"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["8"].roleId, "nodashii");
  assert.equal(state.players["4"].roleId, "snakecharmer");
  assert.equal(isImpaired(state, "4"), true, "poisoned right after the swap");

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const poison = state.effects.find(
    (effect) => effect.permanent === true && effect.targetId === "4",
  );
  assert.ok(poison);
  assert.equal(poison.active, true, "the No Dashii reconcile leaves it active");
  assert.equal(isImpaired(state, "4"), true, "the new Snake Charmer stays poisoned");
});

test("an evil Snake Charmer and the Demon both stay evil", () => {
  const state = make({ 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  state.players["6"].team = "evil";
  const step = stepFor(state, "snakecharmer");

  const result = runStep(state, "snake-evil", { key: step.key, targetIds: ["7"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["6"].roleId, "fanggu");
  assert.equal(state.players["6"].team, "evil");
  assert.equal(state.players["7"].roleId, "snakecharmer");
  assert.equal(state.players["7"].team, "evil");
});

test("a dead Barber's optional swap may be skipped (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  assert.equal(barber.optional, true, "the Barber's swap is a choice");
  const before = canonicalState(state);
  const skipped = skipStep(state, barber.key, "no swap");
  assert.equal(skipped.ok, true, JSON.stringify(skipped));
  assert.equal(barber.skipped, true);
  assert.notDeepEqual(canonicalState(state), before, "an allowed skip is recorded");
});

test("the Barber swap exchanges two characters after the Barber dies (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  // The fixture needs a dead Barber, not a Pit-Hag outcome: the arbitrary
  // deaths need a created Demon (Pit-Hag r2998).
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  assert.equal(state.players["2"].alive, false);

  const barber = stepFor(state, "barber");
  const before3 = state.players["3"].roleId;
  const before4 = state.players["4"].roleId;
  const team3 = state.players["3"].team;
  const team4 = state.players["4"].team;
  const result = runStep(state, "barber-swap", { key: barber.key, targetIds: ["3", "4"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["3"].roleId, before4);
  assert.equal(state.players["4"].roleId, before3);
  assert.equal(state.players["3"].team, team3, "a Barber swap does not change alignment");
  assert.equal(state.players["4"].team, team4, "a Barber swap does not change alignment");
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("a Barber swap after death replays and undoes with its conditional wake (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const previous1 = state.players["1"].roleId;
  const previous3 = state.players["3"].roleId;
  const team1 = state.players["1"].team;
  const team3 = state.players["3"].team;
  const before = canonicalState(state);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "clockmaker" && step.actorId === "3"),
    false,
    "the fixture has no Clockmaker step for seat 3 before the swap",
  );

  const result = runStep(state, "barber-replay", { key: barber.key, targetIds: ["1", "3"] });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["3"].roleId, "clockmaker");
  assert.equal(state.players["3"].shownRoleId, "clockmaker");
  assert.equal(state.players["3"].changedFrom, previous3);
  assert.equal(state.players["1"].roleId, previous3);
  assert.equal(state.players["1"].shownRoleId, previous3);
  assert.equal(state.players["1"].changedFrom, previous1);
  assert.equal(state.players["1"].team, team1, "the swap keeps seat 1's alignment");
  assert.equal(state.players["3"].team, team3, "the swap keeps seat 3's alignment");
  const live = canonicalState(state);

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), live, "the journal rebuilds the same state");
  assert.equal(replayed.state.players["3"].roleId, "clockmaker");
  assert.equal(replayed.state.players["1"].roleId, previous3);
  const wake = replayed.state.night.queue.find(
    (step) => step.roleId === "clockmaker" && step.actorId === "3",
  );
  assert.ok(wake, "the rebuilt queue grants the new Clockmaker its wake");
  assert.equal(wake.done, false);
  assert.equal(
    replayed.state.night.queue.some((step) => step.roleId === "barber" && step.done),
    true,
    "the rebuilt queue keeps the completed Barber step",
  );

  const undone = replay({
    base: state.journal.base,
    entries: state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), before, "undo restores the journal base");
  assert.equal(undone.state.players["1"].roleId, previous1);
  assert.equal(undone.state.players["1"].shownRoleId, previous1);
  assert.equal(undone.state.players["3"].roleId, previous3);
  assert.equal(undone.state.players["3"].shownRoleId, previous3);
  assert.equal(undone.state.players["1"].team, team1);
  assert.equal(undone.state.players["3"].team, team3);
  assert.equal(
    undone.state.night.queue.some((step) => step.roleId === "clockmaker" && step.actorId === "3"),
    false,
    "undo drops the conditional wake the swap appended",
  );
  assert.equal(
    undone.state.night.queue.find((step) => step.roleId === "barber")!.done,
    false,
    "undo reopens the Barber step",
  );
});

test("the Barber swap rejects the same player twice (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const before = canonicalState(state);
  const preview = previewCommand(state, {
    id: "barber-duplicate-preview",
    type: "completeNightStep",
    payload: { key: barber.key, targetIds: ["3", "3"] },
  });
  assert.equal(preview.status, "rejected", "a duplicate swap cannot preview as allowed");
  const rejected = runStep(state, "barber-duplicate", { key: barber.key, targetIds: ["3", "3"] });
  assert.equal(rejected.status, "rejected");
  assert.deepEqual(canonicalState(state), before, "a rejected swap changes no character");
  const applied = runStep(state, "barber-distinct", { key: barber.key, targetIds: ["3", "4"] });
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assertNoDuplicateCharacters(state);
});

test("a player who died and then became the Barber enables no swap (SNV-BARBER-02)", () => {
  const state = make({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(state, "2").ok, true);
  state.phase = "night";
  state.night.number = 3;
  state.night.queue = buildSvNightQueue(state);
  // Simulate the character change that happens after the death; the test is
  // the Barber gate, not the Pit-Hag legality.
  state.players["2"].roleId = "barber";
  appendConditionalSteps(state);
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "barber"),
    false,
    "the death happened before the character change",
  );
});

test("a Barber who died drunk enables no swap (SNV-BARBER-03)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.effects.push({
    id: "barber-drunk",
    kind: "drunk",
    sourceId: "8",
    targetId: "2",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "barber"),
    false,
    "a drunk player has no ability",
  );
});

test("the Barber rejects another Demon but allows the Demon to swap itself", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-second-demon", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "vortox",
    deathIds: ["2"],
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  const barber = stepFor(state, "barber");

  const rejected = runStep(state, "barber-two-demons", {
    key: barber.key,
    targetIds: ["3", "8"],
  });
  assert.equal(rejected.status, "rejected", JSON.stringify(rejected));
  assert.equal(state.players["3"].roleId, "vortox");

  const beforeDemon = state.players["3"].roleId;
  const before4 = state.players["4"].roleId;
  const ownSwap = runStep(state, "barber-self", { key: barber.key, targetIds: ["3", "4"] });
  assert.equal(ownSwap.status, "allowed", JSON.stringify(ownSwap));
  assert.equal(state.players["3"].roleId, before4);
  assert.equal(state.players["4"].roleId, beforeDemon);
});

test("a second living Demon may make the Barber swap (SNV-BARBER-01)", () => {
  const state = make({ 1: "clockmaker", 2: "barber", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-second-demon", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "vortox",
    deathIds: ["2"],
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  const barber = stepFor(state, "barber");
  const beforeEight = state.players["8"].roleId;
  const beforeFour = state.players["4"].roleId;

  const swap = runStep(state, "barber-second-demon", {
    key: barber.key,
    targetIds: ["8", "4"],
  });
  assert.equal(swap.status, "allowed", JSON.stringify(swap));
  assert.equal(state.players["8"].roleId, beforeFour, "the second Demon swapped itself");
  assert.equal(state.players["4"].roleId, beforeEight);
});

function evilTwinBarberSwap(state: GameState) {
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const result = runStep(state, "barber-twin-third", {
    key: barber.key,
    targetIds: [state.setup.evilTwinGoodPlayerId, "3"],
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
}

test("the Evil Twin win follows the good twin after a character swap", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  const evilTwin = state.setup.evilTwinPlayerId;
  assert.ok(goodTwin && evilTwin, "the deal resolves the pair by player");

  evilTwinBarberSwap(state);
  assert.notEqual(state.players[goodTwin].roleId, "clockmaker");
  assert.equal(state.players["3"].roleId, "clockmaker");

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, goodTwin!);
  assert.equal(state.winner && state.winner!.reason, "evil-twin");
});

test("inheriting the good twin's character does not move the Evil Twin win", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  evilTwinBarberSwap(state);
  assert.equal(state.players["3"].roleId, "clockmaker", "the role moved to a third player");

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, "3");
  assert.equal(state.winner, null, "the new role holder is not the good twin");
});

test("a dead Evil Twin cannot win on the good twin's execution (SNV-EVILTWIN-01)", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "fanggu" }, { count: 7 });
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  const evilTwin = state.setup.evilTwinPlayerId;
  assert.ok(goodTwin && evilTwin, "the deal resolves the pair by player");
  state.players[evilTwin].alive = false;

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, goodTwin!);
  assert.equal(state.winner, null, "a dead Evil Twin has no ability");
});

test("good cannot win while both Evil Twins live even with no Demon (SNV-EVILTWIN-02)", () => {
  const state = make({ 1: "clockmaker", 6: "eviltwin", 7: "fanggu" }, { count: 7 });
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  const evilTwin = state.setup.evilTwinPlayerId;
  assert.ok(goodTwin && evilTwin, "the deal resolves the pair by player");

  state.players["7"].alive = false;
  assert.equal(checkWin(state), null, "both twins live, so the good team has not won");

  state.players[evilTwin].alive = false;
  const winner = checkWin(state);
  assert.equal(winner?.team, "good");
  assert.equal(winner?.reason, "demon-dead", "the last living twin no longer blocks good");
});

test("an Evil Twin that leaves play stops the twin win and the block (SNV-EVILTWIN-02)", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  laterNight(state);
  const pithag = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const changed = runStep(state, "pithag-evil-twin-out", {
    key: pithag.key,
    targetIds: ["6"],
    roleId,
  });
  assert.equal(changed.status, "allowed", JSON.stringify(changed));
  assert.equal(state.players["6"].roleId, roleId);

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, goodTwin!);
  assert.equal(state.winner, null, "no Evil Twin ability is in play");

  state.players["11"].alive = false;
  const winner = checkWin(state);
  assert.equal(winner && winner.team, "good");
  assert.equal(winner!.reason, "demon-dead", "the leaving Evil Twin no longer blocks good");
});

function twinSwapState() {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  const pair = {
    good: state.setup.evilTwinGoodPlayerId!,
    evil: state.setup.evilTwinPlayerId!,
  };
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const swap = runStep(state, "barber-both-twins", {
    key: barber.key,
    targetIds: [pair.good, pair.evil],
  });
  assert.equal(swap.status, "allowed", JSON.stringify(swap));
  return { state, pair };
}

test("the two twins may swap characters and keep the pair", () => {
  const { state, pair } = twinSwapState();
  assert.equal(state.players[pair.good].roleId, "eviltwin");
  assert.equal(state.players[pair.evil].roleId, state.setup.evilTwinGoodId);

  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, pair.good);
  assert.equal(
    state.winner && state.winner!.reason,
    "evil-twin",
    "the good-aligned twin still wins for evil",
  );
});

test("both twins alive still block a good win after they swap", () => {
  const { state } = twinSwapState();
  state.players["11"].alive = false;
  assert.equal(checkWin(state), null, "good cannot win while both twins live");
});

test("the Philosopher gains the chosen ability and drunks its owner (SNV-PHILOSOPHER-01)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-clockmaker", {
    key: step.key,
    roleId: "clockmaker",
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopherAbility, "clockmaker");
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "drunk" &&
        effect.philosopher === true &&
        effect.targetId === "2" &&
        effect.active,
    ),
    "the owner of the chosen character is drunk",
  );
  const borrowed = state.night.queue.find(
    (candidate) =>
      candidate.roleId === "clockmaker" &&
      candidate.actorId === "1" &&
      !candidate.done &&
      !candidate.skipped,
  );
  assert.ok(borrowed, "the Philosopher wakes with the borrowed ability");
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("an impaired Philosopher spends the ability and gains nothing", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  state.effects.push({
    id: "test-philosopher-poison",
    kind: "poison",
    sourceId: "7",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-impaired", {
    key: step.key,
    roleId: "clockmaker",
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopher, true, "the ability is spent");
  assert.equal(state.players["1"].used.philosopherAbility, undefined);
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true),
    false,
  );
  assert.equal(
    state.night.queue.some(
      (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "1",
    ),
    false,
    "no borrowed ability step",
  );
});

test("the Philosopher can decline and keep the once-per-game ability", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-decline", { key: step.key });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopher, undefined);
});

test("the Philosopher may choose their own character and becomes drunk", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "philosopher");

  const result = runStep(state, "philosopher-self", { key: step.key, roleId: "philosopher" });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].used.philosopherAbility, "philosopher");
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "drunk" &&
        effect.philosopher === true &&
        effect.sourceId === "1" &&
        effect.targetId === "1" &&
        effect.active,
    ),
    "the Philosopher is drunk",
  );
});

test("a dead or impaired Philosopher stops making the chosen owner drunk (SNV-PHILOSOPHER-01)", () => {
  const state = make({ 1: "philosopher", 2: "dreamer", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const chosen = runStep(state, "philosopher-dreamer", {
    key: stepFor(state, "philosopher").key,
    roleId: "dreamer",
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(isImpaired(state, "2"), true, "the chosen Dreamer is drunk");
  state.effects.push({
    id: "philosopher-poison",
    kind: "poison",
    sourceId: "7",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  assert.equal(isImpaired(state, "2"), false, "an impaired Philosopher stops the drunk");
  state.effects = state.effects.filter((effect) => effect.id !== "philosopher-poison");
  assert.equal(
    isImpaired(state, "2"),
    true,
    "the owner is drunk again once the Philosopher is healthy",
  );
  kill(state, "1", "test");
  assert.equal(isImpaired(state, "2"), false, "a dead Philosopher stops the drunk");
});

test("a character the Philosopher chose while absent is created later and its holder is drunk (SNV-PHILOSOPHER-01, SNV-PITHAG-01)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  assert.ok(roleId);
  const philosopher = stepFor(state, "philosopher");

  const chosen = runStep(state, "philosopher-absent", { key: philosopher.key, roleId });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true),
    false,
    "no drunk while the character is absent",
  );

  // Philosopher r2421 Summary: "If the Philosopher chose a character that was
  // not in play at the time but is in play now, that character is drunk." A
  // borrowed ability is not the character, so the Pit-Hag may create it.
  const targetRole = state.players["3"].roleId;
  const pithag = stepFor(state, "pithag");
  const created = runStep(state, "pithag-entry", { key: pithag.key, targetIds: ["3"], roleId });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.equal(state.players["3"].roleId, roleId, "the Pit-Hag creates the absent character");
  assert.notEqual(targetRole, roleId, "the target held another character before the change");
  assert.notEqual(
    state.night.queue.find((candidate) => candidate.key === pithag.key)!.noteKey,
    "note.pithagInPlay",
    "the Pit-Hag does not record a no-op",
  );
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "drunk" &&
        effect.philosopher === true &&
        effect.targetId === "3" &&
        effect.active,
    ),
    "the new holder of the chosen character is drunk",
  );
  assertNoDuplicateCharacters(state);
  assert.deepEqual(validateState(state), []);
});

test("a role correction that creates the Philosopher's chosen character drunks its holder (SNV-PHILOSOPHER-01)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  assert.ok(roleId);
  const chosen = runStep(state, "philosopher-absent", {
    key: stepFor(state, "philosopher").key,
    roleId,
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true),
    false,
    "no drunk while the character is absent",
  );

  const corrected = applyCommand(state, {
    id: "correct-into-chosen-role",
    type: "manualCorrection",
    payload: {
      change: {
        kind: "role",
        playerId: "3",
        value: roleId,
        reason: "The Storyteller corrected the character.",
      },
    },
  });
  assert.equal(corrected.status, "allowed", JSON.stringify(corrected));
  assert.equal(state.players["3"].roleId, roleId);
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "drunk" &&
        effect.philosopher === true &&
        effect.targetId === "3" &&
        effect.active,
    ),
    "the corrected holder of the chosen character is drunk",
  );
});

test("a Fang Gu jump re-reconciles the Philosopher drunk after the chosen character leaves play (SNV-PHILOSOPHER-01, SNV-FANGGU-01)", () => {
  const state = make({ 1: "klutz", 2: "philosopher", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const chosen = runStep(state, "philosopher-klutz", {
    key: stepFor(state, "philosopher").key,
    roleId: "klutz",
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true && effect.active),
    true,
    "the klutz holder is drunk while the Philosopher is healthy",
  );

  laterNight(state);
  const fanggu = stepFor(state, "fanggu");
  assert.equal(completeStep(state, fanggu.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordSvOutcome(state, fanggu.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["1"].roleId, "fanggu", "the Outsider becomes the new Fang Gu");
  assert.equal(state.players["1"].alive, true);
  assert.equal(
    state.effects.some(
      (effect) => effect.philosopher === true && effect.targetId === "1" && effect.active,
    ),
    false,
    "the new Fang Gu is not drunk for the character the Philosopher borrowed",
  );
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true && effect.active),
    false,
  );
  assert.equal(isImpaired(state, "1"), false);
});

test("a first-night-only ability borrowed on a later night works that night (SNV-PHILOSOPHER-01)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const philosopher = stepFor(state, "philosopher");
  const chosen = runStep(state, "philosopher-late-clockmaker", {
    key: philosopher.key,
    roleId: "clockmaker",
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));

  // Pinned r2421: "If the Philosopher gains an ability that works at night,
  // they wake when that character would wake. If this ability is used on the
  // first night only, they use it tonight." Example: a Clockmaker gained on
  // the third night learns the distance that night.
  const borrowed = state.night.queue.find(
    (candidate) => candidate.roleId === "clockmaker" && candidate.actorId === "1",
  );
  assert.ok(borrowed, "the borrowed first-night ability wakes on the night it was chosen");
  const completed = runStep(state, "philosopher-late-clockmaker-step", {
    key: borrowed.key,
  });
  assert.equal(completed.status, "allowed", JSON.stringify(completed));
  const resolved = state.night.queue.find((candidate) => candidate.key === borrowed.key);
  assert.ok(resolved, "the borrowed step stays in the queue");
  assert.equal(resolved.done, true);
});

test("a borrowed day ability acts and a Drunk's shown one does not (SNV-PHILOSOPHER-02)", () => {
  const day = () => ({
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  });
  const borrow = () => {
    const state = make(
      { 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" },
      { count: 7 },
    );
    state.phase = "day";
    state.day = day();
    return state;
  };

  const slayer = borrow();
  slayer.players["1"].used.philosopherAbility = "slayer";
  const shot = useSlayer(slayer, "1", "7");
  assert.equal(shot.ok, true, JSON.stringify(shot));
  assert.equal((shot as { hit?: boolean }).hit, true);
  assert.equal(slayer.players["7"].alive, false, "the borrowed Slayer kills the Demon");
  assert.equal(slayer.players["1"].used.slayer, true, "the borrowed ability is spent");

  const tinker = borrow();
  tinker.players["1"].used.philosopherAbility = "tinker";
  const tinkerDeathResult = tinkerDeath(tinker, "1");
  assert.equal(tinkerDeathResult.ok, true, JSON.stringify(tinkerDeathResult));
  assert.equal(tinker.players["1"].alive, false, "the borrowed Tinker dies");

  const virgin = borrow();
  virgin.players["1"].used.philosopherAbility = "virgin";
  const nomination = nominate(virgin, "2", "1");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  assert.equal((nomination as { virgin?: boolean }).virgin, true);
  assert.equal(virgin.players["2"].alive, false, "the borrowed Virgin executes the nominator");
  assert.equal(virgin.players["1"].used.virgin, true);

  const drunkTinker = borrow();
  drunkTinker.players["1"].roleId = "drunk";
  drunkTinker.players["1"].shownRoleId = "tinker";
  const drunkDeath = tinkerDeath(drunkTinker, "1");
  assert.equal(drunkDeath.ok, false);
  assert.equal((drunkDeath as { errorCode?: string }).errorCode, "error.58");

  const drunkVirgin = borrow();
  drunkVirgin.players["1"].roleId = "drunk";
  drunkVirgin.players["1"].shownRoleId = "virgin";
  const drunkNomination = nominate(drunkVirgin, "2", "1");
  assert.equal(drunkNomination.ok, true, JSON.stringify(drunkNomination));
  assert.equal((drunkNomination as { virgin?: boolean }).virgin, undefined);
  assert.equal(drunkVirgin.day.execution, null, "the Drunk's shown Virgin does not execute");
  assert.equal(drunkVirgin.players["1"].used.virgin, undefined);

  const drunkSlayer = borrow();
  drunkSlayer.players["1"].roleId = "drunk";
  drunkSlayer.players["1"].shownRoleId = "slayer";
  const drunkShot = useSlayer(drunkSlayer, "1", "7");
  assert.equal(drunkShot.ok, true, "the Drunk may publicly attempt the shot");
  assert.equal((drunkShot as { hit?: boolean }).hit, false);
  assert.equal(drunkSlayer.players["7"].alive, true, "the Drunk's attempt kills nobody");
});

test("a replacement clears the borrowed ability and the drunk", () => {
  const state = make({ 1: "philosopher", 2: "dreamer", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const philosopher = stepFor(state, "philosopher");
  const chosen = runStep(state, "philosopher-dreamer", {
    key: philosopher.key,
    roleId: "dreamer",
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(state.players["1"].used.philosopherAbility, "dreamer");
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const pithag = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const replaced = runStep(state, "pithag-ex-philosopher", {
    key: pithag.key,
    targetIds: ["1"],
    roleId,
  });
  assert.equal(replaced.status, "allowed", JSON.stringify(replaced));
  assert.equal(state.players["1"].roleId, roleId);
  assert.equal(state.players["1"].used.philosopherAbility, undefined);
  assert.equal(
    state.effects.some((effect) => effect.philosopher === true && effect.active !== false),
    false,
    "the drunk is withdrawn",
  );
  assert.equal(
    state.night.queue.some(
      (candidate) =>
        candidate.actorId === "1" &&
        candidate.roleId === "dreamer" &&
        !candidate.done &&
        !candidate.skipped,
    ),
    false,
    "the borrowed step is removed before the wake",
  );
});

test("a borrowed death-triggered ability wakes after the Philosopher dies", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const philosopher = stepFor(state, "philosopher");
  const chosen = runStep(state, "philosopher-sage", { key: philosopher.key, roleId: "sage" });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));

  const demon = stepFor(state, "fanggu");
  const killed = runStep(state, "fanggu-kills-philosopher", {
    key: demon.key,
    targetIds: ["1"],
    deathIds: ["1"],
  });
  assert.equal(killed.status, "allowed", JSON.stringify(killed));
  assert.equal(state.players["1"].alive, false);
  assert.ok(
    state.night.queue.some(
      (candidate) =>
        candidate.actorId === "1" &&
        candidate.roleId === "sage" &&
        !candidate.done &&
        !candidate.skipped,
    ),
    "the borrowed Sage wakes after the death",
  );
});

test("a Philosopher who borrowed the Barber gets the swap after dying (SNV-BARBER-04)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const philosopher = stepFor(state, "philosopher");
  const chosen = runStep(state, "philosopher-barber", { key: philosopher.key, roleId: "barber" });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));

  const demon = stepFor(state, "fanggu");
  const killed = runStep(state, "fanggu-kills-philosopher-barber", {
    key: demon.key,
    targetIds: ["1"],
    deathIds: ["1"],
  });
  assert.equal(killed.status, "allowed", JSON.stringify(killed));
  assert.equal(state.players["1"].alive, false);
  assert.ok(
    state.night.queue.some(
      (candidate) =>
        candidate.actorId === "1" &&
        candidate.roleId === "barber" &&
        !candidate.done &&
        !candidate.skipped,
    ),
    "the borrowed Barber step is appended",
  );
});

test("a player who regains the Philosopher has a fresh once-per-game ability", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const philosopher = stepFor(state, "philosopher");
  const first = runStep(state, "philosopher-first", {
    key: philosopher.key,
    roleId: "clockmaker",
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.players["1"].used.philosopher, true);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const away = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const changed = runStep(state, "pithag-away", {
    key: away.key,
    targetIds: ["1"],
    roleId,
  });
  assert.equal(changed.status, "allowed", JSON.stringify(changed));

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const back = stepFor(state, "pithag");
  const regained = runStep(state, "pithag-back", {
    key: back.key,
    targetIds: ["1"],
    roleId: "philosopher",
  });
  assert.equal(regained.status, "allowed", JSON.stringify(regained));
  assert.equal(state.players["1"].roleId, "philosopher");
  assert.equal(state.players["1"].used.philosopher, undefined, "a fresh once-per-game ability");
});

test("a Philosopher who regains the ability may choose the same or a new character (SNV-PHILOSOPHER-01)", () => {
  for (const reuse of [true, false]) {
    const state = make(
      { 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" },
      { count: 7 },
    );
    startNight(state);
    const first = runStep(state, "philosopher-first-use", {
      key: stepFor(state, "philosopher").key,
      roleId: "clockmaker",
    });
    assert.equal(first.status, "allowed", JSON.stringify(first));

    finishNight(state);
    assert.equal(endNight(state).ok, true);
    assert.equal(endDay(state).ok, true);
    const awayRole = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
    assert.ok(awayRole);
    const away = runStep(state, "philosopher-away", {
      key: stepFor(state, "pithag").key,
      targetIds: ["1"],
      roleId: awayRole,
    });
    assert.equal(away.status, "allowed", JSON.stringify(away));

    finishNight(state);
    assert.equal(endNight(state).ok, true);
    assert.equal(endDay(state).ok, true);
    const back = runStep(state, "philosopher-back", {
      key: stepFor(state, "pithag").key,
      targetIds: ["1"],
      roleId: "philosopher",
    });
    assert.equal(back.status, "allowed", JSON.stringify(back));
    assert.equal(state.players["1"].used.philosopher, undefined);

    finishNight(state);
    assert.equal(endNight(state).ok, true);
    assert.equal(endDay(state).ok, true);
    const choice = reuse
      ? "clockmaker"
      : SNV.townsfolk.find((id) => id !== "clockmaker" && !rolesInPlay(state).includes(id));
    assert.ok(choice);
    const second = runStep(state, "philosopher-second-choice", {
      key: stepFor(state, "philosopher").key,
      roleId: choice,
    });
    assert.equal(second.status, "allowed", JSON.stringify(second));
    assert.equal(state.players["1"].used.philosopherAbility, choice);
  }
});

test("a replacement survives an export and import", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const target = "3";
  const previous = state.players[target].roleId;
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  const result = runStep(state, "pithag-export", { key: step.key, targetIds: [target], roleId });
  assert.equal(result.status, "allowed", JSON.stringify(result));

  const restored = importGame(exportGame(state));
  if (!restored.ok) assert.fail(restored.error);
  assert.equal(restored.state.players[target].roleId, roleId);
  assert.equal(restored.state.players[target].changedFrom, previous);
  assert.equal(restored.state.players[target].team, "good");
  assertNoDuplicateCharacters(restored.state);
  assert.deepEqual(validateState(restored.state), []);
});

test("an imported same-alignment twin pair is repaired (SNV-EVILTWIN-04)", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  const goodA = state.order.find((id) => realTeamOf(state.players[id]) === "good")!;
  const goodB = state.order.find((id) => id !== goodA && realTeamOf(state.players[id]) === "good")!;
  state.setup.evilTwinGoodPlayerId = goodA;
  state.setup.evilTwinPlayerId = goodB;

  const restored = importGame(exportGame(state));
  if (!restored.ok) assert.fail(restored.error);
  const next = restored.state;
  const good = next.setup.evilTwinGoodPlayerId;
  const evil = next.setup.evilTwinPlayerId;
  assert.ok(good && evil && good !== evil, "the pair is rebuilt");
  assert.equal(realTeamOf(next.players[good!]), "good");
  assert.equal(realTeamOf(next.players[evil!]), "evil");
});

test("an imported save resolves the twin pair before a swap", () => {
  const state = make(
    { 1: "clockmaker", 2: "barber", 6: "eviltwin", 7: "pithag", 11: "fanggu" },
    { count: 11 },
  );
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  const evilTwin = state.setup.evilTwinPlayerId;
  assert.ok(goodTwin && evilTwin, "the deal resolves the pair by player");
  // A save written before the player ids existed stores only the roles.
  const legacySetup = state.setup as Partial<GameState["setup"]>;
  delete legacySetup.evilTwinGoodPlayerId;
  delete legacySetup.evilTwinPlayerId;

  const restored = importGame(exportGame(state));
  if (!restored.ok) assert.fail(restored.error);
  const next = restored.state;
  assert.equal(next.setup.evilTwinGoodPlayerId, goodTwin, "backfilled from the roles");
  assert.equal(next.setup.evilTwinPlayerId, evilTwin);

  evilTwinBarberSwap(next);
  next.phase = "day";
  next.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(next, goodTwin);
  assert.equal(next.winner && next.winner.reason, "evil-twin");
});

test("death-triggered wakes are inserted in their shared priority order", () => {
  const wakeOrderFor = (deathIds: string[]) => {
    const state = make(
      { 1: "clockmaker", 2: "barber", 3: "sweetheart", 4: "dreamer", 6: "pithag", 8: "nodashii" },
      { count: 9 },
    );
    laterNight(state);
    const demon = stepFor(state, "nodashii");
    const result = runStep(state, "two-deaths-" + deathIds.join("-"), {
      key: demon.key,
      targetIds: [deathIds[0]],
      deathIds,
    });
    assert.equal(result.status, "allowed", JSON.stringify(result));
    return state.night.queue.map((step) => step.roleId || step.system);
  };
  const sweetheartFirst = wakeOrderFor(["3", "2"]);
  const barberFirst = wakeOrderFor(["2", "3"]);
  const barber = sweetheartFirst.indexOf("barber");
  const sweetheart = sweetheartFirst.indexOf("sweetheart");
  const dreamer = sweetheartFirst.indexOf("dreamer");
  assert.ok(barber !== -1 && sweetheart !== -1 && dreamer !== -1, "all three steps exist");
  assert.ok(
    barber < sweetheart && sweetheart < dreamer,
    "the Barber and Sweetheart wake before the later Dreamer, in that order",
  );
  assert.deepEqual(barberFirst, sweetheartFirst, "the death order does not change the wake order");
});

test("the Sage's death-triggered wake keeps its official slot (SNV-SAGE-01)", () => {
  const state = make(
    { 1: "clockmaker", 2: "sage", 4: "dreamer", 6: "pithag", 8: "nodashii" },
    { count: 9 },
  );
  laterNight(state);
  const demon = stepFor(state, "nodashii");
  const result = runStep(state, "sage-death", {
    key: demon.key,
    targetIds: ["2"],
    deathIds: ["2"],
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  const queue = state.night.queue;
  const sage = queue.findIndex((step) => step.roleId === "sage");
  const dreamer = queue.findIndex((step) => step.roleId === "dreamer");
  assert.ok(sage !== -1 && dreamer !== -1, "both steps exist");
  assert.equal(queue[sage].order, SV_NIGHT_OTHER.indexOf("sage"));
  assert.ok(sage < dreamer, "the Sage wakes before the Dreamer, not after every regular step");
});

// ---------------------------------------------------------------------------
// Madness (Cerenovus and Mutant)

function madnessDay(state: GameState, number = 1) {
  state.phase = "day";
  state.day = {
    number,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
}

function cerenovusMadness() {
  const state = make({ 1: "clockmaker", 6: "cerenovus", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = stepFor(state, "cerenovus");
  const goodRole = state.players["1"].roleId;
  const result = completeStep(state, step.key, { targetIds: ["2"], roleId: goodRole });
  assert.equal(result.ok, true, JSON.stringify(result));
  return { state, goodRole };
}

test("the Cerenovus marks the chosen player mad for the next day and night (SNV-CERENOVUS-01)", () => {
  const { state, goodRole } = cerenovusMadness();
  const token = state.effects.find(
    (effect) => effect.kind === "madness" && effect.madness === "cerenovus",
  );
  assert.ok(token, "a madness token exists");
  assert.equal(token.sourceId, "6");
  assert.equal(token.targetId, "2");
  assert.equal(token.roleId, goodRole);
  assert.deepEqual(token.expires, { phase: "day", number: 2 });
  madnessDay(state);
  assert.equal(activeMadness(state, "2")?.id, token.id, "mad during the following day");
  assert.equal(
    activeMadness(state, "2", { phase: "night", number: 2 })?.id,
    token.id,
    "still mad at the following night",
  );
  assert.equal(
    activeMadness(state, "2", { phase: "day", number: 2 }),
    null,
    "no longer mad at the next dawn",
  );
  assert.deepEqual(validateState(state), []);
});

test("a poisoned Cerenovus suspends the madness and it resumes when healthy (SNV-CERENOVUS-01)", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  assert.ok(activeMadness(state, "2"), "the madness is active");
  const poison = {
    id: "test-cerenovus-poison",
    kind: "poison",
    sourceId: "1",
    targetId: "6",
    start: { phase: "day" as const, number: 1 },
    expires: { phase: "night" as const, number: 2 },
    active: true,
  };
  state.effects.push(poison);
  assert.equal(
    activeMadness(state, "2"),
    null,
    "States r1039: a poisoned Cerenovus imposes no madness",
  );
  state.effects = state.effects.filter((effect) => effect !== poison);
  assert.ok(activeMadness(state, "2"), "the madness resumes when the Cerenovus is healthy");
});

test("a dead Cerenovus ends the madness (SNV-CERENOVUS-01)", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  assert.ok(activeMadness(state, "2"), "the madness is active");
  kill(state, "6", "ability", { phase: "day", number: 1 }, { demon: true, ability: "fanggu" });
  assert.equal(
    activeMadness(state, "2"),
    null,
    "Glossary r3168: the dead Cerenovus's persistent madness ends",
  );
});

test("the Cerenovus needs a good character before it records madness", () => {
  const state = make({ 1: "clockmaker", 6: "cerenovus", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const missing = completeStep(state, stepFor(state, "cerenovus").key, { targetIds: ["2"] });
  assert.equal(missing.ok, true, JSON.stringify(missing));
  assert.deepEqual(madnessEffects(state, { phase: "night", number: 1 }), []);

  const other = make({ 1: "clockmaker", 6: "cerenovus", 7: "fanggu" }, { count: 7 });
  startNight(other);
  const evil = completeStep(other, stepFor(other, "cerenovus").key, {
    targetIds: ["2"],
    roleId: "fanggu",
  });
  assert.equal(evil.ok, false);
  assert.deepEqual(madnessEffects(other, { phase: "night", number: 1 }), []);
});

test("an expired or removed madness token stops applying", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  assert.ok(activeMadness(state, "2"));
  laterNight(state);
  assert.ok(
    activeMadness(state, "2", { phase: "night", number: 2 }),
    "the token covers the night after the mad day",
  );
  assert.equal(
    activeMadness(state, "2", { phase: "day", number: 2 }),
    null,
    "the token expires at the next dawn",
  );

  const second = cerenovusMadness();
  madnessDay(second.state);
  const token = activeMadness(second.state, "2")!;
  const removed = applyCommand(second.state, {
    id: "remove-madness",
    type: "manualCorrection",
    payload: {
      change: { kind: "effect", effectId: token.id, value: false, reason: "Wrong target" },
    },
  });
  assert.equal(removed.status, "allowed", JSON.stringify(removed));
  assert.equal(activeMadness(second.state, "2"), null, "the Storyteller can remove the token");
});

test("a Cerenovus token cannot be executed on the night it is created", () => {
  const { state } = cerenovusMadness();
  const result = applyCommand(state, {
    id: "cerenovus-same-night",
    type: "madnessPenalty",
    payload: {
      playerId: "2",
      penalty: "execute",
      reason: "The token was just placed.",
    },
  });
  assert.equal(result.status, "rejected", JSON.stringify(result));
  assert.equal(result.errorCode, "error.73");
  assert.equal(state.players["2"].alive, true, "the target must get the next day first");
});

test("a Mutant can be executed on the first night (Mutant r1755)", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
  startNight(state);
  assert.equal(state.phase, "night");
  assert.equal(state.night.number, 1);
  const result = applyCommand(state, {
    id: "mutant-first-night",
    type: "madnessPenalty",
    payload: {
      playerId: "2",
      penalty: "execute",
      reason: "The Mutant hinted at the character during the night.",
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].alive, false);
});

test("a night Mutant execution is allowed after a day execution and leaves the next day free (SNV-MUTANT-01)", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  const dayExecution = executeByDecision(state, "4", { cause: "vote" });
  assert.equal(dayExecution.ok, true, JSON.stringify(dayExecution));
  assert.equal(state.day.execution!.playerId, "4", "the day already used its execution");
  reviewMadness(state);
  assert.equal(endDay(state).ok, true);

  const night = applyCommand(state, {
    id: "mutant-after-day-execution",
    type: "madnessPenalty",
    payload: {
      playerId: "2",
      penalty: "execute",
      reason: "The Mutant hinted at the character during the night.",
    },
  });
  assert.equal(night.status, "allowed", JSON.stringify(night));
  assert.equal(
    state.players["2"].alive,
    false,
    "a night madness execution is outside the day limit",
  );

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(state.day.execution, null, "the night execution does not consume the new day");
  const nextDay = executeByDecision(state, "5", { cause: "vote" });
  assert.equal(nextDay.ok, true, JSON.stringify(nextDay));
  assert.equal(state.day.execution!.playerId, "5");
});

test("a Cerenovus madness execution can happen during the following night", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  laterNight(state);
  const result = applyCommand(state, {
    id: "cerenovus-night-execution",
    type: "madnessPenalty",
    payload: {
      playerId: "2",
      penalty: "execute",
      reason: "The target broke madness after dusk.",
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].alive, false, "the Storyteller may execute at night");
  assert.equal(state.executions.at(-1)!.cause, "madness");
});

test("the Storyteller executes a player who failed to be mad", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  const result = applyCommand(state, {
    id: "madness-execute",
    type: "madnessPenalty",
    payload: {
      playerId: "2",
      penalty: "execute",
      reason: "Claimed to be the Clockmaker all day.",
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].alive, false);
  assert.equal(state.day.execution!.playerId, "2");
  assert.equal(state.day.execution!.cause, "madness");
  assert.equal(state.executions.at(-1)!.cause, "madness");
  const token = state.effects.find((effect) => effect.madness === "cerenovus")!;
  assert.equal(token.decidedDay, 1);
  assert.equal(token.decidedPenalty, "execute");
  assert.equal(token.decidedReason, "Claimed to be the Clockmaker all day.");
  const logged = state.log.filter((entry) => entry.playerId === "2").at(-1)!;
  assert.equal(logged.secret, true);
  assert.match(logged.detail, /Claimed to be the Clockmaker all day\./);
});

test("madness executions preserve command time and events through preview and replay", () => {
  // Cerenovus r3048 and Mutant r1755 leave this execution to the Storyteller,
  // during the day or the following night. Its records must still be replayable.
  for (const role of ["cerenovus", "mutant"] as const) {
    for (const phase of ["day", "night"] as const) {
      const state =
        role === "cerenovus"
          ? cerenovusMadness().state
          : make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
      if (role === "mutant") assert.equal(startNight(state).ok, true);
      madnessDay(state);
      if (phase === "night") {
        state.phase = "night";
        state.night.number = 2;
      }
      const before = clone(state);
      const command = {
        id: `madness-replay-${role}-${phase}`,
        type: "madnessPenalty",
        at: "2026-01-01T00:00:00.000Z",
        payload: {
          playerId: "2",
          penalty: "execute",
          reason: "The Storyteller judged that the player broke madness.",
        },
      };

      const previewed = previewCommand(state, command);
      assert.equal(previewed.status, "allowed", JSON.stringify(previewed));
      assert.deepEqual(state, before, "preview leaves the entire state unchanged");
      const applied = applyCommand(state, command);
      assert.equal(applied.status, "allowed", JSON.stringify(applied));
      if (previewed.status !== "allowed" || applied.status !== "allowed") return;

      assert.equal(state.players["2"].alive, false);
      assert.equal(state.deaths.length, before.deaths.length + 1);
      assert.equal(state.deaths.at(-1)!.at, command.at, `${role} ${phase} death time`);
      assert.equal(state.executions.at(-1)!.at, command.at, `${role} ${phase} execution time`);
      assert.deepEqual(previewed.events, applied.events);
      assert.deepEqual(previewed.changes, applied.changes);

      const journal = clone(state.journal);
      const replayed = replay(journal);
      assert.equal(replayed.ok, true, JSON.stringify(replayed));
      if (!replayed.ok) return;
      assert.deepEqual(replayed.events, applied.events);
      assert.deepEqual(replayed.state, state, "replay reproduces every stored record");

      const undone = replay({ base: journal.base, entries: [] });
      assert.equal(undone.ok, true, JSON.stringify(undone));
      if (!undone.ok) return;
      assert.deepEqual(canonicalState(undone.state), canonicalState(before));
      const redone = applyCommand(undone.state, command);
      assert.equal(redone.status, "allowed", JSON.stringify(redone));
      assert.deepEqual(undone.state, state, "reapplying the undone command restores its records");
    }
  }
});

test("the madness penalty only accepts the legal Storyteller options", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  const before = JSON.stringify(state.effects);
  const illegal = applyCommand(state, {
    id: "madness-illegal",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "banish", reason: "decided" },
  });
  assert.equal(illegal.status, "requires-storyteller-choice");
  assert.deepEqual(illegal.choice.options, MADNESS_PENALTIES);
  assert.equal(JSON.stringify(state.effects), before, "an illegal penalty changes nothing");

  const noReason = applyCommand(state, {
    id: "madness-noreason",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "none", reason: "   " },
  });
  assert.equal(noReason.status, "rejected");

  const declined = applyCommand(state, {
    id: "madness-none",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "none", reason: "Was mad enough." },
  });
  assert.equal(declined.status, "allowed", JSON.stringify(declined));
  assert.equal(state.players["2"].alive, true);
  assert.equal(state.day.execution, null);
  const token = state.effects.find((effect) => effect.madness === "cerenovus")!;
  assert.equal(token.decidedPenalty, "none");
  assert.equal(token.decidedReason, "Was mad enough.");

  const again = applyCommand(state, {
    id: "madness-again",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "none", reason: "Same outcome." },
  });
  assert.equal(again.status, "rejected");

  const upgraded = applyCommand(state, {
    id: "madness-upgrade",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "execute", reason: "New evidence of a breach." },
  });
  assert.equal(upgraded.status, "allowed", JSON.stringify(upgraded));
  const repeated = applyCommand(state, {
    id: "madness-execute-again",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "execute", reason: "Repeat." },
  });
  assert.equal(repeated.status, "rejected");

  const nobody = applyCommand(state, {
    id: "madness-nobody",
    type: "madnessPenalty",
    payload: { playerId: "3", penalty: "none", reason: "no token" },
  });
  assert.equal(nobody.status, "rejected");
});

test("ending the day is blocked until active madness has a Storyteller review", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  const before = JSON.stringify({ phase: state.phase, day: state.day, night: state.night });
  const blocked = applyCommand(state, {
    id: "end-day-pending-madness",
    type: "endDay",
    payload: {},
  });
  assert.equal(blocked.status, "rejected", "the active madness must be reviewed");
  assert.equal(blocked.errorCode, "error.66");
  assert.deepEqual(
    { phase: state.phase, day: state.day, night: state.night },
    JSON.parse(before),
    "a blocked transition leaves the phase unchanged",
  );

  const review = applyCommand(state, {
    id: "madness-review-none",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "none", reason: "Stayed convincingly mad." },
  });
  assert.equal(review.status, "allowed", JSON.stringify(review));
  assert.equal(endDay(state).ok, true, "the reviewed day may end");
});

test("each overlapping madness condition receives its own review", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "cerenovus", 7: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "cerenovus");
  const completed = completeStep(state, step.key, { targetIds: ["2"], roleId: "clockmaker" });
  assert.equal(completed.ok, true, JSON.stringify(completed));
  madnessDay(state);

  const reviews = madnessReviewsDue(state).filter((effect) => effect.targetId === "2");
  assert.equal(reviews.length, 2);
  for (const effect of reviews) {
    const result = applyCommand(state, {
      id: "overlapping-madness-" + effect.id,
      type: "madnessPenalty",
      payload: {
        playerId: "2",
        effectId: effect.id,
        penalty: "none",
        reason: "Reviewed this specific madness condition.",
      },
    });
    assert.equal(result.status, "allowed", JSON.stringify(result));
  }
  assert.deepEqual(madnessReviewsDue(state), []);
  assert.equal(endDay(state).ok, true);
});

test("a no-penalty madness review can be upgraded to execution later that day", () => {
  const { state } = cerenovusMadness();
  madnessDay(state);
  assert.equal(
    applyCommand(state, {
      id: "madness-review-early",
      type: "madnessPenalty",
      payload: { playerId: "2", penalty: "none", reason: "No breach observed yet." },
    }).status,
    "allowed",
  );

  const upgraded = applyCommand(state, {
    id: "madness-review-upgrade",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "execute", reason: "Later evidence showed a breach." },
  });
  assert.equal(upgraded.status, "allowed", JSON.stringify(upgraded));
  assert.equal(state.day.execution?.playerId, "2");
  assert.equal(state.day.execution?.cause, "madness");
  const token = state.effects.find((effect) => effect.madness === "cerenovus")!;
  assert.equal(token.decidedPenalty, "execute");
  assert.equal(token.decidedReason, "Later evidence showed a breach.");
});

test("the Mutant is mad about being an Outsider while in play (SNV-MUTANT-01)", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
  startNight(state);
  const token = madnessEffects(state, { phase: "night", number: 1 }).find(
    (effect) => effect.madness === "mutant",
  );
  assert.ok(token, "the Mutant has a madness token");
  assert.equal(token.sourceId, "2");
  assert.equal(token.targetId, "2");
  assert.equal(token.roleId, null);
  assert.equal(token.expires, null);
  madnessDay(state);
  assert.equal(activeMadness(state, "2")?.madness, "mutant");
  const result = applyCommand(state, {
    id: "mutant-execute",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "execute", reason: "Claimed to be a Townsfolk all day." },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].alive, false);
});

test("the living Mutant needs a new madness review each day", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
  startNight(state);
  madnessDay(state, 1);
  const firstReview = applyCommand(state, {
    id: "mutant-review-day-one",
    type: "madnessPenalty",
    payload: { playerId: "2", penalty: "none", reason: "Stayed mad on day one." },
  });
  assert.equal(firstReview.status, "allowed", JSON.stringify(firstReview));
  assert.equal(endDay(state).ok, true);

  madnessDay(state, 2);
  const secondDay = applyCommand(state, {
    id: "mutant-end-day-two",
    type: "endDay",
    payload: {},
  });
  assert.equal(secondDay.status, "rejected");
  assert.equal(secondDay.errorCode, "error.66");
});

test("the Mutant madness follows the character holder", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
  startNight(state);
  assert.ok(activeMadness(state, "2"));
  state.players["2"].roleId = "klutz";
  reconcileNoDashiiPoison(state);
  assert.equal(activeMadness(state, "2"), null, "the player stopped being the Mutant");
  const token = state.effects.find((effect) => effect.madness === "mutant")!;
  assert.equal(token.active, false);
  state.players["2"].roleId = "mutant";
  state.players["2"].alive = false;
  reconcileNoDashiiPoison(state);
  assert.equal(activeMadness(state, "2"), null, "a dead Mutant is no longer mad");
});

test("madness stays out of the public and player projections", () => {
  const { state, goodRole } = cerenovusMadness();
  madnessDay(state);
  assert.ok(activeMadness(state, "2"));
  const view = publicGameView(state);
  assert.deepEqual(Object.keys(view).sort(), [
    "day",
    "deaths",
    "living",
    "night",
    "phase",
    "total",
    "winner",
  ]);
  const text = JSON.stringify(view);
  assert.equal(text.includes("madness"), false);
  assert.equal(text.includes("cerenovus"), false);
  assert.equal(text.includes(goodRole ?? ""), false);
});

// Issue #41: Vigormortis, Vortox and the informational roles

test("the Vigormortis minion keeps its ability and poisons one Townsfolk neighbour (SNV-VIGORMORTIS-01)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  const killResult = applyCommand(state, {
    id: "vigo-kill",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: ["2"], deathIds: ["2"] },
  });
  assert.equal(killResult.status, "allowed", JSON.stringify(killResult));
  const death = state.deaths.find((entry) => entry.playerId === "2");
  assert.ok(death, "the Minion died");
  assert.equal(death.ability, "vigormortis");
  assert.equal(death.demon, true);
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.ok(poison, "one Townsfolk neighbour is poisoned");
  assert.equal(poison.kind, "poison");
  assert.equal(poison.targetId, "3", "the nearest Townsfolk clockwise is poisoned");
  assert.equal(poison.permanent, true, "the poison outlives its dead source");
  assert.equal(isImpaired(state, "3"), true, "the poisoned Townsfolk is impaired");

  nextNight(state);
  const retained = state.night.queue.find((candidate) => candidate.roleId === "cerenovus");
  assert.ok(retained, "the dead Minion keeps its night step");
  assert.equal(retained.actorId, "2");
  const done = completeStep(state, retained.key, { targetIds: ["1"] });
  assert.equal(done.ok, true, JSON.stringify(done));
});

test("the Vigormortis retention ends when the Vigormortis dies (SNV-VIGORMORTIS-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  nextNight(state);
  const retained = state.night.queue.find((candidate) => candidate.roleId === "cerenovus");
  assert.ok(retained, "the retention exists while the Vigormortis lives");
  state.players["8"].alive = false;
  appendConditionalSteps(state);
  assert.equal(retained.skipped, true, "the dead Minion no longer keeps its ability");
  reconcileVigormortisPoison(state);
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.ok(poison, "the poison was applied at the kill");
  assert.equal(poison.active, false, "the poison ends with the Vigormortis");
});

test("executing the Vigormortis ends its poison while another Demon lives (SNV-VIGORMORTIS-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.equal(poison.active, true);

  // A Pit-Hag-created second Demon keeps the game running while the
  // Vigormortis is executed; its death must still release the poison.
  state.players["1"].roleId = "fanggu";
  state.players["1"].team = "evil";
  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(state, "8").ok, true);
  assert.equal(state.winner, null, "the second Demon keeps the game alive");
  assert.equal(poison.active, false, "the executed Vigormortis releases the poison");
});

test("a drunk Vigormortis releases its poison at the next conditional step (SNV-VIGORMORTIS-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.equal(poison.active, true);

  state.effects.push({
    id: "test-vigormortis-drunk",
    kind: "drunk",
    sourceId: "1",
    targetId: "8",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  appendConditionalSteps(state);
  assert.equal(poison.active, false, "a drunk Vigormortis stops poisoning its neighbour");
});

test("the Vigormortis poison needs a real Minion kill (SNV-VIGORMORTIS-03)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  state.players["2"].alive = false;
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["2"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.deepEqual(outcome.deaths, [], "the Minion was already dead");
  assert.equal(
    state.effects.some((effect) => effect.vigormortis === true),
    false,
    "no poison without a kill",
  );
});

test("the Vigormortis retains every killed Minion and poisons for each (SNV-VIGORMORTIS-04)", () => {
  const state = make(
    { 1: "clockmaker", 2: "cerenovus", 3: "witch", 8: "vigormortis" },
    { count: 10 },
  );
  laterNight(state);
  const first = stepFor(state, "vigormortis");
  completeStep(state, first.key, { targetIds: ["2"] });
  recordSvOutcome(state, first.key, { deathIds: ["2"] });
  nextNight(state);
  const second = stepFor(state, "vigormortis");
  completeStep(state, second.key, { targetIds: ["3"] });
  recordSvOutcome(state, second.key, { deathIds: ["3"] });

  const poisons = state.effects.filter(
    (effect) => effect.vigormortis === true && effect.active !== false,
  );
  assert.equal(poisons.length, 2, "one poison per killed Minion");
  assert.deepEqual(poisons.map((effect) => effect.sourceId).sort(), ["2", "3"]);
  for (const roleId of ["cerenovus", "witch"]) {
    assert.ok(
      state.night.queue.some(
        (step) => step.roleId === roleId && step.actorId !== null && !step.skipped,
      ),
      roleId + " keeps its step",
    );
  }
});

test("the Vigormortis poison ends when the killed Minion stops being a Minion", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.ok(poison, "the poison exists");
  assert.equal(poison.active, true);
  assert.equal(isImpaired(state, poison.targetId!), true);

  const replaced = replaceCharacter(state, "2", "oracle", { order: 0, currentKey: null });
  assert.equal(replaced.ok, true);
  assert.equal(poison.active, false, "a non-Minion source no longer poisons");
  assert.equal(isImpaired(state, poison.targetId!), false);
  assert.equal(minionRetainsAbility(state, "2"), false, "a non-Minion loses the retained ability");
});

test("a transformed dead Minion loses its retained night step (SNV-VIGORMORTIS-06)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  nextNight(state);
  const retained = state.night.queue.find(
    (candidate) => candidate.roleId === "cerenovus" && candidate.actorId === "2",
  );
  assert.ok(retained, "the dead Minion keeps its night step while the Vigormortis lives");

  const replaced = replaceCharacter(state, "2", "oracle", { order: 0, currentKey: null });
  assert.equal(replaced.ok, true);
  assert.equal(retained.skipped, true, "the transformed dead Minion no longer wakes");
  assert.equal(minionRetainsAbility(state, "2"), false);
});

test("a character change keeps the player's drunk and poison (STATUS-009)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  const at = { phase: "night" as const, number: 1 };
  state.effects.push(
    { id: "status009-drunk", kind: "drunk", sourceId: "8", targetId: "1", start: at, active: true },
    {
      id: "status009-poison",
      kind: "poison",
      sourceId: "8",
      targetId: "2",
      start: at,
      active: true,
    },
  );
  assert.equal(isImpaired(state, "1", at), true);
  assert.equal(isImpaired(state, "2", at), true);
  assert.equal(replaceCharacter(state, "1", "oracle", { order: 0, currentKey: null }).ok, true);
  assert.equal(replaceCharacter(state, "2", "dreamer", { order: 0, currentKey: null }).ok, true);
  assert.deepEqual([state.players["1"].roleId, state.players["2"].roleId], ["oracle", "dreamer"]);
  assert.equal(isImpaired(state, "1", at), true, "the transformed player stays drunk");
  assert.equal(isImpaired(state, "2", at), true, "the transformed player stays poisoned");
});

test("an Evil Twin killed by the Vigormortis still wins on the good twin's execution (SNV-EVILTWIN-01)", () => {
  const state = make({ 1: "clockmaker", 2: "eviltwin", 8: "vigormortis" }, { count: 8 });
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  assert.equal(goodTwin, "1", "the good twin is the Clockmaker");
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  assert.equal(state.players["2"].alive, false);
  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(state, goodTwin!);
  assert.equal(state.winner && state.winner.team, "evil");
  assert.equal(state.winner && state.winner!.reason, "evil-twin");

  const lost = make({ 1: "clockmaker", 2: "eviltwin", 8: "vigormortis" }, { count: 8 });
  laterNight(lost);
  const lostStep = stepFor(lost, "vigormortis");
  completeStep(lost, lostStep.key, { targetIds: ["2"] });
  recordSvOutcome(lost, lostStep.key, { deathIds: ["2"] });
  lost.players["8"].alive = false;
  lost.phase = "day";
  lost.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  executeByDecision(lost, "1");
  assert.notEqual(
    lost.winner && lost.winner.reason,
    "evil-twin",
    "the ability ends with the Vigormortis",
  );
});

test("the host can name the Vigormortis poisoned neighbour", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  completeStep(state, step.key, { targetIds: ["2"] });
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["2"], poisonId: "1" });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.equal(poison.targetId, "1", "the host's neighbour is poisoned");

  const other = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(other);
  const otherStep = stepFor(other, "vigormortis");
  completeStep(other, otherStep.key, { targetIds: ["2"] });
  const rejected = recordSvOutcome(other, otherStep.key, { deathIds: ["2"], poisonId: "8" });
  assert.equal(rejected.ok, false, "the Demon is not a Townsfolk neighbour");
  assert.equal(
    other.effects.some((effect) => effect.vigormortis === true),
    false,
    "no poison is applied",
  );
});

test("the console's poison choice reaches the engine through completeNightStep", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  const allowed = applyCommand(state, {
    id: "vigo-console-choice",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: ["2"], deathIds: ["2"], poisonId: "1" },
  });
  assert.equal(allowed.status, "allowed", JSON.stringify(allowed));
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.equal(poison.targetId, "1", "the console's choice is the poisoned neighbour");

  const other = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(other);
  const otherStep = stepFor(other, "vigormortis");
  const rejected = applyCommand(other, {
    id: "vigo-console-illegal",
    type: "completeNightStep",
    payload: { key: otherStep.key, targetIds: ["2"], deathIds: ["2"], poisonId: "8" },
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.errorCode, "error.56");
  assert.equal(
    other.effects.some((effect) => effect.vigormortis === true),
    false,
  );
});

test("a Townsfolk information step demands the host's answer while the Vortox lives (SNV-VORTOX-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "clockmaker");
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true, "false information is the host's choice");
  const blocked = stepOutcome(completeStep(state, step.key, {}));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.needsChoice, true);
  const done = stepOutcome(
    completeStep(state, step.key, {
      given: { kind: "number", value: 3, needsChoice: false },
    }),
  );
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(done.step!.given!.value, 3, "the host's false number is stored");
});

test("an impaired information role demands the host's answer", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "clockmaker");
  state.effects.push({
    id: "test-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true);
  const blocked = stepOutcome(completeStep(state, step.key, {}));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.needsChoice, true);
});

test("an unimpaired information role completes without a host answer", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "clockmaker");
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, false);
  assert.equal(typeof info.value, "number");
  const done = stepOutcome(completeStep(state, step.key, {}));
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(done.step!.given!.value, info.value);
});

test("a living Vortox leaves a character-change note truthful (SNV-VORTOX-02)", () => {
  const state = make({ 1: "clockmaker", 6: "pithag", 7: "vortox" }, { count: 7 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(
    executeByDecision(state, "2").ok,
    true,
    "the day has an execution so evil does not win",
  );
  assert.equal(endDay(state).ok, true);
  const step = stepFor(state, "pithag");
  const roleId = SNV.townsfolk.find((id) => !rolesInPlay(state).includes(id));
  assert.ok(roleId);
  const result = runStep(state, "pithag-under-vortox", {
    key: step.key,
    targetIds: ["3"],
    roleId,
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["3"].roleId, roleId, "the change happens");
  const completed = state.night.queue.find((candidate) => candidate.key === step.key)!;
  assert.equal(
    completed.noteKey,
    "note.characterBecame",
    JSON.stringify({ note: completed.note, key: completed.noteKey }),
  );
  assert.equal(String(completed.note).includes("ложн"), false, "the change note is not falsified");
  assert.match(String(completed.note), /становится/);
});

test("the Oracle counts dead evil players, not death events (SNV-ORACLE-01)", () => {
  const state = make({ 1: "clockmaker", 2: "oracle", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "7", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  kill(state, "5", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  const step = stepFor(state, "oracle");
  const info = infoForStep(state, step);
  assert.equal(info.kind, "number");
  assert.equal(info.value, 1, "only the dead Minion is evil");
  // A resurrection leaves the death event behind but the player is alive.
  state.players["7"].alive = true;
  assert.equal(infoForStep(state, step).value, 0, "a living player is not counted");
});

test("the Oracle counts a dead player whose team is opposite the printed token (SNV-ORACLE-01)", () => {
  const state = make(
    { 1: "clockmaker", 2: "oracle", 3: "artist", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  laterNight(state);
  kill(state, "3", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  kill(state, "7", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  state.players["3"].team = "evil";
  state.players["7"].team = "good";
  const info = infoForStep(state, stepFor(state, "oracle"));
  assert.equal(info.value, 1, "the flipped good token is evil and the flipped evil token is good");
  state.players["3"].team = "good";
  state.players["7"].team = "evil";
  assert.equal(
    infoForStep(state, stepFor(state, "oracle")).value,
    1,
    "printed alignment is not used",
  );
});

test("an impaired Oracle may still receive the true dead-evil count (SNV-ORACLE-01)", () => {
  const state = make({ 1: "clockmaker", 2: "oracle", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "7", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  const step = stepFor(state, "oracle");
  const healthy = infoForStep(state, step);
  assert.equal(healthy.needsChoice, false, "a healthy Oracle computes its own answer");
  assert.equal(healthy.value, 1);
  state.effects.push({
    id: "oracle-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "2",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true, "the host answers for an impaired Oracle");
  assert.ok(info.options!.includes(info.value), "impairment alone may still give the truth");
  assert.equal(info.falsifiedSuffix, false);
  assert.equal(info.mayBeFalseSuffix, true);
});

test("a living Vortox forbids the true Oracle count (SNV-ORACLE-01)", () => {
  const state = make({ 1: "clockmaker", 2: "oracle", 8: "vortox" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  // Execute the Minion: a dead evil player makes the true count one, and the
  // day has an execution so the Vortox does not win at dusk.
  assert.equal(executeByDecision(state, "7").ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.winner, null);
  const info = infoForStep(state, stepFor(state, "oracle"));
  assert.equal(info.needsChoice, true, "the host must give false information");
  assert.equal(info.falsifiedSuffix, true);
  assert.equal(info.options!.includes(info.value), false, "the true count is not a legal answer");
  assert.ok(info.options!.length > 0, "a false count remains available");
});

test("the Oracle answer survives preview, apply, replay, undo and export (SNV-ORACLE-01)", () => {
  const state = make({ 1: "clockmaker", 2: "oracle", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  state.night.number = 2;
  state.night.queue = buildSvNightQueue(state);
  kill(state, "7", "test");
  const step = stepFor(state, "oracle");
  const command: Command = {
    id: "oracle-answer-replay",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: [] },
    at: "2030-01-02T00:00:00.000Z",
  };
  const before = clone(state);
  const snapshot = clone(before);
  const base = clone(before);
  delete (base as Partial<GameState>).journal;
  state.journal = { base, entries: [] };
  state.applied = {};

  const preview = previewCommand(before, command) as { status: string };
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(
    canonicalState(before),
    canonicalState(snapshot),
    "preview leaves the canonical state unchanged",
  );

  const applied = applyCommand(state, command) as { status: string };
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.deepEqual(state.night.queue.find((candidate) => candidate.key === step.key)!.given, {
    kind: "number",
    value: 1,
    impaired: false,
    needsChoice: false,
    options: [],
    textKey: "note.sv.oracle",
    textVars: { value: 1 },
    falsifiedSuffix: false,
    mayBeFalseSuffix: false,
    text: "Мёртвых злых игроков: 1.",
  });
  assert.equal(
    state.night.queue.find((candidate) => candidate.key === step.key)!.completedAt,
    command.at,
    "the step is stamped with the command time",
  );
  assert.equal(
    JSON.stringify(publicGameView(state)).includes("Мёртвых злых"),
    false,
    "the answer stays out of the public view",
  );

  const replayed = replay({ base: clone(before), entries: state.journal.entries });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));

  const undone = replay({ base: clone(before), entries: state.journal.entries.slice(0, -1) });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), canonicalState(before));

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, JSON.stringify(restored));
  if (!restored.ok) return;
  assert.deepEqual(
    restored.state.night.queue.find((candidate) => candidate.roleId === "oracle")!.given,
    state.night.queue.find((candidate) => candidate.roleId === "oracle")!.given,
  );
});

test("the Seamstress learns whether two players share an alignment once per game (SNV-SEAMSTRESS-01)", () => {
  const same = make({ 1: "seamstress", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  startNight(same);
  const sameStep = stepFor(same, "seamstress");
  const sameInfo = infoForStep(same, sameStep, { targetIds: ["2", "5"] });
  assert.equal(sameInfo.kind, "yes-no");
  assert.equal(sameInfo.value, true);
  const done = stepOutcome(completeStep(same, sameStep.key, { targetIds: ["2", "5"] }));
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(same.players["1"].used.seamstress, true, "the ability is spent");
  nextNight(same);
  assert.equal(
    same.night.queue.some((candidate) => candidate.roleId === "seamstress"),
    false,
    "the Seamstress does not wake again",
  );

  const different = make({ 1: "seamstress", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  startNight(different);
  const differentStep = stepFor(different, "seamstress");
  const differentInfo = infoForStep(different, differentStep, { targetIds: ["2", "8"] });
  assert.equal(differentInfo.value, false);
  assert.equal(completeStep(different, differentStep.key, { targetIds: ["2", "8"] }).ok, true);
});

test("an impaired Seamstress may still receive the true alignment answer (SNV-SEAMSTRESS-01)", () => {
  const state = make({ 1: "seamstress", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "seamstress");
  const healthy = infoForStep(state, step, { targetIds: ["2", "5"] });
  assert.equal(healthy.needsChoice, false, "a healthy Seamstress computes its own answer");
  assert.equal(healthy.value, true);
  state.effects.push({
    id: "seamstress-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  const info = infoForStep(state, step, { targetIds: ["2", "5"] });
  assert.equal(info.needsChoice, true, "the host answers for an impaired Seamstress");
  assert.ok(info.options!.includes(info.value), "impairment alone may still give the truth");
  assert.equal(info.falsifiedSuffix, false);
  assert.equal(info.mayBeFalseSuffix, true);
});

test("a living Vortox forbids the true Seamstress answer (SNV-SEAMSTRESS-01)", () => {
  const state = make({ 1: "seamstress", 2: "clockmaker", 8: "vortox" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "seamstress");
  const info = infoForStep(state, step, { targetIds: ["2", "8"] });
  assert.equal(info.value, false, "the good Clockmaker and the evil Vortox differ");
  assert.equal(info.needsChoice, true, "the host must give false information");
  assert.equal(info.falsifiedSuffix, true);
  assert.equal(info.options!.includes(info.value), false, "the true answer is not legal");
  assert.deepEqual(info.options, [true], "only the false answer remains");
});

test("the Seamstress rejects a self, repeated or missing target pair", () => {
  const state = make({ 1: "seamstress", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "seamstress");
  const self = stepOutcome(completeStep(state, step.key, { targetIds: ["1", "2"] }));
  assert.equal(self.ok, false);
  assert.equal(self.errorCode, "error.40");
  const repeated = stepOutcome(completeStep(state, step.key, { targetIds: ["2", "2"] }));
  assert.equal(repeated.ok, false);
  assert.equal(repeated.errorCode, "error.42");
  const missing = stepOutcome(completeStep(state, step.key, { targetIds: ["2"] }));
  assert.equal(missing.ok, false);
  assert.equal(missing.errorCode, "error.39");
  assert.equal(state.players["1"].used && state.players["1"].used.seamstress, undefined);
});

test("the Seamstress may choose a dead player (SNV-SEAMSTRESS-01)", () => {
  const state = make(
    { 1: "seamstress", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  kill(state, "5", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  assert.equal(state.players["5"].alive, false);
  const step = stepFor(state, "seamstress");
  const info = infoForStep(state, step, { targetIds: ["5", "8"] });
  assert.equal(info.kind, "yes-no");
  assert.equal(info.needsChoice, false, "a dead target is a legal choice");
  const done = stepOutcome(completeStep(state, step.key, { targetIds: ["5", "8"] }));
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(state.players["1"].used.seamstress, true);
});

test("a skipped Seamstress keeps the once-per-game ability for the next night (SNV-SEAMSTRESS-01)", () => {
  const state = make({ 1: "seamstress", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "seamstress");
  assert.equal(skipStep(state, step.key, "declined").ok, true);
  assert.equal(
    state.players["1"].used.seamstress,
    undefined,
    "declining does not spend the ability",
  );
  nextNight(state);
  const next = state.night.queue.find(
    (candidate) => candidate.roleId === "seamstress" && candidate.actorId === "1",
  );
  assert.ok(next, "the Seamstress wakes again after declining");
  const done = stepOutcome(completeStep(state, next.key, { targetIds: ["2", "3"] }));
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(state.players["1"].used.seamstress, true);
});

test("the Flowergirl and the Town Crier answer from the ended day (SNV-FLOWERGIRL-01, SNV-TOWNCRIER-01)", () => {
  const state = make(
    { 1: "flowergirl", 2: "towncrier", 3: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "7", "6");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const voters = state.order.filter((id) => state.players[id].alive);
  assert.equal(recordVotes(state, nomination.nomination!.id, voters).ok, true);
  assert.equal(endDay(state).ok, true);

  const flowergirl = stepFor(state, "flowergirl");
  assert.equal(infoForStep(state, flowergirl).value, true, "a Demon voted today");
  const towncrier = stepFor(state, "towncrier");
  assert.equal(infoForStep(state, towncrier).value, true, "a Minion nominated today");
});

test("a dead Demon's vote still answers the Flowergirl yes (SNV-FLOWERGIRL-01)", () => {
  const state = make(
    { 1: "flowergirl", 2: "clockmaker", 3: "artist", 6: "pithag", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(replaceCharacter(state, "4", "vortox", {}).ok, true);
  kill(state, "4", "ability", { phase: "day", number: 1 }, { demon: true, ability: "vortox" });
  assert.equal(state.players["4"].alive, false, "the second Demon is dead before the vote");
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "6", "2");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const recorded = recordVotes(state, nomination.nomination!.id, ["4"]);
  assert.equal(recorded.ok, true, JSON.stringify(recorded));
  assert.deepEqual(recorded.nomination!.demonVoters, ["4"], "the dead Demon is a Demon voter");
  assert.equal(endDay(state).ok, true);

  assert.equal(
    infoForStep(state, stepFor(state, "flowergirl")).value,
    true,
    "a dead Demon's vote counts",
  );
});

// A d1 where a Minion nominates and every living player votes, so both the
// Flowergirl (a Demon voted) and the Town Crier (a Minion nominated) are true.
function endedMinionNominatedDay(state: GameState): void {
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "7", "6");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const voters = state.order.filter((id) => state.players[id].alive);
  assert.equal(recordVotes(state, nomination.nomination!.id, voters).ok, true);
  // A living Vortox would otherwise win at dusk for the missing execution.
  if (Object.values(state.players).some((player) => player.roleId === "vortox")) {
    assert.equal(executeByDecision(state, "6").ok, true);
  }
  assert.equal(endDay(state).ok, true);
  assert.equal(state.winner, null);
}

test("an impaired Flowergirl and Town Crier may still receive the true answer (SNV-FLOWERGIRL-01, SNV-TOWNCRIER-01)", () => {
  const state = make(
    { 1: "flowergirl", 2: "towncrier", 3: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  endedMinionNominatedDay(state);
  const flowerStep = stepFor(state, "flowergirl");
  const citierStep = stepFor(state, "towncrier");
  const healthyFlower = infoForStep(state, flowerStep);
  const healthyCrier = infoForStep(state, citierStep);
  assert.equal(healthyFlower.needsChoice, false, "a healthy Flowergirl computes its own answer");
  assert.equal(healthyFlower.value, true);
  assert.equal(healthyCrier.needsChoice, false, "a healthy Town Crier computes its own answer");
  assert.equal(healthyCrier.value, true);
  state.effects.push({
    id: "info-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  state.effects.push({
    id: "info-poison-2",
    kind: "poison",
    sourceId: "8",
    targetId: "2",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  const impairedFlower = infoForStep(state, flowerStep);
  const impairedCrier = infoForStep(state, citierStep);
  assert.equal(impairedFlower.needsChoice, true, "the host answers for an impaired Flowergirl");
  assert.ok(impairedFlower.options!.includes(true), "impairment alone may still give the truth");
  assert.equal(impairedFlower.mayBeFalseSuffix, true);
  assert.equal(impairedCrier.needsChoice, true, "the host answers for an impaired Town Crier");
  assert.ok(impairedCrier.options!.includes(true), "impairment alone may still give the truth");
  assert.equal(impairedCrier.mayBeFalseSuffix, true);
});

test("a living Vortox forbids the true Flowergirl and Town Crier answers (SNV-FLOWERGIRL-01, SNV-TOWNCRIER-01)", () => {
  const state = make(
    { 1: "flowergirl", 2: "towncrier", 3: "clockmaker", 7: "cerenovus", 8: "vortox" },
    { count: 8 },
  );
  endedMinionNominatedDay(state);
  const flower = infoForStep(state, stepFor(state, "flowergirl"));
  assert.equal(flower.value, true, "the Vortox voted today");
  assert.equal(flower.needsChoice, true, "the host must give false information");
  assert.equal(flower.falsifiedSuffix, true);
  assert.equal(flower.options!.includes(true), false, "the true answer is not legal");
  assert.deepEqual(flower.options, [false]);
  const crier = infoForStep(state, stepFor(state, "towncrier"));
  assert.equal(crier.value, true, "the Minion nominated today");
  assert.equal(crier.needsChoice, true, "the host must give false information");
  assert.equal(crier.falsifiedSuffix, true);
  assert.equal(crier.options!.includes(true), false, "the true answer is not legal");
  assert.deepEqual(crier.options, [false]);
});

test("the Flowergirl and the Town Crier answer no when neither happened", () => {
  const state = make(
    { 1: "flowergirl", 2: "towncrier", 3: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "1", "6");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  const voters = state.order.filter((id) => state.players[id].alive && id !== "8");
  assert.equal(recordVotes(state, nomination.nomination!.id, voters).ok, true);
  assert.equal(endDay(state).ok, true);

  assert.equal(infoForStep(state, stepFor(state, "flowergirl")).value, false);
  assert.equal(infoForStep(state, stepFor(state, "towncrier")).value, false);
});

test("the Flowergirl detects the Demon who voted before a character change (SNV-FLOWERGIRL-02)", () => {
  const state = make(
    { 1: "flowergirl", 2: "clockmaker", 3: "barber", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "2", "3");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  assert.equal(recordVotes(state, nomination.nomination!.id, ["8", "1"]).ok, true);
  assert.equal(endDay(state).ok, true);

  // Flowergirl r2907: the Demon changed players after the vote; the Flowergirl
  // still detects the original Demon.
  state.players["8"].roleId = "clockmaker";
  state.players["3"].roleId = "fanggu";
  assert.equal(infoForStep(state, stepFor(state, "flowergirl")).value, true);
});

test("the Flowergirl still detects the Demon from the votes when no vote-time snapshot was recorded (SNV-FLOWERGIRL-02)", () => {
  const state = make(
    { 1: "flowergirl", 2: "clockmaker", 3: "barber", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "2", "3");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  assert.equal(recordVotes(state, nomination.nomination!.id, ["8", "1"]).ok, true);
  assert.equal(endDay(state).ok, true);

  // A legacy ledger has no `demonVoters`; the current roles of the voters
  // still answer for the Flowergirl.
  delete state.lastDay!.nominations[0]!.demonVoters;
  assert.equal(infoForStep(state, stepFor(state, "flowergirl")).value, true);
});

test("the Flowergirl ignores a later Demon who voted as a Townsfolk (SNV-FLOWERGIRL-02)", () => {
  const state = make(
    { 1: "flowergirl", 2: "clockmaker", 3: "barber", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(openNominations(state).ok, true);
  const nomination = nominate(state, "2", "3");
  assert.equal(nomination.ok, true, JSON.stringify(nomination));
  assert.equal(recordVotes(state, nomination.nomination!.id, ["3", "1"]).ok, true);
  assert.equal(endDay(state).ok, true);

  state.players["8"].roleId = "clockmaker";
  state.players["3"].roleId = "fanggu";
  assert.equal(
    infoForStep(state, stepFor(state, "flowergirl")).value,
    false,
    "the seat that became the Demon did not vote as one",
  );
});

test("the Juggler's answer counts the guesses from the guessing day (SNV-JUGGLER-02)", () => {
  const state = make(
    { 1: "juggler", 2: "clockmaker", 3: "barber", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  const guess = applyCommand(state, {
    id: "juggler-guess",
    type: "jugglerGuess",
    payload: { playerId: "2", roleId: "clockmaker" },
  });
  assert.equal(guess.status, "allowed", JSON.stringify(guess));
  assert.equal(state.juggler!.correct, 1, "the CORRECT reminder is placed on the guessing day");
  assert.equal(endDay(state).ok, true);

  // The character changes before the Juggler wakes; the marked answer stays.
  state.players["2"].roleId = "sailor";
  assert.equal(infoForStep(state, stepFor(state, "juggler")).value, 1);
});

test("the Flowergirl and Town Crier need a host answer without the ended day", () => {
  const state = make(
    { 1: "flowergirl", 2: "towncrier", 3: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  state.lastDay = null;
  const flowergirl = infoForStep(state, stepFor(state, "flowergirl"));
  assert.equal(flowergirl.kind, "yes-no");
  assert.equal(flowergirl.needsChoice, true, "the missing day is a host answer");
  assert.equal(flowergirl.hostAnswer, true, "the answer is host-supplied, not false information");
  assert.equal(flowergirl.impaired, false, "a missing day is not impairment");
  assert.equal(infoForStep(state, stepFor(state, "towncrier")).needsChoice, true);
  const blocked = stepOutcome(completeStep(state, stepFor(state, "flowergirl").key, {}));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.needsChoice, true);
});

test("the Flowergirl and Town Crier require host answers after manual voting records", () => {
  for (const tokenOnly of [false, true]) {
    const state = make(
      { 1: "flowergirl", 2: "towncrier", 3: "clockmaker", 7: "cerenovus", 8: "fanggu" },
      { count: 8 },
    );
    startNight(state);
    finishNight(state);
    assert.equal(endNight(state).ok, true);
    assert.equal(openNominations(state).ok, true);
    const nomination = nominate(state, "7", "6");
    assert.equal(nomination.ok, true);
    assert.equal(recordVotes(state, nomination.nomination!.id, ["8"]).ok, true);
    if (tokenOnly) kill(state, "3", "test");
    const recorded = applyCommand(state, {
      id: "manual-voting-" + tokenOnly,
      type: tokenOnly ? "setDeadVoteUsed" : "setVoteCount",
      payload: tokenOnly ? { playerId: "3", used: true } : { playerId: "6", count: 5 },
    });
    assert.equal(recorded.status, "allowed", JSON.stringify(recorded));
    assert.equal(endDay(state).ok, true);
    assert.deepEqual(state.lastDay?.voteCounts, tokenOnly ? {} : { 6: 5 });
    for (const role of ["flowergirl", "towncrier"]) {
      const step = stepFor(state, role);
      const info = infoForStep(state, step);
      assert.equal(info.needsChoice, true, role);
      assert.equal(info.hostAnswer, true, role);
      assert.equal(info.value, undefined, "partial identities do not manufacture an answer");
      assert.deepEqual(info.options, [true, false]);
      assert.equal(stepOutcome(completeStep(state, step.key, {})).needsChoice, true);
      assert.equal(
        completeStep(state, step.key, { given: { kind: "yes-no", value: true } }).ok,
        true,
      );
      assert.equal(step.given?.value, true);
    }
  }
});

test("the stored Juggler guesses and ended day are validated", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  assert.deepEqual(validateState(state), []);
  const badJuggler = { ...state, juggler: { day: 1 } };
  assert.ok(validateState(badJuggler).some((error) => error.includes("Juggler")));
  const badGuess = { ...state, juggler: { day: 1, guesses: "x" } };
  assert.ok(validateState(badGuess).some((error) => error.includes("Juggler")));
  const badDay = { ...state, lastDay: { number: 2 } };
  assert.ok(validateState(badDay).some((error) => error.includes("last-day")));
  const badNominations = { ...state, lastDay: { number: 2, nominations: "x" } };
  assert.ok(validateState(badNominations).some((error) => error.includes("last-day")));
});

test("the Juggler guesses on the first day and the night answer counts the matches", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(jugglerGuess(state, "2", "clockmaker").ok, true, "a correct guess is recorded");
  assert.equal(jugglerGuess(state, "6", "clockmaker").ok, true, "a wrong guess is recorded");
  assert.equal(endDay(state).ok, true);

  const step = stepFor(state, "juggler");
  const info = infoForStep(state, step);
  assert.equal(info.kind, "number");
  assert.equal(info.value, 1, "exactly one guess is correct");
  assert.notEqual(info.value, 0, "the answer is computed, not a constant");
  assert.equal(completeStep(state, step.key, {}).ok, true);
});

test("the Juggler may guess zero times and still learns zero (SNV-JUGGLER-01)", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  // The Juggler made no guesses on their first day; the host records that.
  state.juggler = { day: 1, guesses: {} };
  assert.equal(endDay(state).ok, true);
  const step = stepFor(state, "juggler");
  const info = infoForStep(state, step);
  assert.equal(info.kind, "number");
  assert.equal(info.value, 0, "zero guesses is a legal answer");
  assert.equal(completeStep(state, step.key, {}).ok, true);
});

test("the Juggler's answer counts repeated guesses and uses the guessing day", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  // Juggler r3020: up to five players' characters; a player may be guessed
  // more than once with different characters.
  state.juggler = {
    day: 1,
    guesses: [
      { playerId: "2", roleId: "clockmaker" },
      { playerId: "2", roleId: "oracle" },
      { playerId: "6", roleId: "clockmaker" },
    ],
  };
  assert.equal(endDay(state).ok, true);
  const info = infoForStep(state, stepFor(state, "juggler"));
  assert.equal(info.value, 1, "each guess is counted separately");

  // "Your 1st day" is the Juggler's own first day, not day one of the game.
  const later = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  later.night.number = 3;
  later.night.queue = [];
  later.juggler = { day: 2, guesses: { "2": "clockmaker" } };
  const built = buildSvNightQueue(later);
  assert.ok(
    built.some((candidate) => candidate.roleId === "juggler"),
    "the step follows the day the guesses were made",
  );
  later.night.queue = [];
  later.juggler = { day: 1, guesses: { "2": "clockmaker" } };
  assert.equal(
    buildSvNightQueue(later).some((candidate) => candidate.roleId === "juggler"),
    false,
    "guesses from an earlier day do not repeat the step",
  );
});

test("an impaired Juggler may still receive the true count (SNV-JUGGLER-01)", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  state.juggler = { day: 1, guesses: [{ playerId: "2", roleId: "clockmaker" }] };
  assert.equal(endDay(state).ok, true);
  const step = stepFor(state, "juggler");
  const healthy = infoForStep(state, step);
  assert.equal(healthy.needsChoice, false, "a healthy Juggler computes its own answer");
  assert.equal(healthy.value, 1);
  state.effects.push({
    id: "juggler-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  const info = infoForStep(state, step);
  assert.equal(info.needsChoice, true, "the host answers for an impaired Juggler");
  assert.ok(info.options!.includes(info.value), "impairment alone may still give the truth");
  assert.equal(info.falsifiedSuffix, false);
  assert.equal(info.mayBeFalseSuffix, true);
});

test("a Juggler poisoned on the guessing day is healthy at the night answer (SNV-JUGGLER-01)", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  state.juggler = { day: 1, guesses: [{ playerId: "2", roleId: "clockmaker" }] };
  state.effects.push({
    id: "juggler-day-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "day", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  assert.equal(isImpaired(state, "1"), true, "the Juggler is poisoned while guessing");
  assert.equal(endDay(state).ok, true);
  const info = infoForStep(state, stepFor(state, "juggler"));
  assert.equal(isImpaired(state, "1"), false, "the poison ended before the night answer");
  assert.equal(info.needsChoice, false, "a healthy Juggler computes the count");
  assert.equal(info.value, 1);
});

test("a Juggler who dies before the guessing night gets no answer (SNV-JUGGLER-01)", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  state.juggler = { day: 1, guesses: [{ playerId: "2", roleId: "clockmaker" }] };
  kill(state, "1", "ability", { phase: "day", number: 1 }, { demon: true, ability: "fanggu" });
  assert.equal(state.players["1"].alive, false);
  assert.equal(endDay(state).ok, true);
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "juggler"),
    false,
    "a dead Juggler gets no answer step",
  );
});

test("a living Vortox forbids the true Juggler count (SNV-JUGGLER-01)", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  state.juggler = { day: 1, guesses: [{ playerId: "2", roleId: "clockmaker" }] };
  // A living Vortox would otherwise win at dusk for the missing execution.
  assert.equal(executeByDecision(state, "6").ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.winner, null);
  const info = infoForStep(state, stepFor(state, "juggler"));
  assert.equal(info.value, 1);
  assert.equal(info.needsChoice, true, "the host must give false information");
  assert.equal(info.falsifiedSuffix, true);
  assert.equal(info.options!.includes(1), false, "the true count is not a legal answer");
  assert.ok(info.options!.length > 0, "a false count remains available");
});

test("the Juggler command has limits (SNV-JUGGLER-01)", () => {
  const limited = make(
    { 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(limited);
  finishNight(limited);
  assert.equal(endNight(limited).ok, true);
  for (const id of ["2", "3", "4", "5", "6"]) {
    assert.equal(jugglerGuess(limited, id, "clockmaker").ok, true);
  }
  assert.equal(jugglerGuess(limited, "7", "clockmaker").ok, false, "six guesses are too many");
  assert.equal(jugglerGuess(limited, "2", "not-a-character").ok, false);
  assert.equal(endDay(limited).ok, true);
  assert.equal(jugglerGuess(limited, "2", "clockmaker").ok, false, "the first day is over");
});

test("the Klutz loses the game when the public choice is evil (SNV-KLUTZ-01)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "klutz");
  assert.ok(step, "the dead Klutz has a step");
  const result = completeStep(state, step.key, { targetIds: ["7"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.winner && state.winner.team, "evil");
  assert.equal(state.winner && state.winner!.reason, "klutz");
});

test("an evil Klutz choosing an evil player loses for evil", () => {
  const evil = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(evil);
  kill(evil, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  evil.players["1"].team = "evil";
  appendConditionalSteps(evil);
  const evilStep = evil.night.queue.find((candidate) => candidate.roleId === "klutz")!;
  assert.equal(completeStep(evil, evilStep.key, { targetIds: ["7"] }).ok, true);
  assert.equal(evil.winner && evil.winner.team, "good", "the evil Klutz's team is the loser");
  assert.equal(evil.winner && evil.winner.reason, "klutz");

  const good = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(good);
  kill(good, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  good.players["1"].team = "evil";
  appendConditionalSteps(good);
  const goodStep = good.night.queue.find((candidate) => candidate.roleId === "klutz")!;
  assert.equal(completeStep(good, goodStep.key, { targetIds: ["2"] }).ok, true);
  assert.equal(good.winner, null, "a non-evil target does not lose");
});

test("the Klutz choosing a non-evil player does not lose, and a dead choice is rejected", () => {
  const same = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(same);
  kill(same, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(same);
  const sameStep = same.night.queue.find((candidate) => candidate.roleId === "klutz")!;
  assert.equal(completeStep(same, sameStep.key, { targetIds: ["2"] }).ok, true);
  assert.equal(same.winner, null, "a non-evil target does not lose");

  const dead = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(dead);
  kill(dead, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(dead);
  const deadStep = dead.night.queue.find((candidate) => candidate.roleId === "klutz")!;
  const rejected = stepOutcome(completeStep(dead, deadStep.key, { targetIds: ["1"] }));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.55");
  assert.equal(dead.winner, null);
});

test("a drunk Klutz cannot lose the game for their team", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.effects.push({
    id: "test-klutz-drunk",
    kind: "drunk",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "klutz");
  assert.ok(step, "the dead Klutz has a step");
  assert.equal(isImpaired(state, "1"), true, "the Klutz is drunk");
  const result = completeStep(state, step.key, { targetIds: ["8"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.winner, null, "an impaired Klutz does not decide the game");
  assert.equal(state.players["1"].used.klutz, true, "the choice is still spent");
  assert.match(step.note || "", /не сработала/, "the step states the ability failed");
});

test("a Klutz poisoned at death cannot lose even after recovering (SNV-KLUTZ-02)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.effects.push({
    id: "klutz-death-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  state.effects = state.effects.filter((effect) => effect.id !== "klutz-death-poison");
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "klutz")!;
  assert.equal(completeStep(state, step.key, { targetIds: ["8"] }).ok, true);
  assert.equal(state.winner, null, "the ability triggered while poisoned is wasted");
});

test("the Sage learns only after a Demon kill", () => {
  const state = make({ 1: "clockmaker", 2: "sage", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  assert.ok(
    state.night.queue.some((candidate) => candidate.roleId === "sage"),
    "the Demon killed the Sage",
  );

  const other = make({ 1: "clockmaker", 2: "sage", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  laterNight(other);
  kill(other, "2", "ability", { phase: "night", number: 2 }, { ability: "cerenovus" });
  appendConditionalSteps(other);
  assert.equal(
    other.night.queue.some((candidate) => candidate.roleId === "sage"),
    false,
    "a non-Demon death gives no Sage information",
  );
});

test("the Sweetheart makes the chosen player permanently drunk (SNV-SWEETHEART-01)", () => {
  const state = make({ 1: "sweetheart", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "sweetheart");
  assert.ok(step, "the dead Sweetheart has a step");
  assert.equal(completeStep(state, step.key, { targetIds: ["4"] }).ok, true);
  const drunk = state.effects.find((effect) => effect.kind === "drunk" && effect.targetId === "4");
  assert.ok(drunk, "the chosen player is drunk");
  assert.equal(drunk.expires, null, "the drunk lasts to the end of the game");
  assert.equal(drunk.active, true);
  assert.equal(isImpaired(state, "4"), true);
});

test("a Sweetheart poisoned at death makes nobody drunk even after recovering (SNV-SWEETHEART-02)", () => {
  const state = make({ 1: "sweetheart", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.effects.push({
    id: "sweetheart-death-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  state.effects = state.effects.filter((effect) => effect.id !== "sweetheart-death-poison");
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "sweetheart")!;
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(
    state.effects.some((effect) => effect.kind === "drunk" && effect.targetId === "2"),
    false,
  );
});

test("the Dreamer cannot choose themself (SNV-DREAMER-01)", () => {
  const state = make({ 1: "dreamer", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "dreamer");
  const self = stepOutcome(completeStep(state, step.key, { targetIds: ["1"] }));
  assert.equal(self.ok, false);
  assert.equal(self.errorCode, "error.40");
  const info = infoForStep(state, step, { targetIds: ["2"] });
  const pair = String((info.options as string[])[0]).split("|");
  const other = completeStep(state, step.key, {
    targetIds: ["2"],
    given: { kind: "role-pair", pair },
  });
  assert.equal(other.ok, true, JSON.stringify(other));
});

test("redealing clears the Juggler guesses and the ended day", () => {
  const state = make({ 1: "juggler", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(jugglerGuess(state, "2", "clockmaker").ok, true);
  assert.equal(endDay(state).ok, true);
  assert.ok(state.juggler, "the guesses exist");
  assert.ok(state.lastDay, "the ended day is stored");

  const assignment: Record<string, RoleId> = Object.fromEntries(
    state.order.map((id) => [id, state.players[id].roleId!]),
  );
  const rejected = dealGame(state, { assignment });
  assert.equal(rejected.ok, false, "a running game is not re-dealt");
  assert.equal("errorCode" in rejected ? rejected.errorCode : null, "error.47");
  assert.ok(state.juggler, "the running game keeps its guesses");
  assert.ok(state.lastDay, "the running game keeps the ended day");

  state.phase = "deal";
  const redeal = dealGame(state, { assignment });
  assert.equal(redeal.ok, true, JSON.stringify(redeal));
  assert.equal(state.juggler, null, "a fresh game starts without guesses");
  assert.equal(state.lastDay, null, "a fresh game starts without an ended day");
});

function falseInfo(info: InfoResult): Record<string, unknown> {
  const options = Array.isArray(info.options) ? info.options : [];
  // The engine now accepts only an offered answer, so the helper picks one.
  if (info.kind === "number")
    return { kind: "number", value: options.length ? Number(options[0]) : 0, needsChoice: false };
  if (info.kind === "yes-no")
    return {
      kind: "yes-no",
      value: options.length ? Boolean(options[0]) : false,
      needsChoice: false,
    };
  if (info.kind === "role-pair" && options.length)
    return { kind: "role-pair", pair: String(options[0]).split("|"), needsChoice: false };
  if ((info.kind === "character" || info.kind === "one-of-two") && options.length)
    return { kind: info.kind, roleId: String(options[0]), needsChoice: false };
  return { kind: info.kind || "note", needsChoice: false };
}

function finishWholeNight(
  state: GameState,
  demonId: string,
  seen: { juggler?: unknown; [key: string]: unknown },
): void {
  for (let guard = 0; guard < 80; guard += 1) {
    const step = currentStep(state);
    if (!step || state.winner) return;
    const living = state.order.filter((id) => state.players[id].alive && id !== step.actorId);
    const targets = (step.maxTargets || 0) > 0 ? living.slice(0, step.minTargets || 1) : [];
    const info = infoForStep(state, step, { targetIds: targets });
    if (step.roleId === "juggler") seen.juggler = info.value;
    const options: { targetIds: string[]; given?: Record<string, unknown> } = {
      targetIds: targets,
    };
    if (info.needsChoice) options.given = falseInfo(info);
    const result = completeStep(state, step.key, options);
    assert.equal(
      result.ok,
      true,
      (step.roleId || step.system || "") + ": " + JSON.stringify(result),
    );
    if (state.winner) return;
    if (step.canKill && step.actorId === demonId) {
      const victim = state.order.find(
        (id) =>
          state.players[id].alive &&
          id !== demonId &&
          roleTeam(state.players[id].roleId || "") !== "demon",
      );
      if (victim) recordSvOutcome(state, step.key, { deathIds: [victim] });
    }
  }
  throw new Error("night did not finish");
}

test("a full Sects and Violets game runs from setup to a winner", () => {
  const state = make(
    { 1: "clockmaker", 2: "oracle", 3: "cerenovus", 4: "vortox", 8: "juggler" },
    { count: 8 },
  );
  const demonId = "4";
  assert.deepEqual(setupErrors(state), []);
  assert.equal(startNight(state).ok, true);
  const seen: { juggler?: unknown } = {};
  for (let round = 0; round < 12 && !state.winner; round += 1) {
    finishWholeNight(state, demonId, seen);
    if (state.winner) break;
    assert.equal(endNight(state).ok, true);
    if (state.winner) break;
    if (state.day.number === 1) {
      assert.equal(jugglerGuess(state, "6", state.players["6"].roleId!).ok, true);
      assert.equal(jugglerGuess(state, "7", "juggler").ok, true);
    }
    assert.equal(openNominations(state).ok, true);
    const victim = state.order.find(
      (id) => state.players[id].alive && roleTeam(state.players[id].roleId || "") !== "demon",
    );
    assert.ok(victim, "a Townsfolk remains to execute");
    const executed = executeByDecision(state, victim);
    assert.equal(executed.ok, true, JSON.stringify(executed));
    if (state.winner) break;
    assert.equal(endDay(state).ok, true);
  }
  assert.ok(state.winner, "the game reaches a winner");
  assert.deepEqual(validateState(state), []);
  assert.equal(seen.juggler, 1, "the Juggler's night answer counts the first-day guesses");
});

// ---------------------------------------------------------------------------
// Issue #171 section 3: Sects and Violets audit fixes

test("the Klutz public choice resolves the game as soon as the Klutz learns of the death (SNV-KLUTZ-01)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(state, "1").ok, true);
  assert.equal(state.players["1"].alive, false);
  const result = recordKlutzChoice(state, "8");
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(state.winner && state.winner.team, "evil", "an evil choice loses immediately");
  assert.equal(state.winner && state.winner.reason, "klutz");
  assert.equal(state.players["1"].used.klutz, true, "the once-per-game is spent");
  assert.equal(state.players["1"].used.klutzTarget, "8", "the public choice is recorded");
});

test("a recorded Klutz choice finishes the queued step and a dead target does not strand it (SNV-KLUTZ-01)", () => {
  const state = make({ 1: "klutz", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "1", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "klutz")!;
  assert.ok(step, "the dead Klutz has a step");
  // The target the player meant to choose died first: the host must be able to
  // choose any player who is alive at the moment of the public choice.
  const rejected = recordKlutzChoice(state, "1");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.errorCode, "error.55", "a dead target is refused, not stranded");
  assert.equal(recordKlutzChoice(state, "2").ok, true, "another living player is legal");
  assert.equal(step.done, true, "the public choice completes the queued step");
  assert.deepEqual(step.targetIds, ["2"]);
  assert.equal(state.winner, null, "a good choice does not lose");
});

test("a Pit-Hag-created Demon does not take the Demon turn and its deaths are not Demon attacks (SNV-PITHAG-01)", () => {
  const state = make({ 1: "clockmaker", 2: "sage", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const newDemon = ["nodashii", "vortox", "vigormortis"].find(
    (id) => !rolesInPlay(state).includes(id),
  ) as RoleId;
  const created = runStep(state, "pithag-demon-create", {
    key: step.key,
    targetIds: ["3"],
    roleId: newDemon,
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.equal(state.players["3"].roleId, newDemon);
  assert.equal(
    state.night.queue.some(
      (candidate) => candidate.roleId === newDemon && !candidate.done && !candidate.skipped,
    ),
    false,
    "the created Demon does not wake again tonight",
  );
  assert.equal(step.canKill, false, "the fresh step offers no death");
  const completed = stepFor(state, "pithag");
  assert.equal(
    completed.canKill,
    true,
    "the host records the arbitrary deaths on the Pit-Hag step",
  );
  const outcome = recordSvOutcome(state, completed.key, { deathIds: ["2"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  const death = state.deaths.find((entry) => entry.playerId === "2")!;
  assert.ok(death, "the Sage died");
  assert.notEqual(death.demon, true, "the death is a Pit-Hag attack, not a Demon attack");
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "sage"),
    false,
    "the Sage does not wake for a Pit-Hag death",
  );
});

test("a Pit-Hag step records no arbitrary death until the host creates a Demon (SNV-PITHAG-01)", () => {
  const state = make({ 1: "clockmaker", 2: "sage", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  assert.equal(step.canKill, false, "a fresh Pit-Hag step offers no death");
  const nothing = runStep(state, "pithag-in-play", {
    key: step.key,
    targetIds: ["3"],
    roleId: "clockmaker",
  });
  assert.equal(nothing.status, "allowed", JSON.stringify(nothing));
  assert.equal(step.canKill, false, "a character already in play creates no Demon");
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["2"] });
  assert.equal(outcome.ok, false, "no created Demon, no arbitrary death");
  assert.equal(outcome.errorCode, "error.51");
  assert.equal(state.players["2"].alive, true, "the marked death did not land");
});

test("a Pit-Hag death marked under the earlier ruleset keeps its death (SNV-PITHAG-01)", () => {
  const state = make({ 1: "clockmaker", 2: "sage", 6: "pithag", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const ports = {
    ...systemPorts,
    rulesetVersion: OPEN_PITHAG_STEP_RULESET_VERSION,
  } satisfies CommandExecutionContext;
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["2"] }, ports);
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["2"].alive, false, "a recorded command replays as written");
});

test("Vortox and impairment make the Dreamer, Sage and Mathematician answers false choices", () => {
  const state = make({ 1: "dreamer", 2: "sage", 3: "mathematician", 7: "vortox" }, { count: 8 });
  startNight(state);
  // The Vortox ends a day without an execution, so the second night is built
  // directly to keep the Demon alive for the information check.
  state.night.number = 2;
  state.night.queue = buildSvNightQueue(state);
  const vortox = stepFor(state, "vortox");
  assert.equal(completeStep(state, vortox.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordSvOutcome(state, vortox.key, { deathIds: ["2"] }).ok, true);
  for (const roleId of ["dreamer", "mathematician", "sage"]) {
    const step = stepFor(state, roleId);
    const info = infoForStep(state, step);
    assert.equal(info.needsChoice, true, roleId + " demands a false answer under a Vortox");
    const targets = (step.minTargets || 0) > 0 ? ["2"] : [];
    const blocked = stepOutcome(completeStep(state, step.key, { targetIds: targets }));
    assert.equal(blocked.needsChoice, true, roleId + " is blocked without the host answer");
  }

  const clear = make({ 1: "dreamer", 2: "sage", 3: "mathematician", 7: "fanggu" }, { count: 8 });
  laterNight(clear);
  const clearInfo = infoForStep(clear, stepFor(clear, "dreamer"), { targetIds: ["2"] });
  assert.equal(clearInfo.needsChoice, true, "a healthy Dreamer records the pair the host shows");
  assert.ok(
    Array.isArray(clearInfo.options) && clearInfo.options.length > 0,
    "the recorded pair comes from the checked options",
  );
});

test("a host answer to the Dreamer and the Sage changes no game state and stays private (SNV-DREAMER-01, SNV-SAGE-01)", () => {
  const state = make({ 1: "dreamer", 2: "sage", 7: "vortox" }, { count: 8 });
  startNight(state);
  state.night.number = 2;
  state.night.queue = buildSvNightQueue(state);
  const demon = stepFor(state, "vortox");
  assert.equal(completeStep(state, demon.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordSvOutcome(state, demon.key, { deathIds: ["2"] }).ok, true);
  const answers = new Map<RoleId, Record<string, unknown>>();
  const seatsBefore = JSON.stringify(state.players);
  const effectsBefore = JSON.stringify(state.effects);
  const deathsBefore = JSON.stringify(state.deaths);
  for (const roleId of ["dreamer", "sage"] as const) {
    const step = stepFor(state, roleId);
    const targets = (step.minTargets || 0) > 0 ? ["3"] : [];
    const info = infoForStep(state, step, { targetIds: targets });
    assert.equal(info.needsChoice, true, roleId + " asks for the shown pair");
    const pair = String((info.options as unknown[])[0]).split("|");
    const answer = { kind: info.kind, pair };
    answers.set(roleId, answer);
    const done = completeStep(state, step.key, { targetIds: targets, given: answer });
    assert.equal(done.ok, true, roleId + ": " + JSON.stringify(done));
    assert.deepEqual(step.given, answer, roleId + " stores the host answer");
    assert.equal(
      state.log.some((entry) => entry.case === "information-pair" && entry.secret === true),
      true,
      roleId + " records the pair as a secret host choice",
    );
  }
  assert.equal(JSON.stringify(state.players), seatsBefore, "a host answer changes no seat");
  assert.equal(JSON.stringify(state.effects), effectsBefore, "a host answer adds no effect");
  assert.equal(JSON.stringify(state.deaths), deathsBefore, "a host answer adds no death");
  assert.equal(state.winner, null, "a host answer declares no winner");
  for (const answer of answers.values()) {
    assert.equal(
      JSON.stringify(publicGameView(state)).includes((answer.pair as string[]).join("|")),
      false,
      "the answer stays out of the public view",
    );
  }
  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, JSON.stringify(restored));
  if (!restored.ok) return;
  for (const roleId of ["dreamer", "sage"] as const) {
    assert.deepEqual(
      restored.state.night.queue.find((candidate) => candidate.roleId === roleId)!.given,
      answers.get(roleId),
      roleId + " keeps the host answer through export and import",
    );
  }
});

// Dreamer r2904: one good and one evil character, one correct. The false
// character depends on the chosen player's kind, and a Vortox makes both false.
test("a sober Dreamer offers only the target's character with an opposite-kind character (SNV-DREAMER-01)", () => {
  const state = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "dreamer");
  const info = infoForStep(state, step, { targetIds: ["2"] });
  assert.equal(info.kind, "role-pair");
  assert.equal(info.needsChoice, true, "the host records the shown pair");
  assert.equal(info.falsifiedSuffix, false, "the pair may be true");
  const options = (info.options as string[]).map((value) => value.split("|"));
  assert.ok(options.length > 0, "the sober Dreamer has legal pairs");
  for (const [good, evil] of options) {
    assert.ok(roleTeam(good) === "townsfolk" || roleTeam(good) === "outsider", good);
    assert.ok(roleTeam(evil) === "minion" || roleTeam(evil) === "demon", evil);
    assert.ok(good === "clockmaker" || evil === "clockmaker", "exactly one true character");
  }
  assert.ok(options.some(([good, evil]) => good === "clockmaker" && evil === "fanggu"));
  assert.ok(
    options.some(([good, evil]) => good === "clockmaker" && evil === "imp"),
    "a custom script does not restrict the false character to its own roles",
  );

  const before = JSON.stringify(state.players) + JSON.stringify(state.effects);
  const wrong = stepOutcome(
    completeStep(state, step.key, {
      targetIds: ["2"],
      given: { kind: "role-pair", pair: ["klutz", "fanggu"] },
    }),
  );
  assert.equal(wrong.needsChoice, true);
  assert.equal(wrong.errorCode, "error.66");
  assert.equal(step.done, false, "a refused pair completes nothing");
  assert.equal(JSON.stringify(state.players) + JSON.stringify(state.effects), before);

  const done = stepOutcome(
    completeStep(state, step.key, {
      targetIds: ["2"],
      given: { kind: "role-pair", pair: ["clockmaker", "fanggu"] },
    }),
  );
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.deepEqual(step.given, { kind: "role-pair", pair: ["clockmaker", "fanggu"] });
  const choice = state.log.find((entry) => entry.case === "information-pair");
  assert.ok(choice, "the pair is a host choice");
  assert.equal(choice.secret, true, "the pair stays secret");
  assert.ok(String(choice.detail).includes("clockmaker"));
  assert.equal(
    JSON.stringify(publicGameView(state)).includes("clockmaker|fanggu"),
    false,
    "the public view omits the pair",
  );
});

test("a sober Dreamer shows a Minion or Demon target's character as the evil member (SNV-DREAMER-01)", () => {
  const state = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "dreamer");
  const info = infoForStep(state, step, { targetIds: ["7"] });
  assert.equal(info.kind, "role-pair");
  const options = (info.options as string[]).map((value) => value.split("|"));
  assert.ok(options.length > 0);
  for (const [good, evil] of options) {
    assert.ok(roleTeam(good) === "townsfolk" || roleTeam(good) === "outsider", good);
    assert.equal(evil, "cerenovus", "the Minion is the correct character in every pair");
  }
  const done = stepOutcome(
    completeStep(state, step.key, {
      targetIds: ["7"],
      given: { kind: "role-pair", pair: ["clockmaker", "cerenovus"] },
    }),
  );
  assert.equal(done.ok, true, JSON.stringify(done));
});

test("an impaired Dreamer may show any good and evil pair, a Vortox forbids the true one (SNV-DREAMER-01)", () => {
  const impaired = make(
    { 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(impaired);
  impaired.effects.push({
    id: "dreamer-pair-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  const impairedStep = stepFor(impaired, "dreamer");
  const impairedInfo = infoForStep(impaired, impairedStep, { targetIds: ["2"] });
  assert.equal(impairedInfo.needsChoice, true);
  assert.equal(impairedInfo.mayBeFalseSuffix, true, "impairment alone permits a false pair");
  assert.ok(
    (impairedInfo.options as string[]).includes("clockmaker|fanggu"),
    "the true pair stays legal",
  );
  assert.ok(
    (impairedInfo.options as string[]).includes("klutz|fanggu"),
    "a false pair is legal too",
  );
  const falsePair = stepOutcome(
    completeStep(impaired, impairedStep.key, {
      targetIds: ["2"],
      given: { kind: "role-pair", pair: ["klutz", "fanggu"] },
    }),
  );
  assert.equal(falsePair.ok, true, JSON.stringify(falsePair));

  const vortox = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(vortox);
  const vortoxStep = stepFor(vortox, "dreamer");
  const vortoxInfo = infoForStep(vortox, vortoxStep, { targetIds: ["2"] });
  assert.equal(vortoxInfo.falsifiedSuffix, true, "the Vortox makes the false pair mandatory");
  for (const option of vortoxInfo.options as string[]) {
    assert.equal(option.split("|").includes("clockmaker"), false, "no pair names the truth");
  }
  const truth = stepOutcome(
    completeStep(vortox, vortoxStep.key, {
      targetIds: ["2"],
      given: { kind: "role-pair", pair: ["clockmaker", "fanggu"] },
    }),
  );
  assert.equal(truth.needsChoice, true);
  assert.equal(truth.errorCode, "error.66");
});

// Sage r3009: point at two players, one who is the Demon that killed the Sage.
// The mirror case is a Vortox, where neither may be the Demon.
test("a sober Sage offers only pairs with the Demon that killed them (SNV-SAGE-01)", () => {
  const state = make({ 1: "clockmaker", 2: "sage", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "sage")!;
  assert.ok(step, "the Demon killed the Sage");
  const info = infoForStep(state, step);
  assert.equal(info.kind, "player-pair");
  assert.equal(info.needsChoice, true, "the host records the two players shown");
  const options = (info.options as string[]).map((value) => value.split("|"));
  assert.equal(options.length, 7, "the Demon paired with each other seat");
  for (const pair of options) {
    assert.equal(pair.filter((id) => id === "8").length, 1, "exactly one Demon in each pair");
  }

  const wrong = stepOutcome(
    completeStep(state, step.key, { given: { kind: "player-pair", pair: ["1", "3"] } }),
  );
  assert.equal(wrong.needsChoice, true);
  assert.equal(wrong.errorCode, "error.66");
  assert.equal(step.done, false, "a refused pair completes nothing");

  const done = stepOutcome(
    completeStep(state, step.key, { given: { kind: "player-pair", pair: ["1", "8"] } }),
  );
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.deepEqual(step.given, { kind: "player-pair", pair: ["1", "8"] });
  const choice = state.log.find((entry) => entry.case === "information-pair");
  assert.ok(choice, "the pair is a host choice");
  assert.equal(choice.secret, true, "the pair stays secret");
  assert.equal(
    JSON.stringify(publicGameView(state)).includes("1|8"),
    false,
    "the public view omits the pair",
  );
});

test("an impaired Sage may show the Demon, and a Vortox forbids it (SNV-SAGE-01)", () => {
  const impaired = make({ 1: "clockmaker", 2: "sage", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  laterNight(impaired);
  impaired.effects.push({
    id: "sage-pair-poison",
    kind: "poison",
    sourceId: "8",
    targetId: "2",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  kill(impaired, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(impaired);
  const impairedStep = impaired.night.queue.find((candidate) => candidate.roleId === "sage")!;
  const impairedInfo = infoForStep(impaired, impairedStep);
  assert.equal(impairedInfo.mayBeFalseSuffix, true, "impairment alone permits a false pair");
  assert.ok((impairedInfo.options as string[]).includes("1|8"), "the true pair stays legal");
  assert.ok((impairedInfo.options as string[]).includes("1|3"), "a false pair is legal too");

  const vortox = make({ 1: "clockmaker", 2: "sage", 7: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(vortox);
  // The Vortox wins a day without an execution, so the second night is built
  // directly to keep the Demon alive for the information check.
  vortox.night.number = 2;
  vortox.night.queue = buildSvNightQueue(vortox);
  kill(vortox, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "vortox" });
  appendConditionalSteps(vortox);
  const vortoxStep = vortox.night.queue.find((candidate) => candidate.roleId === "sage")!;
  const vortoxInfo = infoForStep(vortox, vortoxStep);
  assert.equal(vortoxInfo.falsifiedSuffix, true, "the Vortox makes the false pair mandatory");
  for (const option of vortoxInfo.options as string[]) {
    assert.equal(option.split("|").includes("8"), false, "no pair names the Demon");
  }
  const truth = stepOutcome(
    completeStep(vortox, vortoxStep.key, { given: { kind: "player-pair", pair: ["1", "8"] } }),
  );
  assert.equal(truth.needsChoice, true);
  assert.equal(truth.errorCode, "error.66");
});

test("the Dreamer pair survives preview, apply, replay, undo and export (SNV-DREAMER-01)", () => {
  const state = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  const step = stepFor(state, "dreamer");
  const command: Command = {
    id: "dreamer-pair-replay",
    type: "completeNightStep",
    payload: {
      key: step.key,
      targetIds: ["2"],
      given: { kind: "role-pair", pair: ["clockmaker", "fanggu"] },
    },
    at: "2030-01-01T00:00:00.000Z",
  };
  const before = clone(state);
  const base = clone(before);
  delete (base as Partial<GameState>).journal;
  state.journal = { base, entries: [] };
  state.applied = {};

  const preview = previewCommand(before, command) as { status: string };
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  const applied = applyCommand(state, command) as { status: string };
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  const replayed = replay({ base: clone(before), entries: state.journal.entries });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));

  const undone = replay({ base: clone(before), entries: state.journal.entries.slice(0, -1) });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), canonicalState(before));

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, JSON.stringify(restored));
  if (!restored.ok) return;
  assert.deepEqual(
    restored.state.night.queue.find((candidate) => candidate.roleId === "dreamer")!.given,
    {
      kind: "role-pair",
      pair: ["clockmaker", "fanggu"],
    },
  );
});

test("a saved 0.4.1 journal replays its sober Dreamer and Sage answers without a pair (SNV-DREAMER-01, SNV-SAGE-01)", () => {
  const text = readFileSync(
    new URL("./fixtures/legacy-dreamer-sage-game.json", import.meta.url),
    "utf8",
  );
  const imported = importGame(text);
  assert.equal(imported.ok, true, JSON.stringify(imported));
  if (!imported.ok) return;
  const state = imported.state;
  const sage = state.night.queue.find((candidate) => candidate.roleId === "sage");
  assert.equal(sage?.given?.kind, "note", "the old answer is the free-text note");
  assert.equal(
    state.journal.entries.every((entry) => entry.rulesetVersion === "tb-bmr-snv-2026-11-17.4"),
    true,
    "the fixture holds the released 0.4.1 commands",
  );

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));
  const restored = importGame(exportGame(replayed.state));
  assert.equal(restored.ok, true, JSON.stringify(restored));

  const undone = replay({
    base: clone(state.journal.base),
    entries: state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.notDeepEqual(canonicalState(undone.state), canonicalState(state));
  const continued = applyCommand(undone.state, {
    id: "legacy-continue",
    type: "endNight",
    payload: {},
    at: "2026-11-18T11:00:00.000Z",
  });
  assert.equal(continued.status, "allowed", JSON.stringify(continued));
});

test("an old-version Dreamer command keeps the free-text answer and a current command requires the pair (SNV-DREAMER-01)", () => {
  const build = () => {
    const state = make(
      { 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" },
      { count: 8 },
    );
    startNight(state);
    return state;
  };
  const old = build();
  const oldStep = stepFor(old, "dreamer");
  const legacy = applyCommand(old, {
    id: "legacy-dreamer-command",
    type: "completeNightStep",
    payload: { key: oldStep.key, targetIds: ["2"] },
    at: "2026-11-18T11:01:00.000Z",
    rulesetVersion: "tb-bmr-snv-2026-11-17.4",
  });
  assert.equal(legacy.status, "allowed", JSON.stringify(legacy));
  assert.equal(
    old.night.queue.find((candidate) => candidate.roleId === "dreamer")!.given?.kind,
    "note",
    "the old command stores the note, not a pair",
  );

  const fresh = build();
  const freshStep = stepFor(fresh, "dreamer");
  const current = applyCommand(fresh, {
    id: "current-dreamer-command",
    type: "completeNightStep",
    payload: { key: freshStep.key, targetIds: ["2"] },
    at: "2026-11-18T11:02:00.000Z",
  });
  assert.equal(current.status, "requires-storyteller-choice", JSON.stringify(current));
  assert.equal(freshStep.done, false);
});

test("an old-version false Dreamer answer stays free text and a current note is rejected (SNV-DREAMER-01)", () => {
  const build = () => {
    const state = make(
      { 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "vortox" },
      { count: 8 },
    );
    startNight(state);
    return state;
  };
  const answer = { kind: "note", text: "Ложный сон: один добрый и один злой персонаж" };
  const old = build();
  const oldStep = stepFor(old, "dreamer");
  const legacy = applyCommand(old, {
    id: "legacy-note-answer",
    type: "completeNightStep",
    payload: { key: oldStep.key, targetIds: ["2"], given: answer },
    at: "2026-11-18T11:03:00.000Z",
    rulesetVersion: "tb-bmr-snv-2026-11-17.4",
  });
  assert.equal(legacy.status, "allowed", JSON.stringify(legacy));
  assert.deepEqual(
    old.night.queue.find((candidate) => candidate.roleId === "dreamer")!.given,
    answer,
  );

  const fresh = build();
  const freshStep = stepFor(fresh, "dreamer");
  const current = applyCommand(fresh, {
    id: "current-note-answer",
    type: "completeNightStep",
    payload: { key: freshStep.key, targetIds: ["2"], given: answer },
    at: "2026-11-18T11:04:00.000Z",
  });
  assert.equal(current.status, "requires-storyteller-choice", JSON.stringify(current));
  assert.equal("errorCode" in current ? current.errorCode : null, "error.66");
  assert.equal(freshStep.done, false);
});

test("the Sage shows the Demon who killed them after the Barber moves the Demon character (SNV-SAGE-01)", () => {
  const state = make(
    {
      1: "clockmaker",
      2: "sage",
      3: "nodashii",
      4: "barber",
      5: "artist",
      6: "oracle",
      7: "cerenovus",
      8: "juggler",
    },
    { count: 8 },
  );
  laterNight(state);
  // The Barber died tonight, so its death-triggered swap is available.
  kill(state, "4", "ability", { phase: "night", number: 2 }, {});
  appendConditionalSteps(state);

  const demon = stepFor(state, "nodashii");
  assert.equal(completeStep(state, demon.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordSvOutcome(state, demon.key, { deathIds: ["2"] }).ok, true);
  const death = state.deaths.find((candidate) => candidate.playerId === "2");
  assert.equal(death?.attackerId, "3", "the attack records the Demon who killed the Sage");

  const barber = stepFor(state, "barber");
  assert.equal(completeStep(state, barber.key, { targetIds: ["3", "5"] }).ok, true);
  assert.equal(state.players["5"].roleId, "nodashii", "the Demon character moved after the kill");
  assert.equal(state.players["3"].roleId, "artist");

  const sage = state.night.queue.find((candidate) => candidate.roleId === "sage")!;
  const info = infoForStep(state, sage);
  const options = (info.options as string[]).map((value) => value.split("|"));
  assert.ok(options.length > 0, "the Sage has legal pairs");
  assert.equal(
    options.every((pair) => pair.includes("3")),
    true,
    "every pair names the Demon who killed the Sage, not the current holder",
  );
  assert.equal(
    options.some((pair) => !pair.includes("5")),
    true,
    "the current holder is not required",
  );
  assert.equal(
    options.some((pair) => pair.includes("4")),
    true,
    "a dead player may be the second player shown",
  );
  const done = stepOutcome(
    completeStep(state, sage.key, { given: { kind: "player-pair", pair: ["3", "4"] } }),
  );
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.deepEqual(sage.given, { kind: "player-pair", pair: ["3", "4"] });
});

test("the Dreamer may show a registered Spy or Recluse character, and a Vortox forbids the true one (SNV-DREAMER-01, TB-SPY-01, TB-RECLUSE-01)", () => {
  const spy = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(spy);
  spy.players["2"].roleId = "spy";
  spy.players["2"].team = "evil";
  const spyInfo = infoForStep(spy, stepFor(spy, "dreamer"), { targetIds: ["2"] });
  const spyOptions = (spyInfo.options as string[]).map((value) => value.split("|"));
  assert.ok(
    spyOptions.some(([good, evil]) => good !== "clockmaker" && roleTeam(evil) === "demon"),
    "a registered good character is a legal true answer",
  );
  assert.ok(
    spyOptions.some(([, evil]) => evil === "spy"),
    "the raw Spy character is legal too",
  );

  const recluse = make(
    { 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" },
    { count: 8 },
  );
  startNight(recluse);
  recluse.players["2"].roleId = "recluse";
  const recluseInfo = infoForStep(recluse, stepFor(recluse, "dreamer"), { targetIds: ["2"] });
  const recluseOptions = (recluseInfo.options as string[]).map((value) => value.split("|"));
  assert.ok(
    recluseOptions.some(([good, evil]) => good === "recluse" && evil === "imp"),
    "a registered evil character is a legal true answer",
  );

  const vortox = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "vortox" }, { count: 8 });
  startNight(vortox);
  vortox.players["2"].roleId = "spy";
  vortox.players["2"].team = "evil";
  const vortoxInfo = infoForStep(vortox, stepFor(vortox, "dreamer"), { targetIds: ["2"] });
  assert.ok((vortoxInfo.options as string[]).length > 0, "a false pair always remains");
  for (const option of vortoxInfo.options as string[]) {
    assert.equal(option.split("|").includes("spy"), false, "no pair names the true Spy");
  }
});

test("an unknown target character offers no pair and the engine refuses a fabricated one (SNV-DREAMER-01)", () => {
  const state = make({ 1: "dreamer", 2: "clockmaker", 7: "cerenovus", 8: "fanggu" }, { count: 8 });
  startNight(state);
  state.players["2"].roleId = null;
  const step = stepFor(state, "dreamer");
  const info = infoForStep(state, step, { targetIds: ["2"] });
  assert.equal(info.kind, "role-pair");
  assert.deepEqual(info.options, []);
  const blocked = stepOutcome(
    completeStep(state, step.key, {
      targetIds: ["2"],
      given: { kind: "role-pair", pair: ["clockmaker", "fanggu"] },
    }),
  );
  assert.equal(blocked.needsChoice, true);
  assert.equal(blocked.errorCode, "error.66");
  assert.equal(step.done, false);
});

test("a drunk dead Minion loses the Vigormortis retention and the neighbour poison until sober (SNV-VIGORMORTIS-02)", () => {
  const state = make({ 1: "clockmaker", 2: "cerenovus", 8: "vigormortis" }, { count: 8 });
  laterNight(state);
  const step = stepFor(state, "vigormortis");
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordSvOutcome(state, step.key, { deathIds: ["2"] }).ok, true);
  const poison = state.effects.find((effect) => effect.vigormortis === true)!;
  assert.ok(poison, "the neighbour poison exists");
  assert.equal(poison.active, true);
  assert.equal(minionRetainsAbility(state, "2"), true, "the dead Minion keeps the ability");

  const drunk = {
    id: "test-dead-minion-drunk",
    kind: "drunk",
    sourceId: "1",
    targetId: "2",
    start: { phase: "night" as const, number: 2 },
    expires: null,
    active: true,
  };
  state.effects.push(drunk);
  reconcileVigormortisPoison(state);
  assert.equal(isImpaired(state, "2"), true, "the dead Minion is drunk");
  assert.equal(
    minionRetainsAbility(state, "2"),
    false,
    "a drunk Minion loses the retained ability",
  );
  assert.equal(poison.active, false, "the permanent neighbour poison does not bypass impairment");
  assert.equal(isImpaired(state, poison.targetId!), false, "the poisoned neighbour is healthy");

  state.effects = state.effects.filter((effect) => effect !== drunk);
  reconcileVigormortisPoison(state);
  assert.equal(minionRetainsAbility(state, "2"), true, "the ability returns when sober");
  assert.equal(poison.active, true);
  assert.equal(isImpaired(state, poison.targetId!), true);
});

test("a Philosopher who borrowed the Klutz still makes the public choice after dying (SNV-PHILOSOPHER-01)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const borrowed = runStep(state, "philosopher-klutz", {
    key: stepFor(state, "philosopher").key,
    roleId: "klutz",
  });
  assert.equal(borrowed.status, "allowed", JSON.stringify(borrowed));
  assert.equal(state.players["1"].used.philosopherAbility, "klutz");
  kill(state, "1", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === "klutz" && candidate.actorId === "1",
  );
  assert.ok(step, "the borrowed Klutz ability wakes after the Philosopher dies");
  assert.equal(completeStep(state, step.key, { targetIds: ["7"] }).ok, true);
  assert.equal(state.winner && state.winner.reason, "klutz");
  assert.equal(state.winner && state.winner.team, "evil");
});

test("the Sweetheart drunk starts at the death, not at the Sweetheart night slot (SNV-SWEETHEART-01)", () => {
  const state = make({ 1: "sweetheart", 2: "clockmaker", 8: "fanggu" }, { count: 8 });
  laterNight(state);
  state.phase = "day";
  state.day = {
    number: 2,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(state, "1").ok, true);
  assert.equal(state.players["1"].alive, false, "the Sweetheart was executed");
  state.phase = "night";
  state.night.number = 3;
  state.night.queue = [];
  appendConditionalSteps(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "sweetheart");
  assert.ok(step, "the dead Sweetheart has a step");
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  const drunk = state.effects.find((effect) => effect.kind === "drunk" && effect.targetId === "2")!;
  assert.ok(drunk, "the chosen player is drunk");
  assert.equal(drunk.start.phase, "day", "the drunk starts at the death");
  assert.equal(drunk.start.number, 2);
});

test("a Pit-Hag-created Evil Twin keeps the twin win and the good-win block (SNV-EVILTWIN-01)", () => {
  const state = make({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(state);
  const step = stepFor(state, "pithag");
  const created = runStep(state, "pithag-eviltwin", {
    key: step.key,
    targetIds: ["2"],
    roleId: "eviltwin",
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.equal(state.players["2"].roleId, "eviltwin");
  assert.equal(realTeamOf(state.players["2"]), "good", "the changed player keeps good alignment");
  assert.equal(
    state.setup.evilTwinGoodPlayerId,
    null,
    "the engine does not infer the partner; the host chooses it",
  );
  assert.equal(state.setup.evilTwinPlayerId, null, "the pair starts unset");
  const partner = applyCommand(state, {
    id: "pithag-eviltwin-partner",
    type: "manualCorrection",
    payload: {
      change: {
        kind: "twin",
        playerId: "2",
        value: "6",
        reason: "The Storyteller chose the opposing twin.",
      },
    },
  });
  assert.equal(partner.status, "allowed", JSON.stringify(partner));
  assert.equal(state.setup.evilTwinGoodPlayerId, "2", "the good holder is the good side");
  const evilTwin = state.setup.evilTwinPlayerId;
  assert.equal(evilTwin, "6", "the host chose the evil side");
  assert.equal(state.players[evilTwin!].alive, true);
  assert.equal(realTeamOf(state.players[evilTwin!]), "evil", "the partner is evil");

  // Executing the good twin still wins for evil.
  state.phase = "day";
  state.day = {
    number: 3,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(state, "2").ok, true);
  assert.equal(state.winner && state.winner.reason, "evil-twin");

  const blocked = make({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 7: "fanggu" }, { count: 7 });
  laterNight(blocked);
  const blockedStep = stepFor(blocked, "pithag");
  assert.equal(
    runStep(blocked, "pithag-eviltwin-block", {
      key: blockedStep.key,
      targetIds: ["2"],
      roleId: "eviltwin",
    }).status,
    "allowed",
  );
  const blockedPartner = applyCommand(blocked, {
    id: "pithag-eviltwin-block-partner",
    type: "manualCorrection",
    payload: {
      change: {
        kind: "twin",
        playerId: "2",
        value: "6",
        reason: "The Storyteller chose the opposing twin.",
      },
    },
  });
  assert.equal(blockedPartner.status, "allowed", JSON.stringify(blockedPartner));
  blocked.players["7"].alive = false;
  assert.equal(
    checkWin(blocked),
    null,
    "good cannot win while both twins live and the Demon is dead",
  );
});

test("a Pit-Hag-created Evil Twin needs the host's explicit partner (SNV-EVILTWIN-03)", () => {
  const state = make({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 7: "fanggu" }, { count: 10 });
  laterNight(state);
  const evilTarget = state.order.find(
    (id) =>
      id !== "6" &&
      id !== "7" &&
      state.players[id].alive &&
      realTeamOf(state.players[id]) === "evil",
  );
  assert.ok(evilTarget, "a living evil non-Demon exists");
  const step = stepFor(state, "pithag");
  const created = runStep(state, "pithag-eviltwin-evil", {
    key: step.key,
    targetIds: [evilTarget],
    roleId: "eviltwin",
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
  assert.equal(realTeamOf(state.players[evilTarget]), "evil", "the changed player stays evil");
  assert.equal(state.setup.evilTwinPlayerId, null, "the pair starts unset");
  assert.equal(state.setup.evilTwinGoodPlayerId, null);
  const goodTarget = state.order.find(
    (id) =>
      id !== evilTarget && realTeamOf(state.players[id]) === "good" && state.players[id].alive,
  )!;
  const chosen = applyCommand(state, {
    id: "pithag-eviltwin-evil-partner",
    type: "manualCorrection",
    payload: {
      change: {
        kind: "twin",
        playerId: evilTarget,
        value: goodTarget,
        reason: "The Storyteller chose the opposing twin.",
      },
    },
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(state.setup.evilTwinPlayerId, evilTarget, "the evil player is the Evil Twin side");
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  assert.equal(goodTwin, goodTarget);
  assert.equal(realTeamOf(state.players[goodTwin!]), "good", "the partner is good");

  state.phase = "day";
  state.day = {
    number: 3,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(state, goodTwin!).ok, true);
  assert.equal(state.winner && state.winner.team, "evil");
  assert.equal(state.winner && state.winner.reason, "evil-twin");
});

test("a madness execution can happen during the night", () => {
  const state = make({ 1: "clockmaker", 2: "mutant", 6: "witch", 7: "fanggu" }, { count: 8 });
  startNight(state);
  state.phase = "night";
  state.night.number = 2;
  const result = applyCommand(state, {
    id: "madness-night-execution",
    type: "madnessPenalty",
    payload: {
      playerId: "2",
      penalty: "execute",
      reason: "The Mutant broke madness during the night.",
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].alive, false, "the Storyteller may execute at night");
});

test("a night madness execution of the good twin wins for evil (SNV-EVILTWIN-01)", () => {
  const state = make({ 1: "mutant", 2: "eviltwin", 7: "fanggu" }, { count: 8 });
  assert.equal(state.setup.evilTwinGoodPlayerId, "1");
  assert.equal(startNight(state).ok, true);
  const result = applyCommand(state, {
    id: "night-madness-good-twin",
    type: "madnessPenalty",
    payload: {
      playerId: "1",
      penalty: "execute",
      reason: "The Mutant broke madness during the night.",
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["1"].alive, false);
  assert.equal(state.winner?.team, "evil");
  assert.equal(state.winner?.reason, "evil-twin");
});

test("each Juggler holder keeps a separate guess ledger (SNV-JUGGLER-01)", () => {
  const state = make(
    { 1: "philosopher", 2: "juggler", 3: "dreamer", 4: "artist", 8: "fanggu" },
    { count: 8 },
  );
  startNight(state);
  assert.equal(
    completeStep(state, stepFor(state, "philosopher").key, { roleId: "juggler" }).ok,
    true,
  );
  finishNight(state);
  assert.equal(endNight(state).ok, true);
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

  const first = reportJugglerGuesses(
    state,
    [{ playerId: "3", roleId: "dreamer" }],
    systemPorts,
    "2",
  );
  assert.equal(first.ok, true, JSON.stringify(first));
  const second = reportJugglerGuesses(
    state,
    [{ playerId: "4", roleId: "artist" }],
    systemPorts,
    "1",
  );
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(state.jugglers?.["2"]?.correct, 1, "the real Juggler counts only their guess");
  assert.equal(state.jugglers?.["1"]?.correct, 1, "the borrowed Juggler counts only their guess");
  assert.equal(state.jugglers?.["2"]?.guesses.length, 1);
  assert.equal(state.jugglers?.["1"]?.guesses.length, 1);
});

test("the living new Fang Gu wakes even when the dead old Demon holds a lower seat", () => {
  const state = make(
    { 1: "fanggu", 2: "klutz", 3: "clockmaker", 4: "dreamer", 5: "artist", 6: "cerenovus" },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "fanggu")!;
  assert.equal(step.actorId, "1", "the original Fang Gu wakes first");
  completeStep(state, step.key, { targetIds: ["2"] });
  recordSvOutcome(state, step.key, { deathIds: ["2"] });
  assert.equal(state.players["2"].roleId, "fanggu", "the Outsider becomes the Fang Gu");
  assert.equal(state.players["1"].alive, false, "the old Demon dies");
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const next = state.night.queue.find((candidate) => candidate.roleId === "fanggu");
  assert.ok(next, "the Demon still wakes");
  assert.equal(next!.actorId, "2", "the living new Fang Gu is the actor");
});

// The Artist and the Savant act during the day. These fixtures enter the day
// directly because the ability under test does not depend on the night queue.
function dayOne(state: GameState): void {
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
}

test("a Philosopher who borrowed the Juggler guesses on their first day with it (SNV-PHILOSOPHER-02)", () => {
  const state = make({ 1: "philosopher", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  state.players["1"].used.philosopherAbility = "juggler";
  const result = applyCommand(state, {
    id: "borrowed-juggler",
    type: "jugglerGuess",
    payload: { playerId: "2", roleId: "clockmaker" },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.deepEqual(state.juggler!.guesses, [{ playerId: "2", roleId: "clockmaker" }]);
});

test("a real Savant and a borrowed Savant each visit once a day (SNV-SAVANT-04)", () => {
  const state = make({ 1: "philosopher", 2: "savant", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  state.players["1"].used.philosopherAbility = "savant";
  const real = applyCommand(state, {
    id: "savant-real",
    type: "savantVisit",
    payload: { playerId: "2", statements: ["A", "B"], truth: "first" },
  });
  assert.equal(real.status, "allowed", JSON.stringify(real));
  const borrowed = applyCommand(state, {
    id: "savant-borrowed",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["C", "D"], truth: "second" },
  });
  assert.equal(borrowed.status, "allowed", JSON.stringify(borrowed));
  assert.equal(state.savantVisits!.length, 2);
});

test("a Philosopher who borrowed the Klutz records the public choice (SNV-PHILOSOPHER-02)", () => {
  const state = make({ 1: "philosopher", 2: "clockmaker", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  state.players["1"].used.philosopherAbility = "klutz";
  kill(state, "1", "ability", { phase: "night", number: 1 }, { demon: true, ability: "fanggu" });
  const result = recordKlutzChoice(state, "7");
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("the abnormal command refuses the Mathematician's own ability (SNV-MATHEMATICIAN-04)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const result = applyCommand(state, {
    id: "abnormal-self",
    type: "recordAbnormal",
    payload: { playerId: "1", reason: "own ability" },
  });
  assert.equal(result.status, "rejected");
  assert.deepEqual(state.abnormal, []);
});

test("a poisoned Mathematician still counts zero when its only mark is its own (SNV-MATHEMATICIAN-04)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const self = applyCommand(state, {
    id: "abnormal-self-poisoned",
    type: "recordAbnormal",
    payload: { playerId: "1", reason: "The Mathematician's own ability failed." },
  });
  assert.equal(self.status, "rejected", "the Mathematician cannot mark itself");
  state.effects.push({
    id: "mathematician-poison",
    kind: "poison",
    sourceId: "7",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  const info = infoForStep(state, stepFor(state, "mathematician"));
  assert.equal(info.value, 0, "the refused self mark leaves the count at zero");
  assert.equal(info.needsChoice, true, "a poisoned Mathematician needs a host number");
  assert.ok(info.options!.includes(0), "the true zero stays a legal answer");
});

test("the Artist records one private yes/no question and spends the ability (SNV-ARTIST-01)", () => {
  const state = make({ 1: "artist", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  const first = applyCommand(state, {
    id: "artist-1",
    type: "artistQuestion",
    payload: {
      playerId: "1",
      question: "  Is the Demon in a brown chair?  ",
      answer: "no",
    },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.artist!.question, "Is the Demon in a brown chair?");
  assert.equal(state.artist!.answer, "no");
  assert.equal(state.players["1"].used.artist, true, "the ability is spent");

  const again = applyCommand(state, {
    id: "artist-2",
    type: "artistQuestion",
    payload: { playerId: "1", question: "Another?", answer: "yes" },
  });
  assert.equal(again.status, "rejected", "the Artist asks only once per game");
  assert.equal(state.artist!.question, "Is the Demon in a brown chair?");

  assert.equal(
    JSON.stringify(publicGameView(state)).includes("brown chair"),
    false,
    "the private question stays out of public data",
  );

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.state.artist!.answer, "no", "replay keeps the private answer");
});

test("the Artist command rejects an empty question, an invalid answer and a player without the character (SNV-ARTIST-01)", () => {
  const state = make({ 1: "artist", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  const empty = applyCommand(state, {
    id: "artist-empty",
    type: "artistQuestion",
    payload: { playerId: "1", question: "   ", answer: "yes" },
  });
  assert.equal(empty.status, "rejected");
  const invalid = applyCommand(state, {
    id: "artist-invalid",
    type: "artistQuestion",
    payload: { playerId: "1", question: "Is the Demon here?", answer: "banish" },
  });
  assert.equal(invalid.status, "rejected", "only yes, no or unknown is a legal answer");
  const wrong = applyCommand(state, {
    id: "artist-wrong",
    type: "artistQuestion",
    payload: { playerId: "6", question: "Is the Demon here?", answer: "yes" },
  });
  assert.equal(wrong.status, "rejected");
  assert.equal(state.players["1"].used.artist, undefined, "no rejected attempt spends the ability");
});

test("the Savant records two statements and one true statement, once per day (SNV-SAVANT-01)", () => {
  const state = make({ 1: "savant", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  const first = applyCommand(state, {
    id: "savant-1",
    type: "savantVisit",
    payload: {
      playerId: "1",
      statements: [" There is one Outsider in play. ", "The Demon is a woman."],
      truth: "first",
    },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.deepEqual(state.savant!.statements, [
    "There is one Outsider in play.",
    "The Demon is a woman.",
  ]);
  assert.equal(state.savant!.truth, "first");

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.state.savant!.truth, "first");

  const again = applyCommand(state, {
    id: "savant-2",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A", "B"], truth: "second" },
  });
  assert.equal(again.status, "rejected", "the Savant visits once per day");

  state.day = { ...state.day, number: 2 };
  const tomorrow = applyCommand(state, {
    id: "savant-3",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["C", "D"], truth: "second" },
  });
  assert.equal(tomorrow.status, "allowed", JSON.stringify(tomorrow));
  assert.equal(state.savant!.day, 2);

  assert.equal(
    JSON.stringify(publicGameView(state)).includes("Outsider in play"),
    false,
    "private statements stay out of public data",
  );
});

test("the Savant information stays one true and one false unless impaired (SNV-SAVANT-02)", () => {
  const state = make({ 1: "savant", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  const both = applyCommand(state, {
    id: "savant-both",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A", "B"], truth: "both" },
  });
  assert.equal(both.status, "rejected", "a healthy Savant gets one true and one false");
  const neither = applyCommand(state, {
    id: "savant-neither",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A", "B"], truth: "neither" },
  });
  assert.equal(neither.status, "rejected", "a healthy Savant cannot get two false statements");

  state.effects.push({
    id: "test-savant-poison",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "day", number: 1 },
    expires: null,
    active: true,
  });
  const impaired = applyCommand(state, {
    id: "savant-impaired",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A", "B"], truth: "both" },
  });
  assert.equal(impaired.status, "allowed", "an impaired Savant may get two true statements");
  const impairedNeither = make({ 1: "savant", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(impairedNeither);
  impairedNeither.effects.push({
    id: "test-savant-poison-neither",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "day", number: 1 },
    expires: null,
    active: true,
  });
  const twoFalse = applyCommand(impairedNeither, {
    id: "savant-impaired-neither",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["C", "D"], truth: "neither" },
  });
  assert.equal(twoFalse.status, "allowed", "an impaired Savant may get two false statements");
});

test("a living Vortox makes both Savant statements false (SNV-SAVANT-03)", () => {
  const state = make({ 1: "savant", 6: "pithag", 7: "vortox" }, { count: 7 });
  dayOne(state);
  const truth = applyCommand(state, {
    id: "savant-vortox-true",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A", "B"], truth: "first" },
  });
  assert.equal(truth.status, "rejected", "the Vortox forbids a true statement");

  const bothFalse = applyCommand(state, {
    id: "savant-vortox-false",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A", "B"], truth: "neither" },
  });
  assert.equal(bothFalse.status, "allowed", JSON.stringify(bothFalse));
});

test("a Philosopher who borrowed the Artist can ask the private question (SNV-ARTIST-01)", () => {
  const state = make({ 1: "philosopher", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  state.players["1"].used.philosopherAbility = "artist";
  const first = applyCommand(state, {
    id: "borrowed-artist",
    type: "artistQuestion",
    payload: { playerId: "1", question: "Is the Demon in a brown chair?", answer: "no" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.artist!.playerId, "1");
  assert.equal(state.players["1"].used.artist, true);
  const again = applyCommand(state, {
    id: "borrowed-artist-2",
    type: "artistQuestion",
    payload: { playerId: "1", question: "Another?", answer: "yes" },
  });
  assert.equal(again.status, "rejected", "the borrowed Artist is still once per game");
});

test("a Philosopher who borrowed the Savant can visit once that day (SNV-SAVANT-01)", () => {
  const state = make({ 1: "philosopher", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  state.players["1"].used.philosopherAbility = "savant";
  const first = applyCommand(state, {
    id: "borrowed-savant",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["A true fact.", "A false fact."], truth: "first" },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.savant!.playerId, "1");
  const again = applyCommand(state, {
    id: "borrowed-savant-2",
    type: "savantVisit",
    payload: { playerId: "1", statements: ["C", "D"], truth: "second" },
  });
  assert.equal(again.status, "rejected", "the borrowed Savant is still once per day");
});

test("the Philosopher without the borrowed character cannot use the day ability (SNV-ARTIST-01)", () => {
  const state = make({ 1: "philosopher", 6: "pithag", 7: "fanggu" }, { count: 7 });
  dayOne(state);
  const rejected = applyCommand(state, {
    id: "not-borrowed",
    type: "artistQuestion",
    payload: { playerId: "1", question: "Can I ask?", answer: "yes" },
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(state.artist, null);
});

test("the Storyteller marks abnormal abilities and the Mathematician counts them (SNV-MATHEMATICIAN-01, SNV-MATHEMATICIAN-03)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "mathematician")!;
  const first = applyCommand(state, {
    id: "abnormal-1",
    type: "recordAbnormal",
    payload: { playerId: "2", reason: "The Recluse registered as evil to the Chef." },
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  const second = applyCommand(state, {
    id: "abnormal-2",
    type: "recordAbnormal",
    payload: { playerId: "3", reason: "The poisoned Soldier died from the Imp's attack." },
  });
  assert.equal(second.status, "allowed", JSON.stringify(second));
  assert.equal(state.abnormal.length, 2);

  assert.equal(infoForStep(state, step, {}).value, 2, "two characters carry an ABNORMAL reminder");
  assert.equal(infoForStep(state, step, {}).needsChoice, false, "the count is computable");

  const duplicate = applyCommand(state, {
    id: "abnormal-3",
    type: "recordAbnormal",
    payload: { playerId: "2", reason: "A second event for the same character." },
  });
  assert.equal(duplicate.status, "rejected", "one reminder per character in the window");

  assert.equal(completeStep(state, step.key, {}).ok, true);
  assert.deepEqual(state.abnormal, [], "the reminders are removed after the Mathematician wakes");
  assert.equal(
    JSON.stringify(publicGameView(state)).includes("Recluse registered"),
    false,
    "the private marking reason stays out of public data",
  );
});

test("the Mathematician counts an abnormal working from the preceding day (SNV-MATHEMATICIAN-01)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  for (let guard = 0; guard < 40; guard += 1) {
    const step = currentStep(state);
    if (!step) break;
    svSkipFixtureStep(state, step);
  }
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  const marked = applyCommand(state, {
    id: "day-abnormal",
    type: "recordAbnormal",
    payload: { playerId: "2", reason: "A day ability worked abnormally." },
  });
  assert.equal(marked.status, "allowed", JSON.stringify(marked));

  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "mathematician")!;
  assert.equal(infoForStep(state, step, {}).value, 1, "the day mark is counted at night 2");
  assert.equal(completeStep(state, step.key, {}).ok, true);
  assert.deepEqual(state.abnormal, [], "the window closes after the step");
});

test("the Mathematician requires a host number when impaired or under a Vortox (SNV-MATHEMATICIAN-02)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "vortox" }, { count: 7 });
  startNight(state);
  applyCommand(state, {
    id: "abnormal-vortox",
    type: "recordAbnormal",
    payload: { playerId: "2", reason: "False information from the Vortox." },
  });
  const step = state.night.queue.find((candidate) => candidate.roleId === "mathematician")!;
  const info = infoForStep(state, step, {});
  assert.equal(info.value, 1, "the engine still computes the true count");
  assert.equal(info.needsChoice, true, "the Vortox makes the shown number false");
  assert.equal(info.options!.includes(1), false, "the Vortox cannot show the true number");
  assert.ok(info.options!.includes(0) && info.options!.includes(7));

  const missing = completeStep(state, step.key, {});
  assert.equal(missing.ok, false, "the host must choose a number");
  assert.equal("needsChoice" in missing && missing.needsChoice, true);
  const trueNumber = completeStep(state, step.key, { given: { kind: "number", value: 1 } });
  assert.equal(trueNumber.ok, false, "the Vortox cannot give the true number");
  const given = completeStep(state, step.key, { given: { kind: "number", value: 4 } });
  assert.equal(given.ok, true, JSON.stringify(given));
  assert.equal(step.given!.value, 4, "the false number is stored");
});

test("the Mathematician answer survives preview, apply, replay, undo and export (SNV-MATHEMATICIAN-01)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  assert.equal(
    applyCommand(state, {
      id: "mathematician-answer-mark",
      type: "recordAbnormal",
      payload: { playerId: "2", reason: "The Chef woke twice." },
    }).status,
    "allowed",
  );
  const step = stepFor(state, "mathematician");
  const command: Command = {
    id: "mathematician-answer-replay",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: [] },
    at: "2030-01-01T00:00:00.000Z",
  };
  const before = clone(state);
  const snapshot = clone(before);
  const base = clone(before);
  delete (base as Partial<GameState>).journal;
  state.journal = { base, entries: [] };
  state.applied = {};

  const preview = previewCommand(before, command) as { status: string };
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(
    canonicalState(before),
    canonicalState(snapshot),
    "preview leaves the canonical state unchanged",
  );

  const applied = applyCommand(state, command) as { status: string };
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.deepEqual(state.night.queue.find((candidate) => candidate.key === step.key)!.given, {
    kind: "number",
    value: 1,
    impaired: false,
    needsChoice: false,
    options: [],
    textKey: "note.sv.mathematician",
    falsifiedSuffix: false,
    mayBeFalseSuffix: false,
    text: "Способности сработали некорректно: 1.",
  });
  assert.equal(
    state.night.queue.find((candidate) => candidate.key === step.key)!.completedAt,
    command.at,
    "the step is stamped with the command time",
  );
  assert.deepEqual(state.abnormal, [], "the step clears the abnormal ledger");
  const publicView = JSON.stringify(publicGameView(state));
  assert.equal(
    publicView.includes("Способности сработали"),
    false,
    "the answer stays out of the public view",
  );
  assert.equal(publicView.includes("The Chef woke twice."), false, "the mark reason stays out too");

  const replayed = replay({ base: clone(before), entries: state.journal.entries });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));

  const undone = replay({ base: clone(before), entries: state.journal.entries.slice(0, -1) });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), canonicalState(before));

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, JSON.stringify(restored));
  if (!restored.ok) return;
  assert.deepEqual(
    restored.state.night.queue.find((candidate) => candidate.roleId === "mathematician")!.given,
    state.night.queue.find((candidate) => candidate.roleId === "mathematician")!.given,
  );
});

test("an impaired Mathematician beside a living Vortox keeps the Vortox options and flags (SNV-MATHEMATICIAN-02)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "vortox" }, { count: 7 });
  startNight(state);
  state.effects.push({
    id: "mathematician-both-at-once",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  assert.equal(
    applyCommand(state, {
      id: "mathematician-both-mark",
      type: "recordAbnormal",
      payload: { playerId: "2", reason: "A poison from the No Dashii." },
    }).status,
    "allowed",
  );
  const info = infoForStep(state, stepFor(state, "mathematician"), {});
  assert.equal(info.value, 1, "the engine still computes the true count");
  assert.equal(info.needsChoice, true);
  assert.equal(info.falsifiedSuffix, true, "the Vortox suffix survives impairment");
  assert.equal(info.mayBeFalseSuffix, false, "the Vortox flag is not overwritten");
  assert.equal(info.options!.includes(1), false, "the Vortox cannot show the true number");
  assert.ok(info.options!.includes(0) && info.options!.includes(7));
});

test("an impaired Mathematician's answer is journaled as false information (SNV-MATHEMATICIAN-02)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  startNight(state);
  state.effects.push({
    id: "mathematician-poison-journal",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  const step = stepFor(state, "mathematician");
  const info = infoForStep(state, step, {});
  assert.equal(info.needsChoice, true);
  const applied = applyCommand(state, {
    id: "mathematician-impaired-answer",
    type: "completeNightStep",
    payload: {
      key: step.key,
      targetIds: [],
      given: { kind: "number", value: info.value, needsChoice: false },
    },
  });
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.equal(
    state.log.some((line) => line.case === "false-information" && line.secret === true),
    true,
    "the host's answer is journaled as false information in secret",
  );
});

test("the abnormal command rejects a blank reason, an unknown player and a wrong phase (SNV-MATHEMATICIAN-01)", () => {
  const state = make({ 1: "mathematician", 6: "pithag", 7: "fanggu" }, { count: 7 });
  state.phase = "seat";
  const wrongPhase = applyCommand(state, {
    id: "abnormal-phase",
    type: "recordAbnormal",
    payload: { playerId: "1", reason: "Not started." },
  });
  assert.equal(wrongPhase.status, "rejected");

  startNight(state);
  const blank = applyCommand(state, {
    id: "abnormal-blank",
    type: "recordAbnormal",
    payload: { playerId: "1", reason: "   " },
  });
  assert.equal(blank.status, "rejected");
  const unknown = applyCommand(state, {
    id: "abnormal-unknown",
    type: "recordAbnormal",
    payload: { playerId: "99", reason: "No such seat." },
  });
  assert.equal(unknown.status, "rejected");
  assert.deepEqual(state.abnormal, []);
});

// The steps of the four Sects & Violets Demons as the night queue builds them
// and as their completion leaves them: the step record, the effects, the log
// lines, each draw from the command ports and the seat's record. The host
// marks the death on the outcome of the step, which is pinned as well.

const SV_DEMONS = ["fanggu", "nodashii", "vigormortis", "vortox"] as const;

/** Eight seats where only the Cerenovus and the information roles wake beside the Demon. */
function svDemonGame(demon: (typeof SV_DEMONS)[number]): GameState {
  return make({
    1: "clockmaker",
    2: "oracle",
    3: "towncrier",
    // The Fang Gu adds an Outsider and the Vigormortis removes one.
    4: demon === "vigormortis" ? "mathematician" : "klutz",
    5: demon === "fanggu" ? "sweetheart" : "flowergirl",
    6: "savant",
    7: "cerenovus",
    8: demon,
  });
}

function svRecordingPorts(): { ports: CommandExecutionContext; draws: string[] } {
  const draws: string[] = [];
  let ids = 0;
  let ticks = 0;
  return {
    draws,
    ports: {
      clock: {
        now: () => {
          draws.push("clock");
          ticks += 1;
          return "2030-01-01T00:00:0" + ticks + ".000Z";
        },
      },
      rng: {
        next: () => {
          draws.push("rng");
          return 0.5;
        },
      },
      idFactory: {
        suffix: (length) => {
          draws.push("id:" + length);
          ids += 1;
          return ("k" + ids).padEnd(length, "0");
        },
      },
    },
  };
}

function svQueueRoles(state: GameState): string[] {
  return state.night.queue.map((step) => String(step.roleId || step.system));
}

function svStepOf(state: GameState, roleId: RoleId): NightStep {
  const step = state.night.queue.find((candidate) => candidate.roleId === roleId);
  assert.ok(step, roleId + " has no step in " + JSON.stringify(svQueueRoles(state)));
  return step;
}

/** A step without the field a completion stamps from the clock. */
function svRecordOf(step: NightStep): Record<string, unknown> {
  const record: Record<string, unknown> = JSON.parse(JSON.stringify(step));
  delete record.completedAt;
  return record;
}

function svSkipFixtureStep(state: GameState, step: NightStep): void {
  // Fixtures advance the night without playing an ability. A permitted skip is
  // the engine's; a mandatory living step is skipped as the recorded ruleset
  // did, since the host rule is not what these tests exercise.
  if (skipStep(state, step.key, "fixture").ok) return;
  const result = skipStep(state, step.key, "fixture", FIXTURE_PORTS);
  assert.equal(result.ok, true, JSON.stringify(result));
}

function svSkipRemaining(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step) return;
    svSkipFixtureStep(state, step);
  }
  throw new Error("night did not finish");
}

/** Skips every open step before the role's own. */
function svSkipTo(state: GameState, roleId: RoleId): NightStep {
  const target = svStepOf(state, roleId);
  for (const step of state.night.queue) {
    if (step === target) break;
    if (!step.done && !step.skipped) svSkipFixtureStep(state, step);
  }
  return target;
}

/** Ends the night and the day. A Vortox game executes the Savant first, or evil wins at dusk. */
function svToNextNight(state: GameState): void {
  assert.equal(endNight(state).ok, true);
  if (Object.values(state.players).some((player) => player.roleId === "vortox")) {
    assert.equal(executeByDecision(state, "6").ok, true);
  }
  assert.equal(endDay(state).ok, true);
  assert.equal(state.winner, null);
}

const SV_DEMON_OPEN_STEP = {
  kind: "role",
  sv: true,
  actorAlive: true,
  targetMode: "one-any",
  minTargets: 1,
  maxTargets: 1,
  infoKind: "none",
  optional: false,
  canKill: true,
  targetIds: [],
  given: null,
  result: null,
  note: null,
  pending: null,
  done: false,
  skipped: false,
};

const SV_DEMON_ORDER = { fanggu: 5, nodashii: 6, vortox: 7, vigormortis: 8 } as const;

test("the four Sects & Violets Demons have a step from the second night, choosing one player (SNV-FANGGU-01, SNV-NODASHII-01, SNV-VIGORMORTIS-01, SNV-VORTOX-01)", () => {
  for (const demon of SV_DEMONS) {
    const state = svDemonGame(demon);
    startNight(state);
    assert.deepEqual(
      svQueueRoles(state),
      demon === "vigormortis"
        ? ["minioninfo", "demoninfo", "cerenovus", "clockmaker", "mathematician"]
        : ["minioninfo", "demoninfo", "cerenovus", "clockmaker"],
      demon,
    );
    svSkipRemaining(state);
    svToNextNight(state);
    assert.deepEqual(
      svQueueRoles(state),
      demon === "fanggu"
        ? ["cerenovus", "fanggu", "towncrier", "oracle"]
        : demon === "vigormortis"
          ? ["cerenovus", "vigormortis", "flowergirl", "towncrier", "oracle", "mathematician"]
          : ["cerenovus", demon, "flowergirl", "towncrier", "oracle"],
      demon,
    );
    const order = SV_DEMON_ORDER[demon];
    assert.deepEqual(svRecordOf(svStepOf(state, demon)), {
      ...SV_DEMON_OPEN_STEP,
      key: "n2-" + order + "-" + demon + "-8",
      roleId: demon,
      actorId: "8",
      actorName: "P8",
      order,
    });
  }
});

test("a Sects & Violets Demon's step changes nothing but the step, and the host's death on its outcome is a Demon death (SNV-FANGGU-01, SNV-NODASHII-01, SNV-VIGORMORTIS-01, SNV-VORTOX-01)", () => {
  for (const demon of SV_DEMONS) {
    const state = svDemonGame(demon);
    startNight(state);
    svSkipRemaining(state);
    svToNextNight(state);
    const step = svSkipTo(state, demon);
    const order = SV_DEMON_ORDER[demon];
    const effects = JSON.parse(JSON.stringify(state.effects));
    const usedBefore = JSON.parse(JSON.stringify(state.players["8"].used ?? null));
    const logged = state.log.length;
    const { ports, draws } = svRecordingPorts();
    const result = completeStep(state, step.key, { targetIds: ["2"] }, ports);
    assert.equal(result.ok, true, demon);
    assert.deepEqual(
      svRecordOf(step),
      {
        ...SV_DEMON_OPEN_STEP,
        key: "n2-" + order + "-" + demon + "-8",
        roleId: demon,
        actorId: "8",
        actorName: "P8",
        order,
        targetIds: ["2"],
        registrations: {},
        impaired: false,
        note: "Шаг выполнен.",
        noteKey: "note.finished",
        noteVars: null,
        done: true,
      },
      demon,
    );
    assert.equal(step.completedAt, "2030-01-01T00:00:01.000Z");
    assert.deepEqual(state.effects, effects, demon + " leaves the effects as they were");
    assert.deepEqual(usedBefore, {}, demon);
    assert.deepEqual(state.players["8"].used, {}, demon + " records nothing on the seat");
    assert.equal(state.players["2"].alive, true, demon + " kills nobody at completion");
    assert.deepEqual(draws, ["clock", "id:5", "clock"], demon);
    assert.deepEqual(
      JSON.parse(JSON.stringify(state.log.slice(logged))),
      [
        {
          id: "log-" + (logged + 1) + "-k1000",
          at: "2030-01-01T00:00:02.000Z",
          phase: "Ночь 2",
          kind: "night",
          title: state.log.at(-1)!.title,
          detail: "Шаг выполнен.",
          playerId: null,
          secret: true,
          roleId: demon,
          phaseCode: "night",
          phaseNumber: 2,
          noteKey: "note.finished",
          noteVars: null,
        },
      ],
      demon,
    );
    const outcome = svRecordingPorts();
    assert.deepEqual(
      recordSvOutcome(state, step.key, { deathIds: ["2"] }, outcome.ports),
      {
        ok: true,
        deaths: [
          {
            // The Vortox game executed the Savant on the first day.
            id: demon === "vortox" ? "death-2-k100" : "death-1-k100",
            playerId: "2",
            roleId: "oracle",
            cause: "ability",
            phase: "night",
            number: 2,
            at: "2030-01-01T00:00:01.000Z",
            impaired: false,
            livingBefore: demon === "vortox" ? 7 : 8,
            demon: true,
            ability: demon,
            attackerId: "8",
          },
        ],
      },
      demon,
    );
    assert.deepEqual(outcome.draws, ["id:4", "clock", "id:5", "clock"], demon);
    assert.equal(state.players["2"].alive, false, demon);
  }
});

test("a poisoned Sects & Violets Demon's step completes without a failure note, and its outcome refuses the death (SNV-FANGGU-04)", () => {
  for (const demon of SV_DEMONS) {
    const state = svDemonGame(demon);
    startNight(state);
    svSkipRemaining(state);
    svToNextNight(state);
    const step = svSkipTo(state, demon);
    state.effects.push({
      id: "fixture-poison-8",
      kind: "poison",
      sourceId: "7",
      targetId: "8",
      start: { phase: "night", number: 2 },
      expires: { phase: "night", number: 3 },
      active: true,
    });
    const effects = JSON.parse(JSON.stringify(state.effects));
    const { ports, draws } = svRecordingPorts();
    assert.equal(completeStep(state, step.key, { targetIds: ["2"] }, ports).ok, true, demon);
    assert.equal(step.impaired, true, demon);
    assert.equal(step.note, "Шаг выполнен.", demon);
    assert.equal(step.noteKey, "note.finished", demon);
    assert.deepEqual(state.effects, effects, demon);
    assert.deepEqual(state.players["8"].used, {}, demon);
    assert.deepEqual(draws, ["clock", "id:5", "clock"], demon);
    const before = canonicalState(state);
    assert.deepEqual(recordSvOutcome(state, step.key, { deathIds: ["2"] }), {
      ok: false,
      errorCode: "error.52",
      error: "Способность не сработала: игрок отравлен или пьян.",
    });
    assert.deepEqual(canonicalState(state), before, demon + " leaves the state unchanged");
  }
});

test("the Outsider the Fang Gu jumps into wakes as the Fang Gu from the next night (SNV-FANGGU-01)", () => {
  const state = svDemonGame("fanggu");
  startNight(state);
  svSkipRemaining(state);
  svToNextNight(state);
  const step = svSkipTo(state, "fanggu");
  assert.equal(completeStep(state, step.key, { targetIds: ["4"] }).ok, true);
  assert.equal(recordSvOutcome(state, step.key, { deathIds: ["4"] }).ok, true);
  assert.equal(state.players["4"].roleId, "fanggu");
  assert.equal(state.players["8"].alive, false);
  assert.equal(
    state.night.queue.filter((candidate) => candidate.roleId === "fanggu").length,
    1,
    "the new Fang Gu does not wake again tonight",
  );
  svSkipRemaining(state);
  svToNextNight(state);
  assert.deepEqual(svRecordOf(svStepOf(state, "fanggu")), {
    ...SV_DEMON_OPEN_STEP,
    key: "n3-5-fanggu-4",
    roleId: "fanggu",
    actorId: "4",
    actorName: "P4",
    order: 5,
  });
});

test("a Snake Charmer who becomes the Demon on the first night does not wake as it until the second (SNV-SNAKECHARMER-01)", () => {
  // The No Dashii poisons the Townsfolk on seats 1 and 5; the Snake Charmer on
  // seat 3 is healthy.
  const state = make({
    1: "clockmaker",
    2: "oracle",
    3: "snakecharmer",
    4: "towncrier",
    5: "flowergirl",
    6: "klutz",
    7: "cerenovus",
    8: "nodashii",
  });
  startNight(state);
  const step = svSkipTo(state, "snakecharmer");
  assert.equal(completeStep(state, step.key, { targetIds: ["8"] }).ok, true);
  assert.equal(state.players["3"].roleId, "nodashii");
  assert.deepEqual(svQueueRoles(state), [
    "minioninfo",
    "demoninfo",
    "snakecharmer",
    "cerenovus",
    "clockmaker",
  ]);
  svSkipRemaining(state);
  svToNextNight(state);
  assert.deepEqual(svRecordOf(svStepOf(state, "nodashii")), {
    ...SV_DEMON_OPEN_STEP,
    key: "n2-6-nodashii-3",
    roleId: "nodashii",
    actorId: "3",
    actorName: "P3",
    order: 6,
  });
});

// The Cerenovus's step as the queue builds it and as its completion leaves
// it: the madness token with its id, the note, the log line, each draw from
// the command ports and the seat's record.

const SV_GOOD_ROLES = [
  "artist",
  "clockmaker",
  "dreamer",
  "flowergirl",
  "juggler",
  "mathematician",
  "oracle",
  "philosopher",
  "sage",
  "savant",
  "seamstress",
  "snakecharmer",
  "towncrier",
  "barber",
  "klutz",
  "mutant",
  "sweetheart",
];

const SV_CERENOVUS_OPEN_STEP = {
  ...SV_DEMON_OPEN_STEP,
  roleId: "cerenovus",
  actorId: "7",
  actorName: "P7",
  infoKind: "note",
  canKill: false,
  roleChoices: SV_GOOD_ROLES,
};

const SV_CERENOVUS_GIVEN = {
  kind: "note",
  text: "Выберите игрока и добрую роль: завтра он должен быть «помешан» на этой роли.",
  textKey: "note.sv.cerenovus",
};

/** Completes the Cerenovus's step with recording ports and returns what it left. */
function runCerenovus(state: GameState, options: { targetIds: string[]; roleId?: string }) {
  const step = svSkipTo(state, "cerenovus");
  const logged = state.log.length;
  const { ports, draws } = svRecordingPorts();
  const result = completeStep(state, step.key, options, ports);
  return {
    result,
    step: svRecordOf(step),
    madness: JSON.parse(
      JSON.stringify(state.effects.filter((effect) => effect.kind === "madness")),
    ),
    log: JSON.parse(JSON.stringify(state.log.slice(logged))),
    draws,
    used: JSON.parse(JSON.stringify(state.players["7"].used ?? null)),
  };
}

test("the Cerenovus has a step on every night, choosing one player and a good character (SNV-CERENOVUS-01)", () => {
  const state = svDemonGame("nodashii");
  startNight(state);
  assert.deepEqual(svRecordOf(svStepOf(state, "cerenovus")), {
    ...SV_CERENOVUS_OPEN_STEP,
    key: "n1-5-cerenovus-7",
    order: 5,
  });
  svSkipRemaining(state);
  svToNextNight(state);
  assert.deepEqual(svRecordOf(svStepOf(state, "cerenovus")), {
    ...SV_CERENOVUS_OPEN_STEP,
    key: "n2-3-cerenovus-7",
    order: 3,
  });
});

test("the Cerenovus makes the chosen player mad about a good character until the next dawn, each night anew (SNV-CERENOVUS-01)", () => {
  const state = svDemonGame("nodashii");
  startNight(state);
  const first = runCerenovus(state, { targetIds: ["2"], roleId: "artist" });
  assert.equal(first.result.ok, true);
  assert.deepEqual(first.step, {
    ...SV_CERENOVUS_OPEN_STEP,
    key: "n1-5-cerenovus-7",
    order: 5,
    given: SV_CERENOVUS_GIVEN,
    targetIds: ["2"],
    registrations: {},
    impaired: false,
    note: "P2 должен быть «помешан» на роли Художник до следующего рассвета.",
    noteKey: "note.madness",
    noteVars: { name: "P2", role: "artist" },
    done: true,
  });
  const firstToken = {
    id: "eff-madness-cerenovus-7-2-1",
    kind: "madness",
    madness: "cerenovus",
    roleId: "artist",
    sourceId: "7",
    targetId: "2",
    start: { phase: "night", number: 1 },
    expires: { phase: "day", number: 2 },
    active: true,
  };
  assert.deepEqual(first.madness, [firstToken]);
  assert.deepEqual(first.draws, ["clock", "id:5", "clock"]);
  assert.deepEqual(first.used, {});
  assert.deepEqual(first.log, [
    {
      id: "log-" + state.log.length + "-k1000",
      at: "2030-01-01T00:00:02.000Z",
      phase: "Ночь 1",
      kind: "night",
      title: "Цереновус",
      detail: "P2 должен быть «помешан» на роли Художник до следующего рассвета.",
      playerId: null,
      secret: true,
      roleId: "cerenovus",
      phaseCode: "night",
      phaseNumber: 1,
      noteKey: "note.madness",
      noteVars: { name: "P2", role: "artist" },
    },
  ]);
  svSkipRemaining(state);
  assert.equal(endNight(state).ok, true);
  // The day's review of the first token is the Storyteller's, not the step's.
  reviewMadness(state);
  assert.equal(endDay(state).ok, true);
  const second = runCerenovus(state, { targetIds: ["3"], roleId: "sage" });
  assert.equal(second.result.ok, true);
  assert.equal(second.step.note, "P3 должен быть «помешан» на роли Мудрец до следующего рассвета.");
  assert.deepEqual(second.step.noteVars, { name: "P3", role: "sage" });
  assert.deepEqual(
    second.madness.map((effect: { id: string; active: boolean; expires: unknown }) => [
      effect.id,
      effect.active,
      effect.expires,
    ]),
    [
      ["eff-madness-cerenovus-7-2-1", true, { phase: "day", number: 2 }],
      ["eff-madness-cerenovus-7-3-2", true, { phase: "day", number: 3 }],
    ],
    "tonight's token does not end last night's, which has expired at dawn",
  );
});

test("a Cerenovus who names no character makes nobody mad, and one who names an evil character is refused (SNV-CERENOVUS-01)", () => {
  const state = svDemonGame("nodashii");
  startNight(state);
  const step = svSkipTo(state, "cerenovus");
  const before = canonicalState(state);
  const refused = applyCommand(state, {
    id: "cerenovus-evil",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"], roleId: "nodashii" } },
  });
  assert.equal(refused.status, "rejected");
  assert.equal(refused.errorCode, "error.2");
  assert.deepEqual(canonicalState(state), before, "the refused command changes nothing");
  const none = runCerenovus(state, { targetIds: ["2"] });
  assert.equal(none.result.ok, true);
  assert.equal(none.step.note, "Шаг выполнен.");
  assert.equal(none.step.noteKey, "note.finished");
  assert.deepEqual(none.madness, []);
  assert.deepEqual(none.draws, ["clock", "id:5", "clock"]);
});

test("a poisoned Cerenovus makes nobody mad and gets the shared note, not a failure note (SNV-CERENOVUS-01)", () => {
  const state = svDemonGame("nodashii");
  startNight(state);
  state.effects.push({
    id: "fixture-poison-7",
    kind: "poison",
    sourceId: "8",
    targetId: "7",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  const run = runCerenovus(state, { targetIds: ["2"], roleId: "artist" });
  assert.equal(run.result.ok, true);
  assert.equal(run.step.impaired, true);
  assert.equal(run.step.note, "Шаг выполнен.");
  assert.equal(run.step.noteKey, "note.finished");
  assert.deepEqual(run.madness, []);
  assert.deepEqual(run.used, {});
  assert.deepEqual(run.draws, ["clock", "id:5", "clock"]);
});

test("a Cerenovus the Vigormortis killed keeps waking and makes a player mad (SNV-CERENOVUS-01, SNV-VIGORMORTIS-01)", () => {
  const state = svDemonGame("vigormortis");
  startNight(state);
  svSkipRemaining(state);
  svToNextNight(state);
  const vigormortis = svSkipTo(state, "vigormortis");
  assert.equal(completeStep(state, vigormortis.key, { targetIds: ["7"] }).ok, true);
  assert.equal(recordSvOutcome(state, vigormortis.key, { deathIds: ["7"] }).ok, true);
  assert.equal(state.players["7"].alive, false);
  svSkipRemaining(state);
  svToNextNight(state);
  assert.deepEqual(svRecordOf(svStepOf(state, "cerenovus")), {
    ...SV_CERENOVUS_OPEN_STEP,
    key: "n3-3-cerenovus-7",
    order: 3,
    actorAlive: false,
  });
  const run = runCerenovus(state, { targetIds: ["3"], roleId: "artist" });
  assert.equal(run.result.ok, true);
  assert.equal(run.step.noteKey, "note.madness");
  assert.deepEqual(
    run.madness.map((effect: { id: string }) => effect.id),
    ["eff-madness-cerenovus-7-3-3"],
  );
});

// The steps of the Sects & Violets information roles whose wake reads no
// game state, as the queue builder, a Philosopher and a Pit-Hag build them,
// and what their completion leaves: the stored answer, the shared note and,
// for the Mathematician, the cleared ledger.

/** Ten seats with the seven information roles, a Philosopher and the Pit-Hag. */
function svInformationGame(): GameState {
  return make({
    1: "clockmaker",
    2: "dreamer",
    3: "flowergirl",
    4: "mathematician",
    5: "oracle",
    6: "towncrier",
    7: "philosopher",
    8: "eviltwin",
    9: "pithag",
    10: "vigormortis",
  });
}

const SV_INFO_OPEN_STEP = {
  kind: "role",
  sv: true,
  actorAlive: true,
  targetMode: "none",
  minTargets: 0,
  maxTargets: 0,
  optional: false,
  canKill: false,
  targetIds: [],
  given: null,
  result: null,
  note: null,
  pending: null,
  done: false,
  skipped: false,
};

const SV_FINISHED = {
  registrations: {},
  impaired: false,
  note: "Шаг выполнен.",
  noteKey: "note.finished",
  noteVars: null,
  done: true,
};

/** The Evil Twin introduction record: the Evil Twin first, the Good Twin second. */
const SV_EVIL_TWIN_GIVEN = {
  kind: "note",
  textKey: "note.sv.evilTwin",
  textVars: { actor: "P8", twin: "P1", twinRole: "clockmaker" },
  text: "Покажите Близнецам друг друга: P8 и P1 (Часовщик).",
  shown: [
    { playerId: "8", roleId: "eviltwin" },
    { playerId: "1", roleId: "clockmaker" },
  ],
};

function svInfoStep(
  key: string,
  roleId: RoleId,
  actorId: string,
  order: number,
  infoKind: string,
  target = false,
) {
  return {
    ...SV_INFO_OPEN_STEP,
    key,
    roleId,
    actorId,
    actorName: "P" + actorId,
    order,
    infoKind,
    ...(target ? { targetMode: "one-any", minTargets: 1, maxTargets: 1 } : {}),
  };
}

test("the Clockmaker and the Evil Twin wake on the first night only, the Dreamer and the Mathematician every night, and the Flowergirl, the Town Crier and the Oracle from the second (SNV-CLOCKMAKER-01, SNV-EVILTWIN-01, SNV-DREAMER-01, SNV-MATHEMATICIAN-01, SNV-FLOWERGIRL-01, SNV-TOWNCRIER-01, SNV-ORACLE-01)", () => {
  const state = svInformationGame();
  startNight(state);
  assert.deepEqual(svQueueRoles(state), [
    "philosopher",
    "minioninfo",
    "demoninfo",
    "eviltwin",
    "clockmaker",
    "dreamer",
    "mathematician",
  ]);
  assert.deepEqual(
    svRecordOf(svStepOf(state, "eviltwin")),
    svInfoStep("n1-3-eviltwin-8", "eviltwin", "8", 3, "note"),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "clockmaker")),
    svInfoStep("n1-6-clockmaker-1", "clockmaker", "1", 6, "number"),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "dreamer")),
    svInfoStep("n1-7-dreamer-2", "dreamer", "2", 7, "note", true),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "mathematician")),
    svInfoStep("n1-9-mathematician-4", "mathematician", "4", 9, "number"),
  );
  svSkipRemaining(state);
  svToNextNight(state);
  assert.deepEqual(svQueueRoles(state), [
    "philosopher",
    "pithag",
    "vigormortis",
    "dreamer",
    "flowergirl",
    "towncrier",
    "oracle",
    "mathematician",
  ]);
  assert.deepEqual(
    svRecordOf(svStepOf(state, "dreamer")),
    svInfoStep("n2-12-dreamer-2", "dreamer", "2", 12, "note", true),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "flowergirl")),
    svInfoStep("n2-13-flowergirl-3", "flowergirl", "3", 13, "yes-no"),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "towncrier")),
    svInfoStep("n2-14-towncrier-6", "towncrier", "6", 14, "yes-no"),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "oracle")),
    svInfoStep("n2-15-oracle-5", "oracle", "5", 15, "number"),
  );
  assert.deepEqual(
    svRecordOf(svStepOf(state, "mathematician")),
    svInfoStep("n2-18-mathematician-4", "mathematician", "4", 18, "number"),
  );
});

test("an information step stores its answer and the shared note, and the Mathematician's step clears the abnormal ledger (SNV-CLOCKMAKER-01, SNV-EVILTWIN-01, SNV-DREAMER-01, SNV-MATHEMATICIAN-01, SNV-FLOWERGIRL-01, SNV-TOWNCRIER-01, SNV-ORACLE-01)", () => {
  const state = svInformationGame();
  startNight(state);
  const run = (
    roleId: RoleId,
    targetIds: string[] = [],
    given?: Record<string, unknown>,
    lines = 1,
  ) => {
    const step = svSkipTo(state, roleId);
    const effects = JSON.stringify(state.effects);
    const logged = state.log.length;
    const { ports, draws } = svRecordingPorts();
    assert.equal(
      completeStep(state, step.key, { targetIds, ...(given ? { given } : {}) }, ports).ok,
      true,
      roleId,
    );
    assert.equal(JSON.stringify(state.effects), effects, roleId + " writes no effect");
    assert.equal(draws[0], "clock", roleId + " uses the command clock");
    assert.equal(draws.length, 1 + lines * 2, roleId + " draws from the command ports only");
    assert.equal(state.log.length, logged + lines, roleId + " writes its log lines");
    return svRecordOf(step);
  };
  assert.deepEqual(run("eviltwin"), {
    ...svInfoStep("n1-3-eviltwin-8", "eviltwin", "8", 3, "note"),
    ...SV_FINISHED,
    given: SV_EVIL_TWIN_GIVEN,
  });
  assert.deepEqual(run("clockmaker"), {
    ...svInfoStep("n1-6-clockmaker-1", "clockmaker", "1", 6, "number"),
    ...SV_FINISHED,
    given: {
      kind: "number",
      value: 1,
      impaired: false,
      needsChoice: false,
      options: [],
      textKey: "note.sv.clockmaker",
      textVars: { value: 1 },
      falsifiedSuffix: false,
      mayBeFalseSuffix: false,
      text: "Расстояние от Демона до ближайшего Приспешника: 1.",
    },
  });
  const dreamerStep = svSkipTo(state, "dreamer");
  const dreamerInfo = infoForStep(state, dreamerStep, { targetIds: ["5"] });
  assert.equal(dreamerInfo.kind, "role-pair");
  const dreamerPair = String((dreamerInfo.options as string[])[0]).split("|");
  const dreamerGiven = { ...dreamerInfo, pair: dreamerPair, needsChoice: false };
  assert.deepEqual(run("dreamer", ["5"], dreamerGiven, 2), {
    ...svInfoStep("n1-7-dreamer-2", "dreamer", "2", 7, "note", true),
    ...SV_FINISHED,
    targetIds: ["5"],
    given: dreamerGiven,
  });
  const mark = applyCommand(state, {
    id: "info-abnormal",
    type: "recordAbnormal",
    payload: { playerId: "2", reason: "The test Storyteller's mark." },
  });
  assert.equal(mark.status, "allowed");
  assert.equal(state.abnormal!.length, 1);
  assert.deepEqual(run("mathematician"), {
    ...svInfoStep("n1-9-mathematician-4", "mathematician", "4", 9, "number"),
    ...SV_FINISHED,
    given: {
      kind: "number",
      value: 1,
      impaired: false,
      needsChoice: false,
      options: [],
      textKey: "note.sv.mathematician",
      falsifiedSuffix: false,
      mayBeFalseSuffix: false,
      text: "Способности сработали некорректно: 1.",
    },
  });
  assert.deepEqual(state.abnormal, [], "the Mathematician's step clears the ledger");
  svSkipRemaining(state);
  svToNextNight(state);
  const yesNo = (
    roleId: RoleId,
    key: string,
    actorId: string,
    order: number,
    textKey: string,
    text: string,
  ) => {
    assert.deepEqual(run(roleId), {
      ...svInfoStep(key, roleId, actorId, order, "yes-no"),
      ...SV_FINISHED,
      given: {
        kind: "yes-no",
        value: false,
        impaired: false,
        needsChoice: false,
        options: [],
        textKey,
        falsifiedSuffix: false,
        mayBeFalseSuffix: false,
        text,
      },
    });
  };
  yesNo(
    "flowergirl",
    "n2-13-flowergirl-3",
    "3",
    13,
    "note.sv.flowergirlNo",
    "Демон голосовал сегодня: нет.",
  );
  yesNo(
    "towncrier",
    "n2-14-towncrier-6",
    "6",
    14,
    "note.sv.towncrierNo",
    "Приспешник выдвигал сегодня: нет.",
  );
  assert.deepEqual(run("oracle"), {
    ...svInfoStep("n2-15-oracle-5", "oracle", "5", 15, "number"),
    ...SV_FINISHED,
    given: {
      kind: "number",
      value: 0,
      impaired: false,
      needsChoice: false,
      options: [],
      textKey: "note.sv.oracle",
      textVars: { value: 0 },
      falsifiedSuffix: false,
      mayBeFalseSuffix: false,
      text: "Мёртвых злых игроков: 0.",
    },
  });
});

test("the Evil Twin introduction survives preview, apply, replay, undo and export (SNV-EVILTWIN-01)", () => {
  const state = svInformationGame();
  startNight(state);
  const step = svSkipTo(state, "eviltwin");
  const command: Command = {
    id: "eviltwin-shown-replay",
    type: "completeNightStep",
    payload: { key: step.key },
    at: "2030-01-01T00:00:00.000Z",
  };
  const before = clone(state);
  const base = clone(before);
  delete (base as Partial<GameState>).journal;
  state.journal = { base, entries: [] };
  state.applied = {};

  const preview = previewCommand(before, command) as { status: string };
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(canonicalState(before), canonicalState(state), "preview changes nothing");
  const applied = applyCommand(state, command) as { status: string };
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  const given = state.night.queue.find((candidate) => candidate.roleId === "eviltwin")!.given;
  assert.deepEqual(given, SV_EVIL_TWIN_GIVEN);

  const publicView = JSON.stringify(publicGameView(state));
  for (const secret of ['"shown"', "eviltwin", "clockmaker"]) {
    assert.equal(publicView.includes(secret), false, secret + " stays out of the public view");
  }

  const replayed = replay({ base: clone(before), entries: state.journal.entries });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));

  const undone = replay({ base: clone(before), entries: state.journal.entries.slice(0, -1) });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), canonicalState(before));

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, JSON.stringify(restored));
  if (!restored.ok) return;
  assert.deepEqual(
    restored.state.night.queue.find((candidate) => candidate.roleId === "eviltwin")!.given,
    SV_EVIL_TWIN_GIVEN,
  );
});

test("an Evil Twin note recorded before the typed introduction keeps its text (SNV-EVILTWIN-01)", () => {
  const state = svInformationGame();
  startNight(state);
  const step = svSkipTo(state, "eviltwin");
  const before = clone(state);
  const command: Command = {
    id: "eviltwin-shown-legacy",
    type: "completeNightStep",
    payload: { key: step.key },
    at: "2030-01-01T00:00:00.000Z",
    rulesetVersion: FIRST_NIGHT_TINKER_RULESET_VERSION,
  };
  const applied = applyCommand(state, command) as { status: string };
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  const given = state.night.queue.find((candidate) => candidate.roleId === "eviltwin")!.given;
  assert.deepEqual(given, {
    kind: "note",
    textKey: "note.sv.evilTwin",
    textVars: { actor: "P8", twin: "P1", twinRole: "clockmaker" },
    text: "Покажите Близнецам друг друга: P8 и P1 (Часовщик).",
  });
  assert.equal("shown" in given!, false, "an older journal writes no typed record");

  const replayed = replay({ base: clone(before), entries: state.journal.entries });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));
});

test("a Philosopher who gains an information ability wakes for it in its slot, at once for a first-night ability on a later night, and from the next night when gained on the first (SNV-PHILOSOPHER-01)", () => {
  const borrow = (roleId: RoleId, night: number) => {
    const state = svInformationGame();
    startNight(state);
    if (night === 2) {
      svSkipRemaining(state);
      svToNextNight(state);
    }
    const step = svStepOf(state, "philosopher");
    assert.equal(completeStep(state, step.key, { targetIds: [], roleId }).ok, true, roleId);
    return state;
  };
  const oracle = borrow("oracle", 2);
  assert.deepEqual(
    svRecordOf(
      oracle.night.queue.find((step) => step.roleId === "oracle" && step.actorId === "7")!,
    ),
    svInfoStep("n2-15-oracle-7", "oracle", "7", 15, "number"),
  );
  const clockmaker = borrow("clockmaker", 2);
  assert.deepEqual(
    svRecordOf(clockmaker.night.queue.find((step) => step.roleId === "clockmaker")!),
    svInfoStep("n2-0.1-clockmaker-7", "clockmaker", "7", 0.1, "number"),
  );
  const early = borrow("flowergirl", 1);
  assert.equal(
    early.night.queue.some((step) => step.actorId === "7" && step.roleId === "flowergirl"),
    false,
    "an ability of the later nights does not wake on the first",
  );
  svSkipRemaining(early);
  svToNextNight(early);
  assert.deepEqual(
    svRecordOf(
      early.night.queue.find((step) => step.roleId === "flowergirl" && step.actorId === "7")!,
    ),
    svInfoStep("n2-13-flowergirl-7", "flowergirl", "7", 13, "yes-no"),
  );
});

test("a player the Pit-Hag makes the Town Crier wakes in its slot and one made the Clockmaker wakes at once (INFO-006, SNV-PITHAG-01)", () => {
  const change = (roleId: RoleId) => {
    const state = make({
      1: "savant",
      2: "artist",
      3: "sage",
      4: "juggler",
      5: "seamstress",
      6: "philosopher",
      7: "pithag",
      8: "vigormortis",
    });
    startNight(state);
    svSkipRemaining(state);
    svToNextNight(state);
    const step = svSkipTo(state, "pithag");
    assert.equal(completeStep(state, step.key, { targetIds: ["2"], roleId }).ok, true, roleId);
    assert.equal(state.players["2"].roleId, roleId);
    return state;
  };
  const crier = change("towncrier");
  assert.deepEqual(
    svRecordOf(svStepOf(crier, "towncrier")),
    svInfoStep("n2-14-towncrier-2", "towncrier", "2", 14, "yes-no"),
  );
  const clockmaker = change("clockmaker");
  const created = clockmaker.night.queue.find(
    (step) => step.roleId === "clockmaker" && step.actorId === "2",
  );
  assert.ok(created, "a first-night ability wakes at the point of creation (INFO-006)");
  assert.equal(created.done, false);
  assert.ok(
    (created.order ?? 0) >
      (clockmaker.night.queue.find((step) => step.roleId === "pithag")!.order ?? 0),
    "the created step follows the Pit-Hag step",
  );
});

// The Snake Charmer's and the Pit-Hag's steps, and the character changes
// their completion writes through the shared swap and replacement.

function svCharmerGame(second: RoleId = "oracle"): GameState {
  // The No Dashii poisons the Townsfolk on seats 1 and 5; the Snake Charmer
  // on seat 3 and the player on seat 2 are healthy.
  return make({
    1: "clockmaker",
    2: second,
    3: "snakecharmer",
    4: "towncrier",
    5: "flowergirl",
    6: "klutz",
    7: "pithag",
    8: "nodashii",
  });
}

function svSeat(state: GameState, id: string) {
  const player = state.players[id];
  return JSON.parse(
    JSON.stringify({
      roleId: player.roleId,
      shownRoleId: player.shownRoleId,
      team: player.team,
      changedFrom: player.changedFrom ?? null,
      used: player.used ?? null,
    }),
  );
}

const SV_CHARMER_GIVEN = {
  kind: "note",
  textKey: "note.sv.snakecharmer",
  text: "Если выбрали Демона, поменяйте роли и стороны; Демон становится отравлен.",
};

test("the Snake Charmer has a step on every night choosing one player, and the Pit-Hag from the second night with every character (SNV-SNAKECHARMER-01, SNV-PITHAG-01)", () => {
  const state = svCharmerGame();
  startNight(state);
  assert.deepEqual(svQueueRoles(state), ["minioninfo", "demoninfo", "snakecharmer", "clockmaker"]);
  const open = {
    ...SV_INFO_OPEN_STEP,
    targetMode: "one-any",
    minTargets: 1,
    maxTargets: 1,
    infoKind: "note",
  };
  assert.deepEqual(svRecordOf(svStepOf(state, "snakecharmer")), {
    ...open,
    key: "n1-2-snakecharmer-3",
    roleId: "snakecharmer",
    actorId: "3",
    actorName: "P3",
    order: 2,
  });
  svSkipRemaining(state);
  svToNextNight(state);
  assert.deepEqual(svQueueRoles(state), [
    "snakecharmer",
    "pithag",
    "nodashii",
    "flowergirl",
    "towncrier",
    "oracle",
  ]);
  assert.deepEqual(svRecordOf(svStepOf(state, "snakecharmer")), {
    ...open,
    key: "n2-1-snakecharmer-3",
    roleId: "snakecharmer",
    actorId: "3",
    actorName: "P3",
    order: 1,
  });
  assert.deepEqual(svRecordOf(svStepOf(state, "pithag")), {
    ...open,
    key: "n2-4-pithag-7",
    roleId: "pithag",
    actorId: "7",
    actorName: "P7",
    order: 4,
    canKill: false,
    roleChoices: [
      ...SV_GOOD_ROLES,
      "cerenovus",
      "eviltwin",
      "pithag",
      "witch",
      "fanggu",
      "nodashii",
      "vigormortis",
      "vortox",
    ],
  });
});

test("a Snake Charmer who chooses the Demon swaps characters and alignments with it and poisons it for good, and the new Demon wakes tonight (SNV-SNAKECHARMER-01)", () => {
  const state = svCharmerGame();
  startNight(state);
  svSkipRemaining(state);
  svToNextNight(state);
  const step = svSkipTo(state, "snakecharmer");
  const logged = state.log.length;
  const { ports, draws } = svRecordingPorts();
  assert.equal(completeStep(state, step.key, { targetIds: ["8"] }, ports).ok, true);
  assert.deepEqual(svRecordOf(step), {
    ...SV_INFO_OPEN_STEP,
    ...SV_FINISHED,
    key: "n2-1-snakecharmer-3",
    roleId: "snakecharmer",
    actorId: "3",
    actorName: "P3",
    order: 1,
    targetMode: "one-any",
    minTargets: 1,
    maxTargets: 1,
    infoKind: "note",
    targetIds: ["8"],
    given: SV_CHARMER_GIVEN,
    note: "P3 и P8 меняются персонажами; P8 отравлен.",
    noteKey: "note.characterSwapPoisoned",
    noteVars: { actor: "P3", target: "P8" },
  });
  assert.deepEqual(svSeat(state, "3"), {
    roleId: "nodashii",
    shownRoleId: "nodashii",
    team: "evil",
    changedFrom: "snakecharmer",
    used: {},
  });
  assert.deepEqual(svSeat(state, "8"), {
    roleId: "snakecharmer",
    shownRoleId: "snakecharmer",
    team: "good",
    changedFrom: "nodashii",
    used: {},
  });
  assert.equal(
    JSON.stringify(state.effects),
    JSON.stringify([
      {
        id: "eff-nodashii-8-5",
        kind: "poison",
        nodashii: true,
        sourceId: "8",
        targetId: "5",
        start: { phase: "night", number: 1 },
        expires: null,
        active: false,
      },
      {
        id: "eff-nodashii-8-1",
        kind: "poison",
        nodashii: true,
        sourceId: "8",
        targetId: "1",
        start: { phase: "night", number: 1 },
        expires: null,
        active: false,
      },
      {
        id: "eff-nodashii-3-2",
        kind: "poison",
        nodashii: true,
        sourceId: "3",
        targetId: "2",
        start: { phase: "night", number: 2 },
        expires: null,
        active: true,
      },
      {
        id: "eff-nodashii-3-4",
        kind: "poison",
        nodashii: true,
        sourceId: "3",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: null,
        active: true,
      },
      {
        id: "eff-snakecharmer-3-8",
        kind: "poison",
        permanent: true,
        sourceId: "3",
        targetId: "8",
        start: { phase: "night", number: 2 },
        expires: null,
        active: true,
      },
    ]),
    "the No Dashii's poison follows the new holder before the Snake Charmer's poison is written",
  );
  assert.deepEqual(draws, ["clock", "id:5", "clock"]);
  assert.equal(state.log.length, logged + 1);
  assert.equal(state.log.at(-1)!.noteKey, "note.characterSwapPoisoned");
  assert.deepEqual(
    state.night.queue.map((candidate) => [
      candidate.key,
      candidate.done,
      candidate.skipped,
      candidate.noteKey ?? null,
    ]),
    [
      ["n2-1-snakecharmer-3", true, false, "note.characterSwapPoisoned"],
      ["n2-4-pithag-7", false, false, null],
      ["n2-6-nodashii-8", true, true, "note.characterChanged"],
      ["n2-6-nodashii-3", false, false, null],
      ["n2-13-flowergirl-5", false, false, null],
      ["n2-14-towncrier-4", false, false, null],
      ["n2-15-oracle-2", false, false, null],
    ],
  );
});

test("a Snake Charmer who chooses a player who is not the Demon, or who is poisoned, changes nothing, and a dead player is refused (SNV-SNAKECHARMER-01)", () => {
  const unchanged = (state: GameState, targetIds: string[]) => {
    const step = svSkipTo(state, "snakecharmer");
    const seats = JSON.stringify(state.order.map((id) => svSeat(state, id)));
    const effects = JSON.stringify(state.effects);
    const { ports, draws } = svRecordingPorts();
    assert.equal(completeStep(state, step.key, { targetIds }, ports).ok, true);
    assert.equal(step.note, "Шаг выполнен.");
    assert.equal(step.noteKey, "note.finished");
    assert.equal(JSON.stringify(state.order.map((id) => svSeat(state, id))), seats);
    assert.equal(JSON.stringify(state.effects), effects);
    assert.deepEqual(draws, ["clock", "id:5", "clock"]);
  };
  const minion = svCharmerGame();
  startNight(minion);
  unchanged(minion, ["7"]);
  const poisoned = svCharmerGame();
  startNight(poisoned);
  poisoned.effects.push({
    id: "fixture-poison-3",
    kind: "poison",
    sourceId: "7",
    targetId: "3",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  unchanged(poisoned, ["8"]);
  const dead = svCharmerGame();
  startNight(dead);
  svSkipRemaining(dead);
  svToNextNight(dead);
  dead.players["2"].alive = false;
  const step = svSkipTo(dead, "snakecharmer");
  const before = canonicalState(dead);
  const refused = applyCommand(dead, {
    id: "charmer-dead",
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
  });
  assert.equal(refused.status, "rejected");
  assert.equal(refused.errorCode, "error.55");
  assert.deepEqual(canonicalState(dead), before);
});

test("a Snake Charmer who swaps with a good Demon leaves both good (SNV-SNAKECHARMER-01)", () => {
  const state = svCharmerGame();
  startNight(state);
  svSkipRemaining(state);
  svToNextNight(state);
  const charmer = svSkipTo(state, "snakecharmer");
  assert.equal(completeStep(state, charmer.key, { targetIds: ["2"] }).ok, true);
  const pithag = svSkipTo(state, "pithag");
  assert.equal(
    completeStep(state, pithag.key, { targetIds: ["2"], roleId: "vigormortis" }).ok,
    true,
    "the Pit-Hag creates a good Demon",
  );
  assert.equal(state.players["2"].roleId, "vigormortis");
  assert.equal(state.players["2"].team, "good");

  svSkipRemaining(state);
  svToNextNight(state);
  const swap = svSkipTo(state, "snakecharmer");
  assert.equal(completeStep(state, swap.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["3"].roleId, "vigormortis", "the Snake Charmer becomes the Demon");
  assert.equal(state.players["3"].team, "good", "the good Demon's alignment passes over");
  assert.equal(state.players["2"].roleId, "snakecharmer");
  assert.equal(state.players["2"].team, "good", "the Snake Charmer's alignment passes over");
});

test("a Philosopher with the Snake Charmer's ability who chooses the Demon becomes the Demon, and the Demon becomes a poisoned Philosopher (SNV-SNAKECHARMER-01, SNV-PHILOSOPHER-01)", () => {
  const state = svCharmerGame("philosopher");
  startNight(state);
  svSkipRemaining(state);
  svToNextNight(state);
  const philosopher = svStepOf(state, "philosopher");
  assert.equal(
    completeStep(state, philosopher.key, { targetIds: [], roleId: "snakecharmer" }).ok,
    true,
  );
  const borrowed = state.night.queue.find(
    (candidate) => candidate.roleId === "snakecharmer" && candidate.actorId === "2",
  )!;
  assert.equal(borrowed.key, "n2-1-snakecharmer-2");
  assert.equal(completeStep(state, borrowed.key, { targetIds: ["8"] }).ok, true);
  assert.equal(borrowed.noteKey, "note.characterSwapPoisoned");
  assert.deepEqual(svSeat(state, "2"), {
    roleId: "nodashii",
    shownRoleId: "nodashii",
    team: "evil",
    changedFrom: "philosopher",
    used: { philosopher: true },
  });
  assert.deepEqual(svSeat(state, "8"), {
    roleId: "philosopher",
    shownRoleId: "philosopher",
    team: "good",
    changedFrom: "nodashii",
    used: {},
  });
  assert.deepEqual(
    state.effects
      .filter((effect) => effect.permanent === true)
      .map((effect) => [effect.id, effect.targetId, effect.active]),
    [["eff-snakecharmer-2-8", "8", true]],
  );
  assert.equal(isImpaired(state, "8", { phase: "night", number: 2 }), true);
});

test("the Pit-Hag turns a player into a character not in play, does nothing for one in play, and fails while poisoned (SNV-PITHAG-01)", () => {
  const run = (roleId: RoleId, poisoned = false) => {
    const state = svCharmerGame();
    startNight(state);
    svSkipRemaining(state);
    svToNextNight(state);
    const step = svSkipTo(state, "pithag");
    if (poisoned) {
      state.effects.push({
        id: "fixture-poison-7",
        kind: "poison",
        sourceId: "3",
        targetId: "7",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      });
    }
    const { ports, draws } = svRecordingPorts();
    assert.equal(completeStep(state, step.key, { targetIds: ["6"], roleId }, ports).ok, true);
    assert.deepEqual(draws, ["clock", "id:5", "clock"]);
    return { state, step };
  };
  const changed = run("sage");
  assert.equal(changed.step.note, "P6 становится: Мудрец.");
  assert.equal(changed.step.noteKey, "note.characterBecame");
  assert.deepEqual(changed.step.noteVars, { name: "P6", role: "sage" });
  assert.deepEqual(svSeat(changed.state, "6"), {
    roleId: "sage",
    shownRoleId: "sage",
    team: "good",
    changedFrom: "klutz",
    used: {},
  });
  const inPlay = run("oracle");
  assert.equal(inPlay.step.noteKey, "note.pithagInPlay");
  assert.equal(inPlay.step.note, "Оракул уже в игре: ничего не происходит.");
  assert.equal(inPlay.state.players["6"].roleId, "klutz");
  const failed = run("sage", true);
  assert.equal(failed.step.noteKey, "note.abilityFailed");
  assert.equal(failed.state.players["6"].roleId, "klutz");
});

test("a Demon the Pit-Hag makes does not wake tonight, and the host marks the night's deaths on the Pit-Hag's step (SNV-PITHAG-01)", () => {
  const state = svCharmerGame();
  startNight(state);
  svSkipRemaining(state);
  svToNextNight(state);
  const step = svSkipTo(state, "pithag");
  assert.equal(completeStep(state, step.key, { targetIds: ["6"], roleId: "vortox" }).ok, true);
  assert.equal(step.canKill, true);
  assert.equal(step.note, "P6 становится: Вортокс. Смерти этой ночью выбирает ведущий.");
  assert.equal(state.players["6"].roleId, "vortox");
  assert.equal(state.players["6"].team, "good", "the alignment does not change");
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "vortox"),
    false,
    "the new Demon does not take the Demon's turn tonight",
  );
  const outcome = recordSvOutcome(state, step.key, { deathIds: ["2"] });
  assert.equal(outcome.ok, true);
  assert.deepEqual(
    state.deaths.map((death) => [death.playerId, death.cause, death.demon, death.ability]),
    [["2", "ability", false, "pithag"]],
  );
});
