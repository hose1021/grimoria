// Hosts an unmigrated screen. The legacy module owns the DOM inside `host`;
// React only owns the wrapper and the route-level fallbacks. The cleanup runs
// in the same lifecycle as the unmount, so a route switch disposes the previous
// screen's listeners, timers and subscriptions before the next one mounts.
import { useEffect, useRef, useState } from "react";
import { useShellPorts } from "./ports.ts";
import type { LegacyScreen } from "./ports.ts";

type Phase = "mounting" | "ready" | "error";

export interface LegacyBridgeProps {
  screen: LegacyScreen;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function LegacyBridge({ screen }: LegacyBridgeProps) {
  const ports = useShellPorts();
  const host = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("mounting");
  const [failure, setFailure] = useState("");

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cleanup: (() => void) | undefined;
    let stopWatch: (() => void) | undefined;
    setPhase("mounting");
    try {
      node.replaceChildren();
      cleanup = screen.mount(node);
      stopWatch = ports.locale.watch(node, (code) => {
        void ports.locale.change(code);
      });
      setPhase("ready");
    } catch (error) {
      setFailure(messageOf(error));
      setPhase("error");
    }
    return () => {
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
  }, [screen, ports]);

  return (
    <>
      <div ref={host} hidden={phase !== "ready"} />
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
