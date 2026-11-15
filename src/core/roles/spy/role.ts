import type { RoleModule } from "../types.ts";

export const role = {
  id: "spy",
  edition: "tb",
  nightStep: {},
  capabilities: [
    {
      kind: "adjudication",
      case: "registration",
      options: ["good"],
    },
  ],
} satisfies RoleModule;
