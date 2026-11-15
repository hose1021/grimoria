#!/usr/bin/env node
// Build a per-role reference from the pinned wiki revisions and official data.
// No dependencies, no network: reads only docs/official/.
//
// Output is generated wiki text, so it follows the same licensing gate as the
// snapshots: docs/reference/ is ignored until the owner permits committing it.
// Rebuild with `node scripts/build-official-roles.mjs`.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { snapshotPath } from "./official-pins.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EDITIONS = ["tb", "bmr", "snv"];
const EDITION_TITLES = {
  tb: "Trouble Brewing",
  bmr: "Bad Moon Rising",
  snv: "Sects & Violets",
};
const TEAMS = ["townsfolk", "outsider", "minion", "demon"];
const TEAM_TITLES = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function section(text, name) {
  const header = new RegExp(
    `^==\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*==\\s*$`,
    "m",
  );
  const start = text.search(header);
  if (start === -1) return "";
  const rest = text.slice(start).split("\n").slice(1).join("\n");
  const end = rest.search(/^==[^=]/m);
  return end === -1 ? rest : rest.slice(0, end);
}

function clean(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/__TOC__/g, "")
    .replace(/\[\[File:[^\]]*\]\]/gi, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const parts = inner.split("|");
      return parts.length > 1 ? parts[parts.length - 1].trim() : "";
    })
    .replace(/<[^>]+>/g, "")
    .replace(/'''([^']+)'''/g, "**$1**")
    .replace(/''([^']+)''/g, "*$1*")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bullets(text) {
  return text
    .split(/\n\s*[*-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith("*") ? part.slice(1).trim() : part));
}

function exampleBlocks(text) {
  const blocks = [...text.matchAll(/<div class=['"]example['"]>([\s\S]*?)<\/div>/gi)];
  if (!blocks.length) return bullets(clean(text));
  return blocks.map((block) => clean(block[1])).filter(Boolean);
}

function writeIfChanged(root, relativePath, content) {
  const file = resolve(root, relativePath);
  const next = `${content.trimEnd()}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") === next) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, next);
  return true;
}

// A section that survives cleaning with wiki markup means the parser missed a
// construct. Fail loudly instead of publishing a half-converted reference.
const MARKUP = /\{\{|\[\[|<\/?(?:div|span|p|table|tbody|tr|td|th)\b|:reminder:|__TOC__/i;

function requireText(value, where) {
  if (!value) throw new Error(`${where} is empty; the pinned page changed or the parser missed it`);
  if (MARKUP.test(value)) throw new Error(`${where} still contains wiki markup after cleaning`);
  return value;
}

function emit(root, relativePath, content, check, written, stale) {
  if (!check) {
    if (writeIfChanged(root, relativePath, content)) written.push(relativePath);
    return;
  }
  const file = resolve(root, relativePath);
  const next = `${content.trimEnd()}\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== next) stale.push(relativePath);
}

function reminder(text) {
  return text
    .replace(/:reminder:/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\*([^*]+)\*/g, "**$1**");
}

function wakeSummary(role) {
  const first = Boolean(role.firstNightReminder);
  const other = Boolean(role.otherNightReminder);
  if (first && other) return "first and other nights";
  if (first) return "first night only";
  if (other) return "other nights only";
  return "does not wake";
}

function roleMarkdown(role, context) {
  const { entry, jinxes, scenario } = context;
  const lines = [
    `# ${role.name}`,
    "",
    `- Role id: \`${role.id}\``,
    `- Team: ${TEAM_TITLES[role.team]}`,
    `- Scenario: ${scenario}`,
    `- Setup: ${role.setup ? "changes the number of characters in play" : "none"}`,
    `- Reminder tokens: ${role.reminders?.length ? role.reminders.join(", ") : "none"}`,
    `- Wakes: ${wakeSummary(role)}`,
  ];
  if (role.firstNightReminder)
    lines.push(`- First-night prompt: ${reminder(role.firstNightReminder)}`);
  if (role.otherNightReminder)
    lines.push(`- Other-night prompt: ${reminder(role.otherNightReminder)}`);
  lines.push(
    `- Pinned source: [${role.name} r${entry.revid}](${entry.source})`,
    `- Local snapshot: \`${entry.path}\``,
    "",
    "## Ability",
    "",
    `> ${role.ability}`,
  );
  if (context.summary.length) {
    lines.push("", "## Clarifications", "", ...context.summary.map((item) => `- ${item}`));
  }
  lines.push("", "## How to Run", "", context.howToRun);
  if (context.examples.length) {
    lines.push("", "## Examples", "", ...context.examples.map((item) => `- ${item}`));
  }
  const pairs = jinxes.get(role.id) ?? [];
  if (pairs.length) {
    lines.push("", "## Jinxes", "");
    for (const pair of pairs) {
      lines.push(`- **${role.name} + ${pair.name}**: ${pair.reason}`);
    }
  }
  return lines.join("\n");
}

function scenarioMarkdown(edition, roles, text, entry) {
  const lines = [
    `# ${EDITION_TITLES[edition]}`,
    "",
    `- Pinned source: [${EDITION_TITLES[edition]} r${entry.revid}](${entry.source})`,
    `- Local snapshot: \`${entry.path}\``,
  ];
  const synopsis = requireText(
    clean(section(text, "Synopsis")),
    `${EDITION_TITLES[edition]} Synopsis`,
  );
  if (synopsis) lines.push("", "## Synopsis", "", synopsis);
  const gameplay = requireText(
    clean(section(text, "Gameplay")),
    `${EDITION_TITLES[edition]} Gameplay`,
  );
  if (gameplay) lines.push("", "## Gameplay", "", gameplay);
  for (const team of TEAMS) {
    const teamRoles = roles.filter((role) => role.team === team);
    if (!teamRoles.length) continue;
    lines.push("", `## ${TEAM_TITLES[team]} (${teamRoles.length})`, "");
    lines.push("| Role | Ability |", "| --- | --- |");
    for (const role of teamRoles) {
      lines.push(`| [${role.name}](../roles/${role.id}.md) | ${role.ability} |`);
    }
  }
  return lines.join("\n");
}

function indexMarkdown(roles) {
  const lines = [
    "# Role reference",
    "",
    "Generated from the pinned wiki revisions; rebuild with",
    "`node scripts/build-official-roles.mjs`.",
    "",
  ];
  for (const edition of EDITIONS) {
    lines.push(`## ${EDITION_TITLES[edition]}`, "");
    for (const team of TEAMS) {
      const teamRoles = roles
        .filter((role) => role.edition === edition && role.team === team)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!teamRoles.length) continue;
      lines.push(
        `${TEAM_TITLES[team]}: ${teamRoles.map((role) => `[${role.name}](roles/${role.id}.md)`).join(", ")}`,
        "",
      );
    }
    lines.push(`[Scenario reference](scenarios/${edition}.md)`, "");
  }
  return lines.join("\n");
}

export function build({ root = REPO, log = console.log, check = false } = {}) {
  const official = join(root, "docs", "official");
  const roles = readJson(join(official, "roles.json")).filter(
    (role) => EDITIONS.includes(role.edition) && TEAMS.includes(role.team),
  );
  const jinxData = readJson(join(official, "jinxes.json"));
  const manifest = readJson(join(official, "manifest.json"));
  const entries = new Map(
    manifest.files.filter((entry) => entry.title).map((entry) => [entry.title, entry]),
  );
  const names = new Map(readJson(join(official, "roles.json")).map((role) => [role.id, role.name]));
  const supported = new Set(roles.map((role) => role.id));

  const jinxes = new Map();
  for (const pair of jinxData.jinxes) {
    for (const other of pair.jinx) {
      if (!supported.has(pair.id) || !supported.has(other.id)) continue;
      for (const [roleId, otherId] of [
        [pair.id, other.id],
        [other.id, pair.id],
      ]) {
        if (!jinxes.has(roleId)) jinxes.set(roleId, []);
        jinxes.get(roleId).push({ name: names.get(otherId) ?? otherId, reason: other.reason });
      }
    }
  }
  for (const list of jinxes.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const written = [];
  const stale = [];
  const expected = new Set();
  for (const role of roles) {
    const entry = entries.get(role.name);
    if (!entry) throw new Error(`no pinned revision for ${role.name}; run fetch-official.mjs`);
    if (entry.path !== snapshotPath(entry.title, entry.revid))
      throw new Error(`${role.name} snapshot path does not match the pin: ${entry.path}`);
    const file = join(root, entry.path);
    if (!existsSync(file)) throw new Error(`${entry.path} is missing; run fetch-official.mjs`);
    const text = readFileSync(file, "utf8");
    requireText(clean(section(text, "Summary")), `${role.name} Summary`);
    const summary = bullets(clean(section(text, "Summary")))
      .map((item) => item.replace(/^["“][^"”]*["”]\s*/, "").trim())
      .filter((item) => item.length > 0 && item !== role.ability);
    const howToRun = requireText(clean(section(text, "How to Run")), `${role.name} How to Run`);
    const examples = exampleBlocks(section(text, "Examples")).map((example) =>
      requireText(example, `${role.name} Examples`),
    );
    if (!examples.length) throw new Error(`${role.name} has no examples`);
    const content = roleMarkdown(role, {
      entry,
      jinxes,
      summary,
      howToRun,
      examples,
      scenario: EDITION_TITLES[role.edition],
    });
    const path = `docs/reference/roles/${role.id}.md`;
    expected.add(path);
    emit(root, path, content, check, written, stale);
  }

  for (const edition of EDITIONS) {
    const entry = entries.get(EDITION_TITLES[edition]);
    if (!entry) throw new Error(`no pinned revision for ${EDITION_TITLES[edition]}`);
    const text = readFileSync(join(root, entry.path), "utf8");
    const editionRoles = roles.filter((role) => role.edition === edition);
    const path = `docs/reference/scenarios/${edition}.md`;
    expected.add(path);
    emit(root, path, scenarioMarkdown(edition, editionRoles, text, entry), check, written, stale);
  }

  expected.add("docs/reference/README.md");
  emit(root, "docs/reference/README.md", indexMarkdown(roles), check, written, stale);

  if (check) {
    for (const dir of ["roles", "scenarios"]) {
      const full = join(root, "docs", "reference", dir);
      if (!existsSync(full)) continue;
      for (const name of readdirSync(full))
        if (!expected.has(`docs/reference/${dir}/${name}`))
          stale.push(`docs/reference/${dir}/${name}`);
    }
    return { written, stale, roles: roles.length };
  }

  log(
    `Role reference: ${roles.length} roles, ${EDITIONS.length} scenarios, ${written.length} file(s) written.`,
  );
  return { written, stale, roles: roles.length };
}

async function main() {
  const index = process.argv.indexOf("--root");
  const root = resolve(index === -1 ? REPO : process.argv[index + 1]);
  const check = process.argv.includes("--check");
  try {
    const result = build({ root, check });
    if (check && result.stale.length) {
      console.error(`Role reference is stale or incomplete (${result.stale.length} file(s)):`);
      for (const path of result.stale) console.error(`  - ${path}`);
      process.exit(1);
    }
    if (check) console.log(`Role reference is up to date: ${result.roles} roles, 3 scenarios.`);
  } catch (error) {
    console.error(`Role reference build failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
