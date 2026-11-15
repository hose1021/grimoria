// Property check for the one command boundary: every recorded journal entry
// previews to the same consequences it applies, and preview never mutates the
// state it reads. The base and the entries come from a real command flow.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../model/state.ts";
import { presetBag } from "../model/presets.ts";
import { troubleBrewingScript } from "../model/scripts.ts";
import { applyCommand, previewCommand, replay, canonicalState } from "./index.ts";
import type {
  Command,
  CommandResult,
  GameJournal,
  GameState,
  JournalEntry,
} from "../model/types.ts";

function commandOf(entry: JournalEntry): Command {
  return {
    id: entry.id,
    type: entry.type,
    payload: entry.payload || {},
    at: entry.at,
    rulesetVersion: entry.rulesetVersion,
  };
}

function resultView(result: CommandResult) {
  if (result.status !== "allowed") return { status: result.status };
  return {
    status: result.status,
    events: result.events ?? [],
    changes: result.changes ?? null,
  };
}

test("every journal entry previews exactly what it applies and preview stays pure", () => {
  const state = createGame(7);
  const bag = presetBag("tb", 7, 0);
  assert.ok(bag && bag.valid, "a valid Trouble Brewing preset exists");
  const assignment: Record<string, string> = {};
  state.order.forEach((id, index) => {
    assignment[id] = bag.roles[index]!;
  });

  let sequence = 0;
  const run = (type: string, payload: Record<string, unknown> = {}) => {
    const command: Command = { id: "parity-" + ++sequence, type, payload };
    const result = applyCommand(state, command);
    assert.equal(result.status, "allowed", type + ": " + JSON.stringify(result));
  };
  run("bagUpdate", {
    patch: {
      script: troubleBrewingScript(),
      count: 7,
      resetRoster: true,
      roles: bag.roles.slice(),
      bluffs: bag.bluffs.slice(),
      drunkShownId: bag.drunkShownId,
      lunaticShownId: bag.lunaticShownId,
    },
  });
  run("startGame", { options: { assignment } });
  run("startNight");
  while (state.night.queue.some((step) => !step.done && !step.skipped)) {
    const step = state.night.queue.find((candidate) => !candidate.done && !candidate.skipped)!;
    run("skipStep", { key: step.key, reason: "parity fixture" });
  }
  run("endNight");
  run("endDay");

  const journal: GameJournal = state.journal;
  assert.ok(journal.entries.length >= 6, "the fixture recorded a real journal");

  // Rebuild from the journal base, like replay does, and compare every entry.
  let current: GameState = JSON.parse(JSON.stringify(journal.base)) as GameState;
  delete (current as Partial<GameState>).journal;
  delete (current as Partial<GameState>).applied;
  current.journal = { base: JSON.parse(JSON.stringify(journal.base)) as GameState, entries: [] };
  current.applied = {};

  for (const entry of journal.entries) {
    const command = commandOf(entry);
    const previewState: GameState = JSON.parse(JSON.stringify(current)) as GameState;
    const previewBefore = JSON.stringify(canonicalState(previewState));
    const previewed = previewCommand(previewState, command);
    assert.equal(
      JSON.stringify(canonicalState(previewState)),
      previewBefore,
      "preview must not mutate " + entry.type,
    );

    const applied = applyCommand(JSON.parse(JSON.stringify(current)) as GameState, command);
    assert.equal(applied.status, "allowed", entry.type + " applies");
    assert.deepEqual(
      resultView(previewed),
      resultView(applied),
      entry.type + " preview and apply agree",
    );

    const committed = applyCommand(current, command);
    assert.equal(committed.status, "allowed", entry.type + " commits");
  }

  const replayed = replay(journal);
  assert.equal(replayed.ok, true, replayed.ok ? "" : replayed.error);
  if (!replayed.ok) return;
  assert.deepEqual(canonicalState(current), canonicalState(replayed.state));
});
