import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  exportGame,
  importGame,
  migrateV3,
  normalizeScriptState,
  publicGameView,
  validateState,
} from "./state.ts";
import { ALL_ROLES } from "./rules.ts";
import type { Effect } from "./types.ts";

// The saved game is an external boundary. `validateState` is the only gate
// between a saved or imported game and the engine, so an effect that reaches
// the engine must carry the source, the target and the interval it needs.

type Json = Record<string, unknown>;

function poison(overrides: Json = {}): Json {
  return {
    id: "eff-1",
    kind: "poison",
    sourceId: "1",
    targetId: "2",
    start: { phase: "night", number: 1 },
    expires: { phase: "night", number: 2 },
    active: true,
    ...overrides,
  };
}

function errorsFor(effect: Json): string[] {
  const game = createGame(7);
  game.effects.push(effect as Effect);
  return validateState(game);
}

test("optional manual vote maps retain v4 compatibility and reject malformed imports", () => {
  const state = createGame(7);
  assert.deepEqual(validateState(state), []);
  assert.equal(importGame(JSON.stringify(state)).ok, true);
  for (const voteCounts of [{}, { 1: 0, 2: 7 }]) {
    const saved = {
      ...state,
      day: { ...state.day, voteCounts },
      lastDay: { number: 1, nominations: [], execution: null, voteCounts },
    };
    assert.deepEqual(validateState(saved), []);
    const imported = importGame(JSON.stringify(saved));
    assert.equal(imported.ok, true, JSON.stringify(imported));
    if (imported.ok) {
      assert.deepEqual(imported.state.day.voteCounts, voteCounts);
      assert.deepEqual(imported.state.lastDay?.voteCounts, voteCounts);
    }
  }
  for (const voteCounts of [
    null,
    [],
    "invalid",
    { missing: 1 },
    { toString: 1 },
    { 1: -1 },
    { 1: 1.5 },
    { 1: 8 },
    { 1: "2" },
  ]) {
    for (const container of ["day", "lastDay"] as const) {
      const day = container === "day" ? state.day : { number: 1, nominations: [], execution: null };
      const saved = { ...state, [container]: { ...day, voteCounts } };
      assert.ok(
        validateState(saved).some((error) => error.includes("vote counts")),
        JSON.stringify(saved[container]),
      );
      assert.equal(importGame(JSON.stringify(saved)).ok, false);
    }
  }
});

test("an effect with a source, a target and an interval passes validation", () => {
  assert.deepEqual(errorsFor(poison()), []);
});

test("an effect without a source is rejected", () => {
  const effect = poison();
  delete effect.sourceId;
  assert.ok(errorsFor(effect).includes("Invalid effect source."));
});

test("an effect without a target is rejected", () => {
  const effect = poison();
  delete effect.targetId;
  assert.ok(errorsFor(effect).includes("Invalid effect target."));
});

test("an effect without an interval is rejected", () => {
  const effect = poison();
  delete effect.start;
  assert.ok(errorsFor(effect).includes("Invalid effect interval."));
});

test("an effect with a malformed interval is rejected", () => {
  assert.ok(errorsFor(poison({ start: { phase: "night" } })).includes("Invalid effect interval."));
});

test("an effect with a malformed expiry is rejected", () => {
  assert.ok(
    errorsFor(poison({ expires: { phase: "night" } })).includes("Invalid effect interval."),
  );
});

test("an open-ended effect with a null expiry passes validation", () => {
  assert.deepEqual(errorsFor(poison({ expires: null })), []);
  assert.deepEqual(errorsFor(poison({ expires: undefined })), []);
});

test("a v3 save with an effect keeps loading after the interval rule", () => {
  const saved = JSON.parse(JSON.stringify(createGame(7))) as Json;
  saved.v = 3;
  saved.scriptId = "tb";
  delete saved.script;
  (saved.effects as Json[]).push(poison());
  const migrated = migrateV3(saved);
  assert.equal(migrated.v, 4);
  assert.equal(migrated.effects.length, 1);
  assert.deepEqual(migrated.effects[0]?.start, { phase: "night", number: 1 });
  assert.deepEqual(validateState(migrated), []);
});

test("migration does not invent an interval for an undated effect", () => {
  const saved = JSON.parse(JSON.stringify(createGame(7))) as Json;
  saved.v = 3;
  saved.scriptId = "tb";
  delete saved.script;
  const effect = poison();
  delete effect.start;
  (saved.effects as Json[]).push(effect);
  const migrated = migrateV3(saved);
  assert.equal(migrated.effects[0]?.start, undefined);
  assert.ok(validateState(migrated).includes("Invalid effect interval."));
});

