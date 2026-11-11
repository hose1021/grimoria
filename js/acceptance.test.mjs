// Acceptance: a game that only ran setup must reach a real finale through the
// engine's own command flow, with no direct state writes and no screen.
//
// Every step is chosen from the engine's legal options: candidate target sets
// come from `targetBounds` and `infoForStep`, a false-information answer comes
// from `infoForStep().options`, and redirects and Demon heirs come from the
// `requires-storyteller-choice` result. Every command is validated before it is
// applied, so a rejected command fails the test instead of being skipped.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, orderedPlayers } from "./model.js";
import {
  validateCommand,
  applyCommand,
  infoForStep,
  currentStep,
  demonChangePending,
} from "./engine.js";
import { presetBag } from "./presets.js";
import { ALL_ROLES, roleTeam } from "./rules.js";

const INFO_ROLES = ["washerwoman", "librarian", "investigator"];

// One id sequence per test process: a setup host and the driver share the same
// game, so their command ids must not collide in the idempotency ledger.
let hostSequence = 0;

// A small deterministic PRNG: the sampled test must give the same game for the
// same seed on every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function living(state) {
  return orderedPlayers(state).filter((player) => player.alive);
}

/** The host: it only validates and applies commands, and records the journal. */
function makeHost(state) {
  const trace = [];
  const attempt = (type, payload = {}) =>
    validateCommand(state, { id: "acceptance-" + ++hostSequence, type, payload });
  const run = (type, payload = {}, { journal = false } = {}) => {
    const command = { id: "acceptance-" + ++hostSequence, type, payload };
    const validation = validateCommand(state, command);
    assert.equal(
      validation.status,
      "allowed",
      type + " must be a legal option: " + (validation.errorCode || validation.reason || ""),
    );
    const before = state.log.length;
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", type + " must apply");
    const added = state.log.length - before;
    if (journal) assert.ok(added > 0, type + " must be explained in the journal");
    trace.push(type);
    return result;
  };
  return { attempt, run, trace };
}

/** A false-information answer taken from the engine's own option list. */
function givenFrom(info, rng) {
  if (!info || !info.needsChoice) return undefined;
  const options = Array.isArray(info.options) && info.options.length ? info.options : [undefined];
  const option = options[Math.floor(rng() * options.length)];
  if (info.kind === "number") return { ...info, value: option ?? 0, needsChoice: false };
  if (info.kind === "yes-no") return { ...info, value: option ?? false, needsChoice: false };
  if (info.kind === "character" || info.kind === "one-of-two")
    return { ...info, roleId: option ?? null, needsChoice: false };
  return { ...info, needsChoice: false };
}

/** Every legal target set for one step, in the engine's declared target mode. */
function targetCandidates(state, step, rng) {
  const alive = living(state);
  const all = orderedPlayers(state);
  const others = alive.filter((player) => player.id !== step.actorId);
  if (step.targetMode === "one-other") {
    return others.length ? shuffled(others, rng).map((player) => [player.id]) : [[]];
  }
  if (step.targetMode === "one-any")
    return shuffled(alive.length ? alive : all, rng).map((player) => [player.id]);
  if (step.targetMode === "two") {
    // The Fortune Teller may name themself or a dead player, so every distinct
    // pair of existing players is legal; two living players are preferred.
    const pool = others.length >= 2 ? others : all;
    const order = shuffled(pool, rng);
    const out = [];
    for (let i = 0; i < order.length; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) out.push([order[i].id, order[j].id]);
    }
    return out;
  }
  return [[]];
}

function chooseHeir(state, host, step, rng) {
  const options = (step.pending && step.pending.options) || [];
  if (!options.length) return false;
  const pick = options[Math.floor(rng() * options.length)];
  host.run("chooseDemonHeir", { stepKey: step.key, heirId: pick.id }, { journal: true });
  return true;
}

