#!/usr/bin/env node
// Offline provenance check for docs/official/. No dependencies, no network.
//
// Fails when a manifest entry has no file or its SHA-256 differs, and when a
// file in docs/official/ has no manifest entry. README.md and manifest.json are
// the only files that need no entry. An entry marked localOnly is a snapshot
// generated on demand: its file is checked only when it is present.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePinnedRevisions, snapshotPath } from "./official-pins.ts";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OFFICIAL = "docs/official";
const EXEMPT = new Set(["manifest.json", "README.md"]);

const failures: string[] = [];
const fail = (message: string): number => failures.push(message);

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

const root = resolve(argument("--root") || REPO);
const officialDir = resolve(root, OFFICIAL);
const manifestPath = resolve(officialDir, "manifest.json");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** One entry of docs/official/manifest.json, as the check reads it. */
export interface ManifestEntry {
  localOnly?: boolean;
  path?: string;
  retrieved?: string;
  revid?: number;
  sha256?: string;
  source?: string;
  title?: string;
}

function readManifest(): ManifestEntry[] {
  if (!existsSync(manifestPath)) {
    fail(`${OFFICIAL}/manifest.json is missing`);
    return [];
  }
  let manifest: { files?: ManifestEntry[]; version?: number };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`${OFFICIAL}/manifest.json is not valid JSON: ${(error as Error).message}`);
    return [];
  }
  if (manifest?.version !== 1) fail(`${OFFICIAL}/manifest.json must declare version 1`);
  if (!Array.isArray(manifest?.files)) {
    fail(`${OFFICIAL}/manifest.json must have a files array`);
    return [];
  }
  return manifest.files;
}

function checkEntry(entry: ManifestEntry): string | null {
  const path = typeof entry?.path === "string" ? entry.path : "";
  if (!path.startsWith(`${OFFICIAL}/`)) {
    fail(`manifest entry with an invalid path: ${JSON.stringify(entry?.path)}`);
    return null;
  }
  for (const field of ["source", "retrieved", "sha256"] as const) {
    if (typeof entry[field] !== "string" || entry[field] === "") fail(`${path} has no ${field}`);
  }
  const file = resolve(root, path);
  if (!file.startsWith(officialDir + sep)) {
    fail(`${path} resolves outside ${OFFICIAL}/`);
    return null;
  }
  if (!existsSync(file)) {
    if (entry.localOnly !== true) fail(`${path} is missing from the working tree`);
    return path;
  }
  const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (actual !== entry.sha256)
    fail(`${path} hash mismatch: manifest ${entry.sha256}, file ${actual}`);
  return path;
}

const entries = readManifest();
const listed = new Set(entries.map(checkEntry).filter(Boolean));

if (existsSync(officialDir)) {
  for (const file of walk(officialDir)) {
    const path = relative(root, file).split(sep).join("/");
    const name = relative(officialDir, file).split(sep).join("/");
    if (!name.includes("/") && EXEMPT.has(name)) continue;
    if (!listed.has(path)) fail(`${path} has no manifest entry`);
  }
}

const matrixPath = resolve(root, "docs", "rules-matrix.md");
if (existsSync(matrixPath)) {
  const covered = new Set(
    entries
      .filter((entry) => typeof entry?.title === "string" && Number.isInteger(entry?.revid))
      .map((entry) => `${entry.title}\u0000${entry.revid}\u0000${entry.path}`),
  );
  for (const pin of parsePinnedRevisions(readFileSync(matrixPath, "utf8"))) {
    const key = `${pin.title}\u0000${pin.revid}\u0000${snapshotPath(pin.title, pin.revid)}`;
    if (!covered.has(key)) fail(`pinned revision ${pin.title} r${pin.revid} has no manifest entry`);
  }
}

if (failures.length) {
  console.error(`Official provenance check failed with ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `Official provenance check passed: ${listed.size} entr${listed.size === 1 ? "y" : "ies"}.`,
);
