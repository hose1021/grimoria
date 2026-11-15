import type { RoleModule } from "../types.ts";

export const role = {
  id: "poisoner",
  edition: "tb",
  // Poisoner r1737: choose a player; they are poisoned tonight and tomorrow day.
  nightStep: { target: "one-any" },
} satisfies RoleModule;
