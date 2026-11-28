#!/usr/bin/env node
// Enforces the approved crate matrix from Cargo's structured metadata.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = "registry+https://github.com/rust-lang/crates.io-index";

const MEMBERS = [
  "grimoria-domain",
  "grimoria-wire",
  "grimoria-conformance",
  "grimoria-wasm",
  "grimoria-cli",
] as const;

const ALLOWED: Record<string, readonly string[]> = {
  "grimoria-domain": ["grimoria-wire"],
  "grimoria-wire": [],
  "grimoria-conformance": ["grimoria-domain", "grimoria-wire"],
  "grimoria-wasm": ["grimoria-domain", "grimoria-wire"],
  "grimoria-cli": ["grimoria-conformance"],
};

const EXTERNAL_ALLOWED: Record<string, Record<string, readonly string[]>> = {
  "grimoria-wire": { normal: ["ryu-js"] },
  "grimoria-wasm": { normal: ["wasm-bindgen"], dev: ["wasm-bindgen-test"] },
};

/** Approved direct dependencies, with their permitted dependency kind. */
export function isApprovedExternal(
  packageName: string,
  dependencyName: string,
  kind: string,
): boolean {
  return (EXTERNAL_ALLOWED[packageName]?.[kind] ?? []).includes(dependencyName);
}

/**
 * Every external package the resolved graph may contain. A version change is a
 * deliberate policy change, never an accidental lock update.
 */
const APPROVED_RESOLVED: Record<string, string> = {
  autocfg: "1.5.1",
  bumpalo: "3.20.4",
  cast: "0.3.0",
  cc: "1.12.0",
  "cfg-if": "1.0.5",
  "find-msvc-tools": "0.1.16",
  "futures-core": "0.3.34",
  "futures-task": "0.3.34",
  "futures-util": "0.3.34",
  itoa: "1.0.19",
  "js-sys": "0.3.107",
  libm: "0.2.16",
  memchr: "2.8.3",
  minicov: "0.3.8",
  "nu-ansi-term": "0.50.3",
  "num-traits": "0.2.19",
  oorandom: "11.1.5",
  "pin-project-lite": "0.2.18",
  "proc-macro2": "1.0.107",
  quote: "1.0.47",
  rustversion: "1.0.23",
  "ryu-js": "1.0.4",
  "same-file": "1.0.6",
  serde: "1.0.229",
  serde_core: "1.0.229",
  serde_derive: "1.0.229",
  serde_json: "1.0.154",
  shlex: "2.0.1",
  slab: "0.4.12",
  syn: "3.0.10",
  tokio: "1.54.1",
  "unicode-ident": "1.0.27",
  walkdir: "2.5.1",
  "wasm-bindgen": "0.2.130",
  "wasm-bindgen-futures": "0.4.80",
  "wasm-bindgen-macro": "0.2.130",
  "wasm-bindgen-macro-support": "0.2.130",
  "wasm-bindgen-shared": "0.2.130",
  "wasm-bindgen-test": "0.3.80",
  "wasm-bindgen-test-macro": "0.3.80",
  "wasm-bindgen-test-shared": "0.2.130",
  "winapi-util": "0.1.11",
  "windows-link": "0.2.1",
  "windows-sys": "0.61.2",
  zmij: "1.0.23",
};

/** True only for an approved resolved external name, version and source. */
export function isApprovedResolved(name: string, version: string, source: string | null): boolean {
  return source === REGISTRY && APPROVED_RESOLVED[name] === version;
}

interface Dependency {
  name: string;
  rename: string | null;
  kind: string | null;
  target: string | null;
  optional: boolean;
  path: string | null;
  source: string | null;
}

interface Package {
  id: string;
  name: string;
  version: string;
  source: string | null;
  manifest_path: string;
  dependencies: Dependency[];
}

interface Metadata {
  packages: Package[];
  workspace_members: string[];
  workspace_root: string;
}

interface LockedPackage {
  version: string;
  source: string;
  checksum: string;
}

function readMetadata(root: string): Metadata {
  return JSON.parse(
    execFileSync("cargo", ["metadata", "--locked", "--offline", "--format-version", "1"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  ) as Metadata;
}

function readLock(root: string): Map<string, LockedPackage> {
  const text = readFileSync(join(root, "Cargo.lock"), "utf8");
  const locked = new Map<string, LockedPackage>();
  for (const block of text.split("[[package]]").slice(1)) {
    const name = block.match(/^name = "([^"]+)"/m)?.[1];
    const version = block.match(/^version = "([^"]+)"/m)?.[1];
    const source = block.match(/^source = "([^"]+)"/m)?.[1];
    const checksum = block.match(/^checksum = "([^"]+)"/m)?.[1];
    if (name && version && source && checksum)
      locked.set(`${name}@${version}`, { version, source, checksum });
  }
  return locked;
}

