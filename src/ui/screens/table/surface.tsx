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

/** The frame and the mat of one measured board. */
export function TableFelt({ layout, phase }: { layout: TableLayout; phase: GameState["phase"] }) {
  // Seats sit on the contour, so the mat grows past it by half a medallion and
  // the label that hangs off the edge; the ring geometry stays the contract.
  const pad = Math.max(24, Math.min(46, Math.round(layout.bounds.width * 0.075)));
  return (
    <div
      className="absolute border-[6px] border-[#26262e] bg-[#0a0a0d] shadow-[0_24px_60px_rgba(0,0,0,.65)] min-[620px]:border-[9px]"
      style={{
        left: layout.bounds.left - pad,
        top: layout.bounds.top - pad,
        width: layout.bounds.width + pad * 2,
        height: layout.bounds.height + pad * 2,
      }}
      data-table-rail
      aria-hidden="true"
    >
      <div
        className="relative h-full w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#1c1c24,#0d0d12_70%)]"
        data-table-felt
        data-phase={phase}
      >
        {phase === "night" ? (
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(61,123,255,.16),transparent_70%)]" />
        ) : (
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_34%,rgba(255,201,60,.14),transparent_70%)]" />
        )}
        <span
          className="absolute inset-x-0 -bottom-[6px] h-[6px] bg-[repeating-linear-gradient(-45deg,#ffc93c_0_7px,#101010_7px_14px)] opacity-80 min-[620px]:-bottom-[9px] min-[620px]:h-[9px]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
