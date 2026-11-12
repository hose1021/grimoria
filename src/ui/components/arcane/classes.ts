// Joins conditional class names without a dependency. Components share it so
// callers can append layout utilities to the component's own vocabulary.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
