import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clone,
  createGame,
  exportGame as exportSavedGame,
  importGame as importSavedGame,
  validateState,
} from "../../core/model/state.ts";
import {
  autoSecrets,
  canonicalState,
  currentStep,
  dealGame,
  endNight,
  replay,
  skipStep,
  startNight,
} from "../../core/engine/index.ts";
import {
  ANY_ROLE_ZERO_RULESET_VERSION,
  ANY_STEP_RESURRECTS_RULESET_VERSION,
  OPEN_TINKER_STEP_RULESET_VERSION,
  REPEATED_DEMON_WAKE_RULESET_VERSION,
  RULESET_VERSION,
} from "../../core/engine/command-versions.ts";
import { fingerprintOf } from "../../core/engine/command-state.ts";
import { createGameStore } from "./create-game-store.ts";
import type { GameStore } from "./create-game-store.ts";
import type { StorePorts } from "../ports/index.ts";

const KEY = "pg.game.v4";

function memoryStorage(initial: string | null = null, legacy: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(legacy));
  if (initial !== null) values.set(KEY, initial);
  return {
    fail: false,
    writes: 0,
    backupText: null as string | null,
    values,
    listeners: [] as (() => void)[],
    read: () => (values.has(KEY) ? JSON.parse(values.get(KEY) as string) : null),
    readRaw: () => values.get(KEY) ?? null,
    write(text: string) {
      if (this.fail) throw new Error("quota exceeded");
      this.writes += 1;
      values.set(KEY, text);
    },
    remove() {
      values.delete(KEY);
    },
    backup(text: string) {
      this.backupText = text;
      return "pg.game.broken.1";
    },
    readFallback() {
      for (const key of ["pg.game.v3", "pg.game.v2"]) {
        const value = values.get(key);
        if (value) return { key, value };
      }
      return null;
    },
    watch: function (this: { listeners: (() => void)[] }, listener: () => void) {
      this.listeners.push(listener);
      return () => {};
    },
    emit(this: { listeners: (() => void)[] }) {
      for (const listener of this.listeners) listener();
    },
  };
}

let sequence = 0;
function ports(storage = memoryStorage()): StorePorts {
  return {
    storage,
    clock: { now: () => new Date("2026-11-11T12:00:00.000Z") },
    ids: { next: (prefix = "cmd") => `${prefix}-${++sequence}` },
    random: { seed: () => 12345 },
  };
}

function store(storage = memoryStorage()) {
  return { game: createGameStore(ports(storage)), storage };
}

function command(game: GameStore, input: Parameters<GameStore["prepare"]>[0]) {
  const prepared = game.prepare(input);
  if (!prepared.ok) throw new Error(prepared.reason);
  return prepared.command;
}

function orderCommand(game: GameStore, order: string[]) {
  return command(game, { type: "setOrder", payload: { order } });
}

test("the store loads a saved game through the codec", () => {
  const saved = createGame(7);
  saved.players["1"].name = "Alice";
  saved.players["1"].claimed = true;
  const { game } = store(memoryStorage(JSON.stringify({ ...saved, revision: 3 })));
  assert.equal(game.getSnapshot().state.players["1"].name, "Alice");
  assert.equal(game.getSnapshot().gameRevision, 3);
});

test("an accepted command persists, publishes once and advances the revision", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  const order = [...before.state.order].reverse();
  const outcome = game.dispatch(orderCommand(game, order));
  assert.equal(outcome.status, "allowed");
  assert.equal(outcome.persisted, true);
  const after = game.getSnapshot();
  assert.deepEqual(after.state.order, order);
  assert.equal(after.gameRevision, before.gameRevision + 1);
  assert.notEqual(after, before);
  assert.equal(storage.writes, 1);
  assert.equal(JSON.parse(storage.values.get(KEY) as string).revision, after.gameRevision);
});

test("a repeated prepared command is a no-op with one write", () => {
  const { game, storage } = store();
  const order = [...game.getSnapshot().state.order].reverse();
  const command = orderCommand(game, order);
  assert.equal(game.dispatch(command).status, "allowed");
  const repeated = game.dispatch(command);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(storage.writes, 1);
});

test("a rejected, Storyteller-choice or preview command cannot mutate or persist", () => {
  const { game, storage } = store();
  // A legal five-player bag whose Poisoner wakes before the Chef: the poisoned
  // Chef has to be given false information, so its step is a host choice.
  assert.equal(
    game.dispatch(
      command(game, {
        type: "bagUpdate",
        payload: {
          patch: {
            count: 5,
            roles: ["chef", "empath", "investigator", "poisoner", "imp"],
            bluffs: ["butler", "drunk", "saint"],
          },
        },
      }),
    ).status,
    "allowed",
  );
  assert.equal(
    game.dispatch(
      command(game, {
        type: "startGame",
        payload: {
          options: {
            assignment: {
              "1": "chef",
              "2": "empath",
              "3": "investigator",
              "4": "poisoner",
              "5": "imp",
            },
          },
        },
      }),
    ).status,
    "allowed",
  );
  const step = (roleId: string) => {
    const found = game.state.night.queue.find((candidate) => candidate.roleId === roleId);
    assert.ok(found, roleId + " wakes");
    return found.key;
  };
  assert.equal(
    game.dispatch(
      command(game, {
        type: "completeNightStep",
        payload: { key: step("poisoner"), targetIds: ["1"] },
      }),
    ).status,
    "allowed",
  );

  const before = game.getSnapshot();
  const serialized = JSON.stringify(game.state);
  const writes = storage.writes;
  let published = 0;
  game.subscribe(() => {
    published += 1;
  });

  const rejected = game.dispatch(
    command(game, { type: "completeNightStep", payload: { key: "missing-step" } }),
  );
  assert.equal(rejected.status, "rejected");
  const choice = game.dispatch(
    command(game, { type: "completeNightStep", payload: { key: step("chef") } }),
  );
  assert.equal(choice.status, "requires-storyteller-choice");
  const preview = game.preview(
    command(game, { type: "completeNightStep", payload: { key: step("empath") } }),
  );
  assert.equal(preview.status, "allowed");

  assert.equal(
    JSON.stringify(game.state),
    serialized,
    "no outcome may touch the state, journal, ledger or timestamp",
  );
  assert.equal(game.getSnapshot(), before, "no outcome may publish a snapshot");
  assert.equal(published, 0);
  assert.equal(storage.writes, writes, "no outcome may write the save");
});

