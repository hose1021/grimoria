#!/usr/bin/env node
// Runs every full-game scenario in scripts/scenarios in one command. Each
// scenario seeds a dealt game, plays it through the real console and asserts
// the rule outcome, so a failure names the rule that regressed.
//
// Requires a build with BASE_PATH=/pocket/ (the Playwright regression build):
//   BASE_PATH=/pocket/ npx vite build --mode test
//   node scripts/build-fallback.ts --root dist
//   node scripts/build-offline.ts --root dist --out dist/sw.js
//   node scripts/run-scenarios.ts
import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mapLimit, workerCount } from "./harness.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "scripts", "scenarios");
const only = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));

const files = (await readdir(dir))
  .filter((name) => name.endsWith(".ts"))
  .filter((name) => !only.length || only.some((wanted) => name.includes(wanted)))
  .sort();

interface Result {
  file: string;
  ms: number;
  ok: boolean;
  stderr: string;
  stdout: string;
}

function run(file: string, shots: string): Promise<Result> {
  return new Promise((done) => {
    const started = Date.now();
    execFile(
      process.execPath,
      [join(dir, file)],
      {
        cwd: root,
        timeout: 240000,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, PG_SCENARIO_SHOTS: shots },
      },
      (error, stdout, stderr) => {
        done({
          file,
          ok: !error,
          ms: Date.now() - started,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      },
    );
  });
}

const workers = workerCount(process.env.PG_SCENARIO_WORKERS);
const shots = await mkdtemp(join(tmpdir(), "pg-scenarios-"));
console.log(
  `Scenarios: ${files.length}, workers: ${Math.min(workers, files.length) || 0}${process.env.PG_SCENARIO_WORKERS ? ` (PG_SCENARIO_WORKERS=${process.env.PG_SCENARIO_WORKERS})` : ""}`,
);

const results = await mapLimit(files, workers, async (file) => {
  const result = await run(file, shots);
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.file} (${result.ms} ms)`);
  if (!result.ok) {
    const detail = (result.stdout || result.stderr).split("\n").slice(0, 8).join("\n  ");
    console.log(`  ${detail}`);
  }
  return result;
});

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed.`);
if (failed.length) {
  console.log(`Failed: ${failed.map((result) => result.file).join(", ")}`);
  console.log(`Failure captures: ${shots}`);
  process.exit(1);
}
await rm(shots, { recursive: true, force: true });
