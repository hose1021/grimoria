// The build replaces __APP_VERSION__ with the trimmed VERSION file, so the
// running page always reports the release it was built from.
declare global {
  const __APP_VERSION__: string;
}

export {};
