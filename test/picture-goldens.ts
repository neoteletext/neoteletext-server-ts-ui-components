// The catalogue's pictures in ReGIS and NAPLPS (renderer parity PAR-42,
// REQ-6774): each example staged on a page drawn in each picture language,
// its picture written by the library's writer and replayed by a program to
// the real server as a kept picture, and the server's own drawing of it
// fetched as the PNG of the page's public address (PAR-26), which the
// server draws with the browser's renderers and fonts and the text parts
// written by the engine's encoder in the provided sets (PAR-21).
//
// The picture is written flat: every cell in the stream, none in a
// numbered drawing or an object. The server at PICTURE_SERVER draws a
// public ReGIS picture's screen without composing its numbered drawings,
// and the NAPLPS renderer it pins clips an object to its rectangle taken
// as the canvas's pixels where ANIM-11 gives the design picture's (each an
// rdm to-do of its repository, linked from REQ-6774), so a picture with
// drawings or objects is not drawn as a receiver must draw it. Flat, it is: what a viewer sees is the
// base with every drawing over it (regis-v2.md, "Commit and repaint"),
// which is the flat picture. The drawings and objects themselves are
// checked by picture-pages.test.ts.
//
// The pictures are the goldens of test/goldens/pictures/;
// picture-goldens.test.ts compares them, and
//
//   TELETEXT_SERVER=/path/to/teletext-server node test/picture-goldens.ts
//
// writes them again. The server is another repository's program, so it
// is named, and its build checked, when this runs (picture-server.ts).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SERVER_LIMITS } from "neoteletext-server-ts-protocol/testing";
import type { Renderer } from "../src/index.ts";
import { numbered } from "../src/kit.ts";
import { exampleName } from "./catalogue/example.ts";
import { PARTS } from "./catalogue/index.ts";
import { EXAMPLE_PAGE, stage } from "./catalogue/stage.ts";
import { flatMessages } from "./picture-flat.ts";
import { drawPictures, pictureServer } from "./picture-server.ts";

/** The goldens' format: raised, with every golden drawn again, whenever what is drawn changes (DEVELOPMENT.md section 8). */
export const GOLDEN_FORMAT_VERSION = 1;

const ROOT = join(import.meta.dirname, "..");
export const GOLDENS = join(ROOT, "test", "goldens", "pictures");
/** The picture languages, each a folder of goldens. */
export const PICTURE_RENDERERS: readonly Exclude<Renderer, "teletext">[] = ["regis", "naplps"];
/** Page numbers are hexadecimal: each example's page is written in decimal digits from 100, so every one is an ordinary page. */
const FIRST_PAGE = 100;
const PAGE_RADIX = 16;
/** A sub-code as the protocol writes it. */
const SUB_DIGITS = 4;

/** One example drawn in one picture language. */
export interface PictureExample {
  readonly name: string;
  readonly renderer: Exclude<Renderer, "teletext">;
  /** The page the program keeps it on, as the protocol writes it. */
  readonly page: string;
  /** The sub-page the example shows, as the protocol writes it. */
  readonly sub: string;
  /** Its picture's messages, written flat. */
  readonly messages: readonly Record<string, unknown>[];
}

/** Every catalogue example staged in each picture language, with its shown sub-page's picture written flat. */
export function pictureExamples(): PictureExample[] {
  const examples: PictureExample[] = [];
  let next = FIRST_PAGE;
  for (const renderer of PICTURE_RENDERERS) {
    for (const part of PARTS) {
      for (const example of part.examples) {
        const staged = stage(example, renderer);
        const mount = staged.channel.viewerMount(1, EXAMPLE_PAGE);
        const at = (example.subPage ?? 1) - 1;
        const scene = mount?.lastPage?.pictures[at] ?? null;
        const sub = numbered(mount?.lastPage?.pictures.length ?? 1, SERVER_LIMITS)[at] ?? 0;
        const page = String(next);
        next += 1;
        if (scene === null) {
          throw new Error(`${exampleName(example)} drew no ${renderer} picture of its sub-page ${at + 1}`);
        }
        const subText = sub.toString(PAGE_RADIX).toUpperCase().padStart(SUB_DIGITS, "0");
        examples.push({ name: exampleName(example), renderer, page, sub: subText, messages: flatMessages(renderer, scene, page, subText) });
      }
    }
  }
  return examples;
}

/** Writes every golden again. */
async function main(): Promise<void> {
  const server = pictureServer();
  if (server === null) {
    throw new Error("set TELETEXT_SERVER to neoteletext-app-server's teletext-server (its branch parity, cargo build --release)");
  }
  const drawn = await drawPictures(server, pictureExamples());
  for (const [name, png] of drawn) {
    const path = join(GOLDENS, `${name}.png`);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, png);
  }
  writeFileSync(join(GOLDENS, "VERSION"), `${GOLDEN_FORMAT_VERSION}\n`);
  process.stdout.write(`${drawn.size} pictures written to ${GOLDENS}\n`);
}

if (import.meta.main) {
  await main();
}