test("a repeated id with another payload or a foreign ruleset version is rejected unsaved", () => {
  const { game, storage } = store();
  const order = [...game.state.order].reverse();
  const accepted = orderCommand(game, order);
  assert.equal(game.dispatch(accepted).status, "allowed");

  const before = game.getSnapshot();
  const serialized = JSON.stringify(game.state);
  const writes = storage.writes;

  const conflict = game.dispatch(
    command(game, { type: "setOrder", payload: { order: [...order].reverse() }, id: accepted.id }),
  );
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");

  const foreign = { ...accepted, id: "foreign-ruleset", rulesetVersion: "tb-2019-10-01" };
  const unsupported = game.dispatch(foreign);
  assert.equal(unsupported.status, "rejected");
  assert.equal(unsupported.errorCode, "ruleset-version-unsupported");

  assert.equal(JSON.stringify(game.state), serialized, "the journal and the ledger stay unchanged");
  assert.equal(game.getSnapshot(), before);
  assert.equal(storage.writes, writes);
});

test("a failed direct save publishes only the save status, not a revision", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  storage.fail = true;
  const outcome = game.persist();
  assert.equal(outcome.ok, false);

  const after = game.getSnapshot();
  assert.equal(
    after.gameRevision,
    before.gameRevision,
    "a revision that never reached disk stays unpinned",
  );
  assert.equal(
    after.state.updatedAt,
    before.state.updatedAt,
    "a failed write claims no new timestamp",
  );
  assert.equal(after.save.status, "failed");
  assert.equal(after.save.errorCode, "persist-failed");
  storage.fail = false;
});

test("a failed legacy run never publishes the uncommitted mutation", () => {
  const { game, storage } = store();
  const notes = game.getSnapshot().state.notes;
  const published: string[] = [];
  game.subscribe(() => published.push(game.getSnapshot().state.notes));
  storage.fail = true;
  const result = game.run((state) => {
    state.notes = "unsaved";
  });
  assert.equal(result.ok, false);
  assert.equal(published.includes("unsaved"), false, "the draft is never published");
  assert.equal(published.at(-1), notes, "only the rolled-back state is published");
  assert.equal(game.getSnapshot().save.status, "failed");
  storage.fail = false;
});

test("a stale-disk legacy run publishes only the rolled-back state", () => {
  const storage = memoryStorage();
  const { game } = store(storage);
  const before = game.getSnapshot();
  const published: string[] = [];
  game.subscribe(() => published.push(game.getSnapshot().state.notes));
  storage.values.set(KEY, JSON.stringify({ ...before.state, revision: 99, notes: "another tab" }));
  const result = game.run((state) => {
    state.notes = "unsaved";
  });
  assert.equal(result.ok, false);
  assert.equal(published.includes("unsaved"), false);
  assert.equal(game.getSnapshot().state.notes, before.state.notes);
  assert.equal(game.getSnapshot().save.status, "failed");
});

test("a failed legacy run write restores the state and history", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  storage.fail = true;
  const result = game.run((state) => {
    state.notes = "legacy failed";
  });
  assert.equal(result.ok, false);
  assert.equal(result.persisted, false);
  assert.equal(game.getSnapshot().state.notes, before.state.notes);
  assert.equal(game.canUndo(), false, "the failed run leaves no legacy undo");
  storage.fail = false;
});

test("a failed write publishes only the save status and keeps the game", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  const order = [...before.state.order].reverse();
  storage.fail = true;
  const outcome = game.dispatch(orderCommand(game, order));
  assert.equal(outcome.status, "rejected");
  assert.equal(outcome.persisted, false);
  assert.equal(outcome.errorCode, "persist-failed");

  const after = game.getSnapshot();
  assert.equal(after.state, before.state);
  assert.equal(after.gameRevision, before.gameRevision);
  assert.deepEqual(after.state.order, before.state.order);
  assert.equal(after.save.status, "failed");
  assert.equal(after.viewVersion, before.viewVersion + 1);
  storage.fail = false;
});

test("a failed write after a winning command rolls back the death and the winner", () => {
  const { game, storage } = store();
  const state = createGame(7);
  const assignment = {
    1: "slayer",
    2: "chef",
    3: "empath",
    4: "monk",
    5: "soldier",
    6: "poisoner",
    7: "imp",
  };
  Object.keys(assignment).forEach((id) => {
    state.players[id].name = "P" + id;
  });
  state.setup.count = 7;
  state.setup.roles = [...new Set(Object.values(assignment))];
  state.setup.bluffs = ["butler", "drunk", "saint"];
  const dealt = dealGame(state, { assignment });
  assert.equal(dealt.ok, true, JSON.stringify(dealt));
  autoSecrets(state);
  assert.equal(startNight(state).ok, true);
  while (state.night.queue.some((step) => !step.done && !step.skipped)) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped)!;
    assert.equal(skipStep(state, step.key, "fixture").ok, true);
  }
  assert.equal(endNight(state).ok, true);
  assert.equal(game.replaceState(state).ok, true);
  const before = game.getSnapshot();
  const prepared = game.prepare({
    type: "useSlayer",
    payload: { slayerId: "1", targetId: "7" },
  });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  storage.fail = true;
  const outcome = game.dispatch(prepared.command);
  assert.equal(outcome.status, "rejected");
  assert.equal(outcome.errorCode, "persist-failed");
  const after = game.getSnapshot();
  assert.equal(after.state, before.state);
  assert.equal(after.state.deaths.length, 0, "the pre-command state has no death");
  assert.equal(after.state.winner, null, "the pre-command state has no winner");
  assert.equal(after.state.journal.entries.length, 0, "the failed command leaves no journal entry");
  storage.fail = false;
});

test("an identical repeated failure does not publish another snapshot", () => {
  const { game, storage } = store();
  storage.fail = true;
  game.dispatch(orderCommand(game, [...game.getSnapshot().state.order].reverse()));
  const first = game.getSnapshot();
  game.dispatch(orderCommand(game, [...game.getSnapshot().state.order].reverse()));
  assert.equal(game.getSnapshot(), first);
  storage.fail = false;
});

