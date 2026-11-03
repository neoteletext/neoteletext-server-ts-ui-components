// A component ends a viewer's selection with no page, as `Context.deny`
// lets an application (TODO-2010, DOC-1961).

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, type Element, Frame, h } from "../src/index.ts";
import { Colour, type WireDeniedStatus } from "../src/kit.ts";

const OPEN = 0x150;
const MEMBERS = 0x151;
const FORBIDDEN: WireDeniedStatus = 403;

/** A page for members only, which nobody is: it refuses every viewer as it is mounted for them. */
class MembersOnly extends Component {
  override render(): Child {
    return h(Frame, { title: "Members", background: Colour.Blue });
  }

  override componentDidMount(): void {
    const { session } = this.services;
    if (session !== null) {
      this.services.deny(session, FORBIDDEN);
    }
  }
}

function channel(): Harness {
  return new Harness([
    new ComponentChannel(
      [
        { page: OPEN, title: "Open", root: (): Element => h(Frame, { title: "Open", background: Colour.Blue }) },
        { page: MEMBERS, title: "Members", perViewer: true, root: (): Element => h(MembersOnly, {}) },
      ],
      { opus: fakeOpus() },
    ),
  ]);
}

test("TODO-2010: a component that denies a selection has `denied` for its answer, and no page", () => {
  const harness = channel();
  harness.join(1, OPEN);
  const before = harness.sent.length;
  harness.open(1, MEMBERS);
  const answers = harness.sent.slice(before).filter((message) => message["type"] === "page" || message["type"] === "denied");
  assert.deepEqual(
    answers.map((message) => message["type"]),
    ["denied"],
  );
  assert.equal(answers[0]?.["status"], FORBIDDEN);
  assert.deepEqual(harness.errors, []);
});

test("a selection after one a component denied is answered as usual", () => {
  const harness = channel();
  harness.join(1, MEMBERS);
  const before = harness.sent.length;
  harness.open(1, OPEN);
  assert.ok(harness.sent.slice(before).some((message) => message["type"] === "page"));
});
