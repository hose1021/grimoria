// Rule traceability for the acceptance check: does every matrix row carry
// exactly one rule identifier, does a rule document declare that identifier
// with the same level and revision, and does every verified row cite a test
// whose name carries the row's identifier?
// Pure functions so the rules can be tested without the repository.

const CITATION = /`([a-z0-9./-]+\.test\.ts)`\s+"([^"]+)"/g;
const IDENTIFIER = /\b(?:TB|BMR|SNV|SYS)-[A-Z0-9]+-\d{2}\b/g;
const LEVELS: Record<string, true> = {
  verified: true,
  "implemented-unverified": true,
  "host-choice": true,
  unsupported: true,
};
const PREFIX: Record<string, string> = { tb: "TB", bmr: "BMR", snv: "SNV" };

/** One test citation: the file it lives in and the test name it names. */
export interface Citation {
  file: string;
  name: string;
}

/** One row of a role's rule document or of the shared rule document. */
export interface RuleRow {
  citations: Citation[];
  id: string;
  level: string;
  revision: string;
}

/** One parsed rule document: its edition and its rows. */
export interface RuleDoc {
  edition: string | null;
  rules: RuleRow[];
}

/** One matrix row with a supported status. */
export interface MatrixRuleRow {
  citations: Citation[];
  id: string | null;
  ids: string[];
  label: string;
  level: string;
  revision: string | null;
  role: string | null;
}

export function citationsOf(cell: string): Citation[] {
  return [...cell.matchAll(CITATION)].map((match) => ({ file: match[1], name: match[2] }));
}

export function identifierPattern() {
  return new RegExp(IDENTIFIER.source, "g");
}

export function identifiersIn(cell: string): string[] {
  return [...cell.matchAll(identifierPattern())].map((match) => match[0]);
}

/**
 * Parses one rule document. The table holds the identifier, the level, the
 * pinned revision and the asserting tests; the `Edition:` line names the
 * scenario so the identifier prefix can be checked.
 */
