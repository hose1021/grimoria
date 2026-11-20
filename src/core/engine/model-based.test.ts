import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  livingPlayers,
  orderedPlayers,
  publicGameView,
  validateState,
} from "../model/state.ts";
import { presetBag } from "../model/presets.ts";
import {
  badMoonRisingScript,
  sectsAndVioletsScript,
  troubleBrewingScript,
} from "../model/scripts.ts";
import { executionThreshold } from "./context.ts";
import {
  applyCommand,
  autoSecrets,
  canonicalState,
  completeStep,
  currentStep,
  dealGame,
  endDay,
  endNight,
  infoForStep,
  replay,
  startNight,
  targetBounds,
  validateCommand,
} from "./index.ts";
import type { CommandResult, GameState, NightStep, Script } from "../model/types.ts";
import type { InfoResult } from "./information.ts";

function givenFor(info: InfoResult): Record<string, unknown> | undefined {
  if (!info.needsChoice) return undefined;
  const first = info.options?.[0];
  if (info.kind === "note") return { kind: "note", text: "verification answer" };
  if (info.kind === "number")
    return { kind: "number", value: first ?? info.value, needsChoice: false };
  if (info.kind === "yes-no") return { kind: "yes-no", value: first ?? true, needsChoice: false };
  if (info.kind === "one-of-two")
    return {
      kind: "one-of-two",
      roleId: first ?? info.roleId,
      pair: info.pair,
      needsChoice: false,
    };
  if (info.kind === "character")
    return {
      kind: "character",
      roleId: first ?? info.roleId,
      playerId: info.playerId,
      needsChoice: false,
    };
  if (info.kind === "role-pair" || info.kind === "player-pair") {
    const option = String(first);
    if (!option) return undefined;
    return { kind: info.kind, pair: option.split("|"), needsChoice: false };
  }
  return { kind: info.kind, roleId: first, needsChoice: false };
}

function targetsFor(game: GameState, step: NightStep): string[] {
  const bounds = targetBounds(step);
  if (bounds.max === 0) return [];
  const living = orderedPlayers(game).filter(
    (player) => player.alive && (step.targetMode !== "one-other" || player.id !== step.actorId),
  );
  const count = Math.max(bounds.min, 1);
  assert.ok(living.length >= count, `not enough legal targets for ${step.key}`);
  return living.slice(0, count).map((player) => player.id);
}

test("a legal Trouble Brewing game keeps state invariants through several full days", () => {
  const bag = presetBag("tb", 7, 0);
  assert.ok(bag);
  const game = createGame(7);
  game.script = troubleBrewingScript();
  game.scriptId = "tb";
  game.setup.count = 7;
  game.setup.roles = bag.roles.slice();
  game.setup.bluffs = bag.bluffs.slice();
  const assignment = Object.fromEntries(bag.roles.map((role, index) => [String(index + 1), role]));
  assert.equal(dealGame(game, { assignment }).ok, true);
  autoSecrets(game);
  assert.equal(startNight(game).ok, true);

  for (let turn = 0; turn < 4 && !game.winner; turn += 1) {
    for (let step = currentStep(game); step; step = currentStep(game)) {
      const targets = targetsFor(game, step);
      const info = infoForStep(game, step, { targetIds: targets });
      const given = givenFor(info);
      const result = completeStep(game, step.key, {
        targetIds: targets,
        ...(given ? { given } : {}),
      });
      assert.equal(result.ok, true, `${step.key}: ${JSON.stringify(result)}`);
    }
    if (game.winner) break;
    assert.equal(endNight(game).ok, true);
    if (game.winner) break;
    assert.equal(endDay(game).ok, true);
    assert.equal(game.phase, "night");
  }

  const living = livingPlayers(game).length;
  const dead = orderedPlayers(game).filter((player) => !player.alive).length;
  assert.equal(living + dead, game.order.length);
  assert.equal(new Set(game.order).size, game.order.length);
  assert.equal(executionThreshold(living), Math.ceil(living / 2));
  const publicText = JSON.stringify(publicGameView(game));
  for (const secret of ["roleId", "shownRoleId", "bluffs", "notes", "effects"]) {
    assert.equal(publicText.includes(secret), false, `public view leaks ${secret}`);
  }
  if (game.winner) {
    assert.ok(
      ["demon-dead", "two-alive", "saint", "mayor", "virgin", "slayer", "imp-self-kill"].includes(
        game.winner.reason,
      ),
      game.winner.reason,
    );
  }
});