test("imports reject malformed effect collections without throwing", () => {
  for (const effects of [{}, "invalid", 1, null]) {
    const result = importGame(JSON.stringify({ ...createGame(7), effects }));
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.match(result.error, /Invalid effects/);
  }
});

test("journal bases must contain a valid game without a nested journal", () => {
  const invalidEffectBase: Json = { ...createGame(7), effects: {} };
  delete invalidEffectBase.journal;
  for (const base of [{}, invalidEffectBase, createGame(7)]) {
    const saved = { ...createGame(7), journal: { base, entries: [] } };
    assert.ok(validateState(saved).includes("Invalid command journal base."));
    assert.equal(importGame(JSON.stringify(saved)).ok, false);
  }
});

test("schema v4 saves without journals and with valid journal bases remain importable", () => {
  const base: Json = { ...createGame(7) };
  delete base.journal;
  const withoutJournal = importGame(JSON.stringify(base));
  assert.equal(withoutJournal.ok, true);
  if (withoutJournal.ok)
    assert.deepEqual(withoutJournal.state.journal, { base: null, entries: [] });

  const saved = { ...createGame(7), journal: { base, entries: [] } };
  const withJournal = importGame(JSON.stringify(saved));
  assert.equal(withJournal.ok, true);
  if (withJournal.ok) assert.deepEqual(withJournal.state.journal, saved.journal);
});

test("present Lunatic setup preferences reject malformed values while absent legacy values still import", () => {
  for (const patch of [
    { lunaticShownExplicit: "yes" },
    { lunaticBluffs: "chef" },
    { lunaticBluffs: ["imp"] },
    { lunaticBluffs: ["chef", "chef"] },
    { lunaticBluffs: ["chef", "empath", "monk", "mayor"] },
  ]) {
    const state = createGame(7);
    Object.assign(state.setup, patch);
    assert.equal(importGame(JSON.stringify(state)).ok, false, JSON.stringify(patch));
  }
  const legacy = createGame(7);
  delete legacy.setup.lunaticShownExplicit;
  delete legacy.setup.lunaticBluffs;
  assert.equal(importGame(JSON.stringify(legacy)).ok, true);
});

test("a single-edition script with manual-only mode is invalid (SYS-SCRIPTS-10)", () => {
  const state = createGame(7);
  state.script = {
    id: "custom-tb-manual",
    name: "Custom TB manual",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ALL_ROLES.slice(),
    manualOnly: true,
  };
  state.scriptId = state.script.id;
  const errors = validateState(state);
  assert.ok(
    errors.some((error) => /Manual-only mode requires a mixed-edition script/.test(error)),
    JSON.stringify(errors),
  );
});

test("a legacy single-edition script loses a stray manual-only flag (SYS-SCRIPTS-10)", () => {
  const state = createGame(7);
  state.script = {
    id: "custom-tb-legacy",
    name: "Custom TB legacy",
    edition: "custom",
    source: "manual",
    author: "",
    roles: ALL_ROLES.slice(),
    manualOnly: true,
  };
  state.scriptId = state.script.id;
  normalizeScriptState(state);
  assert.equal(state.script.manualOnly, false);
  assert.deepEqual(validateState(state), []);
});

test("the export is the host's complete private history and public views omit it (SYS-STATE-06, SYS-PRIVACY-01)", () => {
  const state = createGame(7);
  state.notes = "host secret: the Spy is the Mayor";
  state.players["1"].notes = "player secret: claims Soldier";
  const text = exportGame(state);
  assert.equal(text.includes(state.notes), true, "the host notes travel with the export");
  assert.equal(
    text.includes(state.players["1"].notes),
    true,
    "the player notes travel with the export",
  );
  assert.match(text, /"warning":/, "the envelope warns that the file carries secrets");

  const view = JSON.stringify(publicGameView(state));
  assert.equal(view.includes(state.notes), false, "the public view carries no host notes");
  assert.equal(
    view.includes(state.players["1"].notes),
    false,
    "the public view carries no player notes",
  );

  const imported = importGame(text);
  assert.equal(imported.ok, true, JSON.stringify(imported));
  if (!imported.ok) return;
  assert.equal(imported.state.notes, state.notes, "the import restores the host notes");
  assert.equal(
    imported.state.players["1"].notes,
    state.players["1"].notes,
    "the import restores the player notes",
  );
});
