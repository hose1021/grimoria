import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "moonchild",
  edition: "bmr",
  nightStep: {
    target: "one-any",
    canKill: true,
    noteKey: "note.bmr.moonchild",
    // The Moonchild wakes only once already dead, to resolve the choice made
    // while alive. A second death is never resolved again.
    actor(state) {
      const holder = roleHolder(state, "moonchild");
      if (!holder || holder.alive) return null;
      const used = holder.used;
      if (!used?.moonchildTarget || used.moonchildResolved) return null;
      return holder;
    },
  },
} satisfies RoleModule;
