// The controls, pointer areas and rollover colours a page declares, as
// X/26 and X/28 packets in its TTI (INPUT.md section 7.3).

import assert from "node:assert/strict";
import { test } from "node:test";

import { type ColourTable, readControls, readDeclarations, ROLLOVER_COLOURS, rolloverLine } from "../src/index.ts";
import {
  controlLines,
  controlTriplet,
  controlTriplets,
  enhancementLines,
  keptControls,
  keptDeclarations,
  MAX_CONTROLS,
  MAX_POINTER_AREAS,
  pointerAreaTriplet,
  setActivePosition,
  TERMINATION,
  WHOLE_PAGE_POINTER_AREA,
} from "../src/core/controls.ts";
import { LEVEL_1_COLOURS } from "../src/core/rollover.ts";
import { lines, lineTriplets, streamBits } from "./controls-fixtures.ts";

test("the triplets are INPUT.md section 7.3's: four buttons on row 20, nine cells each, and the Termination Marker", () => {
  assert.equal(setActivePosition(20), 0x0013c);
  assert.equal(controlTriplet(1, 9, false), 0x04941);
  assert.equal(controlTriplet(11, 9, false), 0x0494b);
  assert.equal(controlTriplet(21, 9, false), 0x04955);
  assert.equal(controlTriplet(31, 9, false), 0x0495f);
  assert.equal(controlTriplet(2, 21, true), 0x2a942, "D6 joins it to the run above");
  assert.equal(TERMINATION, 0x03fff);
});

test("an X/26 packet is an OL,26 line: its designation code, then thirteen triplets of three characters, six bits each, the least significant first", () => {
  const [line, ...more] = enhancementLines([setActivePosition(20), TERMINATION]);
  assert.deepEqual(more, []);
  assert.ok(line !== undefined);
  const body = line.slice("OL,26,".length);
  assert.ok(line.startsWith("OL,26,"));
  assert.equal(body.length, 1 + 13 * 3);
  assert.equal(body[0], "@", "designation code 0");
  // 0x0013C: 0x3C, 0x04, 0x00, each with bit 6 set.
  assert.equal(body.slice(1, 4), "|D@");
  // 0x03FFF: 0x3F, 0x3F, 0x03; the rest of the packet is Termination Markers too.
  assert.equal(body.slice(4), "\u007F\u007FC".repeat(12));
  assert.deepEqual(
    enhancementLines(Array.from({ length: 14 }, () => TERMINATION)).map((each) => each.slice(0, 7)),
    ["OL,26,@", "OL,26,A"],
    "fourteen triplets take two packets, designation codes 0 and 1",
  );
});

test("a page keeps the controls declared in rows 1 to 23 and the page's columns, the first of two that overlap, and 32 at most", () => {
  const kept = keptControls([
    { row: 0, column: 0, width: 5, height: 2 },
    { row: 5, column: 38, width: 5, height: 1 },
    { row: 5, column: 0, width: 4, height: 1 },
    { row: 5, column: 3, width: 4, height: 1 },
    { row: 24, column: 0, width: 4, height: 1 },
    { row: 6, column: 0, width: 0, height: 1 },
  ]);
  assert.deepEqual(kept, [
    { row: 1, column: 0, width: 5, height: 1 },
    { row: 5, column: 38, width: 2, height: 1 },
    { row: 5, column: 0, width: 4, height: 1 },
  ]);
  const many = Array.from({ length: 40 }, (_, index) => ({ row: 1 + (index % 20), column: Math.floor(index / 20) * 10, width: 9, height: 1 }));
  assert.equal(keptControls(many).length, MAX_CONTROLS);
});

test("each row's runs follow its Set Active Position triplet, left to right; a taller control's rows below are joined; the data ends with the Termination Marker", () => {
  assert.equal(lines.length, 1);
  assert.deepEqual(readControls(`PN,15000\n${lines.join("\n")}\n`), [
    [
      { row: 4, column: 2, width: 6, height: 1 },
      { row: 4, column: 20, width: 10, height: 2 },
    ],
  ]);
  assert.deepEqual(controlLines([]), [], "no controls, no packet");
});

test("a pointer area's triplet is the control's shape in column mode 01010, and one of width 0, not joined, is the whole page", () => {
  const MODE = 0b01010;
  assert.equal(pointerAreaTriplet(1, 38, false), 1 | (MODE << 6) | (38 << 11));
  assert.equal(pointerAreaTriplet(1, 38, false), 0x13281);
  assert.equal(pointerAreaTriplet(1, 38, true), 1 | (MODE << 6) | ((0x40 | 38) << 11), "D6 joins it to the area above");
  assert.equal(pointerAreaTriplet(1, 38, true), 0x33281);
  // Address 0 and data 0: the mode alone.
  assert.equal(WHOLE_PAGE_POINTER_AREA, MODE << 6);
  assert.equal(WHOLE_PAGE_POINTER_AREA, 0x00280);
});

