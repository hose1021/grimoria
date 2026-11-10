// Application ports: browser and platform capabilities injected into the store.
// `core` types only; no port mentions a concrete browser API. The two
// transitional ports are the only way the store reaches code that still lives
// in the legacy tree, and they are wired exclusively by the composition root.
import type { Clock, IdSource, RandomSource } from "../../core/ports/index.ts";
import type { PreparedCommand } from "../../core/commands/contracts.ts";
import type { DomainOutcome } from "../../core/commands/result.ts";
import type { ValidationOutcome } from "../../core/model/validated.ts";
import type { GameState } from "../../../js/types.js";

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

/**
 * Transitional: the command engine still lives in `js/engine`. The store calls
 * the port, the composition root binds the legacy implementation, and the
 * change that moves the engine into `core` deletes the port.
 */
export interface CommandExecutor {
  readonly rulesetVersion: string;
  readonly supportedRulesetVersions: ReadonlySet<string>;
  validate(state: GameState, command: PreparedCommand): DomainOutcome;
  preview(state: GameState, command: PreparedCommand): DomainOutcome;
  apply(state: GameState, command: PreparedCommand): DomainOutcome;
}

/**
 * Transitional: the persisted envelope and the migration path still live in
 * `js/model`. Bound once at the composition root and deleted with the model's
 * move into `core`.
 */
export interface StateCodec {
  create(count: number): GameState;
  parse(raw: unknown): ValidationOutcome;
  exportGame(state: GameState): string;
  importGame(text: string):
    | { ok: true; state: GameState }
    | { ok: false; error: string; errorCode?: string };
}

export interface StorePorts {
  storage: GameStorage;
  preferences?: PreferenceStore;
  coordination?: Coordination;
  clock: Clock;
  ids: IdSource;
  random: RandomSource;
  commands: CommandExecutor;
  codec: StateCodec;
}
