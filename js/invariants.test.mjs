// Executable state invariants from issue #32 (parent #19, "Инварианты").
// Each test states one invariant as a behavioural sentence. The suite is
// DOM-free: it drives the engine through the public command API.
import test from "node:test";
import assert from "node:assert/strict";
import { ALL_ROLES, isGoodRole } from "./rules.js";
import { clone, createGame, realTeamOf } from "./model.js";
import {
  applyCommand,
  autoSecrets,
  canonicalState,
  checkInvariants,
  completeStep,
  dealGame,
  effectActive,
  endDay,
  endNight,
  isImpaired,
  skipStep,
  startNight,
} from "./engine.js";

function make(assignment, options = {}) {
  const count = options.count || Object.keys(assignment).length;
  const state = createGame(count);
  Object.entries(assignment).forEach(([id]) => {
    state.players[id].name = "P" + id;
  });
  const roles = [...new Set(Object.values(assignment))];
  state.setup.count = count;
  state.setup.roles = roles;
  const bluffPool = ALL_ROLES.filter((id) => isGoodRole(id) && !roles.includes(id));
  state.setup.bluffs = count >= 7 ? bluffPool.slice(0, 3) : [];
  const result = dealGame(state, { assignment });
  assert.equal(result.ok, true, "fixture deal must succeed: " + JSON.stringify(result));
  autoSecrets(state);
  return state;
}

function toDay(state) {
  const started = startNight(state);
  assert.equal(started.ok, true, JSON.stringify(started));
  while (state.night.queue.some((step) => !step.done && !step.skipped)) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped);
    const skipped = skipStep(state, step.key, "test");
    assert.equal(skipped.ok, true, JSON.stringify(skipped));
  }
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  return state;
}

// A completed step that creates an effect (the Poisoner chooses seat 2).
function poisonCommand(state, id = "poison-1", at = "2026-01-01T20:05:00.000Z") {
  const step = state.night.queue.find((candidate) => candidate.roleId === "poisoner");
  assert.ok(step, "the Poisoner has a night step");
  return {
    id,
    type: "completeStep",
    payload: { key: step.key, options: { targetIds: ["2"] } },
    at,
  };
}

