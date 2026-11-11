// Browser storage adapter: the game key, the corrupt-value backup and the
// pre-v4 fallback keys. It never validates; the store owns that.
import type { GameStorage } from "../../application/ports/index.ts";
import { LEGACY_KEY, LEGACY_V2_KEY, STORAGE_KEY } from "../../core/model/state.ts";

const LEGACY_KEYS = [LEGACY_KEY, LEGACY_V2_KEY];

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createLocalGameStorage(target: StorageLike = localStorage): GameStorage {
  return {
    read() {
      const raw = target.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
    },
    readRaw() {
      return target.getItem(STORAGE_KEY);
    },
    write(text: string) {
      target.setItem(STORAGE_KEY, text);
    },
    remove() {
      target.removeItem(STORAGE_KEY);
    },
    backup(text: string) {
      const key = "pg.game.broken." + Date.now();
      try {
        target.setItem(key, text);
        return key;
      } catch {
        return null;
      }
    },
    readFallback() {
      for (const key of LEGACY_KEYS) {
        const value = target.getItem(key);
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
