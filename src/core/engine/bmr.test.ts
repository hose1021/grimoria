import test from "node:test";
import assert from "node:assert/strict";
import {
  BMR,
  BMR_ALL,
  BMR_NIGHT_FIRST,
  BMR_NIGHT_OTHER,
  COMPOSITION,
  bagErrors,
  compositionFor,
  isBmrRole,
  isSupportedRole,
  randomBag,
  roleLabel,
  roleTeam,
} from "../model/rules.ts";
import { bmrTargetError } from "./bmr.ts";
import { applyRoleAbility } from "./ability.ts";
import type { RoleModule } from "../roles/types.ts";
import { roleSupportEntries } from "../model/support.ts";
import { createGame, exportGame, importGame, validateState } from "../model/state.ts";
import {
  checkWin,
  completeStep,
  dealGame,
  effectActive,
  endDay,
  endNight,
  bmrInfoForStep,
  executeByDecision,
  gossipStatement,
  infoForStep,
  isImpaired,
  kill,
  moonchildChoice,
  nominate,
  recordVotes,
  recordBmrOutcome,
  resetVotes,
  resurrectPlayer,
  setupErrors,
  skipStep,
  startNight,
} from "./index.ts";
import {
  applyCommand,
  canonicalState,
  createRuntime,
  previewCommand,
  replay,
  validateCommand,
} from "./index.ts";
import { badMoonRisingScript } from "../model/scripts.ts";
import { systemPorts } from "../model/ports.ts";
import { ANY_STEP_RESURRECTS_RULESET_VERSION } from "./command-versions.ts";
import type { AllowedResult, DomainEvent, GameState, NightStep, RoleId } from "../model/types.ts";
import type { CommandExecutionContext } from "../model/ports.ts";

// A fixture skips a step as the recorded ruleset did, so its journal, notes and
// log ids stay the ones the expectations name.
const FIXTURE_PORTS: CommandExecutionContext = {
  ...systemPorts,
  rulesetVersion: ANY_STEP_RESURRECTS_RULESET_VERSION,
};

type MakeOptions = { count?: number; lunaticShownId?: RoleId | null };

type FutureEffectView = {
  id: string;
  kind: string;
  targetId: string | null;
  expires: { number: number } | null;
  resolve: { number: number } | null;
  suspended: string | null;
  resumeOnHealthy: boolean;
};

type FutureView = {
  winner: { team: string; reason: string } | null;
  delayedEffects: FutureEffectView[];
};

type ChangesView = { deaths: string[] };

type CommandView = AllowedResult & {
  events: DomainEvent[];
  changes: ChangesView;
  future: FutureView;
};

// Builds a legal bag that contains every requested role and fills the rest
// from the same teams, then deals the requested roles to the named seats.
function make(assignment: Record<string, RoleId>, options: MakeOptions = {}): GameState {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  state.script = badMoonRisingScript();
  state.scriptId = "bmr";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)!] += 1;
  const target = compositionFor(count, required)!;
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"] as const) {
    const need = target[team] - counts[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = BMR[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles for fixture");
    roles.push(...pool.slice(0, need));
  }
  assert.equal(roles.length, count, "fixture bag size");
  state.setup.roles = roles;
  state.setup.bluffs = BMR_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  state.setup.lunaticShownId = roles.includes("lunatic")
    ? roles.find((id) => roleTeam(id) === "demon") || null
    : null;
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) {
    if (full[id]) continue;
    full[id] = spare.shift()!;
  }
  if (options.lunaticShownId) state.setup.lunaticShownId = options.lunaticShownId;
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

/** The typed rejection code of a completeStep result, for assertions on failures. */
function rejectionCode(value: unknown): string | undefined {
  return (value as { errorCode?: string }).errorCode;
}

function aliveExcept(
  state: GameState,
  excluded: ReadonlyArray<string | null | undefined> = [],
): string[] {
  return state.order.filter((id) => state.players[id].alive && !excluded.includes(id));
}

function finishNight(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step) return;
    if (step.roleId === "professor") {
      const dead = state.order.find((id) => !state.players[id].alive);
      const result = dead
        ? completeStep(state, step.key, { targetIds: [dead] })
        : skipStep(state, step.key, "fixture");
      assert.equal(result.ok, true, JSON.stringify(result));
      continue;
    }
    const pool = aliveExcept(state, [step.actorId, step.previousTarget]);
    const ids = pool.slice(0, step.minTargets || 0);
    const info = infoForStep(state, step, { targetIds: ids });
    // The engine accepts only an offered option, so the fixture picks one.
    const options = Array.isArray(info.options) ? info.options : [];
    let given: Record<string, unknown> = { kind: "note", text: "fixture" };
    if (options.length) {
      const option = options[0];
      if (info.kind === "number") given = { kind: "number", value: Number(option) };
      else if (info.kind === "yes-no") given = { kind: "yes-no", value: Boolean(option) };
      else if (info.kind === "role-pair")
        given = { kind: "role-pair", pair: String(option).split("|") };
      else if (info.kind === "character" || info.kind === "one-of-two")
        given = { kind: info.kind, roleId: String(option) };
    }
    const drunkId =
      (step.roleId === "sailor" || step.roleId === "innkeeper") && ids.length ? ids[0] : undefined;
    const result: Record<string, unknown> = completeStep(state, step.key, {
      targetIds: ids,
      given,
      ...(drunkId ? { drunkId } : {}),
    });
    if (!result.ok) {
      assert.equal(result.needsChoice, true, JSON.stringify(result));
      completeStep(state, step.key, { targetIds: ids, given });
    }
  }
  throw new Error("night did not finish");
}

function nextNight(state: GameState): void {
  if (state.phase !== "night") assert.equal(startNight(state).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

function skipFixtureStep(state: GameState, step: NightStep): void {
  // Fixtures advance the night without playing an ability. A permitted skip is
  // the engine's; a mandatory living step is skipped as the recorded ruleset
  // did, since the host rule is not what these tests exercise.
  if (skipStep(state, step.key, "fixture").ok) return;
  const result = skipStep(state, step.key, "fixture", FIXTURE_PORTS);
  assert.equal(result.ok, true, JSON.stringify(result));
}

function skipRemaining(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step) return;
    skipFixtureStep(state, step);
  }
  throw new Error("night did not finish");
}

function skipUntil(
  state: GameState,
  predicate: (step: NightStep) => boolean,
): NightStep | undefined {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step || predicate(step)) return step;
    skipFixtureStep(state, step);
  }
  throw new Error("step not found");
}

function nightTwo(state: GameState): void {
  startNight(state);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

function endNightToNext(state: GameState): void {
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

function pukkaStep(state: GameState): NightStep | undefined {
  return state.night.queue.find((step) => step.roleId === "pukka");
}

test("Bad Moon Rising rosters, composition and night order follow the official data (SYS-NIGHT-01)", () => {
  assert.equal(BMR_ALL.length, 25);
  assert.deepEqual(
    [BMR.townsfolk.length, BMR.outsider.length, BMR.minion.length, BMR.demon.length],
    [13, 4, 4, 4],
  );
  for (const id of BMR_ALL) assert.equal(isBmrRole(id), true);
  assert.equal(isSupportedRole("po"), true);
  assert.equal(isBmrRole("chef"), false);
  assert.deepEqual(compositionFor(8, ["godfather"]), {
    townsfolk: 4,
    outsider: 2,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(compositionFor(8, ["godfather"], -1), {
    townsfolk: 6,
    outsider: 0,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(compositionFor(7, ["baron"]), {
    townsfolk: 3,
    outsider: 2,
    minion: 1,
    demon: 1,
  });
  assert.deepEqual(BMR_NIGHT_FIRST, [
    "info",
    "lunatic",
    "sailor",
    "courtier",
    "godfather",
    "devilsadvocate",
    "pukka",
    "grandmother",
    "chambermaid",
  ]);
  assert.equal(BMR_NIGHT_OTHER.length, 19);
  assert.equal(BMR_NIGHT_OTHER[0], "sailor");
  assert.equal(BMR_NIGHT_OTHER.at(-1), "chambermaid");
});

test("random Bad Moon Rising bags are legal at every player count", () => {
  for (const count of Object.keys(COMPOSITION).map(Number)) {
    const bag = randomBag(count, Math.random, BMR_ALL);
    const errors = bagErrors({
      count,
      roles: bag.roles,
      bluffs: bag.bluffs,
      lunaticShownId: bag.lunaticShownId,
      pool: BMR_ALL,
    });
    assert.deepEqual(errors, [], count + ": " + JSON.stringify(errors));
    assert.equal(bag.bluffs.length, count >= 7 ? 3 : 0);
  }
});

test("the Godfather +/-1 Outsider setting is applied and impossible choices are reported (BMR-GODFATHER-03)", () => {
  const bag = randomBag(8, () => 0.9, BMR_ALL, { godfatherOutsider: -1 });
  assert.equal(
    bagErrors({
      count: 8,
      roles: bag.roles,
      bluffs: bag.bluffs,
      lunaticShownId: bag.lunaticShownId,
      pool: BMR_ALL,
      godfatherOutsider: -1,
    }).length,
    0,
  );
  const invalid = bagErrors({
    count: 7,
    roles: ["godfather", "chambermaid", "chef", "empath", "fortuneteller", "undertaker", "imp"],
    bluffs: ["soldier", "mayor", "virgin"],
    pool: BMR_ALL,
    godfatherOutsider: -1,
  });
  assert.ok(invalid.some((error) => error.code === "godfather-minus"));
});

test("a Bad Moon Rising game deals, validates and starts a night", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  assert.deepEqual(setupErrors(state), []);
  assert.deepEqual(validateState(state), []);
  const started = startNight(state);
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.ok(state.night.queue.some((step) => step.roleId === "chambermaid"));
  assert.ok(state.night.queue.some((step) => step.roleId === "sailor"));
  assert.equal(importGame(exportGame(state)).ok, true);
});

test("Bad Moon Rising night targets are validated against the step range", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const sailor = state.night.queue.find((step) => step.roleId === "sailor")!;
  assert.equal(completeStep(state, sailor.key, { targetIds: [] }).ok, false);
  assert.equal(completeStep(state, sailor.key, { targetIds: ["1", "2"] }).ok, false);
  assert.equal(completeStep(state, sailor.key, { targetIds: ["1"], drunkId: "1" }).ok, true);
  assert.equal(completeStep(state, sailor.key, { targetIds: ["1"] }).ok, false);
});

test("the current ruleset refuses the Exorcist and Pukka skips and allows the optional Professor and Assassin (BMR-EXORCIST-01, BMR-PUKKA-01, BMR-PROFESSOR-01, BMR-ASSASSIN-02)", () => {
  const state = make({ 1: "exorcist", 2: "professor", 3: "assassin", 4: "pukka" }, { count: 9 });
  nightTwo(state);
  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  const pukka = state.night.queue.find((step) => step.roleId === "pukka")!;
  const professor = state.night.queue.find((step) => step.roleId === "professor")!;
  const assassin = state.night.queue.find((step) => step.roleId === "assassin")!;
  assert.ok(exorcist && pukka && professor && assassin, "all four roles wake on night 2");

  for (const step of [exorcist, pukka]) {
    const before = canonicalState(state);
    const skipped = skipStep(state, step.key, "host pressed skip") as {
      ok: boolean;
      errorCode?: string;
    };
    assert.equal(skipped.ok, false, String(step.roleId));
    assert.equal(skipped.errorCode, "error.80");
    assert.equal(step.skipped, false, "the refused skip leaves the step open");
    assert.deepEqual(canonicalState(state), before, "the refused skip changes nothing");
  }
  for (const step of [professor, assassin]) {
    const skipped = skipStep(state, step.key, "declined");
    assert.equal(skipped.ok, true, String(step.roleId) + ": " + JSON.stringify(skipped));
    assert.equal(step.skipped, true, String(step.roleId) + " is optional");
  }
});

test("the Po's no-one is a recorded decision and a skip is refused (BMR-PO-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  assert.equal(startNight(state).ok, true);
  nextNight(state); // Po does not wake on night one.
  const first = state.night.queue.find((step) => step.roleId === "po");
  assert.ok(first);
  const before = canonicalState(state);

  const skipped = applyCommand(state, {
    id: "po-skip",
    type: "skipStep",
    payload: { key: first.key, reason: "no choice" },
  });
  assert.equal(skipped.status, "rejected", "the Po's step is mandatory");
  assert.equal(skipped.errorCode, "error.80");
  assert.deepEqual(canonicalState(state), before, "the refused skip changes nothing");
  assert.equal(state.players["6"].used.poNoOne, undefined);

  const confirmed = applyCommand(state, {
    id: "po-no-one",
    type: "completeNightStep",
    payload: { key: first.key, targetIds: [] },
  });
  assert.equal(confirmed.status, "allowed", JSON.stringify(confirmed));
  assert.equal(state.players["6"].used.poNoOne, true, "the no-one choice is recorded");

  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "po");
  assert.ok(second);
  assert.equal(second.minTargets, 3);
  assert.equal(second.maxTargets, 3);
  const oneTarget = applyCommand(state, {
    id: "po-one-target",
    type: "completeNightStep",
    payload: { key: second.key, targetIds: ["1"] },
  });
  assert.equal(oneTarget.status, "rejected", "the charged Po must choose three");
});

test("the Po may hit three players only after a night with no choice (BMR-PO-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  assert.equal(startNight(state).ok, true);
  nextNight(state); // Po does not wake on night one.
  const first = state.night.queue.find((step) => step.roleId === "po");
  assert.ok(first);
  assert.equal(first.minTargets, 0);
  assert.equal(first.maxTargets, 1);
  completeStep(state, first.key, { targetIds: [] });
  assert.equal(state.players["6"].used.poNoOne, true);
  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "po");
  assert.ok(second);
  assert.equal(second.minTargets, 3);
  assert.equal(second.maxTargets, 3);
});

test("the Pukka poisons immediately and kills the previous victim next night (BMR-PUKKA-01, BMR-PUKKA-04)", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  let step = pukkaStep(state)!;
  assert.ok(step, "Pukka wakes on night one");
  completeStep(state, step.key, { targetIds: ["2"] });
  assert.equal(isImpaired(state, "2"), true, "the target is poisoned immediately");
  assert.equal(state.players["2"].alive, true);
  assert.ok(
    state.effects.some(
      (effect) =>
        effect.kind === "poison" &&
        effect.pukka === true &&
        effect.targetId === "2" &&
        effect.active,
    ),
  );

  nextNight(state);
  step = pukkaStep(state)!;
  completeStep(state, step.key, { targetIds: ["3"] });
  assert.equal(state.players["2"].alive, false, "the previous victim dies");
  assert.equal(state.deaths.at(-1)!.impaired, true, "the victim is still poisoned when it dies");
  assert.equal(isImpaired(state, "2"), false, "the victim becomes healthy");
  assert.equal(isImpaired(state, "3"), true, "the new target is poisoned");
  assert.equal(state.deaths.at(-1)!.number, 2);

  nextNight(state);
  step = pukkaStep(state)!;
  completeStep(state, step.key, { targetIds: ["4"] });
  assert.equal(state.players["3"].alive, false, "the next victim dies");
  assert.equal(isImpaired(state, "3"), false);
  assert.equal(isImpaired(state, "4"), true);
});

test("an Exorcist skip resolves the Pukka's previous kill without a new poison (BMR-EXORCIST-01, BMR-PUKKA-03, BMR-PUKKA-06)", () => {
  const state = make(
    {
      1: "pukka",
      2: "exorcist",
      3: "chambermaid",
      4: "courtier",
      5: "sailor",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  nextNight(state);

  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  completeStep(state, exorcist.key, { targetIds: ["1"] });
  assert.equal(state.players["3"].alive, false, "the previous victim still dies");
  assert.equal(isImpaired(state, "3"), false);
  const skipped = pukkaStep(state)!;
  assert.equal(skipped.done, true);
  assert.equal(skipped.skipped, true);
  assert.equal(isImpaired(state, "4"), false, "the Pukka did not wake, so no new poison");

  nextNight(state);
  const nextExorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  completeStep(state, nextExorcist.key, { targetIds: ["2"] });
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["4"] });
  assert.equal(isImpaired(state, "4"), true, "the Pukka poisons again on a later night");
});

test("an Innkeeper prevents the Pukka's delayed death and clears the poison (BMR-INNKEEPER-01)", () => {
  const state = make(
    {
      1: "pukka",
      2: "innkeeper",
      3: "chambermaid",
      4: "courtier",
      5: "sailor",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  nextNight(state);

  const innkeeper = state.night.queue.find((step) => step.roleId === "innkeeper")!;
  completeStep(state, innkeeper.key, { targetIds: ["3", "4"], drunkId: "4" });
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["5"] });

  assert.equal(state.players["3"].alive, true, "the protected victim survives");
  assert.equal(isImpaired(state, "3"), false, "the surviving victim is no longer poisoned");
  assert.equal(isImpaired(state, "5"), true, "the new target is poisoned");
});

test("the Pukka poisons the new target before the previous victim dies (BMR-PUKKA-02, BMR-PUKKA-05, BMR-PUKKA-07)", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "tealady",
      4: "courtier",
      5: "gossip",
      6: "mastermind",
      7: "exorcist",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });
  nextNight(state);

  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  assert.equal(isImpaired(state, "3"), true, "the Tea Lady is poisoned first");
  assert.equal(
    state.players["2"].alive,
    false,
    "the impaired Tea Lady cannot protect her neighbour",
  );
});

test("a sober Tea Lady protects a Pukka victim from the delayed death (BMR-TEALADY-01)", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "tealady",
      4: "courtier",
      5: "gossip",
      6: "mastermind",
      7: "exorcist",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });
  nextNight(state);

  completeStep(state, pukkaStep(state)!.key, { targetIds: ["5"] });
  assert.equal(state.players["2"].alive, true, "the Tea Lady protects her neighbour");
  assert.equal(isImpaired(state, "2"), false, "the protected victim becomes healthy");
  assert.equal(isImpaired(state, "5"), true, "the new target is poisoned");
});

test("the Pukka can poison a dead player who is resurrected later", () => {
  const state = make(
    {
      1: "pukka",
      2: "professor",
      3: "chambermaid",
      4: "courtier",
      5: "gossip",
      6: "mastermind",
      7: "tinker",
    },
    { count: 8 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["4"] });
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  kill(state, "3", "ability", { phase: "day" as const, number: 1 });
  assert.equal(endDay(state).ok, true);

  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  const professor = state.night.queue.find((step) => step.roleId === "professor")!;
  assert.ok(professor);
  completeStep(state, professor.key, { targetIds: ["3"] });
  assert.equal(state.players["3"].alive, true, "the Professor resurrects the Chambermaid");
  assert.equal(isImpaired(state, "3"), true, "the resurrected player is still poisoned");

  nextNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["5"] });
  assert.equal(
    state.players["3"].alive,
    false,
    "the delayed death still applies after resurrection",
  );
});

test("the Exorcist cannot resolve a Pukka death scheduled for a later night (BMR-EXORCIST-02)", () => {
  const state = make(
    {
      1: "pukka",
      2: "exorcist",
      3: "chambermaid",
      4: "courtier",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  nextNight(state);

  completeStep(state, pukkaStep(state)!.key, { targetIds: ["4"] });
  assert.equal(state.players["3"].alive, false);
  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  completeStep(state, exorcist.key, { targetIds: ["1"] });
  assert.equal(
    state.players["4"].alive,
    true,
    "the new victim dies on the next night, not this one",
  );

  nextNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["5"] });
  assert.equal(state.players["4"].alive, false, "the pending death resolves on its due night");
});

test("the Pukka choosing the same player twice clears both poisons", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  nextNight(state);

  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  assert.equal(state.players["3"].alive, false);
  assert.equal(isImpaired(state, "3"), false, "both Pukka poisons are cleared on death");
  assert.equal(
    state.effects.some(
      (effect) =>
        effect.targetId === "3" &&
        effect.active !== false &&
        (effect.kind === "pukka-death" || (effect.kind === "poison" && effect.pukka === true)),
    ),
    false,
  );
});

test("a protected Pukka victim chosen twice becomes healthy", () => {
  const state = make(
    {
      1: "pukka",
      2: "innkeeper",
      3: "chambermaid",
      4: "courtier",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  nextNight(state);

  const innkeeper = state.night.queue.find((step) => step.roleId === "innkeeper")!;
  completeStep(state, innkeeper.key, { targetIds: ["3", "4"], drunkId: "4" });
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  assert.equal(state.players["3"].alive, true);
  assert.equal(isImpaired(state, "3"), false, "the protected victim becomes healthy");
  assert.equal(
    state.effects.some(
      (effect) =>
        effect.targetId === "3" &&
        effect.active !== false &&
        (effect.kind === "pukka-death" || (effect.kind === "poison" && effect.pukka === true)),
    ),
    false,
  );
});

test("a drunk Pukka suspends the poison and resumes it when sober", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });
  nextNight(state);

  state.effects.push({
    id: "test-pukka-drunk",
    kind: "drunk",
    sourceId: "1",
    targetId: "1",
    start: { phase: "night" as const, number: 2 },
    expires: { phase: "night" as const, number: 3 },
    active: true,
  });
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["3"] });
  assert.equal(state.players["2"].alive, true, "the delayed death is suspended");
  assert.equal(
    isImpaired(state, "2"),
    false,
    "the old poison is inactive while the Pukka is drunk",
  );
  assert.equal(isImpaired(state, "3"), false, "a drunk Pukka does not poison a new target");

  nextNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["4"] });
  assert.equal(
    state.players["2"].alive,
    false,
    "the suspended victim dies when the Pukka is sober",
  );
  assert.equal(isImpaired(state, "3"), false);
  assert.equal(isImpaired(state, "4"), true);
});

test("a dead Pukka stops poisoning and cancels the delayed death (BMR-PUKKA-05)", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });
  const pending = state.effects.find((effect) => effect.kind === "pukka-death");
  assert.ok(pending);

  kill(state, "1", "ability", { phase: "night" as const, number: 1 }, { demon: true });
  assert.equal(state.players["1"].alive, false);
  assert.equal(effectActive(state, pending, { phase: "night" as const, number: 2 }), false);
  assert.equal(isImpaired(state, "2"), false);
});

test("Pukka consequences are identical through validate, preview and apply", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  const first = pukkaStep(state)!;
  const command = {
    id: "pukka-first",
    type: "completeNightStep",
    payload: { key: first.key, targetIds: ["2"] },
  };
  const before = canonicalState(state);
  assert.equal(validateCommand(state, command).status, "allowed");
  assert.deepEqual(canonicalState(state), before, "validate must not mutate");

  const preview = previewCommand(state, command) as CommandView;
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.ok(preview.events.some((event) => event.type === "effect.added"));
  assert.ok(
    preview.future.delayedEffects.some(
      (effect) => effect.kind === "pukka-death" && effect.resolve && effect.resolve.number === 2,
    ),
    "the pending death appears in the future projection",
  );
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");

  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.deepEqual(preview.events, applied.events);
  assert.equal(isImpaired(state, "2"), true);

  nextNight(state);
  const second = pukkaStep(state)!;
  const killCommand = {
    id: "pukka-second",
    type: "completeNightStep",
    payload: { key: second.key, targetIds: ["3"] },
  };
  const killPreview = previewCommand(state, killCommand) as CommandView;
  assert.equal(killPreview.status, "allowed", JSON.stringify(killPreview));
  assert.ok(killPreview.events.some((event) => event.type === "death.recorded"));
  const appliedKill = applyCommand(state, killCommand);
  assert.equal(appliedKill.status, "allowed", JSON.stringify(appliedKill));
  assert.equal(state.players["2"].alive, false);
  assert.equal(isImpaired(state, "3"), true);

  const repeated = applyCommand(state, killCommand) as AllowedResult;
  assert.equal(repeated.idempotent, true);
  assert.equal(state.deaths.filter((death) => death.playerId === "2").length, 1);
});

