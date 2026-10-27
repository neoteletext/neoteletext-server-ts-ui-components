// ToastShelf: split from notice.ts; the comments pass writes this file's header.

import { type Canvas, NEW_BACKGROUND_CELL } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import type { ToastEvent } from "../core/library-events.ts";
import { paintNotice } from "./notice.ts";

export interface ToastShelfProps {
  /** The most toasts shown at once; older ones go first. */
  readonly maxShown?: number;
  /** How long each stays. */
  readonly forMs?: number;
}

interface Shown {
  readonly id: number;
  readonly toast: ToastEvent;
}

interface ToastShelfState {
  readonly shown: readonly Shown[];
}

/** How long a toast stays when not told: long enough to read a line. */
const TOAST_MS = 4_000;

const MOST_TOASTS = 3;

/** Where toasts show: as many rows as it may show, empty while there are none. */
export class ToastShelf extends Component<ToastShelfProps, ToastShelfState> {
  override state: ToastShelfState = { shown: [] };
  #unsubscribe: (() => void) | null = null;
  #next = 0;

  override componentDidMount(): void {
    this.#unsubscribe = this.services.bus.on("toast", (toast) => {
      const forMs = this.props.forMs ?? TOAST_MS;
      const shown: Shown = { id: this.#next, toast };
      this.#next += 1;
      this.setState((state) => ({ shown: [...state.shown, shown].slice(-(this.props.maxShown ?? MOST_TOASTS)) }));
      this.setTimeout(() => {
        this.setState((state) => ({ shown: state.shown.filter((each) => each.id !== shown.id) }));
      }, forMs);
    });
  }

  override componentWillUnmount(): void {
    this.#unsubscribe?.();
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.props.maxShown ?? MOST_TOASTS) };
  }

  override paint(canvas: Canvas): void {
    this.state.shown.forEach(({ id, toast }, row) => {
      const end = paintNotice(canvas, row, toast.kind, toast.text);
      // From the mark's band to the end of the text.
      canvas.control(row, NEW_BACKGROUND_CELL, end - NEW_BACKGROUND_CELL, 1, String(id));
    });
  }

  override hint(): string | null {
    return "A click puts the message away";
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === undefined) {
      return false;
    }
    const id = Number(event.region);
    this.setState((state) => ({ shown: state.shown.filter((each) => each.id !== id) }));
    return true;
  }
}
