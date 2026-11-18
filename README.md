# neoteletext-server-ts-ui-components

Components for teletext pages, as React's are for the web, for a channel
of the NeoTeletext server written in TypeScript. A page is a tree of
components: each renders elements, or draws itself, and the library
lays the tree out on the screen, publishes it as TTI, routes the keys
and the pointer to the components where they land, and publishes a
viewer's own copy of a page only while it differs from everyone's. It
runs on the server's channel protocol, `neoteletext-server-ts-protocol`.

## Install

The library is released as a built tarball, not to a registry. Commit
its release and the protocol's under your `vendor/` and depend on both:

    npm install --save-exact ./vendor/neoteletext-server-ts-protocol-<version>.tgz ./vendor/neoteletext-server-ts-ui-components-<version>.tgz

The two go together: each release of the library names the protocol release
it is built on, in `CHANGELOG.md`.

It needs Node 22.18 or later.

## A page

```ts
import { Colour, Key, runChannel } from "neoteletext-server-ts-protocol";
import { type Child, Component, ComponentChannel, Frame, h, isPress, type KeyEvent, Text } from "neoteletext-server-ts-ui-components";

/** A component that keeps nothing: what it renders from its props. */
class Greeting extends Component<{ readonly name: string }> {
  override render(): Child {
    return h(Text, { text: `Hello, ${this.props.name}` });
  }
}

/** A component with state: a count that Enter raises. */
class Counter extends Component<object, { readonly count: number }> {
  override state = { count: 0 };

  override focusable(): boolean {
    return true;
  }

  override render(): Child {
    return h(Greeting, { name: `press ${this.state.count}` });
  }

  override onKey(event: KeyEvent): boolean {
    if (!isPress(event, Key.Enter)) {
      return false;
    }
    this.setState({ count: this.state.count + 1 });
    return true;
  }
}

await runChannel([
  new ComponentChannel([
    {
      page: 0x100,
      title: "Hello",
      perViewer: true,
      root: () => h(Frame, { title: "Hello", background: Colour.Blue, prompts: [["Index", 0x100]] }, h(Counter, {})),
    },
  ]),
]);
```

- **`h(type, props, ...children)`** makes an element, as React's
  `createElement`: there is no JSX, since Node runs the TypeScript as it
  is. `type` is a component class, with props, state (`setState`), a
  lifecycle (`componentDidMount`, `componentWillUnmount`, …) and input
  handlers (`onKey`, `onPointer`, `onWheel`, `onHover`). Every component
  is a class: the library has no function components and no hooks, by
  design.
- **`ComponentChannel`** is the protocol's `Application` for pages of
  components: each `PageSpec` names its page, title and root, and whether
  each viewer gets a copy of their own (`perViewer`).
- **Each page asks for its own input.** A viewer's browser sends a page
  only what the page's rule table asks for (program protocol 14), and the
  library writes that table from the components on the page: keys where
  one takes them, a press on a button's cells, the wheel over a list that
  scrolls, nothing on a page of text. A channel writes no table, and its
  entry in the server's `channels.json` can say `"default_rules": "none"`
  ([How it works](docs/how-it-works.md#the-rule-table-what-a-page-asks-for)).
- **`Frame`** is a sub-page with a title band, a hint row and up to four
  Fastext prompts, red, green, yellow and cyan.
- **The bus** (`this.services.bus`) carries what one page's components
  tell another's: polls' votes, toasts, the server's figures, and
  `gone` when a connection closes.

A generic class component names its type in `h`, as
`h(ChoiceList<Round>, { items: rounds, … })`: TypeScript reads a class's
props from the class, not from the props given beside it.

## What is in it

Layout (rows, columns, layers, grids, panels, joined panels, jump
labels), the frame, text (styles, rich text, news, badges, big letters),
navigation (tabs, menus, trees, pagination, a page finder), lists
(choosing, picking by a digit or a coloured key, narrowing as the viewer
types, scrolling, tables, logs), input (fields, buttons, check boxes,
radios, switches, sliders, selects, autocomplete, digit segments,
phone-keypad typing), feedback (progress, task lists, metric cards,
spinners, loading and skeletons, toasts that undo, an audio player with a
queue, speed, a loop, a sleep timer and a spectrum), dialogs (shadows, a
scrim, confirming by typing), charts (bars, columns, lines, sparklines,
heat maps, breakdowns, pies, brackets, spectra), time (dates, clocks,
countdowns, stopwatches, calendars), graphics (mosaics, pictures,
painting, maps with markers), documents of several sub-pages, polls,
quizzes, wizards and games.

The keys go back to where they were when a dialog closes, an arrow no
control takes moves them to the control nearest that way, and each
control says its keys once, for the hint row and for KeyHelp's help on
the control that has them. Each part of `src/` has an
`index.ts` that names what it exports; everything is exported from the
package's root.

## What outlasts the program

A channel's program is started again at every deploy and every save of its
source. What must outlast it goes in a `SqliteStateStore`, a SQLite file of
the channel's own (Node's `node:sqlite`), given to the channel and to what
it keeps itself:

```ts
const store = new SqliteStateStore("/var/lib/my-channel/state.sqlite");
const tally = new Tally("best", ["one", "two"], store);
await runChannel([new ComponentChannel(specs, { state: store })]);
```

A component keeps its state for its viewer by naming a key and the version
of its state's shape; it gets it back when it is mounted again for the same
viewer, in another tab, after a reconnect or after a restart, and state of
another version is dropped:

```ts
class Draft extends Component<object, { readonly text: string }> {
  override state = { text: "" };
  override keptAs(): KeptAs {
    return { key: "draft", version: 1 };
  }
}
```

**What is kept per viewer** (viewer-state.md VS-405 to VS-409). A poll's
ballot (`Tally`), a component's kept state (`keptAs`) and the language a
viewer chooses (`LanguagePicker`) are kept under the viewer's handle, the
one the server gives the program for the viewer's browser on this channel,
never under a connection's number, which the server gives again after it
restarts. Two tabs of one viewer share them. A connection with no viewer
keeps them for its own life, and the library asks for the viewer's state
after their input (`requestState`); granted, what the connection held
becomes the viewer's; refused, it is not asked again. A visit's values go
24 hours after their last use (`VISIT_VALUE_IDLE_MS`), a remembered
viewer's 180 days after (`REMEMBERED_VALUE_IDLE_MS`). Every
read-modify-write of the store is one transaction (`update`,
`atomically`), so a vote's count and its ballot never disagree. A
channel's "forget me" calls `services.forgetViewer(connection)`, which ends
the viewer's state and deletes what the store keeps for them; a reset of
every handle deletes every viewer's.

A channel may use a viewer's handle only to provide what the viewer asked
for on that channel (a poll's one vote, choices they made, their language,
a sign-in they started), never for advertising, profiling, analytics
beyond aggregate counts or sharing with anyone; it deletes what it keeps
for a handle at the end of the viewer's state and at the store's limits,
and says on its privacy page what it keeps (VS-409).

## Tests

`neoteletext-server-ts-protocol/testing`'s `Harness` drives a channel of
components as the server does:

```ts
const harness = new Harness([new ComponentChannel([ /* the page above */ ])]);
harness.join(1, 0x100);
harness.press(1, Key.Enter);
assert.ok(shows(harness.seen(1, 0x100).rows, "Hello, press 1"));
```

## Development

`BUILD.md` says how the library is checked, built and released.

## Licence

MIT: see `LICENSE`.