test("the Pukka's poison and pending death survive export and import", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, "error" in restored ? restored.error : "");
  assert.deepEqual(validateState(restored.state), []);
  assert.equal(isImpaired(restored.state, "2"), true, "the poison persists");

  nextNight(restored.state);
  completeStep(restored.state, pukkaStep(restored.state)!.key, { targetIds: ["3"] });
  assert.equal(restored.state.players["2"].alive, false, "the pending death persists");
  assert.equal(isImpaired(restored.state, "3"), true);
});

test("the Assassin kills through the Tea Lady's protection (BMR-ASSASSIN-01, BMR-TEALADY-01)", () => {
  const state = make(
    {
      1: "tealady",
      2: "sailor",
      3: "assassin",
      4: "gossip",
      5: "courtier",
      6: "tinker",
      7: "po",
      8: "chambermaid",
    },
    { count: 8 },
  );
  startNight(state);
  nextNight(state);
  const assassin = state.night.queue.find((step) => step.roleId === "assassin");
  assert.ok(assassin);
  assert.equal(completeStep(state, assassin.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordBmrOutcome(state, assassin.key, { deathIds: ["2"] }).ok, true);
  assert.equal(
    state.players["2"].alive,
    false,
    "the Tea Lady protects both good neighbours, but the Assassin bypasses her",
  );
});

test("the Assassin kills through the Fool's protection (BMR-ASSASSIN-01, BMR-FOOL-01)", () => {
  const state = make(
    {
      1: "fool",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "po",
      6: "assassin",
      7: "exorcist",
    },
    { count: 8 },
  );
  startNight(state);
  nextNight(state);
  const assassin = state.night.queue.find((step) => step.roleId === "assassin");
  assert.ok(assassin);
  completeStep(state, assassin.key, { targetIds: ["1"] });
  recordBmrOutcome(state, assassin.key, { deathIds: ["1"] });
  assert.equal(state.players["1"].alive, false);
  assert.equal(state.players["1"].used.fool, undefined, "the Assassin ignored the Fool's ability");
});

const ASSASSIN_FIXTURE = {
  1: "fool",
  2: "chambermaid",
  3: "sailor",
  4: "courtier",
  5: "po",
  6: "assassin",
  7: "exorcist",
} as const;

function assassinNightTwo(): GameState {
  const state = make({ ...ASSASSIN_FIXTURE }, { count: 8 });
  startNight(state);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  return state;
}

function assassinStep(state: GameState): NightStep | undefined {
  return state.night.queue.find((step) => step.roleId === "assassin");
}

test("an Assassin who declines keeps the ability for a later night (BMR-ASSASSIN-02)", () => {
  const state = assassinNightTwo();
  const first = assassinStep(state);
  assert.ok(first, "the Assassin wakes on the second night");
  assert.equal(skipStep(state, first.key, "declined").ok, true);
  assert.equal(state.players["6"].used.assassin, undefined, "declining does not spend the ability");

  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const later = assassinStep(state);
  assert.ok(later, "the Assassin wakes again on the third night");
  assert.equal(completeStep(state, later.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, false, "the later kill lands");
  assert.equal(state.players["6"].used.assassin, true, "the kill spends the ability");
});

test("an Assassin never wakes again after a kill (BMR-ASSASSIN-02)", () => {
  const state = assassinNightTwo();
  const step = assassinStep(state);
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(assassinStep(state), undefined, "the spent Assassin has no step");
});

test("an impaired Assassin spends the ability without killing (BMR-ASSASSIN-02)", () => {
  const state = assassinNightTwo();
  state.effects.push({
    id: "test-poison-assassin",
    kind: "poison",
    sourceId: "5",
    targetId: "6",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  const step = assassinStep(state);
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, true, "a drunk or poisoned Assassin kills nobody");
  assert.equal(state.players["6"].used.assassin, true, "the chosen ability is spent");
  assert.equal(step.noteKey, "note.abilityFailed");
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "assassin" && !candidate.done),
    false,
    "no later step is built after an impaired use",
  );
});

test("an impaired Assassin does not kill when the outcome is recorded (BMR-ASSASSIN-02)", () => {
  const state = assassinNightTwo();
  state.effects.push({
    id: "test-poison-assassin-outcome",
    kind: "poison",
    sourceId: "5",
    targetId: "6",
    start: { phase: "night", number: 2 },
    expires: { phase: "night", number: 3 },
    active: true,
  });
  const step = assassinStep(state);
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordBmrOutcome(state, step.key, { deathIds: ["2"] }).ok, false);
  assert.equal(state.players["2"].alive, true, "an impaired Assassin kills nobody");
});

test("a resurrected Assassin regains the once-per-game ability (BMR-ASSASSIN-02)", () => {
  const state = make({ ...ASSASSIN_FIXTURE }, { count: 8 });
  state.players["6"].used.assassin = true;
  kill(state, "6", "ability", { phase: "night", number: 1 });
  assert.equal(state.players["6"].alive, false);
  assert.equal(resurrectPlayer(state, "6")?.alive, true);
  assert.equal(
    state.players["6"].used.assassin,
    undefined,
    "Professor r1775: the resurrected player regains a used once-per-game ability",
  );
});

test("an Assassin step rejects an unknown target and a duplicate completion (BMR-ASSASSIN-02)", () => {
  const state = assassinNightTwo();
  const step = assassinStep(state);
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["99"] }).ok, false);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(completeStep(state, step.key, { targetIds: ["3"] }).ok, false);
  assert.equal(state.players["3"].alive, true, "the duplicate command changes nothing");
});

test("the Zombuul survives its first death but registers as dead (BMR-ZOMBUUL-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "zombuul",
      7: "fool",
    },
    { count: 8 },
  );
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
  const result = executeByDecision(state, "6");
  assert.equal(result.ok, true);
  assert.equal(state.players["6"].alive, true);
  assert.equal(state.players["6"].registeredDead, true);
  assert.equal(state.winner, null);
  assert.equal(state.players["6"].used.zombuul, true);
  const zombuulLog = state.log.find((entry) => entry.title.includes("первая смерть Зомбула"));
  assert.equal(zombuulLog?.consequence, "prevented");
});

test("a registered-dead Zombuul cannot nominate and its vote spends the token (BMR-ZOMBUUL-02)", () => {
  const state = make(
    { 1: "zombuul", 2: "assassin", 3: "sailor", 4: "courtier", 5: "chambermaid" },
    { count: 5 },
  );
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
  state.players["1"].registeredDead = true;
  assert.equal(state.players["1"].alive, true, "the Zombuul is secretly alive");

  const own = nominate(state, "1", "3");
  assert.equal(own.ok, false, "a registered-dead Zombuul cannot nominate");

  const other = nominate(state, "3", "1");
  assert.equal(other.ok, true);
  const first = state.day.activeNominationId!;
  assert.equal(recordVotes(state, first, ["1"]).ok, true);
  assert.equal(state.players["1"].voteToken, false, "the first vote spends the token");
  assert.equal(
    state.day.nominations.find((item) => item.id === first)!.count,
    1,
    "the first dead vote counts",
  );
  assert.equal(
    state.day.nominations.find((item) => item.id === first)!.threshold,
    3,
    "the threshold keeps the game's own living count",
  );
  assert.equal(resetVotes(state, first, "recount").ok, true);
  assert.equal(
    state.players["1"].voteToken,
    true,
    "a recount returns the registered-dead voter's token",
  );
  assert.equal(recordVotes(state, first, ["1"]).ok, true);
  assert.equal(state.players["1"].voteToken, false, "the recount spends the token again");

  const second = nominate(state, "4", "3");
  assert.equal(second.ok, true);
  const secondId = state.day.activeNominationId!;
  assert.equal(recordVotes(state, secondId, ["1"]).ok, true);
  assert.equal(
    state.day.nominations.find((item) => item.id === secondId)!.count,
    0,
    "the spent dead vote is not counted",
  );
});

test("the Zombuul kills at night when nobody died today", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "zombuul",
      7: "fool",
    },
    { count: 8 },
  );
  nextNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "zombuul");
  assert.ok(step, "the Zombuul wakes after a day without a death");
  assert.equal(completeStep(state, step.key, { targetIds: ["1"] }).ok, true);
  assert.equal(recordBmrOutcome(state, step.key, { deathIds: ["1"] }).ok, true);
  assert.equal(state.players["1"].alive, false, "the chosen player dies");
});

test("official Mastermind extension includes the intervening night before its extra day", () => {
  const state = make({ 1: "chambermaid", 3: "mastermind", 6: "po" }, { count: 8 });
  startNight(state);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(executeByDecision(state, "6").ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.phase, "night");
  assert.equal(state.night.number, 2);
  assert.equal(state.mastermind?.extraDay, false);
  assert.ok(state.night.queue.some((step) => step.roleId === "chambermaid" && !step.skipped));
  assert.equal(
    state.night.queue.some((step) => step.roleId === "po" && !step.skipped),
    false,
  );
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2);
  assert.equal(state.mastermind?.extraDay, true);
  assert.equal(state.winner, null);
  assert.equal(executeByDecision(state, "3").ok, true);
  const winner = checkWin(state);
  assert.equal(winner?.team, "good");
  assert.equal(winner?.reason, "mastermind");
});

function enterMastermindExtraDay(extra: Record<string, RoleId> = {}): GameState {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "mastermind",
      4: "sailor",
      5: "gossip",
      6: "po",
      7: "fool",
      ...extra,
    },
    { count: 8 },
  );
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
  assert.equal(executeByDecision(state, "6").ok, true);
  assert.equal(state.mastermind?.active, true, "the Mastermind arms the extra day");
  assert.equal(state.mastermind?.extraDay, false);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.phase, "night");
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.day.number, 2, "the extra day follows the intervening night");
  assert.equal(state.mastermind?.extraDay, true, "the extra day is active");
  return state;
}

test("the Mastermind extra day ends good when nobody is executed (BMR-MASTERMIND-01)", () => {
  const state = enterMastermindExtraDay();
  assert.equal(endDay(state).ok, true);
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead", "no execution gives good the game");
});

test("a good player who survives the Mastermind extra-day execution still loses (BMR-MASTERMIND-01)", () => {
  const state = enterMastermindExtraDay({ 7: "pacifist" });
  assert.equal(executeByDecision(state, "1", { survives: true }).ok, true);
  assert.equal(state.players["1"].alive, true, "the Pacifist spares the good player");
  assert.equal(state.winner?.team, "evil");
  assert.equal(state.winner?.reason, "mastermind", "the good player was still executed");
});

test("an evil player executed on the Mastermind extra day loses for evil (BMR-MASTERMIND-01)", () => {
  const state = enterMastermindExtraDay();
  assert.equal(executeByDecision(state, "3").ok, true);
  assert.equal(state.players["3"].alive, false, "the executed Mastermind dies");
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "mastermind");
});

test("the Mastermind extends the game by one day after a Demon execution (BMR-MASTERMIND-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "mastermind",
      4: "sailor",
      5: "gossip",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
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
  executeByDecision(state, "6");
  assert.equal(state.winner, null);
  assert.equal(state.mastermind!.active, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.phase, "night");
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2);
  executeByDecision(state, "1");
  endDay(state);
  assert.equal(state.winner!.team, "evil");
  assert.equal(state.winner!.reason, "mastermind");
});

test("the Chambermaid does not wake without two registered-living choices (BMR-CHAMBERMAID-05)", () => {
  const state = make(
    { 1: "chambermaid", 2: "zombuul", 3: "assassin", 4: "sailor", 5: "courtier" },
    { count: 5 },
  );
  for (const id of ["3", "4", "5"]) state.players[id].registeredDead = true;
  startNight(state);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "chambermaid"),
    false,
    "a registered-dead player is not a legal choice",
  );
});

test("a Minion execution makes everyone except the Minstrel drunk (BMR-MINSTREL-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "minstrel",
    },
    { count: 9 },
  );
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
  executeByDecision(state, "5");
  const drunk = state.effects.filter((effect) => effect.kind === "drunk");
  assert.equal(drunk.length, 8, "every other player, including the executed Minion");
  assert.ok(drunk.every((effect) => effect.targetId !== "7"));
  assert.ok(
    drunk.some((effect) => effect.targetId === "5"),
    "a player resurrected later is already drunk",
  );
});

test("a drunk or poisoned Minstrel does not make the town drunk when a Minion is executed (BMR-MINSTREL-01)", () => {
  for (const impairment of ["drunk", "poison"] as const) {
    const state = make(
      {
        1: "chambermaid",
        2: "courtier",
        3: "sailor",
        4: "gossip",
        5: "devilsadvocate",
        6: "po",
        7: "minstrel",
      },
      { count: 9 },
    );
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
    addEffect(state, impairment, "7");
    assert.equal(executeByDecision(state, "5").ok, true);
    assert.equal(
      state.effects.filter((effect) => effect.kind === "drunk" && effect.sourceId === "7").length,
      0,
      "an impaired Minstrel creates no drunk effects",
    );
  }
});

test("a Minstrel killed at night ends everyone's drunkenness (BMR-MINSTREL-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "minstrel",
    },
    { count: 9 },
  );
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
  assert.equal(executeByDecision(state, "5").ok, true);
  const at = { phase: "night" as const, number: 2 };
  assert.equal(isImpaired(state, "1", at), true, "the living Minstrel's drunk is active");
  kill(state, "7", "ability", at);
  assert.equal(state.players["7"].alive, false, "the Minstrel died");
  // Glossary r3168: a dead player's persistent ability effects end immediately.
  assert.equal(isImpaired(state, "1", at), false, "the dead Minstrel's drunk ends");
});

test("the Professor resurrects a dead Townsfolk only (BMR-PROFESSOR-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "professor",
      6: "po",
      7: "goon",
    },
    { count: 8 },
  );
  state.players["1"].alive = false;
  finishNight((startNight(state), state));
  assert.equal(endNight(state).ok, true);
  endDay(state);
  const professor = state.night.queue.find((step) => step.roleId === "professor")!;
  assert.ok(professor);
  const living = completeStep(state, professor.key, { targetIds: ["2"] });
  assert.equal(living.ok, false, "a living player is not a legal Professor target");
  assert.equal(
    "errorCode" in living ? living.errorCode : null,
    "error.professor-dead-only",
    JSON.stringify(living),
  );
  assert.equal(
    state.players["5"].used!.professor,
    undefined,
    "an illegal target does not spend the once-per-game ability",
  );
  completeStep(state, professor.key, { targetIds: ["1"] });
  recordBmrOutcome(state, professor.key, { resurrectId: "1" });
  assert.equal(state.players["1"].alive, true);
  const resurrectLog = state.log.find((entry) => entry.title.includes("возвращается"));
  assert.equal(resurrectLog?.consequence, "revived");
});

test("the Devil's Advocate prevents tomorrow's execution death (BMR-DEVILSADVOCATE-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const advocate = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  completeStep(state, advocate.key, { targetIds: ["2"] });
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  const result = executeByDecision(state, "2");
  assert.equal(result.ok, true);
  assert.equal(state.players["2"].alive, true);
});

test("the Gossip statement schedules a night death only when it was true (BMR-GOSSIP-01)", () => {
  for (const truth of [false, true]) {
    const state = make(
      {
        1: "chambermaid",
        2: "courtier",
        3: "sailor",
        4: "gossip",
        5: "devilsadvocate",
        6: "po",
        7: "fool",
      },
      { count: 8 },
    );
    startNight(state);
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
    assert.equal(gossipStatement(state, truth).ok, true);
    assert.equal(endDay(state).ok, true);
    const gossip = state.night.queue.find((step) => step.roleId === "gossip");
    assert.equal(Boolean(gossip), truth, "a true statement queues the Gossip's victim");
    if (gossip) {
      const target = state.order.find((id) => state.players[id].alive && id !== "4");
      assert.ok(target);
      assert.equal(completeStep(state, gossip.key, { targetIds: [target] }).ok, true);
      const outcome = recordBmrOutcome(state, gossip.key, { deathIds: [target] });
      assert.equal(outcome.ok, true, JSON.stringify(outcome));
      assert.equal(
        state.players[target].alive,
        false,
        "the true statement kills the chosen player",
      );
    }
  }
});

test("the Moonchild picks a living player after dying", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "moonchild",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["4"].alive = false;
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
  assert.equal(moonchildChoice(state, "99").ok, false);
  assert.equal(moonchildChoice(state, "1").ok, true);
  assert.equal(state.players["4"].used.moonchildTarget, "1");
});

test("the Exorcist stops the chosen Demon's wake", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "exorcist",
      5: "devilsadvocate",
      6: "po",
      7: "grandmother",
    },
    { count: 9 },
  );
  nextNight(state);
  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.ok(exorcist);
  completeStep(state, exorcist.key, { targetIds: ["6"] });
  const demon = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(demon.done || demon.skipped, true);
  assert.match(demon.note || "", /Экзорцист|Экзорциста/);
  assert.equal(demon.noteVars?.name, "P4", "the Demon learns which player is the Exorcist");
  assert.match(demon.note || "", /P4/);
});

test("an impaired Devil's Advocate protects nobody after recovery (BMR-DEVILSADVOCATE-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  state.effects.push({
    id: "poison-advocate",
    kind: "poison",
    sourceId: "3",
    targetId: "5",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  const advocate = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, advocate.key, { targetIds: ["2"] }).ok, true);
  // States r1039: the failed ability stays wasted even after the source recovers.
  state.effects.find((effect) => effect.id === "poison-advocate")!.active = false;
  assert.equal(
    state.effects.some(
      (effect) =>
        effect.kind === "devilsadvocate" &&
        effect.sourceId === "5" &&
        effectActive(state, effect, { phase: "night", number: 1 }),
    ),
    false,
    "an impaired Devil's Advocate does not protect when they recover",
  );
});

test("the Devil's Advocate cannot choose the same target on consecutive nights (BMR-DEVILSADVOCATE-02)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(second.previousTarget, "2");

  const before = canonicalState(state);
  const rejected = applyCommand(state, {
    id: "repeat-advocate",
    type: "completeStep",
    payload: { key: second.key, options: { targetIds: ["2"] } },
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.errorCode, "error.50");
  assert.deepEqual(canonicalState(state), before);

  const repeat = completeStep(state, second.key, { targetIds: ["2"] });
  assert.equal(repeat.ok, false);
  assert.equal(second.done, false);
  assert.deepEqual(second.targetIds, []);

  const allowed = applyCommand(state, {
    id: "advocate-new-target",
    type: "completeStep",
    payload: { key: second.key, options: { targetIds: ["3"] } },
  });
  assert.equal(allowed.status, "allowed", JSON.stringify(allowed));
  const completed = state.night.queue.find((step) => step.key === second.key)!;
  assert.deepEqual(completed.targetIds, ["3"]);
});

test("the Exorcist cannot choose the same target on consecutive nights", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "exorcist",
      5: "devilsadvocate",
      6: "po",
      7: "grandmother",
    },
    { count: 9 },
  );
  nextNight(state);
  const first = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.equal(second.previousTarget, "2");

  const repeat: Record<string, unknown> = completeStep(state, second.key, { targetIds: ["2"] });
  assert.equal(repeat.ok, false);
  assert.equal(repeat.errorCode, "error.50");
  assert.equal(second.done, false);

  assert.equal(completeStep(state, second.key, { targetIds: ["3"] }).ok, true);
  assert.equal(second.targetIds![0], "3");
});

test("the Devil's Advocate may repeat a target after a skipped night", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  skipRemaining(state);
  endNightToNext(state);

  const second = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.ok(second);
  skipFixtureStep(state, second);
  skipRemaining(state);
  endNightToNext(state);

  const third = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.ok(third);
  assert.equal(third.previousTarget, undefined, "a skipped night breaks the consecutive pair");
  assert.equal(completeStep(state, third.key, { targetIds: ["2"] }).ok, true);
});

test("the Exorcist may repeat a target after a skipped night", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "exorcist",
      5: "devilsadvocate",
      6: "po",
      7: "grandmother",
    },
    { count: 9 },
  );
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);

  const first = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  skipRemaining(state);
  endNightToNext(state);

  const second = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.ok(second);
  skipFixtureStep(state, second);
  skipRemaining(state);
  endNightToNext(state);

  const third = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.ok(third);
  assert.equal(third.previousTarget, undefined, "a skipped night breaks the consecutive pair");
  assert.equal(completeStep(state, third.key, { targetIds: ["2"] }).ok, true);
});

test("a resurrected Devil's Advocate may repeat a target from before death", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  state.players["5"].alive = false;
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  state.players["5"].alive = true;
  assert.equal(endDay(state).ok, true);

  const third = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.ok(third);
  assert.equal(
    third.previousTarget,
    undefined,
    "the dead Devil's Advocate made no choice last night",
  );
  assert.equal(completeStep(state, third.key, { targetIds: ["2"] }).ok, true);
});

test("a Devil's Advocate who left play and returned is not bound by the old target", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  state.players["5"].roleId = "courtier";
  assert.equal(endDay(state).ok, true);

  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  state.players["5"].roleId = "devilsadvocate";
  assert.equal(endDay(state).ok, true);

  const third = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.ok(third);
  assert.equal(third.previousTarget, undefined, "the old record belongs to a different stint");
  assert.equal(completeStep(state, third.key, { targetIds: ["2"] }).ok, true);
});

test("a legacy target without a night is treated as unknown", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  delete state.players["5"].used.devilsadvocateTargetNight;

  const restored = importGame(exportGame(state));
  assert.equal(restored.ok, true, "error" in restored ? restored.error : "");
  assert.equal(restored.state.players["5"].used.devilsadvocateTarget, "2");

  skipRemaining(restored.state);
  endNightToNext(restored.state);
  const second = restored.state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(
    second.previousTarget,
    undefined,
    "an unknown old target cannot be proven to be last night",
  );
  assert.equal(completeStep(restored.state, second.key, { targetIds: ["2"] }).ok, true);
  assert.equal(restored.state.players["5"].used.devilsadvocateTargetNight, 2);
});

test("an impaired Devil's Advocate still records its choice", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  addEffect(state, "drunk", "5");
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2"] }).ok, true);
  assert.equal(isImpaired(state, "5"), true);
  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(second.previousTarget, "2");
  assert.equal(completeStep(state, second.key, { targetIds: ["2"] }).ok, false);
});

test("the Grandmother cannot choose an evil grandchild (BMR-GRANDMOTHER-02)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "grandmother",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  startNight(state);
  const grandmother = state.night.queue.find((step) => step.roleId === "grandmother")!;

  const rejected = completeStep(state, grandmother.key, { targetIds: ["6"] });
  assert.equal(rejected.ok, false, "the Demon is not a good Townsfolk or Outsider");
  assert.equal(state.setup.grandmotherId ?? null, null);

  state.players["1"].team = "evil";
  const aligned = completeStep(state, grandmother.key, { targetIds: ["1"] });
  assert.equal(aligned.ok, false, "an evil-aligned Outsider is not a good grandchild");
  state.players["1"].team = "good";

  assert.equal(completeStep(state, grandmother.key, { targetIds: ["1"] }).ok, true);
  assert.equal(state.setup.grandmotherId, "1");
});

test("the Grandmother stores the grandchild and dies when the Demon kills them (BMR-GRANDMOTHER-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "grandmother",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  startNight(state);
  const grandmother = state.night.queue.find((step) => step.roleId === "grandmother")!;
  completeStep(state, grandmother.key, { targetIds: ["1"] });
  assert.equal(state.setup.grandmotherId, "1");
  nextNight(state);
  const po = state.night.queue.find((step) => step.roleId === "po")!;
  completeStep(state, po.key, { targetIds: ["1"] });
  recordBmrOutcome(state, po.key, { deathIds: ["1"] });
  assert.equal(
    state.players["4"].alive,
    false,
    "the Grandmother dies when the Demon kills the grandchild",
  );
  const extra = state.night.queue.find(
    (step) =>
      step.roleId === "grandmother" &&
      (step.noteKey === "note.bmr.grandmotherDeath" ||
        Boolean(step.note && step.note.includes("Demon"))),
  );
  assert.ok(extra, "the Grandmother's death step is inserted");
  const chambermaid = state.night.queue.find((step) => step.roleId === "chambermaid");
  assert.ok(chambermaid, "the Chambermaid keeps her regular step");
  assert.equal(extra.order, BMR_NIGHT_OTHER.indexOf("grandmother"));
  assert.ok(
    state.night.queue.indexOf(extra) < state.night.queue.indexOf(chambermaid),
    "the Grandmother's death step precedes the Chambermaid, not every regular step",
  );
});

