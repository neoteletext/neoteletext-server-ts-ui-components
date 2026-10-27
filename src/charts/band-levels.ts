// How loud a sound is in each of a number of bands of frequency around a
// moment of it, for a spectrum (spectrum.ts) to show as it plays. The bands
// are spaced evenly in pitch, as hearing is, from the bottom of hearing to
// half the sample rate, the highest frequency the samples hold (Nyquist).
// Each band's level is the Goertzel algorithm's at the band's middle, over
// a Hann-windowed run of samples as long as puts the band's edges a bin of
// the filter either side of it, so a tone reads most in the band it is in,
// and a tone on an edge reads alike in the two bands it divides. The run
// is never longer than MOST_WINDOW, so the work is bounded whatever the
// rate; the lowest bands, narrower than that run can tell apart, then
// share a tone with their neighbours. A level is the loudness in decibels below full scale, from
// silence at nought to a full-scale tone at one.

import { COLUMNS, SIXELS_ACROSS } from "../kit.ts";

/** The lowest band's lower edge: the bottom of human hearing. */
const LOWEST_HZ = 20;
/** The most samples a band's Goertzel runs over: at 8 kHz a quarter of a second, and bands × this bounds the work. */
const MOST_WINDOW = 2_048;
/** The most bands: one to a column of sixels across a page, the finest a spectrum can show them. */
const MOST_BANDS = COLUMNS * SIXELS_ACROSS;
/** A sample's full scale: a 16-bit sample's magnitude. */
const FULL_SCALE = 2 ** 15;
/** The quietest level shown, in decibels below full scale; anything quieter is nought. */
const RANGE_DB = 60;
/** Decibels of an amplitude ratio: twenty times its common logarithm. */
const DB_PER_DECADE = 20;
/**
 * A band's half-width in its filter's bins (the rate over the run's
 * length): a Hann window reads a tone a bin off its middle, at the band's
 * edge, at half, and two bins off at nought; the next band's middle, the
 * next band being wider, is further off than that.
 */
const HALF_BAND_BINS = 1;
const TURN = 2 * Math.PI;

/** `count` as a whole number of bands from nought to the most: one that is not a number is none. */
function bandCount(count: number): number {
  return Number.isNaN(count) ? 0 : Math.max(0, Math.min(MOST_BANDS, Math.trunc(count)));
}

/**
 * The edges of `bands` bands of the samples at `rate` Hz, lowest first, one
 * more than the bands: evenly spaced in pitch from LOWEST_HZ, or from half
 * the Nyquist frequency at a rate too low for that, to the Nyquist
 * frequency. None for a rate that is not a positive number.
 */
export function bandEdges(rate: number, bands: number): number[] {
  const count = bandCount(bands);
  if (!Number.isFinite(rate) || rate <= 0 || count === 0) {
    return [];
  }
  const nyquist = rate / 2;
  const lowest = Math.min(LOWEST_HZ, nyquist / 2);
  return Array.from({ length: count + 1 }, (_, edge) => lowest * (nyquist / lowest) ** (edge / count));
}

/** The amplitude of `frequency` in `samples` from `from` to before `to`, Hann-windowed, by the Goertzel algorithm: a full-scale sine there reads FULL_SCALE. */
function goertzel(samples: Int16Array, from: number, to: number, frequency: number, rate: number): number {
  const length = to - from;
  const coefficient = 2 * Math.cos((TURN * frequency) / rate);
  let previous = 0;
  let before = 0;
  let windowSum = 0;
  for (let index = 0; index < length; index += 1) {
    // The window's middle-of-sample form, never nought throughout, so even one sample is weighed.
    const weight = (1 - Math.cos((TURN * (index + 0.5)) / length)) / 2;
    windowSum += weight;
    const next = (samples[from + index] ?? 0) * weight + coefficient * previous - before;
    before = previous;
    previous = next;
  }
  const power = previous * previous + before * before - coefficient * previous * before;
  // A sine of amplitude A gives a magnitude of A times half the window's sum.
  return windowSum > 0 ? (2 * Math.sqrt(Math.max(0, power))) / windowSum : 0;
}

/**
 * The level, nought to one, of each of `bands` bands of `samples` at `rate`
 * Hz around the sample `at`: each band's run of samples is centred there,
 * or as near as the sound's ends allow, and is the whole sound when the
 * sound is shorter. Every level is nought for no samples, and there
 * are no levels for a rate or a count of bands that is not a positive
 * number.
 */
export function bandLevels(samples: Int16Array, rate: number, at: number, bands: number): number[] {
  const edges = bandEdges(rate, bands);
  const centre = Number.isFinite(at) ? Math.max(0, Math.min(samples.length, Math.trunc(at))) : 0;
  return edges.slice(1).map((high, band) => {
    const low = edges[band] ?? high;
    const window = Math.max(1, Math.min(MOST_WINDOW, Math.round(rate / ((high - low) / (2 * HALF_BAND_BINS)))));
    const from = Math.max(0, Math.min(samples.length - window, centre - Math.floor(window / 2)));
    const to = Math.min(samples.length, from + window);
    if (to <= from) {
      return 0;
    }
    // The band's middle in hertz: its edges are then a bin either side, where it and the next read a tone alike.
    const amplitude = goertzel(samples, from, to, (low + high) / 2, rate);
    const decibels = DB_PER_DECADE * Math.log10(amplitude / FULL_SCALE);
    return Math.max(0, Math.min(1, 1 + decibels / RANGE_DB));
  });
}
