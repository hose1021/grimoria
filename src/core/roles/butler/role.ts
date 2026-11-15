import type { RoleModule } from "../types.ts";

export const role = {
  id: "butler",
  edition: "tb",
  // Butler r3120: choose a player other than yourself.
  nightStep: { target: "one-other" },
} satisfies RoleModule;
