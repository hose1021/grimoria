import type { RoleModule } from "../types.ts";

export const role = {
  id: "slayer",
  edition: "tb",
  capabilities: [
    {
      kind: "day-action",
      action: "slayer-shot",
      resolve(context) {
        if (context.impaired) return { kind: "record", result: { hit: false, impaired: true } };
        if (!context.targetAlive || !context.targetRegistersDemon) {
          return { kind: "record", result: { hit: false } };
        }
        return {
          kind: "effects",
          effects: [
            {
              kind: "kill",
              playerId: context.targetId,
              cause: "slayer",
              succession: true,
            },
          ],
        };
      },
    },
  ],
} satisfies RoleModule;
