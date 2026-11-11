// Browser composition root: one store wired with the browser adapters. Every
// export keeps the shape the screens already use; the screens mutate the game
// only through dispatch.
import {
  livingPlayers,
  orderedPlayers as ordered,
  playerById as getPlayer,
  STORAGE_KEY,
} from "../core/model/state.ts";
import { createGameStore } from "../application/store/create-game-store.ts";
import type {
  GameSnapshot,
  RunOutcome,
  StoreMutationResult,
} from "../application/store/create-game-store.ts";
import { toCommandInput } from "../application/dispatch/adapt.ts";
import { createLocalGameStorage } from "../infrastructure/storage/local-game-storage.ts";
import { createSystemPorts } from "../infrastructure/platform/system-ports.ts";
import { createLocalPreferences } from "../infrastructure/preferences/local-preferences.ts";
import type { DispatchResult } from "../core/commands/result.ts";
import type { Command, GameState, Player } from "../core/model/types.ts";

export const KEY = STORAGE_KEY;

export type ImportResult = { ok: true } | { ok: false; error: string; errorCode?: string };

const game = createGameStore({
  storage: createLocalGameStorage(),
  preferences: createLocalPreferences(),
  ...createSystemPorts(),
});

export const state = game.state;
export const loadStatus = game.loadStatus;

export function getSnapshot(): GameSnapshot {
  return game.getSnapshot();
}

export function subscribe(listener: () => void): () => void {
  return game.subscribe(listener);
}

export function dispatch(command: Omit<Command, "id"> & { id?: string }): DispatchResult {
  const input = toCommandInput(command);
  const prepared = game.prepare(input);
  if (!prepared.ok) {
    return {
      status: "rejected",
      id: input.id ?? null,
      type: input.type,
      reason: prepared.reason,
      errorCode: prepared.errorCode,
      errors: null,
      persisted: false,
    };
  }
  return game.dispatch(prepared.command);
}

export function save(): boolean {
  return game.persist().ok;
}

export function saveIfNeeded(): boolean {
  if (!game.hasLocalChanges()) return true;
  return game.persist().ok;
}

export function hasLocalChanges(): boolean {
  return game.hasLocalChanges();
}

export function canUndo(): boolean {
  return game.canUndo();
}

export function undo(): boolean {
  return game.undo().ok;
}

export function canRedo(): boolean {
  return game.canRedo();
}

export function redo(): boolean {
  return game.redo().ok;
}

export function run(mutator: (state: GameState) => unknown): RunOutcome {
  return game.run(mutator);
}

export function reset(count = 8): StoreMutationResult {
  return game.reset(count);
}

export function replaceState(next: GameState): StoreMutationResult {
  return game.replaceState(next);
}

export function exportGame(): string {
  return game.exportGame();
}

export function importGame(text: string): ImportResult {
  return game.importGame(text);
}

export function acknowledgeStorageError(): void {
  game.clearSaveError();
}

export function playerById(id: string): Player | null {
  return getPlayer(state, id);
}

export function orderedPlayers(): Player[] {
  return ordered(state);
}

export function living(): Player[] {
  return livingPlayers(state);
}
