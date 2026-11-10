import test from "node:test";
import assert from "node:assert/strict";
import type { CommandInput } from "./contracts.ts";
import { adoptPrepared } from "./adopt.ts";
import { prepareCommand } from "./prepare.ts";
import type { PreparePorts } from "./prepare.ts";

const VERSION = "tb-bmr-snv-2026-11-10";
const AT = "2026-11-11T10:00:00.000Z";

function makePorts(overrides: Partial<PreparePorts> = {}): PreparePorts {
  let count = 0;
  return {
    ids: { next: (prefix = "cmd") => `${prefix}-${++count}` },
    clock: { now: () => new Date(AT) },
    rulesetVersion: VERSION,
    supportedRulesetVersions: new Set([VERSION]),
    ...overrides
  };
}

interface VotesInput {
  type: "recordVotes";
  payload: { nominationId: string; voterIds: string[] };
  id?: string;
}

function votes(id?: string): VotesInput {
  const input: VotesInput = {
    type: "recordVotes",
    payload: { nominationId: "nom-1", voterIds: ["1", "2"] }
  };
  if (id !== undefined) input.id = id;
  return input;
}

test("prepareCommand allocates one identity for one logical action", () => {
  const ports = makePorts();
  const first = prepareCommand(votes(), ports);
  const second = prepareCommand(votes(), ports);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  assert.notEqual(first.command.id, second.command.id);
  assert.equal(first.command.at, AT);
  assert.equal(first.command.rulesetVersion, VERSION);
  assert.match(first.command.fingerprint, /"type":"recordVotes"/);
  assert.deepEqual(first.command.payload, { nominationId: "nom-1", voterIds: ["1", "2"] });
});

test("prepareCommand preserves a supplied id, timestamp and ruleset version", () => {
  const result = prepareCommand(
    { ...votes("legacy-id"), at: "2026-01-02T03:04:05.000Z", rulesetVersion: VERSION },
    makePorts()
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.command.id, "legacy-id");
  assert.equal(result.command.at, "2026-01-02T03:04:05.000Z");
  assert.equal(result.command.rulesetVersion, VERSION);
});

test("prepareCommand rejects an unknown command type", () => {
  const input: unknown = { type: "notACommand", payload: {} };
  const result = prepareCommand(input as CommandInput, makePorts());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errorCode, "command-unknown");
});

test("prepareCommand rejects an empty id", () => {
  const result = prepareCommand(votes("  "), makePorts());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errorCode, "command-missing-id");
});

test("prepareCommand rejects a payload field the handler does not read", () => {
  const input: unknown = { type: "recordVotes", payload: { nominationId: "nom-1", votes: ["1"] } };
  const result = prepareCommand(input as CommandInput, makePorts());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errorCode, "command-payload-unknown-field");
  assert.match(result.reason, /'votes'/);
});

test("prepareCommand rejects a missing required field", () => {
  const input: unknown = { type: "recordVotes", payload: { nominationId: "nom-1" } };
  const result = prepareCommand(input as CommandInput, makePorts());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errorCode, "command-payload");
  assert.match(result.reason, /voterIds/);
});

test("prepareCommand rejects an unsupported ruleset version before state is read", () => {
  const result = prepareCommand({ ...votes(), rulesetVersion: "tb-2019-01-01" }, makePorts());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errorCode, "ruleset-version-unsupported");
});

test("prepareCommand rejects an invalid timestamp", () => {
  const result = prepareCommand({ ...votes(), at: "not-a-date" }, makePorts());
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errorCode, "command-at");
});

test("the fingerprint covers the payload and the ruleset version", () => {
  const ports = makePorts();
  const base = prepareCommand(votes("same-id"), ports);
  const other = prepareCommand(
    { type: "recordVotes", id: "same-id", payload: { nominationId: "nom-1", voterIds: ["3"] } },
    ports
  );
  assert.equal(base.ok, true);
  assert.equal(other.ok, true);
  if (!base.ok || !other.ok) return;
  assert.notEqual(base.command.fingerprint, other.command.fingerprint);
});

test("adoptPrepared accepts a prepared envelope and keeps its identity", () => {
  const prepared = prepareCommand(votes("external-id"), makePorts());
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const adopted = adoptPrepared(prepared.command, {
    supportedRulesetVersions: new Set([VERSION])
  });
  assert.equal(adopted.ok, true);
  if (!adopted.ok) return;
  assert.equal(adopted.command.id, "external-id");
  assert.equal(adopted.command.fingerprint, prepared.command.fingerprint);
});

test("adoptPrepared rejects a fingerprint that does not match the content", () => {
  const prepared = prepareCommand(votes("external-id"), makePorts());
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const forged = {
    id: prepared.command.id,
    type: prepared.command.type,
    payload: { nominationId: "nom-2", voterIds: ["1"] },
    at: prepared.command.at,
    rulesetVersion: prepared.command.rulesetVersion,
    fingerprint: prepared.command.fingerprint
  };
  const adopted = adoptPrepared(forged, { supportedRulesetVersions: new Set([VERSION]) });
  assert.equal(adopted.ok, false);
  if (adopted.ok) return;
  assert.equal(adopted.errorCode, "command-fingerprint");
});

test("adoptPrepared rejects an extra payload field", () => {
  const prepared = prepareCommand(votes("external-id"), makePorts());
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const forged = {
    id: prepared.command.id,
    type: prepared.command.type,
    payload: { nominationId: "n", voterIds: ["1"], extra: true },
    at: prepared.command.at,
    rulesetVersion: prepared.command.rulesetVersion,
    fingerprint: prepared.command.fingerprint
  };
  const adopted = adoptPrepared(forged, { supportedRulesetVersions: new Set([VERSION]) });
  assert.equal(adopted.ok, false);
  if (adopted.ok) return;
  assert.equal(adopted.errorCode, "command-payload-unknown-field");
});

test("adoptPrepared rejects an unsupported ruleset version", () => {
  const adopted = adoptPrepared(
    {
      id: "cmd-1",
      type: "startNight",
      payload: {},
      at: AT,
      rulesetVersion: "old",
      fingerprint: "{}"
    },
    { supportedRulesetVersions: new Set([VERSION]) }
  );
  assert.equal(adopted.ok, false);
  if (adopted.ok) return;
  assert.equal(adopted.errorCode, "ruleset-version-unsupported");
});
