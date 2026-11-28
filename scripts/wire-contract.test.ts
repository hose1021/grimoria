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