function addEffect(state: GameState, kind: string, targetId: string) {
  state.effects.push({
    id: "test-" + kind + "-" + targetId,
    kind,
    sourceId: state.order.find((id) => state.players[id].roleId === "po") || state.order[0]!,
    targetId,
    start: { phase: "night" as const, number: 1 },
    expires: { phase: "night" as const, number: 2 },
    active: true,
  });
}

test("the Tea Lady skips dead seats to find her nearest living neighbours", () => {
  const state = make(
    {
      2: "chambermaid",
      3: "gossip",
      4: "tealady",
      5: "courtier",
      6: "professor",
      7: "assassin",
      8: "po",
    },
    { count: 8 },
  );
  state.players["3"].alive = false;
  state.players["5"].alive = false;
  const at = { phase: "night" as const, number: 1 };
  assert.equal(kill(state, "2", "ability", at), null, "seat 2 is the nearest living neighbour");
  assert.equal(kill(state, "6", "ability", at), null, "seat 6 is the nearest living neighbour");
});

test("a good but drunk or poisoned Tea Lady neighbour is still protected", () => {
  const state = make(
    {
      2: "chambermaid",
      3: "gossip",
      4: "tealady",
      5: "courtier",
      6: "professor",
      7: "assassin",
      8: "po",
    },
    { count: 8 },
  );
  addEffect(state, "drunk", "3");
  addEffect(state, "poison", "5");
  const at = { phase: "night" as const, number: 1 };
  assert.equal(kill(state, "3", "ability", at), null);
  assert.equal(kill(state, "5", "ability", at), null);
});

test("a drunk or poisoned Tea Lady protects nobody (BMR-TEALADY-01)", () => {
  const at = { phase: "night" as const, number: 1 };
  for (const [impairment, target] of [
    ["poison", "3"],
    ["drunk", "5"],
  ] as const) {
    const state = make(
      {
        3: "gossip",
        4: "tealady",
        5: "courtier",
        8: "po",
      },
      { count: 8 },
    );
    addEffect(state, impairment, "4");
    assert.equal(isImpaired(state, "4", at), true);
    assert.ok(kill(state, target, "ability", at), "an impaired Tea Lady protects no neighbour");
  }
});

test("the Tea Lady does not protect when a living neighbour is evil", () => {
  const state = make(
    {
      3: "assassin",
      4: "tealady",
      5: "chambermaid",
      8: "po",
    },
    { count: 8 },
  );
  const at = { phase: "night" as const, number: 1 };
  const death = kill(state, "5", "ability", at);
  assert.ok(death, "an evil neighbour cancels the Tea Lady's protection");
  assert.equal(state.players["5"].alive, false);
});

test("a Tea Lady's protected neighbour survives an execution (BMR-TEALADY-01)", () => {
  const state = make(
    { 1: "chambermaid", 2: "gossip", 3: "tealady", 4: "courtier", 5: "assassin", 8: "po" },
    { count: 8 },
  );
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
  assert.equal(executeByDecision(state, "2").ok, true);
  assert.equal(state.players["2"].alive, true, "the protected neighbour survives execution");
});

test("a dead Tea Lady protects nobody (BMR-TEALADY-01)", () => {
  const state = make(
    { 1: "chambermaid", 2: "gossip", 3: "tealady", 4: "courtier", 5: "assassin", 8: "po" },
    { count: 8 },
  );
  kill(state, "3", "ability", { phase: "night", number: 1 });
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
  assert.equal(executeByDecision(state, "2").ok, true);
  assert.equal(state.players["2"].alive, false, "no protection comes from the grave");
});

test("the Tea Lady does not protect a non-neighbour from execution (BMR-TEALADY-01)", () => {
  const state = make(
    { 1: "chambermaid", 2: "gossip", 3: "tealady", 4: "courtier", 5: "assassin", 8: "po" },
    { count: 8 },
  );
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
  assert.equal(executeByDecision(state, "1").ok, true);
  assert.equal(state.players["1"].alive, false, "only the two neighbours are protected");
});

test("the Sailor cannot die while healthy but dies while poisoned or drunk", () => {
  const makeSailor = () => make({ 3: "sailor", 8: "po" }, { count: 8 });
  const at = { phase: "night" as const, number: 1 };
  assert.equal(kill(makeSailor(), "3", "ability", at), null, "healthy");

  const poisoned = makeSailor();
  addEffect(poisoned, "poison", "3");
  assert.ok(kill(poisoned, "3", "ability", at), "poison removes the protection");

  const drunk = makeSailor();
  addEffect(drunk, "drunk", "3");
  assert.ok(kill(drunk, "3", "ability", at), "drunk removes the protection");

  const restored = makeSailor();
  addEffect(restored, "poison", "3");
  restored.effects.at(-1)!.active = false;
  assert.equal(kill(restored, "3", "ability", at), null, "restored Sailor is protected again");
});

test("a sober Zombuul replaces its first death and dies on the second", () => {
  const state = make({ 7: "assassin", 8: "zombuul" }, { count: 8 });
  const at = { phase: "night" as const, number: 1 };
  assert.equal(kill(state, "8", "ability", at), null);
  assert.equal(state.players["8"].alive, true);
  assert.equal(state.players["8"].registeredDead, true);
  assert.equal(state.players["8"].used.zombuul, true);
  const second = kill(state, "8", "ability", at);
  assert.ok(second, "the second death is real");
  assert.equal(state.players["8"].alive, false);
});

test("an impaired Zombuul dies on its first death and does not register as dead", () => {
  const state = make({ 7: "assassin", 8: "zombuul" }, { count: 8 });
  addEffect(state, "poison", "8");
  const at = { phase: "night" as const, number: 1 };
  const death = kill(state, "8", "ability", at);
  assert.ok(death, "the poisoned Zombuul's ability does not work");
  assert.equal(state.players["8"].alive, false);
  assert.notEqual(state.players["8"].registeredDead, true);
  assert.notEqual(state.players["8"].used.zombuul, true);
  checkWin(state);
  assert.equal(state.winner!.team, "good");
});

function selfTargetFixture(): GameState {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });
  nextNight(state);
  return state;
}

function healSelfPoisonCommand(state: GameState, id: string) {
  const poison = state.effects.find(
    (effect) =>
      effect.kind === "poison" &&
      effect.pukka === true &&
      effect.sourceId === "1" &&
      effect.targetId === "1" &&
      effect.active !== false,
  );
  assert.ok(poison, "the Pukka is self-poisoned");
  return {
    id,
    type: "manualCorrection",
    payload: { change: { kind: "effect", effectId: poison.id, value: false, reason: "test heal" } },
  };
}

test("the Pukka choosing itself poisons itself and suspends the previous death (BMR-PUKKA-06)", () => {
  const state = selfTargetFixture();
  const deaths = state.deaths.length;
  const command = {
    id: "pukka-self-1",
    type: "completeNightStep",
    payload: { key: pukkaStep(state)!.key, targetIds: ["1"] },
  };
  const before = canonicalState(state);
  const preview = previewCommand(state, command) as CommandView;
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");
  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.equal(state.players["2"].alive, true);
  assert.equal(isImpaired(state, "2"), false, "the previous victim becomes healthy");
  assert.equal(isImpaired(state, "1"), true, "the Pukka is self-poisoned");
  assert.equal(state.deaths.length, deaths, "no death is recorded on the self-target step");

  const pendingA = state.effects.find(
    (effect) => effect.kind === "pukka-death" && effect.targetId === "2" && effect.active !== false,
  );
  assert.ok(pendingA);
  assert.equal(pendingA.suspended, "self-target");
  assert.equal(pendingA.resumeOnHealthy, true);

  const selfPoison = state.effects.find(
    (effect) =>
      effect.kind === "poison" &&
      effect.pukka === true &&
      effect.sourceId === "1" &&
      effect.targetId === "1" &&
      effect.active !== false,
  );
  assert.ok(selfPoison);
  assert.ok(
    preview.future.delayedEffects.some(
      (effect) =>
        effect.id === pendingA.id &&
        effect.suspended === "self-target" &&
        effect.resolve &&
        effect.resolve.number === 2,
    ),
    "the suspended death appears in the future projection",
  );
});

test("a self-poisoned Pukka applies no new poison and resolves no suspended death", () => {
  const state = selfTargetFixture();
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["1"] });
  nextNight(state);
  const deaths = state.deaths.length;

  const applied = applyCommand(state, {
    id: "pukka-self-2",
    type: "completeNightStep",
    payload: { key: pukkaStep(state)!.key, targetIds: ["3"] },
  });
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  const pendingA = state.effects.find(
    (effect) => effect.kind === "pukka-death" && effect.targetId === "2" && effect.active !== false,
  )!;
  const selfPending = state.effects.find(
    (effect) => effect.kind === "pukka-death" && effect.targetId === "1" && effect.active !== false,
  )!;
  assert.equal(state.players["2"].alive, true);
  assert.equal(state.players["3"].alive, true);
  assert.equal(state.deaths.length, deaths);
  assert.equal(
    isImpaired(state, "2"),
    false,
    "the previous victim stays healthy while the Pukka is self-poisoned",
  );
  assert.equal(isImpaired(state, "1"), true);
  assert.equal(pendingA.suspended, "self-target");
  assert.equal(selfPending.suspended, "impaired");
});

test("a healed Pukka resolves the suspended death immediately and can end the game", () => {
  const state = selfTargetFixture();
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["1"] });
  for (const id of state.order) {
    if (["1", "2", "4"].includes(id)) continue;
    state.players[id].alive = false;
    state.players[id].voteToken = true;
  }

  const command = healSelfPoisonCommand(state, "pukka-heal-1");
  const before = canonicalState(state);
  const preview = previewCommand(state, command) as CommandView;
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");
  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.equal(
    state.players["2"].alive,
    false,
    "the suspended victim dies when the Pukka becomes healthy",
  );
  assert.equal(state.winner && state.winner.reason, "two-alive");
  assert.equal(preview.future.winner && preview.future.winner.reason, "two-alive");
  assert.ok(preview.changes.deaths.includes("2"));
  assert.ok(applied.changes.deaths.includes("2"));
  assert.equal(
    state.effects.some(
      (effect) =>
        effect.targetId === "2" &&
        effect.active !== false &&
        (effect.kind === "pukka-death" || (effect.kind === "poison" && effect.pukka === true)),
    ),
    false,
    "the victim's Pukka effects clear",
  );
});

test("a recovered Pukka dies as the previously poisoned target when it chooses again", () => {
  const state = selfTargetFixture();
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["1"] });
  const healed = applyCommand(state, healSelfPoisonCommand(state, "pukka-heal-2"));
  assert.equal(healed.status, "allowed", JSON.stringify(healed));
  assert.equal(state.players["1"].alive, true, "the Pukka is healthy before its next step");

  nextNight(state);
  const command = {
    id: "pukka-recovered",
    type: "completeNightStep",
    payload: { key: pukkaStep(state)!.key, targetIds: ["3"] },
  };
  const before = canonicalState(state);
  const preview = previewCommand(state, command) as CommandView;
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");
  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.equal(state.players["1"].alive, false, "the Pukka dies as the previously poisoned target");
  const newPoison = state.effects.find(
    (effect) => effect.kind === "poison" && effect.pukka === true && effect.targetId === "3",
  );
  assert.ok(newPoison, "the new target was poisoned before the Pukka died");
  assert.deepEqual(applied.changes.deaths, preview.changes.deaths);
  assert.ok(preview.changes.deaths.includes("1"));
});

test("a later poison suspends the Pukka's earlier poison and pending death", () => {
  const state = make(
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    { count: 7 },
  );
  startNight(state);
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["2"] });
  nextNight(state);
  state.effects.push({
    id: "test-pukka-late-poison",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "night" as const, number: 2 },
    expires: { phase: "night" as const, number: 3 },
    active: true,
  });

  const pending = state.effects.find(
    (effect) => effect.kind === "pukka-death" && effect.targetId === "2" && effect.active !== false,
  );
  assert.equal(isImpaired(state, "1"), true, "the later poison impairs the Pukka");
  assert.equal(isImpaired(state, "2"), false, "the earlier Pukka poison is suspended");
  assert.equal(effectActive(state, pending!), false, "the pending death is suspended");

  const later: GameState = JSON.parse(JSON.stringify(state));
  later.night.number = 3;
  assert.equal(isImpaired(later, "1"), false, "the later poison expired");
  assert.equal(isImpaired(later, "2"), true, "the Pukka's poison resumes");
  const resumed = later.effects.find(
    (effect) => effect.kind === "pukka-death" && effect.targetId === "2" && effect.active !== false,
  );
  assert.equal(effectActive(later, resumed!), true, "the pending death resumes");
});

test("a Pukka stays suspended until the last impairment ends", () => {
  const state = selfTargetFixture();
  completeStep(state, pukkaStep(state)!.key, { targetIds: ["1"] });
  state.effects.push(
    {
      id: "test-pukka-drunk",
      kind: "drunk",
      sourceId: "3",
      targetId: "1",
      start: { phase: "night" as const, number: 2 },
      expires: { phase: "night" as const, number: 4 },
      active: true,
    },
    {
      id: "test-pukka-poison-2",
      kind: "poison",
      sourceId: "4",
      targetId: "1",
      start: { phase: "night" as const, number: 2 },
      expires: { phase: "night" as const, number: 4 },
      active: true,
    },
  );

  const healed = applyCommand(state, healSelfPoisonCommand(state, "pukka-heal-mixed"));
  assert.equal(healed.status, "allowed", JSON.stringify(healed));
  assert.equal(state.players["2"].alive, true, "the Pukka is still impaired");

  const drunkOff = {
    id: "heal-pukka-drunk",
    type: "manualCorrection",
    payload: {
      change: { kind: "effect", effectId: "test-pukka-drunk", value: false, reason: "test" },
    },
  };
  assert.equal(applyCommand(state, drunkOff).status, "allowed");
  assert.equal(state.players["2"].alive, true, "the remaining poison still suspends the death");

  const poisonOff = {
    id: "heal-pukka-poison-2",
    type: "manualCorrection",
    payload: {
      change: { kind: "effect", effectId: "test-pukka-poison-2", value: false, reason: "test" },
    },
  };
  assert.equal(applyCommand(state, poisonOff).status, "allowed");
  assert.equal(state.players["2"].alive, false, "the death resolves when the last impairment ends");
});

test("a poisoned Sailor's drunk effect suspends until the Sailor is healthy", () => {
  const state = make(
    {
      1: "sailor",
      2: "chambermaid",
      3: "mastermind",
      4: "courtier",
      5: "gossip",
      6: "pukka",
    },
    { count: 7 },
  );
  state.night.number = 2;
  state.effects.push(
    {
      id: "test-sailor-drunk",
      kind: "drunk",
      sourceId: "1",
      targetId: "2",
      start: { phase: "night" as const, number: 1 },
      expires: { phase: "night" as const, number: 5 },
      active: true,
    },
    {
      id: "test-sailor-poison",
      kind: "poison",
      sourceId: "3",
      targetId: "1",
      start: { phase: "night" as const, number: 2 },
      expires: { phase: "night" as const, number: 4 },
      active: true,
    },
  );

  assert.equal(
    isImpaired(state, "2"),
    false,
    "the drunk effect is suspended while the Sailor is poisoned",
  );
  const healthy: GameState = JSON.parse(JSON.stringify(state));
  healthy.effects.find((effect) => effect.id === "test-sailor-poison")!.active = false;
  assert.equal(
    isImpaired(healthy, "2"),
    true,
    "the drunk effect resumes when the Sailor is healthy",
  );
});

test("the Fool's first death is prevented, the ability is spent and the next death kills", () => {
  const state = make(
    {
      1: "fool",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "po",
      6: "assassin",
      7: "exorcist",
    },
    { count: 8 },
  );
  const at = { phase: "night" as const, number: 1 };
  assert.equal(kill(state, "1", "ability", at), null, "the first death is prevented");
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.players["1"].used.fool, true, "the ability is spent");
  const second = kill(state, "1", "ability", at);
  assert.ok(second, "the second death is real");
  assert.equal(state.players["1"].alive, false);

  const executed = make(
    { 1: "fool", 2: "chambermaid", 3: "sailor", 4: "courtier", 5: "po" },
    { count: 8 },
  );
  executed.phase = "day";
  executed.day = {
    number: 1,
    morning: [],
    nominations: [],
    activeNominationId: null,
    execution: null,
    ended: false,
    open: true,
  };
  assert.equal(executeByDecision(executed, "1").ok, true);
  assert.equal(executed.players["1"].alive, true, "the first execution is prevented");
  assert.equal(executed.players["1"].used.fool, true);
});

test("the Courtier makes the chosen character drunk for three nights and days, once per game (BMR-COURTIER-01)", () => {
  const state = make(
    {
      1: "courtier",
      2: "chambermaid",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const courtier = state.night.queue.find((step) => step.roleId === "courtier")!;
  assert.ok(courtier);
  assert.equal(completeStep(state, courtier.key, { roleId: "fool" }).ok, true);

  assert.equal(isImpaired(state, "7", { phase: "night" as const, number: 1 }), true);
  assert.equal(isImpaired(state, "7", { phase: "day" as const, number: 3 }), true);
  assert.equal(isImpaired(state, "7", { phase: "night" as const, number: 4 }), false);
  assert.equal(isImpaired(state, "2", { phase: "night" as const, number: 1 }), false);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "courtier"),
    false,
    "the Courtier wakes only once per game",
  );
});

test("a Courtier killed after choosing ends the target's drunkenness (BMR-COURTIER-01)", () => {
  const state = make(
    {
      1: "courtier",
      2: "chambermaid",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const courtier = state.night.queue.find((step) => step.roleId === "courtier")!;
  assert.ok(courtier);
  assert.equal(completeStep(state, courtier.key, { roleId: "fool" }).ok, true);
  const at = { phase: "night" as const, number: 1 };
  assert.equal(isImpaired(state, "7", at), true, "the living Courtier's drunk is active");
  kill(state, "1", "ability", at);
  assert.equal(state.players["1"].alive, false, "the Courtier died");
  // Glossary r3168: a dead player's persistent ability effects end immediately.
  assert.equal(isImpaired(state, "7", at), false, "the dead Courtier's drunk ends");
});

test("the Innkeeper protects both targets tonight and makes one of them drunk until dusk", () => {
  const state = make(
    {
      1: "innkeeper",
      2: "chambermaid",
      3: "gossip",
      4: "fool",
      5: "devilsadvocate",
      6: "po",
    },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const innkeeper = state.night.queue.find((step) => step.roleId === "innkeeper")!;
  assert.ok(innkeeper);
  assert.equal(
    completeStep(state, innkeeper.key, { targetIds: ["2", "3"], drunkId: "2" }).ok,
    true,
  );

  const at = { phase: "night" as const, number: 2 };
  assert.equal(isImpaired(state, "2", at), true);
  assert.equal(isImpaired(state, "3", at), false);
  assert.equal(kill(state, "2", "ability", at), null, "the drunk target is safe tonight");
  assert.equal(kill(state, "3", "ability", at), null, "the second target is safe tonight");

  const dawn = { phase: "night" as const, number: 3 };
  assert.equal(isImpaired(state, "2", dawn), false, "drunk ends at dusk");
  assert.ok(kill(state, "2", "ability", dawn), "protection ends at dawn");
});

test("an Innkeeper killed after choosing ends the target's drunkenness (BMR-INNKEEPER-01)", () => {
  const state = make(
    {
      1: "innkeeper",
      2: "chambermaid",
      3: "gossip",
      4: "fool",
      5: "devilsadvocate",
      6: "po",
    },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const innkeeper = state.night.queue.find((step) => step.roleId === "innkeeper")!;
  assert.ok(innkeeper);
  assert.equal(
    completeStep(state, innkeeper.key, { targetIds: ["2", "3"], drunkId: "2" }).ok,
    true,
  );

  const at = { phase: "night" as const, number: 2 };
  assert.equal(isImpaired(state, "2", at), true, "the living Innkeeper's drunk is active");
  kill(state, "1", "ability", at);
  assert.equal(state.players["1"].alive, false, "the Innkeeper died");
  // Glossary r3168: a dead player's persistent ability effects end immediately.
  assert.equal(isImpaired(state, "2", at), false, "the dead Innkeeper's drunk ends");
});

test("the Sailor makes the chosen recipient drunk until dusk and supports choosing themself (BMR-SAILOR-01, BMR-SAILOR-02)", () => {
  const state = make(
    { 1: "sailor", 2: "chambermaid", 3: "gossip", 4: "fool", 5: "po" },
    { count: 8 },
  );
  startNight(state);
  const first = state.night.queue.find((step) => step.roleId === "sailor")!;
  assert.ok(first);
  assert.equal(completeStep(state, first.key, { targetIds: ["2"], drunkId: "2" }).ok, true);
  assert.equal(isImpaired(state, "2", { phase: "night" as const, number: 1 }), true);
  assert.equal(isImpaired(state, "2", { phase: "day" as const, number: 1 }), true);
  assert.equal(
    isImpaired(state, "2", { phase: "night" as const, number: 2 }),
    false,
    "ends at dusk",
  );

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const second = state.night.queue.find((step) => step.roleId === "sailor")!;
  assert.ok(second);
  assert.equal(completeStep(state, second.key, { targetIds: ["1"], drunkId: "1" }).ok, true);
  assert.equal(
    isImpaired(state, "1", { phase: "night" as const, number: 2 }),
    true,
    "the Sailor themself",
  );
  assert.equal(isImpaired(state, "2", { phase: "night" as const, number: 2 }), false);
});

function gamblerSecondNight() {
  const state = make(
    {
      1: "gambler",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "fool",
      6: "po",
    },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "gambler");
  assert.ok(step);
  return { state, step };
}

test("the Gambler's wrong guess uses the command clock and ids (BMR-GAMBLER-01)", () => {
  const { state, step } = gamblerSecondNight();
  const runtime = createRuntime({ now: () => new Date("2030-01-01T00:00:00.000Z") });
  const command = {
    id: "gambler-wrong-clock",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: ["2"], roleId: "fool" },
    at: "2030-01-01T00:00:00.000Z",
  };
  const preview = previewCommand(state, command, runtime);
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  const applied = applyCommand(state, command, runtime);
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  const death = state.deaths.find((candidate) => candidate.playerId === "1");
  assert.ok(death);
  assert.equal(death.at, "2030-01-01T00:00:00.000Z", "the death uses the command clock");
  const replayed = replay(state.journal, runtime);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.deepEqual(
    canonicalState(replayed.state),
    canonicalState(state),
    "the Gambler death replays identically",
  );
});

test("the Gambler dies on a wrong guess and survives a correct guess (BMR-GAMBLER-01)", () => {
  const wrong = gamblerSecondNight();
  assert.equal(
    completeStep(wrong.state, wrong.step.key, { targetIds: ["2"], roleId: "fool" }).ok,
    true,
  );
  assert.equal(wrong.state.players["1"].alive, false, "a wrong guess kills the Gambler");

  const right = gamblerSecondNight();
  assert.equal(
    completeStep(right.state, right.step.key, { targetIds: ["2"], roleId: "chambermaid" }).ok,
    true,
  );
  assert.equal(right.state.players["1"].alive, true, "a correct guess is harmless");

  const impaired = gamblerSecondNight();
  impaired.state.effects.push({
    id: "test-gambler-poison",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "night" as const, number: 2 },
    expires: { phase: "night" as const, number: 3 },
    active: true,
  });
  assert.equal(
    completeStep(impaired.state, impaired.step.key, { targetIds: ["2"], roleId: "fool" }).ok,
    true,
  );
  assert.equal(impaired.state.players["1"].alive, true, "an impaired Gambler has no ability");
  assert.equal(impaired.step.noteKey, "note.abilityFailed", "the shared failure note is kept");
});

test("the Gambler step cannot record the guessed player's death (BMR-GAMBLER-02)", () => {
  const { state, step } = gamblerSecondNight();
  assert.equal(completeStep(state, step.key, { targetIds: ["2"], roleId: "chambermaid" }).ok, true);
  const result = recordBmrOutcome(state, step.key, { deathIds: ["2"] });
  assert.equal(result.ok, false, "only the Gambler can die from their own guess");
  assert.equal(state.players["2"].alive, true);
});

test("the Gambler death records the ability and a dead target is legal (BMR-GAMBLER-01)", () => {
  const correct = gamblerSecondNight();
  correct.state.players["4"].alive = false;
  assert.equal(
    completeStep(correct.state, correct.step.key, { targetIds: ["4"], roleId: "courtier" }).ok,
    true,
  );
  assert.equal(
    correct.state.players["1"].alive,
    true,
    "a correct guess against a dead player is harmless",
  );

  const wrong = gamblerSecondNight();
  wrong.state.players["4"].alive = false;
  assert.equal(
    completeStep(wrong.state, wrong.step.key, { targetIds: ["4"], roleId: "fool" }).ok,
    true,
  );
  assert.equal(
    wrong.state.players["1"].alive,
    false,
    "the Gambler may gamble on a player who is already dead",
  );
  const entry = wrong.state.deaths.find((death) => death.playerId === "1");
  assert.ok(entry);
  assert.equal(wrong.state.deaths.length, 1, "a wrong guess causes exactly one death");
  assert.equal(entry.cause, "ability");
  assert.equal(entry.ability, "gambler");
  assert.equal(entry.bmr, true);
});

test("the Godfather learns the Outsiders in play on the first night (BMR-GODFATHER-01)", () => {
  const state = make(
    {
      1: "godfather",
      2: "chambermaid",
      3: "sailor",
      4: "moonchild",
      5: "tinker",
      6: "po",
    },
    { count: 8 },
  );
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "godfather");
  assert.ok(step);
  assert.equal(completeStep(state, step.key).ok, true);
  const text = String(step.given!.text);
  // The ability shows the Outsider character tokens, not their seats
  // (Godfather r2394).
  for (const id of state.order) {
    assert.equal(text.includes("P" + id), false, "no seat names: " + text);
  }
  for (const id of state.order) {
    if (roleTeam(state.players[id].roleId || "") !== "outsider") continue;
    assert.ok(
      text.includes(roleLabel(state.players[id].roleId!)),
      "the Godfather learns the Outsider character: " + text,
    );
  }
});

test("the Godfather kills only after an Outsider died today (BMR-GODFATHER-02)", () => {
  const build = () =>
    make(
      {
        1: "chambermaid",
        2: "courtier",
        3: "sailor",
        4: "gossip",
        5: "godfather",
        6: "po",
        7: "moonchild",
      },
      { count: 9 },
    );

  const state = build();
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(executeByDecision(state, "7").ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "godfather");
  assert.ok(step, "the Godfather wakes after an Outsider died today");
  assert.equal(completeStep(state, step.key, { targetIds: ["1"] }).ok, true);
  const outcome = recordBmrOutcome(state, step.key, { deathIds: ["1"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["1"].alive, false, "the chosen player dies");

  const quiet = build();
  startNight(quiet);
  finishNight(quiet);
  assert.equal(endNight(quiet).ok, true);
  assert.equal(endDay(quiet).ok, true);
  assert.equal(
    quiet.night.queue.some((candidate) => candidate.roleId === "godfather"),
    false,
    "no Outsider died today",
  );
});

test("the Shabaloth kills two players and can regurgitate a target from last night (BMR-SHABALOTH-01)", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "gossip",
      6: "devilsadvocate",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "shabaloth"),
    false,
    "the Shabaloth does not wake on the first night",
  );
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const second = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.ok(second);
  assert.equal(completeStep(state, second.key, { targetIds: ["2", "4"] }).ok, true);
  const tooMany = recordBmrOutcome(state, second.key, { deathIds: ["2", "4", "5"] });
  assert.equal(tooMany.ok, false, "the Shabaloth kills two, never three");
  assert.equal(tooMany.errorCode, "error.51");
  assert.equal(state.players["5"].alive, true);
  const outcome = recordBmrOutcome(state, second.key, { deathIds: ["2", "4"] });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["2"].alive, false);
  assert.equal(state.players["4"].alive, false);
  assert.deepEqual(state.players["1"].used.shabalothTargets, ["2", "4"]);
  assert.equal(state.players["1"].used.shabalothTargetsNight, 2);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const third = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.ok(third);
  assert.equal(completeStep(state, third.key, { targetIds: ["2", "4"] }).ok, true);
  const rejected = recordBmrOutcome(state, third.key, { deathIds: [], resurrectId: "5" });
  assert.equal(rejected.ok, false, "a target not chosen last night is rejected");
  assert.equal(rejected.errorCode, "error.51");
  assert.equal(state.players["5"].alive, true);
  const resurrect = recordBmrOutcome(state, third.key, { deathIds: [], resurrectId: "2" });
  assert.equal(resurrect.ok, true);
  assert.equal(state.players["2"].alive, true, "the previous choice is regurgitated");
});

