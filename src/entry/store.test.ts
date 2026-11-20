import test from "node:test";
import assert from "node:assert/strict";
import { createGame, validateState, importGame, STORAGE_KEY } from "../core/model/state.ts";
import { BMR_ALL, roleTeam } from "../core/model/rules.ts";
import { sectsAndVioletsScript } from "../core/model/scripts.ts";
import { effectGraph } from "../core/model/effect-graph.ts";
import {
  activeMadness,
  autoSecrets,
  canonicalState,
  completeStep,
  dealGame,
  endDay,
  endNight,
  isImpaired,
  replay,
  skipStep,
  startNight,
} from "../core/engine/index.ts";
import type { Effect, GameState, NightStep } from "../core/model/types.ts";

type StoreModule = typeof import("./store.ts");

let instance = 0;

function fakeStorage(values: Map<string, string>): Storage {
  return {
    length: 0,
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

async function store(
  initial?: unknown,
): Promise<{ module: StoreModule; values: Map<string, string> }> {
  const values = new Map<string, string>(initial ? [[STORAGE_KEY, JSON.stringify(initial)]] : []);
  globalThis.localStorage = fakeStorage(values);
  // Each case needs a fresh module instance with its own store, so the query
  // string forces a reload; a static import would be cached.
  const path = "./store.ts?test=" + ++instance;
  const module = (await import(path)) as StoreModule;
  return { module, values };
}

test("claimed names survive save, reload and legacy migration", async () => {
  const game = createGame(7);
  game.players["1"].name = "Alice";
  game.players["1"].claimed = true;
  const loaded = await store(game);
  assert.equal(loaded.module.state.players["1"].name, "Alice");
  loaded.module.save();
  const reloaded = await store(JSON.parse(loaded.values.get(STORAGE_KEY)!));
  assert.equal(reloaded.module.state.players["1"].claimed, true);
  assert.equal(reloaded.module.state.players["1"].name, "Alice");
  const legacy = { ...game, v: 2, night: 1 };
  const migrated = await store(legacy);
  assert.equal(migrated.module.state.players["1"].name, "Alice");
  assert.equal(migrated.module.state.players["1"].claimed, true);
});

test("rejected and throwing actions roll back all mutations without creating undo entries", async () => {
  const { module: s } = await store();
  const before = JSON.stringify(s.state);
  assert.equal(
    s.run((game) => {
      game.players["1"].alive = false;
      return { ok: false };
    }).ok,
    false,
  );
  assert.equal(JSON.stringify(s.state), before);
  assert.equal(s.canUndo(), false);
  assert.equal(
    s.run((game) => {
      game.effects.push({} as Effect);
      throw new Error("failed");
    }).ok,
    false,
  );
  assert.equal(JSON.stringify(s.state), before);
  assert.equal(s.canUndo(), false);
});

test("malformed imports leave the existing game and disk unchanged", async () => {
  const { module: s, values } = await store(createGame(7));
  const before = JSON.stringify(s.state);
  const disk = values.get(STORAGE_KEY);
  for (const mutate of [
    (g: GameState) => {
      Object.assign(g.players, { "1": null });
    },
    (g: GameState) => {
      Object.assign(g, { night: null });
    },
    (g: GameState) => {
      Object.assign(g.day, { morning: [null] });
    },
    (g: GameState) => {
      g.order[0] = "missing";
    },
    (g: GameState) => {
      Object.assign(g, { effects: [{ sourceId: "unknown", targetId: "1", active: true }] });
    },
    (g: GameState) => {
      Object.assign(g.setup.info, { washerwoman: { pair: ["unknown"] } });
    },
  ] satisfies Array<(g: GameState) => void>) {
    const invalid = createGame(7);
    mutate(invalid);
    assert.doesNotThrow(() => validateState(invalid));
    assert.equal(s.importGame(JSON.stringify(invalid)).ok, false);
    assert.equal(JSON.stringify(s.state), before);
    assert.equal(values.get(STORAGE_KEY), disk);
  }
  assert.equal(importGame("null").ok, false);
  assert.equal(
    importGame({ v: 2, order: ["1", "2", "3", "4", "5"], nightOrder: [null] }).ok,
    false,
  );
});

test("storage failure rolls back a legacy action and retains no undo", async () => {
  const { module: s } = await store();
  localStorage.setItem = () => {
    throw new Error("quota");
  };
  const result = s.run((game) => {
    game.notes = "Keep this";
    return { ok: true };
  });
  assert.equal(result.ok, false);
  assert.equal(result.persisted, false);
  assert.notEqual(s.state.notes, "Keep this");
  assert.match(s.state.storageError ?? "", /quota/);
  assert.equal(s.canUndo(), false);
});

test("a stale tab cannot overwrite a newer disk revision", async () => {
  const { module: s, values } = await store(createGame(7));
  const newer = { ...createGame(7), revision: 10, notes: "newer" };
  values.set(STORAGE_KEY, JSON.stringify(newer));
  assert.equal(s.save(), false);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)!).notes, "newer");
});

