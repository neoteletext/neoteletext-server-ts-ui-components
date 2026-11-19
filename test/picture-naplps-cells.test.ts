// REQ-6774, renderer parity PAR-42, neoteletext-common docs/naplps-raster.md
// RAS-7: a NAPLPS picture's cell is the teletext raster's 12 dots by 20
// lines, row r on lines 20r to 20r + 19 and column c on dots 12c to
// 12c + 11, written as those dots by the kit's `rect` at six-byte precision
// (RAS-6), so cells tile exactly, drawn by the server's renderer on the
// 480 by 460 dots of rows 1 to 23 (RAS-11); rows 0 and 24 are the teletext
// page's, outside the picture, and nothing of it is drawn there.
//
// Two pictures are read. A page tiled by the painter, every cell of rows 1
// to 23 a colour neither neighbour has, columns 20 to 29 drawn again by a
// macro object in other colours: every pixel of every cell must be its own
// colour, which reads every one of the grid's boundaries, the 24 lines
// between and round rows 1 to 23 and the 41 edges between and round
// columns 0 to 39 (the display area's first line, 20, and last, 479, and
// the raster's last dot, 479, among them), within one drawing and, on
// columns 20's and 30's edges, between two. And every NAPLPS catalogue page: every
// pixel of every blank cell is one colour, its own background's, between
// two cells of one drawing (the stream, or one object) and between two
// drawings (an object's exact rectangle, ANIM-11 and RAS-4, and the stream
// or another object). A fill that fell short leaves a line or dot of what
// lies beneath, and one that reached too far paints its colour into the
// cell next to it. The server is another repository's program: without it
// named by TELETEXT_SERVER these tests are skipped, saying so.

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Application, type Context, Naplps } from "../src/kit.ts";
import { COLUMNS, FIRST_TEXT_ROW, LAST_TEXT_ROW, LEVEL_1_PRIMARIES, RASTER_CELL_DOTS, RASTER_ROW_LINES } from "../src/picture/grid.ts";
import { cellsBox, NaplpsPainter } from "../src/picture/naplps-painter.ts";
import type { PictureScene } from "../src/picture/scene.ts";
import { type PictureExample, pictureExamples } from "./picture-goldens.ts";
import { drawPictures, pictureServer } from "./picture-server.ts";
import { type Pixels, readPng } from "./png.ts";

import { Harness } from "neoteletext-server-ts-protocol/testing";

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

/** The pixels of the teletext rows 0 and 24, lines 0 to 19 and 480 to 499, that are not the colour of the raster's first: the picture draws nothing there (RAS-11). */
function outsideThePicture(pixels: Pixels): string[] {
  const colour = pixels.at(0, 0);
  const lines = [FIRST_TEXT_ROW - 1, LAST_TEXT_ROW + 1].flatMap((row) => Array.from({ length: RASTER_ROW_LINES }, (_, line) => RASTER_ROW_LINES * row + line));
  return lines.flatMap((line) =>
    Array.from({ length: COLUMNS * RASTER_CELL_DOTS }, (_, dot) => dot)
      .filter((dot) => pixels.at(dot, line) !== colour)
      .map((dot) => `${String(dot)},${String(line)}`),
  );
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

/** `place`'s pixels in `pixels` listed, the first four and how many more. */
function listed(place: string, pixels: readonly string[]): string {
  return `${place}: ${pixels.slice(0, 4).join(" ")}${pixels.length > 4 ? ` and ${String(pixels.length - 4)} more` : ""}`;
}

/** What is wrong in one example's drawing: its blank cells' stray pixels and anything drawn on rows 0 and 24; its boundaries counted. */
function readExample(example: PictureExample, png: Buffer | undefined, counts: Boundaries): string[] {
  const { scene } = example;
  assert.ok(png !== undefined && scene !== undefined, `the server drew ${example.name}`);
  const pixels = readPng(png);
  const objects = macroObjects(example.messages);
  const outside = outsideThePicture(pixels);
  const found = outside.length > 0 ? [listed(`${example.name}: rows 0 and 24`, outside)] : [];
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (blank(scene, row, column)) {
        countBoundaries(scene, objects, row, column, counts);
        const off = strayPixels(pixels, row, column);
        if (off.length > 0) {
          found.push(listed(`${example.name}: row ${String(row)}, column ${String(column)}`, off));
        }
      }
    }
  }
  return found;
}

