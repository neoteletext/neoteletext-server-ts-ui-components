// What the keys do in a player (audio-player.ts): the arrows seek and set
// the volume, a keyboard's letters do the rest, as terminal players' do,
// and the digits, when it takes them, jump to a tenth of the way; and the
// words that say so in a page's KeyHelp.

import { isPress, type KeyEvent } from "../core/events.ts";
import { digitOf } from "../core/keys.ts";
import type { KeyHelpEntry } from "../core/key-bindings.ts";
import { Key } from "../kit.ts";

/** How far one press of a volume key moves the gain. */
const VOLUME_STEP = 10;

/** What a player does at a key's bidding; each answers whether it did anything. */
export interface PlayerCommands {
  seek(direction: 1 | -1): boolean;
  /** To `digit` tenths of the way. */
  jump(digit: number): boolean;
  volume(step: number): boolean;
  mute(): boolean;
  playPause(): boolean;
  stop(): boolean;
  previous(): boolean;
  next(): boolean;
  repeat(): boolean;
  shuffle(): boolean;
  /** One speed faster (1) or slower (-1). */
  speed(step: 1 | -1): boolean;
  /** The A–B loop: from here, to here, off. */
  loop(): boolean;
  /** The sleep timer's next setting. */
  sleep(): boolean;
  /** The track at the list's choice: out of the queue, up or down one, next to play. */
  remove(): boolean;
  move(step: 1 | -1): boolean;
  playNext(): boolean;
}

/** What a keyboard's keys do in a player, for a page's KeyHelp (frame/key-help.ts). */
export const PLAYER_KEYS: readonly KeyHelpEntry[] = [
  ["Left Right", "seek back, on"],
  ["Up Down", "volume (on a button)"],
  ["p", "play or pause"],
  ["s", "stop"],
  ["< >", "previous, next track"],
  ["+ -", "volume"],
  ["m", "mute"],
  ["r", "repeat off, all, one"],
  ["z", "shuffle"],
  ["[ ]", "slower, faster"],
  ["l", "loop from, to, off"],
  ["t", "sleep 15, 30, 60, off"],
  ["x or Delete", "take out of the queue"],
  ["K J", "move up, down the queue"],
  [".", "play next"],
  ["0 to 9", "jump to a tenth"],
];

/** The keys every player takes, and those only a player of tracks does. */
function keyTable(commands: PlayerCommands, hasTracks: boolean): Readonly<Record<string, () => boolean>> {
  const always: Record<string, () => boolean> = {
    [Key.Left]: () => commands.seek(-1),
    [Key.Right]: () => commands.seek(1),
    [Key.Up]: () => commands.volume(VOLUME_STEP),
    [Key.Down]: () => commands.volume(-VOLUME_STEP),
    "+": () => commands.volume(VOLUME_STEP),
    "-": () => commands.volume(-VOLUME_STEP),
    m: () => commands.mute(),
    p: () => commands.playPause(),
    s: () => commands.stop(),
    "[": () => commands.speed(-1),
    "]": () => commands.speed(1),
    l: () => commands.loop(),
    t: () => commands.sleep(),
  };
  if (!hasTracks) {
    return always;
  }
  return {
    ...always,
    "<": () => commands.previous(),
    ">": () => commands.next(),
    r: () => commands.repeat(),
    z: () => commands.shuffle(),
    x: () => commands.remove(),
    [Key.Delete]: () => commands.remove(),
    K: () => commands.move(-1),
    J: () => commands.move(1),
    ".": () => commands.playNext(),
  };
}

/** What a player takes: whether it has tracks, and whether the digits are its. */
export interface PlayerKeys {
  readonly hasTracks: boolean;
  readonly digits: boolean;
}

/** Does what `event` asks of a player; answers whether it took the key. */
export function playerKey(event: KeyEvent, commands: PlayerCommands, keys: PlayerKeys): boolean {
  const digit = digitOf(event);
  if (keys.digits && digit !== null) {
    return commands.jump(digit);
  }
  const table = keyTable(commands, keys.hasTracks);
  const command = Object.hasOwn(table, event.key) && isPress(event, event.key) ? table[event.key] : undefined;
  return command?.() ?? false;
}
