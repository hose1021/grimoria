import type { RoleModule } from "../types.ts";

export const role = {
  id: "tinker",
  edition: "bmr",
  capabilities: [
    {
      kind: "night-step",
      // Tinker r1782: "You might die at any time", so the host's step exists
      // on the first night too. The role never wakes.
      timing: "any",
      step: { target: "none", canKill: true, noteKey: "note.bmr.tinker" },
      // Tinker r1782: "At any time, you may decide that the Tinker dies." The
      // Tinker chooses nothing, so the step resolves to nothing: the host marks
      // the death on the step's outcome.
      resolve: () => ({ kind: "no-effect" }),
    },
  ],
} satisfies RoleModule;
