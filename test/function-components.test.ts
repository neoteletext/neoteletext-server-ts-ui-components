// Function components, as React's: a function of its props that renders,
// kept in the tree where it renders in the same place, given its new props
// as its parent renders again, and its children. A frame takes up to four
// Fastext prompts, the rest of row 24 left empty.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, shows, text } from "neottx-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, type Element, Frame, h, type KeyEvent, type PageSpec, Rows, Text } from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x150;

function harness(specs: readonly PageSpec[]): Harness {
  return new Harness([new ComponentChannel(specs)]);
}

/** A greeting: a function component, which keeps nothing of its own. */
function Greeting({ name, children }: Readonly<{ readonly name: string; readonly children?: readonly Child[] }>): Child {
  return [h(Text, { text: `Hello, ${name}` }), ...(children ?? [])];
}

/** A counter that renders a greeting with its count: a parent with state, rendering a function component again. */
class Counter extends Component<object, { readonly count: number }> {
  override state = { count: 0 };

  override render(): Child {
    return h(Rows, {}, h(Greeting, { name: `viewer ${this.state.count}` }));
  }

  override focusable(): boolean {
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (event.action === "press") {
      this.setState({ count: this.state.count + 1 });
    }
    return true;
  }
}

test("a function component draws what it renders from its props, and its children", () => {
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element => h(Frame, { title: "Greeting", background: Colour.Blue }, h(Greeting, { name: "world" }, h(Text, { text: "and welcome" }))),
    },
  ]);
  assert.ok(shows(seen.shared(PAGE), "Hello, world"));
  assert.ok(shows(seen.shared(PAGE), "and welcome"));
});

test("a function component is given its new props when its parent renders again", () => {
  const seen = harness([
    { page: PAGE, title: "Test", perViewer: true, root: (): Element => h(Frame, { title: "Counter", background: Colour.Blue }, h(Counter, {})) },
  ]);
  seen.join(1, PAGE);
  assert.ok(shows(seen.seen(1, PAGE).rows, "Hello, viewer 0"));
  seen.press(1, Key.Enter);
  seen.press(1, Key.Enter);
  assert.ok(shows(seen.seen(1, PAGE).rows, "Hello, viewer 2"));
});

test("a function component's props are checked as a class's are", () => {
  // @ts-expect-error -- name is a string
  const wrong = h(Greeting, { name: 7 });
  assert.equal(wrong.type, Greeting);
});

/** Row 24 of a frame given `prompts`. */
function promptRow(prompts: readonly (readonly [string, number | null])[]): string {
  return text(harness([{ page: PAGE, title: "Test", root: (): Element => h(Frame, { title: "Prompts", background: Colour.Blue, prompts }) }]).shared(PAGE), 24);
}

test("a frame takes fewer than four prompts, the rest of row 24 empty, as four with empty labels draw it", () => {
  assert.equal(
    promptRow([["Index", 0x100]]),
    promptRow([
      ["Index", 0x100],
      ["", null],
      ["", null],
      ["", null],
    ]),
  );
  assert.match(promptRow([["Index", 0x100]]), /Index/u);
  assert.equal(promptRow([]), promptRow([["", null]]));
});
