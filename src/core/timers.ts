// A mount's timers: each belongs to a component, runs when it is due, and
// goes when its component unmounts. A timer that runs only while someone
// has the page open waits, with no wake asked for, until someone comes.

import type { AnyComponent } from "./node.ts";

/**
 * The shortest period an animation's frames change at: a 625-line picture's
 * frame, 1/25 s (ITU-R BT.470), the picture teletext is shown in. A change
 * more often than that is never seen, and each is a page published.
 */
export const LEAST_FRAME_MS = 40;

/** `everyMs` as an animation's period: no shorter than a picture can show, that least for one that is no number. */
export function framePeriod(everyMs: number): number {
  return Number.isNaN(everyMs) ? LEAST_FRAME_MS : Math.max(LEAST_FRAME_MS, everyMs);
}

interface Timer {
  at: number;
  readonly period: number | null;
  readonly run: () => void;
  readonly owner: AnyComponent;
  readonly whileViewed: boolean;
}

/** What the timers need of their mount: ids unique across the channel, its clock, and whether anyone has the page open. */
export interface TimerHost {
  readonly nextTimerId: () => number;
  readonly now: () => number;
  readonly viewed: () => boolean;
}

export class Timers {
  readonly #host: TimerHost;
  readonly #timers = new Map<number, Timer>();

  constructor(host: TimerHost) {
    this.#host = host;
  }

  /** A timer of `owner` in `delay` milliseconds, at least one, and every `delay` after when `every`: its id. */
  set(owner: AnyComponent, run: () => void, delay: number, every: boolean, whileViewed: boolean): number {
    const id = this.#host.nextTimerId();
    const wait = Math.max(1, Math.round(delay));
    this.#timers.set(id, { at: this.#host.now() + wait, period: every ? wait : null, run, owner, whileViewed });
    return id;
  }

  clear(id: number): void {
    this.#timers.delete(id);
  }

  /** Every timer of `owner` goes: it unmounted. */
  clearOwner(owner: AnyComponent): void {
    for (const [id, timer] of this.#timers) {
      if (timer.owner === owner) {
        this.#timers.delete(id);
      }
    }
  }

  clearAll(): void {
    this.#timers.clear();
  }

  /** The earliest timer that may run, or null. */
  nextWake(): number | null {
    const viewed = this.#host.viewed();
    let earliest: number | null = null;
    for (const timer of this.#timers.values()) {
      if (timer.whileViewed && !viewed) {
        continue;
      }
      earliest = earliest === null ? timer.at : Math.min(earliest, timer.at);
    }
    return earliest;
  }

  /** Runs the timers due by `now`; a periodic one next falls a period after now, so a late wake does not run it in a burst. */
  run(now: number): void {
    const viewed = this.#host.viewed();
    for (const [id, timer] of Array.from(this.#timers)) {
      // A timer run earlier in this loop may have cleared this one.
      if (timer.at > now || !this.#timers.has(id) || (timer.whileViewed && !viewed)) {
        continue;
      }
      if (timer.period === null) {
        this.#timers.delete(id);
      } else {
        timer.at = now + timer.period;
      }
      timer.run();
    }
  }
}
