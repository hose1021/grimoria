// Pure view helpers for the storyteller console. No DOM, no store access:
// they take the state and the two catalog lookups the screen already has.
import type { PreviewOutcome } from "../../ports.ts";
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

/** A reason a step cannot be completed yet; the card maps it to a locale key. */
export type StepBlocker = "secrets" | "targets" | "given" | "redirect";

export interface StepGate {
  needsSetup: boolean;
  targetsIncomplete: boolean;
  needsGiven: boolean;
  needsRedirect: boolean;
}

/** Every unanswered mandatory decision, in the order the card explains it. */
export function stepBlockers(gate: StepGate): StepBlocker[] {
  const blockers: StepBlocker[] = [];
  if (gate.needsSetup) blockers.push("secrets");
  if (gate.targetsIncomplete) blockers.push("targets");
  if (gate.needsGiven) blockers.push("given");
  if (gate.needsRedirect) blockers.push("redirect");
  return blockers;
}

export interface Rejection {
  text: string;
  code: string | null;
}

/** The pinned id and timestamp the apply command reuses from its preview. */
export function previewIdentity(outcome: PreviewOutcome | null | undefined): {
  id?: string;
  at?: string;
} {
  const identity: { id?: string; at?: string } = {};
  if (outcome?.id) identity.id = outcome.id;
  if (outcome?.at) identity.at = outcome.at;
  return identity;
}

/** The visible reason when the engine rejects a command or asks for a choice. */
export function rejectionOf(result: PreviewOutcome | null | undefined): Rejection | null {
  if (!result) return null;
  if (result.status === "rejected") {
    const first = result.errors && result.errors.length ? result.errors[0] : "";
    return { text: first || result.reason || "", code: result.errorCode ?? null };
  }
  if (result.status === "requires-storyteller-choice") {
    return { text: result.reason || "", code: result.errorCode ?? null };
  }
  return null;
}

/** The six states the issue keeps apart in the step card and the log. */
export type ConsequenceKind =
  | "target"
  | "applied"
  | "death"
  | "scheduled"
  | "prevented"
  | "revived";

export interface Consequence {
  kind: ConsequenceKind;
  playerIds: string[];
}

/**
 * Classifies a preview into the step contract's states. `target` comes from the
 * draft, the rest from the domain events and the future view, so a preview
 * never claims a death happened when the engine only scheduled it.
 */
export function consequencesOf(
  outcome: PreviewOutcome | null | undefined,
  targetIds: string[] = [],
): Consequence[] {
  if (!outcome || outcome.status !== "allowed") return [];
  const lines: Consequence[] = [];
  const add = (kind: ConsequenceKind, playerIds: string[] = []) => {
    const found = lines.find((line) => line.kind === kind);
    if (found) {
      for (const id of playerIds) if (!found.playerIds.includes(id)) found.playerIds.push(id);
      return;
    }
    lines.push({ kind, playerIds: [...playerIds] });
  };
  if (targetIds.length) add("target", targetIds);
  for (const event of outcome.events || []) {
    if (event.type === "effect.added") add("applied");
    else if (event.type === "phase.changed" || event.type === "winner.declared") add("applied");
    else if (event.type === "death.recorded") {
      const death = event.payload.death as { playerId?: unknown } | null;
      const id = death && typeof death.playerId === "string" ? death.playerId : "";
      add("death", id ? [id] : []);
    } else if (event.type === "player.alive_changed") {
      add(event.payload.alive ? "revived" : "death", [String(event.payload.playerId)]);
    } else if (event.type === "player.registered_dead_changed" && event.payload.registeredDead) {
      add("prevented", [String(event.payload.playerId)]);
    }
  }
  if (outcome.result?.noDeath) add("prevented");
  for (const effect of outcome.future?.delayedEffects || []) {
    // `expires` alone is a poison or protection; only a `resolve` (the Pukka's
    // delayed death) is a pending death.
    if (effect.kind === "pukka-death" || effect.resolve) {
      add("scheduled", effect.targetId ? [effect.targetId] : []);
    }
  }
  if (!outcome.events?.length && outcome.changes?.deaths?.length) {
    add("death", outcome.changes.deaths);
  }
  return lines;
}

/**
 * The category of a saved log line. It uses the entry kind and the player's
 * current life, not localized titles: a death-style entry for a living player
 * is a prevented death, and a winner entry is not a consequence line.
 */
export function logConsequence(
  entry: { kind: string; playerId?: string | null },
  alive: (playerId: string) => boolean,
): ConsequenceKind | null {
  if (entry.kind === "winner") return null;
  if (entry.kind === "death" || entry.kind === "execution") {
    return entry.playerId && alive(entry.playerId) ? "prevented" : "death";
  }
  return entry.kind ? "applied" : null;
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
