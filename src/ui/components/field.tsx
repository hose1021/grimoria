import { useId } from "react";
import * as Label from "@radix-ui/react-label";
import type { InputHTMLAttributes } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, className, ...props }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const name = ["field", className].filter(Boolean).join(" ");
  return (
    <div className="grid gap-1">
      <Label.Root htmlFor={fieldId} className="label">{label}</Label.Root>
      <input id={fieldId} className={name} {...props} />
    </div>
  );
}
