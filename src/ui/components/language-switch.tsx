// The language control the legacy bridge injected into every host header. The
// shell's own screens render it explicitly.
import { useShellPorts } from "../ports.ts";

const LANGS = ["en", "ru", "az"] as const;

export function LanguageSwitch() {
  const ports = useShellPorts();
  return (
    <select
      className="lang-switch"
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
