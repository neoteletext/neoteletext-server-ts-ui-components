# How it works

What happens between a component and a viewer's screen, and between a
viewer's key and a component, through every piece of NeoTeletext. Each
fact below names the document or the code it comes from, in the
repositories beside this one.

## The pieces

| Piece | What it is | Where |
| --- | --- | --- |
| **The browser** | The viewer's receiver: a native desktop program, with no web engine and no scripts, in separate processes: a fetcher and a decoder for each channel, a trusted core, the window, and a sound helper. | `neoteletext-browser`, docs/architecture.md §1, §6.1 |
| **The engine** | The teletext receiver library the browser decodes and draws with: Levels 1 to 3.5, TTI and T42, the input protocol, audio. Its `neottx` program renders pages to pictures. | `neoteletext-renderer-teletext`, README.md, ARCHITECTURE.md §1 |
| **The server** | Runs channels: a state machine for each, hosted on tokio and hyper. It starts each channel's program and talks to it in lines of JSON on the program's standard input and output. | `teletext-server`, docs/architecture.md §3, DOC-1964 |
| **The protocol kit** | What a channel program in TypeScript is written on: `runChannel`, the `Application` it runs, the `Context` it publishes through, page selection (`Navigation`), and the test `Harness`. | `neoteletext-server-ts-protocol` |
| **This library** | `ComponentChannel`, one `Application` whose pages are trees of components. | `src/core/runtime.ts` |
| **The shared rules** | The input protocol, and the standard's limits. | `neoteletext-common`, `PROTOCOL.html`, STANDARD-LIMITS.md |

```
 viewer ── browser ══ WebSocket ══ server ── stdin/stdout JSON ── channel program
           (engine)    42-byte        (one state                   ComponentChannel
                       packets,       machine a                    (protocol kit +
                       input up       channel)                      this library)
```

## A page: from a component to the screen

