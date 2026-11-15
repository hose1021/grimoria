#!/usr/bin/env node
// Fetch the wiki revisions pinned in docs/rules-matrix.md and record them in
// docs/official/manifest.json. No dependencies, Node built-in fetch only.
//
// The matrix stays the only place that pins a revision: this script reads the
// pins, writes snapshots and reports drift, and never rewrites a pin.
//
// `--check` compares every pin with the latest revision of its page, writes
// nothing and exits 1 when a page moved.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Pin } from "./official-pins.ts";
import { parsePinnedRevisions, snapshotPath } from "./official-pins.ts";

/** One entry of docs/official/manifest.json. */
export interface ManifestEntry {
  localOnly?: boolean;
  path: string;
  retrieved: string;
  revisionTimestamp: string;
  revid: number;
  sha256: string;
  source: string;
  title: string;
}

export interface Manifest {
  files: ManifestEntry[];
  version: number;
}

/** The subset of the MediaWiki revision query this script reads. */
interface WikiRevision {
  revid: number;
  slots?: { main?: { content?: string } };
  timestamp?: string;
}

interface WikiPage {
  missing?: boolean;
  revisions?: WikiRevision[];
  title: string;
}

interface WikiResponse {
  error?: { info: string };
  query?: { pages?: WikiPage[] };
}

/** One fetched revision, normalized to LF. */
export interface FetchedRevision {
  content: string;
  revid: number;
  timestamp: string;
  title: string;
}

export type Request = (url: string) => Promise<WikiResponse>;

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://wiki.bloodontheclocktower.com/api.php";
const USER_AGENT =
  "grimoria-official-sync/1.0 (https://github.com/hose1021/grimoria; docs/official refresh)";
const BATCH = 50;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const today = (now: Date) => now.toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

function apiUrl(params: Record<string, string>): string {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("maxlag", "5");
  return url.href;
}

export async function defaultRequest(url: string): Promise<WikiResponse> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "identity" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

function pageTitle(pin: Pin, title: string): boolean {
  return title.replace(/_/g, " ") === pin.title;
}

export async function fetchRevision(pin: Pin, request: Request): Promise<FetchedRevision> {
  const data = await request(
    apiUrl({
      action: "query",
      prop: "revisions",
      rvprop: "ids|timestamp|content",
      rvslots: "main",
      revids: String(pin.revid),
    }),
  );
  if (data?.error) throw new Error(`${pin.title} r${pin.revid}: ${data.error.info}`);
  const page = data?.query?.pages?.[0];
  if (!page || page.missing) throw new Error(`${pin.title} r${pin.revid}: revision is missing`);
  if (!pageTitle(pin, page.title))
    throw new Error(`r${pin.revid} is "${page.title}", the matrix pins "${pin.title}"`);
  const revision = page.revisions?.[0];
  if (!revision) throw new Error(`${pin.title} r${pin.revid}: no revision returned`);
  const content = revision.slots?.main?.content;
  if (typeof content !== "string")
    throw new Error(`${pin.title} r${pin.revid}: no revision content returned`);
  return {
    title: pin.title,
    revid: revision.revid,
    timestamp: revision.timestamp ?? "",
    content: content.replace(/\r\n/g, "\n"),
  };
}

function readManifest(root: string): { manifest: Manifest; text: string | null } {
  const path = join(root, "docs", "official", "manifest.json");
  if (!existsSync(path)) return { manifest: { version: 1, files: [] }, text: null };
  const text = readFileSync(path, "utf8");
  return { manifest: JSON.parse(text), text };
}

function writeManifest(root: string, manifest: Manifest, before: string | null): boolean {
  const text = `${JSON.stringify(manifest, null, 2)}\n`;
  if (text === before) return false;
  writeFileSync(join(root, "docs", "official", "manifest.json"), text);
  return true;
}

function snapshotFile(root: string, path: string): string {
  const base = resolve(root, "docs", "official");
  const file = resolve(root, path);
  const rel = relative(base, file);
  if (rel.startsWith("..") || isAbsolute(rel))
    throw new Error(`${path} resolves outside docs/official/`);
  return file;
}

