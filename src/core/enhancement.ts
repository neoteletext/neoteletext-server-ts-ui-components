// A sub-page's local enhancement data, packets X/26 (EN 300 706 clause
// 12.3): its controls (controls.ts), and the Level 2.5
// display attributes its components ask for as they paint
// (canvas.displayAttributes). A display attributes triplet (Table 29,
// column mode 01100) is non-spacing: it takes no cell, and acts from the
// Active Position to the end of the row or a further such triplet with
// its bit at 0. It is how a page has what Table 26 gives Levels 1 and 1.5
// no response to, such as Double Width (0/E), over a level 1 row that
// reads alone.
//
// The data is one list in screen address order (Annex A.4: a decoder may
// ignore a triplet that addresses a place earlier than the one before it):
// row by row from the top, a Set Active Position triplet (Table 28) and the
// row's triplets in increasing column order, a control before an attribute
// at the same column; then the Termination
// Marker (Annex A.3). Unlike controls, which a click is found on and so
// only the first sub-page declares (draw.ts), display attributes are how a
// sub-page looks, so every sub-page carries those it paints.

import { COLUMNS } from "../kit.ts";
import type { Box } from "./layout.ts";
import {
  controlTriplet,
  enhancementLines,
  FIRST_CONTROL_ROW,
  type Kept,
  keptDeclarations,
  LAST_CONTROL_ROW,
  LOCAL_TRIPLETS,
  setActivePosition,
  TERMINATION,
  triplet,
} from "./controls.ts";

/** Table 29: column mode 01100, Display attributes. */
const MODE_DISPLAY_ATTRIBUTES = 0b01100;

/** Table 29, Display attributes: a data bit enables its attribute at 1; data 0 ends them all. */
export const DisplayAttribute = {
  None: 0,
  /** D6: characters stretched over the next character-space. */
  DoubleWidth: 1 << 6,
} as const;

/** A component's request for display attributes `flags` (DisplayAttribute) from a cell of the page. */
export interface DisplayAttributes {
  readonly row: number;
  readonly column: number;
  readonly flags: number;
}

/** The triplet that sets display attributes `flags` from `column` of the active row (Table 29). */
export function displayAttributesTriplet(column: number, flags: number): number {
  return triplet(column, MODE_DISPLAY_ATTRIBUTES, flags);
}

/** The Termination Marker's one triplet, sent whenever anything is. */
const TERMINATION_TRIPLETS = 1;

/** A triplet of the local data and the cell it addresses. */
interface Placed {
  readonly row: number;
  readonly column: number;
  readonly value: number;
}

/** Runs of `boxes` as `encode` writes them: a triplet on each row a box covers, the rows below its first joined to it. */
function placedRuns(boxes: readonly Box[], encode: (column: number, width: number, joined: boolean) => number): Placed[] {
  return boxes.flatMap((box) =>
    Array.from({ length: box.height }, (_, below) => ({ row: box.row + below, column: box.column, value: encode(box.column, box.width, below > 0) })),
  );
}

/**
 * The local enhancement data of what a sub-page keeps (keptControls,
 * keptDisplayAttributes), in screen address order: each row from the top,
 * its Set Active Position and its triplets by column; then the Termination
 * Marker. Empty when there is nothing.
 */
export function enhancementTriplets(controls: readonly Box[], attributes: readonly DisplayAttributes[] = []): number[] {
  const placed = [
    ...placedRuns(controls, controlTriplet),
    ...attributes.map(({ row, column, flags }) => ({ row, column, value: displayAttributesTriplet(column, flags) })),
  ];
  if (placed.length === 0) {
    return [];
  }
  const triplets: number[] = [];
  for (const row of new Set(placed.map((each) => each.row).toSorted((a, b) => a - b))) {
    triplets.push(setActivePosition(row));
    // toSorted is stable: at one column, a control, then an attribute, as asked.
    for (const { value } of placed.filter((each) => each.row === row).toSorted((a, b) => a.column - b.column)) {
      triplets.push(value);
    }
  }
  triplets.push(TERMINATION);
  return triplets;
}

/**
 * What a sub-page keeps of the display attributes asked for: those on rows
 * 1 to 23 and the page's columns (row 0 would need Address Display Row 0
 * and columns 8 on, Table 28 mode 00111; row 24 is the Fastext row), in
 * what the local data's 16 packets of 13 triplets have left after the
 * controls `kept`, which take theirs first as what a
 * click acts on. A row's are kept all or none, from the top: each acts to
 * the row's end, so one kept without the triplet after it that ends it
 * would carry over the rest of the row. What does not fit is dropped.
 */
export function keptDisplayAttributes(kept: Pick<Kept, "controls">, declared: readonly DisplayAttributes[]): DisplayAttributes[] {
  const onPage = declared.filter(
    ({ row, column }) =>
      Number.isInteger(row) && Number.isInteger(column) && row >= FIRST_CONTROL_ROW && row <= LAST_CONTROL_ROW && column >= 0 && column < COLUMNS,
  );
  const rowsAddressed = new Set(kept.controls.flatMap((box) => Array.from({ length: box.height }, (_, below) => box.row + below)));
  let used = Math.max(enhancementTriplets(kept.controls).length, TERMINATION_TRIPLETS);
  const held: DisplayAttributes[] = [];
  for (const row of new Set(onPage.map((each) => each.row).toSorted((a, b) => a - b))) {
    const onRow = onPage.filter((each) => each.row === row);
    const needs = onRow.length + (rowsAddressed.has(row) ? 0 : 1);
    if (used + needs <= LOCAL_TRIPLETS) {
      held.push(...onRow);
      used += needs;
    }
  }
  return held;
}

/** A sub-page's local enhancement data: what it keeps of the controls declared, and its OL,26 lines, without newlines. */
export interface LocalEnhancement {
  readonly kept: Kept;
  readonly lines: string[];
}

/** A sub-page's local enhancement data of the controls declared and the display attributes asked for, of each what fits. */
export function localEnhancement(controls: readonly Box[], attributes: readonly DisplayAttributes[] = []): LocalEnhancement {
  const kept = keptDeclarations(controls);
  return { kept, lines: enhancementLines(enhancementTriplets(kept.controls, keptDisplayAttributes(kept, attributes))) };
}
