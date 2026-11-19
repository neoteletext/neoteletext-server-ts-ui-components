// REQ-6774, renderer parity PAR-42, DEC-6849: on the teletext raster a
// NAPLPS picture's cell is 12 dots by 20 lines, row r on lines 20r to
// 20r + 19 and column c on dots 12c to 12c + 11. The kit writes coordinates
// at four-byte precision (ANSI X3.110-1983 section 5.3.2.2.3, Table 5), a
// step of 0.234 dots and 0.289 raster lines, and the painter writes each
// fill from its first pixel's centre to its last's, so cells tile exactly:
// drawn by the server's renderer, every pixel of every blank cell of every
// NAPLPS catalogue page is one colour, its own background's. That reads
// every boundary of every row and column where a blank cell lies, between
// two cells of one drawing (the stream, or one object) and between two
// drawings (an object's exact rectangle, ANIM-11 and DEC-6829, and the
// stream or another object), the raster's last dot, 479, included: a fill
// that fell short leaves a line or dot of what lies beneath, and one that
// reached too far paints its colour into the cell next to it. The server
// is another repository's program: without it named by TELETEXT_SERVER
// this test is skipped, saying so.

import assert from "node:assert/strict";
import { test } from "node:test";

import { COLUMNS, FIRST_TEXT_ROW, LAST_TEXT_ROW, RASTER_CELL_DOTS, RASTER_ROW_LINES } from "../src/picture/grid.ts";
import type { PictureScene } from "../src/picture/scene.ts";
import { pictureExamples } from "./picture-goldens.ts";
import { drawPictures, pictureServer } from "./picture-server.ts";
import { type Pixels, readPng } from "./png.ts";

const server = pictureServer();
/** The raster's last dot, which three-byte coordinates never reached (TODO-6846). */
const LAST_DOT = COLUMNS * RASTER_CELL_DOTS - 1;
/** The fewest boundaries of each kind the catalogue must exercise, so that the test reads what it says it reads. */
const LEAST_BOUNDARIES = 100;

/** A cell's neighbours' offsets, each way. */
const NEXT_TO = [-1, 0, 1] as const;

/**
 * A blank cell: a space in its background alone, neither half of double height, nor the caret's cell, which the
 * caret's bar draws over, nor beside text, since a provided glyph may be drawn wider than its 12-dot field and reach
 * into the cell next to it, which is the font's, not the tiling's.
 */
function blank(scene: PictureScene, row: number, column: number): boolean {
  const cell = scene.cells[row]?.[column];
  const caret = scene.cursor !== null && scene.cursor.row === row && scene.cursor.column === column;
  const besideText = NEXT_TO.some((down) => NEXT_TO.some((across) => scene.cells[row + down]?.[column + across]?.content.kind === "text"));
  return cell !== undefined && cell.content.kind === "space" && !cell.covered && !cell.tall && !cell.doubleHeight && !caret && !besideText;
}

/** The pixels of the cell at `row`, `column` that are not the colour of its first, as "dot,line". */
function strayPixels(pixels: Pixels, row: number, column: number): string[] {
  const [left, top] = [RASTER_CELL_DOTS * column, RASTER_ROW_LINES * row];
  const colour = pixels.at(left, top);
  const stray: string[] = [];
  for (let line = top; line < top + RASTER_ROW_LINES; line += 1) {
    for (let dot = left; dot < left + RASTER_CELL_DOTS; dot += 1) {
      if (pixels.at(dot, line) !== colour) {
        stray.push(`${String(dot)},${String(line)}`);
      }
    }
  }
  return stray;
}

/** The numbers of the macro objects among a picture's messages: the drawings beside the stream. */
function macroObjects(messages: readonly Record<string, unknown>[]): Set<number> {
  const numbers = new Set<number>();
  for (const message of messages) {
    const objects: unknown = message["objects"];
    if (message["type"] !== "naplps_objects" || !Array.isArray(objects)) {
      continue;
    }
    const list: unknown[] = objects;
    for (const object of list) {
      if (
        typeof object === "object" &&
        object !== null &&
        "kind" in object &&
        object.kind === "macro" &&
        "number" in object &&
        typeof object.number === "number"
      ) {
        numbers.add(object.number);
      }
    }
  }
  return numbers;
}

/** How many boundaries blank cells have with their neighbours on the page, of one drawing and of two, and how many lie on the last dot. */
interface Boundaries {
  oneDrawing: number;
  twoDrawings: number;
  lastDot: number;
}

/** Counts the boundaries of the blank cell at `row`, `column` with the cells beside it. */
function countBoundaries(scene: PictureScene, objects: ReadonlySet<number>, row: number, column: number, counts: Boundaries): void {
  const drawing = (down: number, across: number): number => {
    const owner = scene.owners[down]?.[across] ?? 0;
    return objects.has(owner) ? owner : 0;
  };
  for (const [down, across] of [
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ] as const) {
    if (down >= FIRST_TEXT_ROW && down <= LAST_TEXT_ROW && across >= 0 && across < COLUMNS) {
      if (drawing(down, across) === drawing(row, column)) {
        counts.oneDrawing += 1;
      } else {
        counts.twoDrawings += 1;
      }
    }
  }
  if (RASTER_CELL_DOTS * (column + 1) - 1 === LAST_DOT) {
    counts.lastDot += 1;
  }
}

test(
  "every pixel of every blank NAPLPS cell is one colour: cells meet exactly in one drawing and between two, to the raster's last dot",
  { skip: server === null ? "needs TELETEXT_SERVER, neoteletext-app-server's teletext-server at PICTURE_SERVER (picture-server.ts)" : false },
  async () => {
    const examples = pictureExamples().filter((example) => example.renderer === "naplps");
    const drawn = await drawPictures(server ?? "", examples);
    const counts: Boundaries = { oneDrawing: 0, twoDrawings: 0, lastDot: 0 };
    const stray = examples.flatMap((example) => {
      const png = drawn.get(`naplps/${example.name}`);
      const { scene } = example;
      assert.ok(png !== undefined && scene !== undefined, `the server drew ${example.name}`);
      const pixels = readPng(png);
      const objects = macroObjects(example.messages);
      const found: string[] = [];
      for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          if (blank(scene, row, column)) {
            countBoundaries(scene, objects, row, column, counts);
            const off = strayPixels(pixels, row, column);
            if (off.length > 0) {
              found.push(
                `${example.name}: row ${String(row)}, column ${String(column)}: ${off.slice(0, 4).join(" ")}${off.length > 4 ? ` and ${String(off.length - 4)} more` : ""}`,
              );
            }
          }
        }
      }
      return found;
    });
    assert.deepEqual(stray, [], "blank cells with a pixel of another colour");
    for (const [kind, count] of Object.entries(counts)) {
      assert.ok(
        count >= LEAST_BOUNDARIES,
        `the catalogue's blank cells meet ${String(count)} boundaries of kind ${kind}, fewer than ${String(LEAST_BOUNDARIES)}`,
      );
    }
    process.stdout.write(`# boundaries read: ${JSON.stringify(counts)}\n`);
  },
);