// ---------------------------------------------------------------------------
// Command-flow model tests for Bad Moon Rising and Sects & Violets. Every
// mutation goes through validateCommand/applyCommand, so the journal is real;
// applyCommand is preceded by validation and followed by validateState, and the
// saved journal must rebuild the same canonical state.

type HostAttempt = {
  status: string;
  errorCode?: string | null;
  reason?: string;
  choice?: { kind: string; options: unknown[]; context: Record<string, unknown> };
};

type HostRun = { followUp?: { type?: string; options?: unknown[] } | null };

type Host = {
  attempt: (type: string, payload?: Record<string, unknown>) => HostAttempt;
  run: (type: string, payload?: Record<string, unknown>) => HostRun;
  trace: string[];
};

let commandSequence = 0;

function normalizeValidation(result: CommandResult): HostAttempt {
  if (result.status === "rejected") {
    return { status: result.status, errorCode: result.errorCode, reason: result.reason };
  }
  if (result.status === "requires-storyteller-choice") {
    return {
      status: result.status,
      errorCode: result.errorCode,
      reason: result.reason,
      choice: {
        kind: result.choice.kind,
        options: result.choice.options,
        context: (result.choice.context as Record<string, unknown> | null) ?? {},
      },
    };
  }
  return { status: result.status };
}

function makeHost(state: GameState): Host {
  const trace: string[] = [];
  const attempt = (type: string, payload: Record<string, unknown> = {}): HostAttempt =>
    normalizeValidation(
      validateCommand(state, { id: "model-based-" + ++commandSequence, type, payload }),
    );
  const run = (type: string, payload: Record<string, unknown> = {}): HostRun => {
    const command = { id: "model-based-" + ++commandSequence, type, payload };
    const check = normalizeValidation(validateCommand(state, command));
    assert.equal(
      check.status,
      "allowed",
      type + " must be a legal option: " + JSON.stringify(check),
    );
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", type + " must apply: " + JSON.stringify(result));
    assert.deepEqual(validateState(state), [], type + " must leave a valid state");
    trace.push(type);
    return result.status === "allowed" ? { followUp: result.followUp } : {};
  };
  return { attempt, run, trace };
}

/** Every legal target set for a step, in the engine's declared target mode. */
function commandTargets(state: GameState, step: NightStep): string[][] {
  const alive = livingPlayers(state);
  const all = orderedPlayers(state);
  const others = alive.filter((player) => player.id !== step.actorId);
  if (step.targetMode === "none") return [[]];
  if (step.targetMode === "one-other")
    return others.length ? others.map((player) => [player.id]) : [[]];
  if (step.targetMode === "two") {
    const pool = others.length >= 2 ? others : all;
    const out: string[][] = [];
    for (let first = 0; first < pool.length; first += 1) {
      for (let second = first + 1; second < pool.length; second += 1) {
        out.push([pool[first].id, pool[second].id]);
      }
    }
    return out.length ? out : [[]];
  }
  const need = Math.max(1, step.minTargets || 1);
  if (need > 1) {
    const out: string[][] = [];
    for (let index = 0; index + need <= alive.length; index += 1) {
      out.push(alive.slice(index, index + need).map((player) => player.id));
    }
    return out.length ? out : [[]];
  }
  return (alive.length ? alive : all).map((player) => [player.id]);
}

