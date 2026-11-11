import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "accent" | "danger" | "quiet";

// The legacy `.btn` classes are already fed from the shared tokens, so a React
// button keeps the current look instead of starting a second button style.
const VARIANTS: Record<ButtonVariant, string> = {
  default: "",
  accent: "btn--accent",
  danger: "btn--danger",
  quiet: "btn--quiet"
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "default", className, type = "button", ...props }: ButtonProps) {
  const name = ["btn", VARIANTS[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={name} {...props} />;
}
