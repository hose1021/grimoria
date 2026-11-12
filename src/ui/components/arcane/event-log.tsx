import { useState } from "react";
import { cx } from "./classes.ts";

export interface EventEntry {
  time?: string;
  title: string;
  detail?: string;
  tag?: string;
  tone?: "danger" | "accent";
  scope?: "night" | "day" | "death" | "other";
}

export function EventLog({
  entries,
  title,
  emptyLabel,
  allLabel,
  className,
  filters = [],
}: {
  entries: EventEntry[];
  title: string;
  emptyLabel: string;
  allLabel: string;
  className?: string;
  filters?: Array<{ id: string; label: string }>;
}) {
  const [active, setActive] = useState("all");
  const shown = active === "all" ? entries : entries.filter((entry) => entry.scope === active);
  return (
    <section className={cx("rounded-md border border-edge bg-crypt-2 p-3", className)}>
      <h2 className="m-0 flex items-baseline justify-between gap-2 border-b border-edge pb-2 text-[9px] uppercase tracking-[.18em] text-muted">
        {title}
        <b className="font-semibold tracking-normal text-text">{shown.length}</b>
      </h2>
      {filters.length ? (
        <div className="mt-2 flex flex-wrap gap-[3px]">
          {[{ id: "all", label: allLabel }, ...filters].map((filter) => (
            <button
              key={filter.id}
              className={cx(
                "min-h-6 rounded-[3px] border px-1.5 py-1 text-[8px] uppercase tracking-[.1em] max-[900px]:min-h-11 max-[900px]:min-w-11 max-[900px]:px-2.5",
                active === filter.id
                  ? "border-edge-2 bg-crypt-2 text-text"
                  : "border-edge text-muted/70",
              )}
              type="button"
              aria-pressed={active === filter.id}
              onClick={() => setActive(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}
      {shown.length ? (
        <ol className="m-0 mt-2 grid list-none gap-2 p-0">
          {shown.map((entry, index) => (
            <li
              key={`${entry.title}-${index}`}
              className={cx(
                "grid grid-cols-[40px_minmax(0,1fr)] gap-2 border-b border-edge/60 pb-2 last:border-0 last:pb-0",
                entry.tone === "danger" ? "text-danger" : "",
              )}
            >
              <time className="text-[8.5px] tabular-nums text-muted">{entry.time ?? ""}</time>
              <span className="min-w-0">
                <b
                  className={cx(
                    "block text-[11px] font-semibold",
                    entry.tone === "accent" ? "text-amber" : "",
                  )}
                >
                  {entry.title}
                </b>
                {entry.detail ? (
                  <small className="mt-0.5 block text-[9.5px] leading-snug text-muted">
                    {entry.detail}
                  </small>
                ) : null}
                {entry.tag ? (
                  <span className="mt-1 inline-block text-[7.5px] uppercase tracking-[.13em] text-amber">
                    {entry.tag}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 mt-2 text-[10px] text-muted">{emptyLabel}</p>
      )}
    </section>
  );
}