1. **Something happens.** Every call from the server (the channel
   starts, a viewer opens a page, a key, a timer's wake) runs, and then
   the library publishes what changed (`src/core/runtime.ts`).
2. **The tree is rendered.** Each copy of a page is a mount
   (`src/core/mount.ts`): a tree of component instances, reconciled with
   the last render as React reconciles, kept by class and key or place
   (`src/core/tree.ts`). The keys' place is settled first, so a focused
   control draws itself so. A render that keeps changing state is cut
   off after 8 passes and reported.
3. **The tree is drawn.** Each sub-page under it is laid out and painted
   onto a teletext screen of 40 by 25 cells, with its Fastext links and
   the typing cursor. Each sub-page also declares its own controls, for
   the browser to show as it shows links, and their rollover colours
   (`src/core/draw.ts`, `controls.ts`, `rollover.ts`): a sub-page is a
   page of its own (DEC-6599), and nothing of one is another's.
4. **It is published.** The shared copy is published only when its TTI
   changed; a viewer's own copy only while it differs from the shared one
   (`src/core/publish.ts`). The protocol kit (version 8.0.0, protocol 7,
   DEC-1482) reads the TTI into typed sub-pages, numbers a whole page's
   sub-pages by place, and keeps them: nothing goes to the server yet.
5. **It is sent, one sub-page at a time.** The server asks the program:
   `connected` once for each browser tab, answered by the kit with one
   `reply` holding the channel's index and the one sub-page the tab
   selected; `selected` for each selection, answered with exactly one
   sub-page: the one selected, or for 3F7F (the page) its first in
   ascending sub-code order. A page of several sub-pages also sends its
   sub-page list (`subpages`). A copy published again sends the changed
   sub-page to the tabs whose selection shows it, named; nothing rotates
   (DEC-1500, DEC-1526).
6. **The server relays it.** It checks every message against its schema,
   encodes the sub-page with the engine's encoder and sends it as 42-byte
   teletext packets in binary WebSocket messages, the index and the
   sub-page list as records (`teletext-server`, DOC-1964).
   It writes nothing in row 0: columns 8 to 39 are the page's own, and
   columns 0 to 7 the receiver's (EN 300 706 clause 9.3.1.4).
7. **The browser draws it.** Its decoder renders the page, 480 by 500, in
   Noto Teletext, the engine's one font; the window scales it for the screen
   (`neoteletext-browser`, docs/architecture.md §10). Each sub-page is
   selected and shown on its own; the browser never cycles them.

## A key: from the viewer to a component, and back

1. **The browser sends it, if the page's rule table asks for it.** A page
   hears no input but what a rule of its table sends (program protocol 15;
   `neoteletext-common/docs/page-rules.md`, RULE-50): a page with no table,
   or a table with no rules, is sent nothing. Unless the channel says
   `ruleTables: "none"`, the library writes each
   page's table from the components on it, as
   [The rule table](#the-rule-table-what-a-page-asks-for) says, so a key's
   press, repeat and release go where a component takes the keys, a click
   where one takes it, a drag's moves (at most 60 a second, only as the
   dot under the pointer changes), the wheel where one scrolls, and the
   pointer coming onto or off a control where one draws something for it.
2. **The server forwards it** to the program as an `input` line naming
   the connection, the page and the rule that sent it; a viewer's PAGE message, sent as keys start
   to go to a page, becomes `open` and `leave` (`teletext-server`,
   DOC-1968).
3. **Page selection comes first**, in the protocol kit: three digits go to
   a page and the coloured keys follow the Fastext links, unless the page
   owns them (`neoteletext-server-ts-protocol`, src/channel/channel.ts). This
   library finds whether a page owns them by rendering its root once
   (`src/core/needs.ts`).
4. **The library routes it** to the viewer's mount, or the shared one, and
   through it as [Keys and focus](keys-and-focus.md) says: capture, the
   focused component, typing, its parents, page-wide keys, then moving
   the keys. A click goes to the component drawn in the cell clicked, on
   the sub-page the input names (`src/core/pointer.ts`,
   `src/core/sub-pages.ts`).
5. **The answer is a new page.** The component's state changes, the page
   is drawn again, and what changed is published. After each input the
   server tells the browser how much input it has acted on (DOC-1943);
   the browser draws nothing of what is typed, the page does. A
   component sending the viewer elsewhere (`redirect`, to a page or to
   another channel's address) does it the same way.
6. **The browser draws a control's look under the pointer itself**, and
   sends nothing for it (DOC-1947).

## The rule table: what a page asks for

Under program protocol 15 a viewer's browser sends a page's channel only
what the page's rule table asks for (`neoteletext-common/docs/page-rules.md`;
REQ-6523). A page is a page number and a sub-code together (DEC-6599,
RULE-112): each sub-page has a table of its own. The library writes each
sub-page's table (RULE-54, `src/core/page-rules.ts`) from the components
drawn on that sub-page and those it is drawn within, each time the page
is drawn, and sends it (`context.rules(to, page, sub, table)`) to each
connection at every selection of that sub-page (of the page, or of
another of its sub-pages, which is opening another page), since the
server keeps no table, and again whenever it changes
(`src/core/rule-tables.ts`, `src/core/selections.ts`). A selection of the
page with no sub-page in particular shows its first, and is sent the
first's table. A channel writes no table and names no rule, and its
server entry can say `"default_rules": "none"`.

A channel that says `ruleTables: "none"` in its `ComponentChannel` options
is sent no table by the library at all. Its pages are then left to the
`default_rules` of its server entry: with `"send_all"` the server gives
every page its default table and the channel is sent every input, exactly
as on release 23.0.0 (RULE-53). The rest of this section is the default,
`ruleTables: "components"`.

Every rule of the library's only reports: it runs one command, a
`report` of the firing (`"do": [{"type": "report"}]`), which sends the
channel the viewer's event as they made it, and the server makes that
one list into one group every rule shares. The browser does nothing
else for it: it draws a control's hover and pressed looks under the
pointer itself. What is asked, and of which components:

| Rule | Asks for | When |
| --- | --- | --- |
| `keys`, `keys_up` | every key, its repeats and its release | a component on the page takes the keys: it has `onKey`, `onKeyCapture`, `onPageKey` or `onText`, or is `focusable()` |
| `text` | text that came from no key: a paste, an input method's text | a component has `onText`, `onPaste` or `onCompose` |
| `press_<area>` | a button or a finger going down inside the area | on those cells a component has `onClick` or `onPointer`, or takes the keys, which a press gives it |
| `release_<area>` | that button coming up, wherever the pointer is by then | on those cells a component has `onPointer` |
| `wheel_<area>` | the wheel turning inside the area | on those cells a component has `onWheel` |
| `move_<area>` | every move inside the area with no button down | on those cells a component says it takes every move (`PaintCanvas`) |
| `drag` | every move anywhere on the page while a button is down | a component on the page has `onPointer`: it holds the pointer from its press to the release |
| `hover_in`, `hover_out` | the pointer coming onto any control, and leaving it | the page declares a control and a component has `onHover` or reads what is under the pointer (the hint row) |
| `focus`, `blur` | the keyboard's focus coming to the page and leaving it | a component has `onPageFocus`, or `onPageBlur` |
| `select_digits`, `select_keypad` | the press of a digit's key: the ten keys of the digit row, by their place on the keyboard, and the keypad's ten | no component takes the keys, and the page does not own the digits |
| `fastext_keys` | the press of F1 to F4 and of the remote's red, green, yellow and blue keys | no component takes the keys, and the page does not own the coloured keys |

An **area** is a rectangle of one sub-page's cells, in dots (a cell
is 12 by 20), where the same is taken of the pointer: a component's cells
are those where it, or one drawn inside it, is the deepest thing drawn,
so a dialog over a button takes the button's cells from it. Areas share
no cell, so one event is sent by one rule. An area is named for the
component that takes the pointer there and numbered, as `button_1`. A
sub-page with more areas than `MAX_RECTS`, or whose rules would pass
`MAX_RULES` (the engine's limits, REQ-6608, which the library takes by
name from the protocol kit, a copy generated from the engine's
`neoteletext_rules::limits`), asks the whole sub-page
instead, under the names the server's default table uses: `press`,
`release`, `wheel`, and `move` or `drag`, and the channel's log says so.