test(
  "every pixel of every blank NAPLPS cell of the catalogue is one colour: cells meet exactly in one drawing and between two, and rows 0 and 24 are untouched",
  { skip: server === null ? "needs TELETEXT_SERVER, neoteletext-app-server's teletext-server at PICTURE_SERVER (picture-server.ts)" : false },
  async () => {
    const examples = pictureExamples().filter((example) => example.renderer === "naplps");
    const drawn = await drawPictures(server ?? "", examples);
    const counts: Boundaries = { oneDrawing: 0, twoDrawings: 0, lastDot: 0 };
    const stray = examples.flatMap((example) => readExample(example, drawn.get(`naplps/${example.name}`), counts));
    assert.deepEqual(stray, [], "blank cells, and rows 0 and 24, with a pixel of another colour");
    for (const [kind, count] of Object.entries(counts)) {
      assert.ok(
        count >= LEAST_BOUNDARIES,
        `the catalogue's blank cells meet ${String(count)} boundaries of kind ${kind}, fewer than ${String(LEAST_BOUNDARIES)}`,
      );
    }
    process.stdout.write(`# boundaries read: ${JSON.stringify(counts)}\n`);
  },
);

/** The tiled page's place: a page and sub-code of its own, beyond the catalogue's. */
const TILED_PAGE = "899";
const TILED_SUB = "0001";
const PAGE_RADIX = 16;
/** The Level 1 colours a cell takes, 1 to 7: black is the screen's own, so a cell left unpainted shows. */
const TILE_COLOURS = LEVEL_1_PRIMARIES.length - 1;
/** The macro object over columns 20 to 29 of every row, within MAX_MACRO_BYTES: its first column and its columns, macro code, number, and how far its colours are turned from the stream's beneath. */
const OBJECT_FIRST_COLUMN = COLUMNS / 2;
const OBJECT_COLUMNS = 10;
const OBJECT_MACRO = 0x20;
const OBJECT_NUMBER = 2;
const OBJECT_TURN = 3;
/** An 8-bit primary at its full. */
const FULL = 255;
/** A colour as the PNG reader packs it. */
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
/** The messages a picture page keeps a sub-page with (picture-kept.ts). */
const KEPT_TYPES = new Set(["naplps", "naplps_objects"]);

/** The colour-map entry of the cell at `row`, `column`, turned by `turn`: (row + column + turn) mod 7, plus 1, so cells beside one another, across or down, always differ. */
function tile(row: number, column: number, turn: number): number {
  return ((row + column + turn) % TILE_COLOURS) + 1;
}

/** Entry `entry`'s Level 1 colour as `0xRRGGBB`. */
function level1(entry: number): number {
  const [red, green, blue] = LEVEL_1_PRIMARIES[entry] ?? [false, false, false];
  return ((red ? FULL : 0) << RED_SHIFT) | ((green ? FULL : 0) << GREEN_SHIFT) | (blue ? FULL : 0);
}

/** Columns `firstColumn` to `endColumn` - 1 of rows 1 to 23 tiled on `builder`, each cell turned by `turn`. */
function tileCells(builder: Naplps, firstColumn: number, endColumn: number, turn: number): void {
  const painter = new NaplpsPainter(builder);
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    for (let column = firstColumn; column < endColumn; column += 1) {
      painter.fill(row, column, 1, 1, tile(row, column, turn));
    }
  }
}

