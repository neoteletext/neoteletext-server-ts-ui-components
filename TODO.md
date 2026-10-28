# neoteletext-server-ts-ui-components: to do

What waits on another repository, or on the owner. Nothing here is
changed from this one: the server, the protocol, the engine and the
browser are changed by their own sessions.

## Opus for desktop receivers

The owner's instruction of 28 October 2026: all sound on macOS, Windows
and Linux needs Opus; PCM16 and IMA ADPCM still work with
microcontrollers. The engine compiles both out of its desktop builds
(its decision E.131) and the browser leaves them out (its decision 121
item 7), so every sound this library makes is silent in the desktop
browser until the server sends Opus.

This library sends 16-bit PCM and the server encodes it
(`teletext-server`, docs/applications.md §3.4), so a component needs no
change of its own for the codec. What has to change, in order:

1. **The server** encodes Opus for desktop receivers and IMA ADPCM or
   PCM16 for microcontrollers, which means it knows each receiver's
   class (from its WELCOME capabilities, or by asking) and encodes a
   page-wide sound once for each class present. Today it encodes every
   stored sound as IMA ADPCM in 256-byte blocks and every live block in
   512-byte blocks.
2. **The protocol** (`neoteletext-server-ts-protocol`): Opus takes 8, 12, 16,
   24 and 48 kHz (RFC 6716 §2), so `SAMPLE_RATES`' 11025, 22050, 32000
   and 44100 go or are resampled by the server; and a live sound's
   blocks are 1,017 samples, the IMA ADPCM block's, where Opus frames
   are 2.5 to 60 ms. The kit says the new framing.
3. **This library**, once a protocol release says them:
   - `BLOCK_SAMPLES` (`src/core/stream.ts`) becomes the protocol's
     block, and `LEAD_MS` is measured again against the Opus decoder's
     buffer.
   - `StreamSource.rate` and `docs/audio.md` name the rates the
     protocol then takes; `stretched` and the sound objects' 8 kHz stay
     if 8 kHz stays.
   - The peer dependency names that protocol release, and the library
     takes a major version if `StreamSource` changes.

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
38), so a stream going on in a background tab is meant. To confirm live
once the server sends Opus.
