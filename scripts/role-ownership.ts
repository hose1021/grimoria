// Role ownership ledger: one row per supported role that names the behavior
// owner, the code location and the matrix evidence. `--check` fails when the
// checked-in ledger is stale, so a new engine branch or capability cannot be
// added without updating the audit record.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "docs/role-ownership.md");

// The files that coordinate rules. Each one owns a named shared mechanic; a
// role literal inside one is a role-owned branch until it becomes a capability.
const COORDINATORS: ReadonlyArray<{ file: string; owns: string }> = [
  { file: "src/core/model/state.ts", owns: "state, ids and projections" },
  { file: "src/core/engine/context.ts", owns: "night/day marks, log lines, actors" },
  { file: "src/core/engine/effects.ts", owns: "impairment, protection and the effect graph" },
  { file: "src/core/engine/death.ts", owns: "attack, death, succession and win checks" },
  { file: "src/core/engine/night.ts", owns: "the night queue and TB step completion" },
  { file: "src/core/engine/day.ts", owns: "nominations, executions and day actions" },
  { file: "src/core/engine/setup.ts", owns: "the bag, the deal and the setup secrets" },
  { file: "src/core/engine/information.ts", owns: "TB information answers" },
  {
    file: "src/core/engine/information-facts.ts",
    owns: "the information context and registration facts",
  },
  { file: "src/core/engine/bmr.ts", owns: "Bad Moon Rising steps and outcomes" },
  { file: "src/core/engine/sv.ts", owns: "Sects & Violets steps and outcomes" },
  { file: "src/core/engine/becoming.ts", owns: "the character change to Demon" },
  { file: "src/core/engine/pukka.ts", owns: "the Pukka poison and delayed death" },
  {
    file: "src/core/engine/ability.ts",
    owns: "capability decisions applied through shared mechanics",
  },
  { file: "src/core/engine/host-choice.ts", owns: "the Storyteller decision record" },
  { file: "src/core/engine/corrections.ts", owns: "manual corrections" },
];

type ModuleFacts = {
  id: string;
  edition: string;
  declares: string[];
};

type RuleRow = {
  id: string;
  level: string;
  revision: string;
};

function read(relative: string): string {
  return readFileSync(join(root, relative), "utf8");
}

export function roleModules(): ModuleFacts[] {
  const directory = join(root, "src/core/roles");
  const ids = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
  const facts: ModuleFacts[] = [];
  for (const id of ids) {
    let source: string;
    try {
      source = read(join("src/core/roles", id, "role.ts"));
    } catch {
      continue;
    }
    const declaration = /id:\s*"([^"]+)"/.exec(source);
    if (!declaration) continue;
    const edition = /edition:\s*"([^"]+)"/.exec(source)?.[1] ?? "unknown";
    const declares: string[] = [];
    if (/\bnightStep\s*:/.test(source)) declares.push("nightStep");
    if (/\bfirstNightStep\s*:/.test(source)) declares.push("firstNightStep");
    if (/\bdeathStep\s*:/.test(source)) declares.push("deathStep");
    if (/\bonDeath\s*:/.test(source)) declares.push("onDeath");
    for (const kind of capabilityKinds(source)) declares.push("capability:" + kind);
    facts.push({ id: declaration[1]!, edition, declares });
  }
  return facts;
}

/**
 * The arm kinds of a module's `capabilities` array. A resolver inside an arm
 * returns decisions and intents that carry a `kind` of their own, so only a
 * `kind` at the top level of an array element names a capability.
 */
export function capabilityKinds(source: string): string[] {
  const start = source.indexOf("capabilities:");
  const open = start === -1 ? -1 : source.indexOf("[", start);
  if (open === -1) return [];
  const kinds: string[] = [];
  // Nesting inside the array: an element object is depth 1.
  let depth = 0;
  for (let index = open + 1; index < source.length; index += 1) {
    const char = source[index]!;
    if (char === "/" && source[index + 1] === "/") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
    } else if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 1;
    } else if (char === '"' || char === "'" || char === "`") {
      index += 1;
      while (index < source.length && source[index] !== char) {
        index += source[index] === "\\" ? 2 : 1;
      }
    } else if (char === "{" || char === "[" || char === "(") {
      depth += 1;
    } else if (char === "}" || char === "]" || char === ")") {
      if (depth === 0) break;
      depth -= 1;
    } else if (depth === 1 && !/[\w$.]/.test(source[index - 1] ?? "")) {
      const match = /^kind\s*:\s*"([a-z-]+)"/.exec(source.slice(index, index + 64));
      if (match) {
        kinds.push(match[1]!);
        index += match[0].length - 1;
      }
    }
  }
  return [...new Set(kinds)];
}

export function ruleRows(roleId: string): RuleRow[] {
  let source: string;
  try {
    source = read(join("src/core/roles", roleId, "rule.md"));
  } catch {
    return [];
  }
  const rows: RuleRow[] = [];
  for (const line of source.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 4) continue;
    if (!/^[A-Z]+-[A-Z0-9-]+$/.test(cells[1]!)) continue;
    rows.push({ id: cells[1]!, level: cells[2]!, revision: cells[3]! });
  }
  return rows;
}

