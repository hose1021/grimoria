import assert from "node:assert/strict";
import test from "node:test";
import { scan } from "./documentation-consumers.ts";

const ARTIFACT = "docs/audits/verification-gates/test-manifest.json";

test("the consumer map names every file that reads an artifact and not the artifact itself", () => {
  const files = [
    { path: ARTIFACT, text: ARTIFACT },
    { path: "scripts/verification/gates.ts", text: `const MANIFEST = "${ARTIFACT}";` },
    { path: "docs/reference/README.md", text: ARTIFACT },
    { path: "src/core/engine/commands.ts", text: "no artifact here" },
  ];
  assert.deepEqual(scan(files, ARTIFACT), ["scripts/verification/gates.ts"]);
});

test("the consumer map ignores binary content instead of matching raw bytes", () => {
  const files = [
    { path: "public/icon.png", text: `${ARTIFACT}\0\0` },
    { path: "scripts/serve.ts", text: ARTIFACT },
  ];
  assert.deepEqual(scan(files, ARTIFACT), ["scripts/serve.ts"]);
});
