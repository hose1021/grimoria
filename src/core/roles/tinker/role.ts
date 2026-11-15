import type { RoleModule } from "../types.ts";

export const role = {
  id: "tinker",
  edition: "bmr",
  nightStep: { target: "none", canKill: true, noteKey: "note.bmr.tinker" },
} satisfies RoleModule;
