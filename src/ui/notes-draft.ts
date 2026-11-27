import type { GameState } from "../core/model/types.ts";

export function createNotesDraft(readGame: () => Pick<GameState, "createdAt" | "notes">) {
  // A failed edit outlives the notes dialog. A different game or an external
  // change to its saved notes supersedes the draft.
  let pending: { game: string; original: string; text: string } | null = null;

  function read(): string {
    const { createdAt, notes } = readGame();
    if (pending && (pending.game !== createdAt || pending.original !== notes)) pending = null;
    return pending?.text ?? notes;
  }

  return {
    read,
    canAdoptExternal(next: Pick<GameState, "createdAt" | "notes"> | null): boolean {
      if (!pending) return true;
      read(); // A local import or reset may already have superseded the editor.
      return (
        !pending ||
        (next !== null &&
          next.createdAt === pending.game &&
          (next.notes === pending.original || next.notes === pending.text))
      );
    },
    edit(text: string): void {
      const { createdAt, notes } = readGame();
      pending = text === notes ? null : { game: createdAt, original: notes, text };
    },
    flush(commit: (text: string) => boolean): boolean {
      const text = read();
      if (!pending) return true;
      if (!commit(text)) return false;
      pending = null;
      return true;
    },
  };
}

export type NotesDraft = ReturnType<typeof createNotesDraft>;
