// Scenario (script) definitions and Blood on the Clocktower script import.
// Pure data and parsing: no DOM, no storage, no window access.
import { ALL_ROLES, BMR_ALL, SNV_ALL, SUPPORTED_ROLES, isBmrRole, isSnvRole, roleTeam } from "./rules.js";

// Official scripts known to the picker. All three core scenarios have a rules
// implementation; Sects and Violets is host-adjudicated like Bad Moon Rising.
export const OFFICIAL_SCRIPTS = [
  { id: "tb", name: "Trouble Brewing", edition: "tb", supported: true, roleCount: ALL_ROLES.length },
  { id: "bmr", name: "Bad Moon Rising", edition: "bmr", supported: true, roleCount: BMR_ALL.length },
  { id: "snv", name: "Sects and Violets", edition: "snv", supported: true, roleCount: SNV_ALL.length }
];

export const SCRIPT_SOURCES = ["official", "file", "url", "clipboard", "text"];

export function troubleBrewingScript() {
  return {
    id: "tb",
    name: "Trouble Brewing",
    edition: "tb",
    source: "official",
    roles: ALL_ROLES.slice()
  };
}

export function badMoonRisingScript() {
  return {
    id: "bmr",
    name: "Bad Moon Rising",
    edition: "bmr",
    source: "official",
    roles: BMR_ALL.slice()
  };
}

export function sectsAndVioletsScript() {
  return {
    id: "snv",
    name: "Sects and Violets",
    edition: "snv",
    source: "official",
    roles: SNV_ALL.slice()
  };
}

export function isSupportedRole(id) {
  return SUPPORTED_ROLES.includes(id);
}

function scriptIdFor(name, roles) {
  const text = name + "|" + roles.join(",");
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return "custom-" + hash.toString(36);
}

function metaOf(value) {
  if (Array.isArray(value)) {
    const entry = value.find((item) => item && typeof item === "object" && item.id === "_meta");
    return entry && typeof entry === "object" ? entry : {};
  }
  if (!value || typeof value !== "object") return {};
  const meta = value._meta || value.meta;
  return meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
}

function collectIds(value) {
  if (Array.isArray(value)) {
    const ids = [];
    for (const item of value) {
      if (typeof item === "string") ids.push(item);
      else if (item && typeof item === "object" && typeof item.id === "string" && item.id !== "_meta") {
        ids.push(item.id);
      }
    }
    return ids;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.roles)) return collectIds(value.roles);
    if (Array.isArray(value.script)) return collectIds(value.script);
    if (typeof value.id === "string" && value.id !== "_meta") return [value.id];
  }
  return null;
}

function scriptName(value, meta, fallback) {
  const candidates = [meta.name, value && value.name, value && value.title, fallback];
  const found = candidates.find((name) => typeof name === "string" && name.trim());
  return found ? found.trim().slice(0, 80) : "Свой сценарий";
}

function scriptAuthor(value, meta) {
  const candidates = [meta.author, value && value.author];
  const found = candidates.find((name) => typeof name === "string" && name.trim());
  return found ? found.trim().slice(0, 80) : "";
}

// Accepts the formats produced by the official script tool and common
// community archives: an array of role objects with an optional _meta entry,
// an array of role ids, or an object with `roles` and `_meta`.
export function parseScript(text, catalog = [], source = "file", fallbackName = "Свой сценарий") {
  let value;
  if (typeof text === "string") {
    try {
      value = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      return { ok: false, error: "Не удалось прочитать JSON: " + error.message };
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
  const unknown = [];
  const unsupported = [];
  const travellers = [];
  const roles = [];
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
    const labels = unsupported.map((id) => (byId.get(id) || {}).name || id);
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

function teamLabel(team) {
  return {
    townsfolk: "Горожане",
    outsider: "Изгои",
    minion: "Приспешники",
    demon: "Демоны"
  }[team] || team;
}