The last two rows are **page selection** (`src/core/page-selection.ts`).
The protocol kit takes three typed digits as a page number and the
coloured keys as the page's Fastext links, on every page that does not
own them (each sub-page by its own components, DEC-6599), and it can
only take what it is sent. So a page of text asks
for those keys and nothing else, and a page whose components take
something of the pointer but no keys asks for them beside its pointer
rules. A page that asks for every key (`keys`) has them already. A page
that owns the digits and the coloured keys (`PageSpec`'s `ownsDigits` and
`ownsColourKeys`) and has no component that takes input sends a table
with no rules, and nothing a viewer does on it is sent.

The digit row's keys are named by their place (the key that carries the
digit on a United States layout), since the kit reads the digit from the
text the key typed: on a layout that types digits with Shift, or in
another script, the key's own character is not the digit. Three things
the kit did when every input was sent are not asked for:

- **A paste of digits.** The kit reads a page number from pasted text
  that is digits alone. A rule cannot ask for such text only, and asking
  for all text would send the channel whatever a viewer pastes on a page
  of text.
- **A click on a page number or a Fastext prompt.** The kit followed a
  click the page did not take. The browser follows the links a page
  declares itself (RULE-51 item 3); a press is not asked for on a page's
  text.
- **A digit typed by a key that is neither on the digit row nor the
  keypad**, as some layouts have.

A component of your own is read from its handlers, so it needs nothing
new. One that takes less than its handlers could says so, and the table
asks less:

```ts
override pointerInput(): PointerInput {
  // Dragged only: no move is wanted while no button is down.
  return { ...takenByHandlers(this), moves: "held" };
}
```

