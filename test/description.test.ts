// A page's description for the web (REQ-1728): a page shows nothing unless its
// spec says so, and what it says is built with no session in scope.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { Component, ComponentChannel, type Element, Frame, h, type PageSpec, Text } from "../src/index.ts";
import { Colour } from "../src/kit.ts";

const PAGE = 0x150;
const SESSION = 1;
const NOT_PUBLIC = { type: "description", page: "150", public: false };

/** A page that shows every viewer who they are, through a component with a copy for each. */
class Greeting extends Component {
  override render(): Element {
    const { session } = this.services;
    return h(Text, { text: session === null ? "everyone" : `private to ${session}` });
  }
}

const STORY: PageSpec = { page: PAGE, title: "Story", perViewer: true, root: () => h(Frame, { title: "Story", background: Colour.Blue }, h(Greeting, {})) };

function channel(page: PageSpec): Harness {
  return new Harness([new ComponentChannel([page], { opus: fakeOpus() })]);
}

test("a page with no `describe` is not public", () => {
  assert.deepEqual(channel(STORY).describe(PAGE), NOT_PUBLIC);
});

test("a page whose `describe` gives nothing is not public", () => {
  assert.deepEqual(channel({ ...STORY, describe: () => null }).describe(PAGE), NOT_PUBLIC);
});

test("a description is called with nothing, and shows the channel's copy with a viewer on the page", () => {
  const given: unknown[][] = [];
  const harness = channel({
    ...STORY,
    describe: (...arguments_: unknown[]) => {
      given.push(arguments_);
      return { public: true, title: "A title", text: "Its words." };
    },
  });
  harness.join(SESSION, PAGE);
  const answer = harness.describe(PAGE);
  assert.deepEqual(given, [[]], "no session, no parameters");
  assert.equal(answer["title"], "A title");
  assert.notDeepEqual(harness.seen(SESSION, PAGE).rows, harness.shared(PAGE), "the viewer has a copy of their own");
  assert.match(JSON.stringify(answer["content"]), /^\{"page":"150"/u);
  assert.ok(!JSON.stringify(answer).includes(Buffer.from("private").toString("base64").slice(0, 6)), "and no answer holds it");
});
