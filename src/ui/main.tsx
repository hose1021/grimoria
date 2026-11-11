import { createRoot } from "react-dom/client";
import "./styles/shell.css";
import { ShellProvider } from "./ports.ts";
import type { ShellPorts } from "./ports.ts";
import type { RouteStore } from "./router.ts";
import { Shell } from "./shell.tsx";

export function mountShell(element: HTMLElement, ports: ShellPorts, route: RouteStore): () => void {
  const root = createRoot(element);
  root.render(
    <ShellProvider value={ports}>
      <Shell ports={ports} route={route} />
    </ShellProvider>
  );
  return () => root.unmount();
}
