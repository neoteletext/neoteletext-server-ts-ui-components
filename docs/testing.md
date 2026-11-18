# Testing

A channel of components is tested as the server runs it, with no server:
the protocol's `Harness` (`neoteletext-server-ts-protocol/testing`) plays the
server's part, and a test plays the viewers'.

## A page under test

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { Harness, shows } from "neoteletext-server-ts-protocol/testing";
import { ComponentChannel, Frame, h, Text } from "neoteletext-server-ts-ui-components";
import { Colour, Key } from "neoteletext-server-ts-protocol";

test("the page greets", () => {
  const channel = new Harness([
    new ComponentChannel([{ page: 0x100, title: "Hello", perViewer: true, root: () => h(Frame, { title: "Hello", background: Colour.Blue }, h(Text, { text: "Hi" })) }]),
  ]);
  channel.join(1, 0x100);
  channel.press(1, Key.Enter);
  assert.ok(shows(channel.seen(1, 0x100).rows, "Hi"));
});
```

What a test can do and see:

| | |
| --- | --- |
| `join(connection, page)`, `open(connection, page, sub?)`, `close(connection)` | A connection with no viewer comes, goes to a page or to one of its sub-pages by its sub-code, goes. |
| `viewer(name)`, `join(viewer, page)`, `privateViewer(name)` | A named viewer with a fixed handle; joined twice, the viewer in two tabs; a private window. |
| `grantState(connection)`, `refuseState(connection, reason)`, `forget(viewer)`, `restart()` | The server's answers to the library's request for state, a reset, and a restart, which gives connection numbers again. |
| `press(connection, key)`, `typeKeys(connection, text)`, `typeText(connection, text)`, `paste` | Keys, typing from a keyboard, text from a phone. |
| `clickLeft(connection, column, row)`, `wheel`, `hover` | The pointer. |
| `fire(connection, rule, event, tick, target, row?)` | An input as a rule of the page's table sends it, naming the rule, and the row that fired where a rule has rows: `fire(1, "press_button_1", { kind: "mouse", action: "press", button: 0, column: 4, row: 3, mods: 0 }, 0, { rect: "button_1" })`. |
| `sent.filter((each) => each.type === "rules")` | The rule tables the channel sent, each for one page and sub-code: what each sub-page asks a viewer's browser to send. |
| `advance(ms)`, `runUntil(ms)` | The clock, waking the channel when it asked to be. |
| `seen(connection, page).rows`, `text(rows, row)`, `shows(rows, words)` | What the viewer sees. |
| `redirects(connection)`, `addressRedirects(connection)`, `at(connection)` | The pages and the addresses the viewer was sent to, and where they are. |
| `sounds(connection)` | The sound members sent to the viewer, bytes as `Uint8Array`. |
| `errors` | What the channel reported failing. |

The harness evaluates no rule table: `press`, `clickLeft` and the rest
give the channel their input whatever the page's table asks, each named
for the rule the server's default table would send it by. To hold a page
to what it asks for, read the table it sent and `fire` its rules. An
input the harness gives names no sub-page in particular (3F7F), which the
library reads as the sub-page the connection selected, or the first.

## Snapshots

A whole page can be kept, cell by cell, and compared exactly
(`test/snapshot.ts`): each cell is one character in a text file under
`test/snapshots/`, its attributes written as letters (a legend heads each
file). A change to what a page draws shows in review as a change to the
file.

    UPDATE_SNAPSHOTS=1 node --test test/snapshots.test.ts   # write them
    node --test test/snapshots.test.ts                       # compare

A missing snapshot fails: one is written only when asked for, and then
read before it is committed.

## The catalogue

Every component has examples in `test/catalogue/`, one file to a part.
An example is its component, a title, what it draws (`build`) and what
the viewer does first (`act`). The catalogue serves three ends:

- **The gate** (`test/visual.test.ts`): every example draws with no
  failure, nothing in its background's colour, nothing below 2:1 against
  its background, and no text cut, unless it says why (`allow`), on every
  one of its sub-pages: NeoTeletext shows each as a page of its own.
- **The pictures** (`test/screenshots.ts`): each example drawn by the
  engine's renderer to `docs/images/PART/NAME.png`, at its first
  sub-page, where a receiver opens it, unless it names another
  (`subPage`), and a list of the
  places its attributes may show as gaps, for review. It needs the
  engine's `neottx` program:

      NEOTTX=/path/to/neottx node test/screenshots.ts [PART]

- **The pictures in ReGIS and NAPLPS** (`test/picture-goldens.ts`):
  each example staged on a page drawn in each picture language, its
  picture kept by the real server and drawn by it as the page's public
  PNG, which `test/picture-goldens.test.ts` compares with
  `test/goldens/pictures/` (their format in `VERSION`). The server writes
  the text parts and draws with the browser's renderers, so it is the
  one program that draws a picture as a receiver does; the test is
  skipped without it, and refuses a build other than the one the
  goldens were drawn by:

      TELETEXT_SERVER=/path/to/teletext-server node --test test/picture-goldens.test.ts
      TELETEXT_SERVER=/path/to/teletext-server node test/picture-goldens.ts

  The second writes the goldens again. Each is the picture as the
  library keeps it (`test/picture-kept.ts`), its interactive components
  in numbered drawings or objects with their looks, links and caret,
  which the server composes as a viewer is first shown the page.
  `test/picture-text.test.ts` uses the same server to measure a ReGIS
  letter's width.
- **The docs** (`test/docs.ts`): the pages under `docs/components/`,
  made from the catalogue and the source. `test/docs.test.ts` fails when
  they are out of step; `node test/docs.ts` writes them again.

## The checks

`scripts/check.sh stage` runs everything the gates run: the type check,
Prettier, oxlint, Knip and every test. `BUILD.md` says more.
