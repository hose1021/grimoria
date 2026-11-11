import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import vm from "node:vm";

// Exercise the generated worker itself so a cache or activation regression is
// caught without a browser. The worker is generated from a small build fixture,
// exactly as a Vite build would produce one.
const run = promisify(execFile);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const fixture = await mkdtemp(join(tmpdir(), "pg-worker-"));
await writeFile(join(fixture, "index.html"), "<!doctype html>");
await mkdir(join(fixture, "assets"));
await writeFile(join(fixture, "assets/app.js"), "console.log('app');");
await writeFile(join(fixture, "assets/app.css"), ".a{color:red}");
await run(process.execPath, [
  join(root, "scripts/build-offline.mjs"),
  "--root",
  fixture,
  "--out",
  join(fixture, "sw.js"),
]);
const source = await readFile(join(fixture, "sw.js"), "utf8");
const cacheMatch = /const CACHE = "([^"]+)";/.exec(source);
const assetsMatch = /const ASSETS = (\[[\s\S]*?\]);/.exec(source);
assert.ok(cacheMatch && assetsMatch);
const cacheName = cacheMatch[1]!;
const assets: string[] = JSON.parse(assetsMatch[1]!);
const tick = () => new Promise((resolve) => setImmediate(resolve));

/** One message the worker posts back to a page or to itself. */
interface Reply {
  version?: string;
  ok?: boolean;
  failed?: number;
  unconfirmed?: number;
}

interface Port {
  onmessage: ((event: { data: Reply }) => void) | null;
  postMessage: (data: Reply) => void;
}

