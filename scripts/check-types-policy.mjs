#!/usr/bin/env node
// Fails on forbidden or unexplained TypeScript suppressions, restricted
// assertions, layer violations and type escapes in runtime source.
//
// Limitation: this scan is textual and line-based. It classifies the import
// forms listed below and reports the edges they create. It cannot prove that no
// bypass exists (a cast through a helper, an object reassembled at runtime, a
// specifier built at runtime and passed to a dynamic import in src/ui). Review
// of the import graph and of the two assertion files is the second control.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const JS_ROOT = join(ROOT, "js");
const SRC_ROOT = join(ROOT, "src");

// Measured on the legacy tree when the ratchet was introduced. It may only go
// down; every migrated module lowers it in the same commit.
export const LEGACY_ANY_BASELINE = 77;

const ALLOWED_ASSERTION_FILES = new Set([
  "src/core/model/validated.ts",
  "src/application/dispatch/adopt.ts"
]);

const LAYER_BY_PREFIX = [
  ["src/core/", "core"],
  ["src/application/", "application"],
  ["src/infrastructure/", "infrastructure"],
  ["src/ui/", "ui"],
  ["src/entry/", "entry"],
  ["src/data/", "data"],
  ["js/", "legacy"],
  ["scripts/", "scripts"]
];

const FORBIDDEN_EDGES = {
  core: new Set(["application", "infrastructure", "ui", "entry"]),
  application: new Set(["infrastructure", "ui", "entry"]),
  infrastructure: new Set(["ui", "entry"]),
  ui: new Set(["infrastructure", "entry"])
};

const BROWSER_GLOBALS = /\b(window|document|localStorage|sessionStorage|navigator)\b|\bDate\.now\s*\(/;

/** Strips comments; keeps string literals when `keepStrings` is true. */
export function stripComments(text, keepStrings) {
  let out = "";
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      const start = i;
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") { i += 2; continue; }
        if (text[i] === quote) { i += 1; break; }
        i += 1;
      }
      out += keepStrings ? text.slice(start, i) : '""';
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** Strips string literals but keeps comments, because JSDoc is type syntax. */
export function stripStrings(text) {
  let out = "";
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\") { i += 2; continue; }
        if (text[i] === quote) { i += 1; break; }
        i += 1;
      }
      out += '""';
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * Counts `any` tokens. Legacy JavaScript keeps comments, because JSDoc is its
 * type syntax; TypeScript strips comments so prose cannot inflate the count.
 */
export function countAnyTokens(text, keepComments = false) {
  const source = keepComments ? stripStrings(text) : stripComments(text, false);
  return (source.match(/\bany\b/g) ?? []).length;
}

/** Suppression policy: no @ts-ignore/@ts-nocheck, every @ts-expect-error explained. */
export function checkSource(text, file = "source") {
  const violations = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/@ts-ignore\b/.test(line)) {
      violations.push(`${file}:${index + 1}: @ts-ignore is forbidden; fix the type or use a documented boundary`);
    }
    if (/@ts-nocheck\b/.test(line)) {
      violations.push(`${file}:${index + 1}: @ts-nocheck is forbidden`);
    }
    const expected = line.match(/@ts-expect-error(.*)$/);
    if (expected && !/^\s*(--|:)\s*\S/.test(expected[1])) {
      violations.push(`${file}:${index + 1}: @ts-expect-error needs a reason after -- or :`);
    }
  }
  return violations;
}

/** `as ValidatedState` and `as unknown as` are confined to the two boundary files. */
export function checkAssertions(text, file) {
  if (ALLOWED_ASSERTION_FILES.has(file)) return [];
  const violations = [];
  const stripped = stripComments(text, false);
  const lines = stripped.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/\bas\s+ValidatedState\b/.test(line)) {
      violations.push(`${file}:${index + 1}: 'as ValidatedState' is allowed only in ${[...ALLOWED_ASSERTION_FILES].join(", ")}`);
    }
    if (/\bas\s+unknown\s+as\b/.test(line)) {
      violations.push(`${file}:${index + 1}: 'as unknown as' is allowed only in ${[...ALLOWED_ASSERTION_FILES].join(", ")}`);
    }
  }
  return violations;
}

/** No browser global and no ambient clock in the pure layers. */
export function checkNoBrowserGlobals(text, file) {
  const stripped = stripComments(text, false);
  const lines = stripped.split(/\r?\n/);
  const violations = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (BROWSER_GLOBALS.test(lines[index])) {
      violations.push(`${file}:${index + 1}: a browser global or Date.now is not allowed in core or application`);
    }
  }
  return violations;
}

export function layerOf(relativePath) {
  for (const [prefix, layer] of LAYER_BY_PREFIX) {
    if (relativePath.startsWith(prefix)) return layer;
  }
  return "other";
}

