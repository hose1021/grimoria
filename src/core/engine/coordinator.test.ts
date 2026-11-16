import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ROLES,
  BMR,
  BMR_ALL,
  SNV,
  SNV_ALL,
  compositionFor,
  isGoodRole,
  roleTeam,
} from "../model/rules.ts";
import { createGame } from "../model/state.ts";
import { badMoonRisingScript, sectsAndVioletsScript } from "../model/scripts.ts";
import {
  applyCommand,
  autoSecrets,
  canonicalState,
  completeStep,
  dealGame,
  endDay,
  endNight,
  executeByDecision,
  kill,
  previewCommand,
  recordBmrOutcome,
  recordSvOutcome,
  skipStep,
  startNight,
  validateCommand,
} from "./index.ts";
import type { GameState, NightStep, RoleId } from "../model/types.ts";

// The coordinator boundaries are the points where two roles meet. Each
// boundary fixture asserts the negative fact that names the stage, so a
// reordered stage fails even when the final survivor count is unchanged.
// Pins: docs/rules-matrix.md. The suite reads game state, never wikitext.

type StepResult = {
  ok: boolean;
  needsRedirect?: boolean;
  result?: {
    noDeath?: boolean;
    deathId?: string;
    hit?: boolean;
  };
};

type CommandView = {
  status: string;
  choice?: { kind: string; options: Array<{ id: string; alive?: boolean }> };
  events: Array<{ type: string }>;
};

function makeTb(assignment: Record<string, string>): GameState {
  const count = Object.keys(assignment).length;
  const state = createGame(count);
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
  state.setup.count = count;
  state.setup.roles = roles;
  state.setup.bluffs =
    count >= 7 ? ALL_ROLES.filter((id) => isGoodRole(id) && !roles.includes(id)).slice(0, 3) : [];
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, JSON.stringify(result));
  autoSecrets(state);
  return state;
}

function makeBmr(assignment: Record<string, RoleId>, count: number): GameState {
  const state = createGame(count);
  state.script = badMoonRisingScript();
  state.scriptId = "bmr";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)!] += 1;
  const target = compositionFor(count, required);
  assert.ok(target, "a legal Bad Moon Rising composition");
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
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) {
    if (full[id]) continue;
    full[id] = spare.shift()!;
  }
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function makeSnv(assignment: Record<string, RoleId>, count: number): GameState {
  const state = createGame(count);
  state.script = sectsAndVioletsScript();
  state.scriptId = "snv";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)!] += 1;
  const target = compositionFor(count, required);
  assert.ok(target, "a legal Sects and Violets composition");
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"] as const) {
    const need = target[team] - counts[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = SNV[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles for fixture");
    roles.push(...pool.slice(0, need));
  }
  assert.equal(roles.length, count, "fixture bag size");
  state.setup.roles = roles;
  state.setup.bluffs = SNV_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) {
    if (full[id]) continue;
    full[id] = spare.shift()!;
  }
  const result = dealGame(state, { assignment: full });
  assert.equal(result.ok, true, JSON.stringify(result));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function skipNight(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step) return;
    const result = skipStep(state, step.key, "fixture");
    assert.equal(result.ok, true, JSON.stringify(result));
  }
  throw new Error("night did not finish");
}

function toDay(state: GameState): void {
  const started = startNight(state);
  assert.equal(started.ok, true, JSON.stringify(started));
  skipNight(state);
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
}

function roleStep(state: GameState, roleId: string): NightStep {
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === roleId && !candidate.done,
  );
  assert.ok(step, "no step for " + roleId);
  return step;
}

function completeRole(
  state: GameState,
  roleId: string,
  options: Parameters<typeof completeStep>[2],
): StepResult {
  const step = roleStep(state, roleId);
  const result = completeStep(state, step.key, options);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result as StepResult;
}

function nightTwoBmr(assignment: Record<string, RoleId>, count: number): GameState {
  const state = makeBmr(assignment, count);
  const started = startNight(state);
  assert.equal(started.ok, true, JSON.stringify(started));
  skipNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  return state;
}

