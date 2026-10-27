// Where toasts show (notice.ts): the newest at the foot, as many as it may
// show, each going after its time or at a click on it. A toast that can be
// undone says so, and its undo runs, once, at a click on it or at the undo
// key, which the shelf hears wherever the keys are (onPageKey). A toast it can no
// longer show goes at once, and its timer with it, so a burst of toasts
// leaves no more state or timers than the shelf has rows.

import { type Canvas, NEW_BACKGROUND_CELL } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type PointerEvent } from "../core/events.ts";
import type { ToastEvent } from "../core/library-events.ts";
import { ROWS } from "../kit.ts";
import { paintNotice } from "./notice.ts";

export interface ToastShelfProps {
  /** The most toasts shown at once; older ones go first. */
  readonly maxShown?: number;
  /** How long each stays, in milliseconds. */
  readonly forMs?: number;
}

interface Shown {
  readonly id: number;
  readonly toast: ToastEvent;
}

interface ToastShelfState {
  readonly shown: readonly Shown[];
}

/** The key that undoes the newest toast that can be undone, and what such a toast says of it. */
const UNDO_KEY = "u";
const UNDO_WORDS = " (u undoes)";

/** How long a toast stays when not told: long enough to read a line. */
const TOAST_MS = 4_000;

const MOST_TOASTS = 3;

/** Where toasts show: as many rows as it may show, empty while there are none. */
export class ToastShelf extends Component<ToastShelfProps, ToastShelfState> {
  override state: ToastShelfState = { shown: [] };
  #unsubscribe: (() => void) | null = null;
  #next = 0;
  /** Each toast shown's timer, by its id, oldest first: the same toasts as the state's. */
  readonly #timers = new Map<number, number>();

  /**
   * The most toasts it keeps: a whole number from nought to a page's rows.
   * Nought, NaN and a fraction would otherwise reach slice(-most), which
   * for -0 and NaN keeps every toast.
   */
  get #most(): number {
    const most = this.props.maxShown ?? MOST_TOASTS;
    return Number.isNaN(most) ? MOST_TOASTS : Math.min(ROWS, Math.max(0, Math.trunc(most)));
  }

  override componentDidMount(): void {
    this.#unsubscribe = this.services.bus.on("toast", (toast) => {
      this.#add(toast);
    });
  }

  override componentWillUnmount(): void {
    this.#unsubscribe?.();
  }

  #add(toast: ToastEvent): void {
    const most = this.#most;
    if (most === 0) {
      return;
    }
    const id = this.#next;
    this.#next += 1;
    this.#timers.set(
      id,
      this.setTimeout(() => {
        this.#remove(id);
      }, this.props.forMs ?? TOAST_MS),
    );
    this.setState((state) => ({ shown: [...state.shown, { id, toast }].slice(-most) }));
    // The toasts the slice let go are the oldest timers.
    for (const [old, timer] of [...this.#timers].slice(0, -most)) {
      this.clearTimer(timer);
      this.#timers.delete(old);
    }
  }

  #remove(id: number): void {
    const timer = this.#timers.get(id);
    if (timer !== undefined) {
      this.clearTimer(timer);
      this.#timers.delete(id);
    }
    this.setState((state) => ({ shown: state.shown.filter((each) => each.id !== id) }));
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.#most) };
  }

  override paint(canvas: Canvas): void {
    this.state.shown.forEach(({ id, toast }, row) => {
      const end = paintNotice(canvas, row, toast.kind, toast.undo === undefined ? toast.text : `${toast.text}${UNDO_WORDS}`);
      // From the mark's band to the end of the text.
      canvas.control(row, NEW_BACKGROUND_CELL, end - NEW_BACKGROUND_CELL, 1, String(id));
    });
  }

  override hint(): string | null {
    return "A click puts the message away";
  }

  /** Puts toast `id` away, undoing what it told of when it can be undone. */
  #dismiss(id: number, session: number): void {
    this.state.shown.find((each) => each.id === id)?.toast.undo?.(session);
    this.#remove(id);
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === undefined) {
      return false;
    }
    this.#dismiss(Number(event.region), event.session);
    return true;
  }

  override onPageKey(event: KeyEvent): boolean {
    const newest = this.state.shown.findLast((each) => each.toast.undo !== undefined);
    if (newest === undefined || !isPress(event, UNDO_KEY)) {
      return false;
    }
    this.#dismiss(newest.id, event.session);
    return true;
  }
}