test("a later successful write clears the saved status", () => {
  const { game, storage } = store();
  storage.fail = true;
  game.dispatch(orderCommand(game, [...game.getSnapshot().state.order].reverse()));
  assert.equal(game.getSnapshot().save.status, "failed");
  storage.fail = false;
  const outcome = game.dispatch(orderCommand(game, [...game.getSnapshot().state.order].reverse()));
  assert.equal(outcome.status, "allowed");
  assert.equal(game.getSnapshot().save.status, "saved");
  assert.equal(game.getSnapshot().save.status, "saved");
});

test("undo restores the previous game", () => {
  const { game } = store();
  const original = [...game.getSnapshot().state.order];
  game.dispatch(orderCommand(game, [...original].reverse()));
  assert.equal(game.canUndo(), true);
  assert.equal(game.undo().ok, true);
  assert.deepEqual(game.getSnapshot().state.order, original);
});

test("undo and redo replay the journal and a new dispatch clears redo", () => {
  const { game } = store();
  const original = [...game.getSnapshot().state.order];
  game.dispatch(orderCommand(game, [...original].reverse()));
  const changed = [...game.getSnapshot().state.order];

  assert.equal(game.undo().ok, true);
  assert.deepEqual(game.getSnapshot().state.order, original);
  assert.equal(game.canRedo(), true);

  assert.equal(game.redo().ok, true);
  assert.deepEqual(game.getSnapshot().state.order, changed);
  assert.equal(game.canRedo(), false);
  assert.equal(game.canUndo(), true);

  game.dispatch(orderCommand(game, original));
  assert.equal(game.canRedo(), false, "a new command drops the redo stack");
});

test("undo and redo persist the replayed game instead of skipping the save", () => {
  const storage = memoryStorage();
  const { game } = store(storage);
  const original = [...game.state.order];
  assert.equal(game.dispatch(orderCommand(game, [...original].reverse())).status, "allowed");
  const changed = [...game.state.order];
  const writes = storage.writes;
  const revision = game.getSnapshot().gameRevision;

  assert.equal(game.undo().ok, true);
  assert.equal(storage.writes, writes + 1, "undo writes the replayed game");
  const undone = JSON.parse(storage.readRaw() as string) as {
    order: string[];
    revision: number;
    journal: { entries: unknown[] };
  };
  assert.deepEqual(undone.order, original);
  assert.equal(undone.revision, revision + 1);
  assert.equal(undone.journal.entries.length, 0, "the journal stays coherent after undo");

  assert.equal(game.redo().ok, true);
  assert.equal(storage.writes, writes + 2, "redo writes the replayed game");
  const redone = JSON.parse(storage.readRaw() as string) as {
    order: string[];
    revision: number;
    journal: { entries: unknown[] };
  };
  assert.deepEqual(redone.order, changed);
  assert.equal(redone.revision, revision + 2);
  assert.equal(redone.journal.entries.length, 1);
});

test("legacy run undo restores the loaded undo floor", () => {
  const storage = memoryStorage();
  const first = createGameStore(ports(storage));
  const order = [...first.getSnapshot().state.order];
  first.dispatch(orderCommand(first, [...order].reverse()));
  first.dispatch(orderCommand(first, order));
  const loaded = [...first.getSnapshot().state.order];

  const second = createGameStore(ports(storage));
  assert.equal(second.canUndo(), false, "loaded entries are history, not undo");
  const result = second.run((state) => {
    state.notes = "legacy change";
    return { ok: true };
  });
  assert.equal(result.ok, true);
  assert.equal(second.canUndo(), true);
  assert.equal(second.undo().ok, true);
  assert.deepEqual(second.getSnapshot().state.order, loaded);
  assert.equal(second.getSnapshot().state.notes, "");
  assert.equal(second.canUndo(), false, "the loaded entries stay outside undo");
});

test("a reset command clears the legacy undo snapshot", () => {
  const { game } = store();
  const result = game.run((state) => {
    state.notes = "legacy change";
    return { ok: true };
  });
  assert.equal(result.ok, true);
  assert.equal(game.canUndo(), true);
  const prepared = game.prepare({ type: "newGame", payload: { count: 6 } });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const reset = game.dispatch(prepared.command);
  assert.equal(reset.status, "allowed", JSON.stringify(reset));
  assert.equal(game.canUndo(), false, "a reset starts a new history");
  assert.equal(game.canRedo(), false);
});

test("a legacy save without a journal keeps its log and accepts a command", () => {
  const saved = createGame(7);
  saved.log.push({
    id: "log-1",
    at: "2026-11-11T12:00:00.000Z",
    phase: "setup",
    kind: "setup",
    title: "Roli razdany",
    detail: "",
    playerId: null,
    secret: false,
  });
  delete (saved as Partial<typeof saved>).journal;
  const { game } = store(memoryStorage(JSON.stringify(saved)));
  assert.equal(game.getSnapshot().state.log.length, 1, "the narrative log survives the load");
  assert.deepEqual(game.getSnapshot().state.journal, { base: null, entries: [] });
  const command = orderCommand(game, [...game.getSnapshot().state.order].reverse());
  assert.equal(game.dispatch(command).status, "allowed");
});

test("undo with a failed write rolls back and keeps the history", () => {
  const { game, storage } = store();
  const original = [...game.getSnapshot().state.order];
  game.dispatch(orderCommand(game, [...original].reverse()));
  const changed = [...game.getSnapshot().state.order];
  storage.fail = true;
  const result = game.undo();
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "persist-failed");
  assert.deepEqual(game.getSnapshot().state.order, changed);
  assert.equal(game.canUndo(), true);
  storage.fail = false;
  assert.equal(game.undo().ok, true);
  assert.deepEqual(game.getSnapshot().state.order, original);
});

test("an import with a failed write leaves the game unchanged", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  storage.fail = true;
  const result = game.importGame(game.exportGame());
  assert.equal(result.ok, false);
  assert.equal(game.getSnapshot().state, before.state);
  assert.deepEqual(game.getSnapshot().state.order, before.state.order);
  storage.fail = false;
});

