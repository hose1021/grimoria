// Radix owns the focus trap, Escape, focus restore, `aria-modal` and the
// title-to-content name association. Styling stays in the shared tokens.
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "./button.tsx";

export interface DialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  trigger: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  closeLabel: string;
  /** Replaces the single close control when the dialog owns its own actions. */
  footer?: ReactNode;
}

/** A control that closes the dialog; the caller supplies the markup. */
export function DialogClose({ children }: { children: ReactNode }) {
  return <DialogPrimitive.Close asChild>{children}</DialogPrimitive.Close>;
}

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  closeLabel,
  footer,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay data-shell-overlay="" className="fixed inset-0 z-1000 bg-bg/80" />
        <DialogPrimitive.Content
          aria-modal="true"
          className="fixed left-1/2 top-1/2 z-1000 w-[min(calc(100vw-24px),560px)] -translate-x-1/2 -translate-y-1/2 rounded-(--radius) border border-line-2 bg-panel p-(--pad) text-text shadow-lg"
        >
          <DialogPrimitive.Title className="mb-2 text-base font-semibold">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mb-3 text-sm text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {children}
          {footer ?? (
            <DialogPrimitive.Close asChild>
              <Button className="mt-4" data-act="close">
                {closeLabel}
              </Button>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
