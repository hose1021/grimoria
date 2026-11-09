// Named script pools and exact bag selections. This is a side library, not
// game state: one key, no game rules, no undo history. The bag screen validates
// everything before it applies a stored entry.
import { isSupportedRole } from "./rules.js";

export const LIBRARY_KEY = "pg.library.v1";
export const LIBRARY_FORMAT = "pocket-grimoire-library";
export const LIBRARY_VERSION = 1;

const MAX_NAME = 80;
const MAX_ENTRIES = 200;

function text(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_NAME) : "";
}

function ids(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === "string" && isSupportedRole(id)))];
}

function stamp() {
  return new Date().toISOString();
}

export function newId(prefix = "item") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return prefix + "-" + crypto.randomUUID();
  }
  return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
}

export function emptyLibrary() {
  return { pools: [], bags: [] };
}

export function normalizeLibrary(value) {
  if (!value || typeof value !== "object") return emptyLibrary();
  const pools = Array.isArray(value.pools) ? value.pools : [];
  const bags = Array.isArray(value.bags) ? value.bags : [];
  return {
    pools: pools
      .filter((entry) => entry && typeof entry === "object" && text(entry.name))
      .map((entry) => ({
        id: typeof entry.id === "string" && entry.id ? entry.id : newId("pool"),
        name: text(entry.name),
        roles: ids(entry.roles),
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : stamp()
      }))
      .filter((entry) => entry.roles.length >= 5)
      .slice(0, MAX_ENTRIES),
    bags: bags
      .filter((entry) => entry && typeof entry === "object" && text(entry.name))
      .map((entry) => ({
        id: typeof entry.id === "string" && entry.id ? entry.id : newId("bag"),
        name: text(entry.name),
        scriptId: typeof entry.scriptId === "string" ? entry.scriptId : "custom",
        pool: ids(entry.pool),
        roles: ids(entry.roles),
        bluffs: ids(entry.bluffs),
        drunkShownId: isSupportedRole(entry.drunkShownId) ? entry.drunkShownId : null,
        lunaticShownId: isSupportedRole(entry.lunaticShownId) ? entry.lunaticShownId : null,
        godfatherOutsider: entry.godfatherOutsider === -1 ? -1 : 1,
        evilTwinGoodId: isSupportedRole(entry.evilTwinGoodId) ? entry.evilTwinGoodId : null,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : stamp()
      }))
      .filter((entry) => entry.roles.length >= 5 && entry.roles.length <= 15)
      .slice(0, MAX_ENTRIES)
  };
}

export function readLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return { ok: true, library: emptyLibrary() };
    const parsed = JSON.parse(raw);
    return { ok: true, library: normalizeLibrary(parsed) };
  } catch (error) {
    return { ok: false, library: emptyLibrary(), error: error.message };
  }
}

export function writeLibrary(library) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(normalizeLibrary(library)));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export function upsertPool(library, entry) {
  const next = normalizeLibrary(library);
  const name = text(entry && entry.name);
  if (!name) return { ok: false, error: "name" };
  const roles = ids(entry && entry.roles);
  if (roles.length < 5) return { ok: false, error: "roles" };
  const id = (entry && entry.id) || newId("pool");
  const record = { id, name, roles, updatedAt: stamp() };
  const index = next.pools.findIndex((pool) => pool.id === id);
  if (index === -1) next.pools.unshift(record);
  else next.pools[index] = record;
  return { ok: true, library: next, pool: record };
}

export function removePool(library, id) {
  const next = normalizeLibrary(library);
  next.pools = next.pools.filter((pool) => pool.id !== id);
  return { ok: true, library: next };
}

export function upsertBag(library, entry) {
  const next = normalizeLibrary(library);
  const name = text(entry && entry.name);
  if (!name) return { ok: false, error: "name" };
  const roles = ids(entry && entry.roles);
  if (roles.length < 5 || roles.length > 15) return { ok: false, error: "roles" };
  const id = (entry && entry.id) || newId("bag");
  const record = {
    id,
    name,
    scriptId: typeof entry.scriptId === "string" ? entry.scriptId : "custom",
    pool: ids(entry.pool),
    roles,
    bluffs: ids(entry.bluffs).slice(0, 3),
    drunkShownId: isSupportedRole(entry.drunkShownId) ? entry.drunkShownId : null,
    lunaticShownId: isSupportedRole(entry.lunaticShownId) ? entry.lunaticShownId : null,
    godfatherOutsider: entry.godfatherOutsider === -1 ? -1 : 1,
    evilTwinGoodId: isSupportedRole(entry.evilTwinGoodId) ? entry.evilTwinGoodId : null,
    updatedAt: stamp()
  };
  const index = next.bags.findIndex((bag) => bag.id === id);
  if (index === -1) next.bags.unshift(record);
  else next.bags[index] = record;
  return { ok: true, library: next, bag: record };
}

export function removeBag(library, id) {
  const next = normalizeLibrary(library);
  next.bags = next.bags.filter((bag) => bag.id !== id);
  return { ok: true, library: next };
}

export function exportLibrary(library) {
  const clean = normalizeLibrary(library);
  return JSON.stringify({
    format: LIBRARY_FORMAT,
    version: LIBRARY_VERSION,
    pools: clean.pools,
    bags: clean.bags
  }, null, 2);
}

export function parseLibrary(input) {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch (error) {
      return { ok: false, error: "json" };
    }
  }
  if (!value || typeof value !== "object" || value.format !== LIBRARY_FORMAT) {
    return { ok: false, error: "format" };
  }
  const library = normalizeLibrary(value);
  if (!library.pools.length && !library.bags.length) {
    return { ok: false, error: "empty" };
  }
  return { ok: true, library };
}