test("saveIfNeeded leaves an already persisted game untouched and writes pending changes", async () => {
  const game = createGame(7);
  game.players["1"].name = "Alice";
  const { module: s, values } = await store(game);
  const disk = values.get(STORAGE_KEY);
  const revision = Number(s.state.revision) || 0;
  assert.equal(s.saveIfNeeded(), true);
  assert.equal(values.get(STORAGE_KEY), disk);
  assert.equal(Number(s.state.revision) || 0, revision);
  s.state.notes = "Saved before updating";
  assert.equal(s.saveIfNeeded(), true);
  assert.equal(JSON.parse(values.get(STORAGE_KEY)!).notes, "Saved before updating");
  assert.equal(s.state.revision, revision + 1);
});

test("a corrupt save is backed up and can be replaced by a valid game", async () => {
  const corrupt = { v: 3, revision: 9, players: null };
  const { module: s, values } = await store(corrupt);
  assert.equal(s.loadStatus.ok, false);
  assert.equal(values.get(s.loadStatus.backupKey!), JSON.stringify(corrupt));
  s.reset(7);
  assert.equal(validateState(JSON.parse(values.get(STORAGE_KEY)!)).length, 0);
});

test("a v3 save migrates to v4 with the Trouble Brewing script (SYS-STATE-05)", async () => {
  const v3 = createGame(7);
  v3.v = 3;
  v3.scriptId = "tb";
  Reflect.deleteProperty(v3, "script");
  const values = new Map<string, string>([["pg.game.v3", JSON.stringify(v3)]]);
  globalThis.localStorage = fakeStorage(values);
  const module = (await import("./store.ts?test=" + ++instance)) as StoreModule;
  assert.equal(module.state.v, 4);
  assert.equal(module.state.script.id, "tb");
  assert.equal(module.state.script.roles.length, 22);
  assert.ok(values.get("pg.game.v4"));
});

test("a custom script survives save and reload", async () => {
  const game = createGame(7);
  game.script = {
    id: "custom-test",
    name: "Test Script",
    edition: "custom",
    source: "file",
    roles: [
      "chef",
      "empath",
      "undertaker",
      "monk",
      "slayer",
      "soldier",
      "ravenkeeper",
      "mayor",
      "poisoner",
      "imp",
    ],
  };
  game.scriptId = game.script.id;
  game.setup.roles = ["chef", "empath", "undertaker", "monk", "slayer", "poisoner", "imp"];
  game.setup.bluffs = ["soldier", "ravenkeeper", "mayor"];
  const loaded = await store(game);
  loaded.module.save();
  const reloaded = await store(JSON.parse(loaded.values.get(STORAGE_KEY)!));
  assert.equal(reloaded.module.state.script.id, "custom-test");
  assert.equal(reloaded.module.state.script.name, "Test Script");
  assert.deepEqual(reloaded.module.state.setup.roles, game.setup.roles);
});

test("dispatch applies once, saves, and undo restores the previous state", async () => {
  const { module: s } = await store();
  const command = {
    id: "dispatch-1",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "1", value: false, reason: "test" } },
  };
  const first = s.dispatch(command);
  if (first.status !== "allowed") assert.fail(JSON.stringify(first));
  assert.equal(first.persisted, true);
  assert.equal(s.state.players["1"].alive, false);
  assert.equal(s.canUndo(), true);

  const second = s.dispatch(command);
  if (second.status !== "allowed") assert.fail(JSON.stringify(second));
  assert.equal(second.idempotent, true);
  assert.equal(s.state.players["1"].alive, false);

  s.undo();
  assert.equal(s.state.players["1"].alive, true);
});

