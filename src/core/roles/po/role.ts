import type { RoleModule } from "../types.ts";

export const role = {
  id: "po",
  edition: "bmr",
  nightStep: {
    target: "po",
    minTargets: 0,
    maxTargets: 3,
    canKill: true,
    noteKey: "note.bmr.po",
  },
} satisfies RoleModule;
