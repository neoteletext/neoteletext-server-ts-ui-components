// Places on a map and a bracket of rounds as they draw: names beside their
// marks and never over each other, places left out and counted, and a
// bracket's window of rounds and matches moved by the keys and a click.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Bracket, type BracketRound, FULL_BLOCK, h, MapMarkers } from "../src/index.ts";
import { Attribute, Colour, COLUMNS, englishCodes, Key, mosaicColour, Screen, textColour } from "../src/kit.ts";
import { BODY_ROW } from "./components-fixtures.ts";
import { codesOf, readable, rowText, viewer } from "./charts-more-fixtures.ts";

/** The hint row, under the body. */
const HINT_ROW = 23;
/** The heading's arrows as a row holds them: the English set has arrows of its own (EN 300 706 Table 36). */
const LEFT_ARROW = readable(englishCodes("←"));
const RIGHT_ARROW = readable(englishCodes("→"));

/** Land everywhere: 39 cells by 10 rows of sixels, so a degree of longitude is a cell and a degree of latitude a row. */
const LAND = Array.from({ length: 30 }, () => "#".repeat(78));
const BOUNDS = { north: 10, south: 0, west: 0, east: 39 };
/** The row of a latitude of 5.5 degrees: 4.5 degrees down from the top. */
const ROW_AT_5_5 = BODY_ROW + 4;
/** The row under the map's ten. */
const STATUS_ROW = BODY_ROW + 10;

test("a map's places are marked and named beside them, to the right, else to the left, never over each other", () => {
  const seen = viewer(
    h(MapMarkers, {
      map: { bitmap: LAND },
      bounds: BOUNDS,
      places: [
        { name: "Alpha", latitude: 5.5, longitude: 10.5 },
        { name: "Beta", latitude: 5.5, longitude: 7.5 },
        { name: "East", latitude: 5.5, longitude: 39 },
        { name: "Crowd", latitude: 5.5, longitude: 10.5 },
      ],
    }),
  );
  const codes = codesOf(seen, ROW_AT_5_5);
  // Alpha's cell is the eleventh of the map, column 11, after the map's colour: its name to the right, then the map's colour again.
  assert.deepEqual(codes.slice(10, 18), [textColour(Colour.Yellow), ...englishCodes("*Alpha"), mosaicColour(Colour.Green)]);
  assert.deepEqual(codes.slice(3, 10), [textColour(Colour.Yellow), ...englishCodes("Beta*"), mosaicColour(Colour.Green)], "Beta's name would run into Alpha's");
  assert.deepEqual(codes.slice(34, 40), [textColour(Colour.Yellow), ...englishCodes("East*")], "East's name would run off the box");
  assert.match(rowText(seen, STATUS_ROW), /3 places, 1 crowded out/u);
});

test("a map leaves out the places outside its bounds, or not at a place at all, and says how many", () => {
  const seen = viewer(
    h(MapMarkers, {
      map: { bitmap: LAND },
      bounds: BOUNDS,
      places: [
        { name: "In", latitude: 1, longitude: 1 },
        { name: "North", latitude: 11, longitude: 1 },
        { name: "West", latitude: 1, longitude: -1 },
        { name: "Nowhere", latitude: Number.NaN, longitude: 1 },
      ],
    }),
  );
  assert.match(rowText(seen, STATUS_ROW), /1 place, 3 off the map/u);
  const unusable = viewer(h(MapMarkers, { map: { bitmap: LAND }, bounds: { ...BOUNDS, north: -1 }, places: [{ name: "In", latitude: 1, longitude: 1 }] }));
  assert.match(rowText(unusable, STATUS_ROW), /0 places, 1 off the map/u, "bounds north of nothing make no map");
});

test("a picture's map gets its own colour back after a name, and a name never covers its other attributes", () => {
  const screen = new Screen();
  screen.codes(1, 0, [
    mosaicColour(Colour.Blue),
    ...Array.from({ length: 19 }, () => FULL_BLOCK),
    textColour(Colour.Cyan),
    ...englishCodes("sea and more sea"),
  ]);
  screen.codes(2, 0, [textColour(Colour.Red), ...englishCodes("abcd"), textColour(Colour.Green), Attribute.NewBackground, ...englishCodes("efgh")]);
  const seen = viewer(
    h(MapMarkers, {
      map: { tti: screen.toTti(0x100, 0), firstRow: 1 },
      // A degree a row of the picture's 24 after its header, and a degree a cell.
      bounds: { north: 24, south: 0, west: 0, east: COLUMNS },
      places: [
        { name: "Port", latitude: 23.5, longitude: 25 },
        { name: "Isle", latitude: 22.5, longitude: 2 },
      ],
    }),
  );
  assert.deepEqual(codesOf(seen, BODY_ROW).slice(24, 31), [textColour(Colour.Yellow), ...englishCodes("*Port"), textColour(Colour.Cyan)]);
  // To the right Isle's name would cover New Background; it has no room to the left, so its mark stands alone.
  assert.deepEqual(codesOf(seen, BODY_ROW + 1).slice(1, 4), [textColour(Colour.Yellow), ...englishCodes("*"), textColour(Colour.Red)]);
});

