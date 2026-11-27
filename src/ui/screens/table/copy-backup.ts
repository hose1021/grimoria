export async function copyBackup(
  field: Pick<HTMLTextAreaElement, "value" | "focus" | "select" | "isConnected">,
): Promise<"copied" | "manual"> {
  try {
    await navigator.clipboard.writeText(field.value);
    return "copied";
  } catch {
    // A permission prompt can outlive the dialog that requested it.
    if (field.isConnected) {
      field.focus();
      field.select();
    }
    return "manual";
  }
}
