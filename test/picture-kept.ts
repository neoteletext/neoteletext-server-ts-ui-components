// A picture as the library keeps it, for the goldens (picture-goldens.ts):
// the messages a picture page sends to `{ kept: true }` for a sub-page drawn
// whole from a restart, with its numbered drawings or objects, their looks,
// its links and its caret, written by the library's own PicturePages
// through the kit and read back as the lines a program writes.

import { Harness } from "neoteletext-server-ts-protocol/testing";
import { ROLLOVER_COLOURS } from "../src/core/rollover.ts";
import type { Application, Context } from "../src/kit.ts";
import { PicturePages } from "../src/picture/picture-pages.ts";
import type { PictureScene } from "../src/picture/scene.ts";

/** Page numbers and sub-codes as the protocol writes them. */
const PAGE_RADIX = 16;
/** The messages a picture page's kept copy is made of (PAR-16 to PAR-19, PAR-35). */
const KEPT_TYPES = new Set(["regis", "naplps", "regis_links", "regis_cursor", "naplps_objects", "naplps_links", "naplps_cursor"]);

/** `scene` written whole in `renderer` from a restart, as the messages that keep it for page `page`, sub-page `sub`. */
export function keptMessages(renderer: "regis" | "naplps", scene: PictureScene, page: string, sub: string): Record<string, unknown>[] {
  const pageNumber = Number.parseInt(page, PAGE_RADIX);
  const subCode = Number.parseInt(sub, PAGE_RADIX);
  const writer: Application = {
    pages: () => [{ page: pageNumber, title: page }],
    start(context: Context): void {
      new PicturePages(renderer, ROLLOVER_COLOURS).sendWhole(context, pageNumber, [subCode], [scene], { kept: true });
    },
  };
  const harness = new Harness([writer]);
  if (harness.errors.length > 0) {
    throw new Error(`the kit refused the ${renderer} picture of page ${page}: ${harness.errors.join("; ")}`);
  }
  return harness.sent.filter((line) => KEPT_TYPES.has(String(line["type"])));
}
