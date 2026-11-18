// What a mount of a picture page keeps of its pictures (renderer parity
// PAR-42): what it has sent of each sub-page's (picture-pages.ts), its
// interactive components' numbers (numbers.ts), and on a ReGIS page a
// pointer input waiting for the PICK that places it (dispatch-input.ts).

import type { Pointing } from "../core/dispatch-input.ts";
import type { DrawnPage } from "../core/draw.ts";
import type { Node } from "../core/node.ts";
import type { ColourTable } from "../core/rollover.ts";
import type { SubPages } from "../core/sub-pages.ts";
import type { Context, PictureAudience } from "../kit.ts";
import { PictureNumbers } from "./numbers.ts";
import { PicturePages, type PictureRenderer } from "./picture-pages.ts";

/** What of a mount its pictures are sent from. */
export interface PictureSource {
  readonly page: number;
  readonly subPages: SubPages;
  readonly lastPage: DrawnPage | null;
}

export class MountPicture {
  readonly renderer: PictureRenderer;
  readonly #pages: PicturePages;
  readonly #numbers = new PictureNumbers<Node>();
  /** On a ReGIS page, a pointer input waiting for the PICK that places it on the picture. */
  waitingPointer: { readonly connection: number; readonly input: Pointing } | null = null;

  constructor(renderer: PictureRenderer, rollover: ColourTable | null) {
    this.renderer = renderer;
    this.#pages = new PicturePages(renderer, rollover);
  }

  /** The drawing or object number of interactive component `node`, given now if it has none. */
  numberOf(node: Node): number {
    return this.#numbers.of(node);
  }

  /** `node` unmounted: its number may be given again. */
  forget(node: Node): void {
    this.#numbers.forget(node);
  }

  /** Sends what changed of `mount`'s pictures, as last drawn, to `to` and to the viewers `alsoTo`. */
  send(context: Context, mount: PictureSource, to: PictureAudience, alsoTo: readonly number[] = []): void {
    if (mount.lastPage !== null) {
      this.#pages.send(context, mount.page, mount.subPages.subCodes(), mount.lastPage.pictures, to, alsoTo);
    }
  }

  /** Sends `mount`'s whole pictures, as last drawn, to `to`, apart from what it has sent its own audience. */
  sendWhole(context: Context, mount: PictureSource, to: PictureAudience): void {
    if (mount.lastPage !== null) {
      this.#pages.sendWhole(context, mount.page, mount.subPages.subCodes(), mount.lastPage.pictures, to);
    }
  }

  /** Forgets what was sent: the next send restarts every stream. */
  reset(): void {
    this.#pages.reset();
  }
}
