import { gossipWasTrue } from "../bmr-common.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "gossip",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: {
        target: "one-any",
        canKill: true,
        noteKey: "note.bmr.gossip",
        actor(state, night) {
          const holder = roleHolder(state, "gossip");
          if (!holder?.alive) return null;
          return gossipWasTrue(state, night) ? holder : null;
        },
      },
    },
  ],
} satisfies RoleModule;
