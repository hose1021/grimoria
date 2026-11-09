import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Exercise the generated worker itself so a cache or activation regression is
// caught without a browser.
const source = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const cacheName = /const CACHE = "([^"]+)";/.exec(source)?.[1];
const assets = JSON.parse(/const ASSETS = (\[[\s\S]*?\]);/.exec(source)?.[1]);
const tick = () => new Promise((resolve) => setImmediate(resolve));

// The worker only needs one-way port delivery; a fake channel keeps the test
// process free of live handles.
function fakeMessageChannel() {
  return class MessageChannel {
    constructor() {
      const port1 = {};
      const port2 = {};
      port1.onmessage = null;
      port1.postMessage = (data) => queueMicrotask(() => port2.onmessage?.({ data }));
      port2.onmessage = null;
      port2.postMessage = (data) => queueMicrotask(() => port1.onmessage?.({ data }));
      this.port1 = port1;
      this.port2 = port2;
    }
  };
}

function createWorker({ keys = [], match = async () => null, windows = [] } = {}) {
  const listeners = new Map();
  const calls = { skipped: 0, opened: [], added: [], deleted: [], fetched: [] };
  const stored = new Set(keys);
  const timers = new Map();
  let timerSeq = 0;
  const clients = windows.map((window) => ({
    id: window.id,
    posts: [],
    postMessage(message, ports) {
      this.posts.push({ message, port: ports && ports[0] });
    }
  }));
  const cache = {
    addAll: async (entries) => { calls.added.push(...entries); },
    match
  };
  const caches = {
    open: async (name) => { calls.opened.push(name); return cache; },
    keys: async () => [...stored],
    delete: async (name) => { calls.deleted.push(name); stored.delete(name); return true; }
  };
  const self = {
    addEventListener(type, handler) { listeners.set(type, handler); },
    skipWaiting() { calls.skipped += 1; },
    location: { origin: "https://example.test" },
    registration: { scope: "https://example.test/pocket/" },
    clients: { matchAll: async () => clients }
  };
  const fetch = async (request) => { calls.fetched.push(request.url); return "network"; };
  const context = {
    self, caches, fetch, URL, console, Promise, MessageChannel: fakeMessageChannel(),
    setTimeout: (callback) => { timers.set(++timerSeq, callback); return timerSeq; },
    clearTimeout: (id) => { timers.delete(id); }
  };
  vm.runInContext(source, vm.createContext(context));
  const dispatch = (type, event = {}) => {
    const listener = listeners.get(type);
    assert.ok(listener, `the worker has no ${type} listener`);
    listener(event);
  };
  const fire = async (type, event = {}) => {
    const pending = [];
    event.waitUntil = (promise) => { pending.push(promise); };
    dispatch(type, event);
    await Promise.all(pending);
  };
  const runTimers = () => {
    const due = [...timers.values()];
    timers.clear();
    for (const callback of due) callback();
  };
  return { calls, clients, dispatch, fire, runTimers, stored };
}

test("the generated worker precaches one versioned asset set", async () => {
  assert.match(cacheName, /^pg-static-[0-9a-f]{16}$/);
  assert.ok(assets.includes("index.html"));
  assert.ok(assets.includes("js/offline.js"));
  const { calls, fire } = createWorker();
  await fire("install");
  assert.deepEqual(calls.opened, [cacheName]);
  assert.deepEqual(calls.added, assets);
});

test("activation prunes older generated caches and keeps unrelated caches", async () => {
  const { calls, fire, stored } = createWorker({ keys: ["pg-static-old", cacheName, "unrelated-cache"] });
  await fire("activate");
  assert.deepEqual(calls.deleted, ["pg-static-old"]);
  assert.deepEqual([...stored].sort(), [cacheName, "unrelated-cache"].sort());
});

test("the worker activates only after an explicit SKIP_WAITING message", () => {
  const { calls, dispatch } = createWorker();
  let reply = null;
  dispatch("message", { data: { type: "GET_VERSION" }, ports: [{ postMessage: (data) => { reply = data; } }] });
  assert.equal(calls.skipped, 0);
  assert.equal(reply.version, cacheName);
  dispatch("message", { data: { type: "OTHER" } });
  assert.equal(calls.skipped, 0);
  dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(calls.skipped, 1);
});

test("the worker prepares every other open window before reporting activation readiness", async () => {
  const requester = { id: "requester" };
  const { clients, dispatch } = createWorker({ windows: [requester, { id: "a" }, { id: "b" }] });
  let reply = null;
  const pending = [];
  dispatch("message", {
    data: { type: "PREPARE_UPDATE" },
    source: requester,
    ports: [{ postMessage: (data) => { reply = data; } }],
    waitUntil: (promise) => pending.push(promise)
  });
  await tick();
  assert.deepEqual(clients.filter((client) => client.posts.length).map((client) => client.id), ["a", "b"],
    "the requesting window is not asked again");
  assert.equal(reply, null);
  clients[1].posts[0].port.postMessage({ ok: true });
  await tick();
  assert.equal(reply, null);
  clients[2].posts[0].port.postMessage({ ok: false });
  await Promise.all(pending);
  assert.equal(reply.ok, false);
  assert.equal(reply.failed, 1);
  assert.equal(reply.unconfirmed, 0);
});

test("a window that does not answer preflight blocks activation", async () => {
  const { clients, dispatch, runTimers } = createWorker({ windows: [{ id: "a" }, { id: "b" }] });
  let reply = null;
  const pending = [];
  dispatch("message", {
    data: { type: "PREPARE_UPDATE" },
    ports: [{ postMessage: (data) => { reply = data; } }],
    waitUntil: (promise) => pending.push(promise)
  });
  await tick();
  clients[0].posts[0].port.postMessage({ ok: true });
  await tick();
  assert.equal(reply, null);
  runTimers();
  await Promise.all(pending);
  assert.equal(reply.ok, false);
  assert.equal(reply.failed, 0);
  assert.equal(reply.unconfirmed, 1);
});

test("navigation uses the cached shell and asset responses fall back to the network", async () => {
  const { calls, fire } = createWorker({
    match: async (request) => (typeof request === "string" ? "cached-shell" : null)
  });
  let response;
  const navigation = { method: "GET", url: "https://example.test/pocket/table", mode: "navigate" };
  await fire("fetch", { request: navigation, respondWith: (promise) => { response = promise; } });
  assert.equal(await response, "cached-shell");
  assert.deepEqual(calls.fetched, []);

  const asset = { method: "GET", url: "https://example.test/pocket/js/app.js", mode: "cors" };
  await fire("fetch", { request: asset, respondWith: (promise) => { response = promise; } });
  assert.equal(await response, "network");
  assert.deepEqual(calls.fetched, [asset.url]);

  const crossOrigin = new Set();
  await fire("fetch", {
    request: { method: "GET", url: "https://other.test/pocket/js/app.js", mode: "cors" },
    respondWith: () => crossOrigin.add("called")
  });
  assert.equal(crossOrigin.size, 0);
  const outsideScope = new Set();
  await fire("fetch", {
    request: { method: "GET", url: "https://example.test/elsewhere/app.js", mode: "cors" },
    respondWith: () => outsideScope.add("called")
  });
  assert.equal(outsideScope.size, 0);
});
