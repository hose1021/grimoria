// P0.2 of the PR #254 review: the Evil Twin's opposing player is an explicit
// Storyteller choice. The engine never infers it, and the night cannot end
// while a living Evil Twin has no chosen pair.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, exportGame, importGame, publicGameView, realTeamOf } from "../model/state.ts";
import { sectsAndVioletsScript } from "../model/scripts.ts";
import { SNV, SNV_ALL, compositionFor, roleTeam } from "../model/rules.ts";
import {
  applyCommand,
  canonicalState,
  currentStep,
  dealGame,
  endDay,
  endNight,
  previewCommand,
  replay,
  setupErrors,
  skipStep,
  startNight,
  infoForStep,
} from "./index.ts";
import type { GameState, RoleId } from "../model/types.ts";
import { systemPorts } from "../model/ports.ts";
import { ANY_STEP_RESURRECTS_RULESET_VERSION } from "./command-versions.ts";
import { evilTwinHolder, evilTwinPartnerMissing, kill } from "./death.ts";

// The command result is a union; these tests read the rejection fields.
type Outcome = { status: string; errorCode?: string; error?: string };
function outcome(value: unknown): Outcome {
  return value as Outcome;
}

function snvGame(assignment: Record<string, RoleId>, count = 7): GameState {
  const state = createGame(count);
  state.script = sectsAndVioletsScript();
  state.scriptId = "snv";
  state.setup.count = count;
  const required = [...new Set(Object.values(assignment))];
  const counts: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of required) counts[roleTeam(id)!] += 1;
  const target = compositionFor(count, required)!;
  const roles: RoleId[] = [...required];
  for (const team of ["outsider", "townsfolk", "minion", "demon"] as const) {
    const need = target[team] - counts[team];
    assert.ok(need >= 0, "too many " + team + " in fixture");
    roles.push(...SNV[team].filter((id) => !roles.includes(id)).slice(0, need));
  }
  state.setup.roles = roles;
  state.setup.bluffs = SNV_ALL.filter((id) => !roles.includes(id)).slice(0, 3);
  if (roles.includes("eviltwin") && !state.setup.evilTwinGoodId) {
    state.setup.evilTwinGoodId =
      roles.find((id) => roleTeam(id) === "townsfolk" || roleTeam(id) === "outsider") || null;
  }
  const full = { ...assignment };
  const spare = roles.filter((id) => !required.includes(id));
  for (const id of state.order) if (!full[id]) full[id] = spare.shift()!;
  const dealt = dealGame(state, { assignment: full });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function skipAll(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = currentStep(state);
    if (!step) return;
    // Fixture setup, not a host action: skip as the recorded ruleset did.
    const skipped = skipStep(state, step.key).ok
      ? { ok: true }
      : skipStep(state, step.key, "", {
          ...systemPorts,
          rulesetVersion: ANY_STEP_RESURRECTS_RULESET_VERSION,
        });
    assert.equal(skipped.ok, true, JSON.stringify(skipped));
  }
  throw new Error("night did not finish");
}

function skipAllByCommand(state: GameState): void {
  for (let guard = 0; guard < 40; guard += 1) {
    const step = currentStep(state);
    if (!step) return;
    const skipped = outcome(
      applyCommand(state, {
        id: "skip-" + step.key,
        type: "skipStep",
        payload: { key: step.key },
        rulesetVersion: ANY_STEP_RESURRECTS_RULESET_VERSION,
      }),
    );
    assert.equal(skipped.status, "allowed", JSON.stringify(skipped));
  }
  throw new Error("night did not finish");
}

function toSecondNight(state: GameState): void {
  assert.equal(startNight(state).ok, true);
  skipAll(state);
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  assert.equal(endDay(state).ok, true);
}

function createEvilTwin(state: GameState): void {
  const step = state.night.queue.find((candidate) => candidate.roleId === "pithag");
  assert.ok(step, "the Pit-Hag has a step");
  const created = applyCommand(state, {
    id: "pithag-create-eviltwin",
    type: "completeNightStep",
    payload: { key: step.key, targetIds: ["2"], roleId: "eviltwin" },
  });
  assert.equal(created.status, "allowed", JSON.stringify(created));
}

