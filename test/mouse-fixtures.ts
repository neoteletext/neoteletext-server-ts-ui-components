// What the mouse tests share: their pages, helpers and test components.

import assert from "node:assert/strict";

import { Harness, text } from "neoteletext-server-ts-protocol/testing";
import { Action, type Box, type Child, Component, ComponentChannel, type Element, Frame, h, type PageSpec, readControls } from "../src/index.ts";
import { Colour } from "../src/kit.ts";

export const PAGE = 0x150;

const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** The frame's first body row, and the hint row. */
export const BODY_ROW = 3;

export const HINT_ROW = 23;

/** One notch of the wheel, down (INPUT.md section 5.4). */
export const NOTCH = 120;

function harness(specs: readonly PageSpec[]): Harness {
  return new Harness([new ComponentChannel(specs)]);
}

/** One viewer's page of `body`, every component its own. */
export function viewer(...body: Child[]): Harness {
  const seen = harness([
    { page: PAGE, title: "Test", perViewer: true, root: (): Element => h(Frame, { title: "Test", background: Colour.Blue, prompts: PROMPTS }, ...body) },
  ]);
  seen.join(1, PAGE);
  return seen;
}

/** The controls of the copy of the page the viewer sees, in reading order: its own while it has one, else the channel's, as Harness.seen reads the rows. */
export function controls(page: Harness): Box[] {
  const ofPage = page.sent.filter((message) => Number.parseInt(String(message["page"]), 16) === PAGE);
  const own = ofPage.findLast(
    (message) => (message["type"] === "publish" || message["type"] === "release") && message[message["type"] === "publish" ? "owner" : "session"] === 1,
  );
  const seen = own?.["type"] === "publish" ? own : ofPage.findLast((message) => message["type"] === "publish" && message["owner"] === "channel");
  assert.ok(seen !== undefined, "the page was published");
  return (readControls(String(seen["tti"]))[0] ?? []).toSorted((a, b) => a.row - b.row || a.column - b.column);
}

/** The row `row` of the viewer's page as text. */
export function row(page: Harness, at: number): string {
  return text(page.seen(1, PAGE).rows, at);
}

/** The control over the first cell of `words` where the page shows them (a row's text is a character a cell). */
export function controlBy(page: Harness, words: string): Box {
  const found = controls(page).find((control) => {
    const at = row(page, control.row).indexOf(words);
    return at >= control.column && at < control.column + control.width;
  });
  assert.ok(found !== undefined, `a control over "${words}"`);
  return found;
}

/** Runs the clock on by `by`, waking the channel at each time it asked for. */
export function wait(page: Harness, by: number): void {
  page.runUntil(page.now + by);
}

export function click(page: Harness, control: Box): void {
  page.clickLeft(1, control.column, control.row);
}

export const enterAndLeave = (page: Harness, control: Box): void => {
  page.hover(1, "enter", control.column, control.row);
  page.hover(1, "leave", control.column, control.row);
};

/** An action that raises a toast for its viewer, as any component sends one on the bus. */
export class RaiseToast extends Component {
  override render(): Child {
    return h(Action, {
      text: "raise",
      onPress: (session: number) => {
        this.services.bus.emit("toast", { kind: "info", text: "Saved" }, { session });
      },
    });
  }
}
