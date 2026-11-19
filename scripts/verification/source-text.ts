// Source scanning for the verification gate.
//
// The gate must never accept a declaration that does not execute. A commented
// out test is still text, a string that contains test source is not a test, and
// `test.skip`/`test.todo`/`{ skip: true }` declare an intention not to run.
// Pure functions: no filesystem access.

/** One `test(...)` declaration found in a source text. */
export interface TestDeclaration {
  name: string;
  skipped: boolean;
}

interface Scanned {
  /** `1` for a character that runs, `0` inside a string, comment or template. */
  code: Uint8Array;
  /** The same length as the input, with comments replaced by spaces. */
  commentFree: string;
}

function scan(text: string): Scanned {
  const code = new Uint8Array(text.length);
  const commentFree: string[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        commentFree.push(" ");
        index += 1;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        commentFree.push(text[index] === "\n" ? "\n" : " ");
        index += 1;
      }
      commentFree.push("  ");
      index += 2;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      commentFree.push(char);
      code[index] = 0;
      index += 1;
      while (index < text.length) {
        const inner = text[index];
        commentFree.push(inner);
        code[index] = 0;
        index += 1;
        if (inner === "\\") {
          if (index < text.length) {
            commentFree.push(text[index]);
            code[index] = 0;
            index += 1;
          }
          continue;
        }
        if (inner === quote) break;
      }
      continue;
    }
    code[index] = 1;
    commentFree.push(char);
    index += 1;
  }
  return { code, commentFree: commentFree.join("") };
}

/**
 * Replaces comments with spaces while keeping strings and line structure.
 *
 * @param text TypeScript source
 * @returns the source without comments
 */
export function stripComments(text: string): string {
  return scan(text).commentFree;
}

const DECLARATION =
  /\btest\s*(?:\.\s*(skip|todo|only))?\s*\(\s*(["'])((?:\\.|(?!\2)[^\\])*)\2\s*(?:,\s*\{([^}]*)\})?/g;

/**
 * @param text TypeScript source
 * @returns every `test(...)` declaration that runs, with its declared skip state
 */
export function testDeclarations(text: string): TestDeclaration[] {
  const { code, commentFree } = scan(text);
  let suiteSkipped = false;
  for (const match of commentFree.matchAll(/\bdescribe\s*\.\s*(?:skip|todo)\s*\(/g)) {
    if (code[match.index ?? 0] === 1) {
      suiteSkipped = true;
      break;
    }
  }
  if (!suiteSkipped) {
    for (const match of commentFree.matchAll(
      /\bdescribe\s*\(\s*(["'])[^"'\n]*\1\s*,\s*\{[^}]*\b(?:skip|todo)\s*:\s*true/g,
    )) {
      if (code[match.index ?? 0] === 1) {
        suiteSkipped = true;
        break;
      }
    }
  }
  // A body-level `t.skip()` runs part of a test and stops. The declaration
  // cannot be attributed statically, so the whole file stops being evidence.
  if (!suiteSkipped) {
    for (const match of commentFree.matchAll(/\bt\s*\.\s*(?:skip|todo)\s*\(/g)) {
      if (code[match.index ?? 0] === 1) {
        suiteSkipped = true;
        break;
      }
    }
  }
  const out: TestDeclaration[] = [];
  for (const match of text.matchAll(DECLARATION)) {
    // A declaration inside a string or comment is text about a test, not a test.
    if (code[match.index ?? 0] !== 1) continue;
    const name = match[3].trim();
    if (!name || name.includes("${")) continue;
    const modifier = match[1] ?? "";
    const options = match[4] ?? "";
    const skipped =
      suiteSkipped ||
      modifier === "skip" ||
      modifier === "todo" ||
      /\b(?:skip|todo)\s*:\s*true\b/.test(options);
    out.push({ name, skipped });
  }
  return out;
}

/**
 * Counts dispatch-shaped references to a command type outside of comments.
 *
 * @param input.source joined UI source
 * @param input.command command type name
 * @returns references found outside comments
 */
export function commandReferences(source: string, command: string): number {
  const text = stripComments(source);
  const literal = text.split(`type: "${command}"`).length - 1;
  const port = text.split(`commands.${command}(`).length - 1;
  return literal + port;
}
