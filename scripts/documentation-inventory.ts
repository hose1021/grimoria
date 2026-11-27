import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface Counts {
  files: number;
  bytes: number;
  markdownFiles: number;
  markdownBytes: number;
}

function empty(): Counts {
  return { files: 0, bytes: 0, markdownFiles: 0, markdownBytes: 0 };
}

function category(path: string): string {
  if (path.startsWith("openspec/changes/archive/")) return "openspec/archive";
  if (path.startsWith("openspec/changes/")) return "openspec/active";
  if (path.startsWith("openspec/specs/")) return "openspec/specs";
  if (path.startsWith("docs/")) return path.split("/").slice(0, 2).join("/");
  return path.includes("/") ? path.split("/")[0] : "root";
}

export function inventory(tree: string) {
  const total = empty();
  const groups = new Map<string, Counts>();
  const active = new Set<string>();
  const archived = new Set<string>();
  let sourceTypeScriptFiles = 0;
  let sourceTypeScriptBytes = 0;
  let rootAgentBytes = 0;
  for (const record of tree.split("\0").filter(Boolean)) {
    const match = /^\d+ (blob|commit) [0-9a-f]+\s+(\d+|-)\t([\s\S]+)$/.exec(record);
    if (!match) throw new Error("Unexpected git ls-tree record");
    if (match[1] !== "blob") continue;
    const bytes = Number(match[2]);
    const path = match[3];
    if (!Number.isSafeInteger(bytes)) throw new Error(`Invalid blob size: ${path}`);
    const group = category(path);
    const counts = groups.get(group) ?? empty();
    groups.set(group, counts);
    for (const target of [total, counts]) {
      target.files++;
      target.bytes += bytes;
      if (/\.md$/i.test(path)) {
        target.markdownFiles++;
        target.markdownBytes += bytes;
      }
    }
    if (group === "openspec/active" && path.split("/").length > 3) {
      active.add(path.split("/")[2]);
    }
    if (group === "openspec/archive" && path.split("/").length > 4) {
      archived.add(path.split("/")[3]);
    }
    if (/^src\/.*\.tsx?$/.test(path)) {
      sourceTypeScriptFiles++;
      sourceTypeScriptBytes += bytes;
    }
    if (path === "AGENTS.md") rootAgentBytes = bytes;
  }
  return {
    total,
    groups: Object.fromEntries([...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    activeChanges: active.size,
    archivedChanges: archived.size,
    sourceTypeScriptFiles,
    sourceTypeScriptBytes,
    rootAgentBytes,
  };
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const ref = process.argv[2] ?? "HEAD";
  const commit = execFileSync("git", ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const tree = execFileSync("git", ["ls-tree", "-rlz", "--full-tree", commit], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  console.log(JSON.stringify({ commit, ...inventory(tree) }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
