// Rule traceability for the acceptance check: does every verified matrix row
// cite a test that carries an identifier declared in the role's rule document,
// and does every declared identifier still point at an existing matrix row.
// Pure functions so the rules can be tested without the repository.

const CITATION = /`([a-z0-9./-]+\.test\.(?:mjs|ts))`\s+"([^"]+)"/g;
const IDENTIFIER = /\b(?:TB|BMR|SNV)-[A-Z]+-\d{2}\b/g;
const LEVELS = new Set(["verified", "implemented-unverified", "host-choice", "unsupported"]);
const PREFIX = { tb: "TB", bmr: "BMR", snv: "SNV" };

export function citationsOf(cell) {
  return [...cell.matchAll(CITATION)].map((match) => ({ file: match[1], name: match[2] }));
}

export function identifierPattern() {
  return new RegExp(IDENTIFIER.source, "g");
}

/**
 * Parses one rule document. The table holds the identifier, the level, the
 * pinned revision and the asserting tests; the `Edition:` line names the
 * scenario so the identifier prefix can be checked.
 */
export function parseRuleDoc(text) {
  const editionLine = /^Edition:\s*(\S+)\s*$/m.exec(text);
  const rules = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length !== 4) continue;
    if (cells[0] === "Rule ID" || cells[0].startsWith("---")) continue;
    rules.push({
      id: cells[0],
      level: cells[1],
      revision: cells[2],
      citations: citationsOf(cells[3]),
    });
  }
  return { edition: editionLine ? editionLine[1] : null, rules };
}

/**
 * @param {object} input
 * @param {string[][]} input.matrixRows  cells of every matrix row
 * @param {{role: string, edition: string|null, rules: object[]}[]} input.docs
 * @param {(role: string) => string|null} input.editionOf
 * @returns {string[]} failures, empty when the rules trace cleanly
 */
export function traceabilityFailures({ matrixRows, docs, editionOf }) {
  const failures = [];
  const roleRows = new Map();
  for (const cells of matrixRows) {
    if (cells.length < 3) continue;
    const role = /^`([a-z]+)`/.exec(cells[0]);
    if (!role) continue;
    const revision = /oldid=(\d+)/.exec(cells[0]);
    if (!roleRows.has(role[1])) roleRows.set(role[1], []);
    roleRows.get(role[1]).push({
      role: role[1],
      revision: revision ? "r" + revision[1] : "?",
      level: cells.at(-1),
      citations: citationsOf(cells.at(-2)),
    });
  }

  const seen = new Map();
  for (const doc of docs) {
    for (const rule of doc.rules) {
      if (seen.has(rule.id)) {
        failures.push(`identifier ${rule.id} is declared in ${seen.get(rule.id)} and ${doc.role}`);
      } else {
        seen.set(rule.id, doc.role);
      }
      if (!LEVELS.has(rule.level)) {
        failures.push(`${rule.id} has unknown level ${rule.level}`);
      }
      if (doc.edition !== null) {
        const edition = editionOf(doc.role);
        if (doc.edition !== edition) {
          failures.push(
            `${doc.role}/rule.md says edition ${doc.edition}, the model says ${edition}`,
          );
        } else if (PREFIX[edition] && !rule.id.startsWith(PREFIX[edition] + "-")) {
          failures.push(`${rule.id} does not start with ${PREFIX[edition]}-`);
        }
      }
    }

    const rows = roleRows.get(doc.role) ?? [];
    if (doc.rules.length !== rows.length) {
      failures.push(
        `${doc.role}/rule.md lists ${doc.rules.length} rules, the matrix has ${rows.length} rows`,
      );
    }
    for (const rule of doc.rules) {
      const match = rows.some((row) => row.revision === rule.revision && row.level === rule.level);
      if (!match) {
        failures.push(
          `${rule.id} references matrix row ${rule.revision} (${rule.level}), which no longer exists`,
        );
      }
    }
  }

  for (const [role, rows] of roleRows) {
    const doc = docs.find((candidate) => candidate.role === role);
    if (!doc) {
      failures.push(`matrix has rows for ${role}, but there is no ${role}/rule.md`);
      continue;
    }
    const declared = new Map(doc.rules.map((rule) => [rule.id, rule.level]));
    for (const row of rows) {
      if (row.level !== "verified") continue;
      for (const citation of row.citations) {
        const found = [...citation.name.matchAll(identifierPattern())].map((match) => match[0]);
        const named = found.filter((id) => declared.has(id));
        if (!named.length) {
          failures.push(
            found.length
              ? `${role} cites "${citation.name}" with an identifier not declared in rule.md (${found.join(", ")})`
              : `${role} cites "${citation.name}", which carries no rule identifier`,
          );
        } else if (!named.some((id) => declared.get(id) === "verified")) {
          failures.push(
            `${role} cites "${citation.name}" with ${named.join(", ")}, documented as ${declared.get(named[0])}`,
          );
        }
      }
    }
  }

  return failures;
}
