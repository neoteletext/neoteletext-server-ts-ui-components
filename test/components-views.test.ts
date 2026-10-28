// Streams, disabled looks, trees and players: what a component shows as
// its state changes.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, text } from "neoteletext-server-ts-protocol/testing";
import { AudioPlayer, CHIP_CELLS, Collapsible, DISABLED, type Element, h, NowPlaying, Pagination, Slider, TabView, Text, Tree } from "../src/index.ts";
import { Attribute, COLUMNS, Key } from "../src/kit.ts";
import { PAGE, BODY_ROW, frame, harness, generationOf, Player, leaves } from "./components-fixtures.ts";

test("a stream pauses where it was heard to, sending nothing, and resumes from there as a new stream", () => {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: (): Element => frame("Player", h(Player, {})) }]);
  seen.join(1, PAGE);
  seen.press(1, Key.Enter);
  seen.runUntil(1_000);
  seen.press(1, "p");
  assert.match(text(seen.own(1, PAGE), BODY_ROW), /paused 1000/u);
  assert.ok("stop" in (seen.sounds(1).at(-1) ?? {}), "the receiver stops it");
  const sent = seen.sounds(1).length;
  seen.runUntil(3_000);
  assert.equal(seen.sounds(1).length, sent, "nothing is sent while paused");
  seen.press(1, "r");
  const generations = seen.sounds(1).flatMap((message) => generationOf(message["opus_live"]) ?? []);
  assert.deepEqual(generations, [1, 2], "resumed as a new stream");
  seen.runUntil(3_500);
  seen.press(1, "x");
  assert.match(text(seen.own(1, PAGE), BODY_ROW), /playing 1500/u, "heard from where it paused");
});

test("a disabled control looks it: tabs, a heading, the page now and a slider's value in the disabled look, not their own", () => {
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element =>
        frame(
          "Disabled",
          h(TabView, { tabs: ["One", "Two"], disabled: true }),
          h(Collapsible, { titles: ["A"], disabled: true }),
          h(Pagination, { count: 5, disabled: true }),
          h(Slider, { label: "Volume", min: 0, max: 10, disabled: true }),
        ),
    },
  ]);
  seen.join(1, PAGE);
  const rows = seen.seen(1, PAGE).rows;
  // The chosen tab's chip with no band (Black Background where the band's colour was: black ink is Level 2.5 only), the other's name, after its colour's cell in its slot, in DISABLED.
  assert.deepEqual([rows[BODY_ROW]?.[0], rows[BODY_ROW]?.["One".length + CHIP_CELLS + 2]], [Attribute.BlackBackground, DISABLED]);
  assert.deepEqual(
    [rows[BODY_ROW + 1]?.[0], rows[BODY_ROW + 1]?.[2]],
    [Attribute.BlackBackground, DISABLED],
    "no band (Black Background, not alpha black), its title dim",
  );
  assert.equal(rows[BODY_ROW + 2]?.[2], Attribute.BlackBackground, "the page now on a chip with no band, after the dim arrow's two cells");
  assert.equal(rows[BODY_ROW + 3]?.[COLUMNS - 6], DISABLED, "the value after the track");
});

test("a tree's view comes up when an item is shut, so none of it is left empty", () => {
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element =>
        frame(
          "Tree",
          h(Tree, {
            nodes: [
              { label: "P", children: leaves(10) },
              { label: "Q", children: leaves(3) },
            ],
            open: ["P", "Q"],
            shown: 4,
          }),
        ),
    },
  ]);
  seen.join(1, PAGE);
  seen.press(1, Key.End);
  for (let step = 0; step < 3; step += 1) {
    seen.press(1, Key.Up);
  }
  // Q, shut, is the last of the twelve rows left: the view shows the four that end with it.
  seen.press(1, Key.Enter);
  const rows = seen.seen(1, PAGE).rows;
  assert.match(text(rows, BODY_ROW + 3), /\+ Q/u);
  assert.match(text(rows, BODY_ROW), /leaf 8/u);
});

const page = (keepRows: boolean): Harness => {
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      perViewer: true,
      root: (): Element => frame("Test", h(AudioPlayer, { keepRows }), h(NowPlaying, { keepRows }), h(Text, { text: "below" })),
    },
  ]);
  seen.join(1, PAGE);
  return seen;
};

test("a player with nothing playing draws nothing, buttons and all, or keeps its rows empty when told to", () => {
  const bare = page(false).seen(1, PAGE).rows;
  assert.match(text(bare, BODY_ROW), /below/u, "nothing above it: no Nothing playing, no pause or stop");
  const kept = page(true).seen(1, PAGE).rows;
  assert.match(text(kept, BODY_ROW + 7), /below/u, "under the player's five rows and the display's two");
  assert.doesNotMatch(text(kept, BODY_ROW), /Nothing playing|pause/u);
});