export async function sync({
  root = REPO,
  request = defaultRequest,
  now = new Date(),
  delay = 1000,
  localOnly = true,
  log = console.log,
}: {
  delay?: number;
  localOnly?: boolean;
  log?: (message: string) => void;
  now?: Date;
  request?: Request;
  root?: string;
} = {}) {
  const pins = parsePinnedRevisions(readFileSync(join(root, "docs", "rules-matrix.md"), "utf8"));
  const { manifest, text } = readManifest(root);
  const existing = new Map<string, ManifestEntry>(
    manifest.files.map((entry) => [entry.path, entry]),
  );
  const written: string[] = [];
  const unchanged: string[] = [];

  for (const [index, pin] of pins.entries()) {
    if (index && delay) await sleep(delay);
    const revision = await fetchRevision(pin, request);
    const path = snapshotPath(pin.title, pin.revid);
    const hash = sha256(revision.content);
    const file = snapshotFile(root, path);
    const current = existing.get(path);
    const entry: ManifestEntry = {
      path,
      source: pin.source,
      title: pin.title,
      revid: pin.revid,
      revisionTimestamp: revision.timestamp,
      retrieved: current?.sha256 === hash ? current.retrieved : today(now),
      sha256: hash,
    };
    if (localOnly) entry.localOnly = true;
    const same =
      current?.sha256 === hash &&
      existsSync(file) &&
      readFileSync(file, "utf8") === revision.content &&
      current.source === entry.source &&
      current.revisionTimestamp === entry.revisionTimestamp &&
      current.localOnly === entry.localOnly;
    if (same) {
      unchanged.push(path);
      continue;
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, revision.content);
    existing.set(path, entry);
    written.push(path);
    log(`updated ${path}`);
  }

  const ordered = manifest.files.map((entry) => existing.get(entry.path) ?? entry);
  const added = [...existing.values()].filter(
    (entry) => !manifest.files.some((known) => known.path === entry.path),
  );
  manifest.files = [...ordered, ...added.sort((a, b) => a.path.localeCompare(b.path))];
  const manifestChanged = writeManifest(root, manifest, text);
  return { written, unchanged, manifestChanged, exitCode: 0 };
}

export async function checkDrift({
  root = REPO,
  request = defaultRequest,
  log = console.log,
}: {
  log?: (message: string) => void;
  request?: Request;
  root?: string;
} = {}) {
  const pins = parsePinnedRevisions(readFileSync(join(root, "docs", "rules-matrix.md"), "utf8"));
  const drift: { latest: number | null; pinned: number; title: string }[] = [];
  const byTitle = new Map<string, Pin[]>();
  for (const pin of pins) {
    if (!byTitle.has(pin.title)) byTitle.set(pin.title, []);
    byTitle.get(pin.title)?.push(pin);
  }
  const titles = [...byTitle.keys()];
  for (let start = 0; start < titles.length; start += BATCH) {
    const batch = titles.slice(start, start + BATCH);
    const data = await request(
      apiUrl({ action: "query", prop: "revisions", rvprop: "ids", titles: batch.join("|") }),
    );
    if (data?.error) throw new Error(`latest-revision query failed: ${data.error.info}`);
    for (const page of data?.query?.pages ?? []) {
      const title = page.title.replace(/_/g, " ");
      const latest = page.revisions?.[0]?.revid ?? null;
      for (const pin of byTitle.get(title) ?? []) {
        if (latest !== pin.revid) drift.push({ title, pinned: pin.revid, latest });
      }
    }
  }
  drift.sort((a, b) => a.title.localeCompare(b.title));
  for (const entry of drift)
    log(
      `${entry.title}: pinned r${entry.pinned}, latest ${entry.latest === null ? "missing" : `r${entry.latest}`}`,
    );
  return { drift, exitCode: drift.length ? 1 : 0 };
}

async function main() {
  const argument = (name: string): string | null => {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : process.argv[index + 1] || null;
  };
  const root = resolve(argument("--root") || REPO);
  const request = defaultRequest;
  try {
    if (process.argv.includes("--check")) {
      const result = await checkDrift({ root, request });
      process.exit(result.exitCode);
    }
    const result = await sync({
      root,
      request,
      delay: Number(argument("--delay") ?? 1000),
      localOnly: !process.argv.includes("--commit-snapshots"),
    });
    console.log(
      `Official snapshots: ${result.written.length} written, ${result.unchanged.length} unchanged.`,
    );
    process.exit(0);
  } catch (error) {
    console.error(`Official snapshot sync failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