test("a failed replacement operation never publishes the uncommitted game", () => {
  const operations = [
    {
      name: "reset",
      replacement: "",
      apply: (game: GameStore) => game.reset(7),
    },
    {
      name: "replaceState",
      replacement: "replacement",
      apply: (game: GameStore) => {
        const next = createGame(7);
        next.notes = "replacement";
        return game.replaceState(next);
      },
    },
    {
      name: "importGame",
      replacement: "imported",
      apply: (game: GameStore) => {
        const next = createGame(7);
        next.notes = "imported";
        return game.importGame(exportSavedGame(next));
      },
    },
  ];
  for (const operation of operations) {
    for (const mode of ["thrown", "stale"] as const) {
      const storage = memoryStorage();
      const { game } = store(storage);
      assert.equal(
        game.dispatch(command(game, { type: "setNotes", payload: { notes: "before" } })).status,
        "allowed",
      );
      const published: string[] = [];
      game.subscribe(() => published.push(game.getSnapshot().state.notes));
      if (mode === "thrown") {
        storage.fail = true;
      } else {
        const disk = createGame(7);
        disk.notes = "another tab";
        disk.revision = 99;
        storage.values.set(KEY, JSON.stringify(disk));
      }
      const result = operation.apply(game);
      assert.equal(result.ok, false, operation.name + " / " + mode);
      assert.equal(
        game.getSnapshot().state.notes,
        "before",
        operation.name + " / " + mode + " restores the game",
      );
      assert.equal(
        published.includes(operation.replacement),
        false,
        operation.name + " / " + mode + " never publishes the replacement",
      );
      assert.equal(
        published.at(-1),
        "before",
        operation.name + " / " + mode + " publishes the rolled-back state",
      );
      assert.equal(game.getSnapshot().save.status, "failed");
      storage.fail = false;
    }
  }
});

test("a dispatch from a tab whose disk moved cannot publish or overwrite", () => {
  const initial = createGame(7);
  initial.notes = "initial";
  const storage = memoryStorage(JSON.stringify(initial));
  const first = store(storage).game;
  const second = store(storage).game;
  assert.equal(
    first.dispatch(command(first, { type: "setNotes", payload: { notes: "first" } })).status,
    "allowed",
  );
  const disk = storage.readRaw();
  const published: string[] = [];
  second.subscribe(() => published.push(second.getSnapshot().state.notes));
  const result = second.dispatch(
    command(second, { type: "setNotes", payload: { notes: "second" } }),
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "persist-failed");
  assert.equal(second.getSnapshot().state.notes, "initial");
  assert.equal(storage.readRaw(), disk);
  assert.equal(published.includes("second"), false);
  assert.equal(published.at(-1), "initial");
});

test("a command that violates invariants is rejected without mutation or publication", () => {
  const { game, storage } = store();
  Reflect.set(game.state.players["1"], "roleId", "not-a-role");
  const before = game.getSnapshot();
  const serialized = JSON.stringify(game.state);
  const writes = storage.writes;
  let published = 0;
  game.subscribe(() => {
    published += 1;
  });
  const result = game.dispatch(
    command(game, { type: "setOrder", payload: { order: [...game.state.order].reverse() } }),
  );
  assert.equal(result.status, "rejected");
  assert.equal(result.errorCode, "invariant-violation");
  assert.equal(JSON.stringify(game.state), serialized);
  assert.equal(game.getSnapshot(), before);
  assert.equal(published, 0);
  assert.equal(storage.writes, writes);
});

test("a repeated record-only command stays idempotent after journal coalescing", () => {
  const { game, storage } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "one" } });
  assert.equal(game.dispatch(first).status, "allowed");
  assert.equal(
    game.dispatch(command(game, { type: "setNotes", payload: { notes: "two" } })).status,
    "allowed",
  );
  const writes = storage.writes;
  const repeated = game.dispatch(first);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(game.getSnapshot().state.notes, "two");
  assert.equal(storage.writes, writes);
});

test("an accepted record-only id survives coalescing and an undo replay", () => {
  const { game, storage } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "one" } });
  assert.equal(game.dispatch(first).status, "allowed");
  assert.equal(
    game.dispatch(command(game, { type: "setNotes", payload: { notes: "two" } })).status,
    "allowed",
  );
  const order = command(game, {
    type: "setOrder",
    payload: { order: [...game.state.order].reverse() },
  });
  assert.equal(game.dispatch(order).status, "allowed");
  assert.equal(Object.keys(game.state.applied).length, 3);
  assert.equal(game.undo().ok, true);
  assert.equal(Object.hasOwn(game.state.applied, first.id), true);
  assert.equal(Object.hasOwn(game.state.applied, order.id), false);
  assert.equal(Object.keys(game.state.applied).length, 2);
  assert.equal(JSON.stringify(game.state.applied).includes("one"), false);

  const writes = storage.writes;
  const repeated = game.dispatch(first);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(game.getSnapshot().state.notes, "two");
  assert.equal(storage.writes, writes);
});

test("redo restores the undone id without losing a coalesced accepted id", () => {
  const { game, storage } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "one" } });
  assert.equal(game.dispatch(first).status, "allowed");
  assert.equal(
    game.dispatch(command(game, { type: "setNotes", payload: { notes: "two" } })).status,
    "allowed",
  );
  const original = [...game.state.order];
  const order = command(game, {
    type: "setOrder",
    payload: { order: [...original].reverse() },
  });
  assert.equal(game.dispatch(order).status, "allowed");
  assert.equal(game.undo().ok, true);
  assert.equal(game.redo().ok, true);
  assert.equal(Object.hasOwn(game.state.applied, first.id), true);
  assert.equal(Object.hasOwn(game.state.applied, order.id), true);

  const writes = storage.writes;
  const repeatedFirst = game.dispatch(first);
  const repeatedOrder = game.dispatch(order);
  assert.equal(repeatedFirst.status, "allowed");
  assert.equal(repeatedOrder.status, "allowed");
  if (repeatedFirst.status !== "allowed" || repeatedOrder.status !== "allowed") return;
  assert.equal(repeatedFirst.idempotent, true);
  assert.equal(repeatedOrder.idempotent, true);
  assert.equal(storage.writes, writes);
  assert.deepEqual(game.getSnapshot().state.order, [...original].reverse());
});

