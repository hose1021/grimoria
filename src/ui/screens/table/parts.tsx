// Presentational pieces shared by the console cards.
import type { ReactNode } from "react";
import type { GameState, Player } from "../../../core/model/types.ts";
import { seatProjection } from "../../../application/read-models/table.ts";
import { labelClass } from "../../components/label.tsx";
import type { ShellPorts } from "../../ports.ts";
import { displayName } from "./helpers.ts";
import {
  ALERT,
  ALERT_BAD,
  CHIP,
  CHIPS,
  INLINE,
  MUTED,
  PANEL_HEAD,
  ROLE_LINE,
  TEAM_DOT,
  TOKEN,
  TOKEN_BUTTON,
  TOKEN_IMG,
  TOKEN_MINI,
  TOKEN_MINI_IMG,
  TOKEN_MINI_NAME,
  TOKEN_NAME,
} from "./styles.ts";

export type ViewPorts = ShellPorts;

const TEAM_COLOR: Record<string, string> = {
  townsfolk: "bg-townsfolk",
  outsider: "bg-outsider",
  minion: "bg-minion",
  demon: "bg-demon",
  traveller: "bg-traveller",
};

export function RoleToken({
  id,
  ports,
  mini = false,
  onOpen,
}: {
  id: string;
  ports: ViewPorts;
  mini?: boolean;
  onOpen?: () => void;
}) {
  const role = ports.roles.byId(id);
  if (!role) return null;
  const content = (
    <>
      <img className={mini ? TOKEN_MINI_IMG : TOKEN_IMG} src={ports.roles.image(role)} alt="" />
      <b className={mini ? TOKEN_MINI_NAME : TOKEN_NAME}>{role.name}</b>
    </>
  );
  const classes = mini ? `${TOKEN_MINI}` : `${TOKEN}${onOpen ? ` ${TOKEN_BUTTON}` : ""}`;
  if (!onOpen) {
    return (
      <span className={classes} data-role-token={id}>
        {content}
      </span>
    );
  }
  return (
    <button className={classes} type="button" data-role-card={id} onClick={onOpen}>
      {content}
    </button>
  );
}

export function RoleLine({ player, ports }: { player: Player; ports: ViewPorts }) {
  const role = player.roleId ? ports.roles.byId(player.roleId) : null;
  if (!role) return <span className={MUTED}>{ports.strings.t("ui.noRole")}</span>;
  return (
    <span className={`host-role ${ROLE_LINE}`} data-team={role.team}>
      <i className={`${TEAM_DOT} ${TEAM_COLOR[role.team] || "bg-muted"}`} aria-hidden="true" />
      {role.name}
    </span>
  );
}

export function EffectBadges({
  state,
  player,
  ports,
}: {
  state: GameState;
  player: Player;
  ports: ViewPorts;
}) {
  const t = ports.strings.t;
  const seat = seatProjection(state, player.id);
  const badges: string[] = [];
  if (player.roleId === "drunk") badges.push(t("ui.drunk"));
  if (player.roleId !== "drunk" && seat.impaired) badges.push(t("ui.poisoned"));
  if (seat.protected) badges.push(t("ui.protected"));
  const master = seat.butlerMasterId;
  if (master) badges.push(t("ui.master") + displayName(state.players[master], t));
  if (state.setup.herringId === player.id || state.herringId === player.id) {
    badges.push(t("ui.herring"));
  }
  for (const reminder of player.reminders || []) badges.push(reminder);
  const used = Object.keys(player.used || {});
  if (used.length) badges.push(t("ui.used") + used.join(", "));
  if (!badges.length) return null;
  return (
    <span className={CHIPS}>
      {badges.map((badge) => (
        <span key={badge} className={CHIP}>
          {badge}
        </span>
      ))}
    </span>
  );
}

export function PanelHead({ label, note }: { label: string; note?: ReactNode }) {
  return (
    <div className={PANEL_HEAD}>
      <span className={labelClass}>{label}</span>
      {note === undefined ? null : <span className={MUTED}>{note}</span>}
    </div>
  );
}

export function Warn({
  title,
  children,
  bad = false,
  className = "",
}: {
  title: ReactNode;
  children?: ReactNode;
  bad?: boolean;
  className?: string;
}) {
  return (
    <div className={`${ALERT}${bad ? ` ${ALERT_BAD}` : ""}${className ? ` ${className}` : ""}`}>
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Inline({ children }: { children: ReactNode }) {
  return <div className={INLINE}>{children}</div>;
}
