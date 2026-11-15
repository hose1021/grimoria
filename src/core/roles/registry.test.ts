import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUPPORTED_ROLE_IDS } from "../model/role-ids.ts";
import { roleEdition } from "../model/rules.ts";
import { ROLE_MODULES, roleModule } from "./registry.ts";

const ROLES_SNAPSHOT = new URL("../../../docs/official/roles.json", import.meta.url);

test("the registry keeps one module for every supported role", () => {
  assert.deepEqual(Object.keys(ROLE_MODULES).sort(), [...SUPPORTED_ROLE_IDS].sort());
});

test("each module names its own key and the edition the model gives the role", () => {
  for (const id of SUPPORTED_ROLE_IDS) {
    const module = roleModule(id);
    assert.ok(module, id);
    assert.equal(module.id, id);
    assert.equal(module.edition, roleEdition(id));
  }
});

test("the module edition matches the official snapshot edition", () => {
  const snapshot = JSON.parse(readFileSync(ROLES_SNAPSHOT, "utf8")) as {
    id: string;
    edition: string;
  }[];
  const editions = new Map(snapshot.map((entry) => [entry.id, entry.edition]));
  for (const id of SUPPORTED_ROLE_IDS) {
    assert.equal(roleModule(id)?.edition, editions.get(id), id);
  }
});

test("a role the game does not support has no module", () => {
  assert.equal(roleModule("notarole"), null);
});
