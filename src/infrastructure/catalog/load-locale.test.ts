import assert from "node:assert/strict";
import test from "node:test";

test("the selected catalog survives out-of-order loads, failed requests, and Safari 16 startup", async (t) => {
  const browser: { PG?: { roles: { id: string; edition: string; team: string; name: string }[] } } =
    {};
  const requests: { src: string; onload(): void; onerror(): void }[] = [];
  const globals = {
    window: browser,
    document: {
      createElement: () => ({}),
      head: { append: (request: (typeof requests)[number]) => requests.push(request) },
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() =>
      descriptor
        ? Object.defineProperty(globalThis, key, descriptor)
        : Reflect.deleteProperty(globalThis, key),
    );
  }
  const descriptor = Object.getOwnPropertyDescriptor(Promise, "withResolvers")!;
  Object.defineProperty(Promise, "withResolvers", { ...descriptor, value: undefined });
  t.after(() => Object.defineProperty(Promise, "withResolvers", descriptor));
  const catalog = await import("./role-catalog.ts");
  function finish(file: string, name: string) {
    const request = requests.findLast((item) => item.src.endsWith(file));
    assert.ok(request, "catalog requested: " + file);
    browser.PG = { roles: [{ id: "chef", edition: "tb", team: "townsfolk", name }] };
    request.onload();
  }
  const initial = catalog.loadLocale("ru");
  await Promise.race([initial, Promise.resolve()]);
  finish("ru_RU.js", "Шеф-повар");
  await initial;
  const english = catalog.loadLocale("en");
  const azeri = catalog.loadLocale("az");
  finish("az_AZ.js", "Aşpaz");
  await azeri;
  finish("en_GB.js", "Chef");
  await english;
  assert.equal(catalog.currentLang(), "az");
  assert.equal(catalog.roleById("chef")?.name, "Aşpaz");
  assert.equal(browser.PG?.roles[0]?.name, "Aşpaz");

  const earlier = catalog.loadLocale("ru");
  const failed = catalog.loadLocale("en");
  requests.at(-1)!.onerror();
  await assert.rejects(failed);
  finish("ru_RU.js", "Шеф-повар");
  await earlier;
  assert.equal(catalog.currentLang(), "az");
  assert.equal(catalog.allRoles()[0]?.name, "Aşpaz");

  const sheet = new AbortController();
  const pending = catalog.loadLocale("en", sheet.signal);
  sheet.abort();
  finish("en_GB.js", "Chef");
  assert.equal(await pending, false);
  assert.equal(catalog.currentLang(), "az");
  assert.equal(browser.PG?.roles[0]?.name, "Aşpaz");

  const committed = browser.PG;
  for (const unusable of [committed, undefined, {}, { roles: [] }, { roles: [null] }]) {
    const pending = catalog.loadLocale("ru");
    Reflect.set(browser, "PG", unusable);
    requests.at(-1)!.onload();
    await assert.rejects(pending, /catalog/i);
    assert.equal(browser.PG, committed);
    assert.equal(catalog.currentLang(), "az");
    assert.equal(catalog.roleById("chef")?.name, "Aşpaz");
  }
  const retry = catalog.loadLocale("ru");
  finish("ru_RU.js", "Повар");
  assert.equal(await retry, true);
  assert.equal(catalog.roleById("chef")?.name, "Повар");
});
