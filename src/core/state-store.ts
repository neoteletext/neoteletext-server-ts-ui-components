// What a channel keeps across a restart of its program (REQ-1057), in a
// SQLite database of its own through Node's built-in node:sqlite: what
// every viewer shares, by name, and what one viewer owns, by their handle
// and a name (viewer-state.md VS-405), never by a connection's number,
// which the server gives again after it restarts. Each value is plain JSON
// with a schema version; a value of another version is dropped when it is
// read, so a program that changes a value's shape raises its version and
// starts it afresh. A component's kept state (REQ-1058), a poll's ballot
// and a viewer's language are each one viewer's value.
//
// Every read-modify-write is one transaction begun with BEGIN IMMEDIATE
// (VS-406), so that two tabs of one viewer, or a crash between two writes,
// never leave a count and a ballot that disagree.
//
// The store on SQLite is sqlite-state-store.ts; here are what every store
// is, its bounds, and the checks of what is kept.

/** A day, in milliseconds. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** How long the values of a viewer who is not remembered are kept after they were last read or written: VS-405's `VISIT_VALUE_IDLE_MS`, the 24 hours DEC-6471 adopted (viewer-state.md open question Q2). */
export const VISIT_VALUE_IDLE_MS = DAY_MS;

/** How long a remembered viewer's values are kept after they were last read or written: VS-405's `REMEMBERED_VALUE_IDLE_MS`, the remembered key's idle limit of 180 days (VS-107). */
export const REMEMBERED_VALUE_IDLE_MS = 180 * DAY_MS;

/**
 * The most viewers' values kept at once: the most viewers the server holds
 * for a channel, `MOST_VIEWERS_PER_CHANNEL` (VS-303), DEC-2463 item 6's
 * bound, now counted by handle (VS-405). Past it the values read or
 * written longest ago go first: anyone who connects can be given a handle,
 * so their number is the outside world's to choose, and the file must not
 * grow with it.
 */
export const MOST_VIEWER_VALUES = 262_144;

/** The longest a viewer's value may be as JSON, in UTF-16 code units: with MOST_VIEWER_VALUES, the file holds at most about a gigabyte of them (DEC-2463 item 6). */
export const MOST_VIEWER_VALUE_LENGTH = 8192;

/** The longest a shared value may be as JSON: the channel's own records, such as a guestbook, written by the program and few. */
export const MOST_SHARED_VALUE_LENGTH = 1024 * 1024;

/** The longest name a value is kept under. */
export const MOST_NAME_LENGTH = 200;

/** A viewer's handle: 32 lower-case hexadecimal digits (VS-305; the schema's Handle). */
const HANDLE = /^[0-9a-f]{32}$/u;

/** A viewer as the store keeps their values: their handle, and whether they chose to be remembered, which says how long their values last. */
export interface KeptViewer {
  readonly handle: string;
  readonly remembered: boolean;
}

/** What is kept where, as a channel's application and its components reach it. */
export interface StateStore {
  /** The shared value kept under `name` at `version`, or undefined: none, or one of another version, which is dropped. */
  shared(name: string, version: number): unknown;
  /** Keeps `value` under `name` at `version`, for every viewer. */
  keepShared(name: string, version: number, value: unknown): void;
  /** The value `viewer` has kept under `name` at `version`, or undefined: none, one past its idle limit or one of another version, which is dropped. Reading it renews it. */
  ofViewer(viewer: KeptViewer, name: string, version: number): unknown;
  /** Keeps `value` for `viewer` under `name` at `version`. */
  keepForViewer(viewer: KeptViewer, name: string, version: number, value: unknown): void;
  /** Reads `viewer`'s value under `name` at `version`, gives it to `change` and keeps what `change` answers, in one transaction (VS-406); answers what was kept. */
  update(viewer: KeptViewer, name: string, version: number, change: (kept: unknown) => unknown): unknown;
  /** Runs `work` in one transaction: every read and write it makes of the store happens together or not at all (VS-406). */
  atomically<Result>(work: () => Result): Result;
  /** Deletes every value kept for the viewer of `handle`: at their end of state (VS-409). */
  forgetViewer(handle: string): void;
  /** Deletes every viewer's values: every handle is void (VS-306). */
  forgetViewers(): void;
}

/** How a store is opened. */
export interface StateStoreOptions {
  /** The real time, in milliseconds since the Unix epoch: Date.now when absent; a test gives its own. */
  readonly now?: () => number;
}

export function checkName(name: string): void {
  if (name.length === 0 || name.length > MOST_NAME_LENGTH) {
    throw new RangeError(`a kept value's name is 1 to ${MOST_NAME_LENGTH} characters, not ${name.length}`);
  }
}

export function checkVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new RangeError(`a kept value's version is a whole number from 0, not ${version}`);
  }
}

export function checkHandle(handle: string): void {
  if (!HANDLE.test(handle)) {
    throw new RangeError("a viewer's handle is 32 lower-case hexadecimal digits");
  }
}

/** How long a viewer's values last after their last use. */
export function idleOf(remembered: boolean): number {
  return remembered ? REMEMBERED_VALUE_IDLE_MS : VISIT_VALUE_IDLE_MS;
}

/** `value` as JSON, refused when it is longer than `most`. */
export function jsonOf(value: unknown, most: number): string {
  const text = JSON.stringify(value);
  // JSON.stringify answers undefined for undefined, a function or a symbol: none of them is JSON.
  if (typeof text !== "string") {
    throw new TypeError("a kept value is plain JSON: undefined, a function or a symbol is not");
  }
  if (text.length > most) {
    throw new RangeError(`a kept value is at most ${most} characters as JSON, not ${text.length}`);
  }
  return text;
}

/** The JSON read back, or undefined when the file holds something that is not: dropped as though another version. */
export function parsed(text: unknown): unknown {
  if (typeof text !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** A row's whole-number column, which a STRICT table holds as an INTEGER. */
export function integerOf(row: Record<string, unknown> | undefined, column: string): number | null {
  const value = row?.[column];
  return typeof value === "number" ? value : null;
}
