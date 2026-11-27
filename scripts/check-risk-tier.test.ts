import assert from "node:assert/strict";
import test from "node:test";
import { checkRisk, classify } from "./check-risk-tier.ts";

test("the diff decides the tier from its highest-risk path", () => {
  assert.equal(classify(["docs/rules-sources.md"]), "R3");
  assert.equal(classify(["docs/official/roles.json"]), "R3");
  assert.equal(classify(["package.json"]), "R3");
  assert.equal(classify(["AGENTS.md"]), "R3");
  assert.equal(classify(["openspec/config.yaml"]), "R3");
  assert.equal(classify(["scripts/check-acceptance.ts"]), "R3");
  assert.equal(classify(["scripts/archive-index.ts"]), "R3");
  assert.equal(classify(["scripts/sync-rules-matrix.ts"]), "R3");
  assert.equal(classify(["src/application/store/create-game-store.ts"]), "R3");
  assert.equal(classify(["docs/x.md"]), "R0");
  assert.equal(classify(["src/ui/shell.tsx"]), "R1");
  assert.equal(classify(["src/core/roles/sailor/role.ts"]), "R2");
  assert.equal(classify(["src/core/engine/commands.ts"]), "R3");
  assert.equal(classify(["scripts/verification/gates.ts"]), "R3");
  assert.equal(classify(["openspec/specs/game/setup/spec.md"]), "R3");
});

test("a declared tier below the diff, a missing issue, risk or evidence fails", () => {
  const body = (risk: string, extra = "") => `Issue: #519\nRisk: ${risk}\nEvidence:\n${extra}`;
  assert.equal(checkRisk(body("R3"), ["src/core/engine/commands.ts"]).ok, true);
  assert.equal(checkRisk(body("R0"), ["src/core/engine/commands.ts"]).ok, false);
  assert.equal(checkRisk(body("R1"), ["src/core/roles/sailor/role.ts"]).ok, false);
  assert.equal(checkRisk(body("R1"), ["src/ui/shell.tsx"]).ok, true);
  assert.equal(checkRisk(body("R0"), ["docs/x.md"]).ok, true);
  assert.equal(checkRisk("Risk: R0\nEvidence:\n", ["docs/x.md"]).ok, false);
  assert.equal(checkRisk("Issue: #519\nEvidence:\n", ["docs/x.md"]).ok, false);
  assert.equal(checkRisk("Issue: #519\nRisk: R0\n", ["docs/x.md"]).ok, false);
});
