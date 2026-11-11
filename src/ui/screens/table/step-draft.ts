// The untouched draft of the current night step, kept in the preference
// keyspace so a reload restores the same step with its chosen targets and
// answers. It is a recovery aid, never part of the saved game.
import type { StepInfo } from "./helpers.ts";

export const STEP_DRAFT_KEY = "pg.stepDraft";

export interface StepDraft {
  /** `createdAt:night:stepKey`; a foreign record is inert. */
  key: string;
  targets: string[];
  redirect: string | null;
  registrations: Record<string, string>;
  given: StepInfo | null;
  bmrDeaths: string[];
  bmrResurrect: string | null;
  bmrRoles: string | null;
  bmrDrunk: string | null;
}

export type StepDraftReader = (key: string) => string | null;
export type StepDraftWriter = (key: string, value: string) => void;

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRegistrations(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

// The restored value reaches `dialogs.tsx` and `helpers.ts`, which call
// `bluffs.map` and `pair.map`; a wrong-typed field must never get there.
function isGiven(value: unknown): value is StepInfo | null {
  if (value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const info = value as Record<string, unknown>;
  if (typeof info.kind !== "string" || info.kind.length === 0) return false;
  if (info.value !== undefined && info.value !== null && typeof info.value === "object") {
    return false;
  }
  if (info.roleId !== undefined && !isNullableString(info.roleId)) return false;
  if (info.demonId !== undefined && !isNullableString(info.demonId)) return false;
  if (info.playerId !== undefined && !isNullableString(info.playerId)) return false;
  if (info.text !== undefined && typeof info.text !== "string") return false;
  for (const key of ["impaired", "needsChoice", "missing", "zero"]) {
    if (info[key] !== undefined && typeof info[key] !== "boolean") return false;
  }
  if (info.matchIndex !== undefined && typeof info.matchIndex !== "number") return false;
  if (info.pair !== undefined && !isStringList(info.pair)) return false;
  if (info.bluffs !== undefined && !isStringList(info.bluffs)) return false;
  if (info.options !== undefined && !Array.isArray(info.options)) return false;
  return true;
}

export function serializeStepDraft(draft: StepDraft): string {
  return JSON.stringify(draft);
}

/** A stored value is an untyped boundary; anything unexpected is ignored. */
export function parseStepDraft(raw: string | null): StepDraft | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.key !== "string" || record.key.length === 0) return null;
  if (!isStringList(record.targets) || !isStringList(record.bmrDeaths)) return null;
  if (
    !isNullableString(record.redirect) ||
    !isNullableString(record.bmrResurrect) ||
    !isNullableString(record.bmrRoles) ||
    !isNullableString(record.bmrDrunk)
  ) {
    return null;
  }
  if (!isRegistrations(record.registrations) || !isGiven(record.given)) return null;
  return {
    key: record.key,
    targets: record.targets,
    redirect: record.redirect,
    registrations: record.registrations,
    given: record.given,
    bmrDeaths: record.bmrDeaths,
    bmrResurrect: record.bmrResurrect,
    bmrRoles: record.bmrRoles,
    bmrDrunk: record.bmrDrunk,
  };
}

/** The stored record, or only the one belonging to `draftKey` when given. */
export function readStepDraft(read: StepDraftReader, draftKey?: string): StepDraft | null {
  const draft = parseStepDraft(read(STEP_DRAFT_KEY));
  if (!draft) return null;
  return draftKey === undefined || draft.key === draftKey ? draft : null;
}

/** Persists the current draft; `null` clears the record. */
export function writeStepDraft(write: StepDraftWriter, draft: StepDraft | null): void {
  write(STEP_DRAFT_KEY, draft ? serializeStepDraft(draft) : "");
}

/** The console map holding exactly the restored value, or an empty one. */
export function restoredMap<T>(
  restored: StepDraft | null,
  value: T | null | undefined,
): Map<string, T> {
  if (!restored || value === null || value === undefined) return new Map();
  if (typeof value === "object" && Object.keys(value).length === 0) return new Map();
  return new Map([[restored.key, value]]);
}
