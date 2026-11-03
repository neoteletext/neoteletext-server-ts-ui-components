// What a viewer types is text from outside the program (REQ-2150 item 3,
// DEC-2326): its runs are marked outside, so the server shows a stand-in
// for a character its language cannot show instead of refusing the page.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { ComponentChannel, type Element, Frame, h, TextField } from "../src/index.ts";
import { Colour, type WireTextRun } from "../src/kit.ts";

const PAGE = 0x150;

/** The text runs of the latest sub-page `session` was sent of `page`. */
function lastRuns(harness: Harness, session: number, page: number): readonly WireTextRun[] {
  return harness.channel.copy(session, page)?.at(-1)?.content.text ?? [];
}

test("DEC-2326: what a viewer typed into a text field is sent as a run from outside, the page's own words are not", () => {
  const harness = new Harness([
    new ComponentChannel(
      [
        {
          page: PAGE,
          title: "Name",
          perViewer: true,
          root: (): Element => h(Frame, { title: "Your name", background: Colour.Blue }, h(TextField, { longest: 20, autoFocus: true })),
        },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  harness.join(1, PAGE);
  harness.typeText(1, "Zoë 😀");
  const runs = lastRuns(harness, 1, PAGE);
  const typed = runs.find((run) => run.text.includes("Zoë"));
  assert.equal(typed?.outside, true, JSON.stringify(runs));
  const title = runs.find((run) => run.text.includes("Your name"));
  assert.equal(title?.outside, undefined, "the program's own title is not from outside");
});
