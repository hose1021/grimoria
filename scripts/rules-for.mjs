#!/usr/bin/env node
// One role's rule dossier: the official text, the matrix rows, the spec
// requirements, the tests that carry its rule identifiers and its jinxes.
// Reads committed files only; no network, no dependencies.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = (path) => pathToFileURL(join(ROOT, path)).href;
const IDENTIFIER = /\b(?:TB|BMR|SNV)-[A-Z]+-\d{2}\b/g;

const roleId = process.argv[2];
if (!roleId) {
  console.error("usage: node scripts/rules-for.mjs <roleId>");
  process.exit(1);
}

const { SUPPORTED_ROLES } = await import(moduleUrl("src/core/model/rules.ts"));
const { JINX_PAIRS } = await import(moduleUrl("src/core/model/jinxes.ts"));
if (!SUPPORTED_ROLES.includes(roleId)) {
  console.error(`unknown role: ${roleId}`);
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function roleDocument() {
  const role = JSON.parse(readFileSync(join(ROOT, "docs", "official", "roles.json"), "utf8")).find(
    (candidate) => candidate.id === roleId,
  );
  if (!role) {
    console.error(`no official snapshot entry for ${roleId}`);
    process.exit(1);
  }
  return role;
}

const role = roleDocument();
const ruleDoc = readFileSync(join(ROOT, "src", "core", "roles", roleId, "rule.md"), "utf8");
const identifiers = [...new Set(ruleDoc.match(IDENTIFIER) ?? [])];
const identifierSet = new Set(identifiers);

const out = [];
out.push(`# ${role.name} (${roleId})`);
out.push("");
out.push(`Edition: ${role.edition}. Team: ${role.team}.`);
out.push("");
out.push("## Official text");
out.push("");
out.push(`"${role.ability}"`);
if (role.firstNightReminder) out.push(`- First night: ${role.firstNightReminder}`);
if (role.otherNightReminder) out.push(`- Other nights: ${role.otherNightReminder}`);
out.push("");

out.push("## Matrix rows");
out.push("");
const matrix = readFileSync(join(ROOT, "docs", "rules-matrix.md"), "utf8").split("\n");
const matrixRows = matrix.filter((line) => line.trim().startsWith(`|\`${roleId}\``));
out.push(...(matrixRows.length ? matrixRows : ["(none)"]));
out.push("");

out.push("## Spec requirements");
out.push("");
const specMentions = [];
const namePattern = new RegExp(`\\b${role.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
for (const file of walk(join(ROOT, "openspec", "specs")).filter((path) =>
  path.endsWith("spec.md"),
)) {
  const spec = readFileSync(file, "utf8").split("\n");
  let heading = null;
  let block = [];
  const flush = () => {
    if (!heading) return;
    const text = block.join("\n");
    const mentions =
      namePattern.test(text) ||
      [...text.matchAll(IDENTIFIER)].some(([id]) => identifierSet.has(id));
    if (mentions)
      specMentions.push({ file, heading, source: block.find((l) => l.startsWith("**Source**")) });
    heading = null;
    block = [];
  };
  for (const line of spec) {
    if (line.startsWith("### Requirement:")) {
      flush();
      heading = line.slice("### Requirement:".length).trim();
      block = [];
    } else if (line.startsWith("## ") && !line.startsWith("###")) {
      flush();
    } else if (heading) {
      block.push(line);
    }
  }
  flush();
}
out.push(
  ...(specMentions.length
    ? specMentions.map(
        (entry) =>
          `- ${entry.file.slice(ROOT.length + 1)}: ${entry.heading}${entry.source ? " — " + entry.source.replace(/\*\*/g, "") : ""}`,
      )
    : ["(none)"]),
);
out.push("");

out.push("## Tests carrying the identifiers");
out.push("");
const tests = [];
for (const file of walk(join(ROOT, "src"))
  .concat(walk(join(ROOT, "scripts")))
  .filter((path) => /\.test\.(?:ts|mjs)$/.test(path))) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/test\("([^"]+)"/g)) {
    const hits = [...match[1].matchAll(IDENTIFIER)].map(([id]) => id);
    if (hits.some((id) => identifierSet.has(id))) {
      tests.push(`- ${file.slice(ROOT.length + 1)}: "${match[1]}"`);
    }
  }
}
out.push(...(tests.length ? tests : ["(none)"]));
out.push("");

out.push("## Jinxes");
out.push("");
const jinxes = JINX_PAIRS.filter((pair) => pair.roles.includes(roleId));
out.push(
  ...(jinxes.length
    ? jinxes.map((pair) => {
        const other = pair.roles.find((id) => id !== roleId) ?? roleId;
        return `- ${other}: ${pair.reason} (${pair.source})`;
      })
    : ["(none)"]),
);

console.log(out.join("\n"));
