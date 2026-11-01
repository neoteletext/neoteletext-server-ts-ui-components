// What a viewer's address said beyond the page reaches a channel's components:
// the parameters of what they selected, the one kind there is (DEC-1730), left
// behind with the selection they came with.

import assert from "node:assert/strict";
import { test } from "node:test";

import { ANY_SUB } from "neoteletext-server-ts-protocol";
import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { Component, ComponentChannel, type Element, Frame, h, type PageSpec } from "../src/index.ts";
import { Colour } from "../src/kit.ts";

const PAGE = 0x150;
const OTHER = 0x151;

function frame(title: string, ...body: Element[]): Element {
  return h(Frame, { title, background: Colour.Blue }, ...body);
}

function channel(specs: readonly PageSpec[]): Harness {
  return new Harness([new ComponentChannel(specs, { opus: fakeOpus() })]);
}

test("a component reads the query of the viewer's selection as its parameters, and hears when they change", () => {
  const read: unknown[] = [];
  class Reader extends Component {
    override componentDidMount(): void {
      const { session } = this.services;
      if (session !== null) {
        read.push(this.services.parameters(session));
        this.services.bus.on("parameters", ({ parameters }) => {
          read.push(parameters);
        });
      }
    }
  }
  const harness = channel([
    { page: PAGE, title: "Reader", perViewer: true, root: (): Element => frame("Reader", h(Reader, {})) },
    { page: OTHER, title: "Other", root: (): Element => frame("Other") },
  ]);
  harness.join(1, OTHER);
  read.length = 0;
  harness.open(1, PAGE, ANY_SUB, "a=1&b=%20x");
  harness.open(1, PAGE, ANY_SUB, "a=2");
  assert.deepEqual(read, ["a=1&b=%20x", "a=2"]);
});

test("a program that starts again gives a component the parameters of the connection's selection", () => {
  const read: unknown[] = [];
  class Reader extends Component {
    override componentDidMount(): void {
      const { session } = this.services;
      if (session !== null) {
        read.push(this.services.parameters(session));
      }
    }
  }
  const harness = channel([{ page: PAGE, title: "Reader", perViewer: true, root: (): Element => frame("Reader", h(Reader, {})) }]);
  read.length = 0;
  harness.channel.connected(1, 1, 1, { page: PAGE, sub: ANY_SUB }, [], "150", "a=1");
  assert.deepEqual(read, ["a=1"]);
});

test("a component has one kind of parameter: services ask for no query of the viewer's", () => {
  let services: object | undefined;
  class Reader extends Component {
    override componentDidMount(): void {
      services = this.services;
    }
  }
  const harness = channel([{ page: PAGE, title: "Reader", root: (): Element => frame("Reader", h(Reader, {})) }]);
  harness.join(1, PAGE);
  assert.ok(services !== undefined && "parameters" in services);
  assert.equal("query" in services, false);
});

test("a viewer's own query, coming after a redirect's params, is what the page shows", () => {
  const roots: unknown[] = [];
  class Sender extends Component {
    override componentDidMount(): void {
      const { session } = this.services;
      if (session !== null) {
        this.services.redirect(session, PAGE, { article: 7 });
      }
    }
  }
  const harness = channel([
    { page: OTHER, title: "Other", perViewer: true, root: (): Element => frame("Other", h(Sender, {})) },
    {
      page: PAGE,
      title: "Reader",
      perViewer: true,
      root: (params): Element => {
        roots.push(params?.["article"]);
        return frame("Reader");
      },
    },
  ]);
  harness.join(1, OTHER);
  harness.open(1, PAGE);
  assert.equal(roots.at(-1), 7);
  harness.open(1, PAGE, ANY_SUB, "article=9");
  assert.equal(roots.at(-1), "9");
});

test("the parameters of a page a viewer has left are gone when they come back without them", () => {
  const read: unknown[] = [];
  class Reader extends Component {
    override componentDidMount(): void {
      const { session } = this.services;
      if (session !== null) {
        read.push(this.services.parameters(session));
      }
    }
  }
  const harness = channel([
    { page: PAGE, title: "Reader", perViewer: true, root: (): Element => frame("Reader", h(Reader, {})) },
    { page: OTHER, title: "Other", root: (): Element => frame("Other") },
  ]);
  harness.join(1, OTHER);
  read.length = 0;
  harness.open(1, PAGE, ANY_SUB, "a=1");
  harness.open(1, OTHER);
  harness.open(1, PAGE);
  assert.deepEqual(read, ["a=1", null]);
});

test("TODO-1731 item 6: a viewer's query reaches the root of a page that keeps a copy for each viewer, and goes with its selection", () => {
  const made: unknown[] = [];
  const harness = channel([
    {
      page: PAGE,
      title: "Reader",
      perViewer: true,
      keepWhileAway: true,
      root: (params): Element => {
        made.push(params?.["article"] ?? null);
        return frame("Reader");
      },
    },
    { page: OTHER, title: "Other", root: (): Element => frame("Other") },
  ]);
  harness.join(1, OTHER);
  made.length = 0;
  harness.open(1, PAGE, ANY_SUB, "article=5");
  assert.deepEqual(made.at(-1), "5", "made with the query, before the page opens");
  harness.open(1, PAGE, ANY_SUB, "article=6");
  assert.deepEqual(made.at(-1), "6", "the same page with another query shows it at once");
  made.length = 0;
  harness.open(1, PAGE, ANY_SUB, "article=6");
  assert.equal(made.length, 0, "the same query again is not made again");
  harness.open(1, PAGE);
  assert.deepEqual(made.at(-1), null, "no query leaves behind what a query gave");
});

test("TODO-1731 item 6: a selection with no query keeps what a redirect's params gave", () => {
  const made: unknown[] = [];
  class Sender extends Component {
    override componentDidMount(): void {
      const { session } = this.services;
      if (session !== null) {
        this.services.redirect(session, PAGE, { article: 7 });
      }
    }
  }
  const harness = channel([
    {
      page: PAGE,
      title: "Reader",
      perViewer: true,
      root: (params): Element => {
        made.push(params?.["article"] ?? null);
        return frame("Reader");
      },
    },
    { page: OTHER, title: "Other", perViewer: true, root: (): Element => frame("Other", h(Sender, {})) },
  ]);
  harness.join(1, OTHER);
  made.length = 0;
  harness.open(1, PAGE);
  assert.deepEqual(made.at(-1), 7);
});
