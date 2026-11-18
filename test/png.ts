// Reading the server's pictures back as pixels, for tests that measure what
// was drawn: an 8-bit palette PNG without interlacing, which is what the
// server writes (PNG specification, ISO/IEC 15948, sections 11.2.2 IHDR,
// 11.2.3 PLTE, 9 filtering).

import { inflateSync } from "node:zlib";

/** A picture as rows of pixels, each red, green and blue. */
export interface Pixels {
  readonly width: number;
  readonly height: number;
  /** The colour at column `x` of row `y`, as `0xRRGGBB`. */
  at(x: number, y: number): number;
}

/** The eight bytes every PNG starts with (section 5.2). */
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** A chunk's length and type before its data, and its CRC after (section 5.3). */
const CHUNK_HEAD = 8;
const CHUNK_CRC = 4;
/** The one form read: bit depth 8, colour type 3 (indexed), no interlace (section 11.2.2). */
const BIT_DEPTH = 8;
const INDEXED = 3;
const NOT_INTERLACED = 0;
/** IHDR's fields: width, height, then the bit depth, colour type, compression, filter and interlace bytes. */
const IHDR_BIT_DEPTH = 8;
const IHDR_COLOUR_TYPE = 9;
const IHDR_INTERLACE = 12;
/** A palette entry's bytes, and a colour's bits per channel when packed. */
const PALETTE_ENTRY = 3;
const CHANNEL_BITS = 8;
/** The filter types of section 9.2, by their numbers: none, sub, up, average and Paeth, each a prediction from the bytes left, up and up-left. */
const NO_FILTER = 0;
const BYTE = 0x100;

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const [toLeft, toUp, toUpLeft] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)];
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }
  return toUp <= toUpLeft ? up : upLeft;
}

/** `png`'s pixels; throws on any other form than the one the server writes. */
export function readPng(png: Buffer): Pixels {
  if (!png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
    throw new Error("not a PNG");
  }
  let width = 0;
  let height = 0;
  let palette: number[] = [];
  const data: Buffer[] = [];
  for (let at = SIGNATURE.length; at + CHUNK_HEAD <= png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.toString("latin1", at + 4, at + CHUNK_HEAD);
    const body = png.subarray(at + CHUNK_HEAD, at + CHUNK_HEAD + length);
    at += CHUNK_HEAD + length + CHUNK_CRC;
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[IHDR_BIT_DEPTH] !== BIT_DEPTH || body[IHDR_COLOUR_TYPE] !== INDEXED || body[IHDR_INTERLACE] !== NOT_INTERLACED) {
        throw new Error("the PNG is not 8-bit indexed without interlacing");
      }
    } else if (type === "PLTE") {
      palette = Array.from({ length: Math.floor(body.length / PALETTE_ENTRY) }, (_, entry) => {
        const [red = 0, green = 0, blue = 0] = body.subarray(entry * PALETTE_ENTRY, (entry + 1) * PALETTE_ENTRY);
        return (((red << CHANNEL_BITS) | green) << CHANNEL_BITS) | blue;
      });
    } else if (type === "IDAT") {
      data.push(body);
    }
  }
  const raw = inflateSync(Buffer.concat(data));
  if (raw.length !== height * (width + 1)) {
    throw new Error("the PNG's data is not its rows");
  }
  const indices = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (width + 1)] ?? NO_FILTER;
    for (let x = 0; x < width; x += 1) {
      const byte = raw[y * (width + 1) + 1 + x] ?? 0;
      const left = x > 0 ? (indices[y * width + x - 1] ?? 0) : 0;
      const up = y > 0 ? (indices[(y - 1) * width + x] ?? 0) : 0;
      const upLeft = x > 0 && y > 0 ? (indices[(y - 1) * width + x - 1] ?? 0) : 0;
      const predicted = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upLeft)][filter] ?? 0;
      indices[y * width + x] = (byte + predicted) % BYTE;
    }
  }
  return {
    width,
    height,
    at: (x, y) => palette[indices[y * width + x] ?? 0] ?? 0,
  };
}
