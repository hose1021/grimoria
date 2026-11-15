import type { RoleModule } from "../types.ts";

export const role = {
  id: "gambler",
  edition: "bmr",
  nightStep: { target: "one-any", canKill: true, noteKey: "note.bmr.gambler" },
} satisfies RoleModule;
