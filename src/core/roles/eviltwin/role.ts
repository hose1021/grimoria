import type { RoleModule } from "../types.ts";

export const role = {
  id: "eviltwin",
  edition: "snv",
  // Evil_Twin r3101: the pair meets once, on the first night.
  firstNightStep: { target: "none", infoKind: "note" },
} satisfies RoleModule;
