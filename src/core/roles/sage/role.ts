import { diedByDemon } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "sage",
  edition: "snv",
  // Sage r3009: wakes only when the Demon killed the Sage.
  nightStep: {
    target: "none",
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      return diedByDemon(state, candidate.id) ? candidate : null;
    },
  },
  deathStep: {
    target: "none",
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      return diedByDemon(state, candidate.id) ? candidate : null;
    },
  },
} satisfies RoleModule;
