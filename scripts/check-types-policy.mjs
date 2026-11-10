#!/usr/bin/env node
// Fails on forbidden or unexplained TypeScript suppressions in runtime JS.
// The policy is intentionally line-based and narrow.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const JS_ROOT = fileURLToPath(new URL("../js/", import.meta.url));

/** @param {string} text @param {string} [file] @returns {string[]} */
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

/** @param {string} directory @returns {Promise<string[]>} */
async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}

/** @param {string} [directory] @returns {Promise<string[]>} */
export async function checkDirectory(directory = JS_ROOT) {
  const files = await collectFiles(directory);
  const violations = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    violations.push(...checkSource(text, relative(directory, file)));
  }
  return violations;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const violations = await checkDirectory();
  if (violations.length) {
    console.error(violations.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Type policy check passed.");
  }
}