test("an undone id leaves the ledger and applies again", () => {
  const { game, storage } = store();
  const order = command(game, {
    type: "setOrder",
    payload: { order: [...game.state.order].reverse() },
  });
  assert.equal(game.dispatch(order).status, "allowed");
  assert.equal(game.undo().ok, true);
  assert.equal(Object.hasOwn(game.state.applied, order.id), false);
  assert.equal(game.canRedo(), true);
  const writes = storage.writes;
  const repeated = game.dispatch(order);
  assert.equal(repeated.status, "allowed");
  assert.notEqual(repeated.idempotent, true);
  assert.equal(storage.writes, writes + 1);
  assert.equal(game.canRedo(), false);
});

test("an accepted id survives undo, save and reload", () => {
  const { game, storage } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "one" } });
  assert.equal(game.dispatch(first).status, "allowed");
  assert.equal(
    game.dispatch(command(game, { type: "setNotes", payload: { notes: "two" } })).status,
    "allowed",
  );
  assert.equal(
    game.dispatch(
      command(game, {
        type: "setOrder",
        payload: { order: [...game.state.order].reverse() },
      }),
    ).status,
    "allowed",
  );
  assert.equal(game.undo().ok, true);

  const reloaded = store(storage).game;
  const writes = storage.writes;
  const repeated = reloaded.dispatch(first);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(reloaded.getSnapshot().state.notes, "two");
  assert.equal(storage.writes, writes);
  assert.equal(JSON.stringify(reloaded.state.applied).includes("one"), false);

  const conflict = reloaded.dispatch(
    command(reloaded, { id: first.id, type: "setNotes", payload: { notes: "other" } }),
  );
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");
});

test("an id coalesced by an older save has no ledger record and applies again", () => {
  const { game, storage } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "one" } });
  assert.equal(game.dispatch(first).status, "allowed");
  assert.equal(
    game.dispatch(command(game, { type: "setNotes", payload: { notes: "two" } })).status,
    "allowed",
  );

  const saved = clone(game.state);
  delete saved.applied[first.id];
  storage.values.set(KEY, JSON.stringify(saved));
  const reloaded = store(storage).game;
  const repeated = reloaded.dispatch(first);
  assert.equal(repeated.status, "allowed");
  assert.notEqual(repeated.idempotent, true);
  assert.equal(reloaded.getSnapshot().state.notes, "one");
});

test("a legacy full fingerprint coexists with a compact identity", () => {
  const { game, storage } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "legacy" } });
  assert.equal(game.dispatch(first).status, "allowed");
  const order = command(game, {
    type: "setOrder",
    payload: { order: [...game.state.order].reverse() },
  });
  assert.equal(game.dispatch(order).status, "allowed");

  const entry = game.state.applied[first.id];
  assert.ok(entry);
  delete entry.identity;
  entry.fingerprint = fingerprintOf(first, RULESET_VERSION);
  storage.values.set(KEY, JSON.stringify(game.state));

  const reloaded = store(storage).game;
  const repeated = reloaded.dispatch(first);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(reloaded.getSnapshot().state.notes, "legacy");
  const repeatedOrder = reloaded.dispatch(order);
  assert.equal(repeatedOrder.status, "allowed");
  assert.equal(repeatedOrder.idempotent, true);
  const conflict = reloaded.dispatch(
    command(reloaded, { id: first.id, type: "setNotes", payload: { notes: "other" } }),
  );
  assert.equal(conflict.status, "rejected");
  assert.equal(conflict.errorCode, "command-id-conflict");

  const replayed = replay(reloaded.state.journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(replayed.state), canonicalState(reloaded.state));
});

test("a history reset clears the applied ledger of the previous game", () => {
  const { game } = store();
  const first = command(game, { type: "setNotes", payload: { notes: "one" } });
  assert.equal(game.dispatch(first).status, "allowed");
  assert.equal(
    game.dispatch(command(game, { type: "newGame", payload: { count: 7 } })).status,
    "allowed",
  );
  assert.equal(Object.hasOwn(game.state.applied, first.id), false);
  const repeated = game.dispatch(first);
  assert.equal(repeated.status, "allowed");
  assert.notEqual(repeated.idempotent, true);
  assert.equal(game.getSnapshot().state.notes, "one");

  const imported = exportSavedGame(createGame(7));
  assert.equal(game.importGame(imported).ok, true);
  assert.equal(Object.hasOwn(game.state.applied, first.id), false);
  game.reset(7);
  assert.equal(Object.keys(game.state.applied).length, 0);
});

test("a malformed import is rejected without a write", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  const result = game.importGame('{"format":"pocket-grimoire","version":4,"game":{"v":4}}');
  assert.equal(result.ok, false);
  assert.equal(storage.writes, 0);
  assert.equal(game.getSnapshot().state, before.state);
});

test("export and import round-trip the canonical state and the journal", () => {
  const { game } = store();
  assert.equal(
    game.dispatch(orderCommand(game, [...game.state.order].reverse())).status,
    "allowed",
  );
  assert.equal(
    game.dispatch(command(game, { type: "setNotes", payload: { notes: "secret" } })).status,
    "allowed",
  );
  const exported = game.exportGame();

  const decoded = importSavedGame(exported);
  assert.equal(decoded.ok, true);
  if (!decoded.ok) return;
  assert.deepEqual(canonicalState(decoded.state), canonicalState(game.state));
  assert.deepEqual(decoded.state.journal, game.state.journal, "the codec keeps the journal");

  const restored = store();
  assert.equal(restored.game.importGame(exported).ok, true);
  assert.deepEqual(canonicalState(restored.game.state), canonicalState(game.state));
  assert.equal(restored.game.canUndo(), false, "an import starts a new history");
});

test("getSnapshot is stable between publishes", () => {
  const { game } = store();
  assert.equal(game.getSnapshot(), game.getSnapshot());
});

