#!/usr/bin/env node
// Enforces the approved crate matrix from Cargo's structured metadata.
import { execFileSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MEMBERS = [
  "grimoria-domain",
  "grimoria-wire",
  "grimoria-conformance",
  "grimoria-wasm",
  "grimoria-cli",
] as const;

const ALLOWED: Record<string, readonly string[]> = {
  "grimoria-domain": [],
  "grimoria-wire": ["grimoria-domain"],
  "grimoria-conformance": ["grimoria-domain", "grimoria-wire"],
  "grimoria-wasm": ["grimoria-domain", "grimoria-wire"],
  "grimoria-cli": ["grimoria-conformance"],
};

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

function readMetadata(root: string): Metadata {
  return JSON.parse(
    execFileSync(
      "cargo",
      ["metadata", "--no-deps", "--locked", "--offline", "--format-version", "1"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  ) as Metadata;
}

export function cargoGraphFailures(root: string): string[] {
  const failures: string[] = [];
  let metadata: Metadata;
  try {
    metadata = readMetadata(root);
  } catch (error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr?.toString().trim();
    return [`cargo metadata failed${stderr ? `: ${stderr}` : ""}`];
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
  const graph = new Map<string, string[]>();
  for (const pkg of packages) {
    if (pkg.source !== null) failures.push(`${pkg.name}: workspace package has a registry source`);
    if (basename(dirname(pkg.manifest_path)) !== pkg.name)
      failures.push(`${pkg.name}: manifest directory does not match the package name`);
    const edges: string[] = [];
    for (const dep of pkg.dependencies) {
      const workspacePath = dep.path ? resolve(dep.path, "Cargo.toml") : null;
      if (dep.source !== null || !workspacePath || !workspacePaths.has(workspacePath)) {
        failures.push(
          `${pkg.name}: external dependency ${dep.rename ?? dep.name} (kind ${dep.kind ?? "normal"}, target ${dep.target ?? "any"})`,
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