test("every player has exactly one in-script character and no rule record points at a missing player", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  assert.deepEqual(checkInvariants(state), [], "a dealt game is internally consistent");
  for (const player of Object.values(state.players)) {
    assert.equal(typeof player.roleId, "string", "player " + player.id + " has one character");
    assert.ok(
      state.script.roles.includes(player.roleId),
      "player " + player.id + " has a character from the script",
    );
    assert.ok(
      ["good", "evil"].includes(realTeamOf(player)),
      "player " + player.id + " resolves to exactly one alignment",
    );
  }

  const corruptions = [
    {
      name: "a seat appears twice",
      mutate: (draft) => draft.order.push(draft.order[0]),
      pattern: /Порядок мест содержит повторы/,
    },
    {
      name: "a seat has no player",
      mutate: (draft) => draft.order.push("ghost"),
      pattern: /Место без игрока/,
    },
    {
      name: "a player is missing from the seats",
      mutate: (draft) => delete draft.players["7"],
      pattern: /Игроки не совпадают с порядком мест/,
    },
    {
      name: "a character is outside the script",
      mutate: (draft) => {
        draft.players["1"].roleId = "pukka";
      },
      pattern: /Роль вне сценария/,
    },
    {
      name: "a shown character is unknown",
      mutate: (draft) => {
        draft.players["1"].shownRoleId = "not-a-character";
      },
      pattern: /Показанная роль неизвестна/,
    },
    {
      name: "an effect points at a missing source",
      mutate: (draft) =>
        draft.effects.push({
          id: "eff-ghost",
          kind: "poison",
          sourceId: "ghost",
          targetId: "1",
          start: { phase: "night", number: 1 },
          active: true,
        }),
      pattern: /Источник эффекта не найден/,
    },
    {
      name: "an effect points at a missing target",
      mutate: (draft) =>
        draft.effects.push({
          id: "eff-ghost",
          kind: "poison",
          sourceId: "1",
          targetId: "ghost",
          start: { phase: "night", number: 1 },
          active: true,
        }),
      pattern: /Цель эффекта не найдена/,
    },
    {
      name: "a death points at a missing player",
      mutate: (draft) =>
        draft.deaths.push({
          id: "death-ghost",
          playerId: "ghost",
          roleId: null,
          cause: "test",
          phase: "night",
          number: 1,
          at: "",
        }),
      pattern: /Смерть без игрока/,
    },
    {
      name: "an execution record points at a missing player",
      mutate: (draft) => draft.executions.push({ playerId: "ghost", cause: "test", at: "" }),
      pattern: /Казнь без игрока/,
    },
    {
      name: "a night actor is missing",
      mutate: (draft) =>
        draft.night.queue.push({ key: "ghost-step", kind: "role", actorId: "ghost" }),
      pattern: /Ночной актёр не найден/,
    },
    {
      name: "the active nomination is missing",
      mutate: (draft) => {
        draft.day.activeNominationId = "ghost-nomination";
      },
      pattern: /Активная номинация не найдена/,
    },
    {
      name: "a nomination points at a missing nominator",
      mutate: (draft) =>
        draft.day.nominations.push({
          id: "n-ghost",
          nominatorId: "ghost",
          nomineeId: "1",
          at: "",
          votes: [],
          count: 0,
          threshold: 1,
          recorded: true,
        }),
      pattern: /Номинация ссылается на отсутствующего игрока/,
    },
    {
      name: "a nomination points at a missing nominee",
      mutate: (draft) =>
        draft.day.nominations.push({
          id: "n-ghost",
          nominatorId: "1",
          nomineeId: "ghost",
          at: "",
          votes: [],
          count: 0,
          threshold: 1,
          recorded: true,
        }),
      pattern: /Номинация ссылается на отсутствующего игрока/,
    },
    {
      name: "a morning death points at a missing player",
      mutate: (draft) => draft.day.morning.push({ playerId: "ghost" }),
      pattern: /Утренняя смерть без игрока/,
    },
    {
      name: "the day execution points at a missing player",
      mutate: (draft) => {
        draft.day.execution = { playerId: "ghost", cause: "execution", at: "" };
      },
      pattern: /Казнь без игрока/,
    },
    {
      name: "a Butler master is missing",
      mutate: (draft) => {
        draft.players["1"].butlerMasterId = "ghost";
      },
      pattern: /Мастер Дворецкого не найден/,
    },
    {
      name: "a setup reference is missing",
      mutate: (draft) => {
        draft.setup.herringId = "ghost";
      },
      pattern: /Ссылка настройки не найдена/,
    },
    {
      name: "the Mastermind record points at a missing player",
      mutate: (draft) => {
        draft.mastermind = { active: true, extraDay: false, playerId: "ghost" };
      },
      pattern: /Кукловод не найден/,
    },
    {
      name: "a winner is declared outside the over phase",
      mutate: (draft) => {
        draft.winner = { team: "good", reason: "test" };
      },
      pattern: /Победитель объявлен вне фазы завершения/,
    },
    {
      name: "a winner is declared while the Demon heir is unresolved",
      mutate: (draft) => {
        draft.winner = { team: "good", reason: "test" };
        draft.phase = "over";
        draft.night.queue.push({
          key: "heir-pending",
          kind: "system",
          pending: { kind: "demon-inheritance", options: [] },
        });
      },
      pattern: /Победитель объявлен до выбора наследника Демона/,
    },
  ];

  for (const corruption of corruptions) {
    const draft = clone(state);
    corruption.mutate(draft);
    const errors = checkInvariants(draft);
    assert.ok(
      errors.some((error) => corruption.pattern.test(error)),
      corruption.name + " must break the invariant: " + JSON.stringify(errors),
    );
  }
});

