import type { RoleModule } from "../types.ts";

export const role = {
  id: "innkeeper",
  edition: "bmr",
  nightStep: { target: "two", noteKey: "note.bmr.innkeeper" },
} satisfies RoleModule;
