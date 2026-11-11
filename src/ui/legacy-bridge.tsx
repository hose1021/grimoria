// Hosts an unmigrated screen. The legacy module owns the DOM inside `host`;
// React only owns the wrapper and the route-level fallbacks. The cleanup runs
// in the same lifecycle as the unmount, so a route switch disposes the previous
// screen's listeners, timers and subscriptions before the next one mounts.
import { useEffect, useRef, useState } from "react";
import { HandbackCover } from "./components/handback-cover.tsx";
import { WriterBusy } from "./components/writer-busy.tsx";
import { useShellPorts } from "./ports.ts";
import type { LegacyScreen } from "./ports.ts";

type Phase = "mounting" | "ready" | "busy" | "cover" | "error";

export interface LegacyBridgeProps {
  screen: LegacyScreen;
  /** The screen writes the saved game and needs the exclusive writer lock. */
  writer: boolean;
  /** The table mounts hidden after a private hand-off. */
  covered: boolean;
  /** The previous route was private; show the hand-back cover first. */
  handback: boolean;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function LegacyBridge({ screen, writer, covered, handback }: LegacyBridgeProps) {
  const ports = useShellPorts();
  const host = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>(handback ? "cover" : "mounting");
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (handback && attempt === 0) {
      setPhase("cover");
      return;
    }
    const node = host.current;
    if (!node) return;
    let alive = true;
    let cleanup: (() => void) | undefined;
    let stopWatch: (() => void) | undefined;
    setPhase("mounting");
    void (async () => {
      if (writer) {
        const allowed = await ports.writer.acquire().catch(() => false);
        if (!alive) return;
        if (!allowed) {
          setPhase("busy");
          return;
        }
      }
      if (!alive || !host.current) return;
      try {
        host.current.replaceChildren();
        cleanup = screen.mount(host.current, covered ? { covered: true } : undefined);
        stopWatch = ports.locale.watch(host.current, (code) => {
          void ports.locale.change(code);
        });
        setPhase("ready");
      } catch (error) {
        setFailure(messageOf(error));
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
      try {
        stopWatch?.();
      } catch {
        /* the next route must still mount */
      }
      try {
        if (cleanup) cleanup();
        else screen.unmount();
      } catch {
        /* a failing cleanup must not block the next route */
      }
    };
  }, [screen, writer, covered, handback, attempt, ports]);

  return (
    <>
      <div ref={host} hidden={phase !== "ready"} />
      {phase === "busy" ? <WriterBusy onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {phase === "cover" ? (
        <HandbackCover onReturn={() => setAttempt((value) => value + 1)} />
      ) : null}
      {phase === "error" ? (
        <div className="mx-auto max-w-160 px-8 py-8">
          <p className="label">Grimoria</p>
          <h1 className="text-[22px]">{ports.strings.t("screenFailed")}</h1>
          <p className="text-muted">{failure}</p>
          <p>
            <a className="btn" href={ports.router.path("table")}>
              {ports.strings.t("table")}
            </a>
          </p>
        </div>
      ) : null}
    </>
  );
}
