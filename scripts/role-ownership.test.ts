import test from "node:test";
import assert from "node:assert/strict";
import { engineLocations, ownerOf, roleModules, ruleRows } from "./role-ownership.ts";

test("the ledger covers all 72 supported roles once", () => {
  const modules = roleModules();
  assert.equal(modules.length, 72);
  assert.equal(new Set(modules.map((module) => module.id)).size, 72);
});

test("every role dossier names at least one rule identifier", () => {
  for (const module of roleModules()) {
    const rows = ruleRows(module.id);
    assert.ok(rows.length > 0, module.id + " has no rule row");
    assert.ok(
      rows.every((row) => row.revision.startsWith("r")),
      module.id + " has a rule row without a pinned revision",
    );
  }
});

test("the owner classifier separates a capability from an engine branch", () => {
  const facts = roleModules();
  const imp = facts.find((module) => module.id === "imp");
  assert.ok(imp);
  assert.equal(ownerOf(imp, engineLocations("imp")), "capability + engine reference");
  const poisoned = facts.find((module) => module.id === "monk");
  assert.ok(poisoned);
  assert.equal(ownerOf(poisoned, engineLocations("monk")), "engine branch");
  assert.equal(ownerOf(undefined, []), "missing module");
});
