import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "accent";

// Values mirror the retired `.btn` rule exactly: 8 px radius, 8/12 px padding,
// 44 px minimum height and the inherited 14 px / 1.45 typography. A change here
// must move the computed-style baseline in the same commit.
const VARIANTS: Record<ButtonVariant, string> = {
  default: "border-line-2 bg-panel-2 hover:bg-btn-hover",
  accent: "border-btn-accent-border bg-accent-dim text-btn-accent-text hover:bg-btn-accent-hover",
};

/**
 * The one button look, for `<button>`, `<a>` and `<label>` alike. A class
 * builder instead of a component because an anchor cannot become a button.
 */
export function buttonClass(variant: ButtonVariant = "default", extra?: string): string {
  return [
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg",
    "border px-3 py-2 text-[14px] leading-[1.45] no-underline",
    VARIANTS[variant],
    "disabled:cursor-not-allowed disabled:opacity-40",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "default", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
