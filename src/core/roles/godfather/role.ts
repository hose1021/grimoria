import { outsiderDiedToday } from "../bmr-common.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "godfather",
  edition: "bmr",
  nightStep: {
    target: "one-any",
    canKill: true,
    noteKey: "note.bmr.godfather",
    actor(state, night) {
      const holder = roleHolder(state, "godfather");
      if (!holder?.alive) return null;
      return night === 1 || outsiderDiedToday(state, night) ? holder : null;
    },
  },
  // The first night the Godfather only learns which Outsiders are in play.
  firstNightStep: { target: "none", infoKind: "note" },
} satisfies RoleModule;
