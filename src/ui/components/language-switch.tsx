// The language control rendered in the app bar. The `lang-switch` container
// stays as an inert hook because the browser checks select it by name.
import { useState } from "react";
import { useShellPorts } from "../ports.ts";

const LANGS = ["ru", "az", "en"] as const;

const SWITCH = "lang-switch flex items-center gap-1";

export interface LanguageSwitchProps {
  className?: string;
}

export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const ports = useShellPorts();
  const [current, setCurrent] = useState(ports.locale.current());
  return (
    <div
      className={[SWITCH, className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Language"
    >
      {LANGS.map((code) => (
        <button
          key={code}
          className={[
            "min-h-11 min-w-11 cursor-pointer rounded-md border px-3 text-[11px] font-medium uppercase tracking-[.08em]",
            current === code
              ? "border-parchment bg-crypt-3 text-text"
              : "border-edge-2 text-muted hover:text-text",
          ].join(" ")}
          type="button"
          data-lang={code}
          aria-pressed={current === code}
          onClick={() => {
            setCurrent(code);
            void ports.locale.change(code);
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
