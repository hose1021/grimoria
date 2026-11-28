#!/usr/bin/env node
// Classifies a change by the files it touches and rejects a silent downgrade.
// Risk is decided by the diff, never by the label the author chose.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseChangedFiles } from "./changed-files.ts";
import { releaseMetadataOnly } from "./release-metadata.ts";

export type Tier = "R0" | "R1" | "R2" | "R3";
const ORDER: readonly Tier[] = ["R0", "R1", "R2", "R3"];

const R3 = [
  "src/core/engine/",
  "src/core/model/",
  "src/core/commands/",
  "src/infrastructure/storage/",
  "src/infrastructure/offline/",
  "src/ui/screens/player",
  "src/ui/screens/secrets",
  "src/ui/screens/seat",
  "src/ui/screens/public",
  "scripts/verification/",
  "scripts/rule-registry.ts",
  "scripts/check-risk-tier.ts",
  "scripts/openspec-check.ts",
  "scripts/check-acceptance.ts",
  "scripts/archive-index.ts",
  "scripts/sync-rules-matrix.ts",
  "scripts/check-official.ts",
  "scripts/check-types-policy.ts",
  "scripts/check-risk-artifacts.ts",
  "contracts/",
  "tsconfig",
  "rules/",
  ".github/",
  "openspec/changes/",
  "openspec/config.yaml",
  "openspec/specs/workflow/",
  "AGENTS.md",
  "docs/official/",
  "docs/audits/",
  "docs/rules-",
  "package.json",
  "package-lock.json",
  "src/entry/",
  "src/application/store/",
  "src/entry/store.ts",
  "scripts/rule-traceability.ts",
  "scripts/openspec-reconcile.ts",
  "fixtures/conformance/",
  "scripts/build-",
  "scripts/fetch-official.ts",
  "scripts/official-pins.ts",
];
const R2 = ["src/core/roles/", "src/application/"];
const R1 = ["src/ui/", "css/"];
const R0 = [
  "README.md",
  "CHANGELOG.md",
  "DECISIONS.md",
  "PRODUCT.md",
  "DESIGN.md",
  "docs/",
  "openspec/specs/",
];

function matches(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

function tierOf(path: string): Tier {
  // A role dossier is rule metadata, not gameplay code: the runtime module
  // stays R2, while the document ranks with docs/rules-* as R3.
  if (path.startsWith("src/core/roles/") && path.endsWith("/rule.md")) return "R3";
  if (matches(path, R3)) return "R3";
  if (matches(path, R2)) return "R2";
  if (matches(path, R1)) return "R1";
  if (matches(path, R0)) return "R0";
  return "R3";
}

export function classify(paths: readonly string[]): Tier {
  let highest: Tier = "R0";
  for (const path of paths) {
    const tier = tierOf(path);
    if (ORDER.indexOf(tier) > ORDER.indexOf(highest)) highest = tier;
  }
  return highest;
}

export interface RiskEvidenceContext {
  exists?: (path: string) => boolean;
  knownRule?: (id: string) => boolean;
  assertingFile?: (id: string, file: string) => boolean;
  releaseMetadataOnly?: boolean;
}

function sectionText(body: string, heading: RegExp): string | null {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) return null;
  const out: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index]!.startsWith("## ")) break;
    out.push(lines[index]!);
  }
  return out.join("\n");
}

function evidenceChunk(body: string): string {
  return sectionText(body, /^Evidence:\s*$/) ?? sectionText(body, /^## Verification\b/) ?? "";
}

function citedTestFiles(text: string): string[] {
  return [...new Set([...text.matchAll(/[\w./-]+\.test\.ts/g)].map((match) => match[0]))];
}

function ruleIds(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(/\b(?:TB|BMR|SNV|SYS)-[A-Z0-9]+-\d\d\b/g)].map((match) => match[0]),
    ),
  ];
}

function missingTestFiles(tier: Tier, text: string, context: RiskEvidenceContext): string[] {
  if (!context.exists) return [];
  return citedTestFiles(text)
    .filter((file) => !context.exists!(file))
    .map((file) => `${tier} cites a test file that does not exist: ${file}`);
}

