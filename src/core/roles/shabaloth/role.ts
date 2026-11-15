import type { RoleModule } from "../types.ts";

export const role = {
  id: "shabaloth",
  edition: "bmr",
  nightStep: {
    target: "two",
    canKill: true,
    canResurrect: true,
    noteKey: "note.bmr.shabaloth",
  },
} satisfies RoleModule;
