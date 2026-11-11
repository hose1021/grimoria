import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../../js/model.js";
import { createGameStore } from "./create-game-store.ts";
import type { GameStore } from "./create-game-store.ts";
import type { StorePorts } from "../ports/index.ts";

const KEY = "pg.game.v4";

function memoryStorage(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(KEY, initial);
  return {
    fail: false,
    writes: 0,
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
    backup: () => null as string | null,
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

function orderCommand(game: GameStore, order: string[]) {
  const prepared = game.prepare({ type: "setOrder", payload: { order } });
  if (!prepared.ok) throw new Error(prepared.reason);
  return prepared.command;
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

test("a malformed import is rejected without a write", () => {
  const { game, storage } = store();
  const before = game.getSnapshot();
  const result = game.importGame('{"format":"pocket-grimoire","version":4,"game":{"v":4}}');
  assert.equal(result.ok, false);
  assert.equal(storage.writes, 0);
  assert.equal(game.getSnapshot().state, before.state);
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
