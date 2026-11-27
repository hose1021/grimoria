import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createNotesDraft } from "../ui/notes-draft.ts";

test("an update cannot write a pending note over a replacement game or an external edit", () => {
  for (const replacement of [
    { createdAt: "another game", notes: "saved" },
    { createdAt: "same game", notes: "imported" },
  ]) {
    let state = { createdAt: "same game", notes: "saved" };
    const notes = createNotesDraft(() => state);
    notes.edit("pending");
    state = replacement;
    assert.equal(
      notes.flush(() => assert.fail("stale draft was dispatched")),
      true,
    );
    assert.equal(notes.read(), replacement.notes);
  }
});

function mockPage(
  t: TestContext,
  serviceWorker: EventTarget,
  localStorage: Pick<Storage, "getItem" | "setItem">,
  reload: () => void,
) {
  const element = () => Object.assign(new EventTarget(), { dataset: { state: "" }, hidden: false });
  const elements = new Map(
    ["update-banner", "update-message", "update-now", "update-later"].map((id) => [id, element()]),
  );
  const globals = {
    document: Object.assign(new EventTarget(), {
      documentElement: {},
      getElementById: (id: string) => elements.get(id),
    }),
    navigator: { serviceWorker },
    MutationObserver: class {
      observe() {}
    },
    location: { reload },
    window: new EventTarget(),
    localStorage,
  };
  for (const [key, value] of Object.entries(globals)) {
    const before = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (before) Object.defineProperty(globalThis, key, before);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  return elements;
}

test("an active window confirms an opening update and can retry a failed save before or after activation", async (t) => {
  const values = new Map<string, string>();
  let writable = true;
  let activations = 0;
  let reloads = 0;
  const worker = Object.assign(new EventTarget(), {
    state: "installed",
    postMessage() {
      activations++;
    },
  });
  const openingCheck = Promise.withResolvers<void>();
  const nextCheck = Promise.withResolvers<void>();
  let check = openingCheck.promise;
  let checkStarted = false;
  const registration = Object.assign(new EventTarget(), {
    installing: null,
    waiting: worker as typeof worker | null,
    update() {
      checkStarted = true;
      return check;
    },
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: {},
    register: async () => registration,
  });
  const elements = mockPage(
    t,
    serviceWorker,
    {
      getItem: (key: string) => values.get(key) ?? null,
      setItem(key: string, value: string) {
        if (!writable) throw new Error("Quota exceeded");
        values.set(key, value);
      },
    },
    () => {
      reloads++;
    },
  );
  // The production browser target includes Safari versions without Promise.withResolvers.
  const resolver = Object.getOwnPropertyDescriptor(Promise, "withResolvers")!;
  Reflect.deleteProperty(Promise, "withResolvers");
  t.after(() => Object.defineProperty(Promise, "withResolvers", resolver));
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const { state, dispatch, save } = await import("./store.ts");
  const { prepareOffline } = await import("./offline.ts");
  state.phase = "night";
  assert.ok(save());
  const notesDraft = createNotesDraft(() => state);
  const flushNotes = () =>
    notesDraft.flush(
      (notes) => dispatch({ type: "setNotes", payload: { notes } }).status === "allowed",
    );
  const banner = elements.get("update-banner")!;
  const pressUpdate = async () => {
    elements.get("update-now")!.dispatchEvent(new Event("click"));
    t.mock.timers.tick(0);
    await Promise.resolve();
  };

  const prepared = prepareOffline(flushNotes);
  await Promise.resolve();
  assert.equal(checkStarted, true);
  assert.equal(
    banner.dataset.state,
    "available",
    "the installed update is usable while the network check is pending",
  );
  t.mock.timers.tick(0);
  await Promise.resolve();
  assert.equal(activations, 0, "opening an active game asks first");
  assert.equal(banner.dataset.state, "available");

  writable = false;
  notesDraft.edit("Pending note");
  assert.equal(flushNotes(), false, "a rejected edit stays in the editor");
  assert.equal(notesDraft.read(), "Pending note");
  await pressUpdate();
  assert.equal(activations, 0, "a failed save keeps the worker waiting");
  assert.equal(banner.dataset.state, "saveFailed");

  writable = true;
  await pressUpdate();
  assert.equal(activations, 1);
  assert.equal(JSON.parse(values.get("pg.game.v4")!).notes, "Pending note");
  openingCheck.resolve();
  await prepared;
  registration.waiting = null;
  serviceWorker.controller = worker;
  state.notes = "New note before reload";
  writable = false;
  serviceWorker.dispatchEvent(new Event("controllerchange"));
  assert.equal(reloads, 0, "a later failed save keeps the active tab open");
  assert.equal(banner.dataset.state, "saveFailed");

  writable = true;
  await pressUpdate();
  assert.equal(reloads, 1, "a retry also works after the worker took control");
  assert.equal(JSON.parse(values.get("pg.game.v4")!).notes, state.notes);

  state.phase = "setup";
  serviceWorker.controller = {};
  registration.waiting = worker;
  check = nextCheck.promise;
  const inactive = prepareOffline(flushNotes);
  await Promise.resolve();
  t.mock.timers.tick(0);
  await Promise.resolve();
  assert.equal(
    activations,
    2,
    "an idle window can apply an installed update before the check finishes",
  );
  nextCheck.resolve();
  await inactive;
});

test("deferring a worker during the opening check keeps it hidden while a different update can still be offered", async (t) => {
  const opening = Promise.withResolvers<void>();
  const worker = Object.assign(new EventTarget(), { state: "installing" });
  const registration = Object.assign(new EventTarget(), {
    installing: worker as typeof worker | null,
    waiting: null as typeof worker | null,
    update: () => opening.promise,
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: {},
    register: async () => registration,
  });
  const elements = mockPage(t, serviceWorker, { getItem: () => null, setItem() {} }, () =>
    assert.fail("deferred update reloaded"),
  );
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  const { state } = await import("./store.ts");
  const { prepareOffline } = await import("./offline.ts");
  state.phase = "night";
  const boot = prepareOffline(() => true);
  await Promise.resolve();
  registration.installing = null;
  registration.waiting = worker;
  worker.state = "installed";
  worker.dispatchEvent(new Event("statechange"));
  const banner = elements.get("update-banner")!;
  assert.equal(banner.dataset.state, "available");
  elements.get("update-later")!.dispatchEvent(new Event("click"));
  assert.equal(banner.hidden, true);
  opening.resolve();
  await boot;
  registration.dispatchEvent(new Event("updatefound"));
  assert.equal(banner.hidden, true, "the opening check cannot reopen the dismissed worker");
  registration.waiting = Object.assign(new EventTarget(), { state: "installed" });
  registration.dispatchEvent(new Event("updatefound"));
  assert.equal(banner.dataset.state, "available");
  // A third worker can replace the offered one before updatefound is delivered.
  registration.waiting = Object.assign(new EventTarget(), { state: "installed" });
  elements.get("update-later")!.dispatchEvent(new Event("click"));
  registration.dispatchEvent(new Event("updatefound"));
  assert.equal(banner.dataset.state, "available", "Later belongs to the visible offer");
});
