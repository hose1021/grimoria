// Pure view helpers for the storyteller console. No DOM, no store access:
// they take the state and the two catalog lookups the screen already has.
import { livingPlayers, orderedPlayers, playerById } from "../../../core/model/state.ts";
import { ALL_ROLES as RULE_ROLES, roleLabel, roleTeam } from "../../../core/model/rules.ts";
import type { GameState, NightStep, Player, Role, RoleId } from "../../../core/model/types.ts";

export type Translate = (key: string, vars?: Record<string, string | number>) => string;
export type RoleLookup = (id: string) => Role | null;

export interface Guide {
  host?: string;
  player: string;
  grimoire: string;
  publicLine: string;
  check: string;
}

/** The information result shape `infoForStep` returns; the engine keeps it private. */
export interface StepInfo {
  kind: string;
  value?: unknown;
  roleId?: RoleId | null;
  pair?: string[];
  matchIndex?: number;
  impaired?: boolean;
  needsChoice?: boolean;
  options?: unknown[];
  text?: string;
  missing?: boolean;
  zero?: boolean;
  bluffs?: string[];
  demonId?: string | null;
  playerId?: string | null;
}

export interface CorrectionDraft {
  playerId: string;
  kind: string;
  value: string;
  reason: string;
}

export function displayName(player: Player | null | undefined, t: Translate): string {
  if (!player) return "—";
  return player.name || (player.seat ? t("ui.player") + " " + player.seat : "—");
}

export function roleNameOf(id: string | null | undefined, roles: RoleLookup): string {
  const role = roles(id || "");
  return role ? role.name : roleLabel(id || "");
}

export function stepTitle(
  step: NightStep | null | undefined,
  roles: RoleLookup,
  t: Translate,
): string {
  if (!step) return "";
  if (step.roleId) return roleNameOf(step.roleId, roles);
  return step.system ? t("system." + step.system) : t("step");
}

export function targetNames(
  ids: string[] | null | undefined,
  state: GameState,
  t: Translate,
): string {
  return (ids || [])
    .map((id) => {
      const player = playerById(state, id);
      return player ? displayName(player, t) : id;
    })
    .join(", ");
}

export function currentPhaseLabel(state: GameState, t: Translate): string {
  if (state.phase === "night") return `${t("night")} ${state.night.number}`;
  if (state.phase === "day") return `${t("day")} ${state.day.number}`;
  if (state.phase === "deal") return t("playerHandoff");
  if (state.phase === "over") return t("gameOver");
  return t("setup");
}

export function headerCount(state: GameState, t: Translate): string {
  if (state.phase === "setup" || state.phase === "deal" || state.phase === "seat") {
    return `${orderedPlayers(state).length} ${t("players")}`;
  }
  return `${livingPlayers(state).length} ${t("alive")}`;
}

export function causeText(cause: string, t: Translate): string {
  return (
    {
      execution: t("ui.execution"),
      demon: t("ui.demon"),
      slayer: t("ui.slayer"),
      virgin: t("ui.virgin"),
      "imp-self-kill": t("ui.selfKill"),
      manual: t("ui.correction"),
      legacy: t("ui.migrated"),
    }[cause] || cause
  );
}

export function timerText(end: number | null, now: number): string {
  if (!end) return "—";
  const left = Math.max(0, end - now);
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

export function infoText(
  state: GameState,
  step: NightStep,
  info: StepInfo | null | undefined,
  roles: RoleLookup,
  t: Translate,
): string {
  if (!info) return t("none");
  const roleName = (id: string | null | undefined) => roleNameOf(id, roles);
  if (info.kind === "note") return info.text || "";
  if (info.kind === "one-of-two") {
    if (info.zero) return t("ui.zero");
    if (!info.roleId) return info.text || t("ui.notSet");
    const pair = (info.pair || []).map((id) => {
      const player = playerById(state, id);
      return player ? `${displayName(player, t)} (${player.seat})` : id;
    });
    return t("infoPairResult", { role: roleName(info.roleId), pair: pair.join(t("ui.or")) });
  }
  if (info.kind === "number") return t("numberResult", { value: String(info.value) });
  if (info.kind === "yes-no") {
    return t("answerResult", { value: info.value ? t("yes") : t("no") });
  }
  if (info.kind === "character") {
    const player = info.playerId ? playerById(state, info.playerId) : null;
    return `${player ? displayName(player, t) : t("ui.player")} — ${
      info.roleId ? roleName(info.roleId) : t("ui.unknown")
    }.`;
  }
  if (info.kind === "grimoire") return t("ui.showGrimoireHint");
  if (info.kind === "minion-info") {
    const demon = info.demonId ? playerById(state, info.demonId) : null;
    return t("demonResult", { name: demon ? displayName(demon, t) : "—" });
  }
  if (info.kind === "demon-info") {
    const minions = livingPlayers(state)
      .filter((player) => roleTeam(player.roleId || "") === "minion")
      .map((player) => displayName(player, t))
      .join(", ");
    const bluffs = (info.bluffs || state.bluffs || []).map(roleName).join(", ");
    return t("demonInfoResult", { minions: minions || "—", bluffs: bluffs || "—" });
  }
  return info.text || t("none");
}

/** The command payload keeps an information result as a plain record. */
export function infoPayload(info: StepInfo | null | undefined): Record<string, unknown> | null {
  return info ? Object.fromEntries(Object.entries(info)) : null;
}

export function applyGiven(
  info: StepInfo | null | undefined,
  raw: string,
  kind: string,
): StepInfo | null | undefined {
  if (!info) return info;
  if (kind === "number") return { ...info, value: Number(raw), needsChoice: false };
  if (kind === "bool") return { ...info, value: raw === "true", needsChoice: false };
  if (kind === "role") return { ...info, roleId: raw, needsChoice: false };
  return info;
}

export function defaultCorrectionValue(kind: string, player: Player | null | undefined): string {
  if (kind === "role") return (player && player.roleId) || RULE_ROLES[0] || "";
  if (kind === "alive") return player && player.alive ? "dead" : "alive";
  return "";
}