// Five boundaries, five pins. Removing an entry removes its test and fails
// the manifest, so a thin suite cannot pass as a full one.
const BOUNDARIES: Array<{
  id: string;
  role: string;
  revision: string;
  run: () => void;
}> = [
  {
    id: "protection-before-redirect",
    role: "monk",
    revision: "r3124",
    run: protectionBeforeRedirect,
  },
  {
    id: "earlier-protection-spares-the-fool",
    role: "fool",
    revision: "r2636",
    run: earlierProtectionSparesTheFool,
  },
  {
    id: "bypass-versus-impairment",
    role: "assassin",
    revision: "r1786",
    run: bypassVersusImpairment,
  },
  {
    id: "death-before-transformation",
    role: "fang-gu",
    revision: "r2974",
    run: deathBeforeTransformation,
  },
  {
    id: "transformation-before-win",
    role: "mastermind",
    revision: "r2993",
    run: transformationBeforeWin,
  },
];

for (const boundary of BOUNDARIES) {
  test(`${boundary.id} (${boundary.role} ${boundary.revision})`, boundary.run);
}

test("the coordinator manifest covers every stage boundary with a pin", () => {
  assert.deepEqual(
    BOUNDARIES.map((boundary) => boundary.id),
    [
      "protection-before-redirect",
      "earlier-protection-spares-the-fool",
      "bypass-versus-impairment",
      "death-before-transformation",
      "transformation-before-win",
    ],
  );
  for (const boundary of BOUNDARIES) {
    assert.match(boundary.revision, /^r\d+$/, boundary.id + " names its pinned revision");
  }
});

