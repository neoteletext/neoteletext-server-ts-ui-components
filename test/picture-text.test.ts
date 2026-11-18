// REQ-6774, renderer parity PAR-42, DEC-6818: a ReGIS page's text is
// written in a unit cell the VT340 can make. A unit cell's width is a
// multiple of 8, and a width between two is drawn at "the next smaller
// size" (VT330/VT340 Programmer Reference Manual, volume 2, chapter 7,
// "Unit Cell Size"), so the 15 PAR-42 first named drew each provided glyph
// shrunk into 8 pixels. Drawn by the server's renderer, a letter is at
// least as wide as the teletext glyph it is scaled up from. The server is
// another repository's program: without it named by TELETEXT_SERVER this
// test is skipped, saying so.

import assert from "node:assert/strict";
import { test } from "node:test";

import { SERVER_LIMITS } from "neoteletext-server-ts-protocol/testing";
import { h, Text } from "../src/index.ts";
import { numbered } from "../src/kit.ts";
import { REGIS_CELL, regisY } from "../src/picture/grid.ts";
import { EXAMPLE_PAGE, stage } from "./catalogue/stage.ts";
import { keptMessages } from "./picture-kept.ts";
import { drawPictures, pictureServer } from "./picture-server.ts";
import { readPng } from "./png.ts";

const server = pictureServer();
/** The letter drawn, and the dots its Noto Teletext glyph lights across: columns 1 to 10 of its 12 (DEC-6818, measured in the engine's font). */
const LETTER = "H";
const TELETEXT_GLYPH_DOTS = 10;
/** The example's frame titles it on rows 1 and 2, so the letter is the first thing on row 3. */
const LETTER_ROW = 3;
const FIRST_LINE = regisY(LETTER_ROW);
const CELL = REGIS_CELL;
/** Text is white on black (Text's default colour, the frame's background). */
const WHITE = 0xffffff;
const PAGE_RADIX = 16;
const SUB_DIGITS = 4;

test(
  "a ReGIS page's letter is drawn at least as wide as its teletext glyph",
  { skip: server === null ? "needs TELETEXT_SERVER, neoteletext-app-server's teletext-server at PICTURE_SERVER (picture-server.ts)" : false },
  async () => {
    const staged = stage({ component: "Text", title: "one letter", build: () => h(Text, { text: LETTER }) }, "regis");
    const scene = staged.channel.viewerMount(1, EXAMPLE_PAGE)?.lastPage?.pictures[0] ?? null;
    assert.ok(scene !== null, "the page drew a ReGIS picture");
    const sub = (numbered(1, SERVER_LIMITS)[0] ?? 0).toString(PAGE_RADIX).toUpperCase().padStart(SUB_DIGITS, "0");
    const page = EXAMPLE_PAGE.toString(PAGE_RADIX);
    const example = { name: "one-letter", renderer: "regis" as const, page, sub, messages: keptMessages("regis", scene, page, sub) };
    const png = (await drawPictures(server ?? "", [example])).get("regis/one-letter");
    assert.ok(png !== undefined, "the server drew the page");
    const pixels = readPng(png);
    const lit: number[] = [];
    for (let y = FIRST_LINE; y < FIRST_LINE + CELL; y += 1) {
      for (let x = 0; x < pixels.width; x += 1) {
        if (pixels.at(x, y) === WHITE) {
          lit.push(x);
        }
      }
    }
    assert.ok(lit.length > 0, "the letter is drawn on its row");
    const width = Math.max(...lit) - Math.min(...lit) + 1;
    assert.ok(
      width >= TELETEXT_GLYPH_DOTS,
      `the letter ${LETTER} is ${String(width)} pixels wide, narrower than its ${String(TELETEXT_GLYPH_DOTS)}-dot teletext glyph`,
    );
    const column = Math.floor(Math.min(...lit) / CELL);
    assert.ok(Math.max(...lit) < (column + 1) * CELL, "the letter stays inside its cell");
  },
);
