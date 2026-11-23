import type { RoleModule } from "../types.ts";

export const role = {
  id: "grandmother",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      timing: "other",
      step: { target: "none", canKill: false, noteKey: "note.bmr.grandmotherDeath" },
    },
    {
      kind: "night-step",
      timing: "first",
      step: { target: "one-any", infoKind: "character" },
    },
  ],
} satisfies RoleModule;
