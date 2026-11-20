// Independent cross-role oracle. Every expected outcome below is hand-derived
// from the pinned official text named in docs/rules-matrix.md (the oldid in the
// comment and the rule identifier), never from the engine. The fixture setup
// uses the same domain helpers as the other suites; every mutation that the
// assertion is about runs through validateCommand/applyCommand, so its journal,
// undo and redo are real. A test that the pinned text does not decide is not
// written here.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, publicGameView, validateState } from "../model/state.ts";
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
  appendConditionalSteps,
  applyCommand,
  canonicalState,
  chooseDemonHeir,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  infoForStep,
  isImpaired,
  kill,
  replay,
  startNight,
  targetBounds,
  validateCommand,
} from "./index.ts";
import type { AllowedResult, GameState, NightStep, RoleId, Script } from "../model/types.ts";
import type { InfoResult } from "./information.ts";

const EDITIONS: Record<string, { script: () => Script; table: typeof TB; all: RoleId[] }> = {
  tb: { script: troubleBrewingScript, table: TB, all: ALL_ROLES },
  bmr: { script: badMoonRisingScript, table: BMR, all: BMR_ALL },
  snv: { script: sectsAndVioletsScript, table: SNV, all: SNV_ALL },
};

// A legal bag holding every requested role; the rest of the composition is
// filled from the same edition and the extras are derived deterministically.
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

// Completes every open step with legal defaults. Fixture setup only; the
// consequence under test is always a later command.
function finishNight(state: GameState): void {
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
    const targetIds = pool.slice(0, targetBounds(step).min);
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

/** A quiet first night and day, leaving the second night's queue open. */
function goToNightTwo(state: GameState): void {
  if (state.phase !== "night") assert.equal(startNight(state).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.night.number, 2);
}

let sequence = 0;

/** One legal command on the command path, checked before and after it runs. */
function command(
  state: GameState,
  type: string,
  payload: Record<string, unknown> = {},
): AllowedResult {
  const cmd = { id: "oracle-" + ++sequence, type, payload };
  const check = validateCommand(state, cmd);
  if (check.status !== "allowed") assert.fail(type + " must be legal: " + JSON.stringify(check));
  const result = applyCommand(state, cmd);
  if (result.status !== "allowed") assert.fail(type + " must apply: " + JSON.stringify(result));
  assert.deepEqual(validateState(state), [], type + " must leave a valid state");
  return result;
}

/**
 * The undo is the journal without its last entry; the redo is the full journal.
 * Both rebuild the whole rule state, so an assertion here proves the command
 * stored enough to reconstruct its consequence.
 */
function assertJournalRoundTrip(state: GameState, before: Record<string, unknown>): void {
  const live = canonicalState(state);
  const replayed = replay(state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), live, "the journal rebuilds the live state");

  const undone = replay({
    base: state.journal.base,
    entries: state.journal.entries.slice(0, -1),
  });
  assert.equal(undone.ok, true, JSON.stringify(undone));
  if (!undone.ok) return;
  assert.deepEqual(canonicalState(undone.state), before, "undo restores the pre-command state");

  const redone = replay(state.journal);
  assert.equal(redone.ok, true, JSON.stringify(redone));
  if (!redone.ok) return;
  assert.deepEqual(canonicalState(redone.state), live, "redo returns the applied state");
}

const SECRET_KEYS = ["roleId", "shownRoleId", "bluffs", "notes", "effects", "journal"];

/** The player-facing view never carries a character, a choice or a secret. */
function assertPublicViewHides(state: GameState, extras: string[] = []): void {
  const text = JSON.stringify(publicGameView(state));
  for (const secret of [...SECRET_KEYS, ...extras]) {
    assert.equal(text.includes(secret), false, "the public view leaks " + secret);
  }
}

// ---------------------------------------------------------------------------
// Trouble Brewing