type WorkerEvent = {
  data?: Record<string, unknown>;
  source?: unknown;
  ports?: Array<{ postMessage: (data: Reply) => void }>;
  request?: { method: string; url: string; mode: string };
  respondWith?: (promise: Promise<unknown>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
};

interface Client {
  id: string;
  posts: Array<{ message: unknown; port: Port }>;
  postMessage(message: unknown, ports?: Port[]): void;
}

// The worker only needs one-way port delivery; a fake channel keeps the test
// process free of live handles.
function fakeMessageChannel() {
  return class MessageChannel {
    port1: Port;
    port2: Port;
    constructor() {
      const port1 = {} as Port;
      const port2 = {} as Port;
      port1.onmessage = null;
      port1.postMessage = (data) => queueMicrotask(() => port2.onmessage?.({ data }));
      port2.onmessage = null;
      port2.postMessage = (data) => queueMicrotask(() => port1.onmessage?.({ data }));
      this.port1 = port1;
      this.port2 = port2;
    }
  };
}

function createWorker({
  keys = [],
  match = async () => null,
  windows = [],
}: {
  keys?: string[];
  match?: (request: unknown) => Promise<unknown>;
  windows?: Array<{ id: string }>;
} = {}) {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const calls = {
    skipped: 0,
    opened: [] as string[],
    added: [] as string[],
    deleted: [] as string[],
    fetched: [] as string[],
  };
  const stored = new Set<string>(keys);
  const timers = new Map<number, () => void>();
  let timerSeq = 0;
  const clients: Client[] = windows.map((window): Client => ({
    id: window.id,
    posts: [],
    postMessage(message, ports) {
      this.posts.push({ message, port: (ports && ports[0]) as Port });
    },
  }));
  const cache = {
    addAll: async (entries: string[]) => {
      calls.added.push(...entries);
    },
    match,
  };
  const caches = {
    open: async (name: string) => {
      calls.opened.push(name);
      return cache;
    },
    keys: async () => [...stored],
    delete: async (name: string) => {
      calls.deleted.push(name);
      stored.delete(name);
      return true;
    },
  };
  const self = {
    addEventListener(type: string, handler: (event: WorkerEvent) => void) {
      listeners.set(type, handler);
    },
    skipWaiting() {
      calls.skipped += 1;
    },
    location: { origin: "https://example.test" },
    registration: { scope: "https://example.test/pocket/" },
    clients: { matchAll: async () => clients },
  };
  const fetch = async (request: { url: string }) => {
    calls.fetched.push(request.url);
    return "network";
  };
  const context = {
    self,
    caches,
    fetch,
    URL,
    console,
    Promise,
    MessageChannel: fakeMessageChannel(),
    setTimeout: (callback: () => void) => {
      timers.set(++timerSeq, callback);
      return timerSeq;
    },
    clearTimeout: (id: number) => {
      timers.delete(id);
    },
  };
  vm.runInContext(source, vm.createContext(context));
  const dispatch = (type: string, event: WorkerEvent = {}) => {
    const listener = listeners.get(type);
    assert.ok(listener, `the worker has no ${type} listener`);
    listener(event);
  };
  const fire = async (type: string, event: WorkerEvent = {}) => {
    const pending: Promise<unknown>[] = [];
    event.waitUntil = (promise) => {
      pending.push(promise);
    };
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

test("the generator requires an explicit root and output path", async () => {
  await assert.rejects(
    run(process.execPath, [join(root, "scripts/build-offline.mjs")]),
    (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error && error.code === 2,
  );
});

test("the generated worker precaches one versioned asset set", async () => {
  assert.match(cacheName, /^pg-static-[0-9a-f]{16}$/);
  assert.ok(assets.includes("index.html"));
  assert.ok(assets.includes("assets/app.js"));
  const { calls, fire } = createWorker();
  await fire("install");
  assert.deepEqual(calls.opened, [cacheName]);
  assert.deepEqual(calls.added, assets);
});

test("activation prunes older generated caches and keeps unrelated caches", async () => {
  const { calls, fire, stored } = createWorker({
    keys: ["pg-static-old", cacheName, "unrelated-cache"],
  });
  await fire("activate");
  assert.deepEqual(calls.deleted, ["pg-static-old"]);
  assert.deepEqual([...stored].sort(), [cacheName, "unrelated-cache"].sort());
});

test("the worker activates only after an explicit SKIP_WAITING message", () => {
  const { calls, dispatch } = createWorker();
  // The fake port delivers the worker's reply before the assertions read it.
  const replies: Reply[] = [];
  dispatch("message", {
    data: { type: "GET_VERSION" },
    ports: [
      {
        postMessage: (data) => {
          replies.push(data);
        },
      },
    ],
  });
  assert.equal(calls.skipped, 0);
  assert.equal(replies[0].version, cacheName);
  dispatch("message", { data: { type: "OTHER" } });
  assert.equal(calls.skipped, 0);
  dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(calls.skipped, 1);
});

test("the worker prepares every other open window before reporting activation readiness", async () => {
  const requester = { id: "requester" };
  const { clients, dispatch } = createWorker({ windows: [requester, { id: "a" }, { id: "b" }] });
  const replies: Reply[] = [];
  const pending: Promise<unknown>[] = [];
  dispatch("message", {
    data: { type: "PREPARE_UPDATE" },
    source: requester,
    ports: [
      {
        postMessage: (data) => {
          replies.push(data);
        },
      },
    ],
    waitUntil: (promise) => pending.push(promise),
  });
  await tick();
  assert.deepEqual(
    clients.filter((client) => client.posts.length).map((client) => client.id),
    ["a", "b"],
    "the requesting window is not asked again",
  );
  assert.equal(replies.length, 0);
  clients[1].posts[0].port.postMessage({ ok: true });
  await tick();
  assert.equal(replies.length, 0);
  clients[2].posts[0].port.postMessage({ ok: false });
  await Promise.all(pending);
  assert.equal(replies[0].ok, false);
  assert.equal(replies[0].failed, 1);
  assert.equal(replies[0].unconfirmed, 0);
});

test("a window that does not answer preflight blocks activation", async () => {
  const { clients, dispatch, runTimers } = createWorker({ windows: [{ id: "a" }, { id: "b" }] });
  const replies: Reply[] = [];
  const pending: Promise<unknown>[] = [];
  dispatch("message", {
    data: { type: "PREPARE_UPDATE" },
    ports: [
      {
        postMessage: (data) => {
          replies.push(data);
        },
      },
    ],
    waitUntil: (promise) => pending.push(promise),
  });
  await tick();
  clients[0].posts[0].port.postMessage({ ok: true });
  await tick();
  assert.equal(replies.length, 0);
  runTimers();
  await Promise.all(pending);
  assert.equal(replies[0].ok, false);
  assert.equal(replies[0].failed, 0);
  assert.equal(replies[0].unconfirmed, 1);
});

test("navigation uses the cached shell and asset responses fall back to the network", async () => {
  const { calls, fire } = createWorker({
    match: async (request) => (typeof request === "string" ? "cached-shell" : null),
  });
  let response: Promise<unknown> | undefined;
  const navigation = { method: "GET", url: "https://example.test/pocket/table", mode: "navigate" };
  await fire("fetch", {
    request: navigation,
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await response, "cached-shell");
  assert.deepEqual(calls.fetched, []);

  const asset = { method: "GET", url: "https://example.test/pocket/js/app.js", mode: "cors" };
  await fire("fetch", {
    request: asset,
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal(await response, "network");
  assert.deepEqual(calls.fetched, [asset.url]);

  const crossOrigin = new Set<string>();
  await fire("fetch", {
    request: { method: "GET", url: "https://other.test/pocket/js/app.js", mode: "cors" },
    respondWith: () => crossOrigin.add("called"),
  });
  assert.equal(crossOrigin.size, 0);
  const outsideScope = new Set<string>();
  await fire("fetch", {
    request: { method: "GET", url: "https://example.test/elsewhere/app.js", mode: "cors" },
    respondWith: () => outsideScope.add("called"),
  });
  assert.equal(outsideScope.size, 0);
});

test.after(async () => {
  await rm(fixture, { recursive: true, force: true });
});
