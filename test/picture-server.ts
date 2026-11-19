// Drawing pictures with the real server (renderer parity PAR-26): a
// program that keeps each example's picture on a page of its own and
// describes the page with it, and the PNG of each page's public address,
// which the server draws with the browser's renderers and fonts and the
// text parts written by the engine's encoder in the provided sets (PAR-21).

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

import type { PictureExample } from "./picture-goldens.ts";

/**
 * The server the goldens are drawn by: neoteletext-app-server's branch
 * `parity` at 5e91f96, built with `cargo build --release` for x86_64 Linux,
 * which speaks program protocol 16 and pins the NAPLPS renderer at a96be84
 * (a NAPLPS picture on the 480 by 460 dots of raster lines 20 to 479, every
 * coordinate a raster dot, DEC-6853 and DEC-6857) and the engine at
 * 68497b32. Another build may draw them otherwise, so another is refused.
 */
const PICTURE_SERVER = {
  commit: "5e91f96",
  sha256: "bd2c13c6aaa95cb8346a0b1c27fa526a4ac3eea72face1197e9b859b8998752e",
} as const;

const SCRATCH = join(import.meta.dirname, "..", "tmp", "picture-goldens");
/** How long the server is given to start and draw a page, and how often it is asked. */
const SERVER_WAIT_MS = 30_000;
const RETRY_MS = 100;
/** Where the server's public page gives its picture. */
const PNG_IN_PAGE = /<img src="data:image\/png;base64,([^"]+)"/u;
/** What the program writes to the server's log for each message the server refused. */
const REFUSED = "refused: ";

/** A blank sub-page of `page`: a public page's description gives one beneath its picture. */
function blankContent(page: string): Record<string, unknown> {
  return {
    page,
    sub: "0000",
    rows: Array.from({ length: 25 }, () => null),
    links: [null, null, null, null, null, null],
    display_row_24: false,
    link_extension: { keys: [], numbers: [], texts: [] },
    control: {
      erase: false,
      newsflash: false,
      subtitle: false,
      suppress_header: false,
      update: false,
      interrupted_sequence: false,
      inhibit_display: false,
      magazine_serial: false,
    },
    character_set: { region: null, national_option: 0 },
    enhancements: [],
    packets: [],
    cursor: null,
  };
}

/** The program that keeps every example's picture and describes each page with it. */
function programOf(examples: readonly PictureExample[]): string {
  const lines = examples.flatMap((example) => example.messages.map((message) => JSON.stringify(message)));
  const descriptions = Object.fromEntries(
    examples.map((example) => [
      example.page,
      JSON.stringify({
        type: "description",
        page: example.page,
        public: true,
        title: example.name,
        text: example.name,
        content: blankContent(example.page),
        picture: { kept: example.sub },
      }),
    ]),
  );
  return `import { createInterface } from "node:readline";
const lines = ${JSON.stringify(lines)};
const descriptions = ${JSON.stringify(descriptions)};
for await (const line of createInterface({ input: process.stdin })) {
  const message = JSON.parse(line);
  if (message.type === "refused") process.stderr.write(${JSON.stringify(REFUSED)} + line + "\\n");
  if (message.type === "start") {
    for (const each of lines) process.stdout.write(each + "\\n");
  } else if (message.type === "describe" && descriptions[message.page] !== undefined) {
    process.stdout.write(descriptions[message.page] + "\\n");
  }
}
`;
}

/** A port nothing listens on now. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => {
        resolve(typeof address === "object" && address !== null ? address.port : 0);
      });
    });
  });
}

/** The server program named by TELETEXT_SERVER, refused unless it is PICTURE_SERVER's build; null when none is named. */
export function pictureServer(): string | null {
  const path = process.env["TELETEXT_SERVER"];
  if (path === undefined || path === "") {
    return null;
  }
  const sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
  if (sha256 !== PICTURE_SERVER.sha256) {
    throw new Error(`${path} is the build ${sha256}; the goldens are drawn by neoteletext-app-server ${PICTURE_SERVER.commit}, ${PICTURE_SERVER.sha256}`);
  }
  return path;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** The PNG of `example`'s public page, asked for until the server has drawn it, within SERVER_WAIT_MS of `started`. */
async function pictureOf(address: string, example: PictureExample, started: number, log: readonly string[]): Promise<Buffer> {
  const answer = await fetch(`http://${address}/goldens/${example.page}`).catch(() => null);
  const found = answer === null ? null : PNG_IN_PAGE.exec(await answer.text());
  if (found?.[1] !== undefined) {
    return Buffer.from(found[1], "base64");
  }
  if (Date.now() - started > SERVER_WAIT_MS) {
    throw new Error(`the server drew no picture for ${example.renderer}/${example.name} (page ${example.page}); its log:\n${log.join("").slice(-4000)}`);
  }
  await delay(RETRY_MS);
  return pictureOf(address, example, started, log);
}

/** Every example's picture as the server draws it, by `renderer/name`. */
export async function drawPictures(server: string, examples: readonly PictureExample[]): Promise<Map<string, Buffer>> {
  rmSync(SCRATCH, { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
  const program = join(SCRATCH, "program.ts");
  writeFileSync(program, programOf(examples));
  const channels = join(SCRATCH, "channels.json");
  writeFileSync(channels, JSON.stringify({ channels: [{ folder: "goldens", name: "Goldens", command: [process.execPath, program] }] }));
  const address = `127.0.0.1:${String(await freePort())}`;
  const log: string[] = [];
  const child = spawn(server, ["--listen", address, "--origin", `http://${address}`, "--channels", channels, "--state", join(SCRATCH, "state")], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.on("data", (chunk: Buffer) => {
    log.push(chunk.toString("utf8"));
  });
  try {
    const started = Date.now();
    const pictures = await Promise.all(
      examples.map(async (example) => [`${example.renderer}/${example.name}`, await pictureOf(address, example, started, log)] as const),
    );
    const refused = log
      .join("")
      .split("\n")
      .filter((line) => line.includes(REFUSED));
    if (refused.length > 0) {
      throw new Error(`the server refused picture messages:\n${refused.join("\n").slice(0, 4000)}`);
    }
    return new Map(pictures);
  } finally {
    child.kill();
  }
}