function playCommandNight(state: GameState, host: Host): void {
  for (let guard = 0; guard < 200; guard += 1) {
    if (state.winner) return;
    const pending = state.night.queue.find((step) => step.pending?.kind === "demon-inheritance");
    if (pending) {
      const option = pending.pending!.options?.[0] as { id: string } | undefined;
      assert.ok(option, "the pending inheritance offers an heir");
      host.run("chooseDemonHeir", { stepKey: pending.key, heirId: option.id });
      continue;
    }
    const step = currentStep(state);
    if (!step) return;
    if (step.kind === "system") {
      host.run("completeNightStep", { key: step.key });
      continue;
    }
    let completed = false;
    let lastReason = "no candidates";
    for (const targetIds of commandTargets(state, step)) {
      const payload: Record<string, unknown> = { key: step.key, targetIds };
      if ((step.roleId === "sailor" || step.roleId === "innkeeper") && targetIds.length)
        payload.drunkId = targetIds[0];
      if (step.canKill && targetIds.length) payload.deathIds = targetIds.slice();
      const given = givenFor(infoForStep(state, step, { targetIds }));
      if (given) payload.given = given;
      const check = host.attempt("completeNightStep", payload);
      lastReason = check.errorCode || check.reason || check.status;
      if (check.status === "allowed") {
        const result = host.run("completeNightStep", payload);
        const followUp = result.followUp;
        if (followUp && followUp.type === "chooseDemonHeir") {
          const option = followUp.options?.[0] as { id: string } | undefined;
          if (option) host.run("chooseDemonHeir", { stepKey: step.key, heirId: option.id });
        }
        completed = true;
        break;
      }
      if (check.status !== "requires-storyteller-choice") continue;
      const option = check.choice!.options[0];
      if (check.choice!.kind === "redirect") {
        host.run("completeNightStep", { ...payload, redirectId: option });
        completed = true;
        break;
      }
      if (check.choice!.kind === "info") {
        const answer = { ...check.choice!.context, roleId: option, needsChoice: false };
        if (host.attempt("completeNightStep", { ...payload, given: answer }).status === "allowed") {
          host.run("completeNightStep", { ...payload, given: answer });
          completed = true;
          break;
        }
      }
    }
    if (completed) continue;
    const actor = step.actorId ? state.players[step.actorId] : null;
    assert.ok(
      !actor || !actor.alive,
      "only a dead actor may be skipped: " + (step.roleId || step.system) + " " + lastReason,
    );
    host.run("skipStep", { key: step.key, reason: "the actor died or the step cannot resolve" });
  }
  assert.fail("the night queue did not finish");
}

function playCommandDay(state: GameState, host: Host): void {
  if (host.attempt("openNominations").status === "allowed") host.run("openNominations");
  const alive = livingPlayers(state);
  let nomination = null;
  for (const nominee of alive) {
    for (const nominator of alive) {
      if (nominator.id === nominee.id) continue;
      if (
        state.day.nominations.some(
          (candidate) =>
            candidate.nominatorId === nominator.id || candidate.nomineeId === nominee.id,
        )
      )
        continue;
      if (
        host.attempt("nominate", { nominatorId: nominator.id, nomineeId: nominee.id }).status !==
        "allowed"
      )
        continue;
      host.run("nominate", { nominatorId: nominator.id, nomineeId: nominee.id });
      nomination = state.day.nominations[state.day.nominations.length - 1] || null;
      break;
    }
    if (nomination) break;
  }
  if (nomination) {
    host.run("recordVotes", {
      nominationId: nomination.id,
      voterIds: alive.map((player) => player.id),
    });
    if (host.attempt("execute", { nominationId: nomination.id }).status === "allowed")
      host.run("execute", { nominationId: nomination.id });
  }
  if (state.phase === "over") return;
  for (const effect of state.effects) {
    if (effect.kind !== "madness" || effect.active === false) continue;
    host.run("madnessPenalty", {
      playerId: effect.targetId,
      effectId: effect.id,
      penalty: "none",
      reason: "The simulated Storyteller reviewed this madness condition.",
    });
  }
  host.run("endDay");
}

