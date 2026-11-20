// One contract for every discretionary Storyteller decision. The engine never
// answers these: it names the case, shows the reason, offers only legal options
// and records the answer the host gives.
import type { GameState, NightStep, RoleId } from "../model/types.ts";
import { addLog } from "./context.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { isImpaired } from "./effects.ts";
import { roleModule } from "../roles/registry.ts";
import { requiresInfoPair, validatesOneOfTwoAnswer } from "./command-versions.ts";

export const HOST_CHOICE_CASES = [
  "false-information",
  "registration-ambiguity",
  "registration",
  "mayor-redirect",
  "demon-heir",
  "madness-penalty",
  "flowergirl-answer",
  "towncrier-answer",
  "information-pair",
  "pacifist-survival",
] as const;

export type HostChoiceCase = (typeof HOST_CHOICE_CASES)[number];

export const HOST_CHOICE_REASONS: Record<HostChoiceCase, string> = {
  "false-information":
    "Способность даёт ложную информацию (Вортокс, отравление или опьянение): ведущий выбирает, что именно услышит игрок.",
  registration:
    "Шпион или Отшельник может регистрироваться иначе: ведущий выбирает, как способность видит этого игрока.",
  "registration-ambiguity":
    "Ответ зависит от того, как регистрируются Шпион или Отшельник: ведущий выбирает один из законных вариантов.",
  "mayor-redirect":
    "Смертельная атака на Мэра: ведущий выбирает, кто умирает вместо него, или что не умирает никто.",
  "demon-heir":
    "Демон погиб: ведущий выбирает живого Приспешника, который становится новым Демоном.",
  "flowergirl-answer":
    "Цветочница узнаёт, голосовал ли сегодня Демон: ведущий проверяет голоса и выбирает ответ.",
  "towncrier-answer":
    "Глашатай узнаёт, выдвигал ли сегодня Приспешник: ведущий проверяет выдвижения и выбирает ответ.",
  "madness-penalty":
    "Безумие могло быть нарушено: ведущий решает, казнить ли игрока или не применять последствий.",
  "information-pair":
    "Ведущий показывает пару: содержимое ответа проверяется по официальному ограничению.",
  "pacifist-survival":
    "Казнённый добрый игрок выжил по способности Пацифиста: ведущий записывает причину.",
};

export interface LegalInfo {
  kind?: string;
  options?: unknown[];
  needsChoice?: boolean;
  zero?: boolean;
  roleId?: string | null;
  pair?: string[];
  /** The host's own wording of this answer. */
  answerText?: string;
}

/** The case a step's discretionary answer belongs to. */
export function caseForStep(
  step: NightStep,
  info?: { impaired?: boolean; falsifiedSuffix?: boolean } | null,
  version?: string,
): HostChoiceCase {
  if (step.roleId === "flowergirl") return "flowergirl-answer";
  if (step.roleId === "towncrier") return "towncrier-answer";
  if ((step.roleId === "dreamer" || step.roleId === "sage") && requiresInfoPair(version)) {
    return "information-pair";
  }
  // A mandatory false answer (the Vortox) is false information even when the
  // actor is healthy; only a registration override explains healthy options.
  if (info && info.impaired === false && info.falsifiedSuffix !== true) {
    return "registration-ambiguity";
  }
  return "false-information";
}

/** True when the step offered the Librarian's zero as the true or a false answer. */
function zeroAnswerOffered(info: LegalInfo): boolean {
  if (info.zero === true) return true;
  return (info.options || []).map(String).includes("zero");
}

/** True when the supplied answer is one of the options the step offered. */
export function givenIsLegal(
  info: LegalInfo | null | undefined,
  given: Record<string, unknown> | null | undefined,
  state?: GameState | null,
  version?: string,
): boolean {
  if (!info) return true;
  // A prepared one-of-two answer is the engine's: a command may repeat it but
  // cannot replace the Townsfolk or the two players (Washerwoman r2630).
  if (
    validatesOneOfTwoAnswer(version) &&
    info.kind === "one-of-two" &&
    (!info.needsChoice || given)
  ) {
    if (!given) return !info.needsChoice;
    if (given.zero === true) {
      if (given.roleId != null) return false;
      return zeroAnswerOffered(info);
    }
    const roleId = typeof given.roleId === "string" ? given.roleId : "";
    if (!roleId) return false;
    const options = (info.options || []).map(String);
    if (info.needsChoice) {
      if (!options.includes(roleId)) return false;
    } else if (info.roleId != null && roleId !== String(info.roleId)) {
      return false;
    }
    // The answer names its two players; a missing pair is incomplete.
    if (!Array.isArray(given.pair)) return false;
    const pair = given.pair.map(String);
    if (pair.length !== 2 || pair[0] === pair[1]) return false;
    if (state && !pair.every((id) => state.players[id])) return false;
    if (!info.needsChoice && Array.isArray(info.pair) && info.pair.length === 2) {
      const prepared = info.pair.map(String).sort();
      const shown = pair.slice().sort();
      if (shown[0] !== prepared[0] || shown[1] !== prepared[1]) return false;
    }
    return true;
  }
  if (!info.needsChoice) return true;
  if (!given) return false;
  const options = info.options || [];
  if (info.kind === "role-pair" || info.kind === "player-pair") {
    const pair = Array.isArray(given.pair) ? given.pair.map(String) : [];
    if (pair.length !== 2 || pair[0] === pair[1]) return false;
    return options.map(String).includes(pair.join("|"));
  }
  if (info.kind === "number") {
    return typeof given.value === "number" && options.map(Number).includes(given.value);
  }
  if (info.kind === "yes-no") {
    return typeof given.value === "boolean" && options.includes(given.value);
  }
  if (info.kind === "one-of-two" && given.zero === true) {
    // A payload may not claim zero and name a role at the same time.
    if (given.roleId != null) return false;
    return zeroAnswerOffered(info);
  }
  if (info.kind === "character" || info.kind === "one-of-two" || info.kind === "role") {
    return options.map(String).includes(String(given.roleId));
  }
  // Free-form cases (a note, a text announcement) have no option list to check.
  return options.length === 0;
}