export function isTestFile(relativePath) {
  return /\.test\.ts$|\.test-d\.ts$/.test(relativePath) || relativePath.includes("/test-fixtures/");
}

/**
 * Extracts every static specifier form: import, side-effect import,
 * `export … from`, `export * from`, `import type`, literal `import()`.
 * A dynamic import with a non-literal argument is reported as `dynamic: true`.
 */
export function extractSpecifiers(text) {
  const source = stripComments(text, true);
  const found = [];
  const staticForm = /\b(import|export)\s+([^;'"]{0,400}?)\bfrom\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(staticForm)) {
    found.push({ specifier: match[3], typeOnly: /^type\b/.test(match[2].trim()) });
  }
  const bareForm = /\bimport\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(bareForm)) {
    found.push({ specifier: match[1], typeOnly: false, sideEffect: true });
  }
  const dynamicForm = /\bimport\s*\(\s*([^)]*?)\s*\)/g;
  for (const match of source.matchAll(dynamicForm)) {
    const argument = match[1].trim();
    if (/^["'][^"']+["']$/.test(argument)) {
      found.push({ specifier: argument.slice(1, -1), typeOnly: false, dynamic: true });
    } else {
      found.push({ specifier: null, typeOnly: false, dynamic: true, nonLiteral: true });
    }
  }
  return found;
}

export function checkImports(text, file) {
  const violations = [];
  const test = isTestFile(file);
  const layer = layerOf(file);
  const directory = dirname(file);

  for (const entry of extractSpecifiers(text)) {
    if (entry.nonLiteral) {
      if (layer === "core" || layer === "application") {
        violations.push(`${file}: a dynamic import with a non-literal specifier is not allowed in ${layer}`);
      }
      continue;
    }
    const specifier = entry.specifier;
    if (typeof specifier !== "string") continue;

    if (specifier.startsWith("node:")) {
      if (!test && layer !== "scripts") {
        violations.push(`${file}: '${specifier}' is allowed only in scripts/ and test files`);
      }
      continue;
    }

    if (specifier.startsWith("#") || specifier.startsWith("@/")) {
      violations.push(`${file}: '${specifier}' uses an alias; only relative and bare specifiers are allowed`);
      continue;
    }

    if (specifier.startsWith(".")) {
      const target = relative(ROOT, resolve(ROOT, directory, specifier)).split(sep).join("/");
      const targetLayer = layerOf(target);

      if (isTestFile(target) && !test) {
        violations.push(`${file}: production code imports test file ${target}`);
        continue;
      }

      if (targetLayer === "legacy") {
        const allowedInfrastructure = layer === "infrastructure" || layer === "entry" || test;
        if (!allowedInfrastructure) {
          violations.push(`${file}: an import from the legacy tree is not allowed in ${layer}`);
        }
        continue;
      }

      if (test) {
        if (layer === "core" && targetLayer === "infrastructure") {
          violations.push(`${file}: a core test must not import infrastructure`);
        }
        continue;
      }

      const forbidden = FORBIDDEN_EDGES[layer];
      if (forbidden && targetLayer !== layer && forbidden.has(targetLayer)) {
        violations.push(`${file}: ${layer} must not import ${targetLayer} (${specifier})`);
      }
      continue;
    }

    if (layer === "core" || layer === "application") {
      violations.push(`${file}: a bare specifier '${specifier}' is not allowed in ${layer}`);
    }
  }
  return violations;
}

/** All per-file rules for one source file. */
export function checkFile(text, file) {
  const violations = [...checkSource(text, file)];
  if (!file.startsWith("src/")) return violations;

  violations.push(...checkAssertions(text, file));
  violations.push(...checkImports(text, file));

  const layer = layerOf(file);
  if (!isTestFile(file) && (layer === "core" || layer === "application")) {
    violations.push(...checkNoBrowserGlobals(text, file));
  }

  const anyCount = countAnyTokens(text);
  if (anyCount > 0) {
    violations.push(`${file}: ${anyCount} 'any' token(s); any is not allowed under src/`);
  }
  return violations;
}

async function collectFiles(directory, pattern = /\.(js|ts|tsx)$/) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path, pattern));
    else if (pattern.test(entry.name)) files.push(path);
  }
  return files;
}

export async function checkDirectory(directory = JS_ROOT) {
  const files = await collectFiles(directory);
  const violations = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    violations.push(...checkSource(text, relative(ROOT, file)));
  }
  return violations;
}

/** UI shell token -> the `css/app.css` `:root` token it must mirror. */
export const TOKEN_MAP = Object.freeze({
  "--color-bg": "--bg",
  "--color-panel": "--panel",
  "--color-panel-2": "--panel-2",
  "--color-line": "--line",
  "--color-line-2": "--line-2",
  "--color-text": "--text",
  "--color-muted": "--muted",
  "--color-accent": "--accent",
  "--color-accent-dim": "--accent-dim",
  "--color-danger": "--danger",
  "--color-townsfolk": "--townsfolk",
  "--color-outsider": "--outsider",
  "--color-minion": "--minion",
  "--color-demon": "--demon",
  "--radius": "--radius",
  "--pad": "--pad"
});

