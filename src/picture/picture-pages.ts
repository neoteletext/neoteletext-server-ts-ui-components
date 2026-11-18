// What a mount of a picture page sends of its pictures (renderer parity
// PAR-42), one stream for each sub-page: a page is a page number and a
// sub-code together (DEC-6599), so each sub-page's picture, links and cursor
// are its own. The channel's copy is sent with the audience `{ kept: true }`
// (PAR-16), which the server keeps for the page and sub-code and gives to
// every viewer who selects it; a viewer's own copy to their connection. The
// first send of a stream restarts it, and so does a send after its changes
// have grown it past RESTART_AFTER_BYTES, so that a kept stream stays
// within what the server keeps. A message holds at most MOST_PICTURE_PARTS
// parts, so a long update is sent as several, the first restarting.

import type { ColourTable } from "../core/rollover.ts";
import type { Context, PictureAudience, PicturePart } from "../kit.ts";
import { NaplpsPictureWriter } from "./naplps-picture.ts";
import { RegisPictureWriter } from "./regis-picture.ts";
import type { PictureScene } from "./scene.ts";
import { MOST_PICTURE_PARTS, mostBytes, RESTART_AFTER_BYTES } from "./stream-bounds.ts";
import { isEmpty, type PictureUpdate, type PictureWriter } from "./update.ts";

/** One sub-page's stream: its writer, and the bytes it has sent since its restart. */
interface Stream {
  readonly writer: PictureWriter;
  bytes: number;
}

/** Whether a part is bytes, which a message joins with the bytes beside it into one part. */
function isBytes(part: PicturePart): boolean {
  return part instanceof Uint8Array || typeof part === "string";
}

/** The parts `parts` are once the bytes that stand together are joined. */
function joinedCount(parts: readonly PicturePart[]): number {
  return parts.reduce((count, part, at) => count + (isBytes(part) && at > 0 && isBytes(parts[at - 1] ?? "") ? 0 : 1), 0);
}

/** `units` as messages' parts, each within MOST_PICTURE_PARTS; a unit longer than that is cut where it must be. */
export function messagesOf(units: readonly (readonly PicturePart[])[]): PicturePart[][] {
  const messages: PicturePart[][] = [];
  let current: PicturePart[] = [];
  const close = (): void => {
    if (current.length > 0) {
      messages.push(current);
      current = [];
    }
  };
  for (const unit of units) {
    if (joinedCount([...current, ...unit]) > MOST_PICTURE_PARTS) {
      close();
    }
    for (const part of unit) {
      if (joinedCount([...current, part]) > MOST_PICTURE_PARTS) {
        close();
      }
      current.push(part);
    }
  }
  close();
  return messages;
}

export type PictureRenderer = "regis" | "naplps";

/** Writes `update` of sub-page `sub` of `page` to `to`. */
function sendUpdate(context: Context, renderer: PictureRenderer, to: PictureAudience, page: number, sub: number, update: PictureUpdate): void {
  messagesOf(update.units).forEach((parts, at) => {
    const restart = update.restart && at === 0;
    if (renderer === "regis") {
      context.regis(to, page, sub, parts, { restart });
    } else {
      context.naplps(to, page, sub, parts, { restart });
    }
  });
  if (update.objects !== null) {
    if ("whole" in update.objects) {
      context.naplpsObjects(to, page, sub, update.objects.whole);
    } else {
      for (const object of update.objects.one) {
        context.naplpsObjects(to, page, sub, { objects: [object], one: true });
      }
    }
  }
  if (update.links !== null) {
    if (renderer === "regis") {
      context.regisLinks(
        to,
        page,
        sub,
        update.links.map(({ number, target }) => ({ drawing: number, target })),
      );
    } else {
      context.naplpsLinks(
        to,
        page,
        sub,
        update.links.map(({ number, target }) => ({ object: number, target })),
      );
    }
  }
  if (update.cursor !== null) {
    if (renderer === "regis") {
      context.regisCursor(to, page, sub, update.cursor);
    } else {
      context.naplpsCursor(to, page, sub, update.cursor);
    }
  }
}

export class PicturePages {
  readonly renderer: PictureRenderer;
  readonly #rollover: ColourTable | null;
  readonly #streams = new Map<number, Stream>();

  constructor(renderer: PictureRenderer, rollover: ColourTable | null) {
    this.renderer = renderer;
    this.#rollover = rollover;
  }

  /** A writer of this page's language. */
  #writer(): PictureWriter {
    const options = { rollover: this.#rollover };
    return this.renderer === "regis" ? new RegisPictureWriter(options) : new NaplpsPictureWriter(options);
  }

  /**
   * Sends what changed of each sub-page's picture since it was last sent:
   * `subs` the sub-codes, `pictures` their scenes in the same order, to
   * `to`, and also to `alsoTo` (viewers shown the channel's copy on a
   * stream of their own, publish.ts). A sub-page no longer drawn is
   * forgotten, and its kept picture with it.
   */
  send(
    context: Context,
    page: number,
    subs: readonly number[],
    pictures: readonly (PictureScene | null)[],
    to: PictureAudience,
    alsoTo: readonly number[],
  ): void {
    const drawn = new Set<number>();
    subs.forEach((sub, at) => {
      const scene = pictures[at] ?? null;
      if (scene === null) {
        return;
      }
      drawn.add(sub);
      let stream = this.#streams.get(sub);
      const restart = stream === undefined || stream.bytes > RESTART_AFTER_BYTES;
      if (stream === undefined) {
        stream = { writer: this.#writer(), bytes: 0 };
        this.#streams.set(sub, stream);
      }
      const update = stream.writer.update(scene, restart);
      if (isEmpty(update)) {
        return;
      }
      const bytes = update.units.reduce((sum, unit) => sum + mostBytes(unit), 0);
      stream.bytes = update.restart ? bytes : stream.bytes + bytes;
      sendUpdate(context, this.renderer, to, page, sub, update);
      if (alsoTo.length > 0) {
        sendUpdate(context, this.renderer, { connections: alsoTo }, page, sub, update);
      }
    });
    for (const sub of this.#streams.keys()) {
      if (!drawn.has(sub)) {
        this.#streams.delete(sub);
        if ("kept" in to) {
          context.forgetPicture(page, sub);
        }
      }
    }
  }

  /** Sends each sub-page's whole picture to `to`, from a restart, apart from the streams this keeps: a viewer coming back to the channel's copy (publish.ts). */
  sendWhole(context: Context, page: number, subs: readonly number[], pictures: readonly (PictureScene | null)[], to: PictureAudience): void {
    subs.forEach((sub, at) => {
      const scene = pictures[at] ?? null;
      if (scene !== null) {
        sendUpdate(context, this.renderer, to, page, sub, this.#writer().update(scene, true));
      }
    });
  }

  /** Forgets what was sent: the next send restarts every stream (a viewer's own copy sent again after the channel's). */
  reset(): void {
    this.#streams.clear();
  }
}
