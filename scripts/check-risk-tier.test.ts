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
  assert.equal(classify(["scripts/rule-traceability.ts"]), "R3");
  assert.equal(classify(["scripts/openspec-reconcile.ts"]), "R3");
  assert.equal(classify(["fixtures/conformance/engine-contract.json"]), "R3");
  assert.equal(classify(["scripts/check-types-policy.ts"]), "R3");
  assert.equal(classify(["scripts/check-risk-artifacts.ts"]), "R3");
  assert.equal(classify(["src/infrastructure/storage/local-game-storage.ts"]), "R3");
  assert.equal(classify(["docs/x.md"]), "R0");
  assert.equal(classify(["README.md"]), "R0");
  assert.equal(classify(["tsconfig.app.json"]), "R3");
  assert.equal(classify(["new/unknown.bin"]), "R3");
  assert.equal(classify(["src/unknown/file.ts"]), "R3");
  assert.equal(classify(["docs/x.md", "new/unknown.bin"]), "R3");
  assert.equal(classify(["src/ui/shell.tsx", "new/unknown.bin"]), "R3");
  assert.equal(classify(["src/core/roles/sailor/role.ts", "new/unknown.bin"]), "R3");
  assert.equal(classify(["src/ui/shell.tsx"]), "R1");
  assert.equal(classify(["src/core/roles/sailor/role.ts"]), "R2");
  assert.equal(classify(["src/core/engine/commands.ts"]), "R3");
  assert.equal(classify(["scripts/verification/gates.ts"]), "R3");
  assert.equal(classify(["openspec/specs/game/setup/spec.md"]), "R3");
});

const body = (risk: string, extra = "- `npm run verify` pass.") =>
  `Issue: #519\nRisk: ${risk}\nEvidence:\n${extra}`;

test("a declared tier below the diff, a missing issue, risk or evidence fails", () => {
  assert.equal(checkRisk(body("R3"), ["src/core/engine/commands.ts"]).ok, true);
  assert.equal(checkRisk(body("R0"), ["src/core/engine/commands.ts"]).ok, false);
  assert.equal(checkRisk(body("R1"), ["src/core/roles/sailor/role.ts"]).ok, false);
  assert.equal(checkRisk(body("R1"), ["src/ui/shell.tsx"]).ok, true);
  assert.equal(checkRisk(body("R0"), ["docs/x.md"]).ok, true);
  assert.equal(checkRisk("Risk: R0\nEvidence:\n", ["docs/x.md"]).ok, false);
  assert.equal(checkRisk("Issue: #519\nEvidence:\n", ["docs/x.md"]).ok, false);
  assert.equal(checkRisk("Issue: #519\nRisk: R0\n", ["docs/x.md"]).ok, false);
  assert.equal(checkRisk("Issue: #519\nRisk: R0\nEvidence:\n", ["docs/x.md"]).ok, false);
});

test("each tier needs the evidence its risk implies", () => {
  assert.equal(checkRisk(body("R1", "- changed a button"), ["src/ui/shell.tsx"]).ok, false);
  assert.equal(checkRisk(body("R1", "- `npm test` passes"), ["src/ui/shell.tsx"]).ok, true);
  assert.equal(
    checkRisk(body("R2", "- fixed BMR-SAILOR-01"), ["src/core/roles/sailor/role.ts"]).ok,
    false,
    "R2 needs the asserting test file",
  );
  assert.equal(
    checkRisk(body("R2", "- BMR-SAILOR-01 covered by src/core/roles/sailor/role.test.ts"), [
      "src/core/roles/sailor/role.ts",
    ]).ok,
    true,
  );
  assert.equal(
    checkRisk(body("R3", ""), ["src/core/engine/commands.ts"]).ok,
    false,
    "R3 needs a concrete evidence bullet",
  );
});
