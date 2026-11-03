// A page the library draws whole stops at the sub-pages the kit numbers,
// 8,069, not the 8,190 a page may hold (TODO-1579): beyond, the kit
// would throw rather than publish.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, type Element, h, RawSubPage } from "../src/index.ts";

const PAGE = 0x150;
/** The most sub-pages the code of practice numbers (the engine's `SUBCODES_ABOVE_SET`), and one more. */
const MOST_NUMBERED = 8069;
const DRAWN = MOST_NUMBERED + 1;

class Many extends Component {
  override render(): Child {
    return Array.from({ length: DRAWN }, (_, index) => h(RawSubPage, { key: String(index), tti: `OL,1,Sub-page ${index}\n` }));
  }
}

test("TODO-1579: a page drawn with more sub-pages than the kit numbers publishes the most it numbers and reports the rest", () => {
  const harness = new Harness([new ComponentChannel([{ page: PAGE, title: "Many", root: (): Element => h(Many, {}) }], { opus: fakeOpus() })]);
  harness.join(1, PAGE);
  assert.deepEqual(harness.errors, []);
  assert.equal(harness.sharedPages(PAGE).length, MOST_NUMBERED);
});
