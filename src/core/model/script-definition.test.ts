import assert from "node:assert/strict";
import test from "node:test";

import { JINX_PAIRS } from "./jinxes.ts";
import { INTERACTIONS, interactionFor, interactionsFor } from "./interactions.ts";
import { defineScript, scriptCompatibility, scriptRunsAutomatically } from "./script-definition.ts";
import type { Script } from "./types.ts";

function script(roles: string[], extra: Partial<Script> = {}): Script {
  return {
    id: "custom-mixed",
    name: "Mixed proof",
    edition: "custom",
    roles,
    source: "file",
    ...extra,
  };
}

// Every character here is `verified`; no official jinx joins two of them.
const VERIFIED_MIXED = [
  "imp",
  "poisoner",
  "investigator",
  "soldier",
  "monk",
  "sailor",
  "courtier",
  "clockmaker",
];

test("a mixed script of verified characters is automatically runnable", () => {
  const definition = defineScript(script(VERIFIED_MIXED));
  assert.equal(definition.mixed, true);
  assert.deepEqual([...definition.editions].sort(), ["bmr", "snv", "tb"]);
  assert.equal(definition.compatibility.level, "verified");
  assert.equal(definition.compatibility.automatic, true);
  assert.equal(definition.compatibility.manualOnly, false);
  assert.equal(definition.compatibility.interactions.length, 0);
  assert.equal(scriptRunsAutomatically(definition.script), true);
  assert.deepEqual(
    definition.nightOrder.first.filter((id) =>
      ["monk", "sailor", "courtier", "clockmaker"].includes(id),
    ),
    ["sailor", "courtier", "clockmaker"],
  );
  assert.ok(definition.nightOrder.other.includes("monk"));
  assert.deepEqual(definition.teams, { townsfolk: 6, outsider: 0, minion: 1, demon: 1 });
});

test("a host-choice role lowers the level but keeps automatic play", () => {
  const compatibility = scriptCompatibility(script([...VERIFIED_MIXED, "chef"]));
  assert.equal(compatibility.level, "requires-storyteller-choice");
  assert.equal(compatibility.automatic, true);
  assert.equal(
    compatibility.roles.find((entry) => entry.roleId === "chef")?.level,
    "requires-storyteller-choice",
  );
});

test("a registered jinx without implemented behavior is unsupported, not a host choice", () => {
  const compatibility = scriptCompatibility(script([...VERIFIED_MIXED, "fanggu", "scarletwoman"]));
  assert.equal(compatibility.level, "unsupported");
  assert.equal(compatibility.automatic, false);
  assert.equal(compatibility.interactions.length, 1);
  const [entry] = compatibility.interactions;
  assert.equal(entry.status, "unsupported");
  assert.equal(entry.test, null);
  assert.match(entry.source, /^docs\/official\/jinxes\.json#/);
  assert.ok(entry.statusReason.length > 20);
});

test("an unknown character is an explicit unsupported result", () => {
  const compatibility = scriptCompatibility(script([...VERIFIED_MIXED, "kazali"]));
  assert.equal(compatibility.level, "unsupported");
  assert.equal(compatibility.automatic, false);
  assert.deepEqual(compatibility.unknown, ["kazali"]);
});

test("the explicit manual fallback disables automatic play for a supported mixed script", () => {
  const compatibility = scriptCompatibility(script(VERIFIED_MIXED, { manualOnly: true }));
  assert.equal(compatibility.level, "verified");
  assert.equal(compatibility.automatic, false);
  assert.equal(compatibility.manualOnly, true);
});

test("every official jinx is registered once with a pin and a behavioral test when verified", () => {
  assert.equal(INTERACTIONS.length, JINX_PAIRS.length);
  for (const pair of JINX_PAIRS) {
    const key = [...pair.roles].sort().join("+");
    const entry = interactionFor(pair.roles[0], pair.roles[1]);
    assert.ok(entry, key + " has no interaction definition");
    assert.equal(entry.id, "jinx:" + key);
    assert.equal(entry.pin, "2026-11-11");
    assert.ok(entry.source.startsWith("docs/official/jinxes.json#"));
    assert.ok(entry.statusReason.length > 20, key + " has no status reason");
    if (entry.status === "verified") assert.ok(entry.test, key + " claims a behavior with no test");
    if (entry.status === "unsupported") assert.equal(entry.test, null, key + " has a test");
  }
  assert.deepEqual(
    interactionsFor(["imp", "chef"]).length,
    0,
    "a pair with no registered rule must stay empty",
  );
});

test("an official script is imported data, not the only supported shape", () => {
  const tb = defineScript({
    id: "tb",
    name: "Trouble Brewing",
    edition: "tb",
    source: "official",
    roles: [],
  });
  assert.equal(tb.origin, "official");
  assert.equal(defineScript(script(VERIFIED_MIXED)).origin, "imported");
});
