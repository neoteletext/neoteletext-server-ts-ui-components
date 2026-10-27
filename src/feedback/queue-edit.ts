// A player's queue (audio-player.ts) changed as terminal players change
// theirs: a track taken out, moved up or down one, or moved to play next.
// The queue holds the tracks' places in the list the page gave, so the
// tracks themselves are never copied; each change answers the queue and
// where the moved track now is, so the list's choice can follow it.

/** A queue and the place in it the choice is at. */
export interface Edited {
  readonly queue: readonly number[];
  readonly at: number;
}

/** The queue without the track at `at`; the choice stays at its place, or the last there is. */
export function removeAt(queue: readonly number[], at: number): Edited {
  if (at < 0 || at >= queue.length) {
    return { queue, at };
  }
  const left = queue.toSpliced(at, 1);
  return { queue: left, at: Math.max(0, Math.min(at, left.length - 1)) };
}

/** The track at `at` moved `step` places, no further than the ends. */
export function moveBy(queue: readonly number[], at: number, step: number): Edited {
  const track = queue[at];
  if (track === undefined) {
    return { queue, at };
  }
  const to = Math.max(0, Math.min(queue.length - 1, at + step));
  return { queue: queue.toSpliced(at, 1).toSpliced(to, 0, track), at: to };
}

/** The track at `at` moved to just after `current`, the track playing, so it plays next; to the front when nothing plays. */
export function playNext(queue: readonly number[], at: number, current: number | null): Edited {
  const track = queue[at];
  if (track === undefined || track === current) {
    return { queue, at };
  }
  const without = queue.toSpliced(at, 1);
  const to = current === null ? 0 : without.indexOf(current) + 1;
  return { queue: without.toSpliced(to, 0, track), at: to };
}
