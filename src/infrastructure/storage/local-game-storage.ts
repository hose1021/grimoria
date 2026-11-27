// Browser storage adapter: the game key, the corrupt-value backup and the
// pre-v4 fallback keys. It never validates; the store owns that.
import type { GameStorage } from "../../application/ports/index.ts";
import { LEGACY_KEY, LEGACY_V2_KEY, STORAGE_KEY } from "../../core/model/state.ts";

const BACKUP_PREFIX = "pg.game.broken.";
const LEGACY_KEYS = [LEGACY_KEY, LEGACY_V2_KEY];

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export function createLocalGameStorage(target?: StorageLike): GameStorage {
  const storage = () => target ?? localStorage;
  // Separate windows can both observe an unused timestamp before either writes.
  // The numeric suffix keeps recovery keys compatible with existing backups.
  const writer = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    .toString()
    .padStart(16, "0");
  return {
    read() {
      const raw = storage().getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
    },
    readRaw() {
      return storage().getItem(STORAGE_KEY);
    },
    write(text: string) {
      storage().setItem(STORAGE_KEY, text);
    },
    remove() {
      storage().removeItem(STORAGE_KEY);
    },
    backup(text: string) {
      try {
        const disk = storage();
        for (let index = 0; index < disk.length; index++) {
          const key = disk.key(index);
          if (key?.startsWith(BACKUP_PREFIX) && disk.getItem(key) === text) return key;
        }
        let timestamp = Date.now();
        while (disk.getItem(BACKUP_PREFIX + timestamp + writer) !== null) timestamp++;
        const key = BACKUP_PREFIX + timestamp + writer;
        disk.setItem(key, text);
        return key;
      } catch {
        return null;
      }
    },
    readFallback() {
      for (const key of LEGACY_KEYS) {
        const value = storage().getItem(key);
        if (value) return { key, value };
      }
      return null;
    },
    watch(listener) {
      if (typeof window === "undefined") return () => {};
      const handler = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) listener();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}
