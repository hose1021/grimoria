import type { RoleModule } from "../types.ts";

export const role = {
  id: "fortuneteller",
  edition: "tb",
  // Fortune Teller r3123: choose 2 players.
  nightStep: { target: "two" },
} satisfies RoleModule;
