import { diedRecently } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "klutz",
  edition: "snv",
  // Klutz r1758: one public choice after learning of the death.
  deathStep: {
    target: "one-any",
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || candidate.alive) return null;
      if (!diedRecently(state, candidate.id) || candidate.used?.klutz) return null;
      return candidate;
    },
  },
} satisfies RoleModule;
