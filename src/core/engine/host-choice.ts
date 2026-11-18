// One contract for every discretionary Storyteller decision. The engine never
// answers these: it names the case, shows the reason, offers only legal options
// and records the answer the host gives.
import type { GameState, NightStep, RoleId } from "../model/types.ts";
import { addLog } from "./context.ts";
import { systemPorts } from "../model/ports.ts";
import type { CommandExecutionContext } from "../model/ports.ts";
import { isImpaired } from "./effects.ts";
import { roleModule } from "../roles/registry.ts";
import { requiresInfoPair } from "./command-versions.ts";

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
}

/** The case a step's discretionary answer belongs to. */
export function caseForStep(
  step: NightStep,
  info?: { impaired?: boolean } | null,
  version?: string,
): HostChoiceCase {
  if (step.roleId === "flowergirl") return "flowergirl-answer";
  if (step.roleId === "towncrier") return "towncrier-answer";
  if ((step.roleId === "dreamer" || step.roleId === "sage") && requiresInfoPair(version)) {
    return "information-pair";
  }
  // An offered option without impairment comes from a registration override,
  // not from false information.
  return info && info.impaired === false ? "registration-ambiguity" : "false-information";
}

/** True when the supplied answer is one of the options the step offered. */
export function givenIsLegal(
  info: LegalInfo | null | undefined,
  given: Record<string, unknown> | null | undefined,
): boolean {
  if (!info || !info.needsChoice) return true;
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
    return info.zero === true && options.map(String).includes("zero");
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
  if (given.zero === true) return "0";
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