test("the Shabaloth cannot regurgitate after a skipped night", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "gossip",
      6: "devilsadvocate",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const second = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.ok(second);
  assert.equal(completeStep(state, second.key, { targetIds: ["2", "4"] }).ok, true);
  assert.equal(recordBmrOutcome(state, second.key, { deathIds: ["2", "4"] }).ok, true);
  assert.equal(state.players["2"].alive, false);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.night.number, 4);

  const fourth = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.ok(fourth, "the Shabaloth wakes again on night four");
  const rejected = recordBmrOutcome(state, fourth.key, { deathIds: [], resurrectId: "2" });
  assert.equal(rejected.ok, false, "a skipped night clears the previous choice");
  assert.equal(rejected.errorCode, "error.51");
  assert.equal(state.players["2"].alive, false);
});

test("a Devil's Advocate-protected Zombuul keeps its first death (BMR-DEVILSADVOCATE-03)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "zombuul",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const advocate = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.equal(completeStep(state, advocate.key, { targetIds: ["6"] }).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);

  const executed = executeByDecision(state, "6");
  assert.equal(executed.ok, true);
  assert.equal(state.players["6"].alive, true, "the Advocate prevents the execution death");
  assert.notEqual(state.players["6"].registeredDead, true, "the life token is not flipped");
  assert.equal(
    state.players["6"].used && state.players["6"].used.zombuul,
    undefined,
    "the Zombuul's own first death is not spent",
  );
});

test("the Moonchild kills the chosen good player on the next night (BMR-MOONCHILD-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "moonchild",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["4"].alive = false;
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
  assert.equal(moonchildChoice(state, "2").ok, true);
  assert.equal(endDay(state).ok, true);

  const step = state.night.queue.find((candidate) => candidate.roleId === "moonchild");
  assert.ok(step, "the Moonchild step is queued on the next night");
  assert.deepEqual(step.targetIds, ["2"], "the public choice is recorded on the step");
  const result = completeStep(state, step.key);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(step.targetIds, ["2"], "the completion keeps the recorded choice");
  assert.equal(state.players["2"].alive, false, "a good target dies");
  assert.equal(state.players["4"].used.moonchildResolved, true);
});

test("a Moonchild sober at night kills the chosen good player even when poisoned at the choice (BMR-MOONCHILD-01)", () => {
  const state = make(
    {
      1: "moonchild",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["1"].alive = false;
  state.effects.push({
    id: "moonchild-death-poison",
    kind: "poison",
    sourceId: "2",
    targetId: "1",
    start: { phase: "day", number: 1 },
    expires: { phase: "night", number: 2 },
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
  assert.equal(isImpaired(state, "1"), true, "the Moonchild is poisoned when they choose");
  assert.equal(moonchildChoice(state, "2").ok, true);
  // A legacy save may still carry the old stored flag; the night-time state
  // must decide (Moonchild r1783).
  state.players["1"].used.moonchildImpaired = true;
  assert.equal(endDay(state).ok, true);
  assert.equal(isImpaired(state, "1"), false, "the poison has expired at the resolution");
  const step = state.night.queue.find((candidate) => candidate.roleId === "moonchild");
  assert.ok(step);
  assert.equal(completeStep(state, step.key).ok, true);
  assert.equal(
    state.players["2"].alive,
    false,
    "the Moonchild is sober and healthy at night, so the chosen good player dies",
  );
});

test("a Moonchild poisoned at night does not kill a sober choice (BMR-MOONCHILD-01, BMR-PUKKA-04)", () => {
  const state = make(
    {
      1: "moonchild",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["1"].alive = false;
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
  assert.equal(isImpaired(state, "1"), false, "the choice is made while sober and healthy");
  assert.equal(moonchildChoice(state, "2").ok, true);
  state.effects.push({
    id: "moonchild-night-poison",
    kind: "poison",
    sourceId: "3",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  assert.equal(endDay(state).ok, true);
  assert.equal(isImpaired(state, "1"), true, "the Pukka has poisoned the Moonchild at night");
  const step = state.night.queue.find((candidate) => candidate.roleId === "moonchild");
  assert.ok(step);
  assert.equal(completeStep(state, step.key).ok, true);
  assert.equal(
    state.players["2"].alive,
    true,
    "Pukka r3074: a Moonchild poisoned at night does not kill a sober choice",
  );
});

test("the Moonchild kills a Goon that was good when chosen (BMR-MOONCHILD-01)", () => {
  const state = make(
    {
      1: "moonchild",
      2: "goon",
      3: "po",
      4: "chambermaid",
      5: "sailor",
      6: "pacifist",
      7: "professor",
      8: "gossip",
      9: "mastermind",
    },
    { count: 9 },
  );
  state.players["1"].alive = false;
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
  assert.equal(moonchildChoice(state, "2").ok, true);
  assert.equal(state.players["2"].team, "good");
  assert.equal(endDay(state).ok, true);

  const po = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(completeStep(state, po.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].team, "evil", "the Goon takes the Demon's alignment");

  const moonchild = state.night.queue.find((step) => step.roleId === "moonchild")!;
  assert.equal(completeStep(state, moonchild.key).ok, true);
  assert.equal(
    state.players["2"].alive,
    false,
    "the choice-time alignment decides, not the night-time one",
  );
});

test("a regurgitated Moonchild chooses again on the next death (BMR-MOONCHILD-03)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "moonchild",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["4"].alive = false;
  state.players["4"].used = { moonchildTarget: "2", moonchildResolved: true };
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
  assert.equal(moonchildChoice(state, "2").ok, false, "the first choice is spent");

  assert.ok(resurrectPlayer(state, "4"));
  assert.ok(kill(state, "4", "ability", { phase: "day", number: 2 }));
  const second = moonchildChoice(state, "3");
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(state.players["4"].used.moonchildTarget, "3");
});

test("the Moonchild does not kill an evil target (BMR-MOONCHILD-02)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "moonchild",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["4"].alive = false;
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
  assert.equal(moonchildChoice(state, "6").ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "moonchild");
  assert.ok(step);
  assert.equal(completeStep(state, step.key).ok, true);
  assert.equal(state.players["6"].alive, true);
  assert.equal(recordBmrOutcome(state, step.key, { deathIds: ["6"] }).ok, false);
  assert.equal(state.players["6"].alive, true, "the outcome path spares the evil target too");
});

test("the Moonchild rejects a target that differs from the public choice", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "moonchild",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  state.players["4"].alive = false;
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
  assert.equal(moonchildChoice(state, "2").ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "moonchild");
  assert.ok(step);
  assert.deepEqual(step.targetIds, ["2"]);
  const before = canonicalState(state);
  const result: Record<string, unknown> = completeStep(state, step.key, { targetIds: ["1"] });
  assert.equal(result.ok, false, "a different target is rejected");
  assert.equal(result.errorCode, "error.51");
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.players["2"].alive, true);
  assert.equal(step.done, false, "the step stays incomplete");
  assert.deepEqual(step.targetIds, ["2"], "the recorded choice is unchanged");
  assert.deepEqual(canonicalState(state), before, "a rejected completion leaves state unchanged");
});

test("the Professor resurrects only a dead Townsfolk (BMR-PROFESSOR-02)", () => {
  const state = make(
    {
      1: "professor",
      2: "moonchild",
      3: "chambermaid",
      4: "courtier",
      5: "sailor",
      6: "gossip",
      7: "po",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "professor");
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  const outcome = recordBmrOutcome(state, step.key, { resurrectId: "2" });
  assert.equal(outcome.ok, false, "the outcome rejects a non-Townsfolk");
  assert.equal(outcome.errorCode, "error.51");
  assert.equal(state.players["2"].alive, false, "an Outsider is not resurrected");
});

test("the Professor ability is once per game (BMR-PROFESSOR-03)", () => {
  const state = make(
    {
      1: "professor",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "po",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  state.players["3"].alive = false;
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "professor");
  assert.ok(step);
  const standalone = recordBmrOutcome(state, step.key, { resurrectId: "2" });
  assert.equal(standalone.ok, false, "the outcome alone cannot resurrect");
  assert.equal(state.players["2"].alive, false);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordBmrOutcome(state, step.key, { resurrectId: "2" }).ok, true);
  assert.equal(state.players["2"].alive, true, "the dead Townsfolk is resurrected");
  const second = recordBmrOutcome(state, step.key, { resurrectId: "3" });
  assert.equal(second.ok, false, "a second resurrection in the same use is rejected");
  assert.equal(second.errorCode, "error.51");
  assert.equal(state.players["3"].alive, false);

  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "professor"),
    false,
    "the Professor does not wake again",
  );
});

test("an impaired Professor does not resurrect", () => {
  const state = make(
    {
      1: "professor",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "po",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  state.effects.push({
    id: "test-professor-poison",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "night" as const, number: 2 },
    expires: { phase: "night" as const, number: 3 },
    active: true,
  });
  const step = state.night.queue.find((candidate) => candidate.roleId === "professor");
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, false, "the impaired ability does not resurrect");
  const outcome = recordBmrOutcome(state, step.key, { resurrectId: "2" });
  assert.equal(outcome.ok, false, "the outcome also respects the impairment");
  assert.equal(state.players["2"].alive, false);
});

test("a Professor who chooses a non-Townsfolk spends the ability (BMR-PROFESSOR-01)", () => {
  const state = make(
    {
      1: "professor",
      2: "moonchild",
      3: "chambermaid",
      4: "courtier",
      5: "sailor",
      6: "gossip",
      7: "po",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  const step = state.night.queue.find((candidate) => candidate.roleId === "professor");
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(
    state.players["1"].used!.professor,
    true,
    "Professor r1775: a non-Townsfolk choice spends the ability",
  );
  const outcome = recordBmrOutcome(state, step.key, { resurrectId: "2" });
  assert.equal(outcome.ok, false, "an Outsider is not resurrected");
  assert.equal(state.players["2"].alive, false);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "professor"),
    false,
    "the spent Professor does not wake again",
  );
});

test("an impaired Professor spends the once-per-game ability without resurrecting (BMR-PROFESSOR-01)", () => {
  const state = make(
    {
      1: "professor",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "po",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  state.effects.push({
    id: "test-professor-poison",
    kind: "poison",
    sourceId: "6",
    targetId: "1",
    start: { phase: "night" as const, number: 2 },
    expires: { phase: "night" as const, number: 3 },
    active: true,
  });
  const step = state.night.queue.find((candidate) => candidate.roleId === "professor");
  assert.ok(step);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(
    state.players["1"].used!.professor,
    true,
    "the once-per-game is spent even while impaired",
  );
  assert.equal(state.players["2"].alive, false, "the impaired ability does not resurrect");
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(
    state.night.queue.some((candidate) => candidate.roleId === "professor"),
    false,
    "the spent Professor does not wake again",
  );
});

test("the Lunatic's target is reported to the real Demon (BMR-LUNATIC-01)", () => {
  const state = make({ 1: "lunatic", 5: "po" }, { count: 8 });
  assert.equal(state.setup.lunaticShownId, "po");
  assert.equal(state.players["1"].roleId, "lunatic");
  assert.equal(state.players["1"].shownRoleId, "po", "the Lunatic sees the false Demon");

  startNight(state);
  const first = state.night.queue.find((candidate) => candidate.roleId === "lunatic");
  assert.ok(first, "the Lunatic wakes on the first night");
  assert.equal(first.targetMode, "one-any");
  assert.equal(first.minTargets, 1, "one Minion is in play");
  assert.equal(first.maxTargets, 1);
  nextNight(state);

  const step = state.night.queue.find((candidate) => candidate.roleId === "lunatic");
  assert.ok(step, "the Lunatic chooses on later nights");
  assert.equal(step.targetMode, "po", "the Lunatic attacks as the shown Demon");
  assert.equal(step.maxTargets, 1);
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["1"].used.lunaticTarget, "2");

  const demonStep = state.night.queue.find((candidate) => candidate.roleId === "po");
  assert.ok(demonStep);
  const info = bmrInfoForStep(state, demonStep, {});
  assert.equal(info.kind, "note");
  assert.match(info.text!, /Безумец/);
  assert.match(info.text!, /P2/, "the Demon learns who the Lunatic chose");
  assert.equal(state.players["2"].alive, true, "the Lunatic's choice kills nobody");
});

test("the Storyteller picks any players as the Lunatic's first-night Minions", () => {
  const state = make({ 1: "lunatic", 5: "po" }, { count: 8 });
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "lunatic")!;
  assert.equal(step.minTargets, 1, "one Minion is in play");
  assert.equal(step.maxTargets, 1);

  const others = state.order.filter((id) => id !== "1");
  assert.equal(completeStep(state, step.key, {}).ok, false, "the Minion tips are required");
  assert.equal(
    completeStep(state, step.key, { targetIds: [others[0]!, others[1]!] }).ok,
    false,
    "a wrong number of tips is rejected",
  );

  const picked = others.find((id) => roleTeam(state.players[id].roleId!) === "townsfolk")!;
  const done = completeStep(state, step.key, { targetIds: [picked] });
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.deepEqual(step.targetIds, [picked], "any player can be shown as a Minion");
  assert.equal(
    state.players["1"].used.lunaticTarget,
    undefined,
    "a first-night tip is not an attack",
  );
  assert.equal(state.deaths.length, 0);
  assert.equal(step.noteKey, "note.bmr.lunaticFirst", "the first-night note stays");
});

test("the Goon drinks its first chooser until dusk and takes their alignment (BMR-GOON-01)", () => {
  const state = make(
    {
      1: "po",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const sailor = state.night.queue.find((step) => step.roleId === "sailor")!;
  assert.equal(completeStep(state, sailor.key, { targetIds: ["4"], drunkId: "4" }).ok, true);
  const po = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(completeStep(state, po.key, { targetIds: ["2"] }).ok, true);

  const goon = state.players["2"];
  assert.equal(goon.team, "evil");
  const granted = state.effects.filter((effect) => effect.bmr === "goon");
  assert.equal(granted.length, 1);
  assert.equal(granted[0].targetId, "1");
  assert.equal(isImpaired(state, "1"), true);

  // A later chooser in the same night changes nothing.
  const chambermaid = state.night.queue.find((step) => step.roleId === "chambermaid")!;
  assert.equal(completeStep(state, chambermaid.key, { targetIds: ["2", "4"] }).ok, true);
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 1);
  assert.equal(goon.team, "evil");
  assert.equal(isImpaired(state, "3"), false);

  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(isImpaired(state, "1", { phase: "day" as const, number: 2 }), true);
  assert.equal(endDay(state).ok, true);
  assert.equal(isImpaired(state, "1"), false);
});

test("a drunk or poisoned Goon grants nothing", () => {
  for (const kind of ["drunk", "poison"]) {
    const state = make(
      {
        1: "po",
        2: "goon",
        3: "chambermaid",
        4: "pacifist",
        5: "professor",
        6: "gossip",
        7: "sailor",
        8: "mastermind",
      },
      { count: 8 },
    );
    startNight(state);
    skipRemaining(state);
    assert.equal(endNight(state).ok, true);
    assert.equal(endDay(state).ok, true);

    state.effects.push({
      id: "fixture-goon-" + kind,
      kind,
      sourceId: "7",
      targetId: "2",
      start: { phase: "night" as const, number: 2 },
      expires: null,
      active: true,
    });
    const po = state.night.queue.find((step) => step.roleId === "po")!;
    assert.equal(completeStep(state, po.key, { targetIds: ["2"] }).ok, true);
    assert.equal(state.players["2"].team, "good", kind);
    assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 0, kind);
    assert.equal(isImpaired(state, "1"), false, kind);
  }
});

test("a chooser who was already drunk still triggers the Goon", () => {
  const state = make(
    {
      1: "po",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  nightTwo(state);
  state.effects.push({
    id: "fixture-poison-chooser",
    kind: "poison",
    sourceId: "7",
    targetId: "1",
    start: { phase: "night" as const, number: 2 },
    expires: { phase: "night" as const, number: 3 },
    active: true,
  });
  const po = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(completeStep(state, po.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].team, "evil");
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 1);
  assert.equal(po.goonImpaired, true);
  assert.equal(isImpaired(state, "1"), true);
});

test("the Lunatic wears a Demon mask and the real Demon learns its choice", () => {
  const state = make(
    {
      1: "lunatic",
      2: "po",
      3: "chambermaid",
      4: "sailor",
      5: "pacifist",
      6: "professor",
      7: "gossip",
      8: "mastermind",
    },
    { count: 8, lunaticShownId: "po" },
  );
  assert.equal(state.setup.lunaticShownId, "po");
  assert.equal(state.players["1"].roleId, "lunatic");
  assert.equal(state.players["1"].shownRoleId, "po");
  assert.equal(state.players["1"].team, "good");

  startNight(state);
  const demonInfo = state.night.queue.find((step) => step.system === "demoninfo")!;
  assert.equal(infoForStep(state, demonInfo).lunaticId, "1");
  assert.equal(completeStep(state, demonInfo.key, {}).ok, true);
  assert.equal(demonInfo.given!.lunaticId, "1");
  const firstLunatic = state.night.queue.find((step) => step.roleId === "lunatic")!;
  assert.equal(completeStep(state, firstLunatic.key, { targetIds: ["3"] }).ok, true);
  assert.deepEqual(firstLunatic.targetIds, ["3"], "the first-night targets are the Minion tips");
  assert.equal(state.deaths.length, 0, "the Lunatic's choice kills no one");
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);

  const lunatic = state.night.queue.find((step) => step.roleId === "lunatic")!;
  const completed = completeStep(state, lunatic.key, { targetIds: ["5"] });
  assert.equal(completed.ok, true, JSON.stringify(completed));
  assert.equal(state.players["1"].used.lunaticTarget, "5");
  const po = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(po.infoKind, "note");
  const info = infoForStep(state, po);
  assert.equal(info.kind, "note");
  assert.match(info.text!, /P1/);
  assert.match(info.text!, /P5/);
});

test("a player executed on the Mastermind's extra day loses for their team", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "mastermind",
      4: "sailor",
      5: "gossip",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
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
  executeByDecision(state, "6");
  assert.equal(state.mastermind!.active, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.phase, "night");
  skipRemaining(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.day.number, 2);
  executeByDecision(state, "3");
  endDay(state);
  assert.equal(state.winner!.team, "good");
  assert.equal(state.winner!.reason, "mastermind");
});

test("the support table covers every requested role and never hides a manual fallback", () => {
  const roles = ["goon", "lunatic", "tinker", "pacifist", "mastermind", "chef"];
  const support = roleSupportEntries(roles);
  assert.deepEqual(
    support.map((entry) => [entry.roleId, entry.status]),
    [
      ["goon", "verified"],
      ["lunatic", "verified"],
      ["tinker", "host-choice"],
      ["pacifist", "host-choice"],
      ["mastermind", "verified"],
      ["chef", "host-choice"],
    ],
  );
  for (const entry of support) assert.match(entry.detail, /^roleSupport\./);
  const unknown = roleSupportEntries(["notarole"]);
  assert.deepEqual(
    unknown.map((entry) => [entry.roleId, entry.status]),
    [["notarole", "unsupported"]],
  );
});

test("a Pukka choosing the Goon completes without an effect cycle (BMR-PUKKA-01, BMR-PUKKA-02)", () => {
  const state = make(
    {
      1: "pukka",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  const pukka = skipUntil(state, (step) => step.roleId === "pukka");
  assert.ok(pukka);
  const result = applyCommand(state, {
    id: "goon-pukka",
    type: "completeNightStep",
    payload: { key: pukka.key, targetIds: ["2"] },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].team, "evil");
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 1);
  assert.equal(state.night.queue.find((step) => step.key === pukka.key)!.goonImpaired, true);
  assert.equal(isImpaired(state, "2"), false, "the Pukka's poison did not land");
});

// Goon r2977: "The Goon still changes alignment, and makes the player drunk, if
// the player choosing the Goon was already drunk or poisoned." Pukka r3074: "If
// the Pukka was sober when they chose a player the previous night, but is drunk
// at night, that player does not die. But when the Pukka sobers up, the poison
// resumes." Night 1 the Pukka poisons the Chambermaid (3), night 2 itself, and
// night 3 it chooses the sober, healthy Goon (2).
function selfPoisonedPukkaMeetsGoon(): { state: GameState; step: NightStep } {
  const state = make(
    {
      1: "pukka",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  for (const targetId of ["3", "1"]) {
    const pukka = skipUntil(state, (step) => step.roleId === "pukka")!;
    assert.equal(completeStep(state, pukka.key, { targetIds: [targetId] }).ok, true);
    skipRemaining(state);
    endNightToNext(state);
  }
  assert.equal(state.night.number, 3);
  assert.equal(isImpaired(state, "1"), true, "the Pukka is poisoned by its own poison");
  assert.equal(isImpaired(state, "2"), false, "the Goon is sober and healthy");
  const step = skipUntil(state, (candidate) => candidate.roleId === "pukka")!;
  return { state, step };
}

test("a Pukka poisoned by its own poison can choose a sober Goon: it is drunk until dusk and the Goon turns evil (BMR-GOON-01, BMR-PUKKA-07)", () => {
  const { state, step } = selfPoisonedPukkaMeetsGoon();
  const deaths = state.deaths.length;
  const command = {
    id: "pukka-goon-self-poisoned",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: ["2"] },
  };
  const before = canonicalState(state);
  const preview = previewCommand(state, command) as CommandView;
  assert.equal(preview.status, "allowed", JSON.stringify(preview));
  assert.deepEqual(canonicalState(state), before, "preview must not mutate");

  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "allowed", JSON.stringify(applied));

  assert.equal(state.players["2"].team, "evil", "the Goon takes the Pukka's alignment");
  const granted = state.effects.filter((effect) => effect.bmr === "goon");
  assert.deepEqual(
    granted.map((effect) => [effect.kind, effect.sourceId, effect.targetId, effect.expires]),
    [["drunk", "1", "1", { phase: "night", number: 4 }]],
    "the Pukka is drunk until dusk",
  );
  const done = state.night.queue.find((candidate) => candidate.key === step.key)!;
  assert.equal(done.done, true);
  assert.equal(done.goonImpaired, true);
  assert.equal(done.goonImpairedOnly, false, "the Pukka was already poisoned");
  assert.equal(isImpaired(state, "1"), true);
  assert.equal(isImpaired(state, "2"), false, "a drunk Pukka poisons nobody");
  assert.equal(state.deaths.length, deaths, "nobody dies");
  assert.equal(state.players["3"].alive, true);

  // While the Pukka is drunk its own poison is suspended; at dusk it resumes.
  const selfPoison = state.effects.find(
    (effect) =>
      effect.kind === "poison" &&
      effect.pukka === true &&
      effect.sourceId === "1" &&
      effect.targetId === "1",
  )!;
  assert.equal(effectActive(state, selfPoison), false);
  assert.equal(effectActive(state, granted[0]!), true);
  const dusk = { phase: "night", number: 4 } as const;
  assert.equal(effectActive(state, selfPoison, dusk), true);
  assert.equal(effectActive(state, granted[0]!, dusk), false);
  assert.equal(isImpaired(state, "1", dusk), true);

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(state));
});

test("a Sailor choosing the Goon completes without an effect cycle (BMR-SAILOR-02)", () => {
  const state = make(
    {
      1: "sailor",
      2: "goon",
      3: "pukka",
      4: "chambermaid",
      5: "pacifist",
      6: "professor",
      7: "gossip",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  const sailor = skipUntil(state, (step) => step.roleId === "sailor");
  assert.ok(sailor);
  const result = applyCommand(state, {
    id: "goon-sailor",
    type: "completeNightStep",
    payload: { key: sailor.key, targetIds: ["2"], drunkId: "2" },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].team, "good");
  assert.equal(isImpaired(state, "1"), true, "the Sailor is drunk");
  assert.equal(isImpaired(state, "2"), false, "the Sailor's own drunk is inactive");
});

test("an Innkeeper choosing the Goon completes without an effect cycle", () => {
  const state = make(
    {
      1: "innkeeper",
      2: "goon",
      3: "pukka",
      4: "chambermaid",
      5: "pacifist",
      6: "professor",
      7: "gossip",
      8: "mastermind",
    },
    { count: 8 },
  );
  nightTwo(state);
  const innkeeper = skipUntil(state, (step) => step.roleId === "innkeeper");
  assert.ok(innkeeper);
  const result = applyCommand(state, {
    id: "goon-innkeeper",
    type: "completeNightStep",
    payload: { key: innkeeper.key, targetIds: ["2", "4"], drunkId: "2" },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.players["2"].team, "good");
  assert.equal(isImpaired(state, "1"), true, "the Innkeeper is drunk");
  assert.equal(isImpaired(state, "2"), false, "the Innkeeper's own drunk is inactive");
});

test("a Chambermaid choosing the Goon gets false information (BMR-CHAMBERMAID-04)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "goon",
      3: "pukka",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  const chambermaid = skipUntil(state, (step) => step.roleId === "chambermaid");
  assert.ok(chambermaid);
  const preview = infoForStep(state, chambermaid, { targetIds: ["2", "4"] });
  assert.equal(preview.needsChoice, true);
  const pending: Record<string, unknown> = completeStep(state, chambermaid.key, {
    targetIds: ["2", "4"],
  });
  assert.equal(pending.ok, false);
  assert.equal(pending.needsChoice, true);
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 0);
  const given = { kind: "number", value: 2 };
  assert.equal(completeStep(state, chambermaid.key, { targetIds: ["2", "4"], given }).ok, true);
  assert.equal(chambermaid.goonImpaired, true);
  assert.equal(isImpaired(state, "1"), true);
  assert.deepEqual(chambermaid.given, given);
});

test("a Shabaloth choosing the Goon records no deaths", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "goon",
      3: "mastermind",
      4: "chambermaid",
      5: "courtier",
      6: "sailor",
      7: "gossip",
      8: "professor",
    },
    { count: 8 },
  );
  nightTwo(state);
  const shabaloth = skipUntil(state, (step) => step.roleId === "shabaloth");
  assert.ok(shabaloth);
  assert.equal(completeStep(state, shabaloth.key, { targetIds: ["2", "4"] }).ok, true);
  assert.equal(shabaloth.goonImpaired, true);
  const before = state.deaths.length;
  const outcome = recordBmrOutcome(state, shabaloth.key, { deathIds: ["2", "4"] });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.errorCode, "error.52");
  assert.equal(state.deaths.length, before);
});

