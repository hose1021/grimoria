// One subscription over the game state. The store caches its snapshot and
// rebuilds it only on publish, so two reads without a change return the same
// reference and React re-renders only when the snapshot changes. There is no
// second copy of the game state in the UI.
import { useSyncExternalStore } from "react";
import type { GameSnapshot } from "../../application/store/create-game-store.ts";

export interface GameSource {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GameSnapshot;
}

export function useGame(source: GameSource): GameSnapshot {
  return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
}
