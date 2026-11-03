import { t } from "./strings.js";

export function guideFor(step) {
  const id = step.kind === "system" ? step.system : step.roleId;
  return {
    host: t("guide." + id + ".host"),
    player: t("guide.player"),
    grimoire: t("guide." + id + ".grimoire"),
    publicLine: t("guide.public"),
    check: step.kind === "system" ? t("guide.confirm") : t("guide." + id + ".check")
  };
}
