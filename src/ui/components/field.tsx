import { useId } from "react";
import * as Label from "@radix-ui/react-label";
import type { InputHTMLAttributes } from "react";
import { labelClass } from "./label.tsx";

// Mirrors the retired `.field` rule: 7 px radius, 9/8 px padding, 16 px text
// (never smaller, so mobile browsers do not zoom) and a 44 px target.
export const inputClass = [
  "min-h-11 w-full min-w-0 rounded-[7px] border border-line-2 bg-[#0b1013]",
  "px-[9px] py-2 text-[16px] placeholder:text-[#66737a]",
].join(" ");

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, className, ...props }: FieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className="grid gap-1">
      <Label.Root htmlFor={fieldId} className={labelClass}>
        {label}
      </Label.Root>
      <input
        id={fieldId}
        className={[inputClass, className].filter(Boolean).join(" ")}
        {...props}
      />
    </div>
  );
}
