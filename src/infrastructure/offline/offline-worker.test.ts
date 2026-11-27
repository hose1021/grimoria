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
await writeFile(join(fixture, "assets/app-BBBBBBBB.js"), "console.log('release B');");
await writeFile(join(fixture, "assets/reference-chunk.js"), "// lazy route");
await writeFile(
  join(fixture, "assets/app.css"),
  "@font-face{src:url('fonts/body.woff2')}@font-face{src:url(/pocket/assets/fonts/title.woff2)}",
);
await mkdir(join(fixture, "assets/fonts"));
for (const font of ["body", "title", "unused"]) {
  await writeFile(join(fixture, "assets/fonts", font + ".woff2"), font);
}
await mkdir(join(fixture, "assets/img/roles"), { recursive: true });
for (const image of ["token_e", "token_g", "translated", "unused", "voudon", "acrobat"]) {
  await writeFile(join(fixture, "assets/img/roles", image + ".webp"), image);
}
await mkdir(join(fixture, "assets/data"), { recursive: true });
for (const name of ["ru_RU", "en_GB", "az_AZ", "cs_CZ"]) {
  const role = {
    id: "poisoner",
    team: "minion",
    image: name === "az_AZ" ? "translated.webp" : ["token_g.webp", "token_e.webp"],
  };
  const roles = [
    role,
    { id: "voudon", team: "traveller", image: "voudon.webp" },
    { id: "acrobat", team: "townsfolk", image: "acrobat.webp" },
  ];
  await writeFile(
    join(fixture, "assets/data", name + ".js"),
    "var PG=" + JSON.stringify({ roles }) + ";",
  );
}
await run(process.execPath, [
  join(root, "scripts/build-offline.ts"),
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

const scope = "https://example.test/pocket/";
const scopedCache = (version: string) => version + ":" + scope;

type WorkerEvent = {
  clientId?: string;
  data?: Record<string, unknown>;
  source?: unknown;
  ports?: Array<{ postMessage: (data: Reply) => void }>;
  request?: { method: string; url: string; mode: string };
  respondWith?: (promise: Promise<unknown>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
};

interface Client {
  id: string;
  url: string;
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
  entries = new Map<string, Map<string, unknown>>(),
  workerScope = scope,
  cacheUnavailable = false,
  version = cacheName,
  match = async () => null,
  loadAsset = (request) => request.url,
  windows = [],
}: {
  entries?: Map<string, Map<string, unknown>>;
  workerScope?: string;
  cacheUnavailable?: boolean;
  version?: string;
  match?: (request: unknown) => Promise<unknown>;
  loadAsset?: (request: Request) => string;
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
  const requestUrl = (request: string | { url: string }): string =>
    new URL(typeof request === "string" ? request : request.url, workerScope).href;
  const timers = new Map<number, () => void>();
  let timerSeq = 0;
  const clients: Client[] = windows.map((window): Client => ({
    id: window.id,
    url: workerScope + "table",
    posts: [],
    postMessage(message, ports) {
      this.posts.push({ message, port: (ports && ports[0]) as Port });
    },
  }));
  const caches = {
    open: async (name: string) => {
      if (cacheUnavailable) throw new Error("CacheStorage unavailable");
      calls.opened.push(name);
      const files = entries.get(name) ?? new Map<string, unknown>();
      entries.set(name, files);
      return {
        addAll: async (inputs: (string | Request)[]) => {
          for (const input of inputs) {
            const request = typeof input === "string" ? new Request(requestUrl(input)) : input;
            calls.added.push(request.url);
            files.set(request.url, loadAsset(request));
          }
        },
        match: async (request: string | { url: string }) =>
          files.get(requestUrl(request)) ?? (await match(request)),
        put: async (request: string | { url: string }, response: unknown) =>
          files.set(requestUrl(request), response),
        keys: async () => Array.from(files.keys(), (url) => ({ url })),
        delete: async (request: { url: string }) => files.delete(request.url),
      };
    },
    keys: async () => {
      if (cacheUnavailable) throw new Error("CacheStorage unavailable");
      return [...entries.keys()];
    },
    delete: async (name: string) => {
      calls.deleted.push(name);
      return entries.delete(name);
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
    registration: { scope: workerScope },
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
    Request,
    Response,
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
  vm.runInContext(source.replace(cacheName, version), vm.createContext(context));
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
  return { calls, clients, dispatch, fire, runTimers, entries };
}

test("the generator requires an explicit root and output path", async () => {
  await assert.rejects(
    run(process.execPath, [join(root, "scripts/build-offline.ts")]),
    (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error && error.code === 2,
  );
});

test("the generated worker precaches one versioned asset set", async () => {
  assert.match(cacheName, /^pg-static-[0-9a-f]{16}$/);
  assert.ok(assets.includes("index.html"));
  assert.ok(assets.includes("assets/app-BBBBBBBB.js"));
  const { calls, fire } = createWorker();
  await fire("install");
  assert.deepEqual(calls.opened, [scopedCache(cacheName)]);
  assert.deepEqual(
    calls.added,
    assets.map((path) => new URL(path, scope).href),
  );
});

test("an install revalidates the earlier release's fresh shell and catalog before serving them offline", async () => {
  const oldEntry = "assets/app-AAAAAAAA.js";
  const newEntry = "assets/app-BBBBBBBB.js";
  const catalog = scope + "assets/data/ru_RU.js";
  const previous = new Map([
    [scope, oldEntry],
    [scope + "index.html", oldEntry],
    [catalog, "old catalog"],
  ]);
  const server = new Map([
    [scope, newEntry],
    [scope + "index.html", newEntry],
    [catalog, "new catalog"],
  ]);
  const worker = createWorker({
    loadAsset(request) {
      if (request.cache === "default" && previous.has(request.url))
        return previous.get(request.url)!;
      return server.get(request.url) ?? request.url;
    },
  });
  await worker.fire("install");
  const cache = worker.entries.get(scopedCache(cacheName))!;
  const shellEntry = cache.get(scope);
  assert.equal(shellEntry, newEntry);
  assert.ok(cache.has(scope + shellEntry), "the shell can boot offline with its cached entry");
  assert.equal(cache.get(scope + "index.html"), newEntry);
  assert.equal(cache.get(catalog), "new catalog");
});

test("the asset list keeps every reachable catalog and drops the rest", () => {
  assert.ok(assets.includes("assets/data/ru_RU.js"));
  assert.ok(assets.includes("assets/data/en_GB.js"));
  assert.ok(assets.includes("assets/data/az_AZ.js"));
  assert.ok(!assets.includes("assets/data/cs_CZ.js"), "an unreachable catalog is not precached");
});

test("offline navigation retains lazy chunks, selectable art and stylesheet fonts", () => {
  assert.ok(assets.includes("assets/reference-chunk.js"));
  assert.ok(assets.includes("assets/img/roles/token_e.webp"));
  assert.ok(assets.includes("assets/img/roles/translated.webp"));
  assert.ok(assets.includes("assets/img/roles/voudon.webp"));
  assert.ok(assets.includes("assets/fonts/body.woff2"));
  assert.ok(assets.includes("assets/fonts/title.woff2"));
  for (const unused of [
    "assets/img/roles/token_g.webp",
    "assets/img/roles/unused.webp",
    "assets/img/roles/acrobat.webp",
    "assets/fonts/unused.woff2",
  ]) {
    assert.ok(!assets.includes(unused), unused + " should not enter the precache");
  }
});

test("activation prunes older generated caches and keeps unrelated caches", async () => {
  const { calls, fire, entries } = createWorker({
    entries: new Map([
      ["pg-static-old", new Map([[scope, "old-shell"]])],
      [scopedCache(cacheName), new Map([[scope, "new-shell"]])],
      ["unrelated-cache", new Map()],
    ]),
  });
  await fire("activate");
  assert.deepEqual(calls.deleted, ["pg-static-old"]);
  assert.deepEqual([...entries.keys()].sort(), [scopedCache(cacheName), "unrelated-cache"].sort());
});

test("updating one of two installations of the same build preserves the other offline shell and assets", async () => {
  const sibling = scope + "second/";
  const entries = new Map<string, Map<string, unknown>>();
  const first = createWorker({ entries });
  const second = createWorker({ entries, workerScope: sibling });
  await first.fire("install");
  await first.fire("activate");
  await second.fire("install");
  await second.fire("activate");
  const update = createWorker({ entries, version: "pg-static-new-release" });
  await update.fire("install");
  await update.fire("activate");
  for (const [mode, path] of [
    ["navigate", "table"],
    ["cors", "assets/app-BBBBBBBB.js"],
  ] as const) {
    let response: Promise<unknown> | undefined;
    await second.fire("fetch", {
      request: { method: "GET", mode, url: sibling + path },
      respondWith: (promise) => {
        response = promise;
      },
    });
    assert.equal(await response, mode === "navigate" ? sibling : sibling + path);
  }
  assert.deepEqual(second.calls.fetched, []);
});

test("migrating a shared legacy cache preserves nested installations and unpins only the retiring shell", async () => {
  const sibling = scope + "second/";
  const old = "pg-static-shared-legacy";
  const files = new Map<string, unknown>([
    [scope, "old app"],
    [scope + ".pg-active-cache", old],
    [scope + "assets/route-AAAAAAAA.js", "old JS"],
    [sibling, "sibling app"],
    [sibling + ".pg-active-cache", old],
    [sibling + "assets/route-AAAAAAAA.js", "sibling JS"],
  ]);
  const entries = new Map([[old, files]]);
  const primary = createWorker({ entries, windows: [{ id: "old-tab" }] });
  await primary.fire("install");
  await primary.fire("activate");
  assert.deepEqual(
    [...entries.get(old)!.keys()].sort(),
    [sibling, sibling + ".pg-active-cache", sibling + "assets/route-AAAAAAAA.js"].sort(),
  );
  assert.equal(
    entries.get("pg-window-chunks:" + scope + ":old-tab")!.get(scope + "assets/route-AAAAAAAA.js"),
    "old JS",
  );
  const other = createWorker({ entries, workerScope: sibling });
  await other.fire("install");
  await other.fire("activate");
  assert.equal(entries.has(old), false);
});

test("a live old window can load its exact deferred chunks until it is replaced", async () => {
  const first = "pg-static-release1";
  const second = "pg-static-release2";
  const third = "pg-static-release3";
  const chunk1 = scope + "assets/bag-AAA11111.js";
  const chunk2 = scope + "assets/bag-BBB22222.js";
  const chunk3 = scope + "assets/bag-CCC33333.js";
  const catalog = scope + "assets/data/retired.js";
  const entries = new Map<string, Map<string, unknown>>([
    [
      scopedCache(first),
      new Map([
        [scope, "first"],
        [chunk1, "first JS"],
        [catalog, "stale data"],
      ]),
    ],
    ["pg-static-neighbor", new Map([["https://example.test/other/", "neighbor"]])],
  ]);
  await createWorker({ version: first, entries }).fire("activate");
  entries.set(
    scopedCache(second),
    new Map([
      [scope, "second"],
      [chunk2, "second JS"],
    ]),
  );
  await createWorker({ version: second, entries, windows: [{ id: "first-tab" }] }).fire("activate");
  entries.set(
    scopedCache(third),
    new Map([
      [scope, "third"],
      [chunk3, "third JS"],
    ]),
  );
  const worker = createWorker({
    version: third,
    entries,
    windows: [{ id: "first-tab" }, { id: "second-tab" }],
  });
  await worker.fire("activate");
  async function request(clientId: string, url: string, mode = "cors") {
    let response: Promise<unknown> | undefined;
    await worker.fire("fetch", {
      clientId,
      request: { method: "GET", mode, url },
      respondWith: (value) => {
        response = value;
      },
    });
    return await response;
  }
  assert.equal(await request("first-tab", chunk1), "first JS");
  assert.equal(await request("second-tab", chunk2), "second JS");
  assert.equal(await request("first-tab", catalog), "network");
  assert.equal(await request("first-tab", chunk1 + "?different"), "network");
  assert.equal(await request("new-tab", chunk1), "network");
  assert.equal(await request("new-tab", chunk3), "third JS");
  assert.ok(
    !entries.has(scopedCache(first)) && !entries.has(scopedCache(second)),
    "the full retired caches are gone",
  );
  assert.ok(entries.has("pg-static-neighbor"));
  worker.clients.splice(0, 2);
  await request("new-tab", scope + "table", "navigate");
  assert.deepEqual([...entries.keys()].sort(), ["pg-static-neighbor", scopedCache(third)].sort());
});

test("the worker activates only after an explicit SKIP_WAITING message", async () => {
  const { calls, dispatch, fire } = createWorker();
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
  await fire("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(calls.skipped, 1);
});

test("the worker answers a legacy preflight without asking another window", async () => {
  const { clients, dispatch } = createWorker({ windows: [{ id: "a" }] });
  const replies: Reply[] = [];
  dispatch("message", {
    data: { type: "PREPARE_UPDATE" },
    ports: [
      {
        postMessage: (data) => {
          replies.push(data);
        },
      },
    ],
  });
  await tick();
  assert.equal(replies.length, 1);
  assert.equal(replies[0].ok, true);
  assert.equal(clients[0].posts.length, 0, "no window is asked to save");
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

test("online navigation and lazy assets use the network once when reading the cache fails", async () => {
  for (const worker of [
    createWorker({ cacheUnavailable: true }),
    createWorker({
      match: async () => {
        throw new Error("CacheStorage read failed");
      },
    }),
  ]) {
    for (const [mode, path] of [
      ["navigate", "table"],
      ["cors", "assets/app-BBBBBBBB.js"],
    ] as const) {
      let response: Promise<unknown> | undefined;
      await worker.fire("fetch", {
        request: { method: "GET", mode, url: scope + path },
        respondWith: (promise) => {
          response = promise;
        },
      });
      assert.equal(await response, "network");
    }
    assert.deepEqual(worker.calls.fetched, [scope + "table", scope + "assets/app-BBBBBBBB.js"]);
  }
});

test.after(async () => {
  await rm(fixture, { recursive: true, force: true });
});
