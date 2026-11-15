import type { RoleModule } from "../types.ts";

export const role = {
  id: "clockmaker",
  edition: "snv",
  // Clockmaker r2967: "You start knowing" — first night only.
  firstNightStep: { target: "none", infoKind: "number" },
} satisfies RoleModule;
