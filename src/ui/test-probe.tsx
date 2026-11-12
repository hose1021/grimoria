// Test-mode probe for the shared dialog contract. Imported only by
// `src/entry/test-entry.ts`, so a production build never emits it.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Dialog } from "./components/dialog.tsx";

function Probe() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button id="probe-open" className="btn" type="button">
          Open probe
        </button>
      }
      title="Probe dialog"
      description="Shared dialog contract"
      closeLabel="Close probe"
    >
      <div className="grid gap-1">
        <label className="label" htmlFor="probe-field">
          Probe field
        </label>
        <input id="probe-field" className="field" defaultValue="probe" />
      </div>
    </Dialog>
  );
}

export function mountDialogProbe(element: HTMLElement): () => void {
  const root = createRoot(element);
  root.render(<Probe />);
  return () => root.unmount();
}
