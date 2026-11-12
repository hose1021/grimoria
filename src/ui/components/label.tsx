import type { ReactNode } from "react";

// The uppercase muted label that names a control group. A class export keeps
// every element shape (span, p, div) usable without a wrapper.
export const labelClass = "text-[14px] font-[650] uppercase tracking-[.13em] text-muted";

export interface LabelProps {
  children: ReactNode;
  className?: string;
}

export function Label({ children, className }: LabelProps) {
  return <span className={[labelClass, className].filter(Boolean).join(" ")}>{children}</span>;
}