test("the Lunatic's simulated choice does not trigger the Goon", () => {
  const state = make(
    {
      1: "lunatic",
      2: "goon",
      3: "po",
      4: "chambermaid",
      5: "sailor",
      6: "pacifist",
      7: "professor",
      8: "mastermind",
      9: "gossip",
    },
    { count: 9, lunaticShownId: "po" },
  );
  nightTwo(state);
  const lunatic = state.night.queue.find((step) => step.roleId === "lunatic")!;
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 0);
  assert.equal(state.players["2"].team, "good");
});

test("the Grandmother's chosen grandchild does not trigger the Goon", () => {
  const state = make(
    {
      1: "grandmother",
      2: "goon",
      3: "po",
      4: "chambermaid",
      5: "sailor",
      6: "pacifist",
      7: "professor",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  const grandmother = skipUntil(state, (step) => step.roleId === "grandmother");
  assert.ok(grandmother);
  assert.equal(completeStep(state, grandmother.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.setup.grandmotherId, "2");
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 0);
  assert.equal(state.players["2"].team, "good");
});

test("the Assassin kills the Goon and the Goon still turns evil (BMR-ASSASSIN-01)", () => {
  const state = make(
    {
      1: "assassin",
      2: "goon",
      3: "po",
      4: "chambermaid",
      5: "sailor",
      6: "pacifist",
      7: "professor",
      8: "gossip",
    },
    { count: 8 },
  );
  nightTwo(state);
  const assassin = skipUntil(state, (step) => step.roleId === "assassin");
  assert.ok(assassin);
  assert.equal(completeStep(state, assassin.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].team, "evil");
  assert.equal(state.players["2"].alive, false);
  assert.ok(state.deaths.some((death) => death.playerId === "2"));
  assert.equal(assassin.goonImpaired, true);
  assert.equal(assassin.goonImpairedOnly, true);
  // The host may still record the outcome for the Assassin step.
  assert.equal(recordBmrOutcome(state, assassin.key, { deathIds: ["2"] }).ok, true);
});

test("the Moonchild's stored choice still kills the Goon", () => {
  const state = make(
    {
      1: "moonchild",
      2: "goon",
      3: "po",
      4: "chambermaid",
      5: "sailor",
      6: "pacifist",
      7: "professor",
      8: "gossip",
      9: "mastermind",
    },
    { count: 9 },
  );
  state.players["1"].alive = false;
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
  assert.equal(moonchildChoice(state, "2").ok, true);
  assert.equal(endDay(state).ok, true);
  const moonchild = state.night.queue.find((step) => step.roleId === "moonchild")!;
  assert.ok(moonchild);
  assert.equal(completeStep(state, moonchild.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, false);
  assert.ok(state.deaths.some((death) => death.playerId === "2"));
  assert.equal(moonchild.goonImpaired, undefined);
});

// ---------------------------------------------------------------------------
// Issue #171 section 2 (Bad Moon Rising audit). One test per finding. The
// findings that live in another module are listed in the change report.
// ---------------------------------------------------------------------------

// An impairment that starts on the given night and ends on the next one.
function impair(
  state: GameState,
  kind: "drunk" | "poison",
  targetId: string,
  night: number,
  sourceId?: string,
) {
  state.effects.push({
    id: "audit-" + kind + "-" + targetId + "-" + night,
    kind,
    sourceId:
      sourceId || state.order.find((id) => id !== targetId && state.players[id].roleId !== "goon")!,
    targetId,
    start: { phase: "night" as const, number: night },
    expires: { phase: "night" as const, number: night + 1 },
    active: true,
  });
}

function deadToday(state: GameState, playerId: string) {
  state.players[playerId].alive = false;
  state.deaths.push({
    id: "fixture-day-death-" + playerId,
    playerId,
    roleId: state.players[playerId].roleId || "",
    cause: "execution",
    phase: "day",
    number: 1,
    at: "2026-01-01T00:00:00.000Z",
  });
}

test("the Godfather learns the Outsider characters in play, not their seats (BMR5)", () => {
  const state = make(
    {
      1: "godfather",
      2: "chambermaid",
      3: "sailor",
      4: "moonchild",
      5: "tinker",
      6: "po",
    },
    { count: 8 },
  );
  startNight(state);
  const step = state.night.queue.find((candidate) => candidate.roleId === "godfather")!;
  const info = bmrInfoForStep(state, step, {});
  assert.equal(info.kind, "note");
  const text = String(info.text);
  for (const id of state.order) {
    assert.equal(text.includes("P" + id), false, "no seat names: " + text);
  }
  const characters = new Set(
    state.order
      .filter((id) => roleTeam(state.players[id].roleId || "") === "outsider")
      .map((id) => roleLabel(state.players[id].roleId!)),
  );
  assert.ok(characters.size > 0);
  for (const name of characters) {
    assert.ok(text.includes(name), "character token " + name + ": " + text);
  }
  assert.equal(step.noteKey, "note.bmr.godfatherOutsiders");
});

test("a drunk or poisoned Demon records no host-marked deaths (BMR6)", () => {
  const state = make(
    {
      1: "po",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  nextNight(state);
  impair(state, "poison", "1", 2);
  const po = state.night.queue.find((candidate) => candidate.roleId === "po")!;
  assert.equal(completeStep(state, po.key, { targetIds: ["3"] }).ok, true);
  const outcome = recordBmrOutcome(state, po.key, { deathIds: ["3"] });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.errorCode, "error.52");
  assert.equal(state.players["3"].alive, true, "the impaired Demon kills nobody");
});

test("a host-marked death must match the chosen targets and the Demon's maximum (BMR7)", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "gossip",
      6: "devilsadvocate",
      7: "fool",
    },
    { count: 8 },
  );
  nextNight(state);
  const shabaloth = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  assert.equal(completeStep(state, shabaloth.key, { targetIds: ["2", "4"] }).ok, true);
  const extra = recordBmrOutcome(state, shabaloth.key, { deathIds: ["2", "4", "5"] });
  assert.equal(extra.ok, false);
  assert.equal(extra.errorCode, "error.51");
  assert.equal(state.players["5"].alive, true, "a third Shabaloth death is rejected");
  assert.equal(state.players["2"].alive, true);
  assert.equal(state.players["4"].alive, true);
  const chosen = recordBmrOutcome(state, shabaloth.key, { deathIds: ["2", "4"] });
  assert.equal(chosen.ok, true);
  assert.equal(state.players["2"].alive, false);
  assert.equal(state.players["4"].alive, false);
});

test("the Goon's trigger keeps the deaths chosen before it and stops the rest (BMR8)", () => {
  const state = make(
    {
      1: "po",
      2: "goon",
      3: "chambermaid",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  nextNight(state);
  const first = state.night.queue.find((candidate) => candidate.roleId === "po")!;
  assert.equal(completeStep(state, first.key, { targetIds: [] }).ok, true);
  nextNight(state);
  const po = state.night.queue.find((candidate) => candidate.roleId === "po")!;
  assert.equal(completeStep(state, po.key, { targetIds: ["4", "2", "5"] }).ok, true);
  assert.equal(po.goonImpaired, true);
  const blocked = recordBmrOutcome(state, po.key, { deathIds: ["4", "5"] });
  assert.equal(blocked.ok, false, "the target after the Goon does not die");
  assert.equal(blocked.errorCode, "error.52");
  assert.equal(state.players["5"].alive, true);
  const before = recordBmrOutcome(state, po.key, { deathIds: ["4"] });
  assert.equal(before.ok, true, "the target chosen before the Goon still dies");
  assert.equal(state.players["4"].alive, false);
});

test("the Moonchild's public choice is not a night Goon choice (BMR9)", () => {
  const state = make(
    {
      1: "moonchild",
      2: "goon",
      3: "po",
      4: "chambermaid",
      5: "sailor",
      6: "pacifist",
      7: "professor",
      8: "gossip",
      9: "mastermind",
    },
    { count: 9 },
  );
  state.players["1"].alive = false;
  state.players["2"].team = "evil";
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
  assert.equal(moonchildChoice(state, "2").ok, true);
  assert.equal(endDay(state).ok, true);
  const moonchild = state.night.queue.find((step) => step.roleId === "moonchild")!;
  assert.equal(completeStep(state, moonchild.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.effects.filter((effect) => effect.bmr === "goon").length, 0);
  assert.equal(state.players["2"].team, "evil", "the Goon's alignment does not decide the kill");
  assert.equal(state.players["2"].alive, true, "an evil Goon is not killed");
});

test("a resurrected player regains a used once-per-game ability (BMR10)", () => {
  const state = make(
    {
      1: "professor",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "po",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  state.players["3"].alive = false;
  state.players["3"].used = { courtier: true };
  nextNight(state);
  const professor = state.night.queue.find((candidate) => candidate.roleId === "professor")!;
  assert.equal(completeStep(state, professor.key, { targetIds: ["3"] }).ok, true);
  const outcome = recordBmrOutcome(state, professor.key, { resurrectId: "3" });
  assert.equal(outcome.ok, true);
  assert.equal(state.players["3"].alive, true);
  assert.equal(state.players["3"].used.courtier, undefined, "the once-per-game ability is back");
});

test("a regurgitated player wakes later in the same night (BMR10)", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "chambermaid",
      3: "sailor",
      4: "assassin",
      5: "courtier",
      6: "gossip",
      7: "fool",
    },
    { count: 8 },
  );
  nextNight(state);
  const first = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2", "4"] }).ok, true);
  assert.equal(recordBmrOutcome(state, first.key, { deathIds: ["4"] }).ok, true);
  assert.equal(state.players["4"].alive, false);
  nextNight(state);
  const shabaloth = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  assert.equal(completeStep(state, shabaloth.key, { targetIds: ["2", "3"] }).ok, true);
  const outcome = recordBmrOutcome(state, shabaloth.key, { resurrectId: "4" });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  const assassin = state.night.queue.find((candidate) => candidate.roleId === "assassin");
  assert.ok(assassin, "the Assassin's step is restored because it comes later tonight");
  assert.equal(assassin.actorId, "4");
  assert.equal(assassin.done, false);
});

test("a regurgitated start-knowing player wakes to use the ability again (BMR10)", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "grandmother",
      3: "sailor",
      4: "courtier",
      5: "gossip",
      6: "fool",
      7: "tinker",
      8: "mastermind",
    },
    { count: 8 },
  );
  state.players["2"].alive = false;
  nextNight(state);
  const shabaloth = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  const first = completeStep(state, shabaloth.key, { targetIds: ["2", "3"] });
  assert.equal(first.ok, true, JSON.stringify(first));
  nextNight(state);
  const second = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  assert.equal(completeStep(state, second.key, { targetIds: ["4", "5"] }).ok, true);
  const outcome = recordBmrOutcome(state, second.key, { resurrectId: "2" });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  const grandmother = state.night.queue.find(
    (candidate) => candidate.roleId === "grandmother" && candidate.infoKind === "character",
  );
  assert.ok(grandmother, "the Grandmother's start-knowing step is restored");
  assert.equal(grandmother.actorId, "2");
});

test("the Shabaloth regurgitates before its new kills, so protection is active (BMR11)", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "chambermaid",
      3: "tealady",
      4: "pacifist",
      5: "professor",
      6: "gossip",
      7: "tinker",
      8: "mastermind",
    },
    { count: 8 },
  );
  nextNight(state);
  const first = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["3", "5"] }).ok, true);
  assert.equal(recordBmrOutcome(state, first.key, { deathIds: ["3"] }).ok, true);
  assert.equal(state.players["3"].alive, false);
  nextNight(state);
  const shabaloth = state.night.queue.find((candidate) => candidate.roleId === "shabaloth")!;
  assert.equal(completeStep(state, shabaloth.key, { targetIds: ["2", "4"] }).ok, true);
  const outcome = recordBmrOutcome(state, shabaloth.key, {
    deathIds: ["2", "4"],
    resurrectId: "3",
  });
  assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(state.players["3"].alive, true, "the Tea Lady is regurgitated first");
  assert.equal(state.players["2"].alive, true, "the resurrected Tea Lady protects her neighbour");
  assert.equal(state.players["4"].alive, true);
});

test("a drunk or poisoned Courtier's character choice does nothing (BMR14)", () => {
  const state = make(
    {
      1: "courtier",
      2: "chambermaid",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  impair(state, "poison", "1", 1);
  const courtier = state.night.queue.find((step) => step.roleId === "courtier")!;
  assert.equal(completeStep(state, courtier.key, { roleId: "fool" }).ok, true);
  assert.equal(isImpaired(state, "7", { phase: "night" as const, number: 1 }), false);
  assert.equal(isImpaired(state, "7", { phase: "day" as const, number: 2 }), false);
});

test("the Courtier's once-per-game is spent only after choosing a character (BMR15)", () => {
  const state = make(
    {
      1: "courtier",
      2: "chambermaid",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const courtier = state.night.queue.find((step) => step.roleId === "courtier")!;
  assert.equal(completeStep(state, courtier.key, {}).ok, true);
  assert.equal(state.players["1"].used.courtier, undefined, "no character chosen, no cost");
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.ok(
    state.night.queue.some((step) => step.roleId === "courtier"),
    "the Courtier may still use the ability",
  );
});

test("an impaired Exorcist still records a target for the different-to-last-night rule (BMR16)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "exorcist",
      5: "devilsadvocate",
      6: "po",
      7: "grandmother",
    },
    { count: 9 },
  );
  nextNight(state);
  impair(state, "poison", "4", 2);
  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.equal(completeStep(state, exorcist.key, { targetIds: ["3"] }).ok, true);
  assert.equal(state.players["4"].used.exorcistTarget, "3");
  assert.equal(state.players["4"].used.exorcistTargetNight, 2);
  const demon = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(demon.done || demon.skipped, false, "an impaired Exorcist does not block");
});

test("the Chambermaid counts only characters who woke due to their ability (BMR-CHAMBERMAID-01)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "gossip",
      3: "innkeeper",
      4: "sailor",
      5: "courtier",
      6: "po",
      7: "tinker",
      8: "mastermind",
    },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  state.gossip = { day: 1, truth: true };
  assert.equal(endDay(state).ok, true);
  const gossip = state.night.queue.find((step) => step.roleId === "gossip")!;
  assert.equal(completeStep(state, gossip.key, { targetIds: ["4"] }).ok, true);
  const innkeeper = state.night.queue.find((step) => step.roleId === "innkeeper")!;
  assert.equal(
    completeStep(state, innkeeper.key, { targetIds: ["4", "5"], drunkId: "4" }).ok,
    true,
  );
  const chambermaid = state.night.queue.find((step) => step.roleId === "chambermaid")!;
  const info = bmrInfoForStep(state, chambermaid, { targetIds: ["2", "3"] });
  assert.equal(info.kind, "number");
  assert.equal(info.value, 1, "the Innkeeper woke; the Gossip does not wake");
});

test("a Demon blocked by the Exorcist is not counted as having woken (BMR-CHAMBERMAID-01)", () => {
  const state = make({ 1: "chambermaid", 2: "exorcist", 8: "shabaloth" }, { count: 8 });
  startNight(state);
  nextNight(state);
  const shabaloth = state.night.queue.find((step) => step.roleId === "shabaloth");
  assert.ok(shabaloth, "the Shabaloth wakes on a later night");
  assert.ok(shabaloth.actorId);
  shabaloth.done = true;
  shabaloth.blocked = true;
  const chambermaid = state.night.queue.find((step) => step.roleId === "chambermaid");
  assert.ok(chambermaid, "the Chambermaid wakes");
  const info = bmrInfoForStep(state, chambermaid, { targetIds: [shabaloth.actorId] });
  assert.equal(info.kind, "number");
  assert.equal(info.value, 0, "the blocked Demon did not wake to use its ability");
});

test("the Chambermaid does not wake with fewer than two other living players (BMR-CHAMBERMAID-02)", () => {
  const state = make({ 1: "chambermaid", 6: "po" }, { count: 8 });
  for (const id of ["2", "3", "4", "5", "7", "8"]) state.players[id].alive = false;
  startNight(state);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "chambermaid"),
    false,
    "one living neighbour is not enough",
  );

  const wide = make({ 1: "chambermaid", 6: "po" }, { count: 8 });
  startNight(wide);
  assert.ok(wide.night.queue.some((step) => step.roleId === "chambermaid"));
});

