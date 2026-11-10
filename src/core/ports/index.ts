// Pure ports for the command path. Declared in core so core never imports
// application. No browser API may leak through these types.
export interface Clock {
  now(): Date;
}

/** Supplies the seed the deterministic PRNG is built from. */
export interface RandomSource {
  seed(text: string): number;
}

export interface IdSource {
  next(prefix?: string): string;
}
