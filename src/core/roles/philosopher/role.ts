import { stillWakes } from "../sv-common.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "philosopher",
  edition: "snv",
  capabilities: [
    {
      kind: "night-step",
      timing: "any",
      step: {
        target: "none",
        optional: true,
        infoKind: "note",
        actor(state, night, candidate) {
          if (!candidate || !stillWakes(state, candidate)) return null;
          return candidate.used?.philosopher ? null : candidate;
        },
      },
    },
  ],
} satisfies RoleModule;
