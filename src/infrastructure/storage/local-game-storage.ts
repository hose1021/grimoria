// Browser storage adapter: the game key, the corrupt-value backup and the
// pre-v4 fallback keys. It never validates; the store owns that.
import type { GameStorage } from "../../application/ports/index.ts";

const KEY = "pg.game.v4";
const LEGACY_KEYS = ["pg.game.v3", "pg.game.v2"];

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createLocalGameStorage(target: StorageLike = localStorage): GameStorage {
  return {
    read() {
      const raw = target.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
    },
    readRaw() {
      return target.getItem(KEY);
    },
    write(text: string) {
      target.setItem(KEY, text);
    },
    remove() {
      target.removeItem(KEY);
    },
    backup(text: string) {
      const key = "pg.game.broken." + Date.now();
      try {
        target.setItem(key, text);
        return key;
      } catch (error) {
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
        if (event.key === KEY) listener();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
  };
}
