// The Level 2.5 display attributes a page's components ask for as they
// paint, in its local enhancement data (packets X/26) with its controls,
// and DoubleWidth, whose level 1 row reads alone and
// whose double width comes from that data (EN 300 706 Table 26 NOTE 4,
// clause 12.3, Table 29).

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { type Canvas, type Child, Component, DoubleWidth, type Element, h, type Size } from "../src/index.ts";
import { controlTriplet, keptDeclarations, LAST_CONTROL_ROW, setActivePosition, TERMINATION } from "../src/core/controls.ts";
import { DisplayAttribute, displayAttributesTriplet, enhancementTriplets, keptDisplayAttributes } from "../src/core/enhancement.ts";
import { Colour, COLUMNS, englishCodes, SPACE_CODE, textColour } from "../src/kit.ts";
import { BODY_ROW, frame, harness, latestTti, lineTriplets, PAGE, viewer } from "./controls-fixtures.ts";

/** Table 29, column mode 01100: Display attributes. */
const DISPLAY_ATTRIBUTES_MODE = 0b01100;
/** Table 29, Display attributes: D6 is Double Width. */
const DOUBLE_WIDTH_BIT = 1 << 6;
/** Clause 12.3.1: a triplet's mode is bits 7 to 11 (shift 6), its data bits 12 to 18 (shift 11). */
const MODE_AT = 6;
const DATA_AT = 11;
/** Clause 12.3.1: 16 packets X/26 of 13 triplets. */
const LOCAL_TRIPLETS = 16 * 13;
/** Table 26: the spacing attributes with no response at Levels 1 and 1.5: alpha black, double width, double size, mosaics black. */
const LEVEL_25_ONLY = [0x00, 0x0e, 0x0f, 0x10];
/** Table 26 NOTE 4: Double Width must not be in either of a row's last two columns. */
const EDGE_COLUMNS = 2;

/** The display attributes triplet at `column` with `data`, from Table 29 itself. */
const attributes = (column: number, data: number): number => column | (DISPLAY_ATTRIBUTES_MODE << MODE_AT) | (data << DATA_AT);

/** Each sub-page's local enhancement data in `tti`: its OL,26 lines' triplets in designation order, to the first Termination Marker. */
function localData(tti: string): number[][] {
  return tti
    .split(/^(?=PN,)/mu)
    .filter((part) => part.startsWith("PN,"))
    .map((part) => {
      const packets = part
        .split("\n")
        .filter((line) => line.startsWith("OL,26,"))
        .map((line) => ({ designation: (line.codePointAt("OL,26,".length) ?? 0) & 0x3f, triplets: lineTriplets(line) }))
        .toSorted((a, b) => a.designation - b.designation);
      const all = packets.flatMap((packet) => packet.triplets);
      const end = all.indexOf(TERMINATION);
      return end < 0 ? all : all.slice(0, end + 1);
    });
}

/** Declares controls and display attributes where it is told, in page cells (its box is the whole body). */
class Marks extends Component<{ readonly controls: readonly [number, number, number][]; readonly attributes: readonly [number, number, number][] }> {
  override measure(space: Size): Size {
    return space;
  }

  override paint(canvas: Canvas): void {
    for (const [row, column, width] of this.props.controls) {
      canvas.control(row - canvas.box.row, column - canvas.box.column, width);
    }
    for (const [row, column, flags] of this.props.attributes) {
      canvas.displayAttributes(row - canvas.box.row, column - canvas.box.column, flags);
    }
  }
}

/** A sub-page of the test frame round `body`. */
class FrameKeyed extends Component<{ readonly body: Child }> {
  override render(): Child {
    return frame("Test", this.props.body);
  }
}

/** Two sub-pages, each its own body. */
class TwoSubPages extends Component<{ readonly first: Child; readonly second: Child }> {
  override render(): Child {
    return [h(FrameKeyed, { key: "one", body: this.props.first }), h(FrameKeyed, { key: "two", body: this.props.second })];
  }
}

