import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BMR_ALL, SNV_ALL, ALL_ROLES, SUPPORTED_ROLES } from "../src/core/model/rules.ts";
import { SUPPORTED_RULESET_VERSIONS } from "../src/core/engine/index.ts";
import {
  JINX_PAIRS,
  JINX_RESOURCES_VERSION,
  jinxFor,
  lookupJinx,
  scriptJinxes,
} from "../src/core/model/jinxes.ts";
import {
  ROLE_SUPPORT,
  SUPPORT_LEVELS,
  roleSupport,
  scriptSupport,
} from "../src/core/model/support.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JINX_SNAPSHOT = JSON.parse(readFileSync(join(ROOT, "docs/official/jinxes.json"), "utf8"));
const OFFICIAL_REASONS = new Map(
  JINX_SNAPSHOT.jinxes.flatMap((entry) =>
    (entry.jinx ?? []).map((jinx) => [[entry.id, jinx.id].sort().join("+"), jinx.reason]),
  ),
);
const MATRIX_STATUSES = new Set([
  "verified",
  "implemented-unverified",
  "host-choice",
  "unsupported",
]);
// The status legend itself uses backticked words as its first column.
const MATRIX_LEGEND_ROWS = new Set(["verified", "unsupported"]);

const readMatrixLevels = () => {
  const lines = readFileSync(join(ROOT, "docs/rules-matrix.md"), "utf8").split("\n");
  const statuses = new Map();
  for (const line of lines) {
    const match = /^\|\s*`([a-z]+)`\s/.exec(line);
    if (!match || MATRIX_LEGEND_ROWS.has(match[1])) continue;
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|");
    const status = cells.at(-1).trim();
    assert.ok(MATRIX_STATUSES.has(status), match[1] + " has an unknown matrix status: " + status);
    const list = statuses.get(match[1]) ?? [];
    list.push(status);
    statuses.set(match[1], list);
  }
  const levels = new Map();
  for (const [id, list] of statuses) {
    const level = list.includes("unsupported")
      ? "unsupported"
      : list.includes("host-choice") || list.includes("implemented-unverified")
        ? "requires-storyteller-choice"
        : "verified";
    levels.set(id, level);
  }
  return levels;
};

test("every supported role has an explicit support level that matches the rules matrix", () => {
  const matrix = readMatrixLevels();
  assert.equal(SUPPORTED_ROLES.length, 72);
  for (const id of SUPPORTED_ROLES) {
    assert.ok(SUPPORT_LEVELS.includes(ROLE_SUPPORT[id]), id + " has no support level");
    assert.equal(ROLE_SUPPORT[id], matrix.get(id), id + " disagrees with the rules matrix");
  }
  assert.equal(Object.keys(ROLE_SUPPORT).length, SUPPORTED_ROLES.length);
});

test("the three support levels name exactly the roles the matrix records", () => {
  const byLevel = (level) => SUPPORTED_ROLES.filter((id) => ROLE_SUPPORT[id] === level);
  assert.equal(byLevel("verified").length, 50);
  assert.deepEqual(byLevel("requires-storyteller-choice").sort(), [
    "assassin",
    "cerenovus",
    "chambermaid",
    "dreamer",
    "eviltwin",
    "flowergirl",
    "juggler",
    "mathematician",
    "mutant",
    "oracle",
    "pacifist",
    "sage",
    "seamstress",
    "sweetheart",
    "tinker",
    "towncrier",
    "vortox",
  ]);
  assert.deepEqual(byLevel("unsupported").sort(), [
    "artist",
    "goon",
    "klutz",
    "savant",
    "vigormortis",
  ]);
});

test("an unknown character is an explicit unsupported result, not a silent fallback", () => {
  const unknown = roleSupport("notarole");
  assert.equal(unknown.level, "unsupported");
  assert.match(unknown.reason, /unknown character/i);
  assert.equal(roleSupport("imp").level, "verified");
  assert.equal(roleSupport("goon").level, "unsupported");
});

