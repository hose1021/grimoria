import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const source = readFileSync(join(ROOT, "src", "entry", "screens", "demo.ts"), "utf8");

test("the demo screen keeps its own in-memory game (SYS-SCRIPTS-06)", () => {
  assert.match(source, /createGame\(/, "the demo builds its own state");
  assert.doesNotMatch(source, /pg\.game\.v4/, "the demo never touches the saved game key");
  assert.doesNotMatch(source, /localStorage/, "the demo never reads browser storage");
  assert.doesNotMatch(source, /from "\.\.\/store\.ts"/, "the demo never uses the console store");
});
