// What a NAPLPS picture page's objects are made of (renderer parity PAR-42,
// animation.md ANIM-11): each one's rectangle round its cells in the
// design picture, and its label.

import { naplpsLimits } from "../kit.ts";
import { FIRST_TEXT_ROW, LAST_TEXT_ROW } from "./grid.ts";
import { cellsBox, type DesignBox } from "./naplps-painter.ts";
import type { PictureScene } from "./scene.ts";

/** A label as an object takes it: UTF-8 within MAX_LABEL_BYTES, cut at a whole character, or none. */
export function objectLabel(label: string): string | null {
  let cut = "";
  const encoder = new TextEncoder();
  for (const character of label) {
    if (encoder.encode(cut + character).length > naplpsLimits.MAX_LABEL_BYTES) {
      break;
    }
    cut += character;
  }
  return cut === "" ? null : cut;
}

/** The design picture's rectangle round a component's cells. */
export function boundsOf(scene: PictureScene, number: number): DesignBox | null {
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    const owners = scene.owners[row] ?? [];
    for (let column = 0; column < owners.length; column += 1) {
      if (owners[column] === number) {
        top = Math.min(top, row);
        bottom = Math.max(bottom, row + (scene.cells[row]?.[column]?.tall === true ? 2 : 1));
        left = Math.min(left, column);
        right = Math.max(right, column + 1);
      }
    }
  }
  if (top === Infinity) {
    return null;
  }
  const box = cellsBox(top, left, right - left, Math.min(bottom, LAST_TEXT_ROW + 1) - top);
  return box.height > 0 ? box : null;
}
