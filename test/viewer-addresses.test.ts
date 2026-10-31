// What a viewer's address said beyond the page reaches a channel's components:
// the query of the address they opened and the page parameters of what they
// selected, the second left behind with the selection it came with.

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

test("a component reads the viewer's query and page parameters, and hears when they change", () => {
  const read: unknown[] = [];
  class Reader extends Component {
    override componentDidMount(): void {
      const { session } = this.services;
      if (session !== null) {
        read.push([this.services.query(session), this.services.parameters(session)]);
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
  harness.channel.connected(1, 1, { page: OTHER, sub: ANY_SUB }, [], "id=7");
  read.length = 0;
  harness.open(1, PAGE, ANY_SUB, "a=1");
  harness.open(1, PAGE, ANY_SUB, "a=2");
  assert.deepEqual(read, [["id=7", "a=1"], "a=2"]);
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
