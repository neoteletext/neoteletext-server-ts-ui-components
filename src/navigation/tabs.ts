// Tabs: named views, one shown at a time. The strip names them in a row;
// the view shows the chosen one's content under it. Four looks: chips on
// backgrounds of their own, Fastext's four colours (the coloured keys
// choose, so the page takes them), numbers (the digits choose, so the page
// takes them), and an underline under the chosen name. Every tab takes the
// same cells whether it is chosen or not, as a chip does (core/canvas.ts),
// so choosing one never moves the others, and each is a control there.

import { CHIP_CELLS, type Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { CHOSEN, DISABLED, DISABLED_CHIP, LABEL } from "../core/look.ts";
import { TOP_ROW } from "../core/mosaics.ts";
import type { PageNeeds } from "../core/needs.ts";
import { cells } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { KEY_COLOURS } from "../frame/fastext-bar.ts";

export type TabStyle = "chips" | "fastext" | "numbered" | "underline";

/** Where a tab's text starts in its slot: after a chip's background colour, New Background and foreground. */
const TEXT_IN_SLOT = 3;

/** What a tab shows: its name, numbered in that style. */
function shown(name: string, index: number, style: TabStyle): string {
  return style === "numbered" ? `${index + 1} ${name}` : name;
}

/** What a style takes from page selection. */
export function styleNeeds(style: TabStyle): PageNeeds {
  return { colourKeys: style === "fastext", digits: style === "numbered" };
}

export interface TabStripProps {
  readonly tabs: readonly string[];
  readonly active: number;
  readonly style?: TabStyle;
  /** The strip is the one with the keys: the chosen tab on the band. */
  readonly focused?: boolean;
  /** Its tabs cannot be chosen: they declare no controls. */
  readonly disabled?: boolean;
  readonly onChange: (index: number, session: number) => void;
}

/** The tabs' names in a row, the chosen one marked; a click chooses one. It keeps nothing: its parent says which is chosen. */
export class TabStrip extends Component<TabStripProps> {
  get #style(): TabStyle {
    return this.props.style ?? "chips";
  }

  override needs(): PageNeeds {
    return styleNeeds(this.#style);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#style === "underline" ? 2 : 1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const style = this.#style;
    let start = 0;
    this.props.tabs.forEach((name, index) => {
      const label = shown(name, index, style);
      const width = cells(label) + CHIP_CELLS;
      if (start + width > canvas.width) {
        return;
      }
      const chosen = index === this.props.active;
      const keyColour = KEY_COLOURS[index % KEY_COLOURS.length] ?? Colour.White;
      if (this.props.disabled === true) {
        // Every look the same when none can be chosen: the chosen one on a dim chip, the rest dim.
        if (chosen) {
          canvas.chip(0, start, DISABLED_CHIP.background, DISABLED_CHIP.foreground, label);
        } else {
          canvas.coloured(0, start + TEXT_IN_SLOT - 1, DISABLED, label);
        }
      } else if (style === "underline") {
        canvas.coloured(0, start + TEXT_IN_SLOT - 1, chosen ? Colour.Yellow : LABEL, label);
        if (chosen) {
          canvas.mosaics(
            1,
            start + TEXT_IN_SLOT - 1,
            Colour.Yellow,
            Array.from({ length: cells(label) }, () => TOP_ROW),
          );
        }
      } else if (style === "fastext") {
        if (chosen) {
          canvas.chip(0, start, keyColour, Colour.Black, label);
        } else {
          canvas.coloured(0, start + TEXT_IN_SLOT - 1, keyColour, label);
        }
      } else if (chosen) {
        canvas.chip(0, start, this.props.focused === false ? Colour.Cyan : CHOSEN.background, CHOSEN.foreground, label);
      } else if (style === "chips") {
        canvas.chip(0, start, Colour.Blue, Colour.White, label);
      } else {
        canvas.coloured(0, start + TEXT_IN_SLOT - 1, LABEL, label);
      }
      if (this.props.disabled !== true) {
        // Where a chip's band is, chosen or not, so the control never moves.
        canvas.chipControl(0, start, start + width, String(index));
      }
      start += width;
    });
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === undefined) {
      return false;
    }
    this.props.onChange(Number(event.region), event.session);
    return true;
  }
}
