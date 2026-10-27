// Heading: split from collapsible.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { CHOSEN, DISABLED_BAND } from "../core/look.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

interface HeadingProps {
  readonly title: string;
  readonly open: boolean;
  readonly chosen: boolean;
  readonly background: Colour;
  readonly disabled: boolean;
  readonly onToggle: (session: number) => void;
}

/** The region a heading's band is. */
const BAND = "band";

/** A section's heading: "+" while it is shut, "-" while it is open. */
export class Heading extends Component<HeadingProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const look = this.props.disabled ? DISABLED_BAND : this.props.chosen ? CHOSEN : { background: this.props.background, foreground: Colour.White };
    canvas.background(0, 0, look.background);
    canvas.coloured(0, 2, look.foreground, fit(`${this.props.open ? "-" : "+"} ${this.props.title}`, canvas.width - 4));
    if (!this.props.disabled) {
      canvas.bandControl(0, 0, 1, BAND);
    }
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region !== BAND) {
      return false;
    }
    this.props.onToggle(event.session);
    return true;
  }
}