export function parseRuleDoc(text: string): RuleDoc {
  const editionLine = /^Edition:\s*(\S+)\s*$/m.exec(text);
  const rules: RuleRow[] = [];
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
 * @param input.matrixRows cells of every matrix row
 * @returns every row that carries a supported status
 */
export function matrixRuleRows(matrixRows: string[][]): MatrixRuleRow[] {
  const rows: MatrixRuleRow[] = [];
  for (const cells of matrixRows) {
    if (cells.length < 3) continue;
    const level = cells[cells.length - 1];
    if (!LEVELS[level]) continue;
    const first = cells[0];
    const role = /^`([a-z]+)`/.exec(first);
    const revision = /oldid=(\d+)/.exec(first);
    const ids = identifiersIn(first);
    rows.push({
      id: ids.length === 1 ? ids[0] : null,
      ids,
      label: first.slice(0, 80),
      level,
      revision: revision ? "r" + revision[1] : null,
      role: role ? role[1] : null,
      citations: citationsOf(cells[cells.length - 2]),
    });
  }
  return rows;
}

/**
 * @param input.matrixRows cells of every matrix row
 * @param input.docs the parsed role documents
 * @param input.shared the parsed shared rule document
 * @param input.editionOf the model's edition for a role id
 * @returns failures, empty when the rules trace cleanly
 */
export function traceabilityFailures({
  matrixRows,
  docs,
  shared = [],
  editionOf,
}: {
  docs: { edition: string | null; role: string; rules: RuleRow[] }[];
  editionOf: (role: string) => string | null;
  matrixRows: string[][];
  shared?: RuleRow[];
}): string[] {
  const failures: string[] = [];
  const rows = matrixRuleRows(matrixRows);
  const declarations = new Map<string, { level: string; revision: string; source: string }>();

  const declare = (source: string, rule: RuleRow): void => {
    const existing = declarations.get(rule.id);
    if (existing) {
      failures.push(`identifier ${rule.id} is declared in ${existing.source} and ${source}`);
      return;
    }
    declarations.set(rule.id, { level: rule.level, revision: rule.revision, source });
    if (!LEVELS[rule.level]) {
      failures.push(`${rule.id} has unknown level ${rule.level}`);
    }
  };

  for (const doc of docs) {
    for (const rule of doc.rules) declare(`${doc.role}/rule.md`, rule);
    if (doc.edition !== null) {
      const edition = editionOf(doc.role);
      if (doc.edition !== edition) {
        failures.push(`${doc.role}/rule.md says edition ${doc.edition}, the model says ${edition}`);
      } else if (PREFIX[edition]) {
        for (const rule of doc.rules) {
          if (!rule.id.startsWith(PREFIX[edition] + "-")) {
            failures.push(`${rule.id} does not start with ${PREFIX[edition]}-`);
          }
        }
      }
    }
    const count = rows.filter((row) => row.role === doc.role).length;
    if (doc.rules.length !== count) {
      failures.push(
        `${doc.role}/rule.md lists ${doc.rules.length} rules, the matrix has ${count} rows`,
      );
    }
  }
  for (const rule of shared) declare("docs/rules-shared.md", rule);

  for (const role of new Set(rows.map((row) => row.role))) {
    if (role !== null && !docs.some((doc) => doc.role === role)) {
      failures.push(`matrix has rows for ${role}, but there is no ${role}/rule.md`);
    }
  }

  const used = new Map<string, string>();
  for (const row of rows) {
    if (row.id === null) {
      failures.push(
        `matrix row "${row.label}" carries ${row.ids.length} rule identifiers, expected exactly one`,
      );
      continue;
    }
    const id = row.id;
    const earlier = used.get(id);
    if (earlier === undefined) {
      used.set(id, row.label);
    } else {
      failures.push(`identifier ${id} is used by matrix rows "${earlier}" and "${row.label}"`);
    }

    const declared = declarations.get(id);
    if (!declared) {
      failures.push(`matrix row "${row.label}" carries ${id}, which no rule document declares`);
    } else {
      if (declared.level !== row.level) {
        failures.push(
          `${id} is ${row.level} in the matrix and ${declared.level} in ${declared.source}`,
        );
      }
      if (row.role !== null) {
        const doc = docs.find((candidate) => candidate.role === row.role);
        const own = doc?.rules.find((rule) => rule.id === id);
        if (!own) {
          failures.push(
            `${id} in matrix row "${row.label}" is not declared in ${row.role}/rule.md`,
          );
        } else if (own.revision !== row.revision) {
          failures.push(
            `${id} references matrix row ${row.revision}, but ${row.role}/rule.md names ${own.revision}`,
          );
        }
        const edition = editionOf(row.role);
        const prefix = edition === null ? undefined : PREFIX[edition];
        if (prefix && !id.startsWith(prefix + "-")) {
          failures.push(`${id} does not start with ${prefix}-`);
        }
      } else if (!id.startsWith("SYS-")) {
        failures.push(`matrix row "${row.label}" carries ${id}, which is not a SYS- identifier`);
      }
    }

    if (row.level !== "verified") continue;
    for (const citation of row.citations) {
      const found = identifiersIn(citation.name);
      if (found.length && !found.some((foundId) => declarations.has(foundId))) {
        failures.push(
          `${row.role ?? "the shared document"} cites "${citation.name}" with an identifier not declared in the rule documents (${found.join(", ")})`,
        );
      }
    }
    if (!row.citations.some((citation) => citation.name.includes(id))) {
      const names = row.citations.map((citation) => `"${citation.name}"`).join(", ");
      const anyIdentifier = row.citations.some(
        (citation) => identifiersIn(citation.name).length > 0,
      );
      if (!row.citations.length) {
        failures.push(`matrix row "${row.label}" is verified without a named test citation`);
      } else if (anyIdentifier) {
        failures.push(`matrix row "${row.label}" cites ${names}, none of which carries ${id}`);
      } else {
        failures.push(`matrix row "${row.label}" cites ${names}, which carries no rule identifier`);
      }
    }
  }

  for (const rule of shared) {
    if (rule.level !== "verified") continue;
    if (!rule.citations.some((citation) => citation.name.includes(rule.id))) {
      failures.push(
        `${rule.id} in docs/rules-shared.md is verified without a test that carries it`,
      );
    }
  }

  for (const [id, declaration] of declarations) {
    if (!used.has(id)) {
      failures.push(`${id} is declared in ${declaration.source} but no matrix row carries it`);
    }
  }

  return failures;
}