test("the whole page's area comes first; each row's controls and areas follow its Set Active Position left to right, joined below; read back as the engine reads them", () => {
  const controls = [{ row: 4, column: 20, width: 10, height: 1 }];
  const pointer = {
    areas: [
      { row: 4, column: 2, width: 6, height: 2 },
      { row: 4, column: 2, width: 6, height: 1 },
    ],
    wholePage: true,
  };
  assert.deepEqual(controlTriplets(controls, pointer), [
    WHOLE_PAGE_POINTER_AREA,
    setActivePosition(4),
    0x03282,
    0x03282,
    0x05154,
    setActivePosition(5),
    0x23282,
    TERMINATION,
  ]);
  assert.deepEqual(controlTriplet(20, 10, false), 0x05154);
  assert.deepEqual(
    readDeclarations(`PN,15000\n${controlLines(controls, pointer).join("\n")}\n`),
    [{ controls, pointer }],
    "areas may overlap each other and the controls",
  );
  assert.deepEqual(controlLines([], { areas: [], wholePage: false }), [], "nothing, no packet");
});

test("a page keeps eight pointer areas, overlapping as they may, cut to rows 1 to 23 and its columns; the controls take the local data first", () => {
  const areas = Array.from({ length: 10 }, (_, index) => ({ row: 5, column: index, width: 4, height: 1 }));
  assert.equal(keptDeclarations([], { areas, wholePage: false }).pointer.areas.length, MAX_POINTER_AREAS);
  assert.deepEqual(
    keptDeclarations([], {
      areas: [
        { row: 0, column: 0, width: 5, height: 2 },
        { row: 6, column: 38, width: 5, height: 1 },
        { row: 7, column: 0, width: 0, height: 1 },
        { row: 24, column: 0, width: 5, height: 1 },
      ],
      wholePage: false,
    }).pointer.areas,
    [
      { row: 1, column: 0, width: 5, height: 1 },
      { row: 6, column: 38, width: 2, height: 1 },
    ],
  );
  // 32 controls six rows tall take 192 triplets, their rows' Set Active Positions 6 and the Termination Marker 1: 199 of 208.
  const tall = Array.from({ length: MAX_CONTROLS }, (_, index) => ({ row: 1, column: index, width: 1, height: 6 }));
  const held = keptDeclarations(tall, {
    areas: [
      { row: 1, column: 0, width: 40, height: 5 },
      { row: 1, column: 0, width: 40, height: 3 },
      { row: 1, column: 0, width: 40, height: 1 },
    ],
    wholePage: true,
  });
  assert.equal(held.controls.length, MAX_CONTROLS);
  assert.equal(held.pointer.wholePage, true, "the whole page's triplet: 200");
  assert.deepEqual(
    held.pointer.areas.map((area) => area.height),
    [5, 3],
    "205, then 208; the third has no room",
  );
  assert.equal(enhancementLines(controlTriplets(held.controls, held.pointer)).length, 16, "every packet X/26 a page has");
});

test("the rollover packet is X/28/0 format 1 (Table 4): a basic English page, CLUT 2 the Level 1 colours, CLUT 3 the rollover colours, re-mapping 6", () => {
  const line = rolloverLine();
  assert.ok(line.startsWith("OL,28,@"), "packet 28, designation code 0");
  const triplets = lineTriplets(line);
  assert.equal(triplets[0], 0xf << 14, "page function and coding 0, default designation Latin English, the second G0 set's low bits 1111");
  assert.equal(triplets[1]! & 0x3ff, 0x7, "the second G0 set's high bits 111 (none), no side panels");
  const words = Array.from({ length: 16 }, (_, index) => streamBits(triplets, 28 + 12 * index, 12)).map(
    (word) => ((word & 0xf) << 8) | (word & 0xf0) | ((word >> 8) & 0xf),
  );
  assert.deepEqual(words, [...LEVEL_1_COLOURS, ...ROLLOVER_COLOURS]);
  assert.equal((triplets[12]! >> 4) & 0x7ff, 0, "screen and row colour 0, no substitution");
  assert.equal((triplets[12]! >> 15) & 0x7, 6, "re-mapping: foreground and background CLUT 2");
  const own: ColourTable = [0x111, 0x222, 0x333, 0x444, 0x555, 0x666, 0x777, 0x888];
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) => streamBits(lineTriplets(rolloverLine(own)), 28 + 12 * (8 + index), 12)),
    own.map((colour) => ((colour & 0xf) << 8) | (colour & 0xf0) | ((colour >> 8) & 0xf)),
    "a page's own colours in CLUT 3",
  );
});