export const TOKEN_SOURCE = "css/app.css";
export const TOKEN_THEME = "src/ui/styles/tokens.css";

function declarations(body) {
  const found = {};
  for (const part of body.replace(/[{}]/g, ";").split(";")) {
    const split = part.indexOf(":");
    if (split === -1) continue;
    const name = part.slice(0, split).trim();
    if (!name.startsWith("--")) continue;
    found[name] = part.slice(split + 1).trim();
  }
  return found;
}

/** Custom properties declared in the `:root` blocks of a stylesheet. */
export function rootTokens(css) {
  const source = stripComments(css, false);
  const blocks = [...source.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1]).join(";");
  return declarations(blocks);
}

/** Custom properties declared in the `@theme` blocks of a stylesheet. */
export function themeTokens(css) {
  const source = stripComments(css, false);
  const blocks = [...source.matchAll(/@theme\s*\{([^}]*)\}/g)].map((match) => match[1]).join(";");
  return declarations(blocks);
}

const sameValue = (left, right) => left.replace(/\s+/g, " ").trim().toLowerCase() === right.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Fails when a shell token has no source in `css/app.css`, when its value
 * differs from the source, when an unmapped token enters the theme, or when the
 * shell references a custom property that nothing defines.
 */
export function checkTokens({ source, theme, usage = [] }) {
  const violations = [];
  const sourceTokens = rootTokens(source);
  const themeValues = themeTokens(theme);
  const mapped = new Set(Object.keys(TOKEN_MAP));

  for (const [shellName, sourceName] of Object.entries(TOKEN_MAP)) {
    if (!(shellName in themeValues)) {
      violations.push(`${TOKEN_THEME}: ${shellName} is not defined`);
      continue;
    }
    if (!(sourceName in sourceTokens)) {
      violations.push(`${TOKEN_SOURCE}: ${sourceName} (for ${shellName}) is not defined`);
      continue;
    }
    if (!sameValue(themeValues[shellName], sourceTokens[sourceName])) {
      violations.push(`${TOKEN_THEME}: ${shellName} is ${themeValues[shellName]} but ${TOKEN_SOURCE} ${sourceName} is ${sourceTokens[sourceName]}`);
    }
  }

  for (const name of Object.keys(themeValues)) {
    if (!mapped.has(name)) violations.push(`${TOKEN_THEME}: ${name} has no ${TOKEN_SOURCE} source; add the value there first`);
  }

  for (const { file, text } of usage) {
    // Keep string literals: a Tailwind arbitrary value such as
    // `bg-[var(--color-...)]` lives inside a quoted class attribute.
    const source = stripComments(text, true);
    const declared = new Set([...Object.keys(themeValues), ...Object.keys(declarations(source))]);
    for (const match of source.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) {
      if (!declared.has(match[1])) violations.push(`${file}: ${match[1]} is not defined in ${TOKEN_THEME}`);
    }
  }

  return violations;
}

/** CLI helper: reads the theme, the source and every shell reference. */
export async function checkTokensTree() {
  let source;
  let theme;
  try {
    source = await readFile(join(ROOT, TOKEN_SOURCE), "utf8");
    theme = await readFile(join(ROOT, TOKEN_THEME), "utf8");
  } catch {
    return [`token check: ${TOKEN_THEME} and ${TOKEN_SOURCE} must both exist`];
  }
  const usage = [];
  for (const file of await collectFiles(join(ROOT, "src/ui"), /\.(css|tsx|ts)$/)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel === TOKEN_THEME) continue;
    usage.push({ file: rel, text: await readFile(file, "utf8") });
  }
  return checkTokens({ source, theme, usage });
}

/** CLI entry: scans the legacy tree and the layered tree, then the any ratchet. */
export async function checkTree() {
  const violations = [];
  let legacyAny = 0;

  for (const root of [JS_ROOT, SRC_ROOT]) {
    let files;
    try {
      files = await collectFiles(root);
    } catch {
      continue;
    }
    for (const file of files) {
      const rel = relative(ROOT, file).split(sep).join("/");
      const text = await readFile(file, "utf8");
      violations.push(...checkFile(text, rel));
      if (rel.startsWith("js/")) legacyAny += countAnyTokens(text, true);
    }
  }

  if (legacyAny > LEGACY_ANY_BASELINE) {
    violations.push(
      `js/: ${legacyAny} 'any' token(s) exceed the baseline ${LEGACY_ANY_BASELINE}; the count may only go down`
    );
  }
  violations.push(...await checkTokensTree());
  return violations;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const violations = await checkTree();
  if (violations.length) {
    console.error(violations.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Source policy check passed.");
  }
}
