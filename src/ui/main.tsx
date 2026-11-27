import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ShellProvider } from "./ports.ts";
import type { ShellPorts } from "./ports.ts";
import type { RouteStore } from "./router.ts";
import { Shell } from "./shell.tsx";

export function mountShell(element: HTMLElement, ports: ShellPorts, route: RouteStore): () => void {
  const root = createRoot(element);
  root.render(
    <ShellProvider value={ports}>
      <Suspense
        fallback={
          <p role="status" className="p-4">
            {ports.strings.t("screenLoading")}
          </p>
        }
      >
        <Shell ports={ports} route={route} />
      </Suspense>
    </ShellProvider>,
  );
  return () => root.unmount();
}
