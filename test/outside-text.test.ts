// What a viewer types is text from outside the program (REQ-2150 item 3,
// DEC-2326): its runs are marked outside, so the server shows a stand-in
// for a character its language cannot show instead of refusing the page.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { ChoiceList, ComponentChannel, type Element, Frame, h, Paragraph, Rows, Text, TextField } from "../src/index.ts";
import { Colour, type WireTextRun } from "../src/kit.ts";

const PAGE = 0x150;

/** The text runs of the latest sub-page `session` was sent of `page`. */
function lastRuns(harness: Harness, session: number, page: number): readonly WireTextRun[] {
  return (harness.channel.copy(session, page) ?? harness.channel.copy("channel", page))?.at(-1)?.content.text ?? [];
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

/** A title from a dataset, holding characters English cannot show: the ellipsis U+2026, curly quotation marks and an en dash. */
const DATASET_TITLE = "\u201CTiny\u201D radios \u2013 a look\u2026";

/** A page whose body shows `title` as a heading, a paragraph and a list item, under `outside` when it is given. */
function datasetPage(outside: boolean | undefined): Harness {
  const body = h(
    Rows,
    outside === undefined ? {} : { outside },
    h(Text, { text: DATASET_TITLE }),
    h(Paragraph, { text: DATASET_TITLE }),
    h(ChoiceList, { items: [DATASET_TITLE], shown: 1, onChoose: () => {} }),
  );
  const harness = new Harness([
    new ComponentChannel([{ page: PAGE, title: "Articles", root: (): Element => h(Frame, { title: "Newest", background: Colour.Blue }, body) }], {
      opus: fakeOpus(),
    }),
  ]);
  harness.join(1, PAGE);
  return harness;
}

test("DEC-2326: a component under an outside prop sends its text as runs from outside, and the program's own words and marks are not", () => {
  const runs = lastRuns(datasetPage(true), 1, PAGE);
  const fromDataset = runs.filter((run) => run.text.includes("radios"));
  assert.ok(fromDataset.length >= 3, JSON.stringify(runs));
  for (const run of fromDataset) {
    assert.equal(run.outside, true, JSON.stringify(run));
  }
  for (const run of runs.filter((each) => !each.text.includes("radios") && !each.text.includes("Tiny") && !each.text.includes("look"))) {
    assert.equal(run.outside, undefined, `the program's own text is not from outside: ${JSON.stringify(run)}`);
  }
});

test("DEC-2326: without an outside prop, or under outside: false, the same text is the program's own", () => {
  for (const outside of [undefined, false]) {
    const runs = lastRuns(datasetPage(outside), 1, PAGE);
    assert.ok(
      runs.some((run) => run.text.includes("radios")),
      JSON.stringify(runs),
    );
    assert.ok(
      runs.every((run) => run.outside === undefined),
      JSON.stringify(runs),
    );
  }
});
