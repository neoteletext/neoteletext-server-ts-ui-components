// What a component declares as it paints (canvas.ts): the regions a click
// names, its controls, the display attributes it asks for in the sub-page's
// local enhancement data, and the cursor, each in cells of the page.

import type { Declared, PageRequests, Region } from "./canvas-parts.ts";
import type { Box } from "./layout.ts";

export class CanvasDeclarations {
  readonly box: Box;
  readonly #requests: PageRequests;
  readonly #regions: Region[];
  readonly #declared: Declared;

  constructor(box: Box, requests: PageRequests, regions: Region[], declared: Declared) {
    this.box = box;
    this.#requests = requests;
    this.#regions = regions;
    this.#declared = declared;
  }

  /**
   * Marks `width` by `height` cells from `row`, `column` of the box as the
   * region `id`: a click there reaches the component with the region's id
   * (events.ts), so it need not lay itself out again to find what was hit.
   */
  region(id: string, row: number, column: number, width: number, height = 1): void {
    this.#regions.push({ id, row: this.box.row + row, column: this.box.column + column, width, height });
  }

  /** `width` by `height` cells from `row`, `column` of the box cut to the box, in cells of the page; null when nothing is left. */
  #inBox(row: number, column: number, width: number, height: number): Box | null {
    const top = Math.max(0, row);
    const left = Math.max(0, column);
    const across = Math.min(this.box.width, column + width) - left;
    const down = Math.min(this.box.height, row + height) - top;
    return across > 0 && down > 0 ? { row: this.box.row + top, column: this.box.column + left, width: across, height: down } : null;
  }

  /**
   * Declares `width` by `height` cells from `row`, `column` of the box, cut
   * to the box, as a control: cells a press acts on, which the browser
   * shows as it shows a link and lights under the pointer itself. With an
   * `id`, the same cells are the region `id`.
   */
  control(row: number, column: number, width: number, height = 1, id?: string): void {
    const cells = this.#inBox(row, column, width, height);
    if (cells === null) {
      return;
    }
    this.#declared.controls.push(cells);
    if (id !== undefined) {
      this.#regions.push({ id, ...cells });
    }
  }

  /**
   * Asks for display attributes `flags` (DisplayAttribute) from `row`,
   * `column` of the box, a cell of its own, in the sub-page's local
   * enhancement data (EN 300 706 Table 29, mode 01100): non-spacing, they
   * act from that cell to the end of the row or a further request there,
   * with DisplayAttribute.None ending them all. Seen at Level 2.5; the
   * level 1 row under them must read without them.
   */
  displayAttributes(row: number, column: number, flags: number): void {
    const cell = this.#inBox(row, column, 1, 1);
    if (cell !== null) {
      this.#requests.displayAttributes.push({ row: cell.row, column: cell.column, flags });
    }
  }

  /** Places the input cursor at `row`, `column` of the box, with the cursor record's `flags` (`CursorFlag`). */
  cursor(row: number, column: number, flags: number): void {
    this.#requests.cursor = { row: this.box.row + row, column: this.box.column + column, flags };
  }
}
