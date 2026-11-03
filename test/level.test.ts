// A page says the presentation level its text is written for (REQ-2151,
// REQ-2152 item 8), and the server keeps it within that level's means.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { ComponentChannel, type Element, Frame, h } from "../src/index.ts";
import { Colour } from "../src/kit.ts";

const STANDARD = 0x150;
const OWN = 0x151;

test("a page written for Level 3.5 says so to the server, and one that names no level is NeoTeletext's own", () => {
  const harness = new Harness([
    new ComponentChannel(
      [
        { page: STANDARD, title: "Standard", level: "3.5", root: (): Element => h(Frame, { title: "Γειά σου", background: Colour.Blue }) },
        { page: OWN, title: "Own", root: (): Element => h(Frame, { title: "Γειά σου", background: Colour.Blue }) },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  harness.join(1, STANDARD);
  assert.equal(harness.channel.copy("channel", STANDARD)?.at(-1)?.content.level, "3.5");
  assert.equal(harness.channel.copy("channel", OWN)?.at(-1)?.content.level, undefined);
});
