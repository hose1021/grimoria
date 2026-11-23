import { outsiderDiedToday } from "../bmr-common.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "godfather",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: {
        target: "one-any",
        canKill: true,
        noteKey: "note.bmr.godfather",
        actor(state, night) {
          const holder = roleHolder(state, "godfather");
          if (!holder?.alive) return null;
          return night === 1 || outsiderDiedToday(state, night) ? holder : null;
        },
      },
    },
    {
      kind: "night-step",
      timing: "first",
      step: { target: "none", infoKind: "note" },
    },
  ],
} satisfies RoleModule;
