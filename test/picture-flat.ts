// A picture written flat, for the goldens (picture-goldens.ts says why):
// every cell in the stream, none in a numbered drawing or an object, and no
// caret, as the messages of a kept picture.

import { ROLLOVER_COLOURS } from "../src/core/rollover.ts";
import type { PicturePart } from "../src/kit.ts";
import { NaplpsPictureWriter } from "../src/picture/naplps-picture.ts";
import { messagesOf } from "../src/picture/picture-pages.ts";
import { RegisPictureWriter } from "../src/picture/regis-picture.ts";
import type { PictureScene } from "../src/picture/scene.ts";

/** `parts` as a message's `parts` carries them: bytes in base64, joined where they stand together. */
function wireParts(parts: readonly PicturePart[]): Record<string, unknown>[] {
  const wire: Record<string, unknown>[] = [];
  let bytes: Buffer[] = [];
  const flush = (): void => {
    if (bytes.length > 0) {
      wire.push({ data: Buffer.concat(bytes).toString("base64") });
      bytes = [];
    }
  };
  for (const part of parts) {
    if (part instanceof Uint8Array) {
      bytes.push(Buffer.from(part));
    } else if (typeof part === "string") {
      bytes.push(Buffer.from(part, "latin1"));
    } else {
      flush();
      wire.push({ text: part.text, ...(part.language === undefined ? {} : { language: part.language }), ...(part.outside === true ? { outside: true } : {}) });
    }
  }
  flush();
  return wire;
}

/** `scene` with every cell in the base and no caret. */
function flat(scene: PictureScene): PictureScene {
  return { ...scene, owners: scene.owners.map((line) => line.map(() => 0)), components: new Map(), cursor: null };
}

/** `scene` written flat in `renderer`, as the messages that keep it for page `page`, sub-page `sub`. */
export function flatMessages(renderer: "regis" | "naplps", scene: PictureScene, page: string, sub: string): Record<string, unknown>[] {
  const writer = renderer === "regis" ? new RegisPictureWriter({ rollover: ROLLOVER_COLOURS }) : new NaplpsPictureWriter({ rollover: ROLLOVER_COLOURS });
  const update = writer.update(flat(scene), true);
  return messagesOf(update.units).map((parts, index) => ({ type: renderer, connections: "kept", page, sub, restart: index === 0, parts: wireParts(parts) }));
}
