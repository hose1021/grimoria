import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import vm from "node:vm";
import { start, restorePath } from "./history-router.ts";

test("release shortcuts use native fragment navigation and Pages restores the fragment on direct visits", (t) => {
  const location = new URL("https://example.test/grimoria/changelog");
  const document = new EventTarget();
  class Anchor {
    href = new URL("#release-0.1.0", location).href;
    closest() {
      return this;
    }
    hasAttribute() {
      return false;
    }
  }
  for (const [key, value] of Object.entries({
    window: Object.assign(new EventTarget(), { location }),
    document,
    Element: Anchor,
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() =>
      descriptor
        ? Object.defineProperty(globalThis, key, descriptor)
        : Reflect.deleteProperty(globalThis, key),
    );
  }
  let routes = 0;
  start({ root: "/grimoria/", handler: () => routes++ });
  const click = Object.assign(new Event("click", { cancelable: true }), { button: 0 });
  Object.defineProperty(click, "target", { value: new Anchor() });
  document.dispatchEvent(click);
  assert.equal(click.defaultPrevented, false);
  assert.equal(routes, 1);
  assert.equal(
    restorePath("/grimoria/changelog#release-0.1.0"),
    "/grimoria/changelog#release-0.1.0",
  );
});

test("a Pages deep link restores its local path, query and fragment when session storage is unavailable", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "pg-pages-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const generator = fileURLToPath(new URL("../../../scripts/build-fallback.ts", import.meta.url));
  const location = new URL("https://example.test/");
  const navigate = (value: string) => {
    location.href = new URL(value, location).href;
  };
  let legacyRoute: string | null = null;
  const storage = {
    setItem() {
      throw new Error("Storage is full");
    },
    getItem() {
      return legacyRoute;
    },
    removeItem() {
      legacyRoute = null;
    },
  };
  const history = {
    replaceState(_data: unknown, _title: string, value: string) {
      navigate(value);
    },
  };
  for (const [key, value] of Object.entries({
    window: Object.assign(new EventTarget(), { location, history }),
    document: new EventTarget(),
    sessionStorage: storage,
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() =>
      descriptor
        ? Object.defineProperty(globalThis, key, descriptor)
        : Reflect.deleteProperty(globalThis, key),
    );
  }
  for (const root of ["/", "/grimoria/"]) {
    await promisify(execFile)(process.execPath, [generator, "--root", dir], {
      env: { ...process.env, BASE_PATH: root },
    });
    const html = await readFile(join(dir, "404.html"), "utf8");
    const script = html.match(/<script>([\s\S]+?)<\/script>/)?.[1];
    assert.ok(script);
    const requested = root + "reference/empath/?from=shared%20sheet#ability";
    navigate(requested);
    vm.runInNewContext(script, {
      location: Object.assign(location, { replace: navigate }),
      sessionStorage: storage,
    });
    assert.equal(location.pathname, root, "the redirect loads the configured app entry");
    let rendered = "";
    start({
      root,
      handler: (route) => {
        rendered = route;
      },
    });
    assert.equal(rendered, "/reference/empath");
    assert.equal(location.pathname + location.search + location.hash, requested.replace("/?", "?"));
  }
  navigate("/grimoria/");
  legacyRoute = "/grimoria/table?old=1";
  start({ root: "/grimoria/", handler() {} });
  assert.equal(
    location.pathname + location.search,
    "/grimoria/table?old=1",
    "an older fallback can still hand off its stored route",
  );
  navigate("/grimoria/#/../elsewhere");
  start({ root: "/grimoria/", handler() {} });
  assert.equal(location.pathname, "/grimoria/", "a route fragment cannot leave the deployment");
});
