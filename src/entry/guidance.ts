import { t } from "../ui/i18n/strings.ts";
import { roleById } from "../infrastructure/catalog/role-catalog.ts";
import type { NightStep } from "../core/model/types.ts";

export interface Guide {
  host: string | undefined;
  player: string;
  grimoire: string;
  publicLine: string;
  check: string;
}

// Missing keys fall back to `t()`'s own default, so a role without a dedicated
// guide still shows the generic instruction set instead of a raw key.
function key(id: string | null | undefined, part: string, fallback: string): string {
  const found = t("guide." + id + "." + part);
  return found.startsWith("guide.") ? t(fallback) : found;
}

export function guideFor(step: NightStep): Guide {
  const id = step.kind === "system" ? step.system : step.roleId;
  if (step.bmr || step.sv) {
    const role = step.roleId ? roleById(step.roleId) : null;
    return {
      host: role ? role.ability : t(step.sv ? "guide.sv.host" : "guide.bmr.host"),
      player: t("guide.player"),
      grimoire: t(step.sv ? "guide.sv.grimoire" : "guide.bmr.grimoire"),
      publicLine: t("guide.public"),
      check: t(step.sv ? "guide.sv.check" : "guide.bmr.check"),
    };
  }
  return {
    host: key(id, "host", "guide.generic.host"),
    player: t("guide.player"),
    grimoire: key(id, "grimoire", "guide.generic.grimoire"),
    publicLine: t("guide.public"),
    check: step.kind === "system" ? t("guide.confirm") : key(id, "check", "guide.generic.check"),
  };
}
