// A poll keeps each viewer's vote while they are on the channel: one who
// leaves the poll's page and comes back finds their vote, and moving it
// moves it, never counting it twice; one who goes is forgotten, their vote
// still counted.

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

test("a viewer who goes is forgotten, and their vote stays counted", () => {
  const { harness, tally } = channel();
  harness.join(2, POLL);
  harness.press(2, Key.Enter);
  assert.equal(tally.ballotOf(2), 0);
  harness.close(2);
  assert.equal(tally.ballotOf(2), null);
  assert.deepEqual(tally.votes, [1, 0, 0]);
});
