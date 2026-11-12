// The private hand-off cover: after /player or /public, a host screen waits
// behind this gate until the Storyteller confirms the device is back.
import { useShellPorts } from "../ports.ts";

export function HandbackCover({ onReturn }: { onReturn(): void }) {
  const t = useShellPorts().strings.t;
  return (
    <section className="host-cover">
      <div className="host-cover-box">
        <h1>{t("playerCover")}</h1>
        <p>{t("playerWarning")}</p>
        <button id="return-host" className="btn btn--accent" type="button" onClick={onReturn}>
          {t("playerBack")}
        </button>
      </div>
    </section>
  );
}
