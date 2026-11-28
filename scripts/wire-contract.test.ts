import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;
const DTO = readFileSync(join(ROOT, "crates/grimoria-wire/src/dto.rs"), "utf8");
const SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "contracts/wire/envelope.schema.json"), "utf8"),
) as {
  $defs: {
    request: {
      required: string[];
      additionalProperties: boolean;
      properties: { wireVersion: { const: number }; operation: { enum: string[] } };
    };
    response: { required: string[]; additionalProperties: boolean };
  };
};
const ERROR_SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "contracts/wire/error.schema.json"), "utf8"),
) as {
  required: string[];
  properties: {
    code: { const: string };
    kind: { enum: string[] };
    limitKind: { enum: string[] };
  };
};
const FIXTURE = JSON.parse(
  readFileSync(join(ROOT, "fixtures/conformance/wire-serialization.json"), "utf8"),
) as { fixtureVersion: number; wireVersion: number; vectors: { id: string; input: string }[] };

function rustVersion(): number {
  const match = DTO.match(/pub const WIRE_VERSION: u32 = (\d+);/);
  assert.ok(match, "WIRE_VERSION is declared");
  return Number(match[1]);
}

function rustOperations(): string[] {
  return [...DTO.matchAll(/Self::[A-Za-z]+ => "([a-z_]+)"/g)].map((match) => match[1]);
}

function productionFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? productionFiles(path) : [path];
  });
}

test("the schema and the Rust DTO pin the same version", () => {
  assert.equal(SCHEMA.$defs.request.properties.wireVersion.const, rustVersion());
  assert.equal(FIXTURE.wireVersion, rustVersion());
  assert.equal(FIXTURE.fixtureVersion, 1);
});

test("the schema and the Rust DTO pin the same operation enum", () => {
  assert.deepEqual(
    [...SCHEMA.$defs.request.properties.operation.enum].sort(),
    rustOperations().sort(),
  );
});

test("the operation inventory distinguishes implemented and reserved work", () => {
  const statuses = (SCHEMA as unknown as { "x-operationStatus": Record<string, string> })[
    "x-operationStatus"
  ];
  assert.deepEqual(Object.keys(statuses).sort(), rustOperations().sort());
  assert.deepEqual(
    Object.entries(statuses)
      .filter(([, status]) => status === "implemented")
      .map(([operation]) => operation)
      .sort(),
    ["canonical_bytes"],
  );
  assert.ok(!Object.values(statuses).includes("unavailable"));
  assert.match(
    String((SCHEMA as unknown as { "x-unavailableOperation": string })["x-unavailableOperation"]),
    /engine-contract-violation/,
  );
});

test("every operation names an approved boundary section", () => {
  const schema = SCHEMA as unknown as {
    "x-operationBoundary": Record<string, string>;
  };
  const boundary = JSON.parse(
    readFileSync(join(ROOT, "contracts/engine-boundary.json"), "utf8"),
  ) as { boundary: Record<string, string> };
  assert.deepEqual(Object.keys(schema["x-operationBoundary"]).sort(), rustOperations().sort());
  for (const [operation, path] of Object.entries(schema["x-operationBoundary"])) {
    assert.equal(typeof boundary.boundary[path], "string", `${operation} -> ${path}`);
  }
});

test("the error schema is the machine-readable contract", () => {
  assert.deepEqual(ERROR_SCHEMA.required.sort(), ["code", "kind", "message"]);
  assert.equal(ERROR_SCHEMA.properties.code.const, "engine-contract-violation");
  assert.deepEqual(ERROR_SCHEMA.properties.kind.enum.sort(), [
    "contract",
    "duplicate-key",
    "limit",
    "non-finite-number",
    "syntax",
  ]);
  assert.deepEqual(ERROR_SCHEMA.properties.limitKind.enum.sort(), [
    "collection-entries",
    "depth",
    "input-bytes",
    "nodes",
  ]);
});

test("the envelope requires its fields and forbids extras", () => {
  assert.deepEqual(SCHEMA.$defs.request.required.sort(), ["operation", "payload", "wireVersion"]);
  assert.deepEqual(SCHEMA.$defs.response.required.sort(), ["result", "wireVersion"]);
  assert.equal(SCHEMA.$defs.request.additionalProperties, false);
  assert.equal(SCHEMA.$defs.response.additionalProperties, false);
});

test("every fixture vector has a unique id and strict JSON input", () => {
  assert.equal(new Set(FIXTURE.vectors.map((vector) => vector.id)).size, FIXTURE.vectors.length);
  assert.ok(FIXTURE.vectors.length >= 12);
  for (const vector of FIXTURE.vectors) {
    assert.doesNotThrow(() => JSON.parse(vector.input), vector.id);
  }
});

test("the WASM runner is pinned to the locked wasm-bindgen version", () => {
  const lock = readFileSync(join(ROOT, "Cargo.lock"), "utf8");
  const version = lock.match(/name = "wasm-bindgen"\nversion = "([^"]+)"/)?.[1];
  assert.ok(version, "Cargo.lock pins wasm-bindgen");
  const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
  assert.ok(ci.includes(`wasm-bindgen-cli --version ${version} --locked`));
  assert.ok(ci.includes("CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUNNER"));
});

test("the wire dependencies are in the lock file", () => {
  const lock = readFileSync(join(ROOT, "Cargo.lock"), "utf8");
  for (const name of ["ryu-js", "wasm-bindgen", "wasm-bindgen-test"]) {
    assert.match(lock, new RegExp(`name = "${name}"`));
  }
});

test("no production module imports the wire crate or a WASM asset", () => {
  for (const path of productionFiles(join(ROOT, "src"))) {
    const source = readFileSync(path, "utf8");
    assert.ok(!source.includes("grimoria-wire"), path);
    assert.ok(!source.includes("grimoria_wasm"), path);
  }
});
