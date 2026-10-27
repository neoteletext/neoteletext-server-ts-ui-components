// A stream played faster or slower keeps its pitch, is as long as its
// speed makes it, and is made as far as its input is known.

import assert from "node:assert/strict";
import { test } from "node:test";

import { type StreamSource, stretched, tone } from "../src/index.ts";

const RATE = 8_000;
const PITCH = 440;

function source(samples: Int16Array, complete = true): StreamSource {
  return { name: "tone", rate: RATE, samples: () => samples, complete, failure: null, expected: samples.length };
}

/** All of a source's samples, asking until it says it is complete. */
function drain(stretchedSource: StreamSource): Int16Array {
  let samples = stretchedSource.samples();
  while (!stretchedSource.complete) {
    samples = stretchedSource.samples();
  }
  return samples;
}

/** The frequency of `samples`, from how often they cross zero going up. */
function frequency(samples: Int16Array): number {
  let crossings = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if ((samples[index - 1] ?? 0) < 0 && (samples[index] ?? 0) >= 0) {
      crossings += 1;
    }
  }
  return (crossings * RATE) / samples.length;
}

test("at 1.5 times a tone keeps its pitch and lasts two thirds as long", () => {
  const input = tone(PITCH, 2_000);
  const output = drain(stretched(source(input), 1.5));
  assert.ok(Math.abs(output.length - input.length / 1.5) < RATE / 10, `length ${output.length}`);
  assert.ok(Math.abs(frequency(output) - PITCH) < PITCH / 20, `pitch ${frequency(output)}`);
});

test("at half speed a tone keeps its pitch and lasts twice as long", () => {
  const input = tone(PITCH, 1_000);
  const output = drain(stretched(source(input), 0.5));
  assert.ok(Math.abs(output.length - input.length * 2) < RATE / 10, `length ${output.length}`);
  assert.ok(Math.abs(frequency(output) - PITCH) < PITCH / 20, `pitch ${frequency(output)}`);
});

test("at speed 1 the source is itself; an input still being decoded is waited for", () => {
  const whole = source(tone(PITCH, 500));
  assert.equal(stretched(whole, 1), whole);
  const partial = stretched(source(new Int16Array(10), false), 2);
  assert.equal(partial.samples().length, 0);
  assert.equal(partial.complete, false);
});
