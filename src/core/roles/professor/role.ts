import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "professor",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: {
        target: "one-any",
        optional: true,
        canResurrect: true,
        noteKey: "note.bmr.professor",
        actor(state) {
          const holder = roleHolder(state, "professor");
          return holder && holder.alive && !holder.used?.professor ? holder : null;
        },
      },
    },
  ],
} satisfies RoleModule;
