// Badges: short labels on a background of their own colour, in a line of
// text ("LIVE", "3 NEW", "BETA"). Each is a chip (core/canvas.ts): its
// background starts a cell before the text and ends after it. A badge that
// does something when clicked ("PAUSED" to follow again, a wizard's step
// to go back to it) is a control over its chip, and only a click there
// acts.

import { CHIP_CELLS, type Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { cells, fit } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";

export interface BadgeSpec {
  readonly text: string;
  readonly background?: Colour;
  readonly foreground?: Colour;
  /** Flashing, as LIVE and NEWSFLASH are. */
  readonly flash?: boolean;
  /** What a click on it does: it is a control when given. */
  readonly onPress?: (session: number) => void;
}

export interface BadgesProps {
  readonly badges: readonly BadgeSpec[];
  /** Text after the badges, in white. */
  readonly text?: string;
  readonly textForeground?: Colour;
}

/** One or more badges in a row, then text. */
export class Badges extends Component<BadgesProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    let column = 0;
    for (const [index, badge] of this.props.badges.entries()) {
      const room = canvas.width - column - CHIP_CELLS - (badge.flash === true ? 2 : 0);
      if (room <= 0) {
        return;
      }
      const shown = fit(badge.text, room);
      if (badge.flash === true) {
        // Flash and Steady each take a cell: one before the chip, one where its Black Background was.
        canvas.code(0, column, Attribute.Flash);
        const after = canvas.chip(0, column + 1, badge.background ?? Colour.Red, badge.foreground ?? Colour.White, shown);
        this.#pressable(canvas, badge, index, column + 1, after);
        canvas.code(0, after, Attribute.Steady);
        column = after + 1;
      } else {
        const after = canvas.chip(0, column, badge.background ?? Colour.Red, badge.foreground ?? Colour.White, shown);
        this.#pressable(canvas, badge, index, column, after);
        column = after;
      }
    }
    if (this.props.text !== undefined && column < canvas.width - 1) {
      canvas.coloured(0, column, this.props.textForeground ?? Colour.White, fit(this.props.text, canvas.width - column - 1));
    }
  }

  #pressable(canvas: Canvas, badge: BadgeSpec, index: number, column: number, after: number): void {
    if (badge.onPress !== undefined) {
      canvas.chipControl(0, column, after, String(index));
    }
  }

  override onClick(event: PointerEvent): boolean {
    const badge = event.region === undefined ? undefined : this.props.badges[Number(event.region)];
    if (badge?.onPress === undefined) {
      return false;
    }
    badge.onPress(event.session);
    return true;
  }

  /** The cells `badges` take, for laying out beside them. */
  static widthOf(badges: readonly BadgeSpec[]): number {
    return badges.reduce((sum, badge) => sum + cells(badge.text) + CHIP_CELLS + (badge.flash === true ? 2 : 0), 0);
  }
}
