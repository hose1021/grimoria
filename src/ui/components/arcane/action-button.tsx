import type { ButtonHTMLAttributes } from "react";
import { cx } from "./classes.ts";

export type ActionVariant = "forge" | "crimson" | "steel" | "ghost";

const VARIANT: Record<ActionVariant, string> = {
  forge: "btn--accent",
  crimson: "btn--danger",
  steel: "",
  ghost: "btn--quiet",
};

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  /** Why the action is unavailable; surfaced as a title and description. */
  disabledReason?: string;
}

export function ActionButton({
  variant = "steel",
  className,
  type = "button",
  disabledReason,
  ...props
}: ActionButtonProps) {
  const unavailable = Boolean(props.disabled);
  return (
    <button
      type={type}
      className={cx("btn", VARIANT[variant], className)}
      title={unavailable ? disabledReason : props.title}
      {...props}
    />
  );
}