test("a throwing listener does not block the others", () => {
  const { game } = store();
  let calls = 0;
  game.subscribe(() => {
    calls += 1;
    throw new Error("listener failed");
  });
  game.subscribe(() => {
    calls += 1;
  });
  game.dispatch(orderCommand(game, [...game.getSnapshot().state.order].reverse()));
  assert.equal(calls, 2);
});

test("the store works without browser globals", () => {
  assert.equal(typeof globalThis.localStorage, "undefined");
  const { game } = store();
  assert.equal(game.getSnapshot().save.status, "saved");
  assert.equal(game.getSnapshot().state.v, 4);
});

test("a newer save from another window is adopted and clears history", () => {
  const storage = memoryStorage();
  const { game } = store(storage);
  const prepared = game.prepare({
    type: "manualCorrection",
    payload: { change: { kind: "alive", playerId: "1", value: false, reason: "test" } },
  });
  if (!prepared.ok) throw new Error(prepared.reason);
  game.dispatch(prepared.command);
  assert.equal(game.canUndo(), true);

  const newer = JSON.parse(JSON.stringify(game.getSnapshot().state)) as Record<string, unknown>;
  newer.notes = "newer window";
  newer.revision = 9;
  storage.values.set(KEY, JSON.stringify(newer));
  storage.emit();

  assert.equal(game.getSnapshot().state.notes, "newer window");
  assert.equal(game.getSnapshot().gameRevision, 9);
  assert.equal(game.canUndo(), false);
});

test("a legacy save migrates once, validates and a second load is unchanged", () => {
  for (const version of [3, 2] as const) {
    const legacy: Record<string, unknown> = { ...createGame(7), v: version };
    // The v3 seat screen saved a reordered list without renumbering the seats.
    legacy.order = (legacy.order as string[]).slice().reverse();
    if (version === 3) delete legacy.script;
    else legacy.night = 1;
    const storage = memoryStorage(null, { [`pg.game.v${version}`]: JSON.stringify(legacy) });

    const first = createGameStore(ports(storage));
    const migrated = first.getSnapshot().state;
    assert.equal(migrated.v, 4, `v${version} migrates to v4`);
    assert.equal(first.loadStatus.migrated, true);
    assert.deepEqual(migrated.order, legacy.order, `v${version} keeps the saved order`);
    migrated.order.forEach((id, index) =>
      assert.equal(migrated.players[id]?.seat, index + 1, `v${version} renumbers seat ${id}`),
    );
    assert.deepEqual(validateState(migrated), []);
    const written = storage.readRaw();
    assert.ok(written);
    const writes = storage.writes;
    assert.equal(writes, 1, `v${version} first load writes the migrated save once`);

    const second = createGameStore(ports(storage));
    assert.deepEqual(second.getSnapshot().state, migrated);
    assert.equal(storage.writes, writes, `v${version} second load does not rewrite`);
    assert.equal(storage.readRaw(), written);
  }
});

test("an unknown schema version is rejected instead of migrated", () => {
  for (const version of [1, 5]) {
    const decoded = importSavedGame({ ...createGame(7), v: version });
    assert.equal(decoded.ok, false, `v${version} is not a version this build reads`);
    if (decoded.ok) return;
    assert.match(decoded.error, /Unsupported schema version/);
  }

  const newer = JSON.stringify({ ...createGame(7), v: 5 });
  const storage = memoryStorage(newer);
  const { game } = store(storage);
  assert.equal(game.loadStatus.ok, false);
  assert.equal(game.loadStatus.migrated, false, "a future save is never migrated into v4");
  assert.match(game.loadStatus.error ?? "", /Unsupported schema version/);
  assert.equal(storage.readRaw(), newer, "the unreadable save stays on disk");
  assert.equal(game.getSnapshot().state.v, 4);
});

test("two stores keep their journals, ledgers and publications separate", () => {
  const first = store();
  const second = store();
  let published = 0;
  second.game.subscribe(() => {
    published += 1;
  });

  const order = [...first.game.state.order].reverse();
  const shared = command(first.game, {
    type: "setOrder",
    payload: { order },
    id: "shared-order",
  });
  assert.equal(first.game.dispatch(shared).status, "allowed");

  assert.equal(second.game.state.journal.entries.length, 0, "the other journal is untouched");
  assert.equal(published, 0, "the other store publishes nothing");
  assert.equal(second.storage.writes, 0, "the other save is untouched");

  const mirrored = second.game.dispatch(shared);
  assert.equal(mirrored.status, "allowed");
  assert.notEqual(mirrored.idempotent, true, "the idempotency ledger belongs to one store");
  assert.deepEqual(second.game.state.order, order);
  assert.equal(second.game.state.journal.entries.length, 1);
  assert.notEqual(first.game.getSnapshot(), second.game.getSnapshot());

  assert.equal(first.game.undo().ok, true);
  assert.equal(
    second.game.state.journal.entries.length,
    1,
    "undoing in one store leaves the other history alone",
  );
  assert.deepEqual(second.game.state.order, order);
});

test("a command applied before a reload is not applied twice after it", () => {
  const storage = memoryStorage();
  const first = createGameStore(ports(storage));
  const command = orderCommand(first, [...first.getSnapshot().state.order].reverse());
  const accepted = first.dispatch(command);
  assert.equal(accepted.status, "allowed");
  const writes = storage.writes;

  const second = createGameStore(ports(storage));
  const repeated = second.dispatch(command);
  assert.equal(repeated.status, "allowed");
  assert.equal(repeated.idempotent, true);
  assert.equal(storage.writes, writes);
  assert.deepEqual(second.getSnapshot().state.order, first.getSnapshot().state.order);
});

