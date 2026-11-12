// The language control the legacy bridge injected into every host header. The
// shell's own screens render it explicitly. `lang-switch` stays as an inert
// hook because the browser checks and the legacy translator select it by name.
import { useShellPorts } from "../ports.ts";

const LANGS = ["en", "ru", "az"] as const;

export const languageSwitchClass =
  "lang-switch ml-2 min-h-11 cursor-pointer rounded-md border border-line-2 bg-panel " +
  "px-1.5 py-1 text-[11px] text-muted hover:text-text";

export interface LanguageSwitchProps {
  className?: string;
}

export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const ports = useShellPorts();
  return (
    <select
      className={[languageSwitchClass, className].filter(Boolean).join(" ")}
      aria-label="Language"
      value={ports.locale.current()}
      onChange={(event) => {
        void ports.locale.change(event.target.value);
      }}
    >
      {LANGS.map((code) => (
        <option key={code} value={code}>
          {code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