test("dispatch rejects a command when the save fails and rolls back", async () => {
  const { module: s } = await store();
  const player = JSON.stringify(s.state.players["1"]);
  const corrections = s.state.corrections.length;
  localStorage.setItem = () => {
    throw new Error("quota");
  };

  const result = s.dispatch({
    id: "save-fail-1",
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "1", value: false, reason: "test" } },
  });

  if (result.status !== "rejected") assert.fail(JSON.stringify(result));
  assert.equal(result.errorCode, "persist-failed");
  assert.equal(result.persisted, false);
  assert.equal(JSON.stringify(s.state.players["1"]), player, "the in-memory state must roll back");
  assert.equal(s.state.players["1"].alive, true);
  assert.equal(s.state.corrections.length, corrections);
  assert.match(s.state.storageError || "", /quota/);
  assert.equal(s.canUndo(), false, "a failed save must not add undo history");
});

function poisonEffect(id: string, sourceId: string, targetId: string, night: number): Effect {
  return {
    id,
    kind: "poison",
    sourceId,
    targetId,
    start: { phase: "night", number: night },
    expires: null,
    active: true,
  };
}

test("cyclic effect imports are rejected without touching the current game or disk", async () => {
  const { module: s, values } = await store(createGame(7));
  const before = JSON.stringify(s.state);
  const disk = values.get(STORAGE_KEY);
  const cyclic = createGame(7);
  cyclic.effects.push(
    poisonEffect("import-a-b", "1", "2", 1),
    poisonEffect("import-b-a", "2", "1", 1),
  );

  const result = s.importGame(JSON.stringify(cyclic));
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "CYCLIC_EFFECT_DEPENDENCY");
  assert.equal(JSON.stringify(s.state), before);
  assert.equal(values.get(STORAGE_KEY), disk);
});

test("a cyclic saved game is backed up as corrupt and is not overwritten", async () => {
  const cyclic = createGame(7);
  cyclic.effects.push(
    poisonEffect("saved-a-b", "1", "2", 1),
    poisonEffect("saved-b-a", "2", "1", 1),
  );
  const raw = JSON.stringify(cyclic);
  const { module: s, values } = await store(cyclic);

  assert.equal(s.loadStatus.ok, false);
  assert.ok(s.loadStatus.backupKey);
  assert.equal(values.get(s.loadStatus.backupKey), raw);
  assert.equal(values.get(STORAGE_KEY), raw);
});

test("valid sequential mutual poison imports successfully", () => {
  const valid = createGame(7);
  valid.effects.push(
    poisonEffect("valid-a-b", "1", "2", 1),
    poisonEffect("valid-b-a", "2", "1", 2),
  );
  const result = importGame(valid);
  if (!result.ok) assert.fail(result.error);
  assert.equal(result.state.effects.length, 2);
});

// --- Persistence of mid-choice and effect state (#222) -----------------------

// A dealt game with stable names, built from a legal bag for its script.
function dealt(
  script: "tb" | "snv",
  assignment: Record<string, string>,
  count: number,
  bluffs: string[],
): GameState {
  const state = createGame(count);
  if (script === "snv") {
    state.script = sectsAndVioletsScript();
    state.scriptId = "snv";
  }
  const roles = Object.values(assignment);
  state.setup.count = count;
  state.setup.roles = roles;
  state.setup.bluffs = bluffs;
  const dealtGame = dealGame(state, { assignment });
  assert.equal(dealtGame.ok, true, JSON.stringify(dealtGame));
  autoSecrets(state);
  for (const id of state.order) state.players[id].name = "P" + id;
  return state;
}

function skipWholeNight(state: GameState): void {
  for (const step of state.night.queue) {
    if (step.done || step.skipped) continue;
    if (!skipStep(state, step.key, "fixture").ok) {
      step.done = true;
      step.skipped = true;
    }
  }
  const ended = endNight(state);
  assert.equal(ended.ok, true, JSON.stringify(ended));
}