test("a script reports the three support levels instead of claiming full support", () => {
  const tb = scriptSupport(ALL_ROLES);
  assert.equal(tb.level, "verified");
  assert.equal(tb.counts.verified, 22);
  assert.equal(tb.counts["requires-storyteller-choice"], 0);
  assert.equal(tb.counts.unsupported, 0);

  const bmr = scriptSupport(BMR_ALL);
  assert.equal(bmr.level, "unsupported");
  assert.equal(bmr.counts.unsupported, 1);
  assert.equal(bmr.counts["requires-storyteller-choice"], 4);

  const snv = scriptSupport(SNV_ALL);
  assert.equal(snv.level, "unsupported");
  assert.equal(snv.counts.unsupported, 4);
  assert.equal(snv.counts["requires-storyteller-choice"], 13);

  const tinker = scriptSupport(["chef", "empath", "tinker", "poisoner", "imp"]);
  assert.equal(tinker.level, "requires-storyteller-choice");
  assert.equal(tinker.counts["requires-storyteller-choice"], 1);

  const unknown = scriptSupport(["chef", "notarole"]);
  assert.equal(unknown.level, "unsupported");
  assert.deepEqual(unknown.unknown, ["notarole"]);

  const mixed = scriptSupport(["chef", "goon"]);
  assert.equal(mixed.roles.chef, "verified");
  assert.equal(mixed.roles.goon, "unsupported");
});

test("the jinx table is versioned and every applicable pair has a source and a reason", () => {
  assert.equal(JINX_SNAPSHOT.committed, JINX_RESOURCES_VERSION);
  assert.equal(JINX_PAIRS.length, 7);
  const expected = new Set();
  for (const entry of JINX_SNAPSHOT.jinxes) {
    for (const jinx of entry.jinx ?? []) {
      if (!SUPPORTED_ROLES.includes(entry.id) || !SUPPORTED_ROLES.includes(jinx.id)) continue;
      expected.add([entry.id, jinx.id].sort().join("+"));
    }
  }
  const seen = new Set();
  for (const pair of JINX_PAIRS) {
    const key = [...pair.roles].sort().join("+");
    assert.equal(seen.has(key), false, key + " is duplicated");
    seen.add(key);
    assert.equal(expected.has(key), true, key + " is not an official pair");
    assert.ok(pair.reason.length > 10, key + " has no reason");
    assert.match(pair.source, /^docs\/official\/jinxes\.json#/, key + " has no versioned source");
    for (const id of pair.roles) assert.ok(SUPPORTED_ROLES.includes(id), key + " names " + id);
  }
  assert.deepEqual([...seen].sort(), [...expected].sort());
});

for (const pair of JINX_PAIRS) {
  const key = [...pair.roles].sort().join("+");
  test(`the official jinx ${pair.roles.join(" + ")} is pinned with its source`, () => {
    const lookup = lookupJinx(pair.roles[0], pair.roles[1]);
    assert.equal(lookup.status, "verified", key);
    assert.equal(lookup.pair?.reason, pair.reason, key);
    assert.equal(pair.reason, OFFICIAL_REASONS.get(key), key + " reason differs from the snapshot");
    assert.match(pair.source, /^docs\/official\/jinxes\.json#/);
  });
}

test("a jinx lookup names the pair, or marks an unknown character unsupported", () => {
  const pair = jinxFor("scarletwoman", "fanggu");
  assert.ok(pair);
  assert.deepEqual([...pair.roles].sort(), ["fanggu", "scarletwoman"]);
  assert.equal(jinxFor("imp", "chef"), null);

  assert.equal(lookupJinx("fanggu", "scarletwoman").status, "verified");
  assert.equal(lookupJinx("imp", "chef").status, "none");
  const unknown = lookupJinx("notarole", "scarletwoman");
  assert.equal(unknown.status, "unsupported");
  assert.match(unknown.reason, /unknown character/i);
});

test("a script lists the jinxes its pooled roles can trigger", () => {
  assert.deepEqual(scriptJinxes(ALL_ROLES), []);
  const mixed = scriptJinxes(["fanggu", "scarletwoman", "chef"]);
  assert.equal(mixed.length, 1);
  assert.deepEqual([...mixed[0].roles].sort(), ["fanggu", "scarletwoman"]);
  assert.equal(scriptSupport(["fanggu", "scarletwoman"]).level, "requires-storyteller-choice");
  assert.equal(scriptSupport(["fanggu", "scarletwoman"]).jinxes.length, 1);
});

test("an unsupported ruleset version stays outside the accepted set", () => {
  assert.equal(SUPPORTED_RULESET_VERSIONS.has("future-ruleset-9"), false);
});
