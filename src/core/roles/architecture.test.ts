// Locks the role dependency direction from ADR 0002. A role module reads the
// model and its own contract. The engine owns shared mechanics. No role module
// may import the engine; this check fails on any such import.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROLES_ROOT = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = resolve(ROLES_ROOT, "..", "..");
const REPO_ROOT = resolve(SRC_ROOT, "..");
const ENGINE_ROOT = join(SRC_ROOT, "core", "engine");
const MODEL_ROOT = join(SRC_ROOT, "core", "model");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/** Static import specifiers plus literal dynamic imports. */
function importSpecifiers(path: string): string[] {
  const text = readFileSync(path, "utf8");
  const specifiers: string[] = [];
  for (const match of text.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specifiers.push(match[1]!);
  for (const match of text.matchAll(/(?:^|\n)[ \t]*import\s*["']([^"']+)["']/g)) {
    specifiers.push(match[1]!);
  }
  for (const match of text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    specifiers.push(match[1]!);
  }
  return specifiers;
}

// A path boundary needs the separator; a bare prefix match would accept a
// sibling directory whose name starts the same way.
function isInside(path: string, root: string): boolean {
  return path === root || path.startsWith(root + sep);
}

test("role modules import the engine only through the documented exceptions", () => {
  const violations: string[] = [];
  for (const path of walk(ROLES_ROOT)) {
    if (!path.endsWith(".ts") || path.endsWith(".test.ts") || path.endsWith(".test-d.ts")) continue;
    const file = relative(REPO_ROOT, path).split(sep).join("/");
    const allowed: readonly string[] = [];
    const engineImports = importSpecifiers(path).filter(
      (specifier) =>
        specifier.startsWith(".") && isInside(resolve(dirname(path), specifier), ENGINE_ROOT),
    );
    for (const specifier of engineImports) {
      if (!allowed.includes(specifier)) violations.push(`${file}: ${specifier}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    "a role module may not import src/core/engine outside ADR 0002's exception table",
  );
});

test("the registry imports only role and model modules", () => {
  const registry = join(ROLES_ROOT, "registry.ts");
  const outside = importSpecifiers(registry).filter((specifier) => {
    const target = resolve(dirname(registry), specifier);
    return !isInside(target, ROLES_ROOT) && !isInside(target, MODEL_ROOT);
  });
  assert.deepEqual(outside, [], "the registry may import only src/core/roles and src/core/model");
});