test("a game saved before the zero became the Librarian's alone continues, and undo replays its journal (TB-WASHERWOMAN-01)", () => {
  // A saved game of the ruleset that answered a zero held for any role: its
  // Washerwoman and Investigator steps are completed with the zero. The host
  // continues it with a command of the current ruleset and takes it back; the
  // undo replays the whole journal, the recorded steps among them.
  const text = readFileSync(
    new URL("../../core/engine/fixtures/legacy-setup-zero-game.json", import.meta.url),
    "utf8",
  );
  const storage = memoryStorage(text);
  const { game } = store(storage);
  const loaded = canonicalState(game.getSnapshot().state);
  const recorded = game.state.journal.entries.length;
  assert.equal(recorded > 0, true);
  assert.equal(
    game.state.journal.entries.every(
      (entry) => entry.rulesetVersion === ANY_ROLE_ZERO_RULESET_VERSION,
    ),
    true,
  );
  assert.equal(game.canUndo(), false, "the commands that arrived with the load are history");

  const open = currentStep(game.state);
  assert.equal(open?.roleId, "chef");
  const sent = game.dispatch(
    command(game, { type: "completeNightStep", payload: { key: open!.key } }),
  );
  assert.equal(sent.status, "allowed", JSON.stringify(sent));
  assert.equal(game.state.journal.entries.at(-1)?.rulesetVersion, RULESET_VERSION);
  const continued = canonicalState(game.getSnapshot().state);

  const undone = game.undo();
  assert.equal(undone.ok, true, undone.ok ? "" : `${undone.errorCode}: ${undone.error}`);
  assert.equal(game.state.journal.entries.length, recorded);
  assert.deepEqual(canonicalState(game.getSnapshot().state), loaded);

  const redone = game.redo();
  assert.equal(redone.ok, true, redone.ok ? "" : `${redone.errorCode}: ${redone.error}`);
  assert.deepEqual(canonicalState(game.getSnapshot().state), continued);
});

