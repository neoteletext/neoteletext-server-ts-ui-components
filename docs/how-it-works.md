# How it works

What happens between a component and a viewer's screen, and between a
viewer's key and a component, through every piece of NeoTeletext. Each
fact below names the document or the code it comes from, in the
repositories beside this one.

## The pieces

| Piece | What it is | Where |
| --- | --- | --- |
| **The browser** | The viewer's receiver: a native desktop program, with no web engine and no scripts, in separate processes: a fetcher and a decoder for each channel, a trusted core, the window, and a sound helper. | `neoteletext-browser`, docs/architecture.md §1, §6.1 |
| **The engine** | The teletext receiver library the browser decodes and draws with: Levels 1 to 3.5, TTI and T42, the input protocol, audio. Its `neottx` program renders pages to pictures. | `neoteletext-engine`, README.md, ARCHITECTURE.md §1 |
| **The server** | Runs channels: a state machine for each, hosted on tokio and hyper. It starts each channel's program and talks to it in lines of JSON on the program's standard input and output. | `teletext-server`, docs/architecture.md §3, docs/applications.md |
| **The protocol kit** | What a channel program in TypeScript is written on: `runChannel`, the `Application` it runs, the `Context` it publishes through, page selection (`Navigation`), and the test `Harness`. | `neoteletext-server-ts-protocol` |
| **This library** | `ComponentChannel`, one `Application` whose pages are trees of components. | `src/core/runtime.ts` |
| **The shared rules** | The input protocol, and the standard's limits. | `neoteletext-common`, INPUT.md, STANDARD-LIMITS.md |

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
   the typing cursor. The first sub-page also declares its controls, for
   the browser to show as it shows links, and its rollover colours
   (`src/core/draw.ts`, `controls.ts`, `rollover.ts`).
4. **It is published.** The shared copy is published only when its TTI
   changed; a viewer's own copy only while it differs from the shared one
   (`src/core/publish.ts`). The protocol kit writes it as a `publish`
   line, its owner the channel or a session.
5. **The server takes it.** It checks the line whole and reads the TTI
   with the engine's reader. It writes nothing in row 0: columns 8 to 39
   are the page's own, blank unless the page writes there, and columns 0
   to 7 the receiver's, where the browser shows the page's number
   (EN 300 706 clause 9.3.1.4; `teletext-server`, docs/requirements.md
   §11). A shared page is encoded once for every viewer.
6. **It is sent.** As 42-byte teletext packets, in binary WebSocket
   messages, beside the channel's `channel.json`, `contents.txt` and page
   files (`teletext-server`, crates/teletext-native/src/http.rs).
7. **The browser draws it.** Its decoder renders the page, 480 by 500, in
   the Bedstead font; the window scales it for the screen
   (`neoteletext-browser`, docs/architecture.md §10). A page of several
   sub-pages opens at its first; each is a page of its own, which the
   viewer steps to and the browser never cycles (decision 111). A
   channel is not told which sub-page a viewer has up, so only the
   first declares controls.

## A key: from the viewer to a component, and back

1. **The browser sends it.** Only while the page open takes input. Every
   key's press, repeat and release goes, digits and coloured keys
   included; clicks, every move over the page (at most 60 a second, only
   as the dot under the pointer changes), the wheel, and the pointer coming
   onto or off a control (`neoteletext-common`, INPUT.md §6.3, §9.8,
   §5.4). Pointer areas, which once limited the moves sent, are withdrawn
   (§7.4, 28 October 2026).
2. **The server forwards it** to the program as an `input` line naming
   the session and the page; a viewer's PAGE message, sent as keys start
   to go to a page, becomes `open` and `leave` (`teletext-server`,
   docs/applications.md §2).
3. **Page selection comes first**, in the protocol kit: three digits go to
   a page and the coloured keys follow the Fastext links, unless the page
   owns them (`neoteletext-server-ts-protocol`, src/channel/channel.ts). This
   library finds whether a page owns them by rendering its root once
   (`src/core/needs.ts`).
4. **The library routes it** to the viewer's mount, or the shared one, and
   through it as [Keys and focus](keys-and-focus.md) says: capture, the
   focused component, typing, its parents, page-wide keys, then moving
   the keys. A click goes to the component drawn in the cell clicked
   (`src/core/pointer.ts`).
5. **The answer is a new page.** The component's state changes, the page
   is drawn again, and what changed is published. After each input the
   server tells the browser how much input it has acted on (INPUT.md
   §7.1); the browser draws nothing of what is typed, the page does. A
   component sending the viewer elsewhere (`goto`) does it the same way.
6. **The browser draws a control's look under the pointer itself**, and
   sends nothing for it (INPUT.md §9.7).

## Sound

- **Every sound is Opus**, the one format receivers on macOS, Windows,
  Linux, iOS and Android play (the engine's decision E.131, the
  browser's decision 121): mono, 48 kHz, constant-rate packets of 20 ms
  at 16 kbit/s. The library encodes it, with ffmpeg's libopus by default
  (the protocol kit's `ffmpegOpus`); the server checks each packet and
  carries it unchanged (`teletext-server`, docs/applications.md §3.4,
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

## Viewers, sessions and copies

- **A session is one connection**: a viewer who reconnects is a new
  session, and nothing identifies them across sessions
  (`teletext-server`, crates/teletext-runtime/src/session.rs).
- **The shared copy** of a page is mounted once, as the channel starts, and
  is the same for everyone: what one viewer does to it, all see.
- **A viewer's own copy** is mounted as they open the page, when the page
  is `perViewer` or a component on it needs one (any control with state
  of its own does), and unmounted as they leave, unless it is
  `keepWhileAway`. It is published only while it differs from the shared
  copy (`src/core/runtime.ts`).
- **When the program restarts**, the server drops the viewers' copies and
  tells it again who is where (`teletext-server`, docs/applications.md §1).

## Limits a channel meets

| Limit | Where |
| --- | --- |
| The standard's 2,022 pages a channel and 8,069 sub-pages a whole page (8,190 put by sub-code), titles of 120 characters: what the server's `start` says, read with `services.limits()`; the library writes none of them | teletext-server's docs/applications.md §2 |
| A line of at most 16 MiB; pages declared within 30 seconds of starting | docs/applications.md §1 |
| 32 controls a page, on rows 1 to 23 | INPUT.md §7.3 |
| The browser sends at most 120 input units a second | INPUT.md §5.1 |
| 256 messages queued for a connection; past that, the newest are dropped | crates/teletext-native/src/hub.rs |
| A stored sound of at most two minutes | docs/applications.md §3.4 |

The server records no addresses and no typed text (docs/applications.md
§7). A channel learns the pointer only over its own open page, while keys
go to it: its clicks, drags and moves at most 60 a second, and nothing of
the pointer anywhere else (INPUT.md §11.3).
