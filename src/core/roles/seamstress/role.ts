import { stillWakes } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "seamstress",
  edition: "snv",
  nightStep: {
    target: "two",
    optional: true,
    infoKind: "note",
    actor(state, night, candidate) {
      if (!candidate || !stillWakes(state, candidate)) return null;
      return candidate.used?.seamstress ? null : candidate;
    },
  },
} satisfies RoleModule;