export function engineLocations(roleId: string): string[] {
  const needle = new RegExp(`"${roleId}"`);
  const locations: string[] = [];
  for (const coordinator of COORDINATORS) {
    const lines = read(coordinator.file).split("\n");
    let count = 0;
    for (const line of lines) {
      if (line.trimStart().startsWith("//")) continue;
      if (needle.test(line)) count += 1;
    }
    if (count)
      locations.push(
        coordinator.file.replace("src/core/engine/", "").replace("src/core/model/", "model/") +
          "×" +
          count,
      );
  }
  return locations;
}

export function ownerOf(facts: ModuleFacts | undefined, locations: string[]): string {
  if (!facts) return "missing module";
  const capability = facts.declares.some((item) => item.startsWith("capability:"));
  if (capability && locations.length) return "capability + engine reference";
  if (capability) return "capability";
  if (locations.length) return "engine branch";
  return "declarative (shared mechanic)";
}

export function renderLedger(): string {
  const modules = roleModules();
  const lines: string[] = [];
  lines.push("# Role ownership ledger");
  lines.push("");
  lines.push("Generated by `node scripts/role-ownership.ts` from the role modules, the");
  lines.push("coordinator sources and every `rule.md`. Do not edit by hand: run the");
  lines.push("generator, then review the diff. `--check` fails on a stale ledger.");
  lines.push("");
  lines.push("## How to read a row");
  lines.push("");
  lines.push("- **Module facts** are the declarations in `src/core/roles/<role>/role.ts`.");
  lines.push("- **Engine references** count role literals in the coordinating files. A");
  lines.push("  capability row with engine references is a migrated rule that the engine");
  lines.push("  still names to route the step; an engine-branch row is rule logic that");
  lines.push("  has not moved into a typed capability yet.");
  lines.push("- **Shared writers** are listed in `src/core/roles/architecture.test.ts`;");
  lines.push("  only those engine owners may call a shared death, execution,");
  lines.push("  transformation, effect or win writer.");
  lines.push("- **Rules** lists the rule identifiers from `rule.md`, with their matrix");
  lines.push("  level and pinned revision.");
  lines.push("");
  const counts = { capability: 0, mixed: 0, branch: 0, declarative: 0, missing: 0 };
  const rows: string[] = [];
  for (const facts of modules) {
    const locations = engineLocations(facts.id);
    const rules = ruleRows(facts.id);
    const owner = ownerOf(facts, locations);
    if (owner === "capability") counts.capability += 1;
    else if (owner === "capability + engine reference") counts.mixed += 1;
    else if (owner === "engine branch") counts.branch += 1;
    else if (owner === "declarative (shared mechanic)") counts.declarative += 1;
    else counts.missing += 1;
    rows.push(
      [
        "| `" + facts.id + "`",
        facts.edition,
        facts.declares.join(", ") || "—",
        locations.join(", ") || "—",
        rules
          .map((rule) => rule.id + " (" + rule.level + ", " + rule.revision + ")")
          .join("<br>") || "—",
        owner,
      ].join(" | ") + " |",
    );
  }
  lines.push("## Summary");
  lines.push("");
  lines.push("| Owner | Roles |");
  lines.push("| --- | --- |");
  lines.push("| Typed capability only | " + counts.capability + " |");
  lines.push("| Typed capability with an engine reference | " + counts.mixed + " |");
  lines.push("| Engine branch | " + counts.branch + " |");
  lines.push("| Declarative shared mechanic | " + counts.declarative + " |");
  lines.push("| Missing module | " + counts.missing + " |");
  lines.push("| **Total** | **" + modules.length + "** |");
  lines.push("");
  lines.push("## Roles");
  lines.push("");
  lines.push("| Role | Edition | Module facts | Engine references | Rules | Owner |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  lines.push(...rows);
  lines.push("");
  lines.push("## Coordinator ownership");
  lines.push("");
  lines.push("| File | Shared mechanic |");
  lines.push("| --- | --- |");
  for (const coordinator of COORDINATORS) {
    lines.push("| `" + coordinator.file + "` | " + coordinator.owns + " |");
  }
  lines.push("");
  lines.push("A role literal in a coordinator is the remaining migration debt. Every");
  lines.push("exception must either move into a typed capability or carry a pinned");
  lines.push("source justification in the role dossier.");
  lines.push("");
  return lines.join("\n");
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const document = renderLedger();
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(output, "utf8");
    } catch {
      console.error("Role ownership ledger is missing: run node scripts/role-ownership.ts");
      process.exit(1);
    }
    if (current !== document) {
      console.error("Role ownership ledger is stale: run node scripts/role-ownership.ts");
      process.exit(1);
    }
    console.log("Role ownership ledger is current.");
  } else {
    writeFileSync(output, document);
    console.log("Wrote docs/role-ownership.md");
  }
}
