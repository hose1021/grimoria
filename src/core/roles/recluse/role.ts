import type { RoleModule } from "../types.ts";

export const role = {
  id: "recluse",
  edition: "tb",
  capabilities: [
    {
      kind: "adjudication",
      case: "registration",
      options: ["evil", "demon", "minion"],
    },
  ],
} satisfies RoleModule;
