import type { RoleModule } from "../types.ts";

export const role = {
  id: "devilsadvocate",
  edition: "bmr",
  nightStep: { target: "one-any", noteKey: "note.bmr.devilAdvocateOther" },
  firstNightStep: { target: "one-any", noteKey: "note.bmr.devilAdvocateFirst" },
} satisfies RoleModule;