// Mayor r2995: "If you die at night, another player might die instead." How to
// Run: the Storyteller chooses "if the Mayor actually dies, or if the Mayor
// remains alive and another character dies instead". The How to Run summary
// also fixes the dead/Soldier/Monk cases: "If the Demon attacks the Mayor, and
// the Storyteller instead chooses a dead player, the Soldier, or a player
// protected by the Monk, that player does not die tonight." Imp r3116 supplies
// the attack.
test("a Mayor redirect kills the named player instead, and an impossible redirect kills nobody (TB-MAYOR-01, TB-IMP-01)", () => {
  const state = make(
    "tb",
    {
      1: "mayor",
      2: "chef",
      3: "monk",
      4: "soldier",
      5: "empath",
      6: "poisoner",
      7: "imp",
    },
    7,
  );
  startNight(state);
  // The Poisoner is a fixture detail: keep the Mayor healthy for the attack.
  assert.equal(completeStep(state, stepFor(state, "poisoner").key, { targetIds: ["2"] }).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(isImpaired(state, "1"), false, "the night-one poison ended at dusk");
  const imp = stepFor(state, "imp");

  const before = canonicalState(state);
  const asked = applyCommand(state, {
    id: "oracle-mayor-ask",
    type: "completeNightStep",
    payload: { key: imp.key, targetIds: ["1"] },
  });
  assert.equal(asked.status, "requires-storyteller-choice", JSON.stringify(asked));
  if (asked.status !== "requires-storyteller-choice") return;
  assert.equal(asked.choice.kind, "redirect", "the host decides the Mayor's survival");
  assert.deepEqual(
    (asked.choice.options as Array<{ id: string }>).map((option) => option.id).sort(),
    ["2", "3", "4", "5", "6", "7"],
    "every other player is a legal redirect target",
  );
  assert.deepEqual(canonicalState(state), before, "the question changes nothing");
  assert.equal(state.journal.entries.length, 0, "and is not journaled");

  const applied = applyCommand(state, {
    id: "oracle-mayor-redirect",
    type: "completeNightStep",
    payload: { key: imp.key, targetIds: ["1"], redirectId: "2" },
  });
  assert.equal(applied.status, "allowed", JSON.stringify(applied));
  assert.equal(state.players["1"].alive, true, "the Mayor survives");
  assert.equal(state.players["2"].alive, false, "the named player dies instead");
  assert.equal(state.deaths.at(-1)!.playerId, "2");
  assert.equal(state.deaths.at(-1)!.cause, "demon");
  assert.equal(
    state.log.some((line) => line.case === "mayor-redirect" && line.secret === true),
    true,
    "the Storyteller's choice is secret",
  );
  assert.deepEqual(publicGameView(state).deaths, [], "a night death is announced at dawn");
  assertPublicViewHides(state, ["mayor", "imp", "redirect"]);
  assert.deepEqual(validateState(state), []);
  assertJournalRoundTrip(state, before);

  // The same attack on a fresh fixture, redirected to an already dead player:
  // "that player does not die tonight" and the Mayor stays alive.
  const deadTarget = make(
    "tb",
    {
      1: "mayor",
      2: "chef",
      3: "monk",
      4: "soldier",
      5: "empath",
      6: "poisoner",
      7: "imp",
    },
    7,
  );
  startNight(deadTarget);
  assert.equal(
    completeStep(deadTarget, stepFor(deadTarget, "poisoner").key, { targetIds: ["2"] }).ok,
    true,
  );
  finishNight(deadTarget);
  assert.equal(endNight(deadTarget).ok, true);
  assert.equal(endDay(deadTarget).ok, true);
  assert.equal(isImpaired(deadTarget, "1"), false, "the Mayor is healthy for the attack");
  kill(deadTarget, "2", "test");
  const deaths = deadTarget.deaths.length;
  const deadImp = stepFor(deadTarget, "imp");
  const impossible = applyCommand(deadTarget, {
    id: "oracle-mayor-dead-target",
    type: "completeNightStep",
    payload: { key: deadImp.key, targetIds: ["1"], redirectId: "2" },
  });
  assert.equal(impossible.status, "allowed", JSON.stringify(impossible));
  assert.equal(deadTarget.players["1"].alive, true, "the Mayor survives");
  assert.equal(
    deadTarget.deaths.length,
    deaths,
    "no additional death is recorded for a target that cannot die again",
  );
});

// Slayer r3122: "if the chosen player is an alive Demon, declare that the chosen
// player dies". Recluse r3007: "You might register as evil & as a Minion or
// Demon, even if dead"; the worked example is the Slayer killing a Recluse that
// registers as the Imp, and "the game continues". States r1039: execution is
// different from death, and a dead player cannot die again.
test("a Slayer shot on a Recluse registered as the Demon kills it without ending the game (TB-SLAYER-01, TB-RECLUSE-01)", () => {
  const state = make(
    "tb",
    {
      1: "slayer",
      2: "chef",
      3: "monk",
      4: "soldier",
      5: "recluse",
      6: "empath",
      7: "poisoner",
      8: "imp",
    },
    8,
  );
  startNight(state);
  // Keep the Recluse sober: a poisoned registrant does not register (States).
  assert.equal(completeStep(state, stepFor(state, "poisoner").key, { targetIds: ["2"] }).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(isImpaired(state, "5"), false, "the Recluse is sober");

  const before = canonicalState(state);
  const shot = applyCommand(state, {
    id: "oracle-slayer-recluse",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "5", options: { recluseRegistersDemon: true } },
  });
  assert.equal(shot.status, "allowed", JSON.stringify(shot));
  if (shot.status !== "allowed") return;
  assert.equal(shot.result?.hit, true);
  assert.equal(state.players["5"].alive, false, "the registered Demon dies");
  assert.equal(state.players["1"].used.slayer, true, "the once-per-game ability is spent");
  assert.equal(Boolean(state.winner), false, "the real Imp is still alive, so the game continues");
  assert.notEqual(state.deaths.at(-1)!.cause, "execution", "the shot is a death, not an execution");
  assert.equal(state.deaths.at(-1)!.roleId, "recluse", "the real role stays in the secret record");
  assert.equal(state.day.execution ?? null, null, "no execution was recorded");
  assertPublicViewHides(state, ["recluse", "slayer", "imp"]);
  assertJournalRoundTrip(state, before);

  const again = applyCommand(state, {
    id: "oracle-slayer-again",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "7" },
  });
  assert.notEqual(again.status, "allowed", "the spent Slayer cannot shoot twice");

  // Executing the real Imp then wins for good; the earlier shot did not.
  const executed = applyCommand(state, {
    id: "oracle-slayer-execute-demon",
    type: "executeByDecision",
    payload: { playerId: "8" },
  });
  assert.equal(executed.status, "allowed", JSON.stringify(executed));
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead");
});

