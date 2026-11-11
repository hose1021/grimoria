export interface OfflineBannerProps {
  offline: boolean;
  message: string;
}

export function OfflineBanner({ offline, message }: OfflineBannerProps) {
  if (!offline) return null;
  return (
    <output aria-live="polite" className="block p-1 text-center text-xs text-muted">
      {message}
    </output>
  );
}
