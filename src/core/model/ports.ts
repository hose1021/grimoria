// The platform services one command needs. A command builds a record from its
// runtime and passes it to every domain function that stamps time or mints an
// id, so no rule handler can read an ambient clock or a shared generator.
// Direct engine calls outside a command use `systemPorts`: it is an immutable
// default, never a mutable module-level override.
export interface CommandExecutionContext {
  readonly clock: { readonly now: () => string };
  readonly rng: { readonly next: () => number };
  readonly idFactory: { readonly suffix: (length: number) => string };
}

export function createExecutionContext(
  clock: () => string,
  rng: () => number,
): CommandExecutionContext {
  return {
    clock: { now: clock },
    rng: { next: rng },
    // The short base-36 suffix the state ids use, drawn from the same sequence.
    idFactory: {
      suffix: (length) =>
        rng()
          .toString(36)
          .slice(2, 2 + length),
    },
  };
}

/** The platform default for a direct call that is not part of a command. */
export const systemPorts: CommandExecutionContext = createExecutionContext(
  () => new Date().toISOString(),
  () => Math.random(),
);

/** The short id suffix a domain record appends to its sequence number. */
export function idSuffix(ports: CommandExecutionContext, length: number): string {
  return ports.idFactory.suffix(length);
}
