import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../../../core/model/state.ts";
import { createGameStore } from "../../../application/store/create-game-store.ts";
import type { StorePorts } from "../../../application/ports/index.ts";
import type { GameState } from "../../../core/model/types.ts";
import { restoredMap } from "./drafts.ts";
import { STEP_DRAFT_KEY, readStepDraft, writeStepDraft } from "./step-draft.ts";
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
  const chosen: StepDraft = {
    ...draft(key, ["3"]),
    redirect: "4",
    given: { kind: "number", value: 2, needsChoice: false },
    bmrDeaths: ["5"],
    bmrResurrect: "5",
    bmrRoles: "professor",
    bmrDrunk: "6",
  };

  writeStepDraft(preferences.write, chosen);

  const second = createGameStore(ports(storage, preferences));
  const reloaded = second.getSnapshot().state;
  assert.equal(reloaded.night.currentIndex, 0);
  assert.equal(reloaded.night.queue[0]?.key, step.key);

  assert.deepEqual(readStepDraft(preferences.read, key), chosen);
});

test("a wrong-typed given answer makes the draft inert", () => {
  const preferences = memoryPreferences();
  const key = "game-1:1:poison-step";
  for (const given of [
    { kind: "demon-info", bluffs: "x" },
    { kind: "one-of-two", pair: "abc" },
    { kind: "number", value: { nested: true } },
    { kind: "number", needsChoice: "yes" },
  ]) {
    preferences.write(STEP_DRAFT_KEY, JSON.stringify({ ...draft(key, ["3"]), given }));
    assert.equal(readStepDraft(preferences.read, key), null);
  }
});

test("only the values a restored draft carries seed the console maps", () => {
  const restored: StepDraft = {
    ...draft("game-1:1:poison-step", ["3"]),
    redirect: "4",
    bmrDeaths: ["5"],
  };
  assert.deepEqual([...restoredMap(restored, restored.targets)], [[restored.key, ["3"]]]);
  assert.equal(restoredMap(restored, restored.redirect).get(restored.key), "4");
  assert.deepEqual(restoredMap(restored, restored.bmrDeaths).get(restored.key), ["5"]);
  assert.equal(restoredMap(restored, null).size, 0);
  assert.equal(restoredMap(restored, draft("x", []).targets).size, 0);
  assert.equal(restoredMap(null, ["3"]).size, 0);
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