/** Resolve the whole night from the engine's queue and legal options. */
function playNight(state, host, rng) {
  for (let guard = 0; guard < 200; guard += 1) {
    if (state.winner) return;
    const pending = demonChangePending(state);
    if (pending) {
      chooseHeir(state, host, pending, rng);
      continue;
    }
    const step = currentStep(state);
    if (!step) return;
    if (step.kind === "system") {
      host.run("completeNightStep", { key: step.key }, { journal: true });
      continue;
    }

    let completed = false;
    let lastReason = "no candidates";
    for (const targetIds of targetCandidates(state, step, rng)) {
      const info = infoForStep(state, step, { targetIds });
      const payload = { key: step.key, targetIds };
      const given = givenFrom(info, rng);
      if (given) payload.given = given;
      const validation = host.attempt("completeNightStep", payload);
      lastReason = validation.errorCode || validation.reason || validation.status;
      if (validation.status === "allowed") {
        const result = host.run("completeNightStep", payload, { journal: true });
        if (result.followUp && result.followUp.type === "chooseDemonHeir") {
          const options = result.followUp.options || [];
          const pick = options[Math.floor(rng() * options.length)];
          if (pick)
            host.run("chooseDemonHeir", { stepKey: step.key, heirId: pick.id }, { journal: true });
        }
        completed = true;
        break;
      }
      if (validation.status !== "requires-storyteller-choice") continue;
      if (validation.choice.kind === "redirect") {
        const options = validation.choice.options || [];
        const pick = options[Math.floor(rng() * options.length)];
        host.run("completeNightStep", { ...payload, redirectId: pick.id }, { journal: true });
        completed = true;
        break;
      }
      if (validation.choice.kind === "info") {
        const options = validation.choice.options || [];
        const option = options[Math.floor(rng() * options.length)];
        const answer = { ...validation.choice.context, roleId: option, needsChoice: false };
        if (host.attempt("completeNightStep", { ...payload, given: answer }).status === "allowed") {
          host.run("completeNightStep", { ...payload, given: answer }, { journal: true });
          completed = true;
          break;
        }
      }
    }
    assert.ok(
      completed ||
        host.attempt("skipStep", { key: step.key, reason: "actor unavailable" }).status ===
          "allowed",
      "no legal completion for " + (step.roleId || step.system) + ": " + lastReason,
    );
    if (!completed) {
      host.run(
        "skipStep",
        { key: step.key, reason: "the actor died or the step cannot resolve" },
        { journal: true },
      );
    }
  }
  assert.fail("the night queue did not finish");
}

/** Resolve one day: open nominations, nominate the first legal pair, execute. */
function playDay(state, host) {
  if (host.attempt("openNominations", {}).status === "allowed")
    host.run("openNominations", {}, { journal: true });
  const alive = living(state);
  let nomination = null;
  for (const nominee of alive) {
    if (state.day.nominations.some((candidate) => candidate.nomineeId === nominee.id)) continue;
    for (const nominator of alive) {
      if (nominator.id === nominee.id) continue;
      if (state.day.nominations.some((candidate) => candidate.nominatorId === nominator.id))
        continue;
      if (
        host.attempt("nominate", { nominatorId: nominator.id, nomineeId: nominee.id }).status !==
        "allowed"
      )
        continue;
      host.run("nominate", { nominatorId: nominator.id, nomineeId: nominee.id }, { journal: true });
      nomination = state.day.nominations[state.day.nominations.length - 1] || null;
      break;
    }
    if (nomination) break;
  }
  if (nomination) {
    host.run(
      "recordVotes",
      { nominationId: nomination.id, voterIds: alive.map((player) => player.id) },
      { journal: true },
    );
    host.run("execute", { nominationId: nomination.id }, { journal: true });
  }
  if (state.phase !== "over") host.run("endDay", {}, { journal: true });
}

/** Drive the game to a finale with the engine's own command flow. */
function playToFinale(state, rng) {
  const host = makeHost(state);
  for (let guard = 0; guard < 400 && state.phase !== "over"; guard += 1) {
    if (state.phase === "setup" || state.phase === "deal" || state.phase === "seat") {
      host.run("startGame", { options: {} }, { journal: true });
      continue;
    }
    if (state.phase === "night") {
      if (currentStep(state)) playNight(state, host, rng);
      else host.run("endNight", {}, { journal: true });
      continue;
    }
    if (state.phase === "day") {
      playDay(state, host);
      continue;
    }
    assert.fail("unknown phase " + state.phase);
  }
  assert.equal(state.phase, "over", "the pipeline must reach a finale");
  assert.ok(state.winner, "the finale must declare a winner");
  assert.ok(
    state.log.some((entry) => entry.kind === "winner"),
    "the journal must explain the finale",
  );
  return host;
}