test("BMR target restrictions reject dead, self and evil targets (BMR-CHAMBERMAID-03)", () => {
  const state = make(
    {
      1: "sailor",
      2: "chambermaid",
      3: "devilsadvocate",
      4: "grandmother",
      5: "godfather",
      6: "po",
      7: "fool",
    },
    { count: 10 },
  );
  startNight(state);
  state.players["7"].alive = false;
  const sailor = state.night.queue.find((step) => step.roleId === "sailor")!;
  assert.match(String(bmrTargetError(state, sailor, ["7"])), /жив/i);
  assert.equal(bmrTargetError(state, sailor, ["2"]), null);

  const chambermaid = state.night.queue.find((step) => step.roleId === "chambermaid")!;
  assert.match(String(bmrTargetError(state, chambermaid, ["2", "3"])), /себя/i);
  assert.match(String(bmrTargetError(state, chambermaid, ["3", "7"])), /жив/i);
  assert.equal(bmrTargetError(state, chambermaid, ["3", "4"]), null);

  const advocate = state.night.queue.find((step) => step.roleId === "devilsadvocate")!;
  assert.match(String(bmrTargetError(state, advocate, ["7"])), /жив/i);

  const grandmother = state.night.queue.find((step) => step.roleId === "grandmother")!;
  assert.match(String(bmrTargetError(state, grandmother, ["6"])), /добр/i);
  assert.equal(bmrTargetError(state, grandmother, ["2"]), null);

  const godfather = state.night.queue.find((step) => step.roleId === "godfather")!;
  assert.equal(
    bmrTargetError(state, godfather, ["7"]),
    null,
    "Godfather r2394: they point at any player, including a dead one",
  );
});

test("a drunk or poisoned Grandmother survives the grandchild's death (BMR20)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "grandmother",
      5: "devilsadvocate",
      6: "po",
      7: "fool",
    },
    { count: 9 },
  );
  startNight(state);
  const grandmother = state.night.queue.find((step) => step.roleId === "grandmother")!;
  assert.equal(completeStep(state, grandmother.key, { targetIds: ["1"] }).ok, true);
  nextNight(state);
  // The source must outlive the grandchild; the generic helper would pick "1".
  impair(state, "drunk", "4", 2, "3");
  const po = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(completeStep(state, po.key, { targetIds: ["1"] }).ok, true);
  assert.equal(recordBmrOutcome(state, po.key, { deathIds: ["1"] }).ok, true);
  assert.equal(
    state.night.queue.some((step) => step.noteKey === "note.bmr.grandmotherDeath"),
    false,
    "the impaired Grandmother has no death step",
  );
  assert.equal(state.players["4"].alive, true);
});

test("an impaired Sailor or Innkeeper makes nobody drunk or protected (BMR-SAILOR-01, BMR-INNKEEPER-01)", () => {
  const sailorState = make(
    { 1: "sailor", 2: "chambermaid", 3: "gossip", 4: "fool", 5: "po" },
    { count: 8 },
  );
  startNight(sailorState);
  sailorState.effects.push({
    id: "poison-sailor",
    kind: "poison",
    sourceId: "2",
    targetId: "1",
    start: { phase: "night", number: 1 },
    expires: null,
    active: true,
  });
  const sailor = sailorState.night.queue.find((step) => step.roleId === "sailor")!;
  assert.equal(completeStep(sailorState, sailor.key, { targetIds: ["3"], drunkId: "3" }).ok, true);
  // States r1039: a failed ability stays wasted even after the source recovers.
  sailorState.effects.find((effect) => effect.id === "poison-sailor")!.active = false;
  assert.equal(
    isImpaired(sailorState, "3", { phase: "night", number: 1 }),
    false,
    "a failed Sailor ability does not wake up when the Sailor recovers",
  );

  const innState = make(
    { 1: "innkeeper", 2: "chambermaid", 3: "gossip", 4: "fool", 5: "devilsadvocate", 6: "po" },
    { count: 8 },
  );
  startNight(innState);
  nextNight(innState);
  innState.effects.push({
    id: "poison-innkeeper",
    kind: "poison",
    sourceId: "2",
    targetId: "1",
    start: { phase: "night", number: 2 },
    expires: null,
    active: true,
  });
  const innkeeper = innState.night.queue.find((step) => step.roleId === "innkeeper")!;
  assert.equal(
    completeStep(innState, innkeeper.key, { targetIds: ["2", "3"], drunkId: "2" }).ok,
    true,
  );
  innState.effects.find((effect) => effect.id === "poison-innkeeper")!.active = false;
  const protectedEffects = innState.effects.filter(
    (effect) => effect.kind === "protected" && effect.sourceId === "1",
  );
  assert.equal(
    protectedEffects.some((effect) =>
      effectActive(innState, effect, { phase: "night", number: 2 }),
    ),
    false,
    "a failed Innkeeper ability does not protect when the Innkeeper recovers",
  );
  assert.equal(
    isImpaired(innState, "2", { phase: "night", number: 2 }),
    false,
    "a failed Innkeeper ability does not make anyone drunk later",
  );
});

test("a functioning Sailor or Innkeeper requires the host's drunk choice (BMR23)", () => {
  const state = make(
    { 1: "sailor", 2: "chambermaid", 3: "gossip", 4: "fool", 5: "po" },
    { count: 8 },
  );
  startNight(state);
  const sailor = state.night.queue.find((step) => step.roleId === "sailor")!;
  const missing = completeStep(state, sailor.key, { targetIds: ["2"] });
  assert.equal(missing.ok, false, "the Sailor must name who is drunk");
  assert.equal("errorCode" in missing ? missing.errorCode : null, "error.drunk-required");
  const illegal = completeStep(state, sailor.key, { targetIds: ["2"], drunkId: "3" });
  assert.equal(illegal.ok, false, "a player outside the choice cannot become drunk");
  assert.equal("errorCode" in illegal ? illegal.errorCode : null, "error.drunk-recipient");
  assert.equal(completeStep(state, sailor.key, { targetIds: ["2"], drunkId: "2" }).ok, true);
  assert.equal(
    isImpaired(state, "2", { phase: "night" as const, number: 1 }),
    true,
    "the chosen target is drunk",
  );
  assert.equal(isImpaired(state, "1", { phase: "night" as const, number: 1 }), false);

  const inn = make(
    { 1: "innkeeper", 2: "chambermaid", 3: "gossip", 4: "fool", 5: "devilsadvocate", 6: "po" },
    { count: 8 },
  );
  startNight(inn);
  finishNight(inn);
  assert.equal(endNight(inn).ok, true);
  assert.equal(endDay(inn).ok, true);
  const innkeeper = inn.night.queue.find((step) => step.roleId === "innkeeper")!;
  const missingInn = completeStep(inn, innkeeper.key, { targetIds: ["2", "3"] });
  assert.equal(missingInn.ok, false, "the Innkeeper must name who is drunk");
  assert.equal("errorCode" in missingInn ? missingInn.errorCode : null, "error.drunk-required");
  assert.equal(completeStep(inn, innkeeper.key, { targetIds: ["2", "3"], drunkId: "3" }).ok, true);
  assert.equal(isImpaired(inn, "3", { phase: "night" as const, number: 2 }), true);
  assert.equal(isImpaired(inn, "2", { phase: "night" as const, number: 2 }), false);
});

test("the Gossip's Storyteller-chosen death does not trigger the Goon (BMR24)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "goon",
      3: "gossip",
      4: "sailor",
      5: "courtier",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  state.gossip = { day: 1, truth: true };
  assert.equal(endDay(state).ok, true);
  const gossip = state.night.queue.find((step) => step.roleId === "gossip")!;
  assert.equal(completeStep(state, gossip.key, { targetIds: ["2"] }).ok, true);
  assert.equal(
    state.effects.filter(
      (effect) => effect.bmr === "goon" && Number(effect.start && effect.start.number) === 2,
    ).length,
    0,
    "the Storyteller chose the dying player, not the Gossip",
  );
  assert.equal(state.players["2"].team, "good");
});

test("the Courtier choosing the Goon character triggers the Goon (BMR25)", () => {
  const state = make(
    {
      1: "courtier",
      2: "goon",
      3: "chambermaid",
      4: "sailor",
      5: "gossip",
      6: "po",
      7: "fool",
    },
    { count: 8 },
  );
  startNight(state);
  const courtier = state.night.queue.find((step) => step.roleId === "courtier")!;
  assert.equal(completeStep(state, courtier.key, { roleId: "goon" }).ok, true);
  assert.equal(state.players["2"].team, "good", "the Goon takes the Courtier's alignment");
  assert.equal(isImpaired(state, "1", { phase: "night" as const, number: 1 }), true);
  assert.equal(
    isImpaired(state, "2", { phase: "night" as const, number: 2 }),
    false,
    "the Courtier's three-night drunk does not land on the Goon",
  );
});

test("an Exorcist blocking the Shabaloth still lets it regurgitate (BMR26)", () => {
  const state = make(
    {
      1: "exorcist",
      2: "chambermaid",
      3: "sailor",
      4: "courtier",
      5: "gossip",
      6: "shabaloth",
      7: "tinker",
      8: "mastermind",
    },
    { count: 8 },
  );
  nextNight(state);
  const first = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.equal(completeStep(state, first.key, { targetIds: ["2", "4"] }).ok, true);
  assert.equal(recordBmrOutcome(state, first.key, { deathIds: ["2"] }).ok, true);
  nextNight(state);
  const exorcist = state.night.queue.find((step) => step.roleId === "exorcist")!;
  assert.equal(completeStep(state, exorcist.key, { targetIds: ["6"] }).ok, true);
  const blocked = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.ok(blocked);
  assert.equal(blocked.skipped, false, "the regurgitation stays available");
  assert.equal(blocked.canKill, false, "the blocked Demon kills nobody");
  assert.equal(blocked.canResurrect, true);
  assert.equal(blocked.noteKey, "note.exorcistBlocked");
  const kill = recordBmrOutcome(state, blocked.key, { deathIds: ["3"] });
  assert.equal(kill.ok, false, "a blocked Demon records no death");
  const resurrect = recordBmrOutcome(state, blocked.key, { resurrectId: "2" });
  assert.equal(resurrect.ok, true, JSON.stringify(resurrect));
  assert.equal(state.players["2"].alive, true);
});

test("the Lunatic attacks as the Demon mask, with its target mode (BMR27)", () => {
  const roster = {
    1: "lunatic",
    2: "po",
    3: "chambermaid",
    4: "courtier",
    5: "exorcist",
    6: "gambler",
    7: "sailor",
    8: "mastermind",
  } as const;
  const shabaloth = make(roster, { count: 8, lunaticShownId: "shabaloth" });
  nextNight(shabaloth);
  const two = shabaloth.night.queue.find((step) => step.roleId === "lunatic")!;
  assert.equal(two.minTargets, 2);
  assert.equal(two.maxTargets, 2);
  assert.equal(completeStep(shabaloth, two.key, { targetIds: ["3", "4"] }).ok, true);

  const po = make(roster, { count: 8, lunaticShownId: "po" });
  startNight(po);
  const firstNote = po.night.queue.find((step) => step.roleId === "lunatic")!;
  assert.equal(firstNote.noteKey, "note.bmr.lunaticFirst");
  assert.equal(typeof firstNote.noteVars!.bluffs, "string");
  assert.equal(typeof firstNote.noteVars!.minions, "number");
  nextNight(po);
  const one = po.night.queue.find((step) => step.roleId === "lunatic")!;
  assert.equal(one.maxTargets, 1);
  assert.equal(completeStep(po, one.key, { targetIds: [] }).ok, true);
  nextNight(po);
  const three = po.night.queue.find((step) => step.roleId === "lunatic");
  assert.ok(three, "queue: " + JSON.stringify(po.night.queue.map((step) => step.roleId)));
  assert.equal(three.minTargets, 3);
  assert.equal(three.maxTargets, 3);
});

test("a Lunatic shown the Shabaloth brings no one back on their step (BMR-SHABALOTH-01)", () => {
  // Shabaloth r1790: "A dead player you chose last night might be
  // regurgitated." The Lunatic only believes they are the Shabaloth: their step
  // targets as the Shabaloth does but has no ability, so it regurgitates no
  // one, while the real Po's kill stands.
  const state = make(
    {
      1: "lunatic",
      2: "po",
      3: "chambermaid",
      4: "courtier",
      5: "exorcist",
      6: "gambler",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8, lunaticShownId: "shabaloth" },
  );
  nextNight(state);
  const lunatic = state.night.queue.find((step) => step.roleId === "lunatic")!;
  const po = state.night.queue.find((step) => step.roleId === "po")!;
  assert.equal(lunatic.canResurrect, false);
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3", "4"] }).ok, true);
  assert.equal(completeStep(state, po.key, { targetIds: ["3"] }).ok, true);
  assert.equal(recordBmrOutcome(state, po.key, { deathIds: ["3"] }).ok, true);
  assert.equal(state.players["3"].alive, false, "the Po killed the Chambermaid");
  const regurgitated = recordBmrOutcome(state, lunatic.key, { resurrectId: "3" });
  assert.equal(regurgitated.ok, false, JSON.stringify(regurgitated));
  assert.equal(regurgitated.errorCode, "error.51");
  assert.equal(state.players["3"].alive, false, "the Chambermaid stays dead");
});

test("the Demon learns the Lunatic's choice even when it does not wake (BMR28)", () => {
  // The Lunatic believes they are the Po while the real Demon is a Zombuul:
  // the Zombuul does not wake after a death today, the Lunatic does.
  const state = make({ 1: "lunatic", 5: "zombuul" }, { count: 8, lunaticShownId: "po" });
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  deadToday(state, "7");
  assert.equal(endDay(state).ok, true);
  assert.equal(
    state.night.queue.some((step) => step.roleId === "zombuul"),
    false,
    "the Zombuul does not wake after a death today",
  );
  const lunatic = state.night.queue.find((step) => step.roleId === "lunatic")!;
  assert.equal(completeStep(state, lunatic.key, { targetIds: ["3"] }).ok, true);
  assert.equal(lunatic.noteKey, "note.bmr.lunaticReport");
  assert.deepEqual(lunatic.noteVars, { name: "P1", target: "P3" });
});

test("the Shabaloth keeps its chosen targets even when nobody dies (BMR29)", () => {
  const state = make(
    {
      1: "shabaloth",
      2: "fool",
      3: "sailor",
      4: "courtier",
      5: "gossip",
      6: "devilsadvocate",
      7: "chambermaid",
    },
    { count: 8 },
  );
  nextNight(state);
  const second = state.night.queue.find((step) => step.roleId === "shabaloth")!;
  assert.equal(completeStep(state, second.key, { targetIds: ["2", "4"] }).ok, true);
  assert.deepEqual(state.players["1"].used.shabalothTargets, ["2", "4"]);
  assert.equal(state.players["1"].used.shabalothTargetsNight, 2);
});

test("the first night introduces Minions before the Lunatic and the Demon after it (BMR-O1)", () => {
  const state = make({ 1: "lunatic", 5: "po", 6: "mastermind" }, { count: 8 });
  startNight(state);
  const queue = state.night.queue;
  const minions = queue.findIndex((step) => step.system === "minioninfo");
  const lunatic = queue.findIndex((step) => step.roleId === "lunatic");
  const demon = queue.findIndex((step) => step.system === "demoninfo");
  assert.ok(minions >= 0 && lunatic >= 0 && demon >= 0);
  assert.ok(minions < lunatic, "Minion information comes first");
  assert.ok(lunatic < demon, "the Lunatic chooses before the Demon information");
});

test("the Pukka step offers no host death controls (BMR-O2)", () => {
  const state = make(
    {
      1: "chambermaid",
      2: "courtier",
      3: "sailor",
      4: "gossip",
      5: "devilsadvocate",
      6: "pukka",
    },
    { count: 8 },
  );
  nextNight(state);
  const pukka = state.night.queue.find((step) => step.roleId === "pukka")!;
  assert.equal(pukka.canKill, false, "the engine resolves the Pukka's death");
});

// The Gambler's and the Pukka's steps as the night queue builds them and as
// their completion leaves them.

function gamblerAndPukka(): GameState {
  return make(
    { 1: "gambler", 2: "chambermaid", 3: "sailor", 4: "courtier", 5: "fool", 6: "pukka" },
    { count: 8 },
  );
}

function roleStepOf(state: GameState, roleId: RoleId): NightStep {
  const step = state.night.queue.find((candidate) => candidate.roleId === roleId);
  assert.ok(step, roleId + " has no step in " + JSON.stringify(queueRoles(state)));
  return step;
}

function queueRoles(state: GameState): string[] {
  return state.night.queue.map((step) => String(step.roleId || step.system));
}

/** A step without the fields a completion stamps from the clock. */
function recordOf(step: NightStep): Record<string, unknown> {
  const record: Record<string, unknown> = JSON.parse(JSON.stringify(step));
  delete record.completedAt;
  return record;
}

const OPEN_STEP = {
  kind: "role",
  bmr: true,
  actorAlive: true,
  targetMode: "one-any",
  minTargets: 1,
  maxTargets: 1,
  infoKind: "none",
  optional: false,
  canKill: false,
  canResurrect: false,
  note: null,
  targetIds: [],
  registrations: {},
  given: null,
  result: null,
  pending: null,
  done: false,
  skipped: false,
};

test("the Pukka has a step on every night and the Gambler from the second night (BMR-PUKKA-01, BMR-GAMBLER-01)", () => {
  const state = gamblerAndPukka();
  startNight(state);
  assert.deepEqual(queueRoles(state), [
    "minioninfo",
    "demoninfo",
    "sailor",
    "courtier",
    "pukka",
    "chambermaid",
  ]);
  const pukka = {
    ...OPEN_STEP,
    roleId: "pukka",
    actorId: "6",
    actorName: "P6",
    noteKey: "note.bmr.pukka",
  };
  assert.deepEqual(recordOf(roleStepOf(state, "pukka")), {
    ...pukka,
    key: "n1-6-pukka-6",
    order: 6,
  });

  for (const night of [2, 3]) {
    skipRemaining(state);
    endNightToNext(state);
    assert.deepEqual(
      queueRoles(state),
      ["sailor", "courtier", "gambler", "pukka", "assassin", "chambermaid"],
      "night " + night,
    );
    assert.deepEqual(recordOf(roleStepOf(state, "pukka")), {
      ...pukka,
      key: "n" + night + "-8-pukka-6",
      order: 8,
    });
    assert.deepEqual(recordOf(roleStepOf(state, "gambler")), {
      ...OPEN_STEP,
      key: "n" + night + "-3-gambler-1",
      order: 3,
      roleId: "gambler",
      actorId: "1",
      actorName: "P1",
      noteKey: "note.bmr.gambler",
      roleChoices: state.script!.roles,
    });
  }
});

