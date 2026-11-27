// The reference page reads two generated datasets. A rule added to the matrix
// changes the English file; this test keeps the Russian file in step and keeps
// internal rule ids out of the text the Storyteller reads.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface Rule {
  id: string;
  status: string;
  when: string;
  behavior: string;
  decision: string;
  examples: string[];
}

interface Entry {
  name: string;
  ability: string;
  oldid: number;
  url: string;
  rules: Rule[];
  interactions: Array<{ roleId: string; name: string; reason: string }>;
}

const load = (file: string): Record<string, Entry> =>
  JSON.parse(
    readFileSync(new URL(`../../../../public/assets/data/${file}`, import.meta.url), "utf8"),
  ).roles;

test("the Russian reference mirrors every rule and example of the English dataset", () => {
  const en = load("reference.json");
  const ru = load("reference.ru.json");
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort());
  for (const [id, source] of Object.entries(en)) {
    const translated = ru[id]!;
    assert.deepEqual(
      translated.rules.map((rule) => rule.id),
      source.rules.map((rule) => rule.id),
      id,
    );
    for (const [index, rule] of source.rules.entries()) {
      const copy = translated.rules[index]!;
      assert.equal(copy.status, rule.status, `${id} ${rule.id} status`);
      assert.equal(copy.examples.length, rule.examples.length, `${id} ${rule.id} examples`);
      assert.ok(copy.behavior.length > 10, `${id} ${rule.id} behavior`);
      assert.ok(copy.decision.length > 3, `${id} ${rule.id} decision`);
      assert.ok(copy.when.length > 0, `${id} ${rule.id} when`);
    }
    assert.deepEqual(
      translated.interactions.map((entry) => entry.roleId),
      source.interactions.map((entry) => entry.roleId),
      `${id} interactions`,
    );
    for (const interaction of source.interactions)
      assert.ok(Object.hasOwn(en, interaction.roleId), `${id} link ${interaction.roleId}`);
  }
});

test("the reference shows only user-facing rule text, not internal rule ids", () => {
  const en = load("reference.json");
  const ru = load("reference.ru.json");
  const total = Object.values(en).reduce((count, entry) => count + entry.rules.length, 0);
  assert.equal(total, 130);
  for (const [id, entry] of Object.entries(ru)) {
    for (const rule of entry.rules) {
      const text = [rule.when, rule.behavior, rule.decision, ...rule.examples].join(" ");
      assert.doesNotMatch(text, /\b(?:SYS|INFO)-/, `${id} ${rule.id}`);
    }
  }
});

test("concurrent reference requests share each attempt and a failed load can be retried", async (t) => {
  const { loadReference } = await import("./data.ts");
  const dataset = { roles: {} };
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json(dataset));
  fetchMock.mock.mockImplementationOnce(async () => new Response(null, { status: 503 }));
  const url = "/assets/data/test-reference.json";
  const first = loadReference(url);
  assert.equal(loadReference(url), first);
  await assert.rejects(first, /503/);
  const second = loadReference(url);
  assert.equal(loadReference(url), second);
  assert.deepEqual(await second, dataset);
  assert.deepEqual(await loadReference(url), dataset);
  assert.equal(fetchMock.mock.callCount(), 2);
});