`Slider` and `ScrollBar` do this; a modal's `Shield`, which only stops the
pointer, answers `NO_POINTER_INPUT`. An input that comes back is given to
its component as it always was, by the cell it landed on and by who has
the keys; `input.rule` only says which rule asked for it. A fault a
viewer's browser reports of a table (`rulesFault`) is written to the
channel's log.

## Sound

- **Every sound is Opus**, the one format receivers on macOS, Windows,
  Linux, iOS and Android play (the engine's decision E.131, the
  browser's decision 121): mono, 48 kHz, constant-rate packets of 20 ms
  at 16 kbit/s. The library encodes it, with ffmpeg's libopus by default
  (the protocol kit's `ffmpegOpus`); the server checks each packet and
  carries it unchanged (`teletext-server`, DOC-1972,
  decision 21).
- **Short sounds** are made at 8 kHz, encoded once, and sent once to each
  viewer as a stored sound, then played by a command
  (`src/core/sound-objects.ts`).
- **Long sounds** are a viewer's stream: one at a time, on the last of
  the four sound channels, bound to its page. Its samples go to an
  encoder of its own about a second ahead, and its packets to the viewer
  560 ms ahead, in ticks of 250 ms, never more than 28 of the
  receiver's ring of 32 blocks (`src/core/live-stream.ts`).
- **The browser** mixes every channel's sounds, a background tab's
  included (`neoteletext-browser`, docs/architecture.md decisions 37,
  38).

[Sound](audio.md) says how a page uses them.

## Viewers, connections and copies

- **A connection is one browser tab** (DEC-6443), numbered by the
  server: a viewer who reconnects is a new connection, and the library
  gives every component the connection its input came from.
- **A viewer** is who a connection presents, by the handle the server
  gives (viewer-state.md VS-401): two tabs of one browser are two
  connections of one viewer. What is kept for a viewer (a ballot, kept
  state, a language) is kept under the handle and shared by their tabs; a
  connection with no viewer keeps it for its own life until the library's
  request for state is granted (`src/core/viewer-states.ts`).
- **The shared copy** of a page is mounted once, as the channel starts, and
  is the same for everyone: what one viewer does to it, all see.
- **A viewer's own copy** is mounted as they open the page, when the page
  is `perViewer` or a component on it needs one (any control with state
  of its own does), and unmounted as they leave, unless it is
  `keepWhileAway`. It is published only while it differs from the shared
  copy (`src/core/runtime.ts`).
- **The web** is told of a page only by its spec's `describe()`, which takes no
  connection and no parameters, and gives a title and text anyone may read, with a
  picture of the shared copy. A page without it shows nothing of itself
  (`neoteletext-common`'s REQ-1728).
- **When the program restarts**, the server drops the viewers' copies and
  tells it again who is where (`teletext-server`, DOC-1965).

## Limits a channel meets

| Limit | Where |
| --- | --- |
| The standard's 2,022 pages a channel and 8,069 sub-pages a whole page (8,190 put by sub-code), titles of 120 characters: what the server's `start` says, read with `services.limits()`; the library writes none of them | DOC-1968 |
| A line of at most 16 MiB; pages declared within 30 seconds of starting | DOC-1965 |
| 32 controls a page, on rows 1 to 23 | DOC-1844 |
| The browser sends at most 120 input units a second | DOC-1943 |
| 256 messages queued for a connection; past that, the newest are dropped | crates/teletext-native/src/hub.rs |
| A stored sound of at most two minutes | DOC-1972 |
| A character a text run's language cannot show refuses the whole page, unless the run is marked as from outside the program: what a viewer types is, and text from a dataset or a feed is when its component, or one above it, has the prop `outside: true`; the server then shows a stand-in for the character | DEC-2326 |

The server records no addresses and no typed text (DOC-1968). A channel learns the pointer only over its own open page, while keys
go to it, and only what the page's rule table asks for: its clicks, drags
and moves at most 60 a second, and nothing of the pointer anywhere else
(DOC-2033; page-rules.md RULE-52).
