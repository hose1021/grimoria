export function watchNotesLifecycle(
  page: EventTarget,
  doc: EventTarget & { readonly visibilityState: string },
  flush: () => boolean,
): void {
  // Mobile browsers can suspend a page before its typing timer or blur fires.
  doc.addEventListener("visibilitychange", () => {
    if (doc.visibilityState === "hidden") flush();
  });
  page.addEventListener("pagehide", flush);
}
