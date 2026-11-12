import type { ReactNode } from "react";
import { cx } from "./classes.ts";

export interface PhasePanelProps {
  kicker: string;
  title: string;
  lead?: string;
  progress?: string;
  tone?: "steel" | "danger";
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PhasePanel({
  kicker,
  title,
  lead,
  progress,
  tone = "steel",
  actions,
  children,
  className,
}: PhasePanelProps) {
  return (
    <section
      className={cx(
        "rounded-md border bg-crypt-2 p-3",
        tone === "danger" ? "border-crimson-dim" : "border-edge",
        className,
      )}
      data-phase-panel=""
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[8px] uppercase tracking-[.2em] text-brass">{kicker}</span>
          <h2 className="m-0 mt-1 font-role text-[22px] leading-tight text-player-role-text">
            {title}
          </h2>
          {lead ? <p className="m-0 mt-1 text-[10.5px] leading-snug text-muted">{lead}</p> : null}
        </div>
        {progress ? (
          <span className="whitespace-nowrap rounded-sm border border-edge px-2 py-1 text-[8.5px] uppercase tracking-[.1em] text-muted">
            {progress}
          </span>
        ) : null}
      </div>
      {children}
      {actions ? <div className="mt-3 grid gap-1.5">{actions}</div> : null}
    </section>
  );
}
