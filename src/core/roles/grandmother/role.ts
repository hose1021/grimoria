import type { RoleModule } from "../types.ts";

export const role = {
  id: "grandmother",
  edition: "bmr",
  nightStep: { target: "none", canKill: false, noteKey: "note.bmr.grandmotherDeath" },
  // The first night the Grandmother chooses the grandchild and learns them.
  firstNightStep: { target: "one-any", infoKind: "character" },
} satisfies RoleModule;
