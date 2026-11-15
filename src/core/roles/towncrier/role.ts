import type { RoleModule } from "../types.ts";

export const role = {
  id: "towncrier",
  edition: "snv",
  nightStep: { target: "none", infoKind: "yes-no" },
} satisfies RoleModule;