/** The TTI viewer 1 is sent for a page of `root`. */
function published(root: () => Element): string {
  const page = harness([{ page: PAGE, title: "Test", perViewer: true, root }]);
  page.join(1, PAGE);
  assert.deepEqual(page.errors, [], "the channel reported no failure");
  return latestTti(page, PAGE);
}

test("a display attributes triplet is column mode 01100 with its flags as data, Double Width D6 (Table 29)", () => {
  assert.equal(DisplayAttribute.DoubleWidth, DOUBLE_WIDTH_BIT);
  assert.equal(DisplayAttribute.None, 0);
  assert.equal(displayAttributesTriplet(1, DisplayAttribute.DoubleWidth), attributes(1, DOUBLE_WIDTH_BIT));
  assert.equal(displayAttributesTriplet(1, DisplayAttribute.DoubleWidth), 0x20301);
  assert.equal(displayAttributesTriplet(39, DisplayAttribute.None), 0x00327);
});

test("DoubleWidth's level 1 row is its colour and its letters, each followed by a space, with no attribute Level 1 lacks", () => {
  const page = viewer(h(DoubleWidth, { text: "GOAL!", foreground: Colour.Green }));
  const row = page.seen(1, PAGE).rows[BODY_ROW] ?? [];
  for (const code of LEVEL_25_ONLY) {
    assert.ok(!row.includes(code), `no code 0x${code.toString(16).padStart(2, "0")} on the row`);
  }
  const colour = row.indexOf(textColour(Colour.Green));
  assert.ok(colour >= 0, "the colour is drawn");
  assert.deepEqual(row.slice(colour + 1, colour + 1 + "G O A L ! ".length), englishCodes("G O A L ! "), "a Level 1 decoder reads it spaced out");
});

test("DoubleWidth sets Double Width at its first letter and clears it at the cell after its last covered space, in its sub-page's X/26", () => {
  const tti = published(() => frame("Test", h(DoubleWidth, { text: "GOAL!", foreground: Colour.Green })));
  const page = viewer(h(DoubleWidth, { text: "GOAL!", foreground: Colour.Green }));
  const colour = (page.seen(1, PAGE).rows[BODY_ROW] ?? []).indexOf(textColour(Colour.Green));
  const first = colour + 1;
  assert.deepEqual(localData(tti), [
    [setActivePosition(BODY_ROW), attributes(first, DOUBLE_WIDTH_BIT), attributes(first + 2 * "GOAL!".length, 0), TERMINATION],
  ]);
});

test("DoubleWidth fits its text so nothing double width is in the row's last two columns (Table 26 NOTE 4)", () => {
  const long = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const tti = published(() => frame("Test", h(DoubleWidth, { text: long, foreground: Colour.Yellow })));
  const [data = []] = localData(tti);
  const columns = data.slice(1, -1).map((triplet) => triplet & 0x3f);
  assert.equal(columns.length, 2, "a set and a clear");
  const [set = 0, clear = 0] = columns;
  assert.ok(clear - 1 < COLUMNS - EDGE_COLUMNS, `the last double-width cell, ${clear - 1}, is before the last two columns`);
  assert.ok(clear < COLUMNS, "the clear is on the row");
  const page = viewer(h(DoubleWidth, { text: long, foreground: Colour.Yellow }));
  const row = page.seen(1, PAGE).rows[BODY_ROW] ?? [];
  assert.deepEqual(
    row.slice(set, clear).filter((_, at) => at % 2 === 1),
    Array.from({ length: (clear - set) / 2 }, () => SPACE_CODE),
    "every letter is followed by a space for it to cover",
  );
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW), /P \. \. *$/u, "cut short, with the cut mark spaced out too");
});