test("a game that only ran setup reaches a Trouble Brewing finale through the command flow", () => {
  const state = createGame(5);
  const host = makeHost(state);
  host.run("bagUpdate", {
    patch: {
      count: 5,
      resetRoster: true,
      roles: ["chef", "empath", "soldier", "poisoner", "imp"],
    },
  });
  // `startGame` is the host's one action between a prepared bag and night 1.
  host.run(
    "startGame",
    {
      options: { assignment: { 1: "chef", 2: "empath", 3: "soldier", 4: "poisoner", 5: "imp" } },
    },
    { journal: true },
  );
  const driver = playToFinale(state, mulberry32(20261111));
  const trace = [...host.trace, ...driver.trace];

  assert.ok(["two-alive", "demon-dead"].includes(state.winner.reason));
  // The path used the public command surface at every phase.
  for (const type of [
    "startGame",
    "completeNightStep",
    "endNight",
    "openNominations",
    "nominate",
    "recordVotes",
    "execute",
  ])
    assert.ok(trace.includes(type), "the path must include " + type);
  // The journal names every phase and every completed night step.
  const entries = state.log.map((entry) => entry.kind);
  for (const kind of ["setup", "phase", "night", "nomination", "vote", "execution", "winner"])
    assert.ok(entries.includes(kind), "the journal must explain every " + kind + " step");
});

// One sampled interval, stated honestly: the Trouble Brewing presets, player
// counts 5-15 inclusive, three seeds per count (seed 1, 2, 3), 33 games in all.
// This samples the shipped preset bags and one deterministic host line per
// seed; it is not exhaustive over every legal bag, role order or night choice.
test("a seeded sample of 33 Trouble Brewing games reaches a finale through the command flow", () => {
  const playSeeded = (count, seed) => {
    const bag = presetBag("tb", count, seed % 3);
    assert.ok(bag && bag.valid, "preset for " + count + "/" + seed);
    const state = createGame(count);
    const rng = mulberry32(seed * 7919 + count);
    const host = makeHost(state);
    host.run("bagUpdate", {
      patch: {
        count,
        resetRoster: true,
        roles: bag.roles.slice(),
        bluffs: bag.bluffs.slice(),
        drunkShownId: bag.drunkShownId,
        lunaticShownId: bag.lunaticShownId,
      },
    });
    const roles = shuffled(bag.roles, rng);
    const assignment = {};
    state.order.forEach((id, index) => {
      assignment[id] = roles[index];
    });
    // A Drunk shown an information role needs the host's false information
    // before the night can start; the value below is a legal host choice.
    host.run("dealGame", { options: { assignment } }, { journal: true });
    const drunk = orderedPlayers(state).find((player) => player.roleId === "drunk");
    const mask = drunk && drunk.shownRoleId;
    if (mask && INFO_ROLES.includes(mask) && !state.setup.info[mask]) {
      const team =
        mask === "washerwoman" ? "townsfolk" : mask === "librarian" ? "outsider" : "minion";
      const falseRole =
        ALL_ROLES.find((id) => roleTeam(id) === team && !state.setup.roles.includes(id)) ||
        ALL_ROLES.find((id) => roleTeam(id) === team);
      const others = orderedPlayers(state).filter((player) => player.id !== drunk.id);
      host.run("setSetupInfo", {
        roleId: mask,
        info: { roleId: falseRole, forDrunk: true, pair: [others[0].id, others[1].id] },
      });
    }
    host.run("startGame", { options: {} }, { journal: true });
    const driver = playToFinale(state, rng);
    const trace = [...host.trace, ...driver.trace];
    return {
      count,
      seed,
      winner: state.winner.reason,
      steps: trace.filter((type) => type === "completeNightStep").length,
      journal: state.log.length,
      trace,
    };
  };

  for (let count = 5; count <= 15; count += 1) {
    for (let seed = 1; seed <= 3; seed += 1) {
      const result = playSeeded(count, seed);
      assert.ok(
        ["two-alive", "demon-dead", "saint"].includes(result.winner),
        "count " + count + " seed " + seed + " winner " + result.winner,
      );
      assert.ok(result.steps > 0, "count " + count + " seed " + seed + " completed a night");
      assert.ok(
        result.trace.includes("startGame"),
        "count " + count + " seed " + seed + " started through startGame",
      );
    }
  }

  // Determinism is part of the contract: the same seed gives the same game.
  const first = playSeeded(7, 1);
  const second = playSeeded(7, 1);
  assert.deepEqual(second, first);
});