/** Rejects patches, replacements and registry substitutions in manifests. */
export function manifestPolicyFailures(root: string): string[] {
  const failures: string[] = [];
  const manifests = [
    join(root, "Cargo.toml"),
    ...readdirSync(join(root, "crates"))
      .map((name) => join(root, "crates", name, "Cargo.toml"))
      .filter((path) => statSync(path).isFile()),
  ];
  for (const path of manifests) {
    const text = readFileSync(path, "utf8");
    if (/^\s*\[(?:patch|replace)(?:\.|\])/m.test(text))
      failures.push(`${path}: patch or replace is not allowed`);
  }
  for (const name of ["config.toml", "config"]) {
    const path = join(root, ".cargo", name);
    try {
      const text = readFileSync(path, "utf8");
      if (/^\s*\[source\./m.test(text) || /replace-with\s*=/m.test(text))
        failures.push(`${path}: source replacement is not allowed`);
    } catch {
      // No local Cargo configuration is the normal case.
    }
  }
  return failures;
}

export function cargoGraphFailures(root: string): string[] {
  const failures = manifestPolicyFailures(root);
  let metadata: Metadata;
  try {
    metadata = readMetadata(root);
  } catch (error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr?.toString().trim();
    return [...failures, `cargo metadata failed${stderr ? `: ${stderr}` : ""}`];
  }
  let locked: Map<string, LockedPackage>;
  try {
    locked = readLock(root);
  } catch {
    return [...failures, "Cargo.lock is missing or unreadable"];
  }
  const workspaceIds = new Set(metadata.workspace_members);
  const packages = metadata.packages.filter((pkg) => workspaceIds.has(pkg.id));
  const names = packages.map((pkg) => pkg.name);
  if (workspaceIds.size !== MEMBERS.length)
    failures.push(`workspace has ${workspaceIds.size} members, expected ${MEMBERS.length}`);
  if (packages.length !== MEMBERS.length)
    failures.push(`metadata has ${packages.length} workspace packages, expected ${MEMBERS.length}`);
  for (const expected of MEMBERS)
    if (!names.includes(expected)) failures.push(`missing workspace package ${expected}`);
  for (const name of names)
    if (!MEMBERS.includes(name as (typeof MEMBERS)[number]))
      failures.push(`unexpected workspace package ${name}`);
  if (new Set(names).size !== names.length) failures.push("duplicate workspace package names");

  const workspacePaths = new Set(packages.map((pkg) => resolve(pkg.manifest_path)));
  for (const pkg of metadata.packages) {
    if (workspaceIds.has(pkg.id)) continue;
    if (!isApprovedResolved(pkg.name, pkg.version, pkg.source)) {
      failures.push(
        `${pkg.name}@${pkg.version}: resolved package is not approved (source ${pkg.source ?? "path/git"})`,
      );
      continue;
    }
    if (!pkg.id.endsWith(`${pkg.name}@${pkg.version}`))
      failures.push(`${pkg.name}@${pkg.version}: package identity does not match its version`);
    const lock = locked.get(`${pkg.name}@${pkg.version}`);
    if (
      !lock ||
      lock.version !== pkg.version ||
      lock.source !== pkg.source ||
      !/^[0-9a-f]{64}$/.test(lock.checksum)
    )
      failures.push(`${pkg.name}@${pkg.version}: locked source or checksum does not match`);
  }

  const graph = new Map<string, string[]>();
  for (const pkg of packages) {
    if (pkg.source !== null) failures.push(`${pkg.name}: workspace package has a registry source`);
    if (basename(dirname(pkg.manifest_path)) !== pkg.name)
      failures.push(`${pkg.name}: manifest directory does not match the package name`);
    const edges: string[] = [];
    for (const dep of pkg.dependencies) {
      const kind = dep.kind ?? "normal";
      const workspacePath = dep.path ? resolve(dep.path, "Cargo.toml") : null;
      if (dep.path != null && (!workspacePath || !workspacePaths.has(workspacePath))) {
        failures.push(`${pkg.name}: path substitution ${dep.name} is not allowed`);
        continue;
      }
      if (dep.source !== null || !workspacePath || !workspacePaths.has(workspacePath)) {
        if (isApprovedExternal(pkg.name, dep.name, kind)) continue;
        failures.push(
          `${pkg.name}: external dependency ${dep.rename ?? dep.name} (kind ${kind}, target ${dep.target ?? "any"}) is not allowed`,
        );
        continue;
      }
      if (!MEMBERS.includes(dep.name as (typeof MEMBERS)[number])) {
        failures.push(`${pkg.name}: dependency ${dep.name} is not an approved workspace package`);
        continue;
      }
      edges.push(dep.name);
      const allowed = new Set(ALLOWED[pkg.name] ?? []);
      if (!allowed.has(dep.name))
        failures.push(
          `${pkg.name}: edge to ${dep.name} is not allowed (kind ${dep.kind ?? "normal"}, target ${dep.target ?? "any"})`,
        );
    }
    graph.set(pkg.name, edges);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (name: string, trail: string[]): void => {
    if (visiting.has(name)) {
      failures.push(`dependency cycle: ${[...trail, name].join(" -> ")}`);
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dep of graph.get(name) ?? []) visit(dep, [...trail, name]);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of graph.keys()) visit(name, []);
  return failures;
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const failures = cargoGraphFailures(root);
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    console.error(`Cargo dependency graph failed with ${failures.length} problem(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("Cargo dependency graph matches the approved matrix (cargo metadata, locked).");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
