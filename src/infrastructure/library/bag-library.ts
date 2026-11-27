// Named script pools and exact bag selections. This is a side library, not
// game state: one key, no game rules, no undo history. The bag screen validates
// everything before it applies a stored entry.
import { isGoodRole, isSupportedRole } from "../../core/model/rules.ts";
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
  lunaticShownExplicit?: boolean;
  lunaticBluffs?: RoleId[];
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
  lunaticShownExplicit?: unknown;
  lunaticBluffs?: unknown;
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
      .filter((entry) => entry.roles.length >= 5),
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
        lunaticShownExplicit:
          typeof entry.lunaticShownExplicit === "boolean"
            ? entry.lunaticShownExplicit
            : isRoleId(entry.lunaticShownId),
        ...(entry.lunaticBluffs === undefined
          ? {}
          : { lunaticBluffs: ids(entry.lunaticBluffs).filter(isGoodRole).slice(0, 3) }),
        godfatherOutsider: entry.godfatherOutsider === -1 ? -1 : 1,
        evilTwinGoodId: isSupportedRole(entry.evilTwinGoodId) ? entry.evilTwinGoodId : null,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : stamp(),
      }))
      .filter((entry) => entry.roles.length >= 5 && entry.roles.length <= 15),
  };
}

function exceedsCapacity(library: Library): boolean {
  return library.bags.length > MAX_ENTRIES || library.pools.length > MAX_ENTRIES;
}

// Retain generated identifiers for a legacy library while its bytes are unchanged.
const readBytes = new WeakMap<Library, string>();
const damagedReads = new WeakMap<Library, { raw: string; backupKey?: string }>();
export function readLibrary(base?: Library): LibraryRead {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LIBRARY_KEY);
    if (raw === null) return { ok: true, library: emptyLibrary() };
    if (base && damagedReads.get(base)?.raw === raw)
      return { ok: false, library: base, error: "damaged" };
    if (base && readBytes.get(base) === raw) return { ok: true, library: base };
    const library = normalizeLibrary(JSON.parse(raw));
    readBytes.set(library, raw);
    return { ok: true, library };
  } catch (error) {
    if (raw !== null) {
      const library = emptyLibrary();
      damagedReads.set(library, { raw });
      return { ok: false, library, error: "damaged" };
    }
    return { ok: false, library: emptyLibrary(), error: (error as Error).message };
  }
}

