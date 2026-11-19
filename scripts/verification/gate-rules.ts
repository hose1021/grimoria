// Pure rules for the verification gate.
//
// A test identity may disappear only through the committed allowlist with a
// reason. An official rule is verified only through an explicit atomic mapping.
// A skipped declaration is not evidence. These are the decisions the gate must
// make, isolated so they can be tested without a repository.

/** One indexed test identity. */
export interface CoverageEntry {
  key: string;
  skipped?: true;
}

/** One test citation: the file it lives in and the test name it names. */
export interface Citation {
  file: string;
  name: string;
}

export type OfficialStatus =
  | "ENGINE_VERIFIED"
  | "ENGINE_PARTIAL"
  | "ENGINE_UNVERIFIED"
  | "ROLE_LEVEL_ONLY"
  | "UNMAPPED";

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

/**
 * @param input.mapped whether an explicit atomic-map entry exists
 * @param input.engineRuleIds the mapped rows, or the role-level candidates
 * @param input.levels the levels of the mapped rows
 * @returns the status an official rule may claim
 */
export function officialRuleStatus(input: {
  mapped: boolean;
  engineRuleIds: string[];
  levels: string[];
}): OfficialStatus {
  if (!input.engineRuleIds.length) return "UNMAPPED";
  if (!input.mapped) return "ROLE_LEVEL_ONLY";
  if (input.levels.includes("unsupported")) return "ENGINE_UNVERIFIED";
  if (input.levels.includes("verified")) {
    return input.levels.length === 1 ? "ENGINE_VERIFIED" : "ENGINE_PARTIAL";
  }
  if (input.levels.includes("host-choice")) return "ENGINE_PARTIAL";
  if (input.levels.includes("implemented-unverified")) return "ENGINE_UNVERIFIED";
  return "UNMAPPED";
}

/**
 * @param input.ruleId the engine rule whose evidence is checked
 * @param input.citations the rule's cited tests
 * @param input.entries the manifest index, including skip state
 * @returns a failure message, or null when at least one cited test runs
 */
export function verifiedCitationFailure(input: {
  ruleId: string;
  citations: Citation[];
  entries: Map<string, CoverageEntry>;
}): string | null {
  const current = input.citations.filter(
    (citation) =>
      citation.name.includes(input.ruleId) &&
      input.entries.has(citation.file + "::" + citation.name),
  );
  if (!current.length) {
    return `verified engine rule ${input.ruleId} has no current citing test whose name carries the rule id`;
  }
  for (const citation of current) {
    if (input.entries.get(citation.file + "::" + citation.name)?.skipped) {
      return `verified engine rule ${input.ruleId} cites a skipped test: ${citation.file}::${citation.name}`;
    }
  }
  return null;
}

/**
 * @param input.before the mapped official rule ids on the base branch
 * @param input.after the mapped official rule ids now
 * @param input.allow the allowlist keyed by official rule id
 * @returns failures, empty when no mapping was dropped silently
 */
export function downgradeFailures(input: {
  before: string[];
  after: string[];
  allow: Record<string, string>;
}): string[] {
  const failures: string[] = [];
  const after = new Set(input.after);
  for (const [id, reason] of Object.entries(input.allow)) {
    if (!reason.trim()) failures.push(`removed-verification.json needs a reason for ${id}`);
    if (after.has(id))
      failures.push(`removed-verification.json lists ${id}, which is still mapped`);
  }
  for (const id of input.before) {
    if (after.has(id) || input.allow[id]) continue;
    failures.push(`atomic mapping for ${id} was removed without a removed-verification.json entry`);
  }
  return failures;
}
