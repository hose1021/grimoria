// Deterministic replay of the command journal (issue #30).
//
// A journal is one base state plus the accepted commands in order. Replaying
// clones the base and applies each command through the same command path the
// live game used, with the entry's resolved `at` pinning the clock and the
// existing seeded PRNG derived from id, fingerprint and canonical state. The
// result is the saved state again, not a copy that merely resembles it.
import type { Command, DomainEvent, GameJournal, GameState, JournalEntry } from "../model/types.ts";
import { clone } from "../model/state.ts";
import { applyCommand } from "./commands.ts";
import { defaultRuntime } from "./runtime.ts";
import type { Runtime } from "./runtime.ts";

export type ReplayResult =
  | { ok: true; state: GameState; events: DomainEvent[] }
  | {
      ok: false;
      errorCode: "journal-invalid" | "journal-dependency";
      error: string;
      entryId: string | null;
      errors: string[] | null;
    };

function commandOf(entry: JournalEntry): Command {
  return {
    id: entry.id,
    type: entry.type,
    payload: entry.payload || {},
    at: entry.at,
    rulesetVersion: entry.rulesetVersion,
  };
}

// Re-insert the journal where the game state declares it (after `applied`) so a
// replayed value serialises with the same key order as the saved game.
function placeJournal(state: GameState, journal: GameJournal): void {
  const values = Object.entries(state).filter(([key]) => key !== "journal");
  for (const key of Object.keys(state)) Reflect.deleteProperty(state, key);
  let placed = false;
  for (const [key, value] of values) {
    Reflect.set(state, key, value);
    if (key === "applied") {
      Reflect.set(state, "journal", journal);
      placed = true;
    }
  }
  if (!placed) Reflect.set(state, "journal", journal);
}

/**
 * Rebuild the state from its journal. A journal entry that no longer applies is
 * a dependency failure: the recorded history cannot be reproduced as written.
 */
export function replay(journal: GameJournal, runtime: Runtime = defaultRuntime): ReplayResult {
  if (!journal || !Array.isArray(journal.entries)) {
    return {
      ok: false,
      errorCode: "journal-invalid",
      error: "Журнал команд отсутствует: воспроизведение невозможно.",
      entryId: null,
      errors: null,
    };
  }
  const base = journal.base || null;
  if (!base) {
    // An empty journal without a base has nothing to replay from. This is only
    // reachable from a hand-edited save, so report it, do not guess.
    return {
      ok: false,
      errorCode: "journal-invalid",
      error: "Журнал не содержит базового состояния: воспроизведение невозможно.",
      entryId: null,
      errors: null,
    };
  }
  const state = clone(base);
  delete (state as Partial<GameState>).journal;
  state.journal = { base: clone(base), entries: [] };
  state.applied = state.applied || {};

  const events: DomainEvent[] = [];
  for (const entry of journal.entries) {
    const result = applyCommand(state, commandOf(entry), runtime);
    if (result.status !== "allowed") {
      return {
        ok: false,
        errorCode: "journal-dependency",
        error:
          "Запись журнала «" +
          entry.id +
          "» не воспроизводится: " +
          ("reason" in result && result.reason ? result.reason : result.status),
        entryId: entry.id,
        errors: null,
      };
    }
    if (result.idempotent) {
      return {
        ok: false,
        errorCode: "journal-dependency",
        error: "Запись журнала «" + entry.id + "» уже была применена в базовом состоянии.",
        entryId: entry.id,
        errors: null,
      };
    }
    events.push(...(result.events || []));
  }
  placeJournal(state, state.journal);
  return { ok: true, state, events };
}
