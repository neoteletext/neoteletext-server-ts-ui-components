// A page of several sub-pages names each in its sub-page list by a frame's
// title or a page given whole's title (REQ-1503; rdm TODO-1540).

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, type Element, Frame, h, RawSubPage } from "../src/index.ts";
import { Colour } from "../src/kit.ts";

const PAGE = 0x150;
/** A title longer than the list's 40 characters. */
const LONG = "A title much longer than forty characters, cut";

/** A story of three sub-pages, two framed and one given whole. */
class Story extends Component {
  override render(): Child {
    return [
      h(Frame, { key: "one", title: "Story 1/3", background: Colour.Blue }),
      h(Frame, { key: "two", title: LONG, background: Colour.Blue }),
      h(RawSubPage, { key: "three", tti: "OL,3,Whole\n", title: "Story 3/3" }),
    ];
  }
}

test("TODO-1540: the sub-page list a viewer gets names each sub-page by its frame's or page's title", () => {
  const harness = new Harness([
    new ComponentChannel(
      [
        {
          page: PAGE,
          title: "Story",
          root: (): Element => h(Story, {}),
        },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  harness.join(1, PAGE);
  const lists = harness.sent.filter((message) => message["type"] === "subpages" || (message["type"] === "reply" && message["subpages"] !== undefined));
  const list = JSON.stringify(lists.at(-1));
  assert.match(list, /Story 1\/3/u);
  assert.match(list, /Story 3\/3/u);
  assert.match(list, /A title much longer than forty characte/u);
  assert.doesNotMatch(list, /, cut/u, "cut to the list's 40 characters");
});
