// REQ-6774, renderer parity PAR-42: every component of the catalogue drawn
// in ReGIS and in NAPLPS is the picture its golden holds, as the server
// draws it (picture-goldens.ts). The server is another repository's
// program: without it named by TELETEXT_SERVER this test is skipped,
// saying so, and a gate lists it among the skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { GOLDEN_FORMAT_VERSION, GOLDENS, pictureExamples } from "./picture-goldens.ts";
import { drawPictures, pictureServer } from "./picture-server.ts";

const server = pictureServer();

test("the goldens are of the format the pictures are drawn in", () => {
  assert.equal(readFileSync(join(GOLDENS, "VERSION"), "utf8").trim(), String(GOLDEN_FORMAT_VERSION));
});

test(
  "every catalogue component draws in ReGIS and NAPLPS as its golden picture",
  { skip: server === null ? "needs TELETEXT_SERVER, neoteletext-app-server's teletext-server at PICTURE_SERVER (picture-goldens.ts)" : false },
  async () => {
    const examples = pictureExamples();
    const drawn = await drawPictures(server ?? "", examples);
    const differing = [...drawn].filter(([name, png]) => !png.equals(readFileSync(join(GOLDENS, `${name}.png`)))).map(([name]) => name);
    assert.deepEqual(differing, [], "pictures that differ from their goldens");
    assert.equal(drawn.size, examples.length);
  },
);
