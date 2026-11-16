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

// The shared resolution writers and their engine owners. A new owner is a
// reviewed line here; a writer call anywhere else is a broken boundary.
const WRITER_OWNERS: Readonly<Record<string, readonly string[]>> = {
  kill: ["ability.ts", "bmr.ts", "day.ts", "death.ts", "pukka.ts", "sv.ts"],
  setWinner: ["commands.ts", "day.ts", "death.ts", "sv.ts"],
  replaceCharacter: ["sv.ts"],
  swapCharacters: ["sv.ts"],
  becomeDemon: ["death.ts", "death-ability.ts"],
};

const NON_ENGINE_ROOTS = [
  "src/core/roles/",
  "src/application/",
  "src/infrastructure/",
  "src/ui/",
  "src/entry/",
];

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Writer violations for one repo-relative file and its source text. */
function writerViolations(file: string, source: string): string[] {
  const text = stripComments(source);
  const violations: string[] = [];
  const engine = file.startsWith("src/core/engine/");
  const nonEngine = NON_ENGINE_ROOTS.some((root) => file.startsWith(root));
  for (const [writer, owners] of Object.entries(WRITER_OWNERS)) {
    const call = new RegExp("(?<!function )\\b" + writer + "\\s*\\(");
    if (!call.test(text)) continue;
    if (engine) {
      const name = file.slice("src/core/engine/".length);
      if (!owners.includes(name)) violations.push(`${file}: shared writer ${writer}`);
    } else if (nonEngine) {
      violations.push(`${file}: shared writer ${writer}`);
    }
  }
  if (nonEngine) {
    if (/\.(?:deaths|executions|effects)\.push\s*\(/.test(text)) {
      violations.push(`${file}: direct record write`);
    }
    if (/\bstate\.winner\s*=(?!=)/.test(text) || /\bplayer\.roleId\s*=(?!=)/.test(text)) {
      violations.push(`${file}: direct record write`);
    }
  }
  return violations;
}

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

test("shared resolution writers belong to the engine owners", () => {
  const violations: string[] = [];
  for (const path of walk(SRC_ROOT)) {
    if (!/\.(?:ts|tsx)$/.test(path)) continue;
    if (path.endsWith(".test.ts") || path.endsWith(".test-d.ts")) continue;
    const file = relative(REPO_ROOT, path).split(sep).join("/");
    violations.push(...writerViolations(file, readFileSync(path, "utf8")));
  }
  assert.deepEqual(
    violations,
    [],
    "a role, UI, application or entry file may not call a shared writer or write its record",
  );
});

test("the writer detector catches a broken owner and ignores comments", () => {
  assert.deepEqual(
    writerViolations("src/core/roles/gambler/role.ts", "kill(state, '1', 'ability');"),
    ["src/core/roles/gambler/role.ts: shared writer kill"],
  );
  assert.deepEqual(
    writerViolations("src/core/roles/gambler/role.ts", "// kill(state)\nconst ok = true;"),
    [],
  );
  assert.deepEqual(writerViolations("src/core/engine/new.ts", "setWinner(state, 'good', 'x');"), [
    "src/core/engine/new.ts: shared writer setWinner",
  ]);
  assert.deepEqual(
    writerViolations("src/core/engine/death.ts", "setWinner(state, 'good', 'x');"),
    [],
  );
  assert.deepEqual(writerViolations("src/ui/shell.tsx", "state.effects.push({});"), [
    "src/ui/shell.tsx: direct record write",
  ]);
});
