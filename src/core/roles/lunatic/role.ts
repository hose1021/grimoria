import { anyoneDiedToday } from "../bmr-common.ts";
import { roleHolder } from "../holder.ts";
import type { RoleModule } from "../types.ts";

export const role = {
  id: "lunatic",
  edition: "bmr",
  nightStep: {
    target: "one-any",
    noteKey: "note.bmr.lunatic",
    // Lunatic r3112: one who believes they are the Zombuul does not wake after
    // a death today.
    actor(state, night) {
      const holder = roleHolder(state, "lunatic");
      if (!holder?.alive) return null;
      if (state.setup.lunaticShownId === "zombuul" && anyoneDiedToday(state, night)) return null;
      return holder;
    },
  },
  // The first night the Lunatic only learns the bluffs and Minion count.
  firstNightStep: { target: "none", infoKind: "note" },
} satisfies RoleModule;
