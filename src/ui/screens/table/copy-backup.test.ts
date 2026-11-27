import assert from "node:assert/strict";
import test from "node:test";
import { copyBackup } from "./copy-backup.ts";

test("copying a private backup reports success or selects the complete text for manual copying", async (t) => {
  const json = '{"game":{"notes":"private"}}';
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else Reflect.deleteProperty(globalThis, "navigator");
  });
  const calls: string[] = [];
  const field = {
    value: json,
    isConnected: true,
    focus: () => calls.push("focus"),
    select: () => calls.push("select"),
  };
  const navigator = {
    clipboard: {
      async writeText(text: string) {
        calls.push(text);
      },
    },
  };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: navigator });
  assert.equal(await copyBackup(field), "copied");
  assert.deepEqual(calls.splice(0), [json]);
  navigator.clipboard.writeText = () => Promise.reject(new Error("Permission denied"));
  assert.equal(await copyBackup(field), "manual");
  assert.deepEqual(calls.splice(0), ["focus", "select"]);
  Reflect.deleteProperty(navigator, "clipboard");
  assert.equal(await copyBackup(field), "manual");
  assert.deepEqual(calls.splice(0), ["focus", "select"]);
  field.isConnected = false;
  await copyBackup(field);
  assert.deepEqual(calls, []);
});
