import type { Command, GameState, JournalEntry } from "../model/types.ts";
import { clone } from "../model/state.ts";
import { RULESET_VERSION } from "./command-versions.ts";

export interface CommandMeta {
  undoable?: boolean;
  record?: boolean;
  resetHistory?: boolean;
}

export function commandVersion(command: Command): string {
  return command.rulesetVersion == null ? RULESET_VERSION : String(command.rulesetVersion);
}

export function recordJournalEntry(
  state: GameState,
  command: Command,
  meta: CommandMeta,
  version: string,
  fingerprint: string,
  at: string,
  undoable: boolean,
  base: GameState | null,
): void {
  if (meta.resetHistory) {
    // A reset command (new game, import) starts a new history: the state it
    // produced is the base and nothing before it can be undone or replayed.
    const resetBase = clone(state);
    delete (resetBase as Partial<GameState>).journal;
    state.journal = { base: resetBase, entries: [] };
    return;
  }
  const journal =
    state.journal && Array.isArray(state.journal.entries)
      ? state.journal
      : { base: null, entries: [] };
  if (!journal.base) journal.base = base;
  const entry: JournalEntry = {
    id: command.id,
    type: command.type,
    payload: clone(command.payload || {}),
    at,
    rulesetVersion: version,
    fingerprint,
    undoable,
  };
  // A record-only command (notes, review, secret normalization) changes the
  // state but does not need its own history step. Coalesce a trailing entry of
  // the same type so 300 keystrokes stay one replayable command.
  const last = journal.entries[journal.entries.length - 1];
  if (!undoable && last && last.undoable === false && last.type === command.type) {
    journal.entries[journal.entries.length - 1] = entry;
  } else {
    journal.entries.push(entry);
  }
  state.journal = journal;
}
