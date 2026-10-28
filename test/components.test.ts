// The library's components as they draw: dates, centred stacks, lists
// and buttons.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { Button, Centred, ChoiceList, Columns, DATE_FORMATS, DateText, type Element, formatDate, h, Text } from "../src/index.ts";
import { PAGE, BODY_ROW, frame, harness, middle, Chooser } from "./components-fixtures.ts";

test("a date is written in its pattern's tokens, UTC, whatever form it comes in", () => {
  const moment = Date.UTC(2026, 9, 7, 14, 5, 9);
  assert.equal(formatDate(moment, DATE_FORMATS.short), "07 Oct 26");
  assert.equal(formatDate(moment, DATE_FORMATS.long), "07 Oct 2026");
  assert.equal(formatDate(moment, DATE_FORMATS.numeric), "07.10.26");
  assert.equal(formatDate(moment, DATE_FORMATS.iso), "2026-10-07");
  assert.equal(formatDate(moment, DATE_FORMATS.stamp), "Wed 07 Oct 14:05");
  assert.equal(formatDate(moment, DATE_FORMATS.month), "October 2026");
  assert.equal(formatDate(moment, DATE_FORMATS.seconds), "14:05:09");
  assert.equal(formatDate(moment, "dddd D M [at] H"), "Wednesday 7 10 at 14", "unpadded tokens, and text in brackets kept");
  assert.equal(formatDate(new Date(moment), "DD MMM YYYY"), "07 Oct 2026", "a Date");
  assert.equal(formatDate("2021-07-16", DATE_FORMATS.long), "16 Jul 2021", "a calendar day is that day, not midnight elsewhere");
  assert.equal(formatDate("2026-10-07 23:30:00", DATE_FORMATS.stamp), "Wed 07 Oct 23:30", "a time with no zone is UTC");
  assert.equal(formatDate("2026-10-07T23:30:00+10:00", DATE_FORMATS.stamp), "Wed 07 Oct 13:30", "a zone given is taken");
  assert.equal(formatDate("not a date", DATE_FORMATS.long), "");
  assert.equal(formatDate(Number.NaN, DATE_FORMATS.long, "undated"), "undated");
});

test("a date component shows its date in its colour, or its fallback", () => {
  const seen = harness([
    { page: PAGE, title: "Test", root: (): Element => frame("Dates", h(DateText, { value: "2021-07-16" }), h(DateText, { value: "", fallback: "no date" })) },
  ]);
  seen.join(1, PAGE);
  // oxlint-disable-next-line eslint/no-control-regex -- a teletext row holds its colour codes; the test reads them
  assert.match(text(seen.seen(1, PAGE).rows, BODY_ROW), /^\u000716 Jul 2021 *$/u, "after its colour, white");
  assert.match(text(seen.seen(1, PAGE).rows, BODY_ROW + 1), /no date/u);
});

test("a centred stack puts each child in the middle of the width at its own size", () => {
  const seen = harness([
    { page: PAGE, title: "Test", root: (): Element => frame("Centred", h(Centred, {}, h(Text, { text: "ab" }), h(Text, { text: "abcdef" }))) },
  ]);
  seen.join(1, PAGE);
  const rows = seen.seen(1, PAGE).rows;
  const short = text(rows, BODY_ROW);
  const long = text(rows, BODY_ROW + 1);
  assert.ok(Math.abs(middle(short, "ab") - middle(long, "abcdef")) <= 1, `${JSON.stringify(short)} over ${JSON.stringify(long)}`);
  assert.ok(short.indexOf("ab") > 10, "not at the left");
});

test("a click on a list's item moves its band there, so what shows beside the list and its buttons act on that item", () => {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: (): Element => frame("Choose", h(Chooser, {})) }]);
  seen.join(1, PAGE);
  seen.clickLeft(1, 5, BODY_ROW + 2);
  assert.match(text(seen.own(1, PAGE), BODY_ROW + 3), /showing third/u);
  seen.clickLeft(1, 3, BODY_ROW + 4);
  assert.match(text(seen.own(1, PAGE), BODY_ROW + 5), /acted on third/u);
});

test("a list's rows hold components: each item drawn by what the list's user gives, in the row's look", () => {
  const items = [{ name: "Launch", day: "2021-07-16" }];
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element =>
        frame(
          "Rows",
          h(ChoiceList<{ name: string; day: string }>, {
            items,
            shown: 1,
            render: (item, look) =>
              h(
                Columns,
                { widths: [10, null] },
                h(Text, { text: item.name, foreground: look.foreground }),
                h(DateText, { value: item.day, foreground: look.foreground }),
              ),
            onChoose: () => {},
          }),
        ),
    },
  ]);
  seen.join(1, PAGE);
  assert.match(text(seen.seen(1, PAGE).rows, BODY_ROW), /Launch +.16 Jul 2021/u);
});

test("a button fits its label with a cell each side, or its padding, or a width given, its label centred in it", () => {
  assert.equal(Button.widthOf("stop"), 10, "band, foreground, a space, four letters, a space, the cell after");
  assert.equal(Button.widthOf("stop", 2, 3), 13);
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element => frame("Buttons", h(Button, { label: "go", width: 12, onPress: () => {} }), h(Button, { label: "go", onPress: () => {} })),
    },
  ]);
  seen.join(1, PAGE);
  const fixed = text(seen.seen(1, PAGE).rows, BODY_ROW);
  assert.equal(fixed.indexOf("go"), 6, `centred in 8 cells of room after its band: ${JSON.stringify(fixed)}`);
});
