#!/usr/bin/env node
// Read-only inventory of the root guidance: every section, its size and the
// canonical file that owns it. Deletion needs this map first.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface Section {
  title: string;
  startLine: number;
  lines: number;
  bytes: number;
  canonical: string;
}

const CANONICAL: Record<string, string> = {
  "Rules sources (how a role is played)": "docs/rules-sources.md",
  Commands: "package.json",
  Architecture: "docs/architecture.md",
  "Code conventions": "src/AGENTS.md",
  Testing: "scripts/AGENTS.md",
};

export function sections(text: string): Section[] {
  const lines = text.split("\n");
  const found: Section[] = [];
  for (const [index, line] of lines.entries()) {
    const match = /^## (.+)$/.exec(line);
    if (!match) continue;
    const start = index;
    let end = lines.length;
    for (let next = index + 1; next < lines.length; next++) {
      if (lines[next].startsWith("## ")) {
        end = next;
        break;
      }
    }
    const body = lines.slice(start, end).join("\n");
    found.push({
      title: match[1].trim(),
      startLine: start + 1,
      lines: end - start,
      bytes: Buffer.byteLength(body),
      canonical: CANONICAL[match[1].trim()] ?? "root",
    });
  }
  return found;
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const text = readFileSync(resolve(root, "AGENTS.md"), "utf8");
  const map = sections(text);
  console.log(
    JSON.stringify(
      {
        file: "AGENTS.md",
        bytes: Buffer.byteLength(text),
        lines: text.split("\n").length,
        sections: map,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