test("controls and display attributes merge into one list: each row's Set Active Position, then its triplets by column, rows from the top", () => {
  const tti = published(() =>
    frame(
      "Test",
      h(Marks, {
        controls: [
          [10, 20, 5],
          [6, 3, 4],
        ],
        attributes: [
          [10, 25, DOUBLE_WIDTH_BIT],
          [10, 2, DOUBLE_WIDTH_BIT],
          [8, 30, 0],
          [10, 20, 0],
        ],
      }),
    ),
  );
  assert.deepEqual(localData(tti), [
    [
      setActivePosition(6),
      controlTriplet(3, 4, false),
      setActivePosition(8),
      attributes(30, 0),
      setActivePosition(10),
      attributes(2, DOUBLE_WIDTH_BIT),
      controlTriplet(20, 5, false),
      attributes(20, 0),
      attributes(25, DOUBLE_WIDTH_BIT),
      TERMINATION,
    ],
  ]);
});

test("every sub-page carries the display attributes it paints; controls stay on the first", () => {
  const tti = published(() =>
    h(TwoSubPages, {
      first: h(Marks, { controls: [[5, 1, 3]], attributes: [[7, 4, DOUBLE_WIDTH_BIT]] }),
      second: h(Marks, { controls: [[5, 1, 3]], attributes: [[9, 6, DOUBLE_WIDTH_BIT]] }),
    }),
  );
  assert.deepEqual(localData(tti), [
    [setActivePosition(5), controlTriplet(1, 3, false), setActivePosition(7), attributes(4, DOUBLE_WIDTH_BIT), TERMINATION],
    [setActivePosition(9), attributes(6, DOUBLE_WIDTH_BIT), TERMINATION],
  ]);
});

test("display attributes take what the controls leave of the 16 × 13 triplets, a row's all or none, since each acts to the row's end", () => {
  // Every row 1 to 23 asks for 8 attributes: 9 triplets with its Set Active Position, 207 in all, with the Termination Marker 208.
  const everyRow = Array.from({ length: LAST_CONTROL_ROW }, (_, at) =>
    Array.from({ length: 8 }, (__, place) => ({ row: at + 1, column: 4 * place, flags: DOUBLE_WIDTH_BIT })),
  );
  const none = keptDeclarations([]);
  assert.equal(keptDisplayAttributes(none, everyRow.flat()).length, 8 * LAST_CONTROL_ROW, "all fit with nothing else");
  // A control on row 1 takes one triplet more: row 23's attributes no longer fit, and are dropped together.
  const kept = keptDeclarations([{ row: 1, column: 36, width: 3, height: 1 }]);
  const held = keptDisplayAttributes(kept, everyRow.flat());
  assert.equal(held.length, 8 * (LAST_CONTROL_ROW - 1));
  assert.ok(
    held.every((each) => each.row < LAST_CONTROL_ROW),
    "the last row's are all dropped",
  );
  const triplets = enhancementTriplets(kept.controls, held);
  assert.ok(triplets.length <= LOCAL_TRIPLETS, `${triplets.length} triplets fit the local data`);
  assert.equal(triplets.at(-1), TERMINATION);
  assert.equal(triplets[9], controlTriplet(36, 3, false), "row 1's eight attributes come before its control, in column order");
});

test("a page whose components ask for more display attributes than fit sends 16 packets at most, controls whole", () => {
  const all: [number, number, number][] = Array.from({ length: LAST_CONTROL_ROW * 20 }, (_, at) => [
    1 + (at % LAST_CONTROL_ROW),
    2 * Math.floor(at / LAST_CONTROL_ROW),
    DOUBLE_WIDTH_BIT,
  ]);
  const tti = published(() => frame("Test", h(Marks, { controls: [[12, 0, 2]], attributes: all })));
  assert.ok(tti.split("\n").filter((line) => line.startsWith("OL,26,")).length <= 16, "16 packets X/26 at most");
  const [data = []] = localData(tti);
  assert.ok(data.length <= LOCAL_TRIPLETS);
  assert.ok(data.includes(controlTriplet(0, 2, false)), "the control is kept");
});