// Virgin r1729: "The 1st time you are nominated, if the nominator is a
// Townsfolk, they are executed immediately." How to Run: "End the nomination
// process and proceed to the night phase. (No one else can be executed today.)"
// The ability is spent even when the nominator is not a Townsfolk.
test("a Townsfolk nominator of the Virgin is executed at once and the day closes (TB-VIRGIN-01)", () => {
  const state = make(
    "tb",
    {
      1: "virgin",
      2: "chef",
      3: "empath",
      4: "monk",
      5: "soldier",
      6: "poisoner",
      7: "imp",
    },
    7,
  );
  startNight(state);
  // Keep the Virgin sober: an impaired Virgin has no ability (States r1039).
  assert.equal(completeStep(state, stepFor(state, "poisoner").key, { targetIds: ["3"] }).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");
  assert.equal(isImpaired(state, "1"), false, "the Virgin is sober");

  command(state, "openNominations");
  const before = canonicalState(state);
  const nominated = command(state, "nominate", { nominatorId: "2", nomineeId: "1" });
  assert.equal(nominated.result?.ok, true);
  assert.equal(state.players["2"].alive, false, "the Townsfolk nominator is executed");
  assert.equal(state.players["1"].used.virgin, true, "the Virgin's ability is spent");
  assert.equal(state.day.execution?.playerId, "2");
  assert.equal(state.day.ended, true, "the nomination process ends at once");
  assert.equal(state.day.open, false);
  assert.equal(state.winner, null, "an execution of a good Townsfolk does not win for evil");
  assertPublicViewHides(state, ["virgin", "chef"]);
  assert.equal(publicGameView(state).deaths.includes("P2"), true, "the execution is public");
  assertJournalRoundTrip(state, before);

  const second = applyCommand(state, {
    id: "oracle-virgin-second",
    type: "nominate",
    payload: { nominatorId: "3", nomineeId: "4" },
  });
  assert.notEqual(second.status, "allowed", "no second execution happens that day");
});

// ---------------------------------------------------------------------------
// Bad Moon Rising

/** The legal target set for a step, in the engine's declared target mode. */
function nightTargets(state: GameState, step: NightStep): string[] {
  const bounds = targetBounds(step);
  if (bounds.max === 0) return [];
  const pool = state.order.filter(
    (id) => state.players[id].alive && id !== step.actorId && id !== step.previousTarget,
  );
  return pool.slice(0, Math.max(bounds.min, 1));
}

/**
 * Plays every remaining open step through applyCommand, declining optional
 * steps and skipping a step whose actor is dead. A fixture that needs a
 * specific consequence completes that step itself first.
 */
function playNight(state: GameState): void {
  for (let guard = 0; guard < 80; guard += 1) {
    const pending = state.night.queue.find((step) => step.pending?.kind === "demon-inheritance");
    if (pending) {
      const option = pending.pending!.options?.[0] as { id: string } | undefined;
      assert.ok(option, "the pending inheritance offers an heir");
      command(state, "chooseDemonHeir", { stepKey: pending.key, heirId: option.id });
      continue;
    }
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    if (!step) return;
    const actor = step.actorId ? state.players[step.actorId] : null;
    if (actor && !actor.alive) {
      command(state, "skipStep", { key: step.key, reason: "the actor is dead" });
      continue;
    }
    if (step.kind === "system") {
      command(state, "completeNightStep", { key: step.key });
      continue;
    }
    if (step.optional) {
      command(state, "skipStep", { key: step.key, reason: "declined" });
      continue;
    }
    const targetIds = nightTargets(state, step);
    const info = infoForStep(state, step, { targetIds });
    const given = givenFor(info) ?? (info.needsChoice ? { kind: "note", text: "oracle" } : null);
    const payload: Record<string, unknown> = { key: step.key, targetIds };
    if (given) payload.given = given;
    if (step.roleChoices?.length) payload.roleId = step.roleChoices[0];
    if ((step.roleId === "sailor" || step.roleId === "innkeeper") && targetIds.length)
      payload.drunkId = targetIds[0];
    const check = validateCommand(state, {
      id: "oracle-probe-" + ++sequence,
      type: "completeNightStep",
      payload,
    });
    if (check.status === "requires-storyteller-choice" && check.choice.kind === "redirect") {
      payload.redirectId = (check.choice.options[0] as { id: string }).id;
    }
    command(state, "completeNightStep", payload);
  }
  assert.fail("the night did not finish");
}

// Pukka r3074: "Each night, choose a player: they are poisoned. The previously
// poisoned player dies then becomes healthy." How to Run: the previous victim
// dies "each night except the first"; the example fixes the order: the new
// poison lands first, so a newly poisoned protector cannot save the old victim.
test("the Pukka's new poison lands before the old victim dies, and undo restores both (BMR-PUKKA-01, BMR-PUKKA-02)", () => {
  const state = make(
    "bmr",
    {
      1: "pukka",
      2: "chambermaid",
      3: "courtier",
      4: "sailor",
      5: "gossip",
      6: "mastermind",
    },
    7,
  );
  startNight(state);
  assert.equal(completeStep(state, stepFor(state, "pukka").key, { targetIds: ["2"] }).ok, true);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(endDay(state).ok, true);
  assert.equal(state.players["2"].alive, true, "the first victim is only poisoned so far");
  assert.equal(isImpaired(state, "2"), true);

  const before = canonicalState(state);
  const pukka = stepFor(state, "pukka");
  command(state, "completeNightStep", { key: pukka.key, targetIds: ["3"] });

  assert.equal(state.players["2"].alive, false, "the previously poisoned player dies");
  assert.equal(state.deaths.at(-1)!.playerId, "2");
  assert.equal(state.deaths.at(-1)!.number, 2);
  assert.equal(state.deaths.at(-1)!.impaired, true, "the victim dies while still poisoned");
  assert.equal(isImpaired(state, "2"), false, "the dead victim becomes healthy");
  assert.equal(isImpaired(state, "3"), true, "the new target is poisoned tonight");
  assert.equal(
    state.effects.some(
      (effect) => effect.pukka === true && effect.targetId === "3" && effect.active,
    ),
    true,
    "the new poison is stored, not just named",
  );
  assert.equal(
    publicGameView(state).deaths.includes("P2"),
    false,
    "the night death is not public yet",
  );
  assertPublicViewHides(state, ["pukka", "chambermaid"]);
  assert.deepEqual(validateState(state), []);
  assertJournalRoundTrip(state, before);

  playNight(state);
  command(state, "endNight");
  assert.equal(publicGameView(state).deaths.includes("P2"), true, "the death is announced at dawn");
});

// Tea Lady r1777: "If both your alive neighbors are good, they can't die... The
// only exception is the Assassin, who can kill someone protected from death."
// Assassin r1786: "If the Assassin attacks the Goon, the Goon dies and turns
// evil." Goon r2977: "Each night, the 1st player to choose you with their
// ability is drunk until dusk. You become their alignment."
test("an Assassin kills the Tea Lady's protected Goon, and the Goon still turns evil (BMR-TEALADY-01, BMR-ASSASSIN-01, BMR-GOON-01)", () => {
  const state = make(
    "bmr",
    {
      1: "goon",
      2: "tealady",
      3: "chambermaid",
      4: "courtier",
      5: "sailor",
      6: "po",
      7: "assassin",
      8: "gossip",
    },
    8,
  );
  goToNightTwo(state);
  // The Po's first woke night is night two; keep its kill away from the Tea
  // Lady and her neighbours so the protection under test stays active.
  command(state, "completeNightStep", {
    key: stepFor(state, "po").key,
    targetIds: ["4"],
    deathIds: ["4"],
  });
  assert.equal(state.players["4"].alive, false, "the fixture's Po kill lands elsewhere");
  assert.equal(state.players["1"].alive, true);
  assert.equal(state.players["2"].alive, true);
  assert.equal(state.players["3"].alive, true);

  const before = canonicalState(state);
  const assassin = stepFor(state, "assassin");
  command(state, "completeNightStep", {
    key: assassin.key,
    targetIds: ["1"],
    deathIds: ["1"],
  });

  assert.equal(state.players["1"].alive, false, "the Assassin bypasses the Tea Lady");
  assert.equal(state.players["1"].team, "evil", "the Goon takes the Assassin's alignment");
  assert.equal(state.players["7"].used.assassin, true, "the once-per-game ability is spent");
  assert.equal(isImpaired(state, "7"), true, "the Goon's first chooser is drunk until dusk");
  assert.equal(isImpaired(state, "7", { phase: "day", number: 2 }), true, "through the next day");
  assert.equal(state.winner, null);
  assertPublicViewHides(state, ["goon", "assassin", "tealady"]);
  assertJournalRoundTrip(state, before);

  // The drunk ends at the next dusk: the Assassin would recover, but the
  // ability is already spent.
  playNight(state);
  command(state, "endNight");
  assert.equal(isImpaired(state, "7"), true, "still drunk through the following day");
  command(state, "endDay");
  assert.equal(isImpaired(state, "7"), false, "the Goon's drunk ends at dusk");
});

// Mastermind r2993: "If the Demon dies by execution (ending the game), play for
// 1 more day. If a player is then executed, their team loses." Summary: "A dead
// Demon does not get to attack. They lose their ability, as normal. During this
// extra night and day, other characters' abilities function as normal."
test("the Mastermind's intervening night lets the Assassin kill, and the extra-day execution decides the game (BMR-MASTERMIND-01)", () => {
  const state = make(
    "bmr",
    {
      1: "pacifist",
      2: "fool",
      3: "tealady",
      4: "professor",
      5: "sailor",
      6: "gossip",
      7: "courtier",
      8: "mastermind",
      9: "assassin",
      10: "po",
    },
    10,
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");

  const beforeExecution = canonicalState(state);
  command(state, "executeByDecision", { playerId: "10" });
  assert.equal(state.players["10"].alive, false, "the Demon is executed");
  assert.equal(Boolean(state.winner), false, "the Demon's execution does not end the game");
  assert.equal(state.mastermind?.active, true);
  assert.equal(state.mastermind?.extraDay, false);
  assert.equal(state.mastermind?.triggerDay, 1);
  assert.notEqual(state.phase, "over");
  assertJournalRoundTrip(state, beforeExecution);

  command(state, "endDay");
  assert.equal(state.phase, "night");
  assert.equal(state.night.number, 2, "the intervening night is played");
  const assassin = stepFor(state, "assassin");
  command(state, "completeNightStep", {
    key: assassin.key,
    targetIds: ["1"],
    deathIds: ["1"],
  });
  assert.equal(
    state.players["1"].alive,
    false,
    "the living Minion's ability works during the intervening night",
  );
  playNight(state);
  command(state, "endNight");
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2, "the extra day follows the intervening night");
  assert.equal(state.mastermind?.extraDay, true);
  assert.equal(Boolean(state.winner), false);
  assertPublicViewHides(state, ["mastermind", "assassin"]);

  const beforeVerdict = canonicalState(state);
  command(state, "executeByDecision", { playerId: "9" });
  assert.equal(state.winner?.team, "good", "an evil player's execution on the extra day loses");
  assert.equal(state.winner?.reason, "mastermind");
  assert.deepEqual(publicGameView(state).winner, { team: "good", reason: "mastermind" });
  assertJournalRoundTrip(state, beforeVerdict);
});

// Zombuul r3022: "The 1st time you die, you live but register as dead." Summary:
// "The seemingly dead Zombuul counts as a dead player in almost every way...
// The second time the Zombuul dies, they die for real and good wins."
test("the Zombuul's first death registers it dead and its second death wins for good (BMR-ZOMBUUL-01, BMR-ZOMBUUL-02)", () => {
  const state = make(
    "bmr",
    { 1: "zombuul", 2: "assassin", 3: "pacifist", 4: "fool", 5: "tealady" },
    5,
  );
  startNight(state);
  finishNight(state);
  assert.equal(endNight(state).ok, true);
  assert.equal(state.phase, "day");

  const before = canonicalState(state);
  command(state, "executeByDecision", { playerId: "1" });
  assert.equal(state.players["1"].alive, true, "the first death is not real");
  assert.equal(state.players["1"].registeredDead, true, "but it registers as dead");
  assert.equal(state.players["1"].used.zombuul, true, "the first-death token is spent");
  assert.equal(Boolean(state.winner), false, "the game continues");
  assert.equal(
    state.log.some((line) => line.consequence === "prevented"),
    true,
    "the secret log records the prevention",
  );
  assert.equal(publicGameView(state).deaths.includes("P1"), true, "the town sees it die");
  assert.equal(publicGameView(state).living, 4, "the public count treats it as dead");
  assertPublicViewHides(state, ["zombuul", "registeredDead"]);
  assertJournalRoundTrip(state, before);

  command(state, "endDay");
  assert.equal(state.phase, "night");
  assert.equal(
    state.night.queue.some((step) => step.roleId === "zombuul" && !step.done && !step.skipped),
    false,
    "a death today keeps the Zombuul from waking",
  );
  playNight(state);
  command(state, "endNight");
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2);

  command(state, "executeByDecision", { playerId: "1" });
  assert.equal(state.players["1"].alive, false, "the second death is real");
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead");
});

