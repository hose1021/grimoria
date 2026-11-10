// UI preferences: one owner for the `pg.*` keyspace, separate from the game.
import type { PreferenceStore } from "../../application/ports/index.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function createLocalPreferences(target: StorageLike = localStorage): PreferenceStore {
  return {
    get(key: string) {
      try {
        return target.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(key: string, value: string) {
      try {
        target.setItem(key, value);
      } catch (error) {
        // A preference is not worth failing a screen for.
      }
    }
  };
}
