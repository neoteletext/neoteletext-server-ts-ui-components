// The wheel and a press on a page given whole (RawSubPage), which declares
// no cells: each goes to the page's root component, as a key with nothing
// focused does (TODO-2013).

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, type Element, h, type PointerEvent, RawSubPage, type WheelEvent } from "../src/index.ts";

const PAGE = 0x150;

/** A row of a page given whole, and a cell on it. */
const TTI = "OL,3,A page given whole\n";
const CELL = { column: 5, row: 3 };

/** A page's root that draws its page whole and keeps what the pointer and the wheel tell it. */
class WholePage extends Component<{ readonly heard: string[] }> {
  override render(): Child {
    return h(RawSubPage, { tti: TTI });
  }

  override onWheel(event: WheelEvent): boolean {
    this.props.heard.push(`wheel ${event.dy} at ${event.row},${event.column}`);
    return true;
  }

  override onPointer(event: PointerEvent): boolean {
    this.props.heard.push(`${event.action} at ${event.row},${event.column}`);
    return true;
  }
}

test("the wheel and a press on a page given whole reach its root component (TODO-2013)", () => {
  const heard: string[] = [];
  const page = new Harness([
    new ComponentChannel([{ page: PAGE, title: "Whole", perViewer: true, root: (): Element => h(WholePage, { heard }) }], { opus: fakeOpus() }),
  ]);
  page.join(1, PAGE);
  page.wheel(1, 120, CELL.column, CELL.row);
  page.mouse(1, "press", 0, CELL.column, CELL.row);
  page.move(1, 1, CELL.column, CELL.row + 1);
  page.mouse(1, "release", 0, CELL.column, CELL.row + 1);
  assert.deepEqual(heard, ["wheel 120 at 3,5", "press at 3,5", "move at 4,5", "release at 4,5"]);
});
