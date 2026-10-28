// The graphics and games as a viewer sees them: a wheel that is a true
// ring and lights a segment by its shape, a roulette whose line under the
// article fits the page, snake's sounds to its own player, a paint canvas
// that follows its size, and a map that says what it left unnamed. The
// charts are in fixes-charts-games.test.ts.

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Article, type Child, Component, FULL_BLOCK, h, MapMarkers, PaintCanvas, Roulette, Snake, tone, Wheel } from "../src/index.ts";
import { Colour, COLUMNS, Key, mosaicColour } from "../src/kit.ts";
import { BODY_ROW, PAGE } from "./components-fixtures.ts";
import { codesOf, rowText, viewer } from "./charts-more-fixtures.ts";

/** A wheel's rows: its radius of five either side of its middle row. */
const WHEEL_ROWS = 11;

/** A wheel's segment as it is drawn: its row, its colour's cell, and its two cells' codes. */
interface Segment {
  readonly row: number;
  readonly column: number;
  readonly colour: number;
  readonly codes: readonly number[];
}

/** The segments of the wheel on `seen`'s page, found by their colours' cells. */
function segmentsOf(seen: ReturnType<typeof viewer>): Segment[] {
  return Array.from({ length: WHEEL_ROWS }, (_, offset) => offset).flatMap((offset) => {
    const codes = codesOf(seen, BODY_ROW + offset);
    return codes.flatMap((code, column) =>
      code > mosaicColour(Colour.Black) && code <= mosaicColour(Colour.White)
        ? [{ row: offset, column, colour: code, codes: codes.slice(column + 1, column + 3) }]
        : [],
    );
  });
}

test("a wheel's ring is the same each side of its middle, across and down, though cos 240 degrees is not -cos 60 in floating point", () => {
  const segments = segmentsOf(viewer(h(Wheel, { lit: 0 })));
  assert.equal(segments.length, 12);
  const rows = segments.map((segment) => segment.row);
  const columns = segments.map((segment) => segment.column);
  const [middleRow, middleColumn] = [Math.min(...rows) + Math.max(...rows), Math.min(...columns) + Math.max(...columns)];
  const places = new Set(segments.map((segment) => `${segment.row},${segment.column}`));
  for (const segment of segments) {
    assert.ok(places.has(`${middleRow - segment.row},${segment.column}`), `${segment.row},${segment.column} has its twin up or down`);
    assert.ok(places.has(`${segment.row},${middleColumn - segment.column}`), `${segment.row},${segment.column} has its twin across`);
  }
});

test("a wheel's lit segment is told by its shape as well as its colour", () => {
  for (const lit of [0, 4, 7]) {
    const segments = segmentsOf(viewer(h(Wheel, { lit })));
    const shining = segments.filter((segment) => segment.colour === mosaicColour(Colour.White));
    assert.equal(shining.length, 1, "one segment lit");
    const [litShape] = shining.map((segment) => segment.codes.join(" "));
    const others = segments.filter((segment) => segment.colour !== mosaicColour(Colour.White)).map((segment) => segment.codes.join(" "));
    assert.ok(!others.includes(litShape ?? ""), `segment ${lit}'s shape, ${litShape ?? ""}, is its own`);
    assert.ok(
      others.every((shape) => shape === `${FULL_BLOCK} ${FULL_BLOCK}`),
      "the others solid",
    );
  }
});

const ARTICLES: Article[] = ["Storm closes the coast road", "Village wins best-kept prize"].map((title, index) => ({
  page: 0x201 + index,
  title,
  writer: "News desk",
  date: 0,
  blocks: [],
  tags: [],
}));

test("a roulette stopped on an article says what to do next in full, within the page's forty cells", () => {
  const seen = viewer(h(Roulette, { articles: ARTICLES }));
  seen.press(1, Key.Enter);
  seen.runUntil(10_000);
  const rows = Array.from({ length: 20 }, (_, offset) => rowText(seen, BODY_ROW + offset));
  const next = rows.find((row) => row.includes("reads it"));
  assert.ok(next !== undefined, "the line under the article");
  assert.match(next, /Space/u);
  assert.doesNotMatch(next, /\.\./u, "not cut");
});

test("snake plays its crash to its own player, not to every viewer with the page open", () => {
  const crash = { name: "crash", samples: tone(200, 50) };
  const seen = viewer(h(Snake, { everyMs: 100, rows: 10, crash }));
  seen.join(2, PAGE);
  // Up from the field's middle row, viewer 1's snake is in the top wall in some sixteen frames; viewer 2's, heading right, has some sixty.
  seen.press(1, Key.Up);
  seen.runUntil(3_000);
  assert.match(rowText(seen, BODY_ROW + 10), /crashed/u, "viewer 1's snake crashed");
  assert.ok(seen.sounds(1).length > 0, "viewer 1 hears it");
  assert.deepEqual(seen.sounds(2), [], "viewer 2, still playing, hears nothing");
});

/** When the paint canvas grows. */
const GROW_MS = 100;

/** A paint canvas that grows after a while, as a page may give it more room. */
class Growing extends Component<object, { readonly columns: number; readonly rows: number }> {
  override state = { columns: 5, rows: 2 };

  override componentDidMount(): void {
    this.setTimeout(() => {
      this.setState({ columns: 20, rows: 4 });
    }, GROW_MS);
  }

  override render(): Child {
    return h(PaintCanvas, { columns: this.state.columns, rows: this.state.rows });
  }
}

test("a paint canvas given more columns and rows paints in them, and keeps what was painted", () => {
  const seen = viewer(h(Growing, {}));
  seen.clickLeft(1, 2, BODY_ROW);
  seen.runUntil(GROW_MS);
  seen.clickLeft(1, 15, BODY_ROW + 3);
  assert.equal(codesOf(seen, BODY_ROW)[2], FULL_BLOCK, "the cell painted before it grew");
  assert.equal(codesOf(seen, BODY_ROW + 3)[15], FULL_BLOCK, "a cell it grew into");
  assert.ok(codesOf(seen, BODY_ROW).length <= COLUMNS);
});

test("a map says how many places it marked without their names, for want of room", () => {
  const land = Array.from({ length: 30 }, () => "#".repeat(78));
  const seen = viewer(
    h(MapMarkers, {
      map: { bitmap: land },
      bounds: { north: 10, south: 0, west: 0, east: 39 },
      places: [
        { name: "Alpha", latitude: 5.5, longitude: 10.5 },
        // To its right is Alpha's name, and to its left too little room.
        { name: "Longname", latitude: 5.5, longitude: 7.5 },
        { name: "Crowd", latitude: 5.5, longitude: 10.5 },
      ],
    }),
  );
  assert.match(rowText(seen, BODY_ROW + 4), /<yellow>\*<mosaic green><yellow>\*Alpha/u, "Longname's mark alone, then Alpha's with its name");
  assert.match(rowText(seen, BODY_ROW + 10), /2 places, 1 unnamed, 1 crowded out/u);
});
