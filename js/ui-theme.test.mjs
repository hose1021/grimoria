import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const legacy = readFileSync(new URL("../css/app.css", import.meta.url), "utf8");
const native = readFileSync(new URL("../src/ui/styles/tokens.css", import.meta.url), "utf8");

test("legacy and native screens share the Grimoria midnight palette", () => {
  for (const [name, value] of [
    ["bg", "#071017"],
    ["panel", "rgba(10, 24, 32, .82)"],
    ["panel-2", "#0d1b23"],
    ["accent", "#38e8f5"],
    ["accent-secondary", "#6af5ff"],
    ["text-secondary", "#a8bbc4"],
    ["positive", "#64f5b0"],
    ["warning", "#f8c76a"],
    ["danger", "#ff7f94"],
    ["disabled", "#51616b"],
  ]) {
    assert.match(
      legacy,
      name === "panel"
        ? /--panel:\s*rgba\(10,\s*24,\s*32,\s*(?:0)?\.82\);/i
        : new RegExp(`--${name}:\\s*${value};`, "i"),
    );
  }

  assert.match(native, /--color-bg:\s*#071017;/i);
  assert.match(native, /--color-panel:\s*rgba\(10,\s*24,\s*32,\s*(?:0)?\.82\);/i);
  assert.match(native, /--color-panel-2:\s*#0d1b23;/i);
  assert.match(native, /--color-accent:\s*#38e8f5;/i);
  assert.match(native, /--color-accent-secondary:\s*#6af5ff;/i);
  assert.match(native, /--color-text-secondary:\s*#a8bbc4;/i);
  assert.match(native, /--color-positive:\s*#64f5b0;/i);
  assert.match(native, /--color-warning:\s*#f8c76a;/i);
  assert.match(native, /--color-danger:\s*#ff7f94;/i);
  assert.match(native, /--color-disabled:\s*#51616b;/i);
});
