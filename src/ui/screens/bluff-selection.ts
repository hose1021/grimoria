// A fixed bluff list must stay usable: when every slot is full, a new pick
// replaces the oldest entry instead of being ignored.
export function chooseBluff(
  selected: readonly string[],
  candidate: string,
  needed: number,
): string[] {
  if (selected.includes(candidate)) return selected.slice();
  const next = selected.slice();
  if (next.length >= needed) next.shift();
  next.push(candidate);
  return next;
}
