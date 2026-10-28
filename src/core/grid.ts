// Which component each cell of the first sub-page reaches, and what its
// components declared that a click can reach: a control is kept only where
// the deepest component drawn on every cell of it is the one that declared
// it, or one under it, not a dialog or layer drawn over.

import { COLUMNS, ROWS } from "../kit.ts";
import type { Declared } from "./canvas.ts";
import type { Box } from "./layout.ts";
import type { Node } from "./node.ts";

/** For each cell of a sub-page, the deepest component drawn there. */
export type Grid = (Node | null)[][];

/** A control a sub-page keeps, and the component that declared it. */
export interface DeclaredControl {
  readonly node: Node;
  readonly control: Box;
}

/** What a component declared as it painted. */
export interface Owned {
  readonly node: Node;
  readonly declared: Declared;
}

export function inside(box: Box, row: number, column: number): boolean {
  return row >= box.row && row < box.row + box.height && column >= box.column && column < box.column + box.width;
}

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, (): Node | null => null));
}

/** Whether a click on every cell of `control` reaches `owner`: the deepest component drawn there is it or under it. */
function reaches(grid: Grid, owner: Node, control: Box): boolean {
  for (let row = control.row; row < control.row + control.height; row += 1) {
    for (let column = control.column; column < control.column + control.width; column += 1) {
      let at = grid[row]?.[column] ?? null;
      while (at !== null && at !== owner) {
        at = at.parent;
      }
      if (at === null) {
        return false;
      }
    }
  }
  return true;
}

/** The controls a sub-page declares of those its components did: each only where a click on it reaches its component. */
export function reachedControls(grid: Grid, owned: readonly Owned[]): DeclaredControl[] {
  return owned.flatMap(({ node, declared }) => declared.controls.filter((control) => reaches(grid, node, control)).map((control) => ({ node, control })));
}
