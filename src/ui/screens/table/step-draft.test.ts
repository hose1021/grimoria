import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../../core/model/state.ts";
import { createGameStore } from "../../../application/store/create-game-store.ts";
import type { StorePorts } from "../../../application/ports/index.ts";
import type { GameState } from "../../../core/model/types.ts";
import { readStepDraft, writeStepDraft } from "./step-draft.ts";
import type { StepDraft } from "./step-draft.ts";

const KEY = "pg.game.v4";

interface MemoryStorage {
  writes: number;
  read(): unknown | null;
  readRaw(): string | null;
  write(text: string): void;
  remove(): void;
  backup(text: string): string | null;
  watch(listener: () => void): () => void;
}

interface MemoryPreferences {
  values: Map<string, string>;
  read(key: string): string | null;
  write(key: string, value: string): void;
  get(key: string): string | null;
  set(key: string, value: string): void;
}

function memoryStorage(initial: string | null): MemoryStorage {
  const values = new Map<string, string>();
  if (initial !== null) values.set(KEY, initial);
  return {
    writes: 0,
    read: () => (values.has(KEY) ? JSON.parse(values.get(KEY) as string) : null),
    readRaw: () => values.get(KEY) ?? null,
    write(text: string) {
      this.writes += 1;
      values.set(KEY, text);
    },
    remove() {
      values.delete(KEY);
    },
    backup: () => null,
    watch: () => () => {},
  };
}

function memoryPreferences(): MemoryPreferences {
  const values = new Map<string, string>();
  return {
    values,
    read: (key) => values.get(key) ?? null,
    write: (key, value) => values.set(key, value),
    get: (key) => values.get(key) ?? null,
    set: (key, value) => values.set(key, value),
  };
}

function ports(storage: MemoryStorage, preferences: MemoryPreferences): StorePorts {
  return {
    storage,
    preferences,
    clock: { now: () => new Date("2026-11-11T12:00:00.000Z") },
    ids: { next: (prefix = "cmd") => `${prefix}-${Math.random()}` },
    random: { seed: () => 12345 },
  };
}

function midNightGame(): GameState {
  const game = createGame(7);
  game.phase = "night";
  game.night = {
    number: 1,
    queue: [
      {
        key: "poison-step",
        kind: "role",
        roleId: "poisoner",
        actorId: "1",
        targetMode: "one-other",
        targetIds: [],
        done: false,
      },
    ],
    currentIndex: 0,
    demonChanged: false,
  };
  return game;
}

function draft(key: string, targets: string[]): StepDraft {
  return {
    key,
    targets,
    redirect: null,
    registrations: { "2": "butler" },
    given: null,
    bmrDeaths: [],
    bmrResurrect: null,
    bmrRoles: null,
    bmrDrunk: null,
  };
}

test("a reload in the middle of a night step restores the step and its chosen targets", () => {
  const game = midNightGame();
  const storage = memoryStorage(JSON.stringify(game));
  const preferences = memoryPreferences();
  const first = createGameStore(ports(storage, preferences));
  const step = first.getSnapshot().state.night.queue[0];
  assert.ok(step);
  const key = `${game.createdAt}:1:${step.key}`;

  writeStepDraft(preferences.write, draft(key, ["3"]));

  const second = createGameStore(ports(storage, preferences));
  const reloaded = second.getSnapshot().state;
  assert.equal(reloaded.night.currentIndex, 0);
  assert.equal(reloaded.night.queue[0]?.key, step.key);

  const restored = readStepDraft(preferences.read, key);
  assert.deepEqual(restored?.targets, ["3"]);
  assert.deepEqual(restored?.registrations, { "2": "butler" });
});

test("a draft for another step or a corrupt value is ignored", () => {
  const preferences = memoryPreferences();
  writeStepDraft(preferences.write, draft("other-game:1:poison-step", ["3"]));
  assert.equal(readStepDraft(preferences.read, "game-1:1:poison-step"), null);

  preferences.write("pg.stepDraft", "{not json");
  assert.equal(readStepDraft(preferences.read, "game-1:1:poison-step"), null);
});

test("clearing the draft leaves no record behind", () => {
  const preferences = memoryPreferences();
  writeStepDraft(preferences.write, draft("game-1:1:poison-step", ["3"]));
  writeStepDraft(preferences.write, null);
  assert.equal(readStepDraft(preferences.read), null);
});
