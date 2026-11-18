// REQ-6774, renderer parity PAR-21 and PAR-42: a picture page's messages
// are within the server's bounds, which the kit checks and the library
// names once (src/picture/stream-bounds.ts).

import assert from "node:assert/strict";
import { test } from "node:test";

import { SERVER_LIMITS } from "neoteletext-server-ts-protocol/testing";
import { checkProgram } from "../src/kit.ts";
import { messagesOf } from "../src/picture/picture-pages.ts";
import { MOST_PICTURE_PARTS } from "../src/picture/stream-bounds.ts";

/** A picture message of `count` parts, byte parts and text parts in turn. */
function partsMessage(count: number): object {
  return {
    type: "regis",
    connections: "kept",
    page: "150",
    sub: "0000",
    restart: true,
    parts: Array.from({ length: count }, (_, at) => (at % 2 === 0 ? { data: "UCEw" } : { text: "a" })),
  };
}

/** The parts a message carries `parts` as: bytes that stand together are one. */
function joined(parts: readonly unknown[]): number {
  return parts.filter((part, at) => !(part instanceof Uint8Array && parts[at - 1] instanceof Uint8Array)).length;
}

test("MOST_PICTURE_PARTS is the most parts the kit's check takes", () => {
  assert.equal(checkProgram(partsMessage(MOST_PICTURE_PARTS), SERVER_LIMITS), null);
  assert.notEqual(checkProgram(partsMessage(MOST_PICTURE_PARTS + 1), SERVER_LIMITS), null);
});

test("a long update is sent as messages of at most MOST_PICTURE_PARTS parts each, in order", () => {
  const units = Array.from({ length: 50 }, (_, at) => [new Uint8Array([at]), { text: `word ${String(at)}` }, new Uint8Array([at])]);
  const messages = messagesOf(units);
  assert.ok(messages.length > 1);
  assert.ok(messages.every((parts) => joined(parts) <= MOST_PICTURE_PARTS));
  assert.deepEqual(messages.flat(), units.flat());
});
