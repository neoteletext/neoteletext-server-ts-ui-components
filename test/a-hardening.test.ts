// Props, feeds and text the components cannot trust: a place outside its
// parent's box, a child that measures bigger than its space, a count of
// none, text longer than its row, and lists long enough to overflow the
// stack when spread as arguments.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { Harness, text } from "neottx-server-ts-protocol/testing";
import {
  type Article,
  articleLines,
  At,
  type Box,
  Canvas,
  Centred,
  Columns,
  ComponentChannel,
  DayPages,
  Frame,
  h,
  Layers,
  type LayoutChild,
  Rule,
  type Size,
  StatusBar,
} from "../src/index.ts";
import { Attribute, Colour, mosaicColour, Screen, textColour } from "../src/kit.ts";

const PAGE = 0x150;
const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;
/** A frame's body: rows 3 to 22, the page's width. */
const BODY: Box = { row: 3, column: 0, width: 40, height: 20 };
/** More than V8 takes as the arguments of one call (measured: 100,000 pass, 150,000 overflow the stack). */
const TOO_MANY_ARGUMENTS = 200_000;

/** A child that measures `size` whatever it is offered, and keeps the boxes it is placed in. */
function recorder(size: Size): { readonly child: LayoutChild; readonly placed: Box[] } {
  const placed: Box[] = [];
  return {
    placed,
    child: {
      props: {},
      measure: (): Size => size,
      place: (box: Box): void => {
        placed.push(box);
      },
    },
  };
}

test("At cuts its place to its parent's box, however far its props reach", () => {
  // Children are stacked at their measured height, so one that wants every row shows the place's height.
  const far = recorder({ width: 1, height: Number.MAX_SAFE_INTEGER });
  new At({ row: 2, column: 30, rows: 1_000_000_000, columns: 1_000_000_000 }).arrange(BODY, [far.child]);
  assert.deepEqual(far.placed, [{ row: 5, column: 30, width: 10, height: 18 }]);

  const before = recorder({ width: 1, height: Number.MAX_SAFE_INTEGER });
  new At({ row: -5, column: -3 }).arrange(BODY, [before.child]);
  assert.deepEqual(before.placed, [BODY], "a place above and left of the box starts at its top-left");

  assert.deepEqual(new At({ row: 2, column: 0, rows: 1_000_000_000 }).measure({ width: 40, height: 20 }, []), { width: 40, height: 20 });
});

test("a rule in a place wider than the page is drawn on the page's row, and the page is published", () => {
  // Over 2^32 - 1 cells, the most an array holds: a line sized by the place's own width throws, and the page is never published.
  const seen = new Harness([
    new ComponentChannel([
      {
        page: PAGE,
        title: "Test",
        root: () => h(Frame, { title: "Rule", background: Colour.Blue, prompts: PROMPTS }, h(At, { row: 0, column: 0, columns: 2 ** 32 + 1 }, h(Rule, {}))),
      },
    ]),
  ]);
  seen.join(1, PAGE);
  const row = text(seen.seen(1, PAGE).rows, BODY.row);
  assert.equal(row.length, BODY.width);
  assert.ok(row.startsWith(String.fromCodePoint(mosaicColour(Colour.Blue))), "the rule's mosaic colour in its first cell");
});

test("Centred cuts a child that measures bigger than its box to the box", () => {
  const big = recorder({ width: 100, height: 50 });
  new Centred({}).arrange(BODY, [big.child]);
  assert.deepEqual(big.placed, [BODY]);
});

test("chunks of no lines a screen still end", () => {
  // In a process of its own with a small heap and a time limit: a loop that never ends would otherwise hang the run.
  const index = new URL("../src/index.ts", import.meta.url).href;
  const script = `import { chunks } from ${JSON.stringify(index)}; console.log(JSON.stringify([chunks([1, 2, 3], 1, 0), chunks([1, 2, 3], -1, -2)]));`;
  const run = spawnSync(process.execPath, ["--max-old-space-size=64", "--input-type=module", "--eval", script], { encoding: "utf8", timeout: 20_000 });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(
    run.stdout.trim(),
    JSON.stringify([
      [[1], [2], [3]],
      [[], [1], [2], [3]],
    ]),
  );
});

test("a status bar's right-hand text is cut to the row, so the background and the flash keep their cells", () => {
  const screen = new Screen();
  const width = 30;
  const canvas = new Canvas(screen, { row: 0, column: 0, width, height: 1 }, { cursor: null });
  new StatusBar({ segments: [{ text: "ON AIR" }], right: "x".repeat(50), alarm: true }).paint(canvas);
  assert.equal(canvas.at(0, 0), textColour(Colour.Blue));
  assert.equal(canvas.at(0, 1), Attribute.NewBackground);
  assert.equal(canvas.at(0, 2), Attribute.Flash);
  assert.equal(canvas.at(0, 3), textColour(Colour.Yellow), "the right-hand text's colour, after the flash");
  assert.equal(canvas.at(0, width - 1), Attribute.BlackBackground);
});

test("layers and columns of more children than a call takes as arguments are measured", () => {
  const children = Array.from({ length: TOO_MANY_ARGUMENTS }, () => recorder({ width: 1, height: 1 }).child);
  assert.deepEqual(new Layers({}).measure({ width: 40, height: 20 }, children), { width: 40, height: 1 });
  assert.deepEqual(new Columns({}).measure({ width: 40, height: 20 }, children), { width: 40, height: 1 });
});

test("a block of more lines than a call takes as arguments is laid out", () => {
  const words = "word ".repeat(TOO_MANY_ARGUMENTS);
  assert.equal(articleLines([{ kind: "paragraph", text: words }], "word".length).length, TOO_MANY_ARGUMENTS);
});

test("a day of more articles than a call takes as arguments is rendered", () => {
  const article: Article = { page: 0x200, title: "A story", writer: "A writer", date: 0, summary: "", blocks: [], tags: [], link: "" };
  const articles = Array.from({ length: TOO_MANY_ARGUMENTS }, (_, index) => ({ ...article, page: article.page + index }));
  const pages = new DayPages({ background: Colour.Blue, prompts: PROMPTS, days: [{ name: "Today", articles }] }).render();
  assert.ok(Array.isArray(pages) && pages.length === 1);
});
