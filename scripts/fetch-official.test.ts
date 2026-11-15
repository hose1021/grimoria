import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { parsePinnedRevisions, snapshotFileName } from "./official-pins.ts";
import type { Manifest } from "./fetch-official.ts";
import { checkDrift, sync } from "./fetch-official.ts";

const roots: string[] = [];
after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const MATRIX = [
  "| [Trouble Brewing](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=100) | r100 |",
  "| [Sects & Violets](https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=200) | r200 |",
  "| [Trouble Brewing again](https://wiki.bloodontheclocktower.com/index.php?title=Trouble_Brewing&oldid=100) | r100 |",
].join("\n");

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "official-fetch-"));
  roots.push(root);
  await mkdir(join(root, "docs", "official"), { recursive: true });
  await writeFile(join(root, "docs", "rules-matrix.md"), MATRIX);
  await writeFile(
    join(root, "docs", "official", "manifest.json"),
    `${JSON.stringify({ version: 1, files: [] }, null, 2)}\n`,
  );
  return root;
}

const quiet = { log: () => {} };

function fakeWiki({ pinned = true } = {}) {
  const pages = new Map<number, { content: string; timestamp: string; title: string }>([
    [
      100,
      {
        title: "Trouble Brewing",
        timestamp: "2024-01-01T00:00:00Z",
        content: "Trouble Brewing text\n",
      },
    ],
    [
      200,
      {
        title: "Sects & Violets",
        timestamp: "2024-02-02T00:00:00Z",
        content: "Sects & Violets text\n",
      },
    ],
  ]);
  const calls: string[] = [];
  async function request(url: string) {
    calls.push(url);
    const params = new URL(url).searchParams;
    const revids = params.get("revids");
    if (revids) {
      const page = pages.get(Number(revids));
      if (!page) throw new Error(`unexpected revision ${revids}`);
      return {
        batchcomplete: true,
        query: {
          pages: [
            {
              title: page.title,
              revisions: [
                {
                  revid: Number(revids),
                  timestamp: page.timestamp,
                  slots: { main: { content: page.content } },
                },
              ],
            },
          ],
        },
      };
    }
    const titles = (params.get("titles") || "").split("|");
    const latest: Record<string, number> = { "Trouble Brewing": 100, "Sects & Violets": 200 };
    return {
      batchcomplete: true,
      query: {
        pages: titles.map((title) => ({
          title,
          revisions: [{ revid: pinned ? (latest[title] ?? 0) : 900 }],
        })),
      },
    };
  }
  return { request, calls, pages };
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

test("the matrix parser deduplicates pins and decodes titles", () => {
  const pins = parsePinnedRevisions(MATRIX);
  assert.equal(pins.length, 2);
  assert.deepEqual(
    pins.map((pin) => pin.title),
    ["Sects & Violets", "Trouble Brewing"],
  );
  assert.equal(snapshotFileName("Sects & Violets", 200), "Sects_&_Violets.r200.wikitext");
  assert.equal(
    pins.find((pin) => pin.title === "Sects & Violets")?.source,
    "https://wiki.bloodontheclocktower.com/index.php?title=Sects_%26_Violets&oldid=200",
  );
});

test("the real matrix yields every pinned revision", async () => {
  const matrix = await readFile(new URL("../docs/rules-matrix.md", import.meta.url), "utf8");
  const pins = parsePinnedRevisions(matrix);
  assert.equal(pins.length, 79);
  assert.ok(pins.some((pin) => pin.title === "Washerwoman" && pin.revid === 2630));
});

test("sync writes one localOnly snapshot per pin", async () => {
  const root = await fixture();
  const wiki = fakeWiki();
  const result = await sync({
    ...quiet,
    root,
    request: wiki.request,
    delay: 0,
    now: new Date("2026-11-15"),
  });
  assert.equal(result.written.length, 2);
  const manifest: Manifest = JSON.parse(
    await readFile(join(root, "docs", "official", "manifest.json"), "utf8"),
  );
  assert.equal(manifest.files.length, 2);
  for (const entry of manifest.files) {
    assert.equal(entry.localOnly, true);
    assert.equal(entry.retrieved, "2026-11-15");
    assert.match(entry.source, /index\.php\?title=/);
    assert.equal(entry.sha256, sha(wiki.pages.get(entry.revid)?.content ?? ""));
  }
  const file = join(root, "docs", "official", "wiki", "Trouble_Brewing.r100.wikitext");
  assert.equal(await readFile(file, "utf8"), "Trouble Brewing text\n");
});

test("a second run leaves the manifest and snapshots byte-identical", async () => {
  const root = await fixture();
  const wiki = fakeWiki();
  const options = { ...quiet, root, request: wiki.request, delay: 0, now: new Date("2026-11-15") };
  await sync(options);
  const manifestPath = join(root, "docs", "official", "manifest.json");
  const before = await readFile(manifestPath, "utf8");
  const filesBefore = await readdir(join(root, "docs", "official", "wiki"));
  const result = await sync({ ...options, now: new Date("2026-12-01") });
  assert.equal(await readFile(manifestPath, "utf8"), before);
  assert.deepEqual(await readdir(join(root, "docs", "official", "wiki")), filesBefore);
  assert.equal(result.written.length, 0);
  assert.equal(result.unchanged.length, 2);
});

test("changed content updates the hash and the retrieval date only", async () => {
  const root = await fixture();
  const wiki = fakeWiki();
  await sync({ ...quiet, root, request: wiki.request, delay: 0, now: new Date("2026-11-15") });
  const trouble: { content: string } | undefined = wiki.pages.get(100);
  if (!trouble) throw new Error("the fixture lost its Trouble Brewing page");
  trouble.content = "Trouble Brewing text, edited\n";
  const result = await sync({
    ...quiet,
    root,
    request: wiki.request,
    delay: 0,
    now: new Date("2026-12-01"),
  });
  assert.deepEqual(result.written, ["docs/official/wiki/Trouble_Brewing.r100.wikitext"]);
  const manifest: Manifest = JSON.parse(
    await readFile(join(root, "docs", "official", "manifest.json"), "utf8"),
  );
  const changed = manifest.files.find((entry) => entry.revid === 100);
  assert.equal(changed?.retrieved, "2026-12-01");
  assert.equal(changed?.sha256, sha("Trouble Brewing text, edited\n"));
  const kept = manifest.files.find((entry) => entry.revid === 200);
  assert.equal(kept?.retrieved, "2026-11-15");
});

test("a title mismatch aborts without writing a snapshot", async () => {
  const root = await fixture();
  const wiki = fakeWiki();
  const original = wiki.request;
  wiki.request = async (url: string) => {
    const data = await original(url);
    const page = data.query?.pages?.[0];
    if (page && new URL(url).searchParams.get("revids") === "100") page.title = "Wrong title";
    return data;
  };
  await assert.rejects(
    sync({ ...quiet, root, request: wiki.request, delay: 0, now: new Date("2026-11-15") }),
    /matrix pins/,
  );
  assert.equal(
    existsSync(join(root, "docs", "official", "wiki", "Trouble_Brewing.r100.wikitext")),
    false,
  );
  const manifest: Manifest = JSON.parse(
    await readFile(join(root, "docs", "official", "manifest.json"), "utf8"),
  );
  assert.equal(
    manifest.files.some((entry) => entry.revid === 100),
    false,
  );
});

test("drift names every moved page, writes nothing and exits 1", async () => {
  const root = await fixture();
  await sync({
    ...quiet,
    root,
    request: fakeWiki().request,
    delay: 0,
    now: new Date("2026-11-15"),
  });
  const manifestPath = join(root, "docs", "official", "manifest.json");
  const before = await readFile(manifestPath, "utf8");
  const logged: string[] = [];
  const result = await checkDrift({
    root,
    request: fakeWiki({ pinned: false }).request,
    log: (line) => logged.push(line),
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.drift.length, 2);
  assert.deepEqual(logged, [
    "Sects & Violets: pinned r200, latest r900",
    "Trouble Brewing: pinned r100, latest r900",
  ]);
  assert.equal(await readFile(manifestPath, "utf8"), before);
});

test("drift exits 0 when every pin is the latest revision", async () => {
  const root = await fixture();
  await sync({
    ...quiet,
    root,
    request: fakeWiki().request,
    delay: 0,
    now: new Date("2026-11-15"),
  });
  const result = await checkDrift({ root, request: fakeWiki().request, log: () => {} });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.drift, []);
});