/** The tiled page as a kept picture: the stream tiles every cell, and a macro object tiles columns 20 to 29 again, turned. */
function tiledExample(): PictureExample {
  const [page, sub] = [Number.parseInt(TILED_PAGE, PAGE_RADIX), Number.parseInt(TILED_SUB, PAGE_RADIX)];
  const stream = new Naplps().reset().clear();
  LEVEL_1_PRIMARIES.forEach(([red, green, blue], entry) => {
    stream.colour(entry, red ? FULL : 0, green ? FULL : 0, blue ? FULL : 0);
  });
  tileCells(stream, 0, COLUMNS, 0);
  stream.defineMacro(OBJECT_MACRO, (contents) => {
    tileCells(contents, OBJECT_FIRST_COLUMN, OBJECT_FIRST_COLUMN + OBJECT_COLUMNS, OBJECT_TURN);
  });
  const box = cellsBox(FIRST_TEXT_ROW, OBJECT_FIRST_COLUMN, OBJECT_COLUMNS, LAST_TEXT_ROW - FIRST_TEXT_ROW + 1);
  const object = stream.object({ number: OBJECT_NUMBER, kind: "macro", ...box, originX: box.x, originY: box.y, frames: [OBJECT_MACRO] });
  const writer: Application = {
    pages: () => [{ page, title: TILED_PAGE }],
    start(context: Context): void {
      context.naplps({ kept: true }, page, sub, stream.parts(), { restart: true });
      context.naplpsObjects({ kept: true }, page, sub, [object]);
    },
  };
  const harness = new Harness([writer]);
  assert.deepEqual(harness.errors, [], "the kit takes the tiled page");
  const messages = harness.sent.filter((line) => KEPT_TYPES.has(String(line["type"])));
  return { name: "tiled", renderer: "naplps", page: TILED_PAGE, sub: TILED_SUB, messages };
}

/** Whether column `column` lies under the macro object. */
function inObject(column: number): boolean {
  return column >= OBJECT_FIRST_COLUMN && column < OBJECT_FIRST_COLUMN + OBJECT_COLUMNS;
}

/** The pixels of the cell at `row`, `column` that are not `colour`, as "dot,line". */
function offColour(pixels: Pixels, row: number, column: number, colour: number): string[] {
  const off: string[] = [];
  for (let line = RASTER_ROW_LINES * row; line < RASTER_ROW_LINES * (row + 1); line += 1) {
    for (let dot = RASTER_CELL_DOTS * column; dot < RASTER_CELL_DOTS * (column + 1); dot += 1) {
      if (pixels.at(dot, line) !== colour) {
        off.push(`${String(dot)},${String(line)}`);
      }
    }
  }
  return off;
}

test(
  "every cell of rows 1 to 23 is exactly its own 12 by 20 dots, on every edge of the grid, in one drawing and between two, and rows 0 and 24 are untouched",
  { skip: server === null ? "needs TELETEXT_SERVER, neoteletext-app-server's teletext-server at PICTURE_SERVER (picture-server.ts)" : false },
  async () => {
    const example = tiledExample();
    const png = (await drawPictures(server ?? "", [example])).get("naplps/tiled");
    assert.ok(png !== undefined, "the server drew the tiled page");
    const pixels = readPng(png);
    const wrong: string[] = [];
    for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const off = offColour(pixels, row, column, level1(tile(row, column, inObject(column) ? OBJECT_TURN : 0)));
        if (off.length > 0) {
          wrong.push(listed(`row ${String(row)}, column ${String(column)}`, off));
        }
      }
    }
    const outside = outsideThePicture(pixels);
    assert.deepEqual(wrong, [], "cells with a pixel not their own colour");
    assert.deepEqual(outside, [], "pixels of rows 0 and 24 not the screen's colour");
    assert.equal(pixels.at(0, 0), level1(0), "rows 0 and 24 are the blank teletext page's black");
  },
);
