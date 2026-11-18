// The server's bounds a picture page's messages are written within
// (renderer parity PAR-17, PAR-21), which the kit checks and does not
// export: named here once, and a test holds each to the kit's check
// (picture-messages.test.ts).

import type { PicturePart } from "../kit.ts";

/** The most parts one `regis` or `naplps` message has (the server's `MOST_PICTURE_PARTS`, PAR-21). */
export const MOST_PICTURE_PARTS = 64;

/** The most bytes one kept stream holds since its restart (the server's `MOST_KEPT_STREAM_BYTES`, the engine's `MAX_PICTURE_STREAM_BYTES`, PAR-17). */
const MOST_KEPT_STREAM_BYTES = 1_048_576;

/**
 * The most bytes the server writes for one character of a text part (the
 * engine's `MAX_REGIS_BYTES_PER_CHARACTER` and `MAX_NAPLPS_BYTES_PER_CHARACTER`,
 * both 32, PAR-4 and PAR-5): what a part is counted as before the server
 * has written it, since its true length is the server's to know.
 */
const MOST_BYTES_PER_CHARACTER = 32;

/**
 * The bytes a page's stream may grow to by its changes before the next
 * change sends the whole picture again from a restart: half of what the
 * server keeps, so the largest whole picture and the change after it still
 * fit, and the receiver's stream stays well within its renderer's
 * processed-byte limit (`MAX_PROCESSED_BYTES`, 4,000,000).
 */
export const RESTART_AFTER_BYTES = MOST_KEPT_STREAM_BYTES / 2;

/** The bytes `parts` take at most once the server has written their text (MOST_BYTES_PER_CHARACTER), its characters counted as UTF-16 units, never fewer than its characters. */
export function mostBytes(parts: readonly PicturePart[]): number {
  return parts.reduce(
    (sum, part) => sum + (part instanceof Uint8Array || typeof part === "string" ? part.length : part.text.length * MOST_BYTES_PER_CHARACTER),
    0,
  );
}