/** What the journal shows for an applied registration. */
export function describeRegistrations(
  state: GameState,
  registrations: Record<string, string> | null | undefined,
): string {
  const parts: string[] = [];
  for (const [playerId, value] of Object.entries(registrations || {})) {
    const player = state.players[playerId];
    parts.push((player ? player.name || "Игрок " + player.seat : playerId) + " → " + value);
  }
  return parts.length ? parts.join(", ") : "—";
}

/** What the journal shows for an applied answer. */
export function describeGiven(
  given: Record<string, unknown> | null | undefined,
  state?: GameState | null,
): string {
  if (!given) return "—";
  if (typeof given.answerText === "string" && given.answerText.trim()) return given.answerText;
  if (given.zero === true) return "0";
  // A prepared answer is a character and its two players: the journal keeps
  // both, so the Storyteller reads the answer they gave (Washerwoman r2630).
  if (given.kind === "one-of-two") {
    const role = given.roleId != null ? String(given.roleId) : "—";
    if (!Array.isArray(given.pair)) return role;
    const pair = given.pair.map((id) => {
      const player = state?.players[String(id)];
      return player ? player.name || "Игрок " + player.seat : String(id);
    });
    return role + ": " + pair.join(" / ");
  }
  if (Array.isArray(given.pair)) {
    const pair = given.pair.map(String);
    // A player pair names the seats, not the opaque ids.
    if (given.kind === "player-pair" && state) {
      return pair
        .map((id) => {
          const player = state.players[id];
          return player ? player.name || "Игрок " + player.seat : id;
        })
        .join(" / ");
    }
    return pair.join(" / ");
  }
  if (typeof given.value === "boolean") return given.value ? "да" : "нет";
  if (typeof given.value === "number") return String(given.value);
  if (given.roleId != null) return String(given.roleId);
  if (typeof given.text === "string") return given.text;
  return "записано";
}

/** Appends one secret journal line with the case, the reason and the answer. */
export function recordHostChoice(
  state: GameState,
  caseId: HostChoiceCase,
  answer: string,
  playerId: string | null = null,
  ports: CommandExecutionContext = systemPorts,
): void {
  addLog(
    state,
    {
      secret: true,
      kind: "choice",
      title: HOST_CHOICE_REASONS[caseId],
      detail: answer,
      ...(playerId ? { playerId } : {}),
      case: caseId,
    },
    ports,
  );
}

// Only a role that declares the registration adjudication arm changes what
// abilities see: the Spy and the Recluse today.
/** The registration values a role may take, or an empty list for every other role. */
export function legalRegistrations(roleId: RoleId | null | undefined): readonly string[] {
  const module = roleModule(roleId || "");
  for (const capability of module?.capabilities || []) {
    if (capability.kind === "adjudication" && capability.case === "registration") {
      return capability.options;
    }
  }
  return [];
}

/**
 * Rejects a registration for another player than the Spy or the Recluse and a
 * value those abilities never read. Returns the error message, or null.
 */
export function registrationError(
  state: GameState,
  registrations: Record<string, string> | null | undefined,
): string | null {
  for (const [playerId, value] of Object.entries(registrations || {})) {
    const player = state.players[playerId];
    if (!player) return "Нет такого игрока для регистрации.";
    const legal = legalRegistrations(player.roleId);
    if (!legal.length) return "Этот персонаж не меняет регистрацию.";
    if (isImpaired(state, player.id)) return "Игрок отравлен или пьян: регистрация не действует.";
    if (!legal.includes(String(value))) return "Недопустимое значение регистрации.";
  }
  return null;
}
