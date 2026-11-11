// The private hand-off cover: after /player or /public, a host screen waits
// behind this gate until the Storyteller confirms the device is back.
import { useShellPorts } from "../ports.ts";
import { Button } from "./button.tsx";

export function HandbackCover({ onReturn }: { onReturn(): void }) {
  const t = useShellPorts().strings.t;
  return (
    <section className="host-cover">
      <div className="host-cover-box">
        <h1>{t("playerCover")}</h1>
        <p>{t("playerWarning")}</p>
        <Button id="return-host" variant="accent" onClick={onReturn}>
          {t("playerBack")}
        </Button>
      </div>
    </section>
  );
}
