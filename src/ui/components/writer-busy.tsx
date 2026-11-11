// Another tab holds the writer lock. The route does not mount until the lock is
// granted, so a second Storyteller tab cannot write the saved game.
import { useShellPorts } from "../ports.ts";
import { Button } from "./button.tsx";

export function WriterBusy({ onRetry }: { onRetry(): void }) {
  const t = useShellPorts().strings.t;
  return (
    <section className="host-card">
      <h1>{t("writerBusy")}</h1>
      <p>{t("writerBusyHint")}</p>
      <Button id="retry-writer" onClick={onRetry}>
        {t("retry")}
      </Button>
    </section>
  );
}
