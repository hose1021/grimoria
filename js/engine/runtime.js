// Shared determinism for one store instance: the clock, the PRNG seed and the
// preview timestamp capture. A store creates its own runtime; the default keeps
// the legacy direct-call behaviour for tests that call the engine without one.
/** @param {string} text @returns {number} */
export function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * @param {{ now?: () => Date, seed?: (text: string) => number }} [options]
 */
export function createRuntime(options = {}) {
  return {
    now: options.now || (() => new Date()),
    random: { seed: options.seed || hashString },
    timestamps: new Map()
  };
}

export const defaultRuntime = createRuntime();
