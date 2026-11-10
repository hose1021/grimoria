import type { Role, RoleId, Script } from "./types.js";

type ParseResult = { ok: true, script: Script, travellers: RoleId[] } | { ok: false, error: string };

// Scenario (script) definitions and Blood on the Clocktower script import.
// Pure data and parsing: no DOM, no storage, no window access.
import { ALL_ROLES, BMR_ALL, SNV_ALL, SUPPORTED_ROLES, isBmrRole, isSnvRole, roleTeam } from "./rules.ts";






// Official scripts known to the picker. All three core scenarios have a rules
// implementation; Sects and Violets is host-adjudicated like Bad Moon Rising.
export const OFFICIAL_SCRIPTS = [
  { id: "tb", name: "Trouble Brewing", edition: "tb", supported: true, roleCount: ALL_ROLES.length },
  { id: "bmr", name: "Bad Moon Rising", edition: "bmr", supported: true, roleCount: BMR_ALL.length },
  { id: "snv", name: "Sects and Violets", edition: "snv", supported: true, roleCount: SNV_ALL.length }
];

export const SCRIPT_SOURCES = ["official", "file", "url", "clipboard", "text"];

export function troubleBrewingScript(): Script {
  return {
    id: "tb",
    name: "Trouble Brewing",
    edition: "tb",
    source: "official",
    roles: ALL_ROLES.slice()
  };
}

export function badMoonRisingScript(): Script {
  return {
    id: "bmr",
    name: "Bad Moon Rising",
    edition: "bmr",
    source: "official",
    roles: BMR_ALL.slice()
  };
}

export function sectsAndVioletsScript(): Script {
  return {
    id: "snv",
    name: "Sects and Violets",
    edition: "snv",
    source: "official",
    roles: SNV_ALL.slice()
  };
}

export function isSupportedRole(id: RoleId): boolean {
  return SUPPORTED_ROLES.includes(id);
}

function scriptIdFor(name: string, roles: RoleId[]): string {
  const text = name + "|" + roles.join(",");
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return "custom-" + hash.toString(36);
}

const record = (v: unknown): Record<string, unknown> => (
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}
);

function metaOf(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    const entry = value.find((item) => record(item).id === "_meta");
    return record(entry);
  }
  const holder = record(value);
  return record(holder._meta || holder.meta);
}

function collectIds(value: unknown): RoleId[]|null {
  if (Array.isArray(value)) {
    const ids: RoleId[] = [];
    for (const item of value) {
      if (typeof item === "string") ids.push(item);
      else {
        const id = record(item).id;
        if (typeof id === "string" && id !== "_meta") ids.push(id);
      }
    }
    return ids;
  }
  const holder = record(value);
  if (Array.isArray(holder.roles)) return collectIds(holder.roles);
  if (Array.isArray(holder.script)) return collectIds(holder.script);
  if (typeof holder.id === "string" && holder.id !== "_meta") return [holder.id];
  return null;
}

function scriptName(value: unknown, meta: Record<string, unknown>, fallback: string): string {
  const holder = record(value);
  const candidates = [meta.name, holder.name, holder.title, fallback];
  const found = candidates.find((name): name is string => typeof name === "string" && Boolean(name.trim()));
  return found ? found.trim().slice(0, 80) : "Свой сценарий";
}

function scriptAuthor(value: unknown, meta: Record<string, unknown>): string {
  const holder = record(value);
  const candidates = [meta.author, holder.author];
  const found = candidates.find((name): name is string => typeof name === "string" && Boolean(name.trim()));
  return found ? found.trim().slice(0, 80) : "";
}

// Accepts the formats produced by the official script tool and common
// community archives: an array of role objects with an optional _meta entry,
// an array of role ids, or an object with `roles` and `_meta`.
export function parseScript(text: unknown, catalog: Role[] = [], source: string = "file", fallbackName: string = "Свой сценарий"): ParseResult {
  let value;
  if (typeof text === "string") {
    try {
      value = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      return { ok: false, error: "Не удалось прочитать JSON: " + (error instanceof Error ? error.message : String(error)) };
    }
  } else {
    value = text;
  }
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Сценарий должен быть JSON-массивом ролей или объектом с полем roles." };
  }

  const ids = collectIds(value);
  if (!ids || !ids.length) {
    return { ok: false, error: "В сценарии не найдено ни одной роли." };
  }

  const meta = metaOf(value);
  const byId = new Map(catalog.map((role) => [role.id, role]));
  const unknown: RoleId[] = [];
  const unsupported: RoleId[] = [];
  const travellers: RoleId[] = [];
  const roles: RoleId[] = [];
  for (const id of ids) {
    const role = byId.get(id);
    if (!role) {
      if (!unknown.includes(id)) unknown.push(id);
      continue;
    }
    if (role.team === "traveller") {
      if (!travellers.includes(id)) travellers.push(id);
      continue;
    }
    if (!isSupportedRole(id)) {
      if (!unsupported.includes(id)) unsupported.push(id);
      continue;
    }
    if (!roles.includes(id)) roles.push(id);
  }

  const name = scriptName(value, meta, fallbackName);
  if (unknown.length) {
    return { ok: false, error: "Неизвестные роли: " + unknown.join(", ") + ". Проверьте написание идентификаторов." };
  }
  if (unsupported.length) {
    const labels = unsupported.map((id) => {
      const role = (byId.get(id) as Role|undefined);
      return role && role.name ? role.name : id;
    });
    return {
      ok: false,
      error: "Движок поддерживает Trouble Brewing, Bad Moon Rising и Sects and Violets. Не поддерживаются: " + labels.join(", ") + "."
    };
  }
  if (roles.length < 5) {
    return { ok: false, error: "В сценарии должно быть не меньше пяти ролей." };
  }
  const editions = new Set(roles.map((id) => (
    isBmrRole(id) ? "bmr" : isSnvRole(id) ? "snv" : "tb"
  )));
  if (editions.size > 1) {
    return { ok: false, error: "Смешивать роли Trouble Brewing, Bad Moon Rising и Sects and Violets в одном сценарии нельзя." };
  }
  for (const team of ["townsfolk", "minion", "demon"]) {
    if (!roles.some((id) => roleTeam(id) === team)) {
      return {
        ok: false,
        error: "В сценарии нет ни одной роли команды «" + teamLabel(team) + "»."
      };
    }
  }

  return {
    ok: true,
    script: {
      id: scriptIdFor(name, roles),
      name,
      edition: "custom",
      source: SCRIPT_SOURCES.includes(source) ? source : "file",
      author: scriptAuthor(value, meta),
      roles
    },
    travellers
  };
}

function teamLabel(team: string): string {
  return {
    townsfolk: "Горожане",
    outsider: "Изгои",
    minion: "Приспешники",
    demon: "Демоны"
  }[team] || team;
}