const match = (top: string, bottom: string, winner?: 0 | 1): BracketRound["matches"][number] => ({
  entrants: [top, bottom],
  scores: [2, 1],
  ...(winner === undefined ? {} : { winner }),
});

const ROUNDS: readonly BracketRound[] = [
  {
    name: "Quarters",
    matches: [match("Ajax", "Bayern", 0), match("Celtic", "Dynamo", 1), match("Everton", "Fiorentina", 0), match("Galatasaray", "Hajduk", 1)],
  },
  { name: "Semis", matches: [match("Ajax", "Dynamo", 0), match("Everton", "Hajduk")] },
  { name: "Final", matches: [{ entrants: ["Ajax", ""] }] },
];

/** The cells of a round's column, when not given. */
const ROUND_CELLS = 13;

/** The round `round`'s column of `row`, readable. */
function roundText(seen: ReturnType<typeof viewer>, row: number, round: number): string {
  return readable(codesOf(seen, row).slice(round * ROUND_CELLS, (round + 1) * ROUND_CELLS));
}

test("a bracket lays its rounds out in columns, each match level with the middle of the two it follows, the winner marked", () => {
  const seen = viewer(h(Bracket, { rounds: ROUNDS }));
  assert.match(rowText(seen, BODY_ROW), /^<cyan>Quarters +<cyan>Semis +<cyan>Final/u);
  assert.match(roundText(seen, BODY_ROW + 1, 0), /^<yellow>\*Ajax +2$/u, "the winner marked, and in yellow");
  assert.match(roundText(seen, BODY_ROW + 2, 0), /^<white> Bayern +1$/u);
  assert.match(roundText(seen, BODY_ROW + 2, 1), /^<yellow>\*Ajax +2$/u, "a semi-final on the rows between its quarter-finals");
  assert.match(roundText(seen, BODY_ROW + 3, 1), /^<white> Dynamo +1$/u);
  assert.match(roundText(seen, BODY_ROW + 5, 2), /^<white> Ajax/u, "the final between the semi-finals");
  assert.match(roundText(seen, BODY_ROW + 6, 2), /^<white> tbd/u, "an entrant not yet known");
});

test("a bracket too wide for its box shows a window of rounds that Left and Right, or a click on its arrows, move", () => {
  const seen = viewer(h(Bracket, { rounds: ROUNDS, roundCells: 20 }));
  assert.match(rowText(seen, BODY_ROW), /^<cyan>Quarters +<cyan>Semis +/u);
  assert.ok(rowText(seen, BODY_ROW).endsWith(RIGHT_ARROW), "an arrow says there are rounds to the right");
  assert.match(rowText(seen, HINT_ROW), /Left Right rounds/u);
  seen.press(1, Key.Right);
  assert.ok(rowText(seen, BODY_ROW).startsWith(`<cyan>${LEFT_ARROW} Semis`), "and now to the left");
  assert.match(rowText(seen, BODY_ROW), /<cyan>Final *$/u);
  assert.match(rowText(seen, BODY_ROW + 1), /^<yellow>\*Ajax/u, "the semi-finals now three rows a match from the top");
  seen.press(1, Key.Right);
  assert.ok(rowText(seen, BODY_ROW).startsWith(`<cyan>${LEFT_ARROW} Semis`), "no further than the last round");
  seen.clickLeft(1, 1, BODY_ROW);
  assert.match(rowText(seen, BODY_ROW), /^<cyan>Quarters/u, "the arrow goes back a round");
});

test("a bracket taller than its box scrolls with Up and Down a match at a time", () => {
  const firsts = Array.from({ length: 8 }, (_, index) => match(`top ${index}`, `bottom ${index}`));
  const seen = viewer(h(Bracket, { rounds: [{ name: "First", matches: firsts }] }));
  assert.match(rowText(seen, BODY_ROW + 1), /top 0/u);
  seen.press(1, Key.Down);
  assert.match(rowText(seen, BODY_ROW + 1), /top 1/u);
  seen.press(1, Key.Up);
  assert.match(rowText(seen, BODY_ROW + 1), /top 0/u);
});

test("a disabled bracket takes no keys and declares no arrows", () => {
  const seen = viewer(h(Bracket, { rounds: ROUNDS, roundCells: 20, disabled: true }));
  seen.press(1, Key.Right);
  assert.match(rowText(seen, BODY_ROW), /^<blue>Quarters/u, "its headings dimmed, and the rounds where they were");
});
