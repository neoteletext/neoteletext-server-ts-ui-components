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
| `join(session, page)`, `open(session, page)`, `close(session)` | A viewer comes, goes to a page, goes. |
| `press(session, key)`, `typeKeys(session, text)`, `typeText(session, text)`, `paste` | Keys, typing from a keyboard, text from a phone. |
| `clickLeft(session, column, row)`, `wheel`, `hover` | The pointer. |
| `advance(ms)`, `runUntil(ms)` | The clock, waking the channel when it asked to be. |
| `seen(session, page).rows`, `text(rows, row)`, `shows(rows, words)` | What the viewer sees. |
| `gotos(session)`, `at(session)` | Where the viewer was sent, and is. |
| `sounds(session)` | The sound lines sent to the viewer. |
| `errors` | What the channel reported failing. |

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

- **The docs** (`test/docs.ts`): the pages under `docs/components/`,
  made from the catalogue and the source. `test/docs.test.ts` fails when
  they are out of step; `node test/docs.ts` writes them again.

## The checks

`scripts/check.sh stage` runs everything the gates run: the type check,
Prettier, oxlint, Knip and every test. `BUILD.md` says more.
