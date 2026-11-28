import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const boundary = JSON.parse(readFileSync(resolve(ROOT, "contracts/engine-boundary.json"), "utf8"));

function engineExports(): { callable: string[]; types: string[] } {
  const text = readFileSync(resolve(ROOT, "src/core/engine/index.ts"), "utf8");
  const callable: string[] = [];
  const types: string[] = [];
  for (const match of text.matchAll(/export (type )?\{([\s\S]*?)\} from/g)) {
    const blockIsType = Boolean(match[1]);
    for (const part of match[2]!.split(",")) {
      const raw = part.trim();
      if (!raw) continue;
      const name = raw
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop()!;
      (blockIsType || raw.startsWith("type ") ? types : callable).push(name);
    }
  }
  return { callable, types };
}

function commandNames(): string[] {
  const text = readFileSync(resolve(ROOT, "src/core/commands/contracts.ts"), "utf8");
  const block = /export interface CommandPayloads \{([\s\S]*?)\n\}/.exec(text)?.[1];
  if (!block) return [];
  return [...block.matchAll(/^\s{2}(\w+):/gm)].map((match) => match[1]!);
}

function errorCodes(): string[] {
  const dir = resolve(ROOT, "src/core");
  const codes = new Set<string>();
  const walk = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"))
        for (const match of readFileSync(child, "utf8").matchAll(
          /\berrorCode:\s*\x22([^\x22]+)\x22/g,
        ))
          codes.add(match[1]);
    }
  };
  walk(dir);
  return [...codes];
}

test("the engine boundary names only source files that exist", () => {
  assert.equal(boundary.schemaVersion, 2);
  const paths = Object.values(boundary.boundary) as string[];
  assert.ok(paths.length >= 8);
  for (const path of paths) assert.ok(existsSync(resolve(ROOT, path)), path);
});

test("the boundary records its invariants and the conformance pilot status", () => {
  assert.ok(boundary.invariants.length >= 4);
  assert.ok(["ready", "blocked"].includes(boundary.conformancePilot.status));
  if (boundary.conformancePilot.status === "blocked")
    assert.ok(boundary.conformancePilot.reason.length > 40);
  if (boundary.conformancePilot.status === "ready")
    assert.ok(existsSync(resolve(ROOT, boundary.conformancePilot.fixture)));
});

test("the inventory counts match the live sources", () => {
  const exports = engineExports();
  const commands = commandNames();
  const codes = errorCodes();
  const ruleFiles = readdirSync(resolve(ROOT, "rules/roles")).filter((name) =>
    name.endsWith(".json"),
  );
  const rules =
    ruleFiles.reduce(
      (sum, name) =>
        sum +
        (JSON.parse(readFileSync(resolve(ROOT, "rules/roles", name), "utf8")).rules as unknown[])
          .length,
      0,
    ) +
    (JSON.parse(readFileSync(resolve(ROOT, "rules/shared.json"), "utf8")).rules as unknown[])
      .length;
  const versions = (
    readFileSync(resolve(ROOT, "src/core/engine/command-versions.ts"), "utf8").match(
      /RULESET_VERSION\s*=\s*\x22/g,
    ) ?? []
  ).length;
  assert.equal(boundary.inventory.commands, commands.length);
  assert.equal(boundary.inventory.engineCallables, exports.callable.length);
  assert.equal(boundary.inventory.engineTypes, exports.types.length);
  assert.equal(boundary.inventory.errorCodes, codes.length);
  assert.equal(boundary.inventory.rules, rules);
  assert.equal(boundary.inventory.roles, ruleFiles.length);
  assert.equal(boundary.inventory.rulesetVersions, versions);
  assert.deepEqual(new Set(boundary.surface.commands), new Set(commands));
  assert.deepEqual(new Set(boundary.surface.engineCallables), new Set(exports.callable));
  assert.deepEqual(new Set(boundary.surface.engineTypes), new Set(exports.types));
});

test("the read-model query surface matches the console projection", () => {
  const text = readFileSync(resolve(ROOT, "src/application/read-models/table.ts"), "utf8");
  const block = /import \{([\s\S]*?)\} from \x22\.\.\/\.\.\/core\/engine\/index\.ts\x22/.exec(
    text,
  )?.[1];
  const queries = (block ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  assert.deepEqual(new Set(boundary.surface.readModelQueries), new Set(queries));
  assert.equal(boundary.inventory.readModelQueries, queries.length);
});

function rulesetValues(): string[] {
  const text = readFileSync(resolve(ROOT, "src/core/engine/command-versions.ts"), "utf8");
  return [...text.matchAll(/export const \w*RULESET_VERSION\s*=\s*\x22([^\x22]+)\x22/g)].map(
    (match) => match[1]!,
  );
}

test("the boundary records exact error-code and ruleset identities", () => {
  const codes = errorCodes().sort();
  const versions = rulesetValues();
  assert.deepEqual(boundary.surface.errorCodes, codes);
  assert.deepEqual(boundary.surface.rulesetVersions, versions);
  const layered = boundary.errorLayers
    .filter((layer: { count: number | null }) => typeof layer.count === "number")
    .flatMap((layer: { codes: string[] }) => layer.codes);
  assert.equal(new Set(layered).size, layered.length, "an error belongs to one layer only");
  assert.deepEqual([...layered].sort(), codes);
  assert.deepEqual(boundary.baseline, {
    tag: "v0.14.0",
    main: "de6a17a8997f1dfa22ebbc50a36b4bd57640ad7c",
    rules: 172,
    roles: 72,
    commands: 47,
    errorCodes: 108,
    rulesetVersions: 14,
  });
});

test("the error layers cover all 108 core codes", () => {
  const total = boundary.errorLayers
    .filter((layer: { count: number | null }) => typeof layer.count === "number")
    .reduce((sum: number, layer: { count: number }) => sum + layer.count, 0);
  assert.equal(total, 108);
  const commandLayer = boundary.errorLayers.find(
    (layer: { layer: string }) => layer.layer === "command-envelope",
  );
  const journalLayer = boundary.errorLayers.find(
    (layer: { layer: string }) => layer.layer === "journal-replay",
  );
  assert.equal(commandLayer.count, 6);
  assert.equal(journalLayer.count, 2);
});

test("the serialization and lifecycle contracts are explicit", () => {
  assert.deepEqual(boundary.serialization.modes, ["structural", "canonical-byte", "wire-byte"]);
  assert.ok(boundary.serialization.ecmaScript.length >= 5);
  const vectors = boundary.serialization.loneSurrogates.vectors;
  for (const vector of ["\\uD800", "\\uDC00", "a\\uD800b", "\\uD83D\\uDE00"])
    assert.ok(vectors.includes(vector), vector);
  assert.deepEqual(boundary.wasm.initStates, ["idle", "loading", "ready", "failed"]);
  assert.equal(boundary.wasm.partialOperationFallback, false);
  assert.ok(boundary.wasm.lifecycleErrors.includes("engine-unavailable"));
  assert.ok(boundary.ownership.rust.length >= 4);
  assert.ok(boundary.ownership.typescript.length >= 5);
});
