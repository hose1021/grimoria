import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cargoGraphFailures } from "./check-cargo-graph.ts";

const MEMBERS = [
  "grimoria-domain",
  "grimoria-wire",
  "grimoria-conformance",
  "grimoria-wasm",
  "grimoria-cli",
];
type Syntax = "plain" | "renamed" | "target" | "optional" | "workspace" | "dev" | "build";
interface Edge {
  from: string;
  to: string;
  syntax?: Syntax;
}
const BASE: Edge[] = [
  { from: "grimoria-wire", to: "grimoria-domain" },
  { from: "grimoria-conformance", to: "grimoria-domain" },
  { from: "grimoria-conformance", to: "grimoria-wire" },
  { from: "grimoria-wasm", to: "grimoria-domain" },
  { from: "grimoria-wasm", to: "grimoria-wire" },
  { from: "grimoria-cli", to: "grimoria-conformance" },
];

function writeCrate(root: string, name: string, edges: Edge[]): void {
  mkdirSync(join(root, "crates", name, "src"), { recursive: true });
  writeFileSync(join(root, "crates", name, "src", "lib.rs"), "");
  const normal: string[] = [];
  const target: string[] = [];
  const dev: string[] = [];
  const build: string[] = [];
  for (const edge of edges.filter((candidate) => candidate.from === name)) {
    const syntax = edge.syntax ?? "plain";
    const alias = `alias-${edge.to}`;
    const base = `path = "../${edge.to}"`;
    if (syntax === "renamed") normal.push(`${alias} = { package = "${edge.to}", ${base} }`);
    else if (syntax === "optional") normal.push(`${edge.to} = { ${base}, optional = true }`);
    else if (syntax === "workspace") normal.push(`${edge.to} = { workspace = true }`);
    else if (syntax === "target") target.push(`${edge.to} = { ${base} }`);
    else if (syntax === "dev") dev.push(`${edge.to} = { ${base} }`);
    else if (syntax === "build") build.push(`${edge.to} = { ${base} }`);
    else normal.push(`${edge.to} = { ${base} }`);
  }
  const sections = [
    `[package]\nname = "${name}"\nversion = "0.0.0"\nedition = "2024"\n`,
    normal.length ? `[dependencies]\n${normal.join("\n")}\n` : "",
    target.length ? `[target.'cfg(unix)'.dependencies]\n${target.join("\n")}\n` : "",
    dev.length ? `[dev-dependencies]\n${dev.join("\n")}\n` : "",
    build.length ? `[build-dependencies]\n${build.join("\n")}\n` : "",
  ];
  writeFileSync(join(root, "crates", name, "Cargo.toml"), sections.filter(Boolean).join("\n"));
}

function workspace(
  edges: Edge[] = BASE,
  options: { members?: string[]; extra?: string; external?: boolean } = {},
): string {
  const root = mkdtempSync(join(tmpdir(), "cargo-graph-"));
  const all = [...MEMBERS, ...(options.extra ? [options.extra] : [])];
  const members = options.members ?? all;
  writeFileSync(
    join(root, "Cargo.toml"),
    `[workspace]\nresolver = "3"\nmembers = [${members
      .map((name) => `"crates/${name}"`)
      .join(", ")}]\n\n[workspace.dependencies]\n${all
      .map((name) => `${name} = { path = "crates/${name}" }`)
      .join("\n")}\n`,
  );
  for (const name of all) writeCrate(root, name, edges);
  if (options.external) {
    mkdirSync(join(root, "external-crate", "src"), { recursive: true });
    writeFileSync(join(root, "external-crate", "src", "lib.rs"), "");
    writeFileSync(
      join(root, "external-crate", "Cargo.toml"),
      '[package]\nname = "external-crate"\nversion = "0.0.0"\nedition = "2024"\n',
    );
  }
  try {
    execFileSync("cargo", ["generate-lockfile", "--offline"], { cwd: root, stdio: "ignore" });
  } catch {
    // A cycle cannot produce a lock file; the checker must report the metadata failure.
  }
  return root;
}

function check(root: string): string[] {
  return cargoGraphFailures(root);
}

test("the canonical five-crate workspace passes", () => {
  const root = workspace();
  try {
    assert.deepEqual(check(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const syntax of ["renamed", "target", "optional", "workspace"] as const) {
  test(`an allowed ${syntax} dependency is accepted`, () => {
    const root = workspace(
      BASE.map((edge) =>
        edge.from === "grimoria-wire" && edge.to === "grimoria-domain" ? { ...edge, syntax } : edge,
      ),
    );
    try {
      assert.deepEqual(check(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("allowed dev and build dependencies are accepted", () => {
  const root = workspace([
    ...BASE,
    { from: "grimoria-conformance", to: "grimoria-domain", syntax: "dev" },
    { from: "grimoria-cli", to: "grimoria-conformance", syntax: "build" },
  ]);
  try {
    assert.deepEqual(check(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const syntax of ["plain", "renamed", "target", "optional", "dev", "build"] as const) {
  test(`an unauthorized ${syntax} workspace edge fails`, () => {
    const root = workspace([...BASE, { from: "grimoria-domain", to: "grimoria-wire", syntax }]);
    try {
      assert.ok(
        check(root).some((failure) => failure.includes("not allowed")),
        syntax,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("an external dependency fails", () => {
  const root = workspace(
    [...BASE, { from: "grimoria-wire", to: "external-crate", syntax: "plain" }],
    { external: true },
  );
  // The external crate is inside the workspace root, so the edge must use ../../.
  writeFileSync(
    join(root, "crates", "grimoria-wire", "Cargo.toml"),
    '[package]\nname = "grimoria-wire"\nversion = "0.0.0"\nedition = "2024"\n\n[dependencies]\ngrimoria-domain = { path = "../grimoria-domain" }\nexternal-crate = { path = "../../external-crate" }\n',
  );
  try {
    assert.ok(
      check(root).some(
        (failure) =>
          failure.includes("external dependency") ||
          failure.includes("not an approved workspace package"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing member fails", () => {
  const root = workspace(BASE, { members: MEMBERS.slice(0, 4) });
  try {
    assert.ok(check(root).some((failure) => failure.includes("expected 5")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an extra member fails", () => {
  const root = workspace(BASE, { extra: "grimoria-extra" });
  try {
    assert.ok(
      check(root).some((failure) =>
        failure.includes("unexpected workspace package grimoria-extra"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dependency cycle fails", () => {
  const root = workspace([...BASE, { from: "grimoria-domain", to: "grimoria-wire" }]);
  try {
    assert.ok(check(root).some((failure) => failure.includes("cycle")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