test("a living Lunatic shown the Pukka chooses one player, and the Pukka's step then yields a note", () => {
  const state = make(
    {
      1: "lunatic",
      2: "pukka",
      3: "chambermaid",
      4: "courtier",
      5: "exorcist",
      6: "gambler",
      7: "sailor",
      8: "mastermind",
    },
    { count: 8 },
  );
  assert.equal(state.setup.lunaticShownId, "pukka");
  startNight(state);
  const pukka = {
    ...OPEN_STEP,
    roleId: "pukka",
    actorId: "2",
    actorName: "P2",
    infoKind: "note",
    noteKey: "note.bmr.pukka",
  };
  assert.deepEqual(recordOf(roleStepOf(state, "pukka")), {
    ...pukka,
    key: "n1-6-pukka-2",
    order: 6,
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(recordOf(roleStepOf(state, "pukka")), {
    ...pukka,
    key: "n2-8-pukka-2",
    order: 8,
  });
  assert.deepEqual(recordOf(roleStepOf(state, "lunatic")), {
    ...OPEN_STEP,
    key: "n2-5-lunatic-1",
    order: 5,
    roleId: "lunatic",
    actorId: "1",
    actorName: "P1",
    noteKey: "note.bmr.lunatic",
  });
});

test("the Pukka's first-night step records the poisoned player and no death (BMR-PUKKA-01)", () => {
  const state = gamblerAndPukka();
  startNight(state);
  const step = roleStepOf(state, "pukka");
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.deepEqual(recordOf(step), {
    ...OPEN_STEP,
    key: "n1-6-pukka-6",
    order: 6,
    roleId: "pukka",
    actorId: "6",
    actorName: "P6",
    note: "Шаг выполнен.",
    noteKey: "note.finished",
    noteVars: null,
    targetIds: ["2"],
    result: { deaths: [], resolved: null, poisonedId: "2" },
    done: true,
    impaired: false,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(state.effects)), [
    {
      id: "eff-pukka-poison-6-1",
      kind: "poison",
      pukka: true,
      sourceId: "6",
      targetId: "2",
      start: { phase: "night", number: 1 },
      expires: null,
      active: true,
    },
    {
      id: "eff-pukka-death-6-1",
      kind: "pukka-death",
      sourceId: "6",
      targetId: "2",
      start: { phase: "night", number: 1 },
      resolve: { phase: "night", number: 2 },
      expires: null,
      active: true,
    },
  ]);
  assert.deepEqual(state.deaths, []);
});

test("a Pukka who is drunk on the first night poisons nobody (BMR-PUKKA-03)", () => {
  const state = gamblerAndPukka();
  startNight(state);
  state.effects.push({
    id: "test-pukka-drunk",
    kind: "drunk",
    sourceId: "3",
    targetId: "6",
    start: { phase: "night" as const, number: 1 },
    expires: { phase: "night" as const, number: 2 },
    active: true,
  });
  const step = roleStepOf(state, "pukka");
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.deepEqual(recordOf(step), {
    ...OPEN_STEP,
    key: "n1-6-pukka-6",
    order: 6,
    roleId: "pukka",
    actorId: "6",
    actorName: "P6",
    note: "Способность не сработала: Пукка отравлен или пьян. Яд на прежней цели приостановлен.",
    noteKey: "note.pukkaSuspended",
    noteVars: null,
    targetIds: ["2"],
    result: { deaths: [], poisonedId: null, suspended: true },
    done: true,
    impaired: true,
  });
  assert.equal(state.effects.length, 1, "no poison and no delayed death are added");
  assert.equal(isImpaired(state, "2"), false);
});

test("a Gambler who names no character keeps their life and the step is completed (BMR-GAMBLER-01)", () => {
  const { state, step } = gamblerSecondNight();
  const logged = state.log.length;
  assert.equal(completeStep(state, step.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["1"].alive, true);
  assert.deepEqual(state.deaths, []);
  assert.deepEqual(recordOf(step), {
    ...OPEN_STEP,
    key: "n2-3-gambler-1",
    order: 3,
    roleId: "gambler",
    actorId: "1",
    actorName: "P1",
    note: "Шаг выполнен.",
    noteKey: "note.finished",
    noteVars: null,
    targetIds: ["2"],
    done: true,
    impaired: false,
    roleChoices: state.script!.roles,
  });
  assert.deepEqual(
    state.log.slice(logged).map((line) => [line.kind, line.title, line.detail]),
    [["night", roleLabel("gambler"), "Шаг выполнен."]],
  );
});

test("a wrong Gambler guess leaves the death on the step's log and no result on the step (BMR-GAMBLER-01)", () => {
  const { state, step } = gamblerSecondNight();
  const logged = state.log.length;
  assert.equal(completeStep(state, step.key, { targetIds: ["2"], roleId: "fool" }).ok, true);
  assert.equal(step.result, null);
  assert.equal(step.noteKey, "note.finished");
  assert.equal(step.impaired, false);
  assert.deepEqual(
    state.deaths.map((death) => [
      death.playerId,
      death.cause,
      death.ability,
      death.bmr,
      death.number,
    ]),
    [["1", "ability", "gambler", true, 2]],
  );
  assert.deepEqual(
    state.log.slice(logged).map((line) => [line.kind, line.playerId ?? null]),
    [
      ["death", "1"],
      ["night", null],
    ],
  );
});

// The Sailor's and the Innkeeper's steps as the night queue builds them and
// as their completion leaves them: the step record, every effect with its id
// and flag, the log lines and each draw from the command ports, in order.

function recordingPorts(): { ports: CommandExecutionContext; draws: string[] } {
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

function sailorAndInnkeeper(): GameState {
  return make(
    {
      1: "sailor",
      2: "innkeeper",
      3: "goon",
      4: "chambermaid",
      5: "gossip",
      6: "devilsadvocate",
      7: "po",
    },
    { count: 8 },
  );
}

interface StepRun {
  readonly ok: boolean;
  readonly step: Record<string, unknown>;
  readonly effects: unknown[];
  readonly log: unknown[];
  readonly draws: string[];
}

/** Completes the role's open step with recording ports and returns what it left. */
function runRoleStep(
  state: GameState,
  roleId: RoleId,
  options: { targetIds: string[]; drunkId?: string },
): StepRun {
  const step = roleStepOf(state, roleId);
  const logged = state.log.length;
  const { ports, draws } = recordingPorts();
  const result = completeStep(state, step.key, options, ports);
  return {
    ok: result.ok === true,
    step: recordOf(step),
    effects: JSON.parse(JSON.stringify(state.effects)),
    log: JSON.parse(JSON.stringify(state.log.slice(logged))),
    draws,
  };
}

/** A poison from a healthy seat that is not the acting role's. */
function poisonFor(state: GameState, targetId: string, sourceId: string, night: number) {
  state.effects.push({
    id: "fixture-poison-" + targetId + "-" + night,
    kind: "poison",
    sourceId,
    targetId,
    start: { phase: "night" as const, number: night },
    expires: { phase: "night" as const, number: night + 1 },
    active: true,
  });
}

test("the Sailor has a step on every night and the Innkeeper from the second night (BMR-SAILOR-01, BMR-INNKEEPER-01)", () => {
  const state = sailorAndInnkeeper();
  startNight(state);
  assert.deepEqual(queueRoles(state), [
    "minioninfo",
    "demoninfo",
    "sailor",
    "courtier",
    "devilsadvocate",
    "chambermaid",
  ]);
  assert.deepEqual(recordOf(roleStepOf(state, "sailor")), {
    ...OPEN_STEP,
    key: "n1-2-sailor-1",
    roleId: "sailor",
    actorId: "1",
    actorName: "P1",
    order: 2,
    noteKey: "note.bmr.sailor",
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(queueRoles(state), [
    "sailor",
    "courtier",
    "innkeeper",
    "devilsadvocate",
    "po",
    "chambermaid",
  ]);
  assert.deepEqual(recordOf(roleStepOf(state, "sailor")), {
    ...OPEN_STEP,
    key: "n2-0-sailor-1",
    roleId: "sailor",
    actorId: "1",
    actorName: "P1",
    order: 0,
    noteKey: "note.bmr.sailor",
  });
  assert.deepEqual(recordOf(roleStepOf(state, "innkeeper")), {
    ...OPEN_STEP,
    key: "n2-2-innkeeper-2",
    roleId: "innkeeper",
    actorId: "2",
    actorName: "P2",
    order: 2,
    targetMode: "two",
    minTargets: 2,
    maxTargets: 2,
    noteKey: "note.bmr.innkeeper",
  });
});

test("the Sailor's choice makes one player drunk until dusk and the next choice ends it (BMR-SAILOR-01, BMR-SAILOR-02)", () => {
  const state = sailorAndInnkeeper();
  startNight(state);
  assert.deepEqual(runRoleStep(state, "sailor", { targetIds: ["4"], drunkId: "4" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n1-2-sailor-1",
      roleId: "sailor",
      actorId: "1",
      actorName: "P1",
      order: 2,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "drunk",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-3-k2000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 1",
        kind: "night",
        title: "Моряк",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "sailor",
        phaseCode: "night",
        phaseNumber: 1,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:4", "clock", "id:5", "clock"],
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runRoleStep(state, "sailor", { targetIds: ["5"], drunkId: "1" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-0-sailor-1",
      roleId: "sailor",
      actorId: "1",
      actorName: "P1",
      order: 0,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["5"],
      done: true,
      impaired: true,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "drunk",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "drunk",
        sourceId: "1",
        targetId: "1",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-11-k2000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Моряк",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "sailor",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:4", "clock", "id:5", "clock"],
  });
});

test("the Innkeeper's two players are safe tonight, one is drunk until dusk and the next choice ends them (BMR-INNKEEPER-01)", () => {
  const state = sailorAndInnkeeper();
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runRoleStep(state, "innkeeper", { targetIds: ["4", "5"], drunkId: "5" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-2-innkeeper-2",
      roleId: "innkeeper",
      actorId: "2",
      actorName: "P2",
      order: 2,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4", "5"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: true,
      },
      {
        id: "eff-2-k200",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: true,
      },
      {
        id: "eff-3-k300",
        kind: "drunk",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-11-k4000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Трактирщик",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "innkeeper",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:4", "id:4", "id:4", "clock", "id:5", "clock"],
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runRoleStep(state, "innkeeper", { targetIds: ["2", "6"], drunkId: "2" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-2-innkeeper-2",
      roleId: "innkeeper",
      actorId: "2",
      actorName: "P2",
      order: 2,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["2", "6"],
      done: true,
      impaired: true,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k200",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: false,
      },
      {
        id: "eff-3-k300",
        kind: "drunk",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "eff-4-k100",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "2",
        start: { phase: "night", number: 3 },
        expires: { phase: "day", number: 3 },
        active: true,
      },
      {
        id: "eff-5-k200",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "6",
        start: { phase: "night", number: 3 },
        expires: { phase: "day", number: 3 },
        active: true,
      },
      {
        id: "eff-6-k300",
        kind: "drunk",
        sourceId: "2",
        targetId: "2",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-19-k4000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Трактирщик",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "innkeeper",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:4", "id:4", "id:4", "clock", "id:5", "clock"],
  });
});

test("a poisoned Sailor or Innkeeper gives no effect and still ends the last choice (BMR-SAILOR-01, BMR-INNKEEPER-01)", () => {
  const first = sailorAndInnkeeper();
  startNight(first);
  poisonFor(first, "1", "6", 1);
  assert.deepEqual(runRoleStep(first, "sailor", { targetIds: ["4"], drunkId: "4" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n1-2-sailor-1",
      roleId: "sailor",
      actorId: "1",
      actorName: "P1",
      order: 2,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["4"],
      done: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "fixture-poison-1-1",
        kind: "poison",
        sourceId: "6",
        targetId: "1",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-3-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 1",
        kind: "night",
        title: "Моряк",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "sailor",
        phaseCode: "night",
        phaseNumber: 1,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
  });

  const state = sailorAndInnkeeper();
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  assert.equal(runRoleStep(state, "sailor", { targetIds: ["4"], drunkId: "4" }).ok, true);
  assert.equal(runRoleStep(state, "innkeeper", { targetIds: ["4", "5"], drunkId: "5" }).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  poisonFor(state, "1", "6", 3);
  poisonFor(state, "2", "6", 3);
  assert.deepEqual(runRoleStep(state, "sailor", { targetIds: ["5"] }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-0-sailor-1",
      roleId: "sailor",
      actorId: "1",
      actorName: "P1",
      order: 0,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["5"],
      done: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "drunk",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: true,
      },
      {
        id: "eff-3-k200",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: true,
      },
      {
        id: "eff-4-k300",
        kind: "drunk",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      },
      {
        id: "fixture-poison-1-3",
        kind: "poison",
        sourceId: "6",
        targetId: "1",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
      {
        id: "fixture-poison-2-3",
        kind: "poison",
        sourceId: "6",
        targetId: "2",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-19-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Моряк",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "sailor",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
  });
  assert.deepEqual(runRoleStep(state, "innkeeper", { targetIds: ["4", "1"] }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-2-innkeeper-2",
      roleId: "innkeeper",
      actorId: "2",
      actorName: "P2",
      order: 2,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["4", "1"],
      done: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "drunk",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "4",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: false,
      },
      {
        id: "eff-3-k200",
        kind: "protected",
        bmr: "innkeeper",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "day", number: 2 },
        active: false,
      },
      {
        id: "eff-4-k300",
        kind: "drunk",
        sourceId: "2",
        targetId: "5",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "fixture-poison-1-3",
        kind: "poison",
        sourceId: "6",
        targetId: "1",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
      {
        id: "fixture-poison-2-3",
        kind: "poison",
        sourceId: "6",
        targetId: "2",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-20-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Трактирщик",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "innkeeper",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
  });
});

test("a Sailor or an Innkeeper who chooses the Goon is drunk and the ability fails (BMR-GOON-01, BMR-SAILOR-02, BMR-INNKEEPER-01)", () => {
  const sailor = sailorAndInnkeeper();
  startNight(sailor);
  assert.equal(runRoleStep(sailor, "sailor", { targetIds: ["4"], drunkId: "1" }).ok, true);
  skipRemaining(sailor);
  endNightToNext(sailor);
  assert.deepEqual(runRoleStep(sailor, "sailor", { targetIds: ["3"], drunkId: "3" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-0-sailor-1",
      roleId: "sailor",
      actorId: "1",
      actorName: "P1",
      order: 0,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["3"],
      done: true,
      goonImpaired: true,
      goonId: "3",
      goonImpairedOnly: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "drunk",
        sourceId: "1",
        targetId: "1",
        start: { phase: "night", number: 1 },
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-goon-2-3",
        kind: "drunk",
        bmr: "goon",
        sourceId: "1",
        targetId: "1",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
        permanent: true,
      },
    ],
    log: [
      {
        id: "log-11-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "effect",
        title: "Наёмник выбран: P1",
        detail: "P1 пьян до заката. Наёмник теперь добрый.",
        playerId: "3",
        secret: true,
      },
      {
        id: "log-12-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Моряк",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "sailor",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
  });

  const innkeeper = sailorAndInnkeeper();
  startNight(innkeeper);
  skipRemaining(innkeeper);
  endNightToNext(innkeeper);
  assert.deepEqual(runRoleStep(innkeeper, "innkeeper", { targetIds: ["3", "4"], drunkId: "4" }), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-2-innkeeper-2",
      roleId: "innkeeper",
      actorId: "2",
      actorName: "P2",
      order: 2,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["3", "4"],
      done: true,
      goonImpaired: true,
      goonId: "3",
      goonImpairedOnly: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-goon-2-3",
        kind: "drunk",
        bmr: "goon",
        sourceId: "2",
        targetId: "2",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
        permanent: true,
      },
    ],
    log: [
      {
        id: "log-11-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "effect",
        title: "Наёмник выбран: P2",
        detail: "P2 пьян до заката. Наёмник теперь добрый.",
        playerId: "3",
        secret: true,
      },
      {
        id: "log-12-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Трактирщик",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "innkeeper",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
  });
});
// The Devil's Advocate's and the Exorcist's steps as the night queue builds
// them and as their completion leaves them, with the choice each records on
// its seat and the Demon's step the Exorcist closes.

function advocateAndExorcist(demon: RoleId): GameState {
  return make(
    {
      1: "devilsadvocate",
      2: "exorcist",
      3: "goon",
      4: "chambermaid",
      5: "gossip",
      6: "sailor",
      7: demon,
    },
    { count: 8 },
  );
}

/** Completes a choosing step and returns what it left, the seat's record and the Demon's step. */
function runChoiceStep(
  state: GameState,
  roleId: RoleId,
  targetIds: string[],
  demonRoleId?: RoleId,
) {
  const actorId = roleStepOf(state, roleId).actorId!;
  const run = runRoleStep(state, roleId, { targetIds });
  const demon = demonRoleId
    ? state.night.queue.find((candidate) => candidate.roleId === demonRoleId)
    : undefined;
  return {
    ...run,
    used: JSON.parse(JSON.stringify(state.players[actorId]!.used ?? null)),
    demon: demon ? recordOf(demon) : null,
  };
}

test("the Devil's Advocate has a step on every night and the Exorcist from the second night, with last night's choice barred (BMR-DEVILSADVOCATE-02, BMR-EXORCIST-02)", () => {
  const state = advocateAndExorcist("po");
  startNight(state);
  assert.deepEqual(queueRoles(state), [
    "minioninfo",
    "demoninfo",
    "sailor",
    "courtier",
    "devilsadvocate",
    "chambermaid",
  ]);
  assert.deepEqual(recordOf(roleStepOf(state, "devilsadvocate")), {
    ...OPEN_STEP,
    key: "n1-5-devilsadvocate-1",
    roleId: "devilsadvocate",
    actorId: "1",
    actorName: "P1",
    order: 5,
    noteKey: "note.bmr.devilAdvocateFirst",
  });
  assert.equal(runChoiceStep(state, "devilsadvocate", ["4"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(queueRoles(state), [
    "sailor",
    "courtier",
    "devilsadvocate",
    "exorcist",
    "po",
    "chambermaid",
  ]);
  assert.deepEqual(recordOf(roleStepOf(state, "devilsadvocate")), {
    ...OPEN_STEP,
    key: "n2-4-devilsadvocate-1",
    roleId: "devilsadvocate",
    actorId: "1",
    actorName: "P1",
    order: 4,
    noteKey: "note.bmr.devilAdvocateOther",
    previousTarget: "4",
  });
  assert.deepEqual(recordOf(roleStepOf(state, "exorcist")), {
    ...OPEN_STEP,
    key: "n2-6-exorcist-2",
    roleId: "exorcist",
    actorId: "2",
    actorName: "P2",
    order: 6,
    noteKey: "note.bmr.exorcist",
  });
  assert.equal(runChoiceStep(state, "devilsadvocate", ["5"]).ok, true);
  assert.equal(runChoiceStep(state, "exorcist", ["4"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(recordOf(roleStepOf(state, "devilsadvocate")), {
    ...OPEN_STEP,
    key: "n3-4-devilsadvocate-1",
    roleId: "devilsadvocate",
    actorId: "1",
    actorName: "P1",
    order: 4,
    noteKey: "note.bmr.devilAdvocateOther",
    previousTarget: "5",
  });
  assert.deepEqual(recordOf(roleStepOf(state, "exorcist")), {
    ...OPEN_STEP,
    key: "n3-6-exorcist-2",
    roleId: "exorcist",
    actorId: "2",
    actorName: "P2",
    order: 6,
    noteKey: "note.bmr.exorcist",
    previousTarget: "4",
  });
});

test("the Devil's Advocate's choice gets tomorrow's execution protection, and the next choice ends it (BMR-DEVILSADVOCATE-01)", () => {
  const state = advocateAndExorcist("po");
  startNight(state);
  assert.deepEqual(runChoiceStep(state, "devilsadvocate", ["4"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n1-5-devilsadvocate-1",
      roleId: "devilsadvocate",
      actorId: "1",
      actorName: "P1",
      order: 5,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        day: 1,
        expires: { phase: "night", number: 2 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-3-k2000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 1",
        kind: "night",
        title: "Адвокат Дьявола",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "devilsadvocate",
        phaseCode: "night",
        phaseNumber: 1,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:4", "clock", "id:5", "clock"],
    used: { devilsadvocateTarget: "4", devilsadvocateTargetNight: 1 },
    demon: null,
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runChoiceStep(state, "devilsadvocate", ["5"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-4-devilsadvocate-1",
      roleId: "devilsadvocate",
      actorId: "1",
      actorName: "P1",
      order: 4,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["5"],
      done: true,
      previousTarget: "4",
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        day: 1,
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "5",
        start: { phase: "night", number: 2 },
        day: 2,
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-11-k2000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Адвокат Дьявола",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "devilsadvocate",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:4", "clock", "id:5", "clock"],
    used: { devilsadvocateTarget: "5", devilsadvocateTargetNight: 2 },
    demon: null,
  });
});

test("a poisoned Devil's Advocate protects nobody but the choice is recorded and the last one ends (BMR-DEVILSADVOCATE-01, BMR-DEVILSADVOCATE-02, BMR-GOON-01)", () => {
  const state = advocateAndExorcist("po");
  startNight(state);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["4"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["5"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  poisonFor(state, "1", "6", 3);
  assert.deepEqual(runChoiceStep(state, "devilsadvocate", ["4"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-4-devilsadvocate-1",
      roleId: "devilsadvocate",
      actorId: "1",
      actorName: "P1",
      order: 4,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["4"],
      done: true,
      previousTarget: "5",
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        day: 1,
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "5",
        start: { phase: "night", number: 2 },
        day: 2,
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "fixture-poison-1-3",
        kind: "poison",
        sourceId: "6",
        targetId: "1",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-19-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Адвокат Дьявола",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "devilsadvocate",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { devilsadvocateTarget: "4", devilsadvocateTargetNight: 3 },
    demon: null,
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runChoiceStep(state, "devilsadvocate", ["3"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n4-4-devilsadvocate-1",
      roleId: "devilsadvocate",
      actorId: "1",
      actorName: "P1",
      order: 4,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["3"],
      done: true,
      previousTarget: "4",
      goonImpaired: true,
      goonId: "3",
      goonImpairedOnly: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        day: 1,
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "5",
        start: { phase: "night", number: 2 },
        day: 2,
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "fixture-poison-1-3",
        kind: "poison",
        sourceId: "6",
        targetId: "1",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
      {
        id: "eff-goon-4-3",
        kind: "drunk",
        bmr: "goon",
        sourceId: "1",
        targetId: "1",
        start: { phase: "night", number: 4 },
        expires: { phase: "night", number: 5 },
        active: true,
        permanent: true,
      },
    ],
    log: [
      {
        id: "log-27-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 4",
        kind: "effect",
        title: "Наёмник выбран: P1",
        detail: "P1 пьян до заката. Наёмник теперь злой.",
        playerId: "3",
        secret: true,
      },
      {
        id: "log-28-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 4",
        kind: "night",
        title: "Адвокат Дьявола",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "devilsadvocate",
        phaseCode: "night",
        phaseNumber: 4,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: { devilsadvocateTarget: "3", devilsadvocateTargetNight: 4 },
    demon: null,
  });
});

test("an Exorcist who chooses a player who is not the Demon records the choice and blocks nobody (BMR-EXORCIST-01, BMR-EXORCIST-02)", () => {
  const state = advocateAndExorcist("po");
  startNight(state);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["4"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["5"]).ok, true);
  assert.deepEqual(runChoiceStep(state, "exorcist", ["4"], "po"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        day: 1,
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "5",
        start: { phase: "night", number: 2 },
        day: 2,
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-12-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { exorcistTarget: "4", exorcistTargetNight: 2 },
    demon: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      noteKey: "note.bmr.po",
    },
  });
});

test("an Exorcist who chooses the Demon closes its step, and a poisoned or Goon-drunk Exorcist does not (BMR-EXORCIST-01, BMR-GOON-01)", () => {
  // The same game as the Devil's Advocate's tests: its choices on nights 1 to 3
  // stay in the effects the Exorcist's step leaves.
  const state = advocateAndExorcist("po");
  startNight(state);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["4"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["5"]).ok, true);
  assert.equal(runChoiceStep(state, "exorcist", ["4"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  poisonFor(state, "1", "6", 3);
  assert.equal(runChoiceStep(state, "devilsadvocate", ["4"]).ok, true);
  assert.deepEqual(runChoiceStep(state, "exorcist", ["7"], "po"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["7"],
      done: true,
      previousTarget: "4",
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-1-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "4",
        start: { phase: "night", number: 1 },
        day: 1,
        expires: { phase: "night", number: 2 },
        active: false,
      },
      {
        id: "eff-2-k100",
        kind: "devilsadvocate",
        sourceId: "1",
        targetId: "5",
        start: { phase: "night", number: 2 },
        day: 2,
        expires: { phase: "night", number: 3 },
        active: false,
      },
      {
        id: "fixture-poison-1-3",
        kind: "poison",
        sourceId: "6",
        targetId: "1",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-20-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Экзорцист выбрал Демона",
        detail: "P7 узнаёт Экзорциста и не действует этой ночью.",
        playerId: null,
        secret: true,
      },
      {
        id: "log-21-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Экзорцист",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: { exorcistTarget: "7", exorcistTargetNight: 3 },
    demon: {
      ...OPEN_STEP,
      key: "n3-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      note: "Экзорцист (P2) выбрал Демона. Демон узнаёт Экзорциста и не просыпается.",
      noteKey: "note.exorcistBlocked",
      done: true,
      skipped: true,
      noteVars: { name: "P2" },
    },
  });

  const poisoned = advocateAndExorcist("po");
  startNight(poisoned);
  skipRemaining(poisoned);
  endNightToNext(poisoned);
  poisonFor(poisoned, "2", "6", 2);
  assert.deepEqual(runChoiceStep(poisoned, "exorcist", ["7"], "po"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["7"],
      done: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "fixture-poison-2-2",
        kind: "poison",
        sourceId: "6",
        targetId: "2",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-11-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { exorcistTarget: "7", exorcistTargetNight: 2 },
    demon: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      noteKey: "note.bmr.po",
    },
  });

  const goon = advocateAndExorcist("po");
  startNight(goon);
  skipRemaining(goon);
  endNightToNext(goon);
  assert.deepEqual(runChoiceStep(goon, "exorcist", ["3"], "po"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Способность не сработала: игрок отравлен или пьян.",
      noteKey: "note.abilityFailed",
      targetIds: ["3"],
      done: true,
      goonImpaired: true,
      goonId: "3",
      goonImpairedOnly: true,
      noteVars: null,
      impaired: true,
    },
    effects: [
      {
        id: "eff-goon-2-3",
        kind: "drunk",
        bmr: "goon",
        sourceId: "2",
        targetId: "2",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
        permanent: true,
      },
    ],
    log: [
      {
        id: "log-11-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "effect",
        title: "Наёмник выбран: P2",
        detail: "P2 пьян до заката. Наёмник теперь добрый.",
        playerId: "3",
        secret: true,
      },
      {
        id: "log-12-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист",
        detail: "Способность не сработала: игрок отравлен или пьян.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.abilityFailed",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: { exorcistTarget: "3", exorcistTargetNight: 2 },
    demon: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      noteKey: "note.bmr.po",
    },
  });
});

test("an Exorcist who chooses the Shabaloth leaves it only the regurgitation, and one who chooses the Pukka resolves its waiting death (BMR-EXORCIST-01)", () => {
  const shabaloth = advocateAndExorcist("shabaloth");
  startNight(shabaloth);
  skipRemaining(shabaloth);
  endNightToNext(shabaloth);
  assert.deepEqual(recordOf(roleStepOf(shabaloth, "shabaloth")), {
    ...OPEN_STEP,
    key: "n2-9-shabaloth-7",
    roleId: "shabaloth",
    actorId: "7",
    actorName: "P7",
    order: 9,
    targetMode: "two",
    minTargets: 2,
    maxTargets: 2,
    canKill: true,
    canResurrect: true,
    noteKey: "note.bmr.shabaloth",
  });
  assert.deepEqual(runChoiceStep(shabaloth, "exorcist", ["7"], "shabaloth"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["7"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-11-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист выбрал Демона",
        detail: "P7 узнаёт Экзорциста и не действует этой ночью.",
        playerId: null,
        secret: true,
      },
      {
        id: "log-12-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: { exorcistTarget: "7", exorcistTargetNight: 2 },
    demon: {
      ...OPEN_STEP,
      key: "n2-9-shabaloth-7",
      roleId: "shabaloth",
      actorId: "7",
      actorName: "P7",
      order: 9,
      targetMode: "none",
      minTargets: 0,
      maxTargets: 0,
      canResurrect: true,
      note: "Экзорцист (P2) выбрал Демона. Демон узнаёт Экзорциста и не просыпается.",
      noteKey: "note.exorcistBlocked",
      blocked: true,
      noteVars: { name: "P2" },
    },
  });

  const pukka = advocateAndExorcist("pukka");
  startNight(pukka);
  assert.equal(runChoiceStep(pukka, "pukka", ["4"]).ok, true);
  skipRemaining(pukka);
  endNightToNext(pukka);
  assert.deepEqual(runChoiceStep(pukka, "exorcist", ["7"], "pukka"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["7"],
      result: {
        pukkaDeath: {
          targetId: "4",
          death: {
            id: "death-1-k200",
            playerId: "4",
            roleId: "chambermaid",
            cause: "ability",
            phase: "night",
            number: 2,
            at: "2030-01-01T00:00:02.000Z",
            impaired: true,
            livingBefore: 8,
            demon: true,
            ability: "pukka",
          },
          skipped: false,
          prevented: false,
        },
      },
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-pukka-poison-7-1",
        kind: "poison",
        pukka: true,
        sourceId: "7",
        targetId: "4",
        start: { phase: "night", number: 1 },
        expires: null,
        active: false,
      },
      {
        id: "eff-pukka-death-7-1",
        kind: "pukka-death",
        sourceId: "7",
        targetId: "4",
        start: { phase: "night", number: 1 },
        resolve: { phase: "night", number: 2 },
        expires: null,
        active: false,
      },
    ],
    log: [
      {
        id: "log-12-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист выбрал Демона",
        detail: "P7 узнаёт Экзорциста и не действует этой ночью.",
        playerId: null,
        secret: true,
      },
      {
        id: "log-13-k3000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "death",
        title: "P4 погибает",
        detail: "Причина: ability. Роль: Горничная.",
        playerId: "4",
        secret: true,
        consequence: "death",
      },
      {
        id: "log-14-k4000",
        at: "2030-01-01T00:00:05.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Экзорцист",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
      {
        id: "log-15-k5000",
        at: "2030-01-01T00:00:06.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Шаг пропущен: Горничная",
        detail: "P4 погиб до пробуждения.",
        playerId: null,
        secret: true,
      },
    ],
    draws: [
      "id:5",
      "clock",
      "id:4",
      "clock",
      "id:5",
      "clock",
      "clock",
      "id:5",
      "clock",
      "id:5",
      "clock",
    ],
    used: { exorcistTarget: "7", exorcistTargetNight: 2 },
    demon: {
      ...OPEN_STEP,
      key: "n2-8-pukka-7",
      roleId: "pukka",
      actorId: "7",
      actorName: "P7",
      order: 8,
      note: "Экзорцист (P2) выбрал Демона. Демон узнаёт Экзорциста и не просыпается.",
      noteKey: "note.exorcistBlocked",
      done: true,
      skipped: true,
      noteVars: { name: "P2" },
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(pukka.deaths)), [
    {
      id: "death-1-k200",
      playerId: "4",
      roleId: "chambermaid",
      cause: "ability",
      phase: "night",
      number: 2,
      at: "2030-01-01T00:00:02.000Z",
      impaired: true,
      livingBefore: 8,
      demon: true,
      ability: "pukka",
    },
  ]);
});

test("a Demon kept asleep gets the note the role wrote, and a Demon whose step is finished only the log line (BMR-EXORCIST-01)", () => {
  // A module with its own texts, so the test does not depend on the Exorcist's
  // wording: the engine writes what the decision says.
  const blocker = (text: string): RoleModule => ({
    id: "exorcist",
    edition: "bmr",
    capabilities: [
      {
        kind: "night-step",
        timing: "other",
        step: { target: "one-any" },
        resolve: ({ targetIds }) => ({
          kind: "effects",
          effects: [
            {
              kind: "block-demon",
              playerId: targetIds[0]!,
              note: { key: "note.test", vars: { seat: 2 }, text },
              log: { title: "Проверочный заголовок", detail: text },
            },
          ],
        }),
      },
    ],
  });
  const state = advocateAndExorcist("po");
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  const step = roleStepOf(state, "exorcist");
  const po = roleStepOf(state, "po");
  const at = { phase: "night", number: 2 } as const;
  const logged = state.log.length;
  const { ports, draws } = recordingPorts();

  applyRoleAbility(state, blocker("Проверочная заметка"), step, ["7"], at, {}, ports);

  assert.deepEqual(recordOf(po), {
    ...OPEN_STEP,
    key: "n2-10-po-7",
    roleId: "po",
    actorId: "7",
    actorName: "P7",
    order: 10,
    targetMode: "po",
    minTargets: 0,
    canKill: true,
    note: "Проверочная заметка",
    noteKey: "note.test",
    done: true,
    skipped: true,
    noteVars: { seat: 2 },
  });
  const line = {
    at: "2030-01-01T00:00:01.000Z",
    phase: "Ночь 2",
    kind: "night",
    title: "Проверочный заголовок",
    detail: "Проверочная заметка",
    playerId: null,
    secret: true,
  };
  assert.deepEqual(JSON.parse(JSON.stringify(state.log.slice(logged))), [
    { id: "log-" + (logged + 1) + "-k1000", ...line },
  ]);
  assert.equal(step.noteKey, "note.bmr.exorcist", "the blocking step keeps its own note");
  assert.equal(step.result, null, "only a Pukka's waiting death reports on the blocking step");

  const finished = recordOf(po);
  applyRoleAbility(state, blocker("Вторая заметка"), step, ["7"], at, {}, ports);

  assert.deepEqual(recordOf(po), finished, "a finished Demon step is not written again");
  assert.equal(state.log.length, logged + 2);
  assert.equal(state.log.at(-1)!.detail, "Вторая заметка");
  assert.deepEqual(draws, ["id:5", "clock", "id:5", "clock"]);
});

function tinkerAndDemon(demon: RoleId): GameState {
  return make(
    {
      1: "tinker",
      2: "exorcist",
      3: "goon",
      4: "chambermaid",
      5: "gossip",
      6: "sailor",
      7: demon,
    },
    { count: 9 },
  );
}

test("the Tinker, the Po and the Shabaloth have a step from the second night, and the Po's takes three players after a night it chose no one (BMR-TINKER-01, BMR-PO-01, BMR-SHABALOTH-01)", () => {
  const state = tinkerAndDemon("po");
  startNight(state);
  assert.deepEqual(queueRoles(state), [
    "minioninfo",
    "demoninfo",
    "sailor",
    "courtier",
    "chambermaid",
  ]);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(queueRoles(state), [
    "sailor",
    "courtier",
    "exorcist",
    "po",
    "assassin",
    "tinker",
    "chambermaid",
  ]);
  assert.deepEqual(recordOf(roleStepOf(state, "tinker")), {
    ...OPEN_STEP,
    key: "n2-15-tinker-1",
    roleId: "tinker",
    actorId: "1",
    actorName: "P1",
    order: 15,
    targetMode: "none",
    minTargets: 0,
    maxTargets: 0,
    canKill: true,
    noteKey: "note.bmr.tinker",
  });
  assert.deepEqual(recordOf(roleStepOf(state, "po")), {
    ...OPEN_STEP,
    key: "n2-10-po-7",
    roleId: "po",
    actorId: "7",
    actorName: "P7",
    order: 10,
    targetMode: "po",
    minTargets: 0,
    canKill: true,
    noteKey: "note.bmr.po",
  });
  assert.equal(runChoiceStep(state, "po", []).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(recordOf(roleStepOf(state, "po")), {
    ...OPEN_STEP,
    key: "n3-10-po-7",
    roleId: "po",
    actorId: "7",
    actorName: "P7",
    order: 10,
    targetMode: "po",
    minTargets: 3,
    maxTargets: 3,
    canKill: true,
    noteKey: "note.bmr.po",
  });
  assert.equal(runChoiceStep(state, "po", ["4", "5", "6"]).ok, true);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(recordOf(roleStepOf(state, "po")), {
    ...OPEN_STEP,
    key: "n4-10-po-7",
    roleId: "po",
    actorId: "7",
    actorName: "P7",
    order: 10,
    targetMode: "po",
    minTargets: 0,
    canKill: true,
    noteKey: "note.bmr.po",
  });

  const shabaloth = tinkerAndDemon("shabaloth");
  startNight(shabaloth);
  skipRemaining(shabaloth);
  endNightToNext(shabaloth);
  assert.deepEqual(queueRoles(shabaloth), [
    "sailor",
    "courtier",
    "exorcist",
    "shabaloth",
    "assassin",
    "tinker",
    "chambermaid",
  ]);
  assert.deepEqual(recordOf(roleStepOf(shabaloth, "shabaloth")), {
    ...OPEN_STEP,
    key: "n2-9-shabaloth-7",
    roleId: "shabaloth",
    actorId: "7",
    actorName: "P7",
    order: 9,
    targetMode: "two",
    minTargets: 2,
    maxTargets: 2,
    canKill: true,
    canResurrect: true,
    noteKey: "note.bmr.shabaloth",
  });
});

test("the Tinker's step changes nothing, and the host's death on it is an ability death (BMR-TINKER-01)", () => {
  const state = tinkerAndDemon("po");
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  const key = roleStepOf(state, "tinker").key;
  assert.deepEqual(runChoiceStep(state, "tinker", []), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-15-tinker-1",
      roleId: "tinker",
      actorId: "1",
      actorName: "P1",
      order: 15,
      targetMode: "none",
      minTargets: 0,
      maxTargets: 0,
      canKill: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Механик",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "tinker",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: {},
    demon: null,
  });
  const { ports, draws } = recordingPorts();
  assert.deepEqual(recordBmrOutcome(state, key, { deathIds: ["1"] }, ports), {
    ok: true,
    deaths: [
      {
        id: "death-1-k100",
        playerId: "1",
        roleId: "tinker",
        cause: "ability",
        phase: "night",
        number: 2,
        at: "2030-01-01T00:00:01.000Z",
        impaired: false,
        livingBefore: 9,
        demon: false,
        ability: "tinker",
        bmr: true,
        bypassProtection: false,
      },
    ],
    resurrected: null,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(state.deaths)), [
    {
      id: "death-1-k100",
      playerId: "1",
      roleId: "tinker",
      cause: "ability",
      phase: "night",
      number: 2,
      at: "2030-01-01T00:00:01.000Z",
      impaired: false,
      livingBefore: 9,
      demon: false,
      ability: "tinker",
      bmr: true,
      bypassProtection: false,
    },
  ]);
  assert.deepEqual(draws, ["id:4", "clock", "id:5", "clock", "id:5", "clock"]);
});

test("the Po's choice of no one is recorded, also when it is poisoned, and a Po kept asleep keeps its last choice (BMR-PO-01, BMR-EXORCIST-01)", () => {
  const state = tinkerAndDemon("po");
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runChoiceStep(state, "po", []), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "По",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "po",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { poNoOne: true },
    demon: null,
  });
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(runChoiceStep(state, "po", ["4", "5", "6"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 3,
      maxTargets: 3,
      canKill: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4", "5", "6"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-19-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "По",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "po",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { poNoOne: false },
    demon: null,
  });

  const poisoned = tinkerAndDemon("po");
  startNight(poisoned);
  skipRemaining(poisoned);
  endNightToNext(poisoned);
  poisonFor(poisoned, "7", "9", 2);
  assert.deepEqual(runChoiceStep(poisoned, "po", []), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      done: true,
      impaired: true,
      noteVars: null,
    },
    effects: [
      {
        id: "fixture-poison-7-2",
        kind: "poison",
        sourceId: "9",
        targetId: "7",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "По",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "po",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { poNoOne: true },
    demon: null,
  });
  skipRemaining(poisoned);
  endNightToNext(poisoned);
  assert.deepEqual(runChoiceStep(poisoned, "exorcist", ["7"], "po"), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-6-exorcist-2",
      roleId: "exorcist",
      actorId: "2",
      actorName: "P2",
      order: 6,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["7"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [
      {
        id: "fixture-poison-7-2",
        kind: "poison",
        sourceId: "9",
        targetId: "7",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-19-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Экзорцист выбрал Демона",
        detail: "P7 узнаёт Экзорциста и не действует этой ночью.",
        playerId: null,
        secret: true,
      },
      {
        id: "log-20-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Экзорцист",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "exorcist",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: { exorcistTarget: "7", exorcistTargetNight: 3 },
    demon: {
      ...OPEN_STEP,
      key: "n3-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 3,
      maxTargets: 3,
      canKill: true,
      note: "Экзорцист (P2) выбрал Демона. Демон узнаёт Экзорциста и не просыпается.",
      noteKey: "note.exorcistBlocked",
      done: true,
      skipped: true,
      noteVars: { name: "P2" },
    },
  });
  skipRemaining(poisoned);
  endNightToNext(poisoned);
  assert.deepEqual(recordOf(roleStepOf(poisoned, "po")), {
    ...OPEN_STEP,
    key: "n4-10-po-7",
    roleId: "po",
    actorId: "7",
    actorName: "P7",
    order: 10,
    targetMode: "po",
    minTargets: 3,
    maxTargets: 3,
    canKill: true,
    noteKey: "note.bmr.po",
  });
});

test("the Po's choice of a player is recorded with its death, and a Po who chooses the Goon is drunk (BMR-PO-01, BMR-GOON-01)", () => {
  const state = tinkerAndDemon("po");
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  const key = roleStepOf(state, "po").key;
  assert.deepEqual(runChoiceStep(state, "po", ["4"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "По",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "po",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { poNoOne: false },
    demon: null,
  });
  const { ports, draws } = recordingPorts();
  assert.deepEqual(recordBmrOutcome(state, key, { deathIds: ["4"] }, ports), {
    ok: true,
    deaths: [
      {
        id: "death-1-k100",
        playerId: "4",
        roleId: "chambermaid",
        cause: "ability",
        phase: "night",
        number: 2,
        at: "2030-01-01T00:00:01.000Z",
        impaired: false,
        livingBefore: 9,
        demon: true,
        ability: "po",
        bmr: true,
        bypassProtection: false,
      },
    ],
    resurrected: null,
  });
  assert.deepEqual(draws, ["id:4", "clock", "id:5", "clock", "id:5", "clock"]);
  skipRemaining(state);
  endNightToNext(state);
  assert.deepEqual(recordOf(roleStepOf(state, "po")), {
    ...OPEN_STEP,
    key: "n3-10-po-7",
    roleId: "po",
    actorId: "7",
    actorName: "P7",
    order: 10,
    targetMode: "po",
    minTargets: 0,
    canKill: true,
    noteKey: "note.bmr.po",
  });

  const goon = tinkerAndDemon("po");
  startNight(goon);
  skipRemaining(goon);
  endNightToNext(goon);
  assert.deepEqual(runChoiceStep(goon, "po", ["3"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-10-po-7",
      roleId: "po",
      actorId: "7",
      actorName: "P7",
      order: 10,
      targetMode: "po",
      minTargets: 0,
      canKill: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["3"],
      done: true,
      goonImpaired: true,
      goonId: "3",
      goonImpairedOnly: true,
      impaired: true,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-goon-2-3",
        kind: "drunk",
        bmr: "goon",
        sourceId: "7",
        targetId: "7",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
        permanent: true,
      },
    ],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "effect",
        title: "Наёмник выбран: P7",
        detail: "P7 пьян до заката. Наёмник теперь злой.",
        playerId: "3",
        secret: true,
      },
      {
        id: "log-11-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "По",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "po",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: { poNoOne: false },
    demon: null,
  });
});

test("a multi-target night step rejects the same player twice (BMR-INNKEEPER-01, BMR-SHABALOTH-01, BMR-PO-01)", () => {
  const inn = sailorAndInnkeeper();
  startNight(inn);
  skipRemaining(inn);
  endNightToNext(inn);
  const innkeeper = roleStepOf(inn, "innkeeper");
  const before = canonicalState(inn);
  const duplicate = {
    id: "innkeeper-duplicate",
    type: "completeNightStep" as const,
    payload: { key: innkeeper.key, targetIds: ["3", "3"] },
  };
  const preview = previewCommand(inn, duplicate) as CommandView;
  assert.equal(preview.status, "rejected", "a duplicate pair cannot preview as allowed");
  const rejected = completeStep(inn, innkeeper.key, { targetIds: ["3", "3"] });
  if (rejected.ok) assert.fail("a duplicate pair was accepted");
  assert.equal(rejectionCode(rejected), "error.42");
  assert.deepEqual(canonicalState(inn), before, "a rejected pair changes nothing");
  const chambermaid = roleStepOf(inn, "chambermaid");
  const chamberRejected = completeStep(inn, chambermaid.key, { targetIds: ["3", "3"] });
  if (chamberRejected.ok) assert.fail("a duplicate Chambermaid pair was accepted");
  assert.equal(rejectionCode(chamberRejected), "error.42");

  const shab = tinkerAndDemon("shabaloth");
  startNight(shab);
  skipRemaining(shab);
  endNightToNext(shab);
  const shabaloth = roleStepOf(shab, "shabaloth");
  const shabBefore = canonicalState(shab);
  const shabRejected = completeStep(shab, shabaloth.key, { targetIds: ["3", "3"] });
  if (shabRejected.ok) assert.fail("a duplicate Shabaloth pair was accepted");
  assert.equal(rejectionCode(shabRejected), "error.42");
  assert.deepEqual(canonicalState(shab), shabBefore, "a rejected Shabaloth pair kills nobody");
  assert.equal(completeStep(shab, shabaloth.key, { targetIds: ["4", "5"] }).ok, true);

  const po = tinkerAndDemon("po");
  startNight(po);
  skipRemaining(po);
  endNightToNext(po);
  const first = roleStepOf(po, "po");
  assert.equal(completeStep(po, first.key, { targetIds: [] }).ok, true, "the Po chooses no one");
  skipRemaining(po);
  endNightToNext(po);
  const third = roleStepOf(po, "po");
  assert.equal(third.minTargets, 3);
  const poRejected = completeStep(po, third.key, { targetIds: ["3", "4", "3"] });
  if (poRejected.ok) assert.fail("a duplicate Po target was accepted");
  assert.equal(rejectionCode(poRejected), "error.42");
  assert.equal(completeStep(po, third.key, { targetIds: ["3", "4", "5"] }).ok, true);
});

test("the Shabaloth records its two players with last night's, and a poisoned or Goon-drunk Shabaloth records nothing (BMR-SHABALOTH-01, BMR-GOON-01)", () => {
  const state = tinkerAndDemon("shabaloth");
  startNight(state);
  skipRemaining(state);
  endNightToNext(state);
  const second = roleStepOf(state, "shabaloth").key;
  assert.deepEqual(runChoiceStep(state, "shabaloth", ["4", "5"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-9-shabaloth-7",
      roleId: "shabaloth",
      actorId: "7",
      actorName: "P7",
      order: 9,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      canKill: true,
      canResurrect: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4", "5"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Шабалот",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "shabaloth",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { shabalothPreviousTargets: [], shabalothTargets: ["4", "5"], shabalothTargetsNight: 2 },
    demon: null,
  });
  assert.deepEqual(Object.entries(state.players["7"]!.used!), [
    ["shabalothPreviousTargets", []],
    ["shabalothPreviousNight", undefined],
    ["shabalothTargets", ["4", "5"]],
    ["shabalothTargetsNight", 2],
  ]);
  const { ports, draws } = recordingPorts();
  assert.deepEqual(recordBmrOutcome(state, second, { deathIds: ["4"] }, ports), {
    ok: true,
    deaths: [
      {
        id: "death-1-k100",
        playerId: "4",
        roleId: "chambermaid",
        cause: "ability",
        phase: "night",
        number: 2,
        at: "2030-01-01T00:00:01.000Z",
        impaired: false,
        livingBefore: 9,
        demon: true,
        ability: "shabaloth",
        bmr: true,
        bypassProtection: false,
      },
    ],
    resurrected: null,
  });
  assert.deepEqual(draws, ["id:4", "clock", "id:5", "clock", "id:5", "clock"]);
  assert.deepEqual(JSON.parse(JSON.stringify(state.players["7"]!.used)), {
    shabalothPreviousTargets: [],
    shabalothTargets: ["4", "5"],
    shabalothTargetsNight: 2,
  });
  skipRemaining(state);
  endNightToNext(state);
  const third = roleStepOf(state, "shabaloth").key;
  assert.deepEqual(runChoiceStep(state, "shabaloth", ["4", "6"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-9-shabaloth-7",
      roleId: "shabaloth",
      actorId: "7",
      actorName: "P7",
      order: 9,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      canKill: true,
      canResurrect: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["4", "6"],
      done: true,
      impaired: false,
      noteVars: null,
    },
    effects: [],
    log: [
      {
        id: "log-21-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Шабалот",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "shabaloth",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: {
      shabalothPreviousTargets: ["4", "5"],
      shabalothPreviousNight: 2,
      shabalothTargets: ["4", "6"],
      shabalothTargetsNight: 3,
    },
    demon: null,
  });
  assert.deepEqual(recordBmrOutcome(state, third, { deathIds: [], resurrectId: "4" }).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(state.players["7"]!.used)), {
    shabalothPreviousTargets: ["4", "5"],
    shabalothPreviousNight: 2,
    shabalothTargets: ["4", "6"],
    shabalothTargetsNight: 3,
  });
  assert.deepEqual(state.players["4"]!.alive, true);

  const poisoned = tinkerAndDemon("shabaloth");
  startNight(poisoned);
  skipRemaining(poisoned);
  endNightToNext(poisoned);
  assert.equal(runChoiceStep(poisoned, "shabaloth", ["4", "5"]).ok, true);
  skipRemaining(poisoned);
  endNightToNext(poisoned);
  poisonFor(poisoned, "7", "9", 3);
  assert.deepEqual(runChoiceStep(poisoned, "shabaloth", ["5", "6"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n3-9-shabaloth-7",
      roleId: "shabaloth",
      actorId: "7",
      actorName: "P7",
      order: 9,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      canKill: true,
      canResurrect: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["5", "6"],
      done: true,
      impaired: true,
      noteVars: null,
    },
    effects: [
      {
        id: "fixture-poison-7-3",
        kind: "poison",
        sourceId: "9",
        targetId: "7",
        start: { phase: "night", number: 3 },
        expires: { phase: "night", number: 4 },
        active: true,
      },
    ],
    log: [
      {
        id: "log-19-k1000",
        at: "2030-01-01T00:00:02.000Z",
        phase: "Ночь 3",
        kind: "night",
        title: "Шабалот",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "shabaloth",
        phaseCode: "night",
        phaseNumber: 3,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["clock", "id:5", "clock"],
    used: { shabalothPreviousTargets: [], shabalothTargets: ["4", "5"], shabalothTargetsNight: 2 },
    demon: null,
  });

  const goon = tinkerAndDemon("shabaloth");
  startNight(goon);
  skipRemaining(goon);
  endNightToNext(goon);
  assert.deepEqual(runChoiceStep(goon, "shabaloth", ["5", "3"]), {
    ok: true,
    step: {
      ...OPEN_STEP,
      key: "n2-9-shabaloth-7",
      roleId: "shabaloth",
      actorId: "7",
      actorName: "P7",
      order: 9,
      targetMode: "two",
      minTargets: 2,
      maxTargets: 2,
      canKill: true,
      canResurrect: true,
      note: "Шаг выполнен.",
      noteKey: "note.finished",
      targetIds: ["5", "3"],
      done: true,
      goonImpaired: true,
      goonId: "3",
      goonImpairedOnly: true,
      impaired: true,
      noteVars: null,
    },
    effects: [
      {
        id: "eff-goon-2-3",
        kind: "drunk",
        bmr: "goon",
        sourceId: "7",
        targetId: "7",
        start: { phase: "night", number: 2 },
        expires: { phase: "night", number: 3 },
        active: true,
        permanent: true,
      },
    ],
    log: [
      {
        id: "log-10-k1000",
        at: "2030-01-01T00:00:01.000Z",
        phase: "Ночь 2",
        kind: "effect",
        title: "Наёмник выбран: P7",
        detail: "P7 пьян до заката. Наёмник теперь злой.",
        playerId: "3",
        secret: true,
      },
      {
        id: "log-11-k2000",
        at: "2030-01-01T00:00:03.000Z",
        phase: "Ночь 2",
        kind: "night",
        title: "Шабалот",
        detail: "Шаг выполнен.",
        playerId: null,
        secret: true,
        roleId: "shabaloth",
        phaseCode: "night",
        phaseNumber: 2,
        noteKey: "note.finished",
        noteVars: null,
      },
    ],
    draws: ["id:5", "clock", "clock", "id:5", "clock"],
    used: {},
    demon: null,
  });
});
