// @ts-check
import { t } from "./strings.js";
import { roleById } from "./roles.js";

/** @typedef {import("./types.js").NightStep} NightStep */
/** @typedef {{ host: string | undefined, player: string, grimoire: string, publicLine: string, check: string }} Guide */

// Missing keys fall back to `t()`'s own default, so a role without a dedicated
// guide still shows the generic instruction set instead of a raw key.
/**
 * @param {string | null | undefined} id
 * @param {string} part
 * @param {string} fallback
 * @returns {string}
 */
function key(id, part, fallback) {
  const found = t("guide." + id + "." + part);
  return found.startsWith("guide.") ? t(fallback) : found;
}

/**
 * @param {NightStep} step
 * @returns {Guide}
 */
export function guideFor(step) {
  const id = step.kind === "system" ? step.system : step.roleId;
  if (step.bmr || step.sv) {
    const role = step.roleId ? roleById(step.roleId) : null;
    return {
      host: role ? role.ability : t(step.sv ? "guide.sv.host" : "guide.bmr.host"),
      player: t("guide.player"),
      grimoire: t(step.sv ? "guide.sv.grimoire" : "guide.bmr.grimoire"),
      publicLine: t("guide.public"),
      check: t(step.sv ? "guide.sv.check" : "guide.bmr.check")
    };
  }
  return {
    host: key(id, "host", "guide.generic.host"),
    player: t("guide.player"),
    grimoire: key(id, "grimoire", "guide.generic.grimoire"),
    publicLine: t("guide.public"),
    check: step.kind === "system" ? t("guide.confirm") : key(id, "check", "guide.generic.check")
  };
}