// ---------------------------------------------------------------------------
// Sects & Violets

// Pit-Hag r2998: "Each night*, choose a player & a character they become (if not
// in play). If a Demon is made, deaths tonight are arbitrary." Summary: "they
// can't create duplicate characters", the alignment "changes a player's
// character, but not their alignment", and — because "all Demons must die for
// good to win" — a game with two living Demons does not end for good.
test("a Pit-Hag-created Demon gets no turn, and good cannot win while it lives (SNV-PITHAG-01)", () => {
  const state = make(
    "snv",
    {
      1: "pithag",
      2: "clockmaker",
      3: "savant",
      4: "artist",
      5: "klutz",
      6: "sage",
      7: "fanggu",
    },
    7,
  );
  goToNightTwo(state);
  const before = canonicalState(state);
  const pithag = stepFor(state, "pithag");
  const previous = state.players["3"].roleId;
  assert.equal(previous, "savant");

  command(state, "completeNightStep", {
    key: pithag.key,
    targetIds: ["3"],
    roleId: "vortox",
    deathIds: ["7"],
  });

  assert.equal(state.players["3"].roleId, "vortox", "the target becomes the new Demon");
  assert.equal(state.players["3"].shownRoleId, "vortox");
  assert.equal(state.players["3"].changedFrom, "savant");
  assert.equal(state.players["3"].team, "good", "the character changes, the alignment does not");
  assert.equal(state.players["7"].alive, false, "the old Demon dies as an arbitrary death");
  const inPlay = Object.values(state.players).map((player) => player.roleId);
  assert.equal(
    new Set(inPlay).size,
    inPlay.length,
    "the Pit-Hag cannot create a duplicate character: " + JSON.stringify(inPlay),
  );
  assert.equal(
    state.night.queue.some(
      (step) => step.roleId === "vortox" && !step.done && !step.skipped && step.actorId === "3",
    ),
    false,
    "the created Demon takes no normal Demon turn tonight",
  );
  assert.equal(Boolean(state.winner), false, "the new Demon is alive, so good cannot win");
  assertPublicViewHides(state, ["vortox", "pithag", "fanggu"]);
  assert.deepEqual(validateState(state), []);
  assertJournalRoundTrip(state, before);

  playNight(state);
  command(state, "endNight");
  assert.equal(state.phase, "day");
  assert.equal(Boolean(state.winner), false, "dawn with a living Demon does not end the game");

  command(state, "executeByDecision", { playerId: "3" });
  assert.equal(state.players["3"].alive, false, "the last Demon dies");
  assert.equal(state.winner?.team, "good");
  assert.equal(state.winner?.reason, "demon-dead");
});

