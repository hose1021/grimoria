// UI preferences: one owner for the `pg.*` keyspace, separate from the game.
import type { PreferenceStore } from "../../application/ports/index.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function createLocalPreferences(target?: StorageLike): PreferenceStore {
  return {
    get(key: string) {
      try {
        return (target ?? localStorage).getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string) {
      try {
        (target ?? localStorage).setItem(key, value);
      } catch {
        // A preference is not worth failing a screen for.
      }
    },
  };
}
