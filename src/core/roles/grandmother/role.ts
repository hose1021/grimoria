import type { RoleModule } from "../types.ts";

export const role = {
  id: "grandmother",
  edition: "bmr",
  nightStep: { target: "none", canKill: true, noteKey: "note.bmr.grandmotherDeath" },
  // The first night the Grandmother chooses the grandchild and learns them.
  firstNightStep: { target: "one-any", infoKind: "character" },
} satisfies RoleModule;