test("once-per-game abilities stay spent without legal restoration, and dead players do not wake without a rule exception", () => {
  const state = make({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(state);
  const first = applyCommand(state, {
    id: "slayer-1",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "2" },
    at: "2026-01-01T12:00:00.000Z",
  });
  assert.equal(first.status, "allowed", JSON.stringify(first));
  assert.equal(state.players["1"].used.slayer, true, "the ability is spent after one use");

  const second = applyCommand(state, {
    id: "slayer-2",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "3" },
    at: "2026-01-01T12:01:00.000Z",
  });
  assert.equal(second.status, "rejected", "a spent once-per-game ability cannot be reused");
  assert.equal(second.errorCode, "error.30");

  const restarted = applyCommand(state, {
    id: "new-game",
    type: "newGame",
    payload: { count: 7 },
    at: "2026-01-01T12:02:00.000Z",
  });
  assert.equal(restarted.status, "allowed", JSON.stringify(restarted));
  assert.deepEqual(
    state.players["1"].used,
    {},
    "only land legal restoration (a new game) clears the spent ability",
  );

  // A player killed before their wake is pruned from the queue.
  const dead = make({
    1: "empath",
    2: "chef",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  toDay(dead);
  assert.equal(endDay(dead).ok, true);
  const poisoner = dead.night.queue.find((step) => step.roleId === "poisoner");
  assert.equal(completeStep(dead, poisoner.key, { targetIds: ["5"] }).ok, true);
  const imp = dead.night.queue.find((step) => step.roleId === "imp");
  assert.equal(completeStep(dead, imp.key, { targetIds: ["1"] }).ok, true);
  const empath = dead.night.queue.find((step) => step.roleId === "empath");
  assert.equal(empath.skipped, true, "the killed Empath does not wake");
  assert.notEqual(
    dead.night.queue.find((step) => !step.done && !step.skipped)?.roleId,
    "empath",
    "no later step resurrects the killed actor",
  );

  // The Ravenkeeper is the documented exception: a night death wakes it.
  const ravenkeeper = make({
    1: "ravenkeeper",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(ravenkeeper);
  assert.equal(endDay(ravenkeeper).ok, true);
  const killer = ravenkeeper.night.queue.find((step) => step.roleId === "imp");
  assert.equal(completeStep(ravenkeeper, killer.key, { targetIds: ["1"] }).ok, true);
  const wake = ravenkeeper.night.queue.find((step) => step.roleId === "ravenkeeper");
  assert.ok(wake, "the Ravenkeeper wakes because the rule says so");
  assert.equal(wake.actorAlive, false);
});

test("an effect follows the rule of its own role when its source ends", () => {
  const base = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const at = { phase: "night", number: 1 };

  const cases = [
    {
      name: "the Poisoner's poison ends when the Poisoner dies",
      roleId: "poisoner",
      effect: { kind: "poison" },
      active: false,
    },
    {
      name: "the Monk's protection ends when the Monk dies",
      roleId: "monk",
      effect: { kind: "protected" },
      active: false,
    },
    {
      name: "the Sweetheart's on-death drunk outlives its source",
      roleId: "sweetheart",
      effect: { kind: "drunk" },
      active: true,
    },
    {
      name: "a Philosopher-granted drunk ends when the Philosopher dies",
      roleId: "philosopher",
      effect: { kind: "drunk", philosopher: true },
      active: false,
    },
    {
      name: "the Snake Charmer's poison is permanent and outlives its source",
      roleId: "snakecharmer",
      effect: { kind: "poison", permanent: true },
      active: true,
    },
  ];

  for (const entry of cases) {
    const state = clone(base);
    state.players["6"].roleId = entry.roleId;
    state.players["6"].alive = false;
    state.effects = [
      {
        id: "effect-1",
        sourceId: "6",
        targetId: "2",
        start: { phase: "night", number: 1 },
        expires: null,
        active: true,
        ...entry.effect,
      },
    ];
    assert.equal(
      effectActive(state, state.effects[0], at),
      entry.active,
      entry.name + " (effect duration)",
    );
    if (entry.effect.kind === "poison" || entry.effect.kind === "drunk") {
      assert.equal(isImpaired(state, "2", at), entry.active, entry.name + " (target impairment)");
    }
  }
});

test("no final win is declared before mandatory immediate effects and the Demon replacement resolve", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "virgin",
    7: "slayer",
    8: "spy",
    9: "poisoner",
    10: "imp",
  });
  toDay(state);
  assert.equal(endDay(state).ok, true);
  const imp = state.night.queue.find((step) => step.roleId === "imp");
  const attack = applyCommand(state, {
    id: "imp-self-kill",
    type: "completeStep",
    payload: { key: imp.key, options: { targetIds: ["10"] } },
    at: "2026-01-02T20:00:00.000Z",
  });
  assert.equal(attack.status, "allowed", JSON.stringify(attack));
  assert.equal(state.winner, null, "the Demon replacement is not resolved, so no win is final");
  const pending = state.night.queue.find((step) => step.pending?.kind === "demon-inheritance");
  assert.ok(pending, "the heir choice is queued as a mandatory effect");
  assert.deepEqual(checkInvariants(state), [], "a pending heir does not itself break the state");

  const premature = clone(state);
  premature.winner = { team: "good", reason: "test" };
  premature.phase = "over";
  assert.ok(
    checkInvariants(premature).some((error) =>
      /Победитель объявлен до выбора наследника/.test(error),
    ),
    "a winner while the heir is pending is rejected",
  );

  const heir = applyCommand(state, {
    id: "choose-heir",
    type: "chooseDemonHeir",
    payload: { stepKey: imp.key, heirId: "8" },
    at: "2026-01-02T20:05:00.000Z",
  });
  assert.equal(heir.status, "allowed", JSON.stringify(heir));
  assert.equal(state.players["8"].roleId, "imp", "the replacement Demon takes the role");
  assert.equal(state.winner, null, "the game continues with the new Demon");

  // A winning death is applied only together with its death record.
  const winning = make({
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  });
  toDay(winning);
  assert.equal(winning.winner, null, "no win exists before the killing action");
  const kill = applyCommand(winning, {
    id: "slayer-kill",
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "7" },
    at: "2026-01-01T12:00:00.000Z",
  });
  assert.equal(kill.status, "allowed", JSON.stringify(kill));
  assert.ok(
    winning.deaths.some((death) => death.playerId === "7" && death.cause === "slayer"),
    "the final win is declared with the Demon's death, not before it",
  );
  assert.equal(winning.winner?.team, "good");
  assert.equal(winning.winner?.reason, "demon-dead");
});

