# neoteletext-server-ts-ui-components: to do

What waits on another repository, or on the owner. Nothing here is
changed from this one: the server, the protocol, the engine and the
browser are changed by their own sessions.

## Sound for microcontroller receivers

Every sound goes as Opus, the one format receivers on macOS, Windows,
Linux, iOS and Android play (the owner's instruction of 28 October
2026). Microcontroller receivers (tellyboy), which decode no Opus, hear
nothing from a channel on this library; they are not implemented yet.
When they are, they need PCM, which the server encodes as IMA ADPCM, and
one sound cannot go in both formats: a receiver matches a sound's DATA
records by its handle and generation alone (the engine's `store.rs`,
`put`), so the other format's blocks would land in it, and a channel
plays one sound at a time, so a second play replaces the first. The
server sending each class of receiver its own is the way
(teletext-server's decision 21).

## Sub-pages a viewer steps to

NeoTeletext shows each sub-page as a page of its own, opening a page a
channel pushed at its first sub-page (`neoteletext-browser`, decision
111 item 2), and never cycles them. The library draws its controls,
hovers and click targets on the first sub-page only (`src/core/draw.ts`)
because a channel is not told which sub-page a viewer has up: the
browser's tuning by sub-page (its decision 112 item 5) awaits the
server. When the server passes it on, the protocol says it, and the
library can declare each sub-page's controls and route its clicks.

## A viewer's stream when they switch tabs

Checked against the server's and the browser's code and decisions, not
seen live, and nothing to change: the server tells a channel `leave`
only when a session's PAGE names another page or its connection closes
(`teletext-server`, crates/teletext-runtime/src/channel.rs, `page_open`
and `closed`). A tab switched away sends neither, and keeps the page it
had open and its sound, as Chrome does (`neoteletext-browser`, decision
38), so a stream going on in a background tab is meant. Not yet seen live.

