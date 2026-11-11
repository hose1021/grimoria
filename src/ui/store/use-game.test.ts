import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../../js/model.js";
import { createGameStore } from "../../application/store/create-game-store.ts";
import type { GameStore } from "../../application/store/create-game-store.ts";
import type { StorePorts } from "../../application/ports/index.ts";
import type { GameSource } from "./use-game.ts";

const KEY = "pg.game.v4";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    fail: false,
    values,
    read: () => (values.has(KEY) ? JSON.parse(values.get(KEY) as string) : null),
    readRaw: () => values.get(KEY) ?? null,
    write(text: string) {
      if (this.fail) throw new Error("quota exceeded");
      values.set(KEY, text);
    },
    remove() {
      values.delete(KEY);
    },
    backup: () => null as string | null,
    watch: () => () => {},
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

function source(): { game: GameStore; storage: ReturnType<typeof memoryStorage> } {
  const storage = memoryStorage();
  return { game: createGameStore(ports(storage)), storage };
}

test("two reads without a change return the same snapshot reference", () => {
  const { game } = source();
  const store: GameSource = {
    subscribe: game.subscribe,
    getSnapshot: game.getSnapshot,
    exportGame: game.exportGame,
  };
  assert.equal(store.getSnapshot(), store.getSnapshot());
});

test("a failed save is visible in the published snapshot", () => {
  const { game, storage } = source();
  const store: GameSource = {
    subscribe: game.subscribe,
    getSnapshot: game.getSnapshot,
    exportGame: game.exportGame,
  };
  let published = 0;
  store.subscribe(() => {
    published += 1;
  });
  const before = store.getSnapshot();
  storage.fail = true;
  const order = [...before.state.order].reverse();
  const prepared = game.prepare({ type: "setOrder", payload: { order } });
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(game.dispatch(prepared.command).status, "rejected");
  const after = store.getSnapshot();
  assert.equal(published, 1);
  assert.notEqual(after, before);
  assert.equal(after.save.status, "failed");
  assert.match(after.save.status === "failed" ? after.save.error : "", /Could not save/);
  assert.deepEqual(after.state.order, before.state.order, "the game is not left half-applied");
  assert.equal(after.gameRevision, before.gameRevision);
});

test("the snapshot is a view of the one store, not a copy", () => {
  const { game } = source();
  const store: GameSource = {
    subscribe: game.subscribe,
    getSnapshot: game.getSnapshot,
    exportGame: game.exportGame,
  };
  const before = store.getSnapshot();
  game.persist();
  const after = store.getSnapshot();
  assert.equal(after.state, before.state, "the store mutates one state object");
  assert.notEqual(after, before, "publish replaces the snapshot identity");
  assert.equal(createGame(7).script.id, after.state.script.id);
});
