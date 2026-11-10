// Platform defaults for the store: the real clock, UUID ids and an FNV seed.
// Pure Node-friendly code with no legacy import.
import type { Clock, IdSource, RandomSource } from "../../core/ports/index.ts";

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createSystemPorts(): { clock: Clock; ids: IdSource; random: RandomSource } {
  return {
    clock: { now: () => new Date() },
    ids: {
      next(prefix = "cmd") {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          return crypto.randomUUID();
        }
        return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      }
    },
    random: { seed: (text: string) => hash(text) }
  };
}
