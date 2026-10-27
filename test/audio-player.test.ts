// A player of tracks: what it plays and in what order, how it seeks, how
// loud it plays, and what its rows say of it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Harness, text } from "neottx-server-ts-protocol/testing";
import { AudioPlayer, type AudioPlayerProps, type Element, h, type Track } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { BODY_ROW, frame, harness, PAGE } from "./components-fixtures.ts";

const RATE = 16_000;

/** A track of `seconds` of samples. */
function track(name: string, seconds: number): Track {
  return {
    name,
    source: () => {
      const samples = new Int16Array(RATE * seconds).fill(1);
      return { name, rate: RATE, samples: () => samples, complete: true, failure: null, expected: samples.length };
    },
  };
}

/** The player's rows: what plays, how far, the transport, the modes on two rows, then the tracks. */
const NOW = BODY_ROW;
const TIME = BODY_ROW + 1;
const MODES = BODY_ROW + 3;
const QUEUE = BODY_ROW + 5;

/** A page with a player; whether each viewer has a copy is the page's to find when `perViewer` is null. */
function player(props: AudioPlayerProps, perViewer: boolean | null = true): Harness {
  const seen = harness([
    { page: PAGE, title: "Test", ...(perViewer === null ? {} : { perViewer }), root: (): Element => frame("Player", h(AudioPlayer, props)) },
  ]);
  seen.join(1, PAGE);
  return seen;
}

const row = (seen: Harness, at: number, session = 1): string => text(seen.seen(session, PAGE).rows, at);

/** The gains the receiver was told for the viewer's streams, in order: on each play, and each change. */
function gains(seen: Harness): number[] {
  return seen.sounds(1).flatMap((message) => {
    const member = message["play"] ?? message["gain"];
    return typeof member === "object" && member !== null && "gain" in member && typeof member.gain === "number" ? [member.gain] : [];
  });
}

const three = [track("one", 2), track("two", 2), track("three", 2)];

test("a player of tracks lists them before anything plays, and p plays the first, marked with a star", () => {
  const seen = player({ tracks: three });
  assert.match(row(seen, NOW), /Nothing playing/u);
  assert.match(row(seen, QUEUE), /one/u);
  assert.match(row(seen, QUEUE + 2), /three/u);
  seen.press(1, "p");
  assert.match(row(seen, NOW), /Playing: one/u);
  assert.match(row(seen, QUEUE), /\*one/u);
  assert.match(row(seen, MODES), /Vol 100%  Repeat off  Shuffle off/u);
});

test("as a track ends the next plays, and after the last nothing does while nothing repeats", () => {
  const seen = player({ tracks: three });
  seen.press(1, "p");
  seen.runUntil(2_600);
  assert.match(row(seen, NOW), /Playing: two/u);
  seen.runUntil(5_200);
  assert.match(row(seen, NOW), /Playing: three/u);
  seen.runUntil(9_000);
  assert.doesNotMatch(row(seen, NOW), /Playing/u, "the list played through once");
  assert.match(row(seen, QUEUE + 2), /\*three/u, "the last played is still marked");
});

test("repeat all goes from the last track to the first, and repeat one plays the one again", () => {
  const seen = player({ tracks: three });
  seen.press(1, "r");
  assert.match(row(seen, MODES), /Repeat all/u);
  seen.press(1, "p");
  seen.press(1, ">");
  seen.press(1, ">");
  assert.match(row(seen, NOW), /Playing: three/u);
  seen.runUntil(2_600);
  assert.match(row(seen, NOW), /Playing: one/u, "round to the first");
  seen.press(1, "r");
  assert.match(row(seen, MODES), /Repeat one/u);
  seen.runUntil(5_200);
  assert.match(row(seen, NOW), /Playing: one/u, "the one again");
});

test("Next and Previous step through the tracks; Previous well into a track starts it again", () => {
  const seen = player({ tracks: [track("long", 20), track("other", 20)] });
  seen.press(1, "p");
  seen.press(1, ">");
  assert.match(row(seen, NOW), /Playing: other/u);
  seen.press(1, "<");
  assert.match(row(seen, NOW), /Playing: long/u);
  seen.runUntil(8_000);
  seen.press(1, "<");
  assert.match(row(seen, NOW), /Playing: long/u, "still the first: there is none before it");
  assert.match(row(seen, TIME), /0:00\/0:20/u, "from its start");
});

test("Left and Right seek five seconds, no further than the ends; a paused track stays paused where it was moved to", () => {
  const seen = player({ tracks: [track("long", 20)] });
  seen.press(1, "p");
  seen.press(1, Key.Right);
  assert.match(row(seen, TIME), /0:05\/0:20/u);
  seen.press(1, Key.Left);
  seen.press(1, Key.Left);
  assert.match(row(seen, TIME), /0:00\/0:20/u, "not before the start");
  seen.press(1, "p");
  seen.press(1, Key.Right);
  assert.match(row(seen, NOW), /Paused: long/u);
  assert.match(row(seen, TIME), /0:05\/0:20/u);
});

test("the digits, when the player takes them, jump to tenths of the way", () => {
  const seen = player({ tracks: [track("long", 20)], digits: true });
  seen.press(1, "p");
  seen.press(1, "5");
  assert.match(row(seen, TIME), /0:10\/0:20/u);
});

test("the volume steps by ten, mute silences it and unmutes to where it was, and the next track plays as loud", () => {
  const seen = player({ tracks: three });
  seen.press(1, "p");
  seen.press(1, "-");
  assert.match(row(seen, MODES), /Vol 90%/u);
  seen.press(1, "m");
  assert.match(row(seen, MODES), /Muted/u);
  seen.press(1, "m");
  assert.match(row(seen, MODES), /Vol 90%/u);
  seen.press(1, ">");
  assert.deepEqual(gains(seen), [100, 90, 0, 90, 90], "played full, lowered, muted, unmuted, and the next played at 90");
});

test("shuffle plays every track once, the one playing first", () => {
  const tracks = [track("a", 2), track("b", 2), track("c", 2), track("d", 2), track("e", 2)];
  const seen = player({ tracks });
  seen.press(1, "p");
  seen.press(1, "z");
  assert.match(row(seen, MODES), /Shuffle on/u);
  const heard = ["a"];
  for (let step = 1; step < tracks.length; step += 1) {
    seen.press(1, ">");
    heard.push(/Playing: (\w)/u.exec(row(seen, NOW))?.[1] ?? "");
  }
  assert.deepEqual(heard.toSorted(), ["a", "b", "c", "d", "e"]);
});

test("a player's page gives each viewer a copy of their own, though the page does not ask", () => {
  const seen = player({ tracks: three }, null);
  seen.join(2, PAGE);
  seen.press(1, "p");
  assert.match(row(seen, NOW, 1), /Playing: one/u);
  assert.match(row(seen, NOW, 2), /Nothing playing/u);
});