function roleStep(state: GameState, roleId: string): NightStep {
  const step = state.night.queue.find(
    (candidate) => candidate.roleId === roleId && !candidate.done,
  );
  assert.ok(step, "no open step for " + roleId);
  return step;
}

// Night 2 with the Imp's self-kill unresolved: two living Minions make the
// Storyteller's heir choice pending, and no winner may be declared yet.
function pendingHeirGame(): { state: GameState; step: NightStep } {
  const state = dealt(
    "tb",
    {
      1: "soldier",
      2: "mayor",
      3: "empath",
      4: "chef",
      5: "virgin",
      6: "slayer",
      7: "washerwoman",
      8: "poisoner",
      9: "spy",
      10: "imp",
    },
    10,
    ["butler", "drunk", "recluse"],
  );
  assert.equal(startNight(state).ok, true);
  skipWholeNight(state);
  assert.equal(endDay(state).ok, true, "day 1 ends into night 2");

  const poison = roleStep(state, "poisoner");
  assert.equal(completeStep(state, poison.key, { targetIds: ["9"] }).ok, true);
  const imp = roleStep(state, "imp");
  const result = completeStep(state, imp.key, { targetIds: ["10"] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(imp.pending?.kind, "demon-inheritance");
  assert.equal(state.winner, null);
  return { state, step: imp };
}

test("a pending Imp heir survives save and reload, refuses the night end, and the choice replays", async () => {
  const { state: pending, step } = pendingHeirGame();
  const first = await store(pending);
  assert.equal(first.module.save(), true);
  const saved = first.values.get(STORAGE_KEY)!;
  assert.equal(
    JSON.parse(saved).night.queue.find((candidate: NightStep) => candidate.key === step.key).pending
      .kind,
    "demon-inheritance",
    "the save keeps the unresolved choice",
  );

  const reloaded = await store(JSON.parse(saved));
  const s = reloaded.module;
  const reloadedStep = s.state.night.queue.find(
    (candidate) => candidate.key === step.key && candidate.pending?.kind === "demon-inheritance",
  );
  assert.ok(reloadedStep, "the reload keeps the pending step");
  assert.deepEqual(reloadedStep.pending, {
    kind: "demon-inheritance",
    options: [
      { id: "8", name: "P8", roleId: "poisoner" },
      { id: "9", name: "P9", roleId: "spy" },
    ],
  });
  assert.equal(s.state.phase, "night");
  assert.equal(s.state.night.number, 2);
  assert.equal(s.state.winner, null, "no winner while the heir is unresolved");

  const ended = s.dispatch({ id: "heir-end-night", type: "endNight", payload: {} });
  assert.equal(ended.status, "rejected");
  assert.equal(ended.errorCode, "error.45");
  assert.equal(s.state.phase, "night", "the night cannot end");
  assert.equal(s.state.winner, null);

  const pendingCanonical = canonicalState(s.state);
  const stepKey = reloadedStep.key;
  const chosen = s.dispatch({
    id: "heir-choose-9",
    type: "chooseDemonHeir",
    payload: { stepKey, heirId: "9" },
  });
  assert.equal(chosen.status, "allowed", JSON.stringify(chosen));
  assert.equal(chosen.persisted, true);
  const resolvedStep = s.state.night.queue.find((candidate) => candidate.key === stepKey);
  assert.deepEqual(resolvedStep?.pending, null);
  assert.equal(s.state.players["9"].roleId, "imp");
  assert.equal(s.state.players["8"].roleId, "poisoner");
  assert.equal(s.state.winner, null, "the new Demon keeps the game going");
  assert.equal(s.state.journal.entries.length, 1);
  assert.equal(s.state.journal.entries[0]!.id, "heir-choose-9");
  assert.equal(s.state.journal.entries[0]!.type, "chooseDemonHeir");
  assert.deepEqual(s.state.journal.entries[0]!.payload, {
    stepKey,
    heirId: "9",
  });
  assert.equal(
    JSON.parse(reloaded.values.get(STORAGE_KEY)!).players["9"].roleId,
    "imp",
    "the chosen heir is on disk",
  );

  const chosenCanonical = canonicalState(s.state);
  const replayed = replay(s.state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  assert.deepEqual(canonicalState(replayed.state), chosenCanonical);

  assert.equal(s.undo(), true);
  assert.equal(s.state.players["9"].roleId, "spy", "undo restores the Minion");
  const restored = s.state.night.queue.find((candidate) => candidate.key === step.key);
  assert.equal(restored?.pending?.kind, "demon-inheritance", "undo restores the pending choice");
  assert.equal(s.state.winner, null);
  assert.deepEqual(canonicalState(s.state), pendingCanonical);

  assert.equal(s.redo(), true);
  assert.deepEqual(canonicalState(s.state), chosenCanonical, "redo returns the chosen state");
});

// Day 1 with a Cerenovus token on player 2 and the Cerenovus (seat 6) poisoned.
function poisonedCerenovusGame(): GameState {
  const state = dealt(
    "snv",
    {
      1: "clockmaker",
      2: "dreamer",
      3: "seamstress",
      4: "artist",
      5: "klutz",
      6: "cerenovus",
      7: "fanggu",
    },
    7,
    ["sage", "juggler", "savant"],
  );
  assert.equal(startNight(state).ok, true);
  const step = roleStep(state, "cerenovus");
  const marked = completeStep(state, step.key, { targetIds: ["2"], roleId: "dreamer" });
  assert.equal(marked.ok, true, JSON.stringify(marked));

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
  state.effects.push({
    id: "test-cerenovus-poison",
    kind: "poison",
    sourceId: "1",
    targetId: "6",
    start: { phase: "day", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
  });
  return state;
}

test("a poisoned Cerenovus's saved madness stays suspended across reload and resumes on replay", async () => {
  const state = poisonedCerenovusGame();
  const tokenId = "eff-madness-cerenovus-6-2-1";
  const token = state.effects.find((effect) => effect.id === tokenId);
  assert.ok(token, "the Cerenovus token exists");
  assert.deepEqual(token.expires, { phase: "day", number: 2 });
  assert.equal(isImpaired(state, "6"), true);
  assert.equal(activeMadness(state, "2"), null, "the poisoned source imposes no madness");
  assert.deepEqual(validateState(state), []);

  const first = await store(state);
  assert.equal(first.module.save(), true);
  const reloaded = await store(JSON.parse(first.values.get(STORAGE_KEY)!));
  const s = reloaded.module;

  const savedToken = s.state.effects.find((effect) => effect.id === tokenId);
  assert.ok(savedToken, "the token survives the save");
  assert.equal(savedToken.sourceId, "6");
  assert.equal(savedToken.targetId, "2");
  assert.equal(savedToken.roleId, "dreamer");
  assert.deepEqual(savedToken.expires, { phase: "day", number: 2 });
  assert.equal(isImpaired(s.state, "6"), true, "the saved poison stays active");
  assert.equal(activeMadness(s.state, "2"), null, "the reload keeps the madness suspended");
  const suspendedCanonical = canonicalState(s.state);

  const removed = s.dispatch({
    id: "heal-cerenovus",
    type: "manualCorrection",
    payload: {
      change: {
        kind: "effect",
        effectId: "test-cerenovus-poison",
        value: false,
        reason: "The poison is removed for the check.",
      },
    },
  });
  assert.equal(removed.status, "allowed", JSON.stringify(removed));
  assert.equal(isImpaired(s.state, "6"), false);
  assert.equal(activeMadness(s.state, "2")?.id, tokenId, "removing the poison resumes the madness");
  assert.equal(s.state.journal.entries.length, 1);
  assert.equal(s.state.journal.entries[0]!.type, "manualCorrection");
  assert.deepEqual(s.state.journal.entries[0]!.payload!.change, {
    kind: "effect",
    effectId: "test-cerenovus-poison",
    value: false,
    reason: "The poison is removed for the check.",
  });

  const activeCanonical = canonicalState(s.state);
  const replayed = replay(s.state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  assert.deepEqual(canonicalState(replayed.state), activeCanonical);

  assert.equal(s.undo(), true);
  assert.equal(isImpaired(s.state, "6"), true, "undo restores the poison");
  assert.equal(activeMadness(s.state, "2"), null, "and suspends the madness again");
  assert.deepEqual(canonicalState(s.state), suspendedCanonical);

  assert.equal(s.redo(), true);
  assert.deepEqual(canonicalState(s.state), activeCanonical);
});

// A manual-only mixed script keeps every role legal in one saved state.
function deadSourceDrunkGame(): GameState {
  const state = createGame(9);
  state.script = {
    id: "custom-store-replay",
    name: "Store replay",
    edition: "custom",
    source: "test",
    manualOnly: true,
    roles: [...BMR_ALL, "sweetheart"],
  };
  state.scriptId = state.script.id;
  const assignment = {
    1: "sweetheart",
    2: "chambermaid",
    3: "goon",
    4: "courtier",
    5: "minstrel",
    6: "assassin",
    7: "po",
    8: "tinker",
    9: "moonchild",
  } as const;
  state.setup.roles = Object.values(assignment);
  state.setup.bluffs = [];
  for (const [id, roleId] of Object.entries(assignment)) {
    const player = state.players[id]!;
    player.roleId = roleId;
    player.shownRoleId = roleId;
    player.team = roleTeam(roleId) === "minion" || roleTeam(roleId) === "demon" ? "evil" : "good";
    player.name = "P" + id;
  }
  state.phase = "night";
  state.night.number = 2;
  for (const dead of ["1", "3", "5"]) state.players[dead]!.alive = false;
  state.effects.push(
    {
      id: "eff-minstrel-drunk-dead-source",
      kind: "drunk",
      sourceId: "5",
      targetId: "2",
      start: { phase: "day", number: 1 },
      expires: { phase: "night", number: 3 },
      active: true,
    },
    {
      id: "eff-sweetheart-drunk-dead-source",
      kind: "drunk",
      sourceId: "1",
      targetId: "4",
      start: { phase: "day", number: 1 },
      expires: null,
      active: true,
      onDeath: true,
    },
    {
      id: "eff-goon-drunk-dead-source",
      kind: "drunk",
      sourceId: "3",
      targetId: "6",
      start: { phase: "night", number: 2 },
      expires: { phase: "night", number: 3 },
      active: true,
      permanent: true,
    },
  );
  return state;
}

test("a reload keeps a dead Minstrel's drunk ended, a dead Sweetheart's on-death drunk, and the Goon's permanent drunk", async () => {
  const state = deadSourceDrunkGame();
  assert.deepEqual(validateState(state), []);
  const at = { phase: "night" as const, number: 2 };
  const before = effectGraph(state, at);
  assert.equal(before.ok, true, JSON.stringify(before));
  assert.equal(before.activeDrunk.has("eff-minstrel-drunk-dead-source"), false);
  assert.equal(before.activeDrunk.has("eff-sweetheart-drunk-dead-source"), true);
  assert.equal(before.activeDrunk.has("eff-goon-drunk-dead-source"), true);

  const first = await store(state);
  assert.equal(first.module.save(), true);
  const reloaded = await store(JSON.parse(first.values.get(STORAGE_KEY)!));
  const s = reloaded.module;

  assert.deepEqual(
    s.state.effects.map((effect) => effect.id),
    [
      "eff-minstrel-drunk-dead-source",
      "eff-sweetheart-drunk-dead-source",
      "eff-goon-drunk-dead-source",
    ],
    "the save keeps every effect record",
  );
  const graph = effectGraph(s.state, at);
  assert.equal(graph.ok, true, JSON.stringify(graph));
  assert.equal(graph.activeDrunk.has("eff-minstrel-drunk-dead-source"), false);
  assert.equal(graph.activeDrunk.has("eff-sweetheart-drunk-dead-source"), true);
  assert.equal(graph.activeDrunk.has("eff-goon-drunk-dead-source"), true);
  assert.equal(isImpaired(s.state, "2", at), false, "the dead Minstrel's drunk has ended");
  assert.equal(isImpaired(s.state, "4", at), true, "the Sweetheart's death drunk persists");
  assert.equal(isImpaired(s.state, "6", at), true, "the Goon's permanent drunk stays");
});