test("replaying the recorded journal reproduces the state, undo plus replay stays consistent, and a repeated command does not stack a death or effect", () => {
  const state = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  const initial = clone(state);
  const commands = [];
  const events = [];
  const snapshots = [];

  const run = (command) => {
    snapshots.push(clone(state));
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", JSON.stringify(result));
    commands.push(command);
    events.push(...(result.events || []));
    return result;
  };

  run({ id: "night-1", type: "startNight", at: "2026-01-01T20:00:00.000Z" });
  run(poisonCommand(state));
  for (const step of state.night.queue.filter(
    (candidate) => !candidate.done && !candidate.skipped,
  )) {
    run({
      id: "skip-" + step.key,
      type: "skipStep",
      payload: { key: step.key, reason: "replay fixture" },
      at: "2026-01-01T20:06:00.000Z",
    });
  }
  run({ id: "end-night", type: "endNight", at: "2026-01-01T20:10:00.000Z" });
  run({
    id: "execute-imp",
    type: "executeByDecision",
    payload: { playerId: "7" },
    at: "2026-01-02T12:00:00.000Z",
  });
  const finalCanonical = canonicalState(state);

  const replay = clone(initial);
  const replayEvents = [];
  for (const command of commands) {
    const result = applyCommand(replay, command);
    assert.equal(result.status, "allowed", "replayed command " + command.id + " is accepted");
    replayEvents.push(...(result.events || []));
  }
  assert.deepEqual(
    canonicalState(replay),
    finalCanonical,
    "replaying the recorded journal reproduces the current state",
  );
  assert.deepEqual(replayEvents, events, "replaying the journal emits the same domain events");

  // The store's undo restores the pre-command snapshot. Replaying the undone
  // command from that snapshot must reproduce the state before the undo.
  const undone = snapshots.at(-1);
  const last = commands.at(-1);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, clone(undone));
  const beforeReplay = canonicalState(state);
  const again = applyCommand(state, last);
  assert.equal(again.status, "allowed", JSON.stringify(again));
  assert.deepEqual(
    canonicalState(state),
    finalCanonical,
    "undo plus replay of the undone command stays consistent",
  );
  assert.notDeepEqual(beforeReplay, finalCanonical, "the undo really removed the last action");

  // A repeated command id is idempotent: no second death and no second effect.
  const repeat = make({
    1: "chef",
    2: "empath",
    3: "monk",
    4: "soldier",
    5: "mayor",
    6: "poisoner",
    7: "imp",
  });
  startNight(repeat);
  const poison = poisonCommand(repeat);
  const poisonFirst = applyCommand(repeat, poison);
  assert.equal(poisonFirst.status, "allowed", JSON.stringify(poisonFirst));
  const effectsAfterFirst = repeat.effects.length;
  const poisonSecond = applyCommand(repeat, poison);
  assert.equal(poisonSecond.idempotent, true);
  assert.equal(
    repeat.effects.length,
    effectsAfterFirst,
    "a repeated step does not stack an effect",
  );

  toDay(repeat);
  const death = {
    id: "kill-once",
    type: "executeByDecision",
    payload: { playerId: "7" },
    at: "2026-01-03T12:00:00.000Z",
  };
  const deathFirst = applyCommand(repeat, death);
  assert.equal(deathFirst.status, "allowed", JSON.stringify(deathFirst));
  const deathsAfterFirst = repeat.deaths.length;
  const deathSecond = applyCommand(repeat, death);
  assert.equal(deathSecond.idempotent, true);
  assert.equal(
    repeat.deaths.length,
    deathsAfterFirst,
    "a repeated command does not double a death",
  );
});
