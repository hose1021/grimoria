#!/usr/bin/env node
// Reproducible TypeScript engine baseline. No threshold assertions live here.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGame, clone, exportGame, importGame } from "../src/core/model/state.ts";
import { applyCommand, previewCommand, replay } from "../src/core/engine/index.ts";
import { fingerprintOf } from "../src/core/engine/command-state.ts";
import { RULESET_VERSION } from "../src/core/engine/command-versions.ts";
import { createDistServer } from "./serve-dist.ts";
import type { Playwright } from "./playwright.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = join(ROOT, "src/core/engine/fixtures/legacy-setup-zero-game.json");

export const APPLY_MEASURED_PREFIX = "bench-apply-measured-";
export const APPLY_WARMUP_PREFIX = "bench-apply-warmup-";
export const PREVIEW_MEASURED_PREFIX = "bench-preview-measured-";
export const PREVIEW_WARMUP_PREFIX = "bench-preview-warmup-";
const IDEMPOTENT_PREFIX = "bench-idempotent-";

type Sample = { median: number; p95: number; mean: number };

function sample(
  run: (index: number) => void,
  iterations: number,
  warmup = 20,
  warmupRun: (index: number) => void = run,
): Sample {
  for (let index = 0; index < warmup; index += 1) warmupRun(index);
  const times: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    run(index);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    median: times[Math.floor(times.length * 0.5)]!,
    p95: times[Math.floor(times.length * 0.95)]!,
    mean: times.reduce((sum, value) => sum + value, 0) / times.length,
  };
}

export function setNotesCommand(prefix: string, index: number) {
  return {
    id: `${prefix}${index}`,
    type: "setNotes",
    payload: { notes: `note-${index}` },
    at: "2026-11-28T00:00:00.000Z",
  };
}

function workload(prefix: string, count: number) {
  const state = createGame(7);
  return {
    state,
    commands: Array.from({ length: count }, (_, index) => setNotesCommand(prefix, index)),
  };
}

export function applyWorkload(count = 500) {
  return workload(APPLY_MEASURED_PREFIX, count);
}

export function previewWorkload(count = 500) {
  return workload(PREVIEW_MEASURED_PREFIX, count);
}

export function idempotentWorkload() {
  const state = createGame(7);
  return { state, command: setNotesCommand(IDEMPOTENT_PREFIX, 0) };
}

function assertAllowed(
  result: { status?: string; idempotent?: boolean },
  idempotent = false,
): void {
  if (result.status !== "allowed")
    throw new Error(`benchmark command was not allowed: ${JSON.stringify(result)}`);
  if ((result.idempotent === true) !== idempotent)
    throw new Error(`benchmark command idempotency ${String(result.idempotent)} !== ${idempotent}`);
}

export function buildLargeJournal(size: number) {
  const base = createGame(7);
  delete (base as Partial<typeof base>).journal;
  const entries = [];
  for (let index = 0; index < size; index += 1) {
    const command = {
      id: `journal-${index}`,
      type: "setNotes",
      payload: { notes: `note-${index}` },
      at: "2026-11-28T00:00:00.000Z",
      rulesetVersion: RULESET_VERSION,
    };
    entries.push({
      ...command,
      fingerprint: fingerprintOf(command, RULESET_VERSION),
      undoable: false,
    });
  }
  return { base, entries };
}

async function bundleMetrics(): Promise<Record<string, number> | null> {
  const assets = join(ROOT, "dist/assets");
  if (!existsSync(assets)) return null;
  let chunks = 0;
  let raw = 0;
  let gzip = 0;
  let brotli = 0;
  for (const name of readdirSync(assets)) {
    if (!name.endsWith(".js")) continue;
    const bytes = readFileSync(join(assets, name));
    chunks += 1;
    raw += bytes.length;
    gzip += gzipSync(bytes).length;
    brotli += brotliCompressSync(bytes).length;
  }
  return { chunks, rawBytes: raw, gzipBytes: gzip, brotliBytes: brotli };
}

async function startupMetrics(): Promise<Record<string, number> | null> {
  if (!process.env.PLAYWRIGHT_MODULE || !existsSync(join(ROOT, "dist/index.html"))) return null;
  // Playwright is installed outside the repository and selected at runtime.
  const { chromium } = (await import(
    pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  )) as Playwright;
  const server = createDistServer({ root: join(ROOT, "dist"), prefix: "/" });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => done()));
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch({ headless: true });
  const ready: number[] = [];
  const paints: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const start = performance.now();
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(
      () => (document.querySelector("#screen")?.textContent ?? "").length > 20,
      null,
      { timeout: 30000 },
    );
    ready.push(performance.now() - start);
    const paint = await page.evaluate(() => {
      const first = performance.getEntriesByName("first-contentful-paint")[0]?.startTime;
      const navigation = performance
        .getEntries()
        .find((entry) => (entry.entryType as string) === "navigation") as
        | PerformanceNavigationTiming
        | undefined;
      return first ?? navigation?.domContentLoadedEventEnd ?? 0;
    });
    paints.push(paint);
    await context.close();
  }
  await browser.close();
  server.close();
  const sort = (values: number[]) => [...values].sort((a, b) => a - b);
  return {
    samples: ready.length,
    readyMedian: sort(ready)[Math.floor(ready.length / 2)]!,
    readyP95: sort(ready)[Math.floor(ready.length * 0.95)]!,
    firstPaintMedian: sort(paints)[Math.floor(paints.length / 2)]!,
  };
}

