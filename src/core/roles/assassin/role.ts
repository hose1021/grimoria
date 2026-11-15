import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "assassin",
  edition: "bmr",
  nightStep: {
    target: "one-any",
    optional: true,
    canKill: true,
    noteKey: "note.bmr.assassin",
    actor(state) {
      const holder = roleHolder(state, "assassin");
      return holder && holder.alive && !holder.used?.assassin ? holder : null;
    },
  },
} satisfies RoleModule;
