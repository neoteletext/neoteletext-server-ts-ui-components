// A player's further options: its speed, an A–B loop, a sleep timer,
// tracks taken up where the viewer left them, its queue edited, and a
// click on its bar seeking there.

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Harness, text } from "neottx-server-ts-protocol/testing";
import { AudioPlayer, type AudioPlayerProps, type Element, h, tone, type Track } from "../src/index.ts";
import { BODY_ROW, frame, harness, PAGE } from "./components-fixtures.ts";

/** A rate low enough that a quarter of an hour of samples is small. */
const RATE = 8_000;
const OTHER_PAGE = 0x151;

function track(name: string, seconds: number): Track {
  return {
    name,
    source: () => {
      const samples = new Int16Array(RATE * seconds).fill(1);
      return { name, rate: RATE, samples: () => samples, complete: true, failure: null, expected: samples.length };
    },
  };
}

const NOW = BODY_ROW;
const TIME = BODY_ROW + 1;
const SET = BODY_ROW + 4;
const QUEUE = BODY_ROW + 5;

function player(props: AudioPlayerProps): Harness {
  const seen = harness([
    { page: PAGE, title: "Test", perViewer: true, root: (): Element => frame("Player", h(AudioPlayer, props)) },
    { page: OTHER_PAGE, title: "Other", root: (): Element => frame("Other") },
  ]);
  seen.join(1, PAGE);
  return seen;
}

const row = (seen: Harness, at: number): string => text(seen.seen(1, PAGE).rows, at);

test("faster, the track's own time runs ahead of the clock, its length still the track's", () => {
  const seen = player({ tracks: [track("talk", 20)] });
  seen.press(1, "p");
  seen.press(1, "]");
  assert.match(row(seen, SET), /Speed 1.25x/u);
  seen.runUntil(4_000);
  assert.match(row(seen, TIME), /0:05\/0:20/u, "four seconds at 1.25 is five of the track");
  seen.press(1, "[");
  seen.press(1, "[");
  assert.match(row(seen, SET), /Speed 0.75x/u);
});

test("the A–B loop goes back to its start as it reaches its end, and a third press ends it", () => {
  const seen = player({ tracks: [track("talk", 20)] });
  seen.press(1, "p");
  seen.runUntil(2_000);
  seen.press(1, "l");
  assert.match(row(seen, SET), /Loop from 0:02/u);
  seen.runUntil(4_000);
  seen.press(1, "l");
  assert.match(row(seen, SET), /Loop 0:02-0:04/u);
  seen.runUntil(4_600);
  assert.match(row(seen, TIME), /0:0[23]\/0:20/u, "back to the loop's start");
  seen.press(1, "l");
  assert.doesNotMatch(row(seen, SET), /Loop/u);
});

test("the sleep timer turns through 15, 30 and 60 minutes and off, and pauses when it is time", () => {
  const seen = player({ tracks: [track("long", 16 * 60)] });
  seen.press(1, "p");
  seen.press(1, "t");
  assert.match(row(seen, SET), /Sleep 15m/u);
  seen.press(1, "t");
  seen.press(1, "t");
  seen.press(1, "t");
  assert.doesNotMatch(row(seen, SET), /Sleep/u, "off after an hour");
  seen.press(1, "t");
  seen.runUntil(15 * 60 * 1_000 + 1_000);
  assert.match(row(seen, NOW), /Paused: long/u);
  assert.doesNotMatch(row(seen, SET), /Sleep/u);
});

test("a player that resumes takes a track up where the viewer left it", () => {
  const seen = player({ tracks: [track("talk", 20)], resume: true });
  seen.press(1, "p");
  seen.runUntil(5_000);
  seen.open(1, OTHER_PAGE);
  seen.open(1, PAGE);
  seen.press(1, "p");
  assert.match(row(seen, TIME), /0:05\/0:20/u);
});

test("the queue is edited at the list's choice: moved down, played next, taken out", () => {
  const seen = player({ tracks: [track("alpha", 2), track("bravo", 2), track("charlie", 2)] });
  seen.press(1, "J");
  assert.match(row(seen, QUEUE), /bravo/u);
  assert.match(row(seen, QUEUE + 1), /alpha/u, "alpha moved down one");
  seen.press(1, ".");
  assert.match(row(seen, QUEUE), /alpha/u, "with nothing playing, played next is first");
  seen.press(1, "x");
  assert.match(row(seen, QUEUE), /bravo/u);
  assert.match(row(seen, QUEUE + 1), /charlie/u);
  assert.doesNotMatch(row(seen, QUEUE + 2), /alpha/u);
});

test("a click on the bar seeks there", () => {
  const seen = player({ tracks: [track("talk", 20)] });
  seen.press(1, "p");
  const bar = row(seen, TIME);
  const start = bar.indexOf("0:20") + "0:20".length + 2;
  const end = bar.lastIndexOf("%") - 4;
  seen.clickLeft(1, Math.round((start + end) / 2), TIME);
  assert.match(row(seen, TIME), /0:1[01]\/0:20/u, "the middle of the bar is the middle of the track");
});

test("a spectrum under the bar rises with what is heard, and lies flat for silence", () => {
  const sounding: Track = {
    name: "tone",
    source: () => {
      const samples = tone(1_000, 5_000);
      return { name: "tone", rate: RATE, samples: () => samples, complete: true, failure: null, expected: samples.length };
    },
  };
  const seen = player({ tracks: [sounding, track("quiet", 5)], spectrum: 2 });
  seen.press(1, "p");
  seen.runUntil(1_000);
  const bars = [BODY_ROW + 2, BODY_ROW + 3].map((at) => row(seen, at)).join("");
  assert.match(bars, /[!-~]/u, "some band stands up");
  seen.press(1, ">");
  seen.runUntil(2_000);
  assert.equal(
    row(seen, BODY_ROW + 2)
      .slice(1)
      .trim(),
    "",
    "nothing stands up",
  );
});