function toolVersion(command: string): string | null {
  try {
    return execFileSync(command, ["--version"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const applyMeasured = applyWorkload();
  const applyWarmup = workload(APPLY_WARMUP_PREFIX, 20);
  const apply = sample(
    (index) => assertAllowed(applyCommand(applyMeasured.state, applyMeasured.commands[index]!)),
    applyMeasured.commands.length,
    20,
    (index) => assertAllowed(applyCommand(applyWarmup.state, applyWarmup.commands[index]!)),
  );

  const previewMeasured = previewWorkload();
  const previewWarmup = workload(PREVIEW_WARMUP_PREFIX, 20);
  const preview = sample(
    (index) =>
      assertAllowed(previewCommand(previewMeasured.state, previewMeasured.commands[index]!)),
    previewMeasured.commands.length,
    20,
    (index) => assertAllowed(previewCommand(previewWarmup.state, previewWarmup.commands[index]!)),
  );

  const idempotent = idempotentWorkload();
  assertAllowed(applyCommand(idempotent.state, idempotent.command));
  const reuse = sample(
    () => assertAllowed(applyCommand(idempotent.state, idempotent.command), true),
    300,
    10,
  );

  const state = applyMeasured.state;
  const serialization = sample(() => JSON.stringify(state), 300);
  const parsing = sample(() => JSON.parse(JSON.stringify(state)), 300);
  const exported = exportGame(state);
  const exportLatency = sample(() => exportGame(state), 300);
  const importLatency = sample(() => importGame(exported), 300);
  const cloneLatency = sample(() => clone(state), 300);
  const fixtureText = readFileSync(FIXTURE, "utf8");
  const fixture = JSON.parse(fixtureText);
  const smallReplay = sample(() => replay(fixture.journal), 200);
  const large = buildLargeJournal(1000);
  const largeResult = replay(large);
  if (!largeResult.ok) throw new Error(`large journal replay failed: ${largeResult.errorCode}`);
  const largeReplay = sample(() => replay(large), 10, 2);

  // Heap deltas need an explicit collection to be comparable between runs.
  const collect = (globalThis as { gc?: () => void }).gc;
  let memory: { heapDelta100RetainedImports: number } | null = null;
  if (collect) {
    collect();
    const heapBefore = process.memoryUsage().heapUsed;
    const retained = Array.from({ length: 100 }, () => importGame(exported));
    collect();
    memory = { heapDelta100RetainedImports: process.memoryUsage().heapUsed - heapBefore };
    retained.length = 0;
    collect();
  }

  const result = {
    methodologyVersion: 2,
    measuredAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model ?? null,
      rustc: toolVersion("rustc"),
      cargo: toolVersion("cargo"),
      iterations: {
        apply: applyMeasured.commands.length,
        preview: previewMeasured.commands.length,
        idempotency: 300,
        serialization: 300,
        replaySmall: 200,
        replayLarge: 10,
      },
      workloads: {
        apply: APPLY_MEASURED_PREFIX,
        applyWarmup: APPLY_WARMUP_PREFIX,
        preview: PREVIEW_MEASURED_PREFIX,
        previewWarmup: PREVIEW_WARMUP_PREFIX,
      },
    },
    fixture: {
      path: "src/core/engine/fixtures/legacy-setup-zero-game.json",
      sha256: createHash("sha256").update(fixtureText).digest("hex"),
      journalEntries: fixture.journal.entries.length,
    },
    metrics: {
      applySetNotes: apply,
      previewSetNotes: preview,
      idempotentSetNotes: reuse,
      jsonStringifyState: serialization,
      jsonRoundTripState: parsing,
      exportGame: exportLatency,
      importGame: importLatency,
      cloneState: cloneLatency,
      replayLegacyJournal: smallReplay,
      replayLargeJournal: largeReplay,
      replayLargeJournalPerEntry: {
        median: largeReplay.median / 1000,
        p95: largeReplay.p95 / 1000,
        mean: largeReplay.mean / 1000,
      },
      memory,
      stateBytes: Buffer.byteLength(exported),
      statePlayers: Object.keys(state.players).length,
      schemaVersion: state.v,
    },
    bundle: await bundleMetrics(),
    startup: await startupMetrics(),
  };
  const writeIndex = process.argv.indexOf("--write");
  const target = writeIndex >= 0 ? process.argv[writeIndex + 1] : null;
  if (target) {
    writeFileSync(resolve(ROOT, target), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${target}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
