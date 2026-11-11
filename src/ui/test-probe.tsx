// Test-mode probe for the shared dialog contract. Imported only by
// `src/entry/test-entry.ts`, so a production build never emits it.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "./components/button.tsx";
import { Dialog } from "./components/dialog.tsx";
import { Field } from "./components/field.tsx";

function Probe() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button id="probe-open">Open probe</Button>}
      title="Probe dialog"
      description="Shared dialog contract"
      closeLabel="Close probe"
    >
      <Field label="Probe field" defaultValue="probe" />
    </Dialog>
  );
}

export function mountDialogProbe(element: HTMLElement): () => void {
  const root = createRoot(element);
  root.render(<Probe />);
  return () => root.unmount();
}
