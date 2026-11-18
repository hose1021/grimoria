// The measured stadium surface shared by the host table and the seat-order
// ring: one contour, one rail and one felt. Nothing here reads the store.
import { useLayoutEffect, useState } from "react";
import type { GameState } from "../../../core/model/types.ts";
import { tableLayout } from "./ring.ts";
import type { TableLayout } from "./ring.ts";

/**
 * Measures the table box and returns the stadium layout for `count` seats. The
 * fallback box keeps the seats in the DOM before the first measurement; a
 * hidden stage keeps the last non-zero box. The callback ref re-attaches when a
 * screen mounts its ring after an empty state.
 */
export function useTableLayout(count: number): {
  ref: (node: HTMLDivElement | null) => void;
  layout: TableLayout;
} {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const layout: TableLayout = tableLayout(count, box.width || 390, box.height || 494);
  useLayoutEffect(() => {
    if (!node) return;
    const apply = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      setBox((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    const rect = node.getBoundingClientRect();
    apply(rect.width, rect.height);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref: setNode, layout };
}

/** The rail and the felt of one measured stadium. */
export function TableFelt({ layout, phase }: { layout: TableLayout; phase: GameState["phase"] }) {
  return (
    <div
      className="absolute rounded-full bg-[linear-gradient(160deg,var(--color-table-rim),var(--color-crypt)_62%)] p-[6px] shadow-[0_24px_60px_rgba(0,0,0,.55)]"
      style={{
        left: layout.bounds.left,
        top: layout.bounds.top,
        width: layout.bounds.width,
        height: layout.bounds.height,
      }}
      data-table-rail
      aria-hidden="true"
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-full bg-[radial-gradient(ellipse_at_50%_38%,var(--color-felt-day),var(--color-crypt)_72%)] shadow-[inset_0_0_90px_rgba(0,0,0,.55)]"
        data-table-felt
        data-phase={phase}
      >
        <span className="absolute inset-[14%] rounded-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(75,184,170,.12),transparent_70%)]" />
      </div>
    </div>
  );
}
