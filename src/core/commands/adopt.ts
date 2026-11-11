// Validates a prepared command that arrives as data (JSON, storage, a test).
// The type alone is never trusted: the envelope and its fingerprint are checked.
import type { PrepareResult, PreparedCommand } from "./contracts.ts";
import { COMMAND_TYPES, type CommandType } from "./contracts.ts";
import { fingerprintOf, isCommandType, payloadRejection } from "./prepare.ts";
import { isPlainObject } from "./contracts.ts";

export interface AdoptPorts {
  supportedRulesetVersions: ReadonlySet<string>;
}

function reject(
  errorCode: Extract<PrepareResult, { ok: false }>["errorCode"],
  reason: string,
): PrepareResult {
  return { ok: false, errorCode, reason };
}

export function adoptPrepared(value: unknown, ports: AdoptPorts): PrepareResult {
  if (!isPlainObject(value)) return reject("command-unknown", "Command is missing.");

  const type: unknown = value.type;
  if (!isCommandType(type)) return reject("command-unknown", `Unknown command: ${String(type)}`);

  const id: unknown = value.id;
  if (typeof id !== "string" || !id.trim()) {
    return reject("command-missing-id", "The command id is missing or empty.");
  }

  const at: unknown = value.at;
  if (typeof at !== "string" || !at || Number.isNaN(Date.parse(at))) {
    return reject("command-at", "The command timestamp is invalid.");
  }

  const version: unknown = value.rulesetVersion;
  if (typeof version !== "string" || !ports.supportedRulesetVersions.has(version)) {
    return reject("ruleset-version-unsupported", `Unsupported ruleset version: ${String(version)}`);
  }

  const payload: unknown = value.payload;
  if (!isPlainObject(payload))
    return reject("command-payload", "Command payload is not an object.");
  const payloadProblem = payloadRejection(type, payload);
  if (payloadProblem) return reject(payloadProblem.code, payloadProblem.reason);

  const fingerprint = fingerprintOf(type, payload, version);
  if (value.fingerprint !== fingerprint) {
    return reject("command-fingerprint", "The command fingerprint does not match its content.");
  }

  const command = {
    id,
    type: type as CommandType,
    payload,
    at,
    rulesetVersion: version,
    fingerprint,
  } as PreparedCommand;
  return { ok: true, command };
}

export const SUPPORTED_COMMAND_TYPES: readonly CommandType[] = COMMAND_TYPES;
