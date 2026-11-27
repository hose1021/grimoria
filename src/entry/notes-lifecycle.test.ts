import assert from "node:assert/strict";
import test from "node:test";
import { createNotesDraft } from "../ui/notes-draft.ts";
import { watchNotesLifecycle } from "./notes-lifecycle.ts";

test("a hidden or departing page commits a pending note once and can retry a failed write", () => {
  const page = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const game = { createdAt: "game", notes: "" };
  const draft = createNotesDraft(() => game);
  const attempts: string[] = [];
  let writable = false;
  watchNotesLifecycle(page, doc, () =>
    draft.flush((text) => {
      attempts.push(text);
      if (writable) game.notes = text;
      return writable;
    }),
  );
  draft.edit("host note");
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(attempts, []);
  doc.visibilityState = "hidden";
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(attempts, ["host note"]);
  assert.equal(draft.read(), "host note");
  writable = true;
  page.dispatchEvent(new Event("pagehide"));
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(game.notes, "host note");
  assert.deepEqual(attempts, ["host note", "host note"]);
  draft.edit("new note");
  page.dispatchEvent(new Event("pagehide"));
  assert.equal(game.notes, "new note");
});