function choosePartner(state: GameState, id: string): void {
  const chosen = applyCommand(state, {
    id,
    type: "manualCorrection",
    payload: {
      change: {
        kind: "twin",
        playerId: "2",
        value: "6",
        reason: "The Storyteller chose the twin.",
      },
    },
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
}

test("a bag with the Evil Twin keeps no automatically chosen good twin (P0.2)", () => {
  const state = createGame(7);
  state.script = sectsAndVioletsScript();
  state.scriptId = "snv";
  state.setup.count = 7;
  const result = applyCommand(state, {
    id: "bag-with-elvtwin",
    type: "bagUpdate",
    payload: {
      patch: {
        roles: ["clockmaker", "dreamer", "seamstress", "oracle", "artist", "eviltwin", "fanggu"],
      },
    },
  });
  assert.equal(result.status, "allowed", JSON.stringify(result));
  assert.equal(state.setup.evilTwinGoodId, null, "the engine does not pick the good twin");

  const errors = setupErrors(state);
  assert.ok(
    errors.some((error) => error.code === "evil-twin-good"),
    "the setup is rejected until the host chooses: " + JSON.stringify(errors),
  );
  const dealt = dealGame(state, {
    assignment: {
      "1": "clockmaker",
      "2": "dreamer",
      "3": "seamstress",
      "4": "oracle",
      "5": "artist",
      "6": "eviltwin",
      "7": "fanggu",
    },
  });
  assert.equal(dealt.ok, false, "an unchosen good twin blocks the deal");
});

test("a retained dead Evil Twin still requires the partner (P0.2)", () => {
  const state = snvGame({
    1: "clockmaker",
    2: "dreamer",
    3: "artist",
    4: "eviltwin",
    5: "oracle",
    6: "vigormortis",
    7: "seamstress",
  });
  state.setup.evilTwinGoodPlayerId = null;
  state.setup.evilTwinPlayerId = null;
  kill(
    state,
    "4",
    "ability",
    { phase: "night", number: 1 },
    { demon: true, ability: "vigormortis" },
  );
  assert.equal(
    evilTwinPartnerMissing(state),
    true,
    "the retained ability cannot run without a chosen pair",
  );
  assert.equal(evilTwinHolder(state)?.id, "4", "the CTA targets the retained holder");
});

test("a twin correction undoes and redoes through the journal (P0.2)", () => {
  const state = snvGame({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 7: "fanggu" });
  toSecondNight(state);
  createEvilTwin(state);
  choosePartner(state, "twin-correction-undo");
  const undone = replay({
    base: state.journal.base,
    entries: state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  assert.equal(undone.state.setup.evilTwinPlayerId, null);
  assert.equal(undone.state.setup.evilTwinGoodPlayerId, null);
  const redone = replay(state.journal);
  assert.equal(redone.ok, true, JSON.stringify(redone));
  assert.equal(redone.state.setup.evilTwinPlayerId, "6");
  assert.equal(redone.state.setup.evilTwinGoodPlayerId, "2");
});

test("a Pit-Hag-created Evil Twin starts unpaired and blocks the end of the night (P0.2)", () => {
  const state = snvGame({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 7: "fanggu" });
  toSecondNight(state);
  createEvilTwin(state);

  assert.equal(state.players["2"].roleId, "eviltwin");
  assert.equal(realTeamOf(state.players["2"]), "good", "the change keeps the alignment");
  assert.equal(state.setup.evilTwinGoodPlayerId, null, "no automatic good twin");
  assert.equal(state.setup.evilTwinPlayerId, null, "no automatic evil twin");
  const step = state.night.queue.find((candidate) => candidate.roleId === "pithag")!;
  assert.equal(step.noteKey, "note.sv.pithagEvilTwinPartner", "the host is told to choose");

  skipAllByCommand(state);
  const before = canonicalState(state);
  const preview = outcome(
    previewCommand(state, {
      id: "end-night-blocked-preview",
      type: "endNight",
      payload: {},
    }),
  );
  assert.equal(preview.status, "rejected", JSON.stringify(preview));
  assert.equal(preview.errorCode, "error.77");
  assert.deepEqual(canonicalState(state), before, "the preview does not change the state");

  const blocked = outcome(
    applyCommand(state, {
      id: "end-night-blocked",
      type: "endNight",
      payload: {},
    }),
  );
  assert.equal(blocked.status, "rejected", "the night cannot end without a partner");
  assert.equal(blocked.errorCode, "error.77");
  assert.equal(state.phase, "night", "the night stays open");

  const restored = importGame(exportGame(state));
  if (!restored.ok) assert.fail(restored.error);
  assert.equal(
    restored.state.setup.evilTwinGoodPlayerId,
    null,
    "an unchosen pair stays unchosen after import",
  );

  choosePartner(state, "choose-twin-partner");
  assert.equal(state.setup.evilTwinGoodPlayerId, "2", "the good holder is the good side");
  assert.equal(state.setup.evilTwinPlayerId, "6", "the host picked the evil side");
  assert.equal(
    JSON.stringify(publicGameView(state)).includes("evilTwin"),
    false,
    "the chosen pair stays out of the public view",
  );

  const ended = applyCommand(state, {
    id: "end-night-allowed",
    type: "endNight",
    payload: {},
  });
  assert.equal(ended.status, "allowed", JSON.stringify(ended));
  assert.equal(state.phase, "day");

  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.state.setup.evilTwinGoodPlayerId, "2");
  assert.equal(replayed.state.setup.evilTwinPlayerId, "6");
  assert.equal(replayed.state.phase, "day");
});

test("an unpaired, dead or impaired holder still gets the missing Evil Twin note (P0.2)", () => {
  const introduction = (state: GameState, prepare: (state: GameState) => void = () => {}) => {
    assert.equal(startNight(state).ok, true);
    prepare(state);
    const step = state.night.queue.find((candidate) => candidate.roleId === "eviltwin")!;
    assert.ok(step, "the Evil Twin has a step");
    const info = infoForStep(state, step);
    assert.equal(info.textKey, "note.sv.evilTwinMissing");
    assert.equal("shown" in info, false, "a missing pair shows nobody");
    return info;
  };
  const unpaired = snvGame({
    1: "clockmaker",
    2: "dreamer",
    4: "eviltwin",
    5: "oracle",
    6: "fanggu",
    7: "seamstress",
  });
  unpaired.setup.evilTwinGoodPlayerId = null;
  unpaired.setup.evilTwinPlayerId = null;
  introduction(unpaired);

  const dead = snvGame({
    1: "clockmaker",
    2: "dreamer",
    4: "eviltwin",
    5: "oracle",
    6: "fanggu",
    7: "seamstress",
  });
  introduction(dead, (state) => kill(state, "4", "ability", { phase: "night", number: 1 }));

  const impaired = snvGame({
    1: "clockmaker",
    2: "dreamer",
    4: "eviltwin",
    5: "oracle",
    6: "fanggu",
    7: "seamstress",
  });
  impaired.effects.push({
    id: "eviltwin-introduction-poison",
    kind: "poison",
    sourceId: "6",
    targetId: "4",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  introduction(impaired);
});

test("an unchosen pair never awards the Evil Twin win or the good-win block (P0.2)", () => {
  const state = snvGame({ 1: "clockmaker", 2: "dreamer", 6: "pithag", 7: "fanggu" });
  toSecondNight(state);
  createEvilTwin(state);
  skipAll(state);
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
  const executed = applyCommand(state, {
    id: "execute-unpaired-twin",
    type: "executeByDecision",
    payload: { playerId: "2" },
  });
  assert.equal(executed.status, "allowed", JSON.stringify(executed));
  assert.equal(state.winner, null, "an unchosen pair has no execution win");
});
