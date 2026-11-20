#!/usr/bin/env node
// Build the shipped per-role reference from the engine's rule matrix and the
// official catalog. No wiki prose: the matrix records only what the engine
// decides and what the host decides. Run:
//   npm run reference
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface OfficialRole {
  id: string;
  name: string;
  edition: "tb" | "bmr" | "snv" | "traveller";
  team: string;
}

interface OfficialJinx {
  id: string;
  jinx: Array<{ id: string; reason: string }>;
}

interface Rule {
  id: string;
  status: string;
  when: string;
  behavior: string;
  decision: string;
  examples: string[];
}

interface Interaction {
  roleId: string;
  name: string;
  reason: string;
}

interface RoleReference {
  name: string;
  ability: string;
  oldid: number;
  url: string;
  rules: Rule[];
  interactions: Interaction[];
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MATRIX = join(ROOT, "docs/rules-matrix.md");
const ROLES = join(ROOT, "docs/official/roles.json");
const JINXES = join(ROOT, "docs/official/jinxes.json");
const OUT = join(ROOT, "public/assets/data/reference.json");

const SUPPORTED_EDITIONS: Record<string, true> = { tb: true, bmr: true, snv: true };
const RULE_ID = /\b(?:TB|BMR|SNV|ROLE)-[A-Z0-9]+-\d+\b/;
const ANY_RULE_ID = /\b(?:(?:TB|BMR|SNV|ROLE|SYS|INFO)-[A-Z0-9]+-\d+|(?:INFO|SYS)-\d+)\b/g;

function cleanText(value: string): string {
  return value
    .replace(ANY_RULE_ID, "")
    .replace(/\(\s*[,;`\s]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
}
const SOURCE = /\[([^\]]+)\]\((https?:\/\/[^)]*oldid=(\d+)[^)]*)\)/;
// Test titles that describe a concrete game situation, not the plumbing that
// carries it. The matrix keeps both; the reference shows the first kind.
const TECHNICAL =
  /\b(?:step|steps|command|commands|journal|record|records|recording|preview|previews|replay|replays|persist|persists|store|stores|shape|shapes|rejects|reject|duplicate|idempotent|projection|invariant|writes|write|builds|declares|log line|panel|surface|draft|state)\b/i;

function examples(tests: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of tests.matchAll(/"([^"]+)"/g)) {
    const title = match[1]!
      .replace(ANY_RULE_ID, "")
      .replace(/\(\s*[,;`\s]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;])/g, "$1")
      .trim();
    if (
      !title ||
      title.includes(".test.ts") ||
      title.startsWith("src/") ||
      TECHNICAL.test(title) ||
      seen.has(title)
    )
      continue;
    seen.add(title);
    result.push(title.charAt(0).toUpperCase() + title.slice(1));
    if (result.length === 6) break;
  }
  return result;
}

function parseRules(): { rules: Map<string, Rule[]>; abilities: Map<string, string> } {
  const rules = new Map<string, Rule[]>();
  const abilities = new Map<string, string>();
  for (const line of readFileSync(MATRIX, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split(/(?<!\\)\|/)
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const role = /`([a-z]+)`/.exec(cells[0]!)?.[1];
    const id = RULE_ID.exec(cells[0]!)?.[0];
    if (!role || !id) continue;
    if (!abilities.has(role)) abilities.set(role, cells[1]!);
    const list = rules.get(role) ?? [];
    list.push({
      id,
      status: cells[6]!,
      when: cells[2]!,
      behavior: cleanText(cells[3]!.replace(/\s+r\d{3,5}\b/g, "")),
      decision: cleanText(cells[4]!.replace(/\s+r\d{3,5}\b/g, "")),
      examples: examples(cells[5]!),
    });
    rules.set(role, list);
  }
  return { rules, abilities };
}

function sourceOf(): Map<string, { oldid: number; url: string }> {
  const sources = new Map<string, { oldid: number; url: string }>();
  for (const line of readFileSync(MATRIX, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split(/(?<!\\)\|/)
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 7) continue;
    const role = /`([a-z]+)`/.exec(cells[0]!)?.[1];
    const source = SOURCE.exec(cells[0]!);
    if (role && source && !sources.has(role))
      sources.set(role, { oldid: Number(source[3]), url: source[2]! });
  }
  return sources;
}

function interactionsByRole(
  supported: Map<string, OfficialRole>,
  official: OfficialRole[],
): Map<string, Interaction[]> {
  const byId = new Map(official.map((role) => [role.id, role]));
  const result = new Map<string, Interaction[]>();
  const add = (from: string, to: string, reason: string) => {
    if (!supported.has(from) || !supported.has(to)) return;
    const list = result.get(from) ?? [];
    if (list.some((entry) => entry.roleId === to)) return;
    list.push({ roleId: to, name: byId.get(to)?.name ?? to, reason });
    result.set(from, list);
  };
  const { jinxes } = JSON.parse(readFileSync(JINXES, "utf8")) as { jinxes: OfficialJinx[] };
  for (const entry of jinxes)
    for (const jinx of entry.jinx) {
      add(entry.id, jinx.id, jinx.reason);
      add(jinx.id, entry.id, jinx.reason);
    }
  return result;
}

function main(): void {
  const official = JSON.parse(readFileSync(ROLES, "utf8")) as OfficialRole[];
  const supported = new Map(
    official
      .filter((role) => SUPPORTED_EDITIONS[role.edition] === true && role.team !== "traveller")
      .map((role) => [role.id, role]),
  );
  const parsed = parseRules();
  const sources = sourceOf();
  const interactions = interactionsByRole(supported, official);
  const roles: Record<string, RoleReference> = {};
  for (const [id, role] of supported) {
    const source = sources.get(id);
    const entry = parsed.rules.get(id);
    const ability = parsed.abilities.get(id);
    if (!source || !entry || !ability) throw new Error(`The matrix has no rows for ${id}`);
    roles[id] = {
      name: role.name,
      ability,
      oldid: source.oldid,
      url: source.url,
      rules: entry,
      interactions: interactions.get(id) ?? [],
    };
  }
  writeFileSync(
    OUT,
    JSON.stringify({ generatedFrom: "docs/rules-matrix.md", roles }, null, 0) + "\n",
  );
  const total = Object.values(roles).reduce((sum, role) => sum + role.rules.length, 0);
  console.log(`Reference roles: ${Object.keys(roles).length}, rules: ${total}`);
}

main();
