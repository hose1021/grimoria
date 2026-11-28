import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { canonicalize, fingerprintOf, identityOf } from "../src/core/engine/command-state.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const FIXTURE_DIR = join(ROOT, "src/core/engine/fixtures");
const WIRE = JSON.parse(
  readFileSync(join(ROOT, "fixtures/conformance/wire-serialization.json"), "utf8"),
) as { vectors: { id: string; input: string; wire: string }[] };
const LEGACY = JSON.parse(
  readFileSync(join(ROOT, "fixtures/conformance/wire-legacy-vectors.json"), "utf8"),
) as { vectors: { id: string; input: string; expected: string }[] };

test("every wire vector equals ECMAScript JSON.stringify", () => {
  for (const vector of WIRE.vectors) {
    assert.equal(JSON.stringify(JSON.parse(vector.input)), vector.wire, vector.id);
  }
});

test("the legacy fixture equals the v0.14.0 TypeScript canonicalizer", () => {
  for (const vector of LEGACY.vectors) {
    assert.equal(
      JSON.stringify(canonicalize(JSON.parse(vector.input))),
      vector.expected,
      vector.id,
    );
  }
});

test("legacy canonicalization sorts array-index keys numerically, not by UTF-16", () => {
  const canonical = JSON.stringify(canonicalize(JSON.parse('{"1":3,"2":2,"10":4}')));
  assert.equal(canonical, '{"1":3,"2":2,"10":4}');
  assert.notEqual(canonical, '{"1":3,"10":4,"2":2}');
});

test("every persisted fingerprint is already canonical", () => {
  const files = readdirSync(FIXTURE_DIR).filter(
    (name) => name.startsWith("legacy-") && name.endsWith(".json"),
  );
  let checked = 0;
  for (const file of files) {
    const state = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf8")) as {
      applied?: Record<string, { fingerprint?: string }>;
    };
    for (const entry of Object.values(state.applied ?? {})) {
      if (!entry.fingerprint) continue;
      const parsed = JSON.parse(entry.fingerprint);
      assert.equal(JSON.stringify(canonicalize(parsed)), entry.fingerprint, file);
      const command = parsed as { type: string; payload?: Record<string, unknown> };
      assert.equal(
        fingerprintOf(command as never, (parsed as { rulesetVersion: string }).rulesetVersion),
        entry.fingerprint,
        file,
      );
      checked += 1;
    }
  }
  assert.ok(checked > 0, "at least one persisted fingerprint is checked");
});

test("the portable contract identities match identityOf", () => {
  const contract = JSON.parse(
    readFileSync(join(ROOT, "fixtures/conformance/engine-contract.json"), "utf8"),
  ) as { cases: { replay: { expected: { legacyAppliedIdentities: Record<string, string> } } } };
  const state = JSON.parse(
    readFileSync(join(FIXTURE_DIR, "legacy-setup-zero-game.json"), "utf8"),
  ) as { applied: Record<string, { fingerprint: string }> };
  for (const [id, expected] of Object.entries(
    contract.cases.replay.expected.legacyAppliedIdentities,
  )) {
    const entry = state.applied[id];
    assert.ok(entry, id);
    assert.equal(identityOf(entry.fingerprint), expected, id);
  }
});
