// Pure coverage-pinning rules for the verification gate.
//
// A test identity may disappear only through the committed allowlist with a
// reason. Regenerating the manifest is not a justification: that is exactly the
// silent removal the gate exists to stop.

/** One indexed test identity. */
export interface CoverageEntry {
  key: string;
  skipped?: true;
}

/**
 * @param input.before the base-branch manifest entries
 * @param input.after the current manifest entries
 * @param input.allow the allowlist keyed by test identity
 * @returns failures, empty when every removal is justified
 */
export function coveragePinFailures(input: {
  before: CoverageEntry[];
  after: CoverageEntry[];
  allow: Record<string, string>;
}): string[] {
  const failures: string[] = [];
  const present = new Set(input.after.map((entry) => entry.key));
  for (const [key, reason] of Object.entries(input.allow)) {
    if (!reason.trim()) failures.push(`removed-tests.json needs a reason for ${key}`);
    if (present.has(key)) failures.push(`removed-tests.json lists ${key}, which still exists`);
  }
  const after = new Map(input.after.map((entry) => [entry.key, entry]));
  for (const entry of input.before) {
    if (input.allow[entry.key]) continue;
    const now = after.get(entry.key);
    if (!now) failures.push(`test removed without a removed-tests.json entry: ${entry.key}`);
    else if (now.skipped && !entry.skipped)
      failures.push(`test became skipped without a removed-tests.json entry: ${entry.key}`);
  }
  return failures;
}
