import type { RoleModule } from "../types.ts";

export const role = {
  id: "oracle",
  edition: "snv",
  nightStep: { target: "none", infoKind: "number" },
} satisfies RoleModule;
