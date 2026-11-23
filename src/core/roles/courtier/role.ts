import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "courtier",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      timing: "any",
      step: {
        target: "none",
        optional: true,
        noteKey: "note.bmr.courtier",
        actor(state) {
          const holder = roleHolder(state, "courtier");
          return holder && holder.alive && !holder.used?.courtier ? holder : null;
        },
      },
    },
  ],
} satisfies RoleModule;