// Barber r1757: "If you died today or tonight, the Demon may choose 2 players
// (not another Demon) to swap characters." The players' alignments stay the
// same. Evil Twin r3101: "If the good player is executed, evil wins." The pair
// is two players, so a Barber swap does not move the win to the new character.
test("a Barber swap keeps alignments, and the good twin's execution still wins for evil (SNV-BARBER-01, SNV-EVILTWIN-01)", () => {
  const state = make(
    "snv",
    {
      1: "clockmaker",
      2: "barber",
      6: "eviltwin",
      7: "pithag",
      11: "fanggu",
    },
    11,
  );
  goToNightTwo(state);
  const goodTwin = state.setup.evilTwinGoodPlayerId;
  assert.ok(goodTwin, "the deal names the good twin");
  assert.equal(state.setup.evilTwinPlayerId, "6", "the Evil Twin is the Minion seat");
  // The Barber dies tonight; the death-triggered step is the fixture, the swap
  // below is the command under test.
  kill(state, "2", "ability", { phase: "night", number: 2 }, { demon: true, ability: "fanggu" });
  appendConditionalSteps(state);
  const barber = stepFor(state, "barber");
  const partner = state.order.find(
    (id) =>
      id !== goodTwin &&
      id !== "2" &&
      id !== "6" &&
      id !== "7" &&
      id !== "11" &&
      state.players[id].alive,
  );
  assert.ok(partner, "a third living player exists");
  const goodRole = state.players[goodTwin].roleId;
  const partnerRole = state.players[partner].roleId;
  const goodTeam = state.players[goodTwin].team;

  const before = canonicalState(state);
  command(state, "completeNightStep", { key: barber.key, targetIds: [goodTwin, partner] });
  assert.equal(state.players[goodTwin].roleId, partnerRole, "the characters swap");
  assert.equal(state.players[partner].roleId, goodRole);
  assert.equal(state.players[goodTwin].team, goodTeam, "the alignment does not change");
  assert.equal(state.setup.evilTwinGoodPlayerId, goodTwin, "the pair is by player, not character");
  assertPublicViewHides(state, ["barber", "eviltwin", "clockmaker"]);
  assert.deepEqual(validateState(state), []);
  assertJournalRoundTrip(state, before);

  // The night must finish before the day: keep the Demon's kill away from the
  // twins, and make the Pit-Hag's choice a character already in play.
  command(state, "completeNightStep", {
    key: stepFor(state, "fanggu").key,
    targetIds: ["4"],
    deathIds: ["4"],
  });
  command(state, "completeNightStep", {
    key: stepFor(state, "pithag").key,
    targetIds: ["5"],
    roleId: state.players["1"].roleId,
  });
  playNight(state);
  command(state, "endNight");
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 2);
  assert.equal(state.players[goodTwin].alive, true, "the good twin survived the night");

  const beforeVerdict = canonicalState(state);
  command(state, "executeByDecision", { playerId: goodTwin });
  assert.equal(state.winner?.team, "evil");
  assert.equal(state.winner?.reason, "evil-twin", "the good twin's execution wins for evil");
  assertJournalRoundTrip(state, beforeVerdict);
});

