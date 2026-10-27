// What the controls tests share: their pages, helpers and test components.

import assert from "node:assert/strict";

import { Harness } from "neottx-server-ts-protocol/testing";
import {
  Button,
  type Canvas,
  type Child,
  Component,
  ComponentChannel,
  controlLines,
  type Element,
  Frame,
  h,
  type HoverEvent,
  type PageSpec,
  type PointerEvent,
  readControls,
  readDeclarations,
  type Size,
} from "../src/index.ts";
import { Colour } from "../src/kit.ts";

export const PAGE = 0x150;

export const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** The frame's first body row. */
export const BODY_ROW = 3;

export function frame(title: string, ...body: Child[]): ReturnType<typeof h> {
  return h(Frame, { title, background: Colour.Blue, prompts: PROMPTS }, ...body);
}

/** The TTI of the copy of `page` viewer 1 sees: its own while it has one, else the channel's (a viewer's copy that comes to match the channel's is released, not published again). */
export function latestTti(channel: Harness, page: number): string {
  const ofPage = channel.sent.filter((message) => Number.parseInt(String(message["page"]), 16) === page);
  const own = ofPage.findLast(
    (message) => (message["type"] === "publish" || message["type"] === "release") && message[message["type"] === "publish" ? "owner" : "session"] === 1,
  );
  const seen = own?.["type"] === "publish" ? own : ofPage.findLast((message) => message["type"] === "publish" && message["owner"] === "channel");
  assert.ok(seen !== undefined, `page ${page.toString(16)} was published`);
  return String(seen["tti"]);
}

/** The controls of the first sub-page of the latest copy of `page`. */
export function controlsOf(channel: Harness, page: number): ReturnType<typeof readControls>[number] {
  return readControls(latestTti(channel, page))[0] ?? [];
}

/** The pointer areas of the first sub-page of the latest copy of `page`. */
export function areasOf(channel: Harness, page: number): ReturnType<typeof readDeclarations>[number]["pointer"] {
  return readDeclarations(latestTti(channel, page))[0]?.pointer ?? { areas: [], wholePage: false };
}

/** Boxes in reading order, top to bottom and left to right. */
export function inOrder<T extends { row: number; column: number }>(boxes: readonly T[]): T[] {
  return boxes.toSorted((a, b) => a.row - b.row || a.column - b.column);
}

export function harness(specs: readonly PageSpec[]): Harness {
  return new Harness([new ComponentChannel(specs)]);
}

/** One viewer's page, every component its own. */
export function viewer(...body: Child[]): Harness {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: (): Element => frame("Test", ...body) }]);
  seen.join(1, PAGE);
  return seen;
}

export const lines = controlLines([
  { row: 4, column: 20, width: 10, height: 2 },
  { row: 4, column: 2, width: 6, height: 1 },
]);

/** A component that declares a pointer area, or the whole page, and keeps what reaches it. */
export class Watcher extends Component<{ readonly whole?: boolean; readonly seen: string[] }> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(4, space.height) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.whole === true) {
      canvas.wholePagePointerArea();
    } else {
      canvas.pointerArea(1, 2, 5, 2);
    }
  }

  override onPointer(event: PointerEvent): boolean {
    this.props.seen.push(`${event.action} ${event.buttons} ${event.local.row},${event.local.column}`);
    return true;
  }
}

export const week = (row: number, from: number): { row: number; column: number; width: number; height: number }[] =>
  Array.from({ length: 7 - from }, (_, day) => ({ row, column: 4 * (from + day) + 1, width: 3, height: 1 }));

/** Hears every hover that comes up from the components under it. */
export class HoverWatcher extends Component<{ readonly seen: string[] }> {
  override onHover(event: HoverEvent): boolean {
    this.props.seen.push(`${event.entered ? "enter" : "leave"} ${event.row},${event.column}`);
    return false;
  }
}

/** The thirteen triplet values of a packed OL line. */
export function lineTriplets(line: string): number[] {
  const codes = Array.from(line.slice(line.indexOf(",", 3) + 1), (character) => (character.codePointAt(0) ?? 0) & 0x3f);
  const [, ...body] = codes;
  return Array.from({ length: 13 }, (_, index) => (body[3 * index] ?? 0) | ((body[3 * index + 1] ?? 0) << 6) | ((body[3 * index + 2] ?? 0) << 12));
}

/** `count` bits from bit `start` of a packet's stream of triplet bits. */
export function streamBits(triplets: readonly number[], start: number, count: number): number {
  let value = 0;
  for (let offset = 0; offset < count; offset += 1) {
    const position = start + offset;
    value |= (((triplets[Math.floor(position / 18)] ?? 0) >> (position % 18)) & 1) << offset;
  }
  return value;
}

export const button = (): ReturnType<typeof h> => frame("Test", h(Button, { label: "press", onPress: () => {} }));
