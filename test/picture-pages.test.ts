// REQ-6774, renderer parity PAR-42: pages drawn in ReGIS and NAPLPS from
// the same components. What each sends is a picture the server takes; an
// interactive component is a drawing or an object of its own, numbered by
// the library and named by the page's rule table; a click and a key reach
// the same handlers as on a teletext page; a change of state sends only the
// drawings or objects that changed; the channel's copy is kept by the
// server and a viewer's own goes to their connection.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness, SERVER_LIMITS } from "neoteletext-server-ts-protocol/testing";
import { Button, ComponentChannel, type Element, h, PageLink, type Renderer, Rows, Text, TextField } from "../src/index.ts";
import { checkProgram, Key, type PageDescription } from "../src/kit.ts";
import { PARTS } from "./catalogue/index.ts";
import { type Example, exampleName } from "./catalogue/example.ts";
import { EXAMPLE_PAGE, stage } from "./catalogue/stage.ts";
import { frame, PAGE } from "./components-fixtures.ts";

const PAGE_TEXT = PAGE.toString(16);
const PICTURE_RENDERERS = ["regis", "naplps"] as const;
const PICTURE_TYPES = new Set(["regis", "naplps", "regis_links", "regis_cursor", "naplps_objects", "naplps_links", "naplps_cursor", "forget_picture"]);
/** The grid of PAR-42: a ReGIS cell is 20 pixels, row r at 10 + 20 (r - 1). */
const REGIS_CELL = 20;
const REGIS_MARGIN = 10;

/** Every picture message the harness was sent, in order. */
function pictureLines(page: Harness): Record<string, unknown>[] {
  return page.sent.filter((line) => PICTURE_TYPES.has(String(line["type"])));
}

/** A field of a message's object, or of a part of one. */
function field(value: unknown, name: string): unknown {
  return typeof value === "object" && value !== null ? (Object.entries(value).find(([key]) => key === name)?.[1] as unknown) : undefined;
}

/** The bytes of a `regis` or `naplps` message, its text parts as `{text}`. */
function bytesOf(line: Record<string, unknown>): string {
  const parts: unknown = line["parts"];
  const listed: unknown[] = Array.isArray(parts) ? parts : [];
  const data: unknown[] = typeof line["data"] === "string" ? [{ data: line["data"] }] : listed;
  return data
    .map((part) => {
      const bytes = field(part, "data");
      return typeof bytes === "string" ? Buffer.from(bytes, "base64").toString("latin1") : `{${String(field(part, "text"))}}`;
    })
    .join("");
}

/** The regis or naplps stream a harness was sent, every message's bytes in order. */
function streamOf(lines: readonly Record<string, unknown>[], renderer: string): string {
  return lines
    .filter((line) => line["type"] === renderer)
    .map((line) => bytesOf(line))
    .join("");
}

/** What is wrong with the picture messages of `example` staged in `renderer`. */
function faultsOf(renderer: Renderer, example: Example): string[] {
  const staged = stage(example, renderer);
  const name = `${renderer} ${exampleName(example)}`;
  const lines = pictureLines(staged.page).filter((line) => line["page"] === EXAMPLE_PAGE.toString(16));
  const faults = lines.some((line) => line["type"] === renderer && line["restart"] === true) ? [] : [`${name}: no picture`];
  for (const line of lines) {
    const fault = checkProgram(line, SERVER_LIMITS);
    if (fault !== null) {
      faults.push(`${name}: ${String(line["type"])} ${JSON.stringify(fault)}`);
    }
  }
  return [...faults, ...staged.failures.map((failure) => `${name}: ${failure}`)];
}

/** A channel of one page in `renderer`, viewer 1 on it. */
function onePage(renderer: Renderer, root: () => Element, perViewer = false): Harness {
  const page = new Harness([new ComponentChannel([{ page: PAGE, title: "Pictures", renderer, perViewer, root }], { opus: fakeOpus() })]);
  page.join(1, PAGE);
  return page;
}

/** A page of a line of text, a button that counts its presses into `pressed`, and a text field. */
function buttons(pressed: number[]): () => Element {
  return () =>
    frame(
      "Pictures",
      h(
        Rows,
        {},
        h(Text, { text: "Hello there" }),
        h(Button, {
          label: "Press me",
          onPress: (connection: number): void => {
            pressed.push(connection);
          },
        }),
        h(TextField, { label: "Name", longest: 20 }),
      ),
    );
}

