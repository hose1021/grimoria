// Inline rule-matrix markup: bold values, italics, code identifiers and links.
import type { ReactNode } from "react";

const MARKUP = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export function inline(text: string): ReactNode[] {
  return text.split(MARKUP).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={index} className="rounded-[4px] bg-ref-well px-1 py-0.5 text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link)
      return (
        <a
          key={index}
          className="underline underline-offset-2"
          href={link[2]!}
          target="_blank"
          rel="noreferrer"
        >
          {link[1]!}
        </a>
      );
    return part;
  });
}