function evidenceFailures(tier: Tier, body: string, context: RiskEvidenceContext): string[] {
  const chunk = evidenceChunk(body);
  const substantive = /^\s*[-*]\s+\S/m.test(chunk);
  if (tier === "R0") {
    if (!substantive) return ["R0 needs at least one substantive Evidence or Verification bullet"];
    return missingTestFiles(tier, chunk, context);
  }
  if (!substantive) return [`${tier} needs at least one concrete Evidence bullet`];
  if (tier === "R1") {
    const failures: string[] = [];
    if (!/\.test\.ts|npm (?:run )?\S+|node --test|browser-check/i.test(chunk))
      failures.push("R1 needs regression or characterization evidence naming a test or command");
    failures.push(...missingTestFiles(tier, chunk, context));
    return failures;
  }
  if (tier === "R2") {
    const failures: string[] = [];
    const ids = ruleIds(body);
    if (!ids.length) failures.push("R2 needs a stable rule identifier");
    else if (context.knownRule && !ids.some((id) => context.knownRule!(id)))
      failures.push(`R2 names no rule the registry holds (${ids.join(", ")})`);
    if (!/\.test\.ts/.test(body)) failures.push("R2 needs the asserting test file");
    const knownIds = ids.filter((id) => !context.knownRule || context.knownRule(id));
    const files = citedTestFiles(body);
    if (
      knownIds.length &&
      files.length &&
      context.assertingFile &&
      !knownIds.some((id) => files.some((file) => context.assertingFile!(id, file)))
    )
      failures.push(`R2 cites no asserting test file for ${knownIds.join(", ")}`);

    if (!/https:\/\/wiki\.bloodontheclocktower\.com\/[^\s)\]]*[?&]oldid=\d+\b/i.test(body))
      failures.push("R2 needs the official source link with its pinned revision");
    if (!/^\s*[-*]\s*RED:[ \t]*\S/im.test(body)) failures.push("R2 needs RED evidence");
    if (!/^\s*[-*]\s*GREEN:[ \t]*\S/im.test(body)) failures.push("R2 needs GREEN evidence");
    failures.push(...missingTestFiles(tier, body, context));
    return failures;
  }
  return [];
}

export function checkRisk(
  body: string,
  paths: readonly string[],
  context: RiskEvidenceContext = {},
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  // A commit range proven to change release metadata only carries no artifact
  // obligation beyond the R0 evidence; the files alone never decide this.
  const present = new Set<Tier>(
    context.releaseMetadataOnly ? ["R0"] : paths.map((path) => tierOf(path)),
  );
  const computed = context.releaseMetadataOnly ? "R0" : classify(paths);
  const declared = /^Risk:\s*(R[0-3])\s*$/m.exec(body)?.[1] as Tier | undefined;
  if (!/^Issue:\s*(#\d+|https?:\/\/\S+)/m.test(body)) errors.push("PR body has no Issue line");
  if (!declared) errors.push("PR body has no Risk: R0-R3 line");
  else if (ORDER.indexOf(declared) < ORDER.indexOf(computed))
    errors.push(`declared ${declared} is lower than the diff's ${computed}`);
  if (!/^Evidence:/m.test(body) && !/^## Verification\b/m.test(body))
    errors.push("PR body has no Evidence line or Verification section");
  // Each tier the diff touches keeps its own evidence obligation: a gameplay
  // path in an R3 change still needs its source, rule id, test and RED/GREEN.
  const obligations = new Set<Tier>([computed, ...present]);
  if (declared) obligations.add(declared);
  for (const tier of ORDER)
    if (obligations.has(tier))
      for (const error of evidenceFailures(tier, body, context))
        if (!errors.includes(error)) errors.push(error);
  return { ok: errors.length === 0, errors };
}

function registryIndex(dir: string): {
  ids: Set<string>;
  assertingFiles: Map<string, Set<string>>;
} {
  const ids = new Set<string>();
  const assertingFiles = new Map<string, Set<string>>();
  const walk = (path: string): void => {
    for (const entry of readdirSync(path)) {
      const child = join(path, entry);
      if (statSync(child).isDirectory()) walk(child);
      else if (entry.endsWith(".json")) {
        const parsed = JSON.parse(readFileSync(child, "utf8")) as {
          rules?: Array<{
            id?: unknown;
            assertingTests?: Array<{ file?: unknown }>;
          }>;
        };
        for (const rule of parsed.rules ?? []) {
          if (typeof rule.id !== "string") continue;
          ids.add(rule.id);
          const files = new Set<string>();
          for (const test of rule.assertingTests ?? [])
            if (typeof test.file === "string") files.add(test.file);
          assertingFiles.set(rule.id, files);
        }
      }
    }
  };
  walk(dir);
  return { ids, assertingFiles };
}

function main(): void {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf("--base");
  const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
  const positional = args.filter(
    (arg, index) => arg !== "--base" && (baseIndex < 0 || index !== baseIndex + 1),
  );
  const [bodyPath, filesPath] = positional;
  if (!bodyPath || !filesPath || (baseIndex >= 0 && !baseRef)) {
    console.error("usage: check-risk-tier.ts <pr-body> <changed-files> [--base <ref>]");
    process.exitCode = 2;
    return;
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let metadataOnly = false;
  if (baseRef) {
    const metadata = releaseMetadataOnly(root, baseRef);
    metadataOnly = metadata.ok;
    // Name the semantic reason when every changed path is release metadata but
    // the content is not, instead of only reporting the tier as R3.
    if (!metadata.ok && metadata.pathsOnly)
      for (const failure of metadata.failures) console.error(failure);
  }
  const registry = registryIndex(join(root, "rules"));
  const result = checkRisk(
    readFileSync(bodyPath, "utf8"),
    parseChangedFiles(readFileSync(filesPath, "utf8")),
    {
      exists: (path) => existsSync(join(root, path)),
      knownRule: (id) => registry.ids.has(id),
      assertingFile: (id, file) => registry.assertingFiles.get(id)?.has(file) ?? false,
      releaseMetadataOnly: metadataOnly,
    },
  );
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log("Risk tier check passed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