// Snake Charmer r2905: "Each night, choose an alive player: a chosen Demon swaps
// characters & alignments with you & is then poisoned." How to Run: the new
// Demon wakes, and the new Snake Charmer is poisoned permanently. The next
// night's death is the new Demon's.
test("a Snake Charmer swap keeps the new Snake Charmer poisoned across dawn, and the new Demon kills (SNV-SNAKECHARMER-01)", () => {
  const state = make("snv", { 1: "clockmaker", 6: "snakecharmer", 7: "fanggu" }, 7);
  goToNightTwo(state);
  assert.equal(state.players["6"].roleId, "snakecharmer");
  assert.equal(state.players["7"].roleId, "fanggu");

  const before = canonicalState(state);
  const snake = stepFor(state, "snakecharmer");
  command(state, "completeNightStep", { key: snake.key, targetIds: ["7"] });

  assert.equal(state.players["6"].roleId, "fanggu");
  assert.equal(state.players["6"].team, "evil");
  assert.equal(state.players["7"].roleId, "snakecharmer");
  assert.equal(state.players["7"].team, "good");
  const poison = state.effects.find(
    (effect) => effect.kind === "poison" && effect.targetId === "7" && effect.active,
  );
  assert.ok(poison, "the new Snake Charmer is poisoned");
  assert.equal(poison.expires, null, "the poison is permanent");
  assert.equal(isImpaired(state, "7"), true);
  const demonStep = state.night.queue.find(
    (candidate) => candidate.roleId === "fanggu" && !candidate.done && !candidate.skipped,
  );
  assert.ok(demonStep, "the new Demon wakes tonight");
  assert.equal(demonStep.actorId, "6");
  assert.equal(
    state.night.queue.filter(
      (candidate) => candidate.actorId === "7" && !candidate.done && !candidate.skipped,
    ).length,
    0,
    "the new Snake Charmer does not wake again this night",
  );
  assert.equal(state.winner, null);
  assertPublicViewHides(state, ["snakecharmer", "fanggu"]);
  assertJournalRoundTrip(state, before);

  command(state, "completeNightStep", {
    key: demonStep.key,
    targetIds: ["1"],
    deathIds: ["1"],
  });
  assert.equal(state.players["1"].alive, false, "the new Demon's kill lands");
  playNight(state);
  command(state, "endNight");
  assert.equal(state.phase, "day");
  assert.equal(isImpaired(state, "7"), true, "the permanent poison survives the dawn");
  assert.equal(state.effects.find((effect) => effect.id === poison.id)?.active, true);
});