export function writeLibrary(library: unknown): LibraryWrite {
  try {
    const next = normalizeLibrary(library);
    if (exceedsCapacity(next)) return { ok: false, error: "capacity" };
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export type LibraryEdit =
  | { type: "saveBag"; entry: BagEntry; expected?: Bag }
  | { type: "savePool"; entry: PoolEntry; expected?: Pool }
  | { type: "removeBag" | "removePool"; id: string }
  | { type: "replace"; library: Library; signal?: AbortSignal };
type EditResult = LibraryRead & { id?: string };

function commitEdit(base: Library, edit: LibraryEdit): EditResult {
  if (edit.type === "replace" && edit.signal?.aborted)
    return { ok: false, library: base, error: "cancelled" };
  const disk = readLibrary(base);
  const current = disk.library;
  const conflict = { ok: false, library: current, error: "conflict" } as const;
  const damage = damagedReads.get(base);
  if (damage && current !== base) return disk.ok || damagedReads.has(current) ? conflict : disk;
  if (!disk.ok) {
    // Only an explicit restore may replace the same damaged bytes the host saw.
    // Keep the recovery copy if writing the replacement has to be retried.
    if (edit.type !== "replace" || !damage) return disk;
    try {
      if (!damage.backupKey || localStorage.getItem(damage.backupKey) !== damage.raw) {
        const key = LIBRARY_KEY + ".broken." + newId();
        localStorage.setItem(key, damage.raw);
        damage.backupKey = key;
      }
    } catch {
      return { ok: false, library: current, error: "backup-failed" };
    }
  }
  let next: Library;
  let savedId: string | undefined;
  if (edit.type === "replace") {
    if (JSON.stringify(base) !== JSON.stringify(current)) return conflict;
    next = edit.library;
  } else {
    const kind = edit.type === "saveBag" || edit.type === "removeBag" ? "bags" : "pools";
    const id = "entry" in edit ? edit.entry.id : edit.id;
    const previous =
      ("expected" in edit ? edit.expected : undefined) ?? base[kind].find((item) => item.id === id);
    const stored = current[kind].find((item) => item.id === id);
    if (JSON.stringify(previous) !== JSON.stringify(stored)) return conflict;
    if (
      "entry" in edit &&
      current[kind].some(
        (item) =>
          item.id !== id &&
          item.name === text(edit.entry.name) &&
          !base[kind].some((old) => old.id === item.id && old.name === item.name),
      )
    )
      return conflict;
    switch (edit.type) {
      case "saveBag": {
        const result = upsertBag(current, edit.entry);
        if (!result.ok) return { ...result, library: current };
        next = result.library;
        savedId = result.bag.id;
        break;
      }
      case "savePool": {
        const result = upsertPool(current, edit.entry);
        if (!result.ok) return { ...result, library: current };
        next = result.library;
        savedId = result.pool.id;
        break;
      }
      case "removeBag":
        next = removeBag(current, edit.id).library;
        break;
      case "removePool":
        next = removePool(current, edit.id).library;
        break;
    }
  }
  const saved = writeLibrary(next);
  if (!saved.ok) return { ...saved, library: current };
  return { ok: true, library: next, ...(savedId ? { id: savedId } : {}) };
}

// Older and insecure contexts can lack Web Locks. Each writer advertises its
// own short-lived intent. A contender reports a retryable conflict before it
// writes the shared document. A crashed tab cannot block later visits forever.
async function withStorageIntent(base: Library, commit: () => EditResult): Promise<EditResult> {
  const prefix = LIBRARY_KEY + ".writer.";
  const mine = prefix + newId();
  try {
    const expires = Date.now() + 15_000;
    localStorage.setItem(mine, String(expires));
    // Publish this writer in a separate task before checking competing windows.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const now = Date.now();
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    const busy = keys.some(
      (key) =>
        key !== null &&
        key.startsWith(prefix) &&
        key !== mine &&
        Number(localStorage.getItem(key)) > now,
    );
    if (busy || now >= expires || localStorage.getItem(mine) !== String(expires)) {
      return { ok: false, library: base, error: "busy" };
    }
    for (const key of keys) {
      if (key && key.startsWith(prefix) && key !== mine && Number(localStorage.getItem(key)) <= now)
        localStorage.removeItem(key);
    }
    return commit();
  } catch (error) {
    return {
      ok: false,
      library: base,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      localStorage.removeItem(mine);
    } catch {
      /* A denied store cannot remove an intent. */
    }
  }
}

export async function editLibrary(base: Library, edit: LibraryEdit): Promise<EditResult> {
  const commit = () => commitEdit(base, edit);
  try {
    if (globalThis.navigator?.locks) {
      return await navigator.locks.request(LIBRARY_KEY, () => withStorageIntent(base, commit));
    }
  } catch {
    /* A denied lock manager uses the same fallback as an unavailable one. */
  }
  return withStorageIntent(base, commit);
}

export function upsertPool(library: unknown, entry: PoolEntry): PoolSave {
  const next = normalizeLibrary(library);
  const name = text(entry.name);
  if (!name) return { ok: false, error: "name" };
  const roles = ids(entry.roles);
  if (roles.length < 5) return { ok: false, error: "roles" };
  const id = typeof entry.id === "string" && entry.id ? entry.id : newId("pool");
  const index = next.pools.findIndex((pool) => pool.id === id);
  if (index === -1 && next.pools.length >= MAX_ENTRIES) return { ok: false, error: "capacity" };
  const record: Pool = { id, name, roles, updatedAt: stamp() };
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
  const index = next.bags.findIndex((bag) => bag.id === id);
  if (index === -1 && next.bags.length >= MAX_ENTRIES) return { ok: false, error: "capacity" };
  const record: Bag = {
    id,
    name,
    scriptId: typeof entry.scriptId === "string" ? entry.scriptId : "custom",
    pool: ids(entry.pool),
    roles,
    bluffs: ids(entry.bluffs).slice(0, 3),
    drunkShownId: isRoleId(entry.drunkShownId) ? entry.drunkShownId : null,
    lunaticShownId: isRoleId(entry.lunaticShownId) ? entry.lunaticShownId : null,
    lunaticShownExplicit:
      typeof entry.lunaticShownExplicit === "boolean"
        ? entry.lunaticShownExplicit
        : isRoleId(entry.lunaticShownId),
    ...(entry.lunaticBluffs === undefined
      ? {}
      : { lunaticBluffs: ids(entry.lunaticBluffs).filter(isGoodRole).slice(0, 3) }),
    godfatherOutsider: entry.godfatherOutsider === -1 ? -1 : 1,
    evilTwinGoodId: isRoleId(entry.evilTwinGoodId) ? entry.evilTwinGoodId : null,
    updatedAt: stamp(),
  };
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
  if (exceedsCapacity(library)) return { ok: false, error: "capacity" };
  if (!library.pools.length && !library.bags.length) {
    return { ok: false, error: "empty" };
  }
  return { ok: true, library };
}