test("a game saved the day after an Imp self-kill by an older ruleset does not wake the new Demon again, and undo replays its journal (TB-IMP-01)", () => {
  // The recorded journal of a game whose Imp killed itself on night 2 and whose
  // new Imp was woken that night, saved at dawn of day 2 by the ruleset that
  // woke a new Demon again on the next night. The host ends the day with a
  // command of the current ruleset and takes it back; the undo replays the
  // whole journal.
  const fixture = importSavedGame(
    readFileSync(
      new URL("../../core/engine/fixtures/legacy-demon-wake-game.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(fixture.ok, true);
  if (!fixture.ok) return;
  const entries = fixture.state.journal.entries;
  const day2 = replay({
    ...fixture.state.journal,
    entries: entries.slice(
      0,
      entries.findLastIndex((entry) => entry.type === "endDay"),
    ),
  });
  assert.equal(day2.ok, true, JSON.stringify(day2));
  if (!day2.ok) return;
  const storage = memoryStorage(JSON.stringify(day2.state));
  const { game } = store(storage);
  const loaded = canonicalState(game.getSnapshot().state);
  const recorded = game.state.journal.entries.length;
  assert.equal(game.state.phase, "day");
  assert.equal(game.state.night.demonChanged, true, "the older ruleset left the flag set");
  assert.equal(
    game.state.journal.entries.every(
      (entry) => entry.rulesetVersion === REPEATED_DEMON_WAKE_RULESET_VERSION,
    ),
    true,
  );

  const sent = game.dispatch(command(game, { type: "endDay", payload: {} }));
  assert.equal(sent.status, "allowed", JSON.stringify(sent));
  assert.equal(game.state.journal.entries.at(-1)?.rulesetVersion, RULESET_VERSION);
  assert.equal(game.state.night.number, 3);
  assert.deepEqual(
    game.state.night.queue.filter((step) => step.system === "demonchange"),
    [],
    "the new Imp was woken on night 2 and is not woken again",
  );
  const continued = canonicalState(game.getSnapshot().state);

  const undone = game.undo();
  assert.equal(undone.ok, true, undone.ok ? "" : `${undone.errorCode}: ${undone.error}`);
  assert.equal(game.state.journal.entries.length, recorded);
  assert.deepEqual(canonicalState(game.getSnapshot().state), loaded);

  const redone = game.redo();
  assert.equal(redone.ok, true, redone.ok ? "" : `${redone.errorCode}: ${redone.error}`);
  assert.deepEqual(canonicalState(game.getSnapshot().state), continued);
});

test("a game whose older ruleset let a drunk Tinker die on their step refuses that death now, and undo replays its journal (BMR-TINKER-01)", () => {
  // The recorded journal of a game in which the host marked the Gossip's death
  // on the Tinker's step of night 2, loaded on night 3 after the Courtier made
  // the Tinker drunk. The host marks the drunk Tinker's death with a command of
  // the current ruleset, which refuses it, lets the Tinker live and takes that
  // back; the undo replays the whole journal.
  const fixture = importSavedGame(
    readFileSync(
      new URL("../../core/engine/fixtures/legacy-tinker-night-game.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(fixture.ok, true);
  if (!fixture.ok) return;
  const entries = fixture.state.journal.entries;
  const tinkerAt = entries.findLastIndex(
    (entry) =>
      entry.type === "completeNightStep" &&
      String((entry.payload as { key?: string } | undefined)?.key).includes("-tinker-"),
  );
  const night3 = replay({ ...fixture.state.journal, entries: entries.slice(0, tinkerAt) });
  assert.equal(night3.ok, true, JSON.stringify(night3));
  if (!night3.ok) return;
  const storage = memoryStorage(JSON.stringify(night3.state));
  const { game } = store(storage);
  const loaded = canonicalState(game.getSnapshot().state);
  const recorded = game.state.journal.entries.length;
  assert.equal(game.state.night.number, 3);
  assert.equal(game.state.players["4"].alive, false, "the older ruleset let the Gossip die");
  assert.equal(
    game.state.journal.entries.every(
      (entry) => entry.rulesetVersion === OPEN_TINKER_STEP_RULESET_VERSION,
    ),
    true,
  );
  const key = String((entries[tinkerAt]!.payload as { key: string }).key);

  const marked = game.dispatch(
    command(game, { type: "completeNightStep", payload: { key, deathIds: ["1"] } }),
  );
  assert.equal(marked.status, "rejected", JSON.stringify(marked));
  assert.equal("errorCode" in marked ? marked.errorCode : null, "error.59");
  assert.equal(game.state.players["1"].alive, true, "the drunk Tinker does not die");
  assert.equal(game.state.journal.entries.length, recorded);

  const lives = game.dispatch(command(game, { type: "completeNightStep", payload: { key } }));
  assert.equal(lives.status, "allowed", JSON.stringify(lives));
  assert.equal(game.state.journal.entries.at(-1)?.rulesetVersion, RULESET_VERSION);
  const continued = canonicalState(game.getSnapshot().state);

  const undone = game.undo();
  assert.equal(undone.ok, true, undone.ok ? "" : `${undone.errorCode}: ${undone.error}`);
  assert.equal(game.state.journal.entries.length, recorded);
  assert.deepEqual(canonicalState(game.getSnapshot().state), loaded);

  const redone = game.redo();
  assert.equal(redone.ok, true, redone.ok ? "" : `${redone.errorCode}: ${redone.error}`);
  assert.deepEqual(canonicalState(game.getSnapshot().state), continued);
});

test("a game whose older ruleset brought a player back on the Tinker's step refuses that now, and undo replays its journal (BMR-PROFESSOR-01, BMR-SHABALOTH-01)", () => {
  // The recorded journal of a game in which the Po killed the Gossip on night
  // 2, loaded just before the host brought the Gossip back on the Tinker's
  // step. The host sends that resurrection with a command of the current
  // ruleset, which refuses it, completes the step without it and takes that
  // back; the undo replays the whole journal.
  const fixture = importSavedGame(
    readFileSync(
      new URL("../../core/engine/fixtures/legacy-night-resurrection-game.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(fixture.ok, true);
  if (!fixture.ok) return;
  const entries = fixture.state.journal.entries;
  const resurrectAt = entries.findIndex(
    (entry) =>
      entry.type === "completeNightStep" &&
      (entry.payload as { resurrectId?: string } | undefined)?.resurrectId === "4",
  );
  const night2 = replay({ ...fixture.state.journal, entries: entries.slice(0, resurrectAt) });
  assert.equal(night2.ok, true, JSON.stringify(night2));
  if (!night2.ok) return;
  const storage = memoryStorage(JSON.stringify(night2.state));
  const { game } = store(storage);
  const loaded = canonicalState(game.getSnapshot().state);
  const recorded = game.state.journal.entries.length;
  assert.equal(game.state.night.number, 2);
  assert.equal(game.state.players["4"].alive, false, "the Po killed the Gossip");
  assert.equal(
    game.state.journal.entries.every(
      (entry) => entry.rulesetVersion === ANY_STEP_RESURRECTS_RULESET_VERSION,
    ),
    true,
  );
  const key = String((entries[resurrectAt]!.payload as { key: string }).key);
  assert.match(key, /-tinker-/);

  const brought = game.dispatch(
    command(game, { type: "completeNightStep", payload: { key, resurrectId: "4" } }),
  );
  assert.equal(brought.status, "rejected", JSON.stringify(brought));
  assert.equal("errorCode" in brought ? brought.errorCode : null, "error.51");
  assert.equal(game.state.players["4"].alive, false, "the Gossip stays dead");
  assert.equal(game.state.journal.entries.length, recorded);

  const completed = game.dispatch(command(game, { type: "completeNightStep", payload: { key } }));
  assert.equal(completed.status, "allowed", JSON.stringify(completed));
  assert.equal(game.state.journal.entries.at(-1)?.rulesetVersion, RULESET_VERSION);
  const continued = canonicalState(game.getSnapshot().state);

  const undone = game.undo();
  assert.equal(undone.ok, true, undone.ok ? "" : `${undone.errorCode}: ${undone.error}`);
  assert.equal(game.state.journal.entries.length, recorded);
  assert.deepEqual(canonicalState(game.getSnapshot().state), loaded);

  const redone = game.redo();
  assert.equal(redone.ok, true, redone.ok ? "" : `${redone.errorCode}: ${redone.error}`);
  assert.deepEqual(canonicalState(game.getSnapshot().state), continued);
});

test("a corrupt save is backed up, left in place and reported with an explicit error", () => {
  const corrupt = JSON.stringify({ v: 4, players: null });
  const storage = memoryStorage(corrupt);
  const { game } = store(storage);

  assert.equal(game.loadStatus.ok, false);
  assert.equal(game.loadStatus.backupKey, "pg.game.broken.1");
  assert.match(game.loadStatus.error ?? "", /pg\.game\.broken\.1/);
  assert.equal(storage.backupText, corrupt);
  assert.equal(storage.readRaw(), corrupt);
  assert.equal(storage.writes, 0);
  assert.equal(game.getSnapshot().state.v, 4);
  assert.deepEqual(validateState(game.getSnapshot().state), []);
});

const malformedSaves: { name: string; patch: Record<string, unknown> }[] = [
  { name: "a malformed effect collection", patch: { effects: {} } },
  { name: "an invalid journal base", patch: { journal: { base: {}, entries: [] } } },
];

for (const { name, patch } of malformedSaves) {
  test(`importing ${name} leaves the current game and disk unchanged`, () => {
    const { game, storage } = store();
    game.dispatch(orderCommand(game, [...game.state.order].reverse()));
    const before = JSON.stringify(game.state);
    const disk = storage.readRaw();
    const writes = storage.writes;
    const imported = JSON.stringify({ ...createGame(7), ...patch });

    assert.equal(game.importGame(imported).ok, false);
    assert.equal(JSON.stringify(game.state), before);
    assert.equal(storage.readRaw(), disk);
    assert.equal(storage.writes, writes);
  });

  test(`loading ${name} backs up the save and keeps recovery undo usable`, () => {
    const corrupt = JSON.stringify({ ...createGame(7), ...patch });
    const storage = memoryStorage(corrupt);
    const { game } = store(storage);

    assert.equal(game.loadStatus.ok, false);
    assert.equal(storage.backupText, corrupt);
    assert.equal(storage.readRaw(), corrupt);
    assert.equal(storage.writes, 0);
    assert.deepEqual(validateState(game.state), []);

    const originalOrder = game.state.order.slice();
    assert.equal(game.dispatch(orderCommand(game, [...originalOrder].reverse())).status, "allowed");
    assert.equal(game.undo().ok, true);
    assert.deepEqual(game.state.order, originalOrder);
    assert.deepEqual(validateState(game.state), []);
    assert.deepEqual(validateState(JSON.parse(storage.readRaw()!)), []);
    assert.equal(storage.backupText, corrupt, "recovery keeps the original backup");
  });
}
