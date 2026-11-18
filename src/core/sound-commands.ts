// The commands the library sends a viewer's receiver for its sounds, as the
// protocol's generated members write them (typescript.md TS-19): every field
// the schema requires is given, with the library's choice for what it never
// varies (no fade, no ducking, no loop, never queued after another sound).

import { pageText } from "../kit.ts";
import type { SoundGainMember, SoundPlayMember, SoundStopMember } from "neoteletext-server-ts-protocol/protocol";

/** The loudest gain: the maximum of `gain` in the schema's play and gain members (schema-13.json). */
export const FULL_GAIN = 100;

/** The library fades nothing in or out: the receiver's own short ramp is enough for a chime or a stream. */
const NO_FADE_MS = 0;

/** The library ducks nothing under its sounds: 0, the schema's least. */
const NO_DUCK = 0;

/** Plays the sound under `handle` at `generation` on `channel`, bound to `page`, at `gain`. */
export function playMember(channel: number, handle: number, generation: number, page: number, gain: number = FULL_GAIN): SoundPlayMember {
  return { kind: "play", channel, handle, generation, page: pageText(page), gain, fade_ms: NO_FADE_MS, loop: false, after: false, duck: NO_DUCK };
}

/** Stops what `channel` plays. */
export function stopMember(channel: number): SoundStopMember {
  return { kind: "stop", channel, fade_ms: NO_FADE_MS };
}

/** Sets how loud `channel` plays. */
export function gainMember(channel: number, gain: number): SoundGainMember {
  return { kind: "gain", channel, gain, fade_ms: NO_FADE_MS };
}
