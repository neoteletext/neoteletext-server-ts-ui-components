// REQ-6774, renderer parity PAR-42, TODO-6840: on the teletext raster a
// NAPLPS picture's cell is 12 dots by 20 lines, row r on lines 20r to
// 20r + 19 and column c on dots 12c to 12c + 11. The kit writes coordinates
// at three-byte precision, a step of 2.31 raster lines and 1.875 dots (ANSI
// X3.110-1983 section 5.3.2.2.3, Table 5), so a filled rectangle cannot end
// on most cell edges, while an object's rectangle is exact (ANIM-11,
// DEC-6829): a fill that fell short of it left the object's last line or
// dot unpainted, a black line between two rows of coloured cells. Drawn by
// the server's renderer, no raster line and no dot column of a coloured
// blank cell is left black where it meets a cell of another drawing (an
// object's and the stream's, or two objects'). The page's last dot, 479, is left out: the kit holds an
// absolute coordinate below the unit screen's right edge, so nothing
// reaches it (TODO-6846). The server is another repository's program:
// without it named by TELETEXT_SERVER this test is skipped, saying so.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Colour, COLUMNS, FIRST_TEXT_ROW, LAST_TEXT_ROW, RASTER_ROW_LINES } from "../src/picture/grid.ts";
import type { PictureScene } from "../src/picture/scene.ts";
import { pictureExamples } from "./picture-goldens.ts";
import { drawPictures, pictureServer } from "./picture-server.ts";
import { type Pixels, readPng } from "./png.ts";

const server = pictureServer();
/**
 * Pages whose rows of objects meet one another, the stream, and an object inside another's rectangle, each of
 * which showed a black raster line between two rows of coloured cells before TODO-6840.
 */
const EXAMPLES = [
  "collapsible-an-accordion-the-second-opened",
  "textfield-a-placeholder-shown-while-it-does-not-have-the-keys",
  "dialog-with-a-shadow-and-a-field",
  "switch-on-and-off",
  "tabstrip-each-style",
  "wizard-finished",
] as const;
/** The raster's cell: 12 dots across (the engine's 480 by 500 page). */
const CELL_DOTS = 12;
/** The raster's last dot, which nothing written at three-byte precision reaches (TODO-6846). */
const LAST_DOT = COLUMNS * CELL_DOTS - 1;
const BLACK = 0x000000;

/** A coloured blank cell drawn alone: a space on a background other than black, neither half of double height. */
function colouredBlank(scene: PictureScene, row: number, column: number): boolean {
  const cell = scene.cells[row]?.[column];
  return cell !== undefined && cell.background !== Colour.Black && cell.content.kind === "space" && !cell.covered && !cell.tall && !cell.doubleHeight;
}

/**
 * The lines and dot columns of the cell at `row`, `column` the test reads: those at each edge where it meets a cell
 * of another drawing, an object's and the stream's or two objects', where one drawing's fill met the other's exact
 * rectangle. An edge between two cells of one drawing is left out: both are drawn at three-byte precision, which
 * puts the line or dot where two colours meet up to one off (TODO-6848).
 */
function linesChecked(scene: PictureScene, objects: ReadonlySet<number>, row: number, column: number): { lines: number[]; dots: number[] } {
  const drawing = (down: number, across: number): number => {
    const owner = scene.owners[down]?.[across] ?? 0;
    return objects.has(owner) ? owner : 0;
  };
  const meets = (down: number, across: number): boolean => {
    const inside = down >= FIRST_TEXT_ROW && down <= LAST_TEXT_ROW && across >= 0 && across < COLUMNS;
    return inside && drawing(down, across) !== drawing(row, column);
  };
  const [left, top] = [CELL_DOTS * column, RASTER_ROW_LINES * row];
  return {
    lines: [...(meets(row - 1, column) ? [top] : []), ...(meets(row + 1, column) ? [top + RASTER_ROW_LINES - 1] : [])],
    dots: [...(meets(row, column - 1) ? [left] : []), ...(meets(row, column + 1) ? [left + CELL_DOTS - 1] : [])].filter((dot) => dot !== LAST_DOT),
  };
}

/** The numbers of the macro objects among a picture's messages. */
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

/** Whether every pixel at `points` is black. */
function allBlack(pixels: Pixels, points: readonly (readonly [number, number])[]): boolean {
  return points.every(([dot, line]) => pixels.at(dot, line) === BLACK);
}

/** The lines and dot columns of `scene`'s coloured blank cells left black where they meet another drawing's cells. */
function blackEdges(name: string, scene: PictureScene, objects: ReadonlySet<number>, pixels: Pixels): string[] {
  const black: string[] = [];
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const [left, top] = [CELL_DOTS * column, RASTER_ROW_LINES * row];
      const { lines, dots } = colouredBlank(scene, row, column) ? linesChecked(scene, objects, row, column) : { lines: [], dots: [] };
      const blackLines = lines.filter((line) =>
        allBlack(
          pixels,
          Array.from({ length: CELL_DOTS }, (_, index) => [left + index, line] as const),
        ),
      );
      const blackDots = dots.filter((dot) =>
        allBlack(
          pixels,
          Array.from({ length: RASTER_ROW_LINES }, (_, index) => [dot, top + index] as const),
        ),
      );
      black.push(
        ...blackLines.map((line) => `${name}: line ${String(line)} of row ${String(row)}, column ${String(column)}`),
        ...blackDots.map((dot) => `${name}: dot ${String(dot)} of row ${String(row)}, column ${String(column)}`),
      );
    }
  }
  return black;
}

test(
  "no raster line or dot column of a coloured NAPLPS cell is left black where it meets another drawing's cell",
  { skip: server === null ? "needs TELETEXT_SERVER, neoteletext-app-server's teletext-server at PICTURE_SERVER (picture-server.ts)" : false },
  async () => {
    const examples = pictureExamples().filter((example) => example.renderer === "naplps" && (EXAMPLES as readonly string[]).includes(example.name));
    assert.deepEqual(examples.map((example) => example.name).toSorted(), [...EXAMPLES].toSorted(), "every example named is in the catalogue");
    const drawn = await drawPictures(server ?? "", examples);
    const black = examples.flatMap((example) => {
      const png = drawn.get(`naplps/${example.name}`);
      const objects = macroObjects(example.messages);
      assert.ok(png !== undefined && example.scene !== undefined, `the server drew ${example.name}`);
      assert.ok(objects.size > 0, `${example.name} has objects`);
      return blackEdges(example.name, example.scene, objects, readPng(png));
    });
    assert.deepEqual(black, [], "raster lines and dot columns of coloured cells left black");
  },
);
