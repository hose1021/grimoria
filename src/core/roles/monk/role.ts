import type { RoleModule } from "../types.ts";

export const role = {
  id: "monk",
  edition: "tb",
  // Monk r3124: choose a player other than yourself.
  nightStep: { target: "one-other" },
} satisfies RoleModule;
