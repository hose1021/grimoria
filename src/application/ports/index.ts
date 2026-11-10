// Application ports: browser and platform capabilities injected into the store.
// They reference core types only; no port mentions a concrete browser API.
import type { Clock, IdSource, RandomSource } from "../../core/ports/index.ts";

/** The persisted game, exposed as untrusted data. `write` throws on failure. */
export interface GameStorage {
  read(): unknown | null;
  readRaw(): string | null;
  write(text: string): void;
  remove(): void;
  watch(listener: () => void): () => void;
}

/** Cross-window coordination: one host writer, plus change notifications. */
export interface Coordination {
  acquireWriter(): Promise<boolean>;
  release(): void;
}

/** UI preferences (`pg.lang`, `pg.guided`, sheet filters), separate from the game. */
export interface PreferenceStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface StorePorts {
  storage: GameStorage;
  preferences?: PreferenceStore;
  coordination?: Coordination;
  clock: Clock;
  ids: IdSource;
  random: RandomSource;
}
