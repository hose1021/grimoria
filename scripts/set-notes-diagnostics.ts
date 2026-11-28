import { createHash } from "node:crypto";

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

function paths(expected: unknown, actual: unknown, path: string, found: string[]): string[] {
  if (found.length >= 12) return found;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) found.push(`${path}.length`);
    for (let index = 0; index < Math.max(expected.length, actual.length); index += 1) {
      if (index >= expected.length || index >= actual.length) {
        found.push(`${path}[${index}]`);
      } else {
        paths(expected[index], actual[index], `${path}[${index}]`, found);
      }
    }
    return found;
  }
  if (
    typeof expected === "object" &&
    expected !== null &&
    typeof actual === "object" &&
    actual !== null
  ) {
    const left = expected as Record<string, unknown>;
    const right = actual as Record<string, unknown>;
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)].sort())) {
      if (!(key in left) || !(key in right)) found.push(`${path}.${key}`);
      else paths(left[key], right[key], `${path}.${key}`, found);
    }
    return found;
  }
  if (expected !== actual) found.push(path || "root");
  return found;
}

/** A privacy-safe mismatch report: field paths and digests, never values. */
export function safeDifference(label: string, expected: unknown, actual: unknown): string {
  const found = paths(expected, actual, "", []);
  return `${label}: fields ${found.join(", ") || "root"}; expected ${digest(expected)}, actual ${digest(actual)}`;
}
