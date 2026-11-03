// A render that reads the services before it is mounted hides what its
// children need from the probe of a page's needs; the channel's log says
// so, rather than the page losing its digits without a word.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, DayPages, type Element, Frame, h, LanguagePicker } from "../src/index.ts";
import { Colour } from "../src/kit.ts";

const PAGE = 0x150;
/** The Fastext prompts a frame of days takes: the index, and three keys unused. */
const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** A frame whose title names the viewer's language, read from the services even before it is mounted. */
class Eager extends Component {
  override render(): Child {
    return h(Frame, { title: `In ${this.services.language(0)}`, background: Colour.Blue });
  }
}

test("a render that reaches the channel unmounted is reported in the log, naming the page and the component", () => {
  const harness = new Harness([new ComponentChannel([{ page: PAGE, title: "Eager", root: (): Element => h(Eager, {}) }], { opus: fakeOpus() })]);
  const logged = harness.sent.filter((message) => message["type"] === "log").map((message) => String(message["text"]));
  assert.ok(
    logged.some((text) => text.includes("page 150") && text.includes("Eager")),
    JSON.stringify(logged),
  );
});

test("the library's own components render unmounted, so the probe sees under them and nothing is logged", () => {
  const harness = new Harness([
    new ComponentChannel(
      [
        { page: PAGE, title: "Languages", root: (): Element => h(Frame, { title: "Languages", background: Colour.Blue }, h(LanguagePicker, { shown: 5 })) },
        { page: PAGE + 1, title: "Days", root: (): Element => h(DayPages, { days: [], background: Colour.Blue, prompts: PROMPTS }) },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  assert.deepEqual(
    harness.sent.filter((message) => message["type"] === "log"),
    [],
  );
});
