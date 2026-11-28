import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cargoGraphFailures } from "./check-cargo-graph.ts";

const CRATES = [
  "grimoria-domain",
  "grimoria-wire",
  "grimoria-conformance",
  "grimoria-wasm",
  "grimoria-cli",
];
const EDGES: Record<string, string[]> = {
  "grimoria-domain": [],
  "grimoria-wire": ["grimoria-domain"],
  "grimoria-conformance": ["grimoria-domain", "grimoria-wire"],
  "grimoria-wasm": ["grimoria-domain", "grimoria-wire"],
  "grimoria-cli": ["grimoria-conformance"],
};

function workspace(edges: Record<string, string[]> = EDGES): string {
  const root = mkdtempSync(join(tmpdir(), "cargo-graph-"));
  writeFileSync(
    join(root, "Cargo.toml"),
    `[workspace]\nmembers = [${CRATES.map((name) => `"crates/${name}"`).join(", ")}]\n`,
  );
  for (const name of CRATES) {
    mkdirSync(join(root, "crates", name, "src"), { recursive: true });
    writeFileSync(join(root, "crates", name, "src", "lib.rs"), "");
    const deps = (edges[name] ?? []).map((dep) => `${dep} = { path = "../${dep}" }`).join("\n");
    writeFileSync(
      join(root, "crates", name, "Cargo.toml"),
      `[package]\nname = "${name}"\nversion = "0.0.0"\n\n[dependencies]\n${deps}\n`,
    );
  }
  return root;
}

test("the approved workspace graph passes", () => {
  const root = workspace();
  try {
    assert.deepEqual(cargoGraphFailures(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an extra edge fails", () => {
  const root = workspace({ ...EDGES, "grimoria-domain": ["grimoria-wire"] });
  try {
    assert.ok(
      cargoGraphFailures(root).some((failure) =>
        failure.includes("edge to grimoria-wire is not allowed"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a cycle fails", () => {
  const root = workspace({ ...EDGES, "grimoria-domain": ["grimoria-cli"] });
  try {
    const failures = cargoGraphFailures(root);
    assert.ok(failures.some((failure) => failure.includes("not allowed")));
    assert.ok(failures.some((failure) => failure.includes("cycle")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dependency outside the workspace fails", () => {
  const root = workspace({ ...EDGES, "grimoria-wire": ["grimoria-domain", "serde"] });
  try {
    assert.ok(
      cargoGraphFailures(root).some((failure) => failure.includes("not a workspace member")),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
