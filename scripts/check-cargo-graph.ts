#!/usr/bin/env node
// Enforces the approved crate dependency matrix and rejects cycles.
import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED: Record<string, readonly string[]> = {
  "grimoria-domain": [],
  "grimoria-wire": ["grimoria-domain"],
  "grimoria-conformance": ["grimoria-domain", "grimoria-wire"],
  "grimoria-wasm": ["grimoria-domain", "grimoria-wire"],
  "grimoria-cli": ["grimoria-conformance"],
};

function memberList(text: string): string[] {
  const block = /\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/.exec(text)?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]!);
}

function packageName(text: string): string | null {
  return /\[package\][\s\S]*?name\s*=\s*"([^"]+)"/.exec(text)?.[1] ?? null;
}

function dependencyNames(text: string): string[] {
  const names: string[] = [];
  for (const section of ["dependencies", "dev-dependencies", "build-dependencies"]) {
    const escaped = section.replaceAll("-", "\\-");
    const block = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\[|$)`).exec(text)?.[1];
    if (!block) continue;
    for (const line of block.split("\n")) {
      const match = /^\s*([A-Za-z0-9_-]+)\s*=/.exec(line);
      if (match?.[1]) names.push(match[1]);
    }
  }
  return names;
}

export function cargoGraphFailures(root: string): string[] {
  const failures: string[] = [];
  const rootManifest = join(root, "Cargo.toml");
  if (!existsSync(rootManifest)) return ["Cargo.toml is missing"];
  const members = memberList(readFileSync(rootManifest, "utf8"));
  if (!members.length) failures.push("the workspace has no members");
  const names = new Map<string, string[]>();
  for (const member of members) {
    const manifest = join(root, member, "Cargo.toml");
    if (!existsSync(manifest)) {
      failures.push(`${member}: Cargo.toml is missing`);
      continue;
    }
    const text = readFileSync(manifest, "utf8");
    const name = packageName(text);
    if (!name) {
      failures.push(`${member}: package name is missing`);
      continue;
    }
    if (name !== basename(member))
      failures.push(`${member}: package name ${name} differs from the directory`);
    if (names.has(name)) failures.push(`${name}: duplicate workspace member`);
    names.set(name, dependencyNames(text));
  }
  for (const [name] of names) {
    if (!(name in ALLOWED)) failures.push(`${name}: crate is not in the approved matrix`);
  }
  for (const [name, deps] of names) {
    const allowed = new Set(ALLOWED[name] ?? []);
    for (const dep of deps) {
      if (!names.has(dep)) failures.push(`${name}: dependency ${dep} is not a workspace member`);
      if (!allowed.has(dep)) failures.push(`${name}: edge to ${dep} is not allowed`);
    }
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
    for (const dep of names.get(name) ?? []) visit(dep, [...trail, name]);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of names.keys()) visit(name, []);
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
  console.log("Cargo dependency graph is acyclic and matches the approved matrix.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
