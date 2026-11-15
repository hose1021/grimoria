import type { RoleModule } from "../types.ts";

export const role = {
  id: "saint",
  edition: "tb",
  capabilities: [
    {
      kind: "win",
      resolve(context) {
        const death = context.executionDeath;
        if (death && death.roleId === "saint" && !death.impaired) {
          return { kind: "win", team: "evil", reason: "saint" };
        }
        return { kind: "no-effect" };
      },
    },
  ],
} satisfies RoleModule;
