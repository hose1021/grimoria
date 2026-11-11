// Application ports: browser and platform capabilities injected into the store.
// `core` types only; no port mentions a concrete browser API. The two
// transitional ports are the only way the store reaches code that still lives
// in the legacy tree, and they are wired exclusively by the composition root.
import type { Clock, IdSource, RandomSource } from "../../core/ports/index.ts";

/** The persisted game, exposed as untrusted data. `write` throws on failure. */
export interface GameStorage {
  read(): unknown | null;
  readRaw(): string | null;
  write(text: string): void;
  remove(): void;
  /** Stores a timestamped copy of a corrupt value; returns its key or null. */
  backup(text: string): string | null;
  /** A pre-v4 key still on disk, used once when the main key is absent. */
  readFallback?(): { key: string; value: string } | null;
  watch(listener: () => void): () => void;
}

/** UI preferences (`pg.lang`, `pg.guided`, sheet filters), separate from the game. */
export interface PreferenceStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface StorePorts {
  storage: GameStorage;
  preferences?: PreferenceStore;
  clock: Clock;
  ids: IdSource;
  random: RandomSource;
}
