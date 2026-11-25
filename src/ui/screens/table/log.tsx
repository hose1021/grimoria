// The narrative log shared by the side panel and the game-over review. It
// turns one saved log entry into a console line: the localized step note, the
// phase prefix and the host-choice title. Both surfaces must show the same
// record, so the mapping lives here once.
import { playerById } from "../../../core/model/state.ts";
import { EventLog } from "../../components/arcane/index.ts";
import { displayName, localizeVars, roleNameOf } from "./helpers.ts";
import type { TableView } from "./view.ts";

export function GameLog({
  view,
  previewCount,
  grouped = false,
  className,
}: {
  view: TableView;
  /** Lines shown before the full history; omit to show every line. */
  previewCount?: number;
  /** Keep the append order and put each line under its phase heading. */
  grouped?: boolean;
  className?: string;
}) {
  const { state, ports } = view;
  const t = ports.strings.t;
  const entries = grouped ? state.log || [] : (state.log || []).slice().reverse();
  return (
    <EventLog
      {...(className ? { className } : {})}
      title={t("log")}
      emptyLabel={t("none")}
      allLabel={t("all")}
      {...(previewCount === undefined ? {} : { previewCount })}
      showAllLabel={t("ui.showFullJournal")}
      showLessLabel={t("ui.collapseJournal")}
      filters={[
        { id: "night", label: t("night") },
        { id: "day", label: t("day") },
        { id: "death", label: t("deaths") },
      ]}
      entries={entries.map((entry) => {
        const scope =
          entry.kind === "night"
            ? ("night" as const)
            : entry.kind === "day"
              ? ("day" as const)
              : /death|execut|kill/i.test(entry.kind)
                ? ("death" as const)
                : ("other" as const);
        const time = entry.at
          ? new Date(entry.at).toLocaleTimeString(ports.locale.current(), {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        // A step line carries the catalog key of its note, its role and its
        // night; the Russian strings stay for lines written before them.
        const noteVars =
          entry.noteVars && typeof entry.noteVars === "object"
            ? (entry.noteVars as Record<string, unknown>)
            : undefined;
        const detail =
          typeof entry.noteKey === "string"
            ? t(entry.noteKey, localizeVars(noteVars, ports.roles.byId))
            : entry.detail;
        const phaseNumber = typeof entry.phaseNumber === "number" ? entry.phaseNumber : 0;
        const phase =
          entry.phaseCode === "night" || entry.phaseCode === "day"
            ? phaseNumber
              ? t(entry.phaseCode) + " " + phaseNumber
              : t(entry.phaseCode)
            : entry.phase;
        const voteLogKey =
          entry.case === "vote-count"
            ? "ui.logVoteCount"
            : entry.case === "dead-vote-used"
              ? "ui.logDeadVoteUsed"
              : entry.case === "dead-vote-restored"
                ? "ui.logDeadVoteRestored"
                : null;
        const votePlayer = entry.playerId ? playerById(state, entry.playerId) : null;
        const choiceKey = entry.case ? "hostChoice." + String(entry.case) : null;
        const choiceTitle = choiceKey ? t(choiceKey) : null;
        // A role pair is stored as ids; the journal names the roles in the
        // console language. A player pair already holds seat names. A
        // one-of-two answer starts with the character id and then its two
        // players, so the journal shows the answer the host gave.
        const detailText = String(detail);
        const colon = detailText.indexOf(": ");
        const rolePrefix = colon > 0 ? detailText.slice(0, colon) : "";
        const shownDetail =
          entry.case === "information-pair"
            ? detailText
                .split(" / ")
                .map((part) => (ports.roles.byId(part) ? roleNameOf(part, ports.roles.byId) : part))
                .join(" / ")
            : entry.case === "false-information" && rolePrefix && ports.roles.byId(rolePrefix)
              ? roleNameOf(rolePrefix, ports.roles.byId) + detailText.slice(colon)
              : detail;
        // The step record names the actor and the chosen players even when the
        // note is only the prompt, so every role's choice is visible.
        const actorId = typeof entry.actorId === "string" ? entry.actorId : null;
        const targetIds = Array.isArray(entry.targetIds)
          ? entry.targetIds.filter((id): id is string => typeof id === "string")
          : [];
        const actor = actorId ? playerById(state, actorId) : null;
        const targets = targetIds
          .map((id) => playerById(state, id))
          .filter((player): player is NonNullable<typeof player> => Boolean(player))
          .map((player) => displayName(player, t))
          .join(", ");
        const choice = actor
          ? targets
            ? displayName(actor, t) + " → " + targets
            : displayName(actor, t)
          : targets
            ? t("ui.logChoice") + ": " + targets
            : "";
        const shownWithChoice = [shownDetail, choice].filter(Boolean).join(" · ");
        return {
          title: voteLogKey
            ? t(voteLogKey, {
                name: votePlayer ? displayName(votePlayer, t) : t("ui.unknown"),
                n: entry.detail ?? "",
              })
            : typeof entry.roleId === "string"
              ? roleNameOf(entry.roleId, ports.roles.byId)
              : choiceTitle && choiceKey && choiceTitle !== choiceKey
                ? choiceTitle
                : entry.title,
          detail: grouped
            ? shownWithChoice && !voteLogKey
              ? shownWithChoice
              : ""
            : `${phase}${shownWithChoice && !voteLogKey ? " · " + shownWithChoice : ""}`,
          ...(grouped ? { group: phase } : {}),
          ...(time ? { time } : {}),
          scope,
          ...(entry.case ? { case: entry.case } : {}),
          ...(scope === "death" ? { tone: "danger" as const } : {}),
        };
      })}
    />
  );
}
