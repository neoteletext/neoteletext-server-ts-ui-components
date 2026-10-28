// Sound goes as Opus alone, the one format desktop and phone receivers play
// (docs/applications.md section 3.4): a stored sound encoded once and sent
// once to each viewer, a stream started once its encoder gives out its
// first packets, and an encoder that fails said so, never thrown.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness, text } from "neoteletext-server-ts-protocol/testing";
import { Component, ComponentChannel, type Element, h, type KeyEvent, sound, Text, tone } from "../src/index.ts";
import { Key, type OpusEncoder, type OpusStream } from "../src/kit.ts";
import { FIRST_PACKETS_MS, TICK_MS } from "../src/core/stream.ts";
import { BODY_ROW, frame, PAGE } from "./components-fixtures.ts";

const CHIME = sound("chime", tone(660, 120));

class Chimes extends Component {
  override focusable(): boolean {
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (event.action !== "release") {
      this.services.play(CHIME, event.session);
    }
    return true;
  }
}

/** A stream source of a second at 16 kHz, played on Enter, its state shown. */
class Streams extends Component<object, { readonly shown: string }> {
  override state = { shown: "" };

  override focusable(): boolean {
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (event.action === "release") {
      return false;
    }
    if (event.key === Key.Enter) {
      const samples = new Int16Array(16_000);
      this.services.stream({ name: "a second", rate: 16_000, samples: () => samples, complete: true, failure: null, expected: samples.length }, event.session);
    }
    const listening = this.services.listening(event.session);
    this.setState({ shown: `${listening?.state ?? "none"}: ${listening?.failure ?? ""}` });
    return true;
  }

  override render(): Element {
    return h(Text, { text: this.state.shown });
  }
}

function channel(root: () => Element, opus: OpusEncoder): Harness {
  return new Harness([new ComponentChannel([{ page: PAGE, title: "Test", perViewer: true, root }], { opus })]);
}

function members(harness: Harness, session: number): string[] {
  return harness.sounds(session).map((message) => Object.keys(message).find((key) => key !== "type" && key !== "to") ?? "");
}

test("a stored sound is encoded once, sent once to each viewer as Opus, and played after by its handle", () => {
  let encoded = 0;
  const counting = fakeOpus();
  const harness = channel(() => frame("Chimes", h(Chimes, {})), {
    sound: (samples, rate) => {
      encoded += 1;
      return counting.sound(samples, rate);
    },
    stream: (rate) => counting.stream(rate),
  });
  harness.join(1, PAGE);
  harness.join(2, PAGE);
  harness.press(1, Key.Enter);
  harness.press(1, Key.Enter);
  harness.press(2, Key.Enter);
  assert.deepEqual(members(harness, 1), ["opus", "play", "play"]);
  assert.deepEqual(members(harness, 2), ["opus", "play"]);
  assert.equal(encoded, 1, "encoded once, for every viewer");
});

test("a sound that cannot be encoded is said in the channel's log, and the page goes on", () => {
  const failing: OpusEncoder = {
    sound: () => {
      throw new Error("no ffmpeg");
    },
    stream: (rate) => fakeOpus().stream(rate),
  };
  const harness = channel(() => frame("Chimes", h(Chimes, {})), failing);
  harness.join(1, PAGE);
  harness.press(1, Key.Enter);
  assert.deepEqual(members(harness, 1), [], "nothing sent");
  assert.ok(
    harness.sent.some((line) => line["type"] === "log" && String(line["text"]).includes("chime could not be encoded: no ffmpeg")),
    "said, with why",
  );
  assert.deepEqual(harness.errors, []);
});

/** An encoder whose stream gives out nothing until it is let. */
function held(): { readonly encoder: OpusEncoder; readonly let: () => void } {
  let open = false;
  return {
    encoder: {
      sound: (samples, rate) => fakeOpus().sound(samples, rate),
      stream: (rate): OpusStream => {
        const inner = fakeOpus().stream(rate);
        return {
          packetBytes: inner.packetBytes,
          get failure(): string | null {
            return inner.failure;
          },
          write: (samples) => {
            inner.write(samples);
          },
          end: () => {
            inner.end();
          },
          take: () => (open ? inner.take() : new Uint8Array(0)),
          close: () => {
            inner.close();
          },
        };
      },
    },
    let: () => {
      open = true;
    },
  };
}

test("a stream waits for its encoder's first packets, looking again sooner than a tick, and starts once they come", () => {
  const { encoder, let: release } = held();
  const harness = channel(() => frame("Streams", h(Streams, {})), encoder);
  harness.join(1, PAGE);
  harness.press(1, Key.Enter);
  assert.deepEqual(members(harness, 1), ["opus_live", "play"], "nothing to send yet");
  assert.match(text(harness.own(1, PAGE), BODY_ROW), /waiting/u);
  release();
  harness.advance(FIRST_PACKETS_MS);
  assert.ok(FIRST_PACKETS_MS < TICK_MS);
  assert.equal(members(harness, 1).at(-1), "opus_packets", "sent at the first look after they came, not a tick later");
});

test("a stream whose encoder fails says why, as its failure", () => {
  const failing: OpusEncoder = {
    sound: (samples, rate) => fakeOpus().sound(samples, rate),
    stream: (): OpusStream => ({
      packetBytes: 40,
      failure: "opus: ffmpeg did not start",
      write: () => {},
      end: () => {},
      take: () => new Uint8Array(0),
      close: () => {},
    }),
  };
  const harness = channel(() => frame("Streams", h(Streams, {})), failing);
  harness.join(1, PAGE);
  harness.press(1, Key.Enter);
  harness.press(1, "x");
  assert.match(text(harness.own(1, PAGE), BODY_ROW), /failed: opus: ffmpeg did not start/u);
});
