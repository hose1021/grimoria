// Named script pools and exact bag selections. This is a side library, not
// game state: one key, no game rules, no undo history. The bag screen validates
// everything before it applies a stored entry.
import { isSupportedRole } from "../../core/model/rules.ts";
import type { RoleId } from "../../core/model/types.ts";

export type Pool = { id: string; name: string; roles: RoleId[]; updatedAt: string };
export type Bag = {
  id: string;
  name: string;
  scriptId: string;
  pool: RoleId[];
  roles: RoleId[];
  bluffs: RoleId[];
  drunkShownId: RoleId | null;
  lunaticShownId: RoleId | null;
  godfatherOutsider: 1 | -1;
  evilTwinGoodId: RoleId | null;
  updatedAt: string;
};
export type Library = { pools: Pool[]; bags: Bag[] };
export type LibraryRead =
  | { ok: true; library: Library }
  | { ok: false; library: Library; error: string };
export type LibraryWrite = { ok: true } | { ok: false; error: string };
export type PoolSave = { ok: true; library: Library; pool: Pool } | { ok: false; error: string };
export type BagSave = { ok: true; library: Library; bag: Bag } | { ok: false; error: string };
export type LibraryUpdate = { ok: true; library: Library };
export type LibraryParse = { ok: true; library: Library } | { ok: false; error: string };

// Untrusted input: localStorage payloads and imported files. Every field is
// checked one by one below, so the record stays loose on purpose.
type Input = Record<string, unknown>;

export type PoolEntry = { id?: unknown; name?: unknown; roles?: unknown };

export type BagEntry = {
  id?: unknown;
  name?: unknown;
  scriptId?: unknown;
  pool?: unknown;
  roles?: unknown;
  bluffs?: unknown;
  drunkShownId?: unknown;
  lunaticShownId?: unknown;
  godfatherOutsider?: unknown;
  evilTwinGoodId?: unknown;
};

export const LIBRARY_KEY = "pg.library.v1";
export const LIBRARY_FORMAT = "pocket-grimoire-library";
export const LIBRARY_VERSION = 1;

const MAX_NAME = 80;
const MAX_ENTRIES = 200;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_NAME) : "";
}

function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && isSupportedRole(value);
}

function ids(value: unknown): RoleId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isRoleId))];
}

function stamp(): string {
  return new Date().toISOString();
}

export function newId(prefix = "item"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return prefix + "-" + crypto.randomUUID();
  }
  return (
    prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36)
  );
}

export function emptyLibrary(): Library {
  return { pools: [], bags: [] };
}

export function normalizeLibrary(value: unknown): Library {
  if (!value || typeof value !== "object") return emptyLibrary();
  const input = value as Input;
  const pools = Array.isArray(input.pools) ? input.pools : [];
  const bags = Array.isArray(input.bags) ? input.bags : [];
  return {
    pools: pools
      .filter((entry) => entry && typeof entry === "object" && text(entry.name))
      .map((entry): Pool => ({
        id: typeof entry.id === "string" && entry.id ? entry.id : newId("pool"),
        name: text(entry.name),
        roles: ids(entry.roles),
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : stamp(),
      }))
      .filter((entry) => entry.roles.length >= 5)
      .slice(0, MAX_ENTRIES),
    bags: bags
      .filter((entry) => entry && typeof entry === "object" && text(entry.name))
      .map((entry): Bag => ({
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
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : stamp(),
      }))
      .filter((entry) => entry.roles.length >= 5 && entry.roles.length <= 15)
      .slice(0, MAX_ENTRIES),
  };
}

export function readLibrary(): LibraryRead {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return { ok: true, library: emptyLibrary() };
    const parsed = JSON.parse(raw);
    return { ok: true, library: normalizeLibrary(parsed) };
  } catch (error) {
    return { ok: false, library: emptyLibrary(), error: (error as Error).message };
  }
}

export function writeLibrary(library: unknown): LibraryWrite {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(normalizeLibrary(library)));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function upsertPool(library: unknown, entry: PoolEntry): PoolSave {
  const next = normalizeLibrary(library);
  const name = text(entry.name);
  if (!name) return { ok: false, error: "name" };
  const roles = ids(entry.roles);
  if (roles.length < 5) return { ok: false, error: "roles" };
  const id = typeof entry.id === "string" && entry.id ? entry.id : newId("pool");
  const record: Pool = { id, name, roles, updatedAt: stamp() };
  const index = next.pools.findIndex((pool) => pool.id === id);
  if (index === -1) next.pools.unshift(record);
  else next.pools[index] = record;
  return { ok: true, library: next, pool: record };
}

export function removePool(library: unknown, id: RoleId): LibraryUpdate {
  const next = normalizeLibrary(library);
  next.pools = next.pools.filter((pool) => pool.id !== id);
  return { ok: true, library: next };
}

export function upsertBag(library: unknown, entry: BagEntry): BagSave {
  const next = normalizeLibrary(library);
  const name = text(entry.name);
  if (!name) return { ok: false, error: "name" };
  const roles = ids(entry.roles);
  if (roles.length < 5 || roles.length > 15) return { ok: false, error: "roles" };
  const id = typeof entry.id === "string" && entry.id ? entry.id : newId("bag");
  const record: Bag = {
    id,
    name,
    scriptId: typeof entry.scriptId === "string" ? entry.scriptId : "custom",
    pool: ids(entry.pool),
    roles,
    bluffs: ids(entry.bluffs).slice(0, 3),
    drunkShownId: isRoleId(entry.drunkShownId) ? entry.drunkShownId : null,
    lunaticShownId: isRoleId(entry.lunaticShownId) ? entry.lunaticShownId : null,
    godfatherOutsider: entry.godfatherOutsider === -1 ? -1 : 1,
    evilTwinGoodId: isRoleId(entry.evilTwinGoodId) ? entry.evilTwinGoodId : null,
    updatedAt: stamp(),
  };
  const index = next.bags.findIndex((bag) => bag.id === id);
  if (index === -1) next.bags.unshift(record);
  else next.bags[index] = record;
  return { ok: true, library: next, bag: record };
}

export function removeBag(library: unknown, id: RoleId): LibraryUpdate {
  const next = normalizeLibrary(library);
  next.bags = next.bags.filter((bag) => bag.id !== id);
  return { ok: true, library: next };
}

export function exportLibrary(library: unknown): string {
  const clean = normalizeLibrary(library);
  return JSON.stringify(
    {
      format: LIBRARY_FORMAT,
      version: LIBRARY_VERSION,
      pools: clean.pools,
      bags: clean.bags,
    },
    null,
    2,
  );
}

export function parseLibrary(input: unknown): LibraryParse {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: "json" };
    }
  }
  if (!value || typeof value !== "object" || (value as Input).format !== LIBRARY_FORMAT) {
    return { ok: false, error: "format" };
  }
  const library = normalizeLibrary(value);
  if (!library.pools.length && !library.bags.length) {
    return { ok: false, error: "empty" };
  }
  return { ok: true, library };
}
