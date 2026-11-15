import type { RoleModule } from "../types.ts";

export const role = {
  id: "pacifist",
  edition: "bmr",
  capabilities: [
    {
      kind: "execution",
      resolve(context) {
        if (context.executedTeam !== "good") return { kind: "no-effect" };
        if (!context.hasLivingUnimpairedRole("pacifist")) return { kind: "no-effect" };
        return { kind: "survives" };
      },
    },
  ],
} satisfies RoleModule;
