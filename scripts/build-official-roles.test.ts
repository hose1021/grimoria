import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { snapshotPath } from "./official-pins.ts";
import type { ManifestEntry } from "./build-official-roles.ts";
import { build } from "./build-official-roles.ts";

const roots: string[] = [];
after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const ROLE_SECTIONS = (ability: string, run: string, examples: string): string =>
  [
    "== Summary ==",
    `"${ability}"`,
    "",
    "A one-line clarification.",
    run ? `== How to Run ==\n${run}` : "",
    examples ? `== Examples ==\n${examples}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const ROLES = [
  {
    id: "washerwoman",
    name: "Washerwoman",
    edition: "tb",
    team: "townsfolk",
    ability: "You start knowing that 1 of 2 players is a particular Townsfolk.",
    firstNightReminder: "Point to both the *TOWNSFOLK* and *WRONG* players.",
    reminders: ["Townsfolk", "Wrong"],
    setup: false,
  },
  {
    id: "recluse",
    name: "Recluse",
    edition: "tb",
    team: "outsider",
    ability: "You might register as evil & as a Minion or Demon, even if dead.",
    reminders: ["Evil"],
    setup: false,
  },
  {
    id: "sage",
    name: "Sage",
    edition: "snv",
    team: "townsfolk",
    ability: "If the Demon kills you, you learn that it is 1 of 2 players.",
    otherNightReminder: "The Sage learns that one of two players is the Demon. :reminder:",
    reminders: ["Demon"],
    setup: false,
  },
  {
    id: "steward",
    name: "Steward",
    edition: "carousel",
    team: "townsfolk",
    ability: "You start knowing 1 good player.",
    setup: false,
  },
];

const SCENARIOS: [string, number][] = [
  ["Trouble Brewing", 20],
  ["Bad Moon Rising", 21],
  ["Sects & Violets", 22],
];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "official-roles-"));
  roots.push(root);
  const official = join(root, "docs", "official");
  await mkdir(official, { recursive: true });
  await writeFile(join(official, "roles.json"), JSON.stringify(ROLES));
  await writeFile(
    join(official, "jinxes.json"),
    JSON.stringify({
      jinxes: [
        {
          id: "recluse",
          jinx: [{ id: "sage", reason: "The Recluse might register as the Demon to the Sage." }],
        },
      ],
    }),
  );
  const entries: ManifestEntry[] = [];
  for (const role of ROLES.filter((role) => role.edition !== "carousel")) {
    const revid = 100 + entries.length;
    const path = snapshotPath(role.name, revid);
    entries.push({
      path,
      source: `https://wiki.example/index.php?title=${role.name}&oldid=${revid}`,
      title: role.name,
      revid,
      localOnly: true,
    });
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(
      join(root, path),
      ROLE_SECTIONS(role.ability, "Run the role.", "Example text."),
    );
  }
  for (const [title, revid] of SCENARIOS) {
    const path = snapshotPath(title, revid);
    entries.push({
      path,
      source: `https://wiki.example/index.php?title=${title}&oldid=${revid}`,
      title,
      revid,
      localOnly: true,
    });
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(
      join(root, path),
      `== Synopsis ==\nProse for ${title}.\n== Gameplay ==\nGameplay for ${title}.\n`,
    );
  }
  await writeFile(join(official, "manifest.json"), JSON.stringify({ version: 1, files: entries }));
  return root;
}

test("one markdown file per supported role, with cleaned sections", async () => {
  const root = await fixture();
  const result = build({ root, log: () => {} });
  assert.equal(result.roles, 3);
  const role = await readFile(join(root, "docs", "reference", "roles", "washerwoman.md"), "utf8");
  assert.match(role, /You start knowing that 1 of 2 players/);
  assert.match(role, /Wakes: first night only/);
  assert.match(role, /Point to both the \*\*TOWNSFOLK\*\* and \*\*WRONG\*\* players\./);
  assert.match(role, /## How to Run/);
  assert.match(role, /## Examples/);
  assert.doesNotMatch(role, /\{\{|\[\[|:reminder:|<div/);
  assert.equal(existsSync(join(root, "docs", "reference", "roles", "steward.md")), false);
});

test("a supported jinx pair appears on both roles", async () => {
  const root = await fixture();
  build({ root, log: () => {} });
  for (const id of ["recluse", "sage"]) {
    const text = await readFile(join(root, "docs", "reference", "roles", `${id}.md`), "utf8");
    assert.match(text, /## Jinxes/);
    assert.match(text, /might register as the Demon to the Sage/);
  }
});

test("wake state comes from the official reminders", async () => {
  const root = await fixture();
  build({ root, log: () => {} });
  const recluse = await readFile(join(root, "docs", "reference", "roles", "recluse.md"), "utf8");
  const sage = await readFile(join(root, "docs", "reference", "roles", "sage.md"), "utf8");
  assert.match(recluse, /Wakes: does not wake/);
  assert.match(sage, /Wakes: other nights only/);
  assert.match(
    sage,
    /Other-night prompt: The Sage learns that one of two players is the Demon\.\n/,
  );
});

test("scenario documents link every role and carry the pinned revision", async () => {
  const root = await fixture();
  build({ root, log: () => {} });
  const scenario = await readFile(join(root, "docs", "reference", "scenarios", "tb.md"), "utf8");
  assert.match(scenario, /\[Washerwoman\]\(\.\.\/roles\/washerwoman\.md\)/);
  assert.match(scenario, /\[Recluse\]\(\.\.\/roles\/recluse\.md\)/);
  assert.match(scenario, /Prose for Trouble Brewing/);
  assert.match(scenario, /oldid=20/);
});

test("a second build writes nothing", async () => {
  const root = await fixture();
  build({ root, log: () => {} });
  const result = build({ root, log: () => {} });
  assert.deepEqual(result.written, []);
});

test("a missing snapshot fails with the fetch command", async () => {
  const root = await fixture();
  await rm(join(root, snapshotPath("Washerwoman", 100)));
  assert.throws(() => build({ root, log: () => {} }), /run fetch-official\.ts/);
});

test("a missing How to Run fails the build", async () => {
  const root = await fixture();
  const path = join(root, snapshotPath("Washerwoman", 100));
  await writeFile(
    path,
    "\"Ability.\"\n== Summary ==\nA line.\n== Examples ==\n<div class='example'>Text.</div>\n",
  );
  assert.throws(() => build({ root, log: () => {} }), /Washerwoman How to Run is empty/);
});

test("leftover wiki markup fails the build", async () => {
  const root = await fixture();
  const path = join(root, snapshotPath("Washerwoman", 100));
  await writeFile(
    path,
    `${ROLE_SECTIONS("Ability.", "Run it with {{Unclosed template.", "Example.")}\n`,
  );
  assert.throws(() => build({ root, log: () => {} }), /still contains wiki markup/);
});

test("check mode reports missing, changed and extra files", async () => {
  const root = await fixture();
  build({ root, log: () => {} });
  const clean = build({ root, check: true, log: () => {} });
  assert.deepEqual(clean.stale, []);

  await rm(join(root, "docs", "reference", "roles", "washerwoman.md"));
  await writeFile(join(root, "docs", "reference", "roles", "extra.md"), "# Extra\n");
  const stale = build({ root, check: true, log: () => {} });
  assert.ok(stale.stale.includes("docs/reference/roles/washerwoman.md"));
  assert.ok(stale.stale.includes("docs/reference/roles/extra.md"));
  assert.deepEqual(stale.written, []);
});
