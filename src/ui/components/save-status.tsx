export interface SaveStatusProps {
  status: "saved" | "failed";
  message?: string;
}

export function SaveStatus({ status, message }: SaveStatusProps) {
  if (status === "saved") return null;
  return (
    <output
      role="alert"
      className="block border-b border-danger bg-crypt-2 p-3 text-sm text-danger"
    >
      {message}
    </output>
  );
}
