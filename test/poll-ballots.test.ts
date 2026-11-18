// A poll keeps the vote of a connection with no viewer for the
// connection's life: one that leaves the poll's page and comes back finds
// its vote, and moving it moves it, never counting it twice; one that goes
// is forgotten, its vote still counted. A viewer's vote is theirs across
// tabs and reconnects (viewer-state.test.ts).

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { ComponentChannel, type Element, Frame, h, Poll, Tally } from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const POLL = 0x150;
const ELSEWHERE = 0x151;

/** A channel of a poll page and another page, and the poll's tally. */
function channel(): { readonly harness: Harness; readonly tally: Tally } {
  const tally = new Tally("best", ["one", "two", "three"]);
  const harness = new Harness([
    new ComponentChannel(
      [
        { page: POLL, title: "Poll", perViewer: true, root: (): Element => h(Frame, { title: "Poll", background: Colour.Blue }, h(Poll, { tally })) },
        { page: ELSEWHERE, title: "Elsewhere", root: (): Element => h(Frame, { title: "Elsewhere", background: Colour.Blue }) },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  return { harness, tally };
}

test("a viewer who leaves the poll and comes back moves their vote, never casting another", () => {
  const { harness, tally } = channel();
  harness.join(1, POLL);
  harness.press(1, Key.Enter);
  assert.deepEqual(tally.votes, [1, 0, 0]);
  harness.open(1, ELSEWHERE);
  harness.open(1, POLL);
  harness.press(1, Key.Down);
  harness.press(1, Key.Enter);
  assert.deepEqual(tally.votes, [0, 1, 0], "the vote moved to the second option, and is still one vote");
});

test("a connection with no viewer that goes is forgotten, and its vote stays counted", () => {
  const { harness, tally } = channel();
  harness.join(2, POLL);
  harness.press(2, Key.Enter);
  assert.equal(tally.ballotOf({ connection: 2, viewer: null }), 0);
  harness.close(2);
  assert.equal(tally.ballotOf({ connection: 2, viewer: null }), null);
  assert.deepEqual(tally.votes, [1, 0, 0]);
});