function playCommandGame(state: GameState, host: Host): void {
  for (let guard = 0; guard < 400 && state.phase !== "over"; guard += 1) {
    if (state.phase === "night") {
      if (currentStep(state)) playCommandNight(state, host);
      else host.run("endNight");
      continue;
    }
    if (state.phase === "day") {
      playCommandDay(state, host);
      continue;
    }
    assert.fail("unexpected phase " + state.phase);
  }
  assert.equal(state.phase, "over", "the game must reach a finale");
  assert.ok(state.winner, "the finale must declare a winner");
}

function playSeededScript(scriptId: string, script: () => Script, count: number, variant: number) {
  const bag = presetBag(scriptId, count, variant);
  assert.ok(bag && bag.valid, `a legal ${scriptId} preset for ${count}: ${JSON.stringify(bag)}`);
  const state = createGame(count);
  const host = makeHost(state);
  host.run("bagUpdate", {
    patch: {
      script: script(),
      count,
      resetRoster: true,
      roles: bag.roles.slice(),
      bluffs: bag.bluffs.slice(),
      drunkShownId: bag.drunkShownId,
      lunaticShownId: bag.lunaticShownId,
      godfatherOutsider: bag.godfatherOutsider,
      evilTwinGoodId: bag.evilTwinGoodId,
    },
  });
  const assignment = Object.fromEntries(bag.roles.map((role, index) => [String(index + 1), role]));
  host.run("startGame", { options: { assignment } });
  playCommandGame(state, host);
  return { state, trace: host.trace };
}

function assertScriptModel(
  scriptId: string,
  script: () => Script,
  count: number,
  winnerReasons: string[],
) {
  const first = playSeededScript(scriptId, script, count, 0);
  assert.ok(
    winnerReasons.includes(first.state.winner!.reason),
    scriptId + " ended with " + first.state.winner!.reason,
  );
  assert.ok(
    first.state.night.number >= 3 && first.state.day.number >= 3,
    scriptId + " must run several days, not " + first.state.day.number,
  );
  for (const type of [
    "bagUpdate",
    "startGame",
    "completeNightStep",
    "endNight",
    "openNominations",
    "execute",
    "endDay",
  ]) {
    assert.ok(first.trace.includes(type), scriptId + " must include " + type);
  }
  assert.deepEqual(validateState(first.state), []);
  const replayed = replay(first.state.journal);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  if (!replayed.ok) return;
  assert.deepEqual(
    canonicalState(replayed.state),
    canonicalState(first.state),
    scriptId + " must replay from its journal",
  );
  const publicText = JSON.stringify(publicGameView(first.state));
  for (const secret of ["roleId", "shownRoleId", "bluffs", "notes", "effects", "journal"]) {
    assert.equal(publicText.includes(secret), false, `public view leaks ${secret}`);
  }

  const second = playSeededScript(scriptId, script, count, 0);
  assert.deepEqual(second.trace, first.trace, scriptId + " must repeat the same command line");
  assert.equal(second.state.winner!.reason, first.state.winner!.reason);
  assert.equal(second.state.deaths.length, first.state.deaths.length);
}

test("a legal Bad Moon Rising game keeps state, journal and privacy invariants", () => {
  assertScriptModel("bmr", badMoonRisingScript, 8, ["two-alive", "demon-dead", "mastermind"]);
});

test("a legal Sects & Violets game keeps state, journal and privacy invariants", () => {
  assertScriptModel("snv", sectsAndVioletsScript, 10, [
    "two-alive",
    "demon-dead",
    "klutz",
    "eviltwin",
    "vortox",
  ]);
});
