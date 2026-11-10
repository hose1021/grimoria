// One identity per logical action: prepareCommand allocates (or preserves) the
// id, the timestamp and the ruleset version, and computes the fingerprint that
// binds the id to its content.
import type { Clock, IdSource } from "../ports/index.ts";
import type {
  CommandInput,
  CommandType,
  PrepareRejectionCode,
  PrepareResult,
  PreparedCommand
} from "./contracts.ts";
import {
  COMMAND_TYPES,
  describePayloadProblem,
  isPlainObject,
  validatePayload
} from "./contracts.ts";

export interface PreparePorts {
  ids: IdSource;
  clock: Clock;
  /** Stamped on a command that does not declare a version. */
  rulesetVersion: string;
  /** Versions this build accepts; anything else is rejected before state. */
  supportedRulesetVersions: ReadonlySet<string>;
}

function reject(errorCode: PrepareRejectionCode, reason: string): PrepareResult {
  return { ok: false, errorCode, reason };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

/** Canonical content hash input. The field order is fixed, not incidental. */
export function fingerprintOf(
  type: CommandType,
  payload: Record<string, unknown>,
  rulesetVersion: string
): string {
  return JSON.stringify(canonicalize({ type, payload, rulesetVersion }));
}

export function isCommandType(value: unknown): value is CommandType {
  return typeof value === "string" && (COMMAND_TYPES as readonly string[]).includes(value);
}

/** Validates a payload and returns the first problem mapped to a rejection code. */
export function payloadRejection(
  type: CommandType,
  payload: Record<string, unknown>
): { code: PrepareRejectionCode; reason: string } | null {
  const problems = validatePayload(type, payload);
  if (!problems.length) return null;
  const first = problems[0];
  if (!first) return null;
  const code: PrepareRejectionCode = first.reason === "unknown"
    ? "command-payload-unknown-field"
    : first.reason === "missing"
      ? "command-payload"
      : "command-payload-type";
  return { code, reason: describePayloadProblem(type, first) };
}

export function prepareCommand(input: CommandInput, ports: PreparePorts): PrepareResult {
  if (!isPlainObject(input)) return reject("command-unknown", "Command is missing.");

  const type = input.type;
  if (!isCommandType(type)) return reject("command-unknown", `Unknown command: ${String(type)}`);

  const rawPayload: unknown = input.payload;
  if (rawPayload !== undefined && !isPlainObject(rawPayload)) {
    return reject("command-payload", "Command payload is not an object.");
  }
  const payload: Record<string, unknown> = isPlainObject(rawPayload) ? rawPayload : {};
  const payloadProblem = payloadRejection(type, payload);
  if (payloadProblem) return reject(payloadProblem.code, payloadProblem.reason);

  let id: string;
  if (input.id === undefined) {
    const generated = ports.ids.next();
    if (typeof generated !== "string" || !generated.trim()) {
      return reject("command-missing-id", "The id source returned an empty id.");
    }
    id = generated;
  } else if (typeof input.id === "string" && input.id.trim()) {
    id = input.id;
  } else {
    return reject("command-missing-id", "The command id is empty.");
  }

  let at: string;
  if (input.at === undefined) {
    const now = ports.clock.now();
    if (Number.isNaN(now.getTime())) return reject("command-at", "The clock returned an invalid date.");
    at = now.toISOString();
  } else if (typeof input.at === "string" && input.at && !Number.isNaN(Date.parse(input.at))) {
    at = input.at;
  } else {
    return reject("command-at", "The command timestamp is invalid.");
  }

  const declaredVersion: unknown = input.rulesetVersion;
  const rulesetVersion = declaredVersion === undefined ? ports.rulesetVersion : declaredVersion;
  if (typeof rulesetVersion !== "string" || !ports.supportedRulesetVersions.has(rulesetVersion)) {
    return reject(
      "ruleset-version-unsupported",
      `Unsupported ruleset version: ${String(rulesetVersion)}`
    );
  }

  const fingerprint = fingerprintOf(type, payload, rulesetVersion);
  const command = {
    id,
    type,
    payload,
    at,
    rulesetVersion,
    fingerprint
  } as PreparedCommand;
  return { ok: true, command };
}