test("every catalogue example sends pictures the server takes, in ReGIS and in NAPLPS", () => {
  const examples = PARTS.flatMap((part) => part.examples);
  assert.deepEqual(
    PICTURE_RENDERERS.flatMap((renderer) => examples.flatMap((example) => faultsOf(renderer, example))),
    [],
  );
});

test("a ReGIS page is kept by the server: erased, its base drawn, its button a detectable drawing with its looks, committed", () => {
  const page = onePage("regis", buttons([]));
  const first = pictureLines(page).find((line) => line["type"] === "regis");
  assert.ok(first !== undefined);
  assert.equal(first["connections"], "kept");
  assert.equal(first["restart"], true);
  const all = streamOf(pictureLines(page), "regis");
  assert.ok(all.startsWith("S(I0)S(E)"), all.slice(0, 40));
  assert.match(all, /\{Hello there\}/u);
  // The button: drawing 2 detectable with looks 3 and 4, kept hidden.
  assert.match(all, /D\(B2\).*\{Press me\}.*D\(E\)D\(S2\(I1,G1,H3,A4,U'Press me'\)\)/u);
  assert.match(all, /D\(S3\(V0\),S4\(V0\)\)/u);
  assert.ok(all.endsWith("D(C)"));
});

test("a picture page's rule table names its drawings and objects, where a teletext page's names rectangles", () => {
  for (const renderer of PICTURE_RENDERERS) {
    const page = onePage(renderer, buttons([]));
    const rules = page.sent.findLast((line) => line["type"] === "rules");
    const table = JSON.stringify(rules?.["table"]);
    assert.match(table, /"press_button_2","on":\{"event":"press","target":\{"object":2\}/u, renderer);
    assert.doesNotMatch(table, /"rects"/u, renderer);
  }
  const teletext = onePage("teletext", buttons([]));
  assert.match(JSON.stringify(teletext.sent.findLast((line) => line["type"] === "rules")?.["table"]), /"rects"/u);
});

test("a click on a ReGIS page's button, placed by its PICK, reaches the handler a teletext click does", () => {
  const pressed: number[] = [];
  const page = onePage("regis", buttons(pressed));
  // The button is on row 3 from column 1 (Frame's title takes rows 1 and 2, the text row 3... found by its drawing's bytes).
  const all = streamOf(pictureLines(page), "regis");
  const at = /D\(B2\)W\(I\d+\)P\[(\d+),(\d+)\]/u.exec(all);
  assert.ok(at !== null, "the button's drawing");
  const [x, y] = [Number(at[1]) + REGIS_CELL * 2, Number(at[2]) + REGIS_CELL / 2];
  const row = 1 + Math.floor((y - REGIS_MARGIN) / REGIS_CELL);
  // The mouse's own cell is the page image's, which a ReGIS picture does not share: here, nowhere near the button.
  page.send(1, { kind: "mouse", action: "press", button: 0, row: 20, column: 0, target: { object: 2 } });
  page.send(1, { kind: "pick", drawing: 2, x: 0, y: 0, pictureX: x, pictureY: y, commits: 1 });
  page.send(1, { kind: "mouse", action: "release", button: 0, row: 20, column: 0, target: { object: 2 } });
  page.send(1, { kind: "pick", drawing: 2, x: 0, y: 0, pictureX: x, pictureY: y, commits: 1 });
  assert.deepEqual(pressed, [1], `pressed at row ${row}`);
});

test("a click on a NAPLPS page's button, at its raster cell, and Enter reach the same handler as on teletext", () => {
  for (const renderer of ["naplps", "teletext"] as const) {
    const pressed: number[] = [];
    const page = onePage(renderer, buttons(pressed));
    const shown = page.sharedPages(PAGE)[0];
    const row = shown?.rows.findIndex((line) => String.fromCodePoint(...line).includes("Press me")) ?? -1;
    const column = String.fromCodePoint(...(shown?.rows[row] ?? [])).indexOf("Press me");
    page.send(1, { kind: "mouse", action: "press", button: 0, row, column });
    page.send(1, { kind: "mouse", action: "release", button: 0, row, column });
    assert.deepEqual(pressed, [1], `${renderer}: a click`);
    page.send(1, { kind: "key", action: "press", key: Key.Enter });
    assert.deepEqual(pressed, [1, 1], `${renderer}: Enter on the button the click focused`);
  }
});

test("a change of state redraws only the drawing that changed, and commits it (ReGIS)", () => {
  const page = onePage("regis", buttons([]));
  const before = pictureLines(page).length;
  // Tab moves the keys to the text field: only its drawing and the button's change, and the caret comes.
  page.send(1, { kind: "key", action: "press", key: Key.Tab });
  const after = pictureLines(page).slice(before);
  const stream = streamOf(after, "regis");
  assert.ok(
    after.every((line) => line["restart"] !== true),
    "no restart",
  );
  assert.doesNotMatch(stream, /S\(E\)/u, "no erase");
  assert.doesNotMatch(stream, /\{Hello there\}/u, "the base is not drawn again");
  assert.ok(stream.endsWith("D(C)"));
  const redefined = [...stream.matchAll(/D\(B(\d+)\)/gu)].map((found) => Number(found[1]));
  assert.ok(
    redefined.every((number) => number >= 1 && number <= 7),
    `only the button's, the field's and the caret's drawings: ${redefined.join(", ")}`,
  );
});

test("a change of state defines only the changed macros again and redefines their objects alone (NAPLPS)", () => {
  const page = onePage("naplps", buttons([]));
  const before = pictureLines(page).length;
  const whole = pictureLines(page).find((line) => line["type"] === "naplps_objects");
  const objects: unknown = whole?.["objects"];
  assert.deepEqual(
    (Array.isArray(objects) ? objects : []).map((object: unknown) => [field(object, "number"), field(object, "kind"), field(object, "detectable")]),
    [
      [2, "macro", true],
      [5, "macro", true],
    ],
  );
  page.send(1, { kind: "key", action: "press", key: Key.Tab });
  const after = pictureLines(page).slice(before);
  assert.ok(
    after.every((line) => line["restart"] !== true),
    "no restart",
  );
  const stream = streamOf(after, "naplps");
  assert.doesNotMatch(stream, /\{Hello there\}/u, "the base is not drawn again");
  // Every object message is a whole set (the caret came) or one object.
  for (const line of after.filter((each) => each["type"] === "naplps_objects")) {
    assert.ok(line["one"] === true || Array.isArray(line["objects"]));
  }
  assert.ok(
    after.some((line) => line["type"] === "naplps_cursor" && line["object"] === 1),
    "the caret is the cursor",
  );
});

test("a focused text field's caret is the picture's cursor, drawing 1 in the overlay layer", () => {
  const page = onePage("regis", buttons([]));
  page.send(1, { kind: "key", action: "press", key: Key.Tab });
  const all = pictureLines(page);
  assert.ok(all.some((line) => line["type"] === "regis_cursor" && line["drawing"] === 1));
  assert.match(streamOf(all, "regis"), /D\(B1\).*D\(E\)D\(S1\(G3/u);
});

test("a page link is the picture's link to its page", () => {
  for (const renderer of PICTURE_RENDERERS) {
    const page = onePage(renderer, () => frame("Links", h(PageLink, { page: 0x120, label: "Lists" })));
    const links = pictureLines(page).find((line) => line["type"] === `${renderer}_links`);
    const named = renderer === "regis" ? "drawing" : "object";
    assert.deepEqual(links?.["links"], [{ [named]: 2, target: "120" }], renderer);
  }
});

test("a viewer's own copy of a picture page goes to their connection, from a restart, once it differs from the channel's", () => {
  const page = onePage("regis", buttons([]), true);
  assert.ok(
    pictureLines(page).every((line) => line["connections"] === "kept"),
    "the same as the channel's: the kept copy",
  );
  page.send(1, { kind: "key", action: "press", key: Key.Tab });
  const own = pictureLines(page).filter((line) => line["type"] === "regis" && JSON.stringify(line["connections"]) === "[1]");
  assert.ok(own.length > 0);
  assert.equal(own[0]?.["restart"], true);
});

test("a picture page's public picture is its kept first sub-page (PAR-26)", () => {
  const harness = new Harness([
    new ComponentChannel(
      [
        {
          page: PAGE,
          title: "Pictures",
          renderer: "naplps",
          root: buttons([]),
          describe: (): PageDescription => ({ public: true, title: "Pictures", text: "A page" }),
        },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  const described = harness.describe(PAGE);
  assert.deepEqual(described["picture"], { kept: "0000" });
  assert.equal(described["page"], PAGE_TEXT);
});
