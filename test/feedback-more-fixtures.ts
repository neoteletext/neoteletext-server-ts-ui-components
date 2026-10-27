// What the tests of the stopwatch, large text, metric cards, task lists,
// progress lists, loading and skeletons share: a viewer's page, its rows,
// the clock, and the components a loading test loads.

import assert from "node:assert/strict";

import { type Harness, text } from "neottx-server-ts-protocol/testing";
import { type BigDigits, type BigText, type Child, Columns, Component, type Element, h, type KeyEvent, Loading, type TextEvent, Text } from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";
import { BODY_ROW, frame, harness, PAGE } from "./components-fixtures.ts";

/** A page for one viewer of `body`, joined. */
export function viewer(...body: Child[]): Harness {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: (): Element => frame("Test", ...body) }]);
  seen.join(1, PAGE);
  return seen;
}

/** `count` rows of the body as the viewer sees them, from `from`, after asserting the channel reported no failure. */
export function drawn(seen: Harness, count: number, from = 0): string[] {
  assert.deepEqual(seen.errors, [], "the channel reported no failure");
  return Array.from({ length: count }, (_, row) => text(seen.seen(1, PAGE).rows, BODY_ROW + from + row));
}

/** The codes of a body row as the viewer sees them. */
export function codes(seen: Harness, row: number): readonly number[] {
  return seen.seen(1, PAGE).rows[BODY_ROW + row] ?? [];
}

/** Runs the clock on by `by` milliseconds, every timer due on the way running. */
export function wait(seen: Harness, by: number): void {
  seen.runUntil(seen.now + by);
}

/** The large rows of `shown`, drawn by large text or large digits in green in `width` cells, for comparing the two. */
export function large(type: typeof BigText | typeof BigDigits, shown: string, width: number | null = null): string[] {
  // A stack gives each child its whole width; columns give it the width asked for.
  return drawn(viewer(h(Columns, { widths: [width] }, h(type, { text: shown, foreground: Colour.Green }))), 3);
}

/** Every mount of an Arrival, and the keys and text it and its page were given. */
export const heard: string[] = [];

/** What arrives once loaded: it says each mount and each key it takes. */
class Arrival extends Component {
  override focusable(): boolean {
    return true;
  }

  override componentDidMount(): void {
    heard.push("mounted");
  }

  override onKey(event: KeyEvent): boolean {
    if (event.action === "release") {
      return false;
    }
    heard.push(`arrival ${event.key}`);
    return true;
  }

  override render(): Child {
    return h(Text, { text: "arrived" });
  }
}

/** A page that loads an Arrival until Home, a key that is not typing, hearing what reaches it. */
export class Loader extends Component<{ readonly skeleton?: boolean }, { readonly loading: boolean }> {
  override state = { loading: true };

  override onKey(event: KeyEvent): boolean {
    if (event.action === "release") {
      return false;
    }
    heard.push(`page ${event.key}`);
    if (event.key === Key.Home) {
      this.setState({ loading: !this.state.loading });
      return true;
    }
    return false;
  }

  override onText(event: TextEvent): boolean {
    heard.push(`page text ${event.text}`);
    return true;
  }

  override render(): Child {
    return h(Loading, { loading: this.state.loading, ...(this.props.skeleton === true ? { skeleton: { rows: 2 } } : {}) }, h(Arrival, {}));
  }
}
