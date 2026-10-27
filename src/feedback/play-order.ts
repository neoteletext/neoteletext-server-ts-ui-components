// The order a player (audio-player.ts) plays its tracks in: as listed, or
// shuffled with the playing track first; what comes after a track and
// before it, by its repeat mode; and how far a seek moves, further in a
// long track.

/** Repeat nothing, the whole list, or the one track. */
export type Repeat = "off" | "all" | "one";

/** The modes in the order the repeat key turns through them. */
const REPEATS: readonly Repeat[] = ["off", "all", "one"];

/** The mode after `repeat`. */
export function nextRepeat(repeat: Repeat): Repeat {
  return REPEATS[(REPEATS.indexOf(repeat) + 1) % REPEATS.length] ?? "off";
}

/** The tracks in their listed order. */
function listed(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** The tracks shuffled (Fisher–Yates), `first` at the front so what plays goes on playing; `below` picks a number under its bound. */
export function shuffled(count: number, first: number | null, below: (bound: number) => number): number[] {
  const rest = listed(count).filter((index) => index !== first);
  for (let index = rest.length - 1; index > 0; index -= 1) {
    const other = below(index + 1);
    [rest[index], rest[other]] = [rest[other] ?? 0, rest[index] ?? 0];
  }
  return first === null || first >= count ? rest : [first, ...rest];
}

/** The track after `current` in `order`: past the end, the first when the whole list repeats, else none. */
export function following(order: readonly number[], current: number, repeat: Repeat): number | null {
  const place = order.indexOf(current);
  const next = order[place + 1];
  if (next !== undefined) {
    return next;
  }
  return repeat === "all" ? (order[0] ?? null) : null;
}

/** The track before `current` in `order`: before the start, the last when the whole list repeats, else none. */
export function preceding(order: readonly number[], current: number, repeat: Repeat): number | null {
  const place = order.indexOf(current);
  if (place > 0) {
    return order[place - 1] ?? null;
  }
  return repeat === "all" ? (order.at(-1) ?? null) : null;
}

/** A seek's step in a track shorter than LONG_TRACK_MS, and in a longer one, where five seconds is too fine. */
const SHORT_SEEK_MS = 5_000;
const LONG_SEEK_MS = 30_000;
/** Ten minutes: a talk or an album side, not a song. */
const LONG_TRACK_MS = 600_000;

/** How far one seek moves in a track `lengthMs` long, or one whose length is not known. */
export function seekStep(lengthMs: number | null): number {
  return lengthMs !== null && lengthMs >= LONG_TRACK_MS ? LONG_SEEK_MS : SHORT_SEEK_MS;
}

/** Past this, Previous starts the track again rather than going back a track. */
export const RESTART_MS = 5_000;