// States r1039: "Regardless of whether the group executes an alive or dead
// player, this counts as the one execution allowed for the day." Vortox r3017:
// "Each day, if no-one is executed, evil wins." A Cerenovus madness execution
// is therefore an execution, so it suppresses the Vortox's no-execution win.
test("a madness execution counts as the day's execution and stops the Vortox win (SNV-CERENOVUS-01, SNV-VORTOX-01)", () => {
  const state = make("snv", { 1: "clockmaker", 2: "cerenovus", 8: "vortox" }, 8);
  startNight(state);
  const cerenovus = stepFor(state, "cerenovus");
  command(state, "completeNightStep", {
    key: cerenovus.key,
    targetIds: ["3"],
    roleId: "clockmaker",
  });
  assert.equal(
    state.effects.some((effect) => effect.madness === "cerenovus"),
    true,
  );

  // An information-only answer changes no seat, effect or death, and the
  // answer is not public. The living Vortox forbids the true value, so the
  // host's answer is a false one; that is still only an answer.
  const clock = stepFor(state, "clockmaker");
  const clockGiven = givenFor(infoForStep(state, clock));
  const seatsBefore = JSON.stringify(state.players);
  const effectsBefore = JSON.stringify(state.effects);
  const deathsBefore = JSON.stringify(state.deaths);
  command(state, "completeNightStep", {
    key: clock.key,
    targetIds: [],
    ...(clockGiven ? { given: clockGiven } : {}),
  });
  assert.equal(JSON.stringify(state.players), seatsBefore, "an answer changes no seat");
  assert.equal(JSON.stringify(state.effects), effectsBefore, "an answer adds no effect");
  assert.equal(JSON.stringify(state.deaths), deathsBefore, "an answer adds no death");
  assert.equal(
    JSON.stringify(publicGameView(state)).includes(JSON.stringify(clockGiven)),
    false,
    "the answer stays out of the public view",
  );

  playNight(state);
  command(state, "endNight");
  assert.equal(state.phase, "day");
  assert.equal(state.day.number, 1);

  const blocked = applyCommand(state, {
    id: "oracle-madness-block",
    type: "endDay",
    payload: {},
  });
  assert.equal(blocked.status, "rejected", "the active madness must be reviewed first");
  assert.equal(blocked.errorCode, "error.66");
  assert.equal(state.winner, null);

  const before = canonicalState(state);
  command(state, "madnessPenalty", {
    playerId: "3",
    penalty: "execute",
    reason: "The target was not mad about the named character.",
  });
  assert.equal(state.players["3"].alive, false);
  assert.equal(state.day.execution?.playerId, "3");
  assert.equal(state.day.execution?.cause, "madness");
  assert.equal(state.winner, null);
  assert.equal(publicGameView(state).deaths.includes("P3"), true, "the execution is public");
  assertJournalRoundTrip(state, before);

  command(state, "endDay");
  assert.equal(state.winner, null, "an execution occurred, so the Vortox does not win");
  assert.equal(state.phase, "night");
  assert.equal(state.night.number, 2);
  assertPublicViewHides(state, ["cerenovus", "vortox", "clockmaker"]);
});
