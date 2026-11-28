// Reads a changed-file list. The CI workflow writes NUL-separated Git output so
// a path with a quote, a tab or a newline stays one entry; a hand-written list
// is newline-separated.
export function parseChangedFiles(text: string): string[] {
  const separator = text.includes("\0") ? "\0" : "\n";
  return text.split(separator).filter((entry) => entry.length > 0);
}
