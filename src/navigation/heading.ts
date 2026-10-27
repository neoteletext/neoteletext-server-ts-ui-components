// A collapsible section's heading (collapsible.ts): its title on a band,
// "+" while the section is shut and "-" while it is open, the band a
// control.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
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

/** The cells before the title: the band's colour and New Background. */
const TITLE_AT = 2;

function lookOf(props: HeadingProps): { readonly background: Colour; readonly foreground: Colour } {
  if (props.disabled) {
    return DISABLED_BAND;
  }
  return props.chosen ? CHOSEN : { background: props.background, foreground: Colour.White };
}

export class Heading extends Component<HeadingProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const look = lookOf(this.props);
    canvas.background(0, 0, look.background);
    // The title's colour takes a cell after the band's two, and the band's Black Background the last.
    canvas.coloured(0, TITLE_AT, look.foreground, fit(`${this.props.open ? "-" : "+"} ${this.props.title}`, canvas.width - TITLE_AT - 2));
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
