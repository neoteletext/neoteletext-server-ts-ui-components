// Which component each cell of the first sub-page reaches, and what its
// components declared that a click can reach: a control or a pointer area
// is kept only where the deepest component drawn on every cell of it is the
// one that declared it, or one under it, not a dialog or layer drawn over.

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

/** A pointer area a sub-page keeps, and its component; a null area is the whole page. */
export interface PointerArea {
  readonly node: Node;
  readonly area: Box | null;
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

/** `box` cut to the page. */
function clipped(box: Box): Box {
  const row = Math.max(0, box.row);
  const column = Math.max(0, box.column);
  return {
    row,
    column,
    width: Math.max(0, Math.min(COLUMNS, box.column + box.width) - column),
    height: Math.max(0, Math.min(ROWS, box.row + box.height) - row),
  };
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

/** What a sub-page declares of what its components did; the whole page only for a component nothing covers. */
export function reachedDeclarations(grid: Grid, owned: readonly Owned[]): { controls: DeclaredControl[]; areas: PointerArea[] } {
  const controls: DeclaredControl[] = [];
  const areas: PointerArea[] = [];
  for (const { node, declared } of owned) {
    controls.push(...declared.controls.filter((control) => reaches(grid, node, control)).map((control) => ({ node, control })));
    areas.push(...declared.pointerAreas.filter((area) => reaches(grid, node, area)).map((area) => ({ node, area })));
    if (declared.wholePage && reaches(grid, node, clipped(node.box))) {
      areas.push({ node, area: null });
    }
  }
  return { controls, areas };
}
