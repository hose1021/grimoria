import { diedRecently } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "sweetheart",
  edition: "snv",
  nightStep: {
    target: "one-any",
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      return diedRecently(state, candidate.id, "sweetheart") ? candidate : null;
    },
  },
  deathStep: {
    target: "one-any",
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      return diedRecently(state, candidate.id, "sweetheart") ? candidate : null;
    },
  },
} satisfies RoleModule;
