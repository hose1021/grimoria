// Cross-role interaction checks for Bad Moon Rising. Each case combines two
// abilities whose pinned texts interact; the expectations come from the exact
// revisions named in docs/rules-matrix.md, not from the current implementation.
import test from "node:test";
import assert from "node:assert/strict";
import { BMR, BMR_ALL, compositionFor, roleTeam } from "../model/rules.ts";
import { createGame } from "../model/state.ts";
import { badMoonRisingScript } from "../model/scripts.ts";
import {
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  infoForStep,
  startNight,
  tinkerDeath,
} from "./index.ts";
import type { GameState, NightStep, RoleId } from "../model/types.ts";

type Assignment = Record<string, RoleId>;

// Builds a legal same-edition bag containing every requested role and deals the
// requested roles to their seats; the remaining seats are drawn from the same
// composition.
function make(assignment: Assignment, count: number): GameState {
  const state = createGame(count);
  state.script = badMoonRisingScript();
  state.scriptId = "bmr";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const have: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) have[roleTeam(id)!] += 1;
  const target = compositionFor(count, required)!;
  const roles = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"] as const) {
    const need = target[team] - have[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    const pool = BMR[team].filter((id) => !roles.includes(id));
    assert.ok(pool.length >= need, "not enough " + team + " roles");
    roles.push(...pool.slice(0, need));
  }
  assert.equal(roles.length, count);
  state.setup.roles = roles;
  state.setup.bluffs = BMR_ALL.filter((id) => !roles.includes(id)).slice(0, count >= 7 ? 3 : 0);
  state.setup.lunaticShownId = roles.includes("lunatic")
    ? roles.find((id) => roleTeam(id) === "demon") || null
    : null;
  const full: Assignment = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) if (!full[id]) full[id] = spare.shift()!;
  const dealt = dealGame(state, { assignment: full });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function stepFor(state: GameState, roleId: RoleId): NightStep {
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === roleId && !candidate.skipped,
  );
  assert.ok(step, roleId + " has a step");
  return step;
}

function livingOthers(state: GameState, actorId: string | null): string[] {
  return state.order.filter((id) => state.players[id].alive && id !== actorId);
}

// Completes every open step with legal defaults. This is the same shape the
// acceptance suite uses: targets from the living pool, a offered info option.
function finishNight(state: GameState): void {
  for (let guard = 0; guard < 60; guard += 1) {
    const step = currentStep(state);
    if (!step) return;
    const pool = state.order.filter(
      (id) => state.players[id].alive && id !== step.actorId && id !== step.previousTarget,
    );
    const targets = pool.slice(0, step.minTargets || 0);
    const info = infoForStep(state, step, { targetIds: targets });
    const options = Array.isArray(info.options) ? info.options : [];
    let given: Record<string, unknown> | undefined;
    const first = options[0];
    if (first !== undefined) {
      if (info.kind === "number") given = { kind: "number", value: Number(first) };
      else if (info.kind === "yes-no") given = { kind: "yes-no", value: Boolean(first) };
      else if (info.kind === "character" || info.kind === "one-of-two")
        given = { kind: info.kind, roleId: String(first) };
    }
    const payload: Record<string, unknown> = { targetIds: targets };
    if (given) payload.given = given;
    if ((step.roleId === "sailor" || step.roleId === "innkeeper") && targets.length) {
      payload.drunkId = targets[0];
    }
    const result = completeStep(state, step.key, payload);
    assert.equal(result.ok, true, JSON.stringify(result));
  }
  assert.fail("night did not finish");
}

function nextNight(state: GameState): void {
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
}

function toDay(state: GameState): void {
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
}

test("a skipped Po night does not consume the three-attack charge (BMR-PO-01, BMR-EXORCIST-01)", () => {
  // Po r3104 and Exorcist r2973: the Exorcist's skipped night does not count;
  // after a night with no Po choice, the next Po night still chooses three.
  const state = make(
    {
      1: "exorcist",
      2: "mastermind",
      3: "chambermaid",
      4: "courtier",
      5: "sailor",
      6: "gossip",
      7: "fool",
      8: "devilsadvocate",
      9: "po",
    },
    10,
  );
  startNight(state);
  nextNight(state); // night 2
  const po = stepFor(state, "po");
  assert.equal(completeStep(state, po.key, {}).ok, true, "the Po may choose nobody");
  nextNight(state); // night 3

  const exorcist = stepFor(state, "exorcist");
  assert.equal(completeStep(state, exorcist.key, { targetIds: ["9"] }).ok, true);
  assert.equal(
    state.night.queue.find((candidate) => candidate.roleId === "po")!.skipped,
    true,
    "the Exorcist skips the Po's night",
  );
  nextNight(state); // night 4

  const later = stepFor(state, "po");
  assert.equal(later.maxTargets, 3, "the skipped night does not consume the charge");
  const targets = livingOthers(state, later.actorId ?? null).slice(0, 3);
  assert.equal(targets.length, 3);
  assert.equal(completeStep(state, later.key, { targetIds: targets }).ok, true);
});

test("a Tinker who dies during the day lets the Godfather kill that night (BMR-GODFATHER-02, BMR-TINKER-01)", () => {
  // Godfather r2394: "If 1 died today, choose a player tonight: they die."
  // Tinker r1782: the Storyteller may kill the Tinker during the day.
  const state = make(
    {
      1: "godfather",
      2: "tinker",
      3: "gossip",
      4: "sailor",
      5: "po",
      6: "chambermaid",
      7: "fool",
      8: "courtier",
      9: "assassin",
    },
    11,
  );
  toDay(state);
  const tinker = tinkerDeath(state, "2");
  assert.equal(tinker.ok, true, JSON.stringify(tinker));
  const ended = endDay(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  assert.equal(stepFor(state, "godfather").actorId, "1", "the Godfather wakes for the day death");
});

test("the Assassin kills a Tea Lady-protected good neighbour (BMR-ASSASSIN-01, BMR-TEALADY-01)", () => {
  // Assassin r1786: "they die, even if for some reason they could not."
  // Tea Lady r1777: both good neighbours cannot die; the Assassin bypasses it.
  const state = make(
    {
      1: "tealady",
      2: "professor",
      3: "sailor",
      4: "chambermaid",
      5: "assassin",
      6: "po",
      7: "fool",
      8: "courtier",
      9: "gossip",
    },
    10,
  );
  startNight(state);
  nextNight(state); // night 2
  const assassin = stepFor(state, "assassin");
  assert.equal(completeStep(state, assassin.key, { targetIds: ["2"] }).ok, true);
  assert.equal(state.players["2"].alive, false, "the protected neighbour still dies");
});
