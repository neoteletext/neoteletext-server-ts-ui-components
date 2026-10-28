// The lines that join a tree's items (tree.ts): each item's branch under
// its parent's mark, or on the line joining the top items, and a line down
// each level's column past the items of deeper levels while that level
// goes on. They are blue separated mosaics: a sixel of them is drawn
// smaller than its share of the cell (EN 300 706 clause 12.2), so a line
// one sixel wide reads as a thin dotted line, as a tree view's do, where a
// contiguous one reads as a bar half a cell wide.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { ITEM_TEXT } from "../core/look.ts";
import { LEFT_HALF, MOSAIC_BASE, SIXEL } from "../core/mosaics.ts";
import { Attribute, Colour, mosaicColour } from "../kit.ts";

/** Where an item is among the rest, which is all its guides draw. */
export interface GuidePlace {
  /** Its level, 0 at the top. */
  readonly depth: number;
  /** It is the first of its level under its parent. */
  readonly first: boolean;
  /** It is the last of its level under its parent. */
  readonly last: boolean;
  /** For each level above it, from the top, whether the line of that level goes on down past it. */
  readonly through: readonly boolean[];
}

/** What comes before the lines: their colour, then Separated. */
const LEAD: readonly number[] = [mosaicColour(Colour.Blue), Attribute.Separated];

/** A line down a level's column, past items of deeper levels (EN 300 706 Table 47). */
const DOWN = LEFT_HALF;

/**
 * The cells from a level's line to the next's: an item's band starts in
 * the cell after its branch and its mark ITEM_TEXT after that, and its
 * children's line runs down from under that mark.
 */
const LEVEL_CELLS = 1 + ITEM_TEXT;

/** The column of the line joining the items of `depth`, after the lead. */
function lineColumn(depth: number): number {
  return depth * LEVEL_CELLS;
}

/** An item's branch: up to its parent's mark or the item above, across towards it, and on down while items of its level follow. */
function branchOf(place: GuidePlace): number {
  const fromAbove = place.depth > 0 || !place.first;
  return MOSAIC_BASE | (fromAbove ? SIXEL.topLeft : 0) | SIXEL.middleLeft | SIXEL.middleRight | (place.last ? 0 : SIXEL.bottomLeft);
}

/** An item's guides after the lead: a line down in the column of each level above it that goes on, then its branch. */
function guideCodes(place: GuidePlace): number[] {
  const codes = Array.from({ length: lineColumn(place.depth) + 1 }, () => MOSAIC_BASE);
  place.through.forEach((down, depth) => {
    if (down) {
      codes[lineColumn(depth)] = DOWN;
    }
  });
  codes[lineColumn(place.depth)] = branchOf(place);
  return codes;
}

/** The cells an item's guides take, its lead's included: its band starts after them. */
export function guidesIndent(place: GuidePlace): number {
  return LEAD.length + lineColumn(place.depth) + 1;
}

export class TreeGuides extends Component<{ readonly place: GuidePlace }> {
  override paint(canvas: Canvas): void {
    canvas.codes(0, 0, [...LEAD, ...guideCodes(this.props.place)]);
  }
}