function protectionBeforeRedirect(): void {
  // Monk r3124 Examples: the Monk protects the Mayor, the Imp attacks, no
  // death occurs and the Mayor's "another player dies" ability never triggers.
  const state = makeTb({
    1: "mayor",
    2: "chef",
    3: "monk",
    4: "soldier",
    5: "empath",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  completeRole(state, "poisoner", { targetIds: ["5"] });
  completeRole(state, "monk", { targetIds: ["1"] });
  const deathsBefore = state.deaths.length;
  const attack = completeRole(state, "imp", { targetIds: ["1"] });
  assert.equal(attack.needsRedirect, undefined, "a protected Mayor is never redirected");
  assert.equal(attack.result?.noDeath, true, "the protection blocks the attack");
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.deaths.length, deathsBefore, "no death record exists");
  assert.equal(
    state.log.every((entry) => entry.case !== "mayor-redirect"),
    true,
    "the Storyteller was never asked to redirect",
  );
}

function earlierProtectionSparesTheFool(): void {
  // Fool r2636 Examples: Tea Lady and Innkeeper protection prevents the death,
  // so the Fool's own ability stays unspent.
  const tea = makeBmr(
    {
      1: "fool",
      2: "tealady",
      3: "chambermaid",
      4: "courtier",
      5: "gossip",
      6: "assassin",
      7: "po",
    },
    8,
  );
  const at = { phase: "night" as const, number: 1 };
  assert.equal(kill(tea, "1", "demon", at), null);
  assert.equal(tea.players["1"].used.fool, undefined, "the Tea Lady was the reason");
  assert.equal(tea.players["1"].alive, true);
  assert.equal(tea.deaths.length, 0);

  const inn = makeBmr(
    { 1: "fool", 2: "chambermaid", 3: "courtier", 4: "gossip", 5: "devilsadvocate", 6: "po" },
    8,
  );
  inn.effects.push({
    id: "innkeeper-protect",
    kind: "protected",
    bmr: "innkeeper",
    sourceId: "2",
    targetId: "1",
    start: at,
    active: true,
  });
  assert.equal(kill(inn, "1", "demon", at), null);
  assert.equal(inn.players["1"].used.fool, undefined, "the Innkeeper was the reason");
  assert.equal(inn.players["1"].alive, true);
  assert.equal(inn.deaths.length, 0);
}

function bypassVersusImpairment(): void {
  // Assassin r1786: a sober Assassin kills through every protection; a drunk
  // or poisoned Assassin has no ability. Impairment is not a protection, so
  // the bypass never skips it.
  const state = nightTwoBmr(
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
    8,
  );
  const assassin = roleStep(state, "assassin");
  assert.equal(completeStep(state, assassin.key, { targetIds: ["2"] }).ok, true);
  assert.equal(recordBmrOutcome(state, assassin.key, { deathIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, false, "the Assassin bypasses the Tea Lady");

  const impaired = nightTwoBmr(
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
    8,
  );
  impaired.effects.push({
    id: "test-poison-assassin",
    kind: "poison",
    sourceId: "5",
    targetId: "3",
    start: { phase: "night", number: 2 },
    active: true,
  });
  const impairedStep = roleStep(impaired, "assassin");
  const impairedResult = completeStep(impaired, impairedStep.key, { targetIds: ["2"] });
  assert.equal(impairedResult.ok, true, JSON.stringify(impairedResult));
  assert.equal(impaired.players["2"].alive, true, "an impaired Assassin kills nobody");
  assert.equal(impaired.players["3"].used.assassin, true, "the attempt still spends the ability");
  assert.equal(impairedStep.noteKey, "note.abilityFailed");
}

function deathBeforeTransformation(): void {
  // Fang Gu r2974: the first Outsider killed becomes an evil Fang Gu and the
  // old Demon dies. The death and the character change occur before any win.
  const state = makeSnv({ 1: "klutz", 2: "clockmaker", 7: "fanggu" }, 7);
  toDay(state);
  assert.equal(endDay(state).ok, true);
  const fang = roleStep(state, "fanggu");
  assert.equal(completeStep(state, fang.key, { targetIds: ["1"] }).ok, true);
  assert.equal(recordSvOutcome(state, fang.key, { deathIds: ["1"] }).ok, true);
  assert.equal(state.players["1"].alive, true, "the Outsider survives as the new Demon");
  assert.equal(state.players["1"].roleId, "fanggu");
  assert.equal(state.players["1"].team, "evil");
  assert.equal(state.players["7"].alive, false, "the old Demon dies");
  assert.equal(state.deaths.at(-1)?.playerId, "7", "the old Demon's death is recorded");
  assert.equal(state.winner, null, "the transformation happens before the win stage");
}

function transformationBeforeWin(): void {
  // Mastermind r2993: a Demon execution does not end the game while a living
  // Mastermind can extend play. The win is evaluated only after the extra day.
  const state = makeBmr(
    {
      1: "chambermaid",
      2: "courtier",
      3: "mastermind",
      4: "sailor",
      5: "gossip",
      6: "po",
      7: "fool",
    },
    8,
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
  assert.equal(
    Boolean(state.winner),
    false,
    "the Demon death is not the end while the Mastermind lives",
  );
  assert.equal(state.mastermind?.active, true);
  assert.equal(endDay(state).ok, true);
  skipNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2);
  const extra = executeByDecision(state, "1");
  assert.equal(extra.ok, true, JSON.stringify(extra));
  assert.equal(state.winner?.team, "evil");
  assert.equal(state.winner?.reason, "mastermind");
}

test("a Mayor redirect choice leaves every stage record unchanged", () => {
  // Mayor r2995: the redirect is a Storyteller choice, so the command returns
  // before any death, execution, winner or journal record is committed.
  const state = makeTb({
    1: "mayor",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  const imp = roleStep(state, "imp");
  const before = canonicalState(state);
  const command = {
    id: "coordinator-mayor-choice",
    type: "completeStep",
    payload: { key: imp.key, options: { targetIds: ["1"] } },
  };
  const validation = validateCommand(state, command) as CommandView;
  assert.equal(validation.status, "requires-storyteller-choice");
  assert.equal(validation.choice?.kind, "redirect");
  assert.deepEqual(canonicalState(state), before, "validation never mutates");
  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "requires-storyteller-choice");
  assert.equal(state.deaths.length, 0);
  assert.equal(state.executions.length, 0);
  assert.equal(state.winner, null);
  assert.equal(state.journal.entries.length, 0);
  assert.deepEqual(canonicalState(state), before);
});

test("a winning Slayer shot commits the death and the winner together", () => {
  // Slayer r3122: the chosen Demon dies and good wins. The command boundary
  // must publish the death record and the winner in the same state.
  const state = makeTb({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  const command = {
    id: "coordinator-slayer-win",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "7" },
  };
  const preview = previewCommand(state, command) as CommandView;
  assert.equal(preview.status, "allowed");
  assert.ok(preview.events.some((event) => event.type === "death.recorded"));
  assert.ok(preview.events.some((event) => event.type === "winner.declared"));
  assert.equal(Boolean(state.winner), false, "preview commits nothing");
  assert.equal(state.players["7"].alive, true, "preview commits no death");

  const applied = applyCommand(state, command) as CommandView;
  assert.equal(applied.status, "allowed");
  assert.equal(state.players["7"].alive, false);
  assert.equal(state.deaths.at(-1)?.cause, "slayer");
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead");
  assert.ok(applied.events.some((event) => event.type === "winner.declared"));
});
