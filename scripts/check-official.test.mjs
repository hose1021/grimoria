import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./check-official.mjs", import.meta.url));
const roots = [];

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const sha = (text) => createHash("sha256").update(text).digest("hex");

function entry(name, content, extra = {}) {
  return {
    path: `docs/official/${name}`,
    source: `https://example.test/${name}`,
    retrieved: "2026-11-15",
    sha256: sha(content),
    ...extra,
  };
}

async function fixture({ files = {}, entries = [], matrix = "" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "official-check-"));
  roots.push(root);
  await mkdir(join(root, "docs", "official"), { recursive: true });
  await writeFile(join(root, "docs", "rules-matrix.md"), matrix);
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, "docs", "official", name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  const manifest = { version: 1, files: entries };
  await writeFile(
    join(root, "docs", "official", "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root], { encoding: "utf8" });
}

test("a tree that matches the manifest passes and writes nothing", async () => {
  const roles = "[]\n";
  const root = await fixture({
    files: { "roles.json": roles },
    entries: [entry("roles.json", roles)],
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 entr/);
});

test("one changed byte fails with a hash mismatch", async () => {
  const root = await fixture({
    files: { "roles.json": "[]\n" },
    entries: [entry("roles.json", "[]")],
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /hash mismatch/);
  assert.match(result.stderr, /roles\.json/);
});

test("a file without a manifest entry fails", async () => {
  const root = await fixture({
    files: { "roles.json": "[]\n", "extra.json": "{}\n" },
    entries: [entry("roles.json", "[]\n")],
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no manifest entry/);
  assert.match(result.stderr, /extra\.json/);
});

test("a manifest entry without a file fails", async () => {
  const root = await fixture({
    files: {},
    entries: [entry("gone.json", "[]\n")],
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing/);
  assert.match(result.stderr, /gone\.json/);
});

test("an absent localOnly snapshot does not fail", async () => {
  const root = await fixture({
    files: { "roles.json": "[]\n" },
    entries: [
      entry("roles.json", "[]\n"),
      entry("wiki/Washerwoman.r2630.wikitext", "text", { localOnly: true }),
    ],
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

test("a present localOnly snapshot is still verified", async () => {
  const root = await fixture({
    files: { "wiki/Washerwoman.r2630.wikitext": "edited" },
    entries: [entry("wiki/Washerwoman.r2630.wikitext", "text", { localOnly: true })],
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /hash mismatch/);
});

test("manifest.json and README.md need no entry", async () => {
  const root = await fixture({
    files: { "README.md": "# Official\n" },
    entries: [],
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

const PIN_MATRIX =
  "| [Washerwoman](https://wiki.bloodontheclocktower.com/index.php?title=Washerwoman&oldid=2630) | r2630 |\n";

test("a pinned revision without a manifest entry fails", async () => {
  const root = await fixture({
    files: { "roles.json": "[]\n" },
    entries: [entry("roles.json", "[]\n")],
    matrix: PIN_MATRIX,
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Washerwoman r2630 has no manifest entry/);
});

test("a covered pin passes", async () => {
  const root = await fixture({
    entries: [
      entry("wiki/Washerwoman.r2630.wikitext", "text", {
        title: "Washerwoman",
        revid: 2630,
        localOnly: true,
      }),
    ],
    matrix: PIN_MATRIX,
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});
