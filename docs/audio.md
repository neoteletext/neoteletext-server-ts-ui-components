# Sound

A page can make sounds and play long ones as they are sent. The audio
player is built on both.

Every sound goes as Opus, the one format receivers on macOS, Windows,
Linux, iOS and Android play. The library encodes it and the server
carries it unchanged. By default it runs ffmpeg built with libopus, found
on the path; a channel gives another encoder, or another ffmpeg, as
`ComponentChannel`'s `opus`:

```ts
import { ffmpegOpus } from "neoteletext-server-ts-protocol";

new ComponentChannel(pages, { opus: ffmpegOpus({ path: "/usr/local/bin/ffmpeg" }) });
```

A sound that cannot be encoded is said in the channel's log and not
played; a stream whose encoder fails shows as failed, with why. A test
gives the protocol's `fakeOpus()`, which runs nothing.

## Short sounds

A sound made in the program: tones, noise and sequences of them, at
8 kHz, sent once to each audience as a stored sound and played by a
command after (`src/core/sound.ts`).

```ts
import { sequence, sound, tone } from "neoteletext-server-ts-ui-components";

const chime = sound("chime", sequence(tone(660, 120), tone(880, 200)));

// in a component, for one viewer, or for everyone with the page open:
this.services.play(chime, session);
this.services.play(chime);
```

A sound's name is unique in the channel. A stored sound is at most two
minutes long (the protocol's `MOST_SAMPLES`, the browser's limit).
Controls take sounds to play as their choice moves, as one is made, as a
value changes and as one is refused (`ControlProps`'s `sounds`), and
`SoundList` plays one chosen from a list.

## Long sounds: streams

Something longer than a stored sound, or still being decoded, plays as a
**stream**: a live sound, sent to one viewer a little ahead of what they
have heard (`src/core/stream.ts`, `src/core/live-streams.ts`). Each
viewer has at most one stream, and it is bound to the page it started
on: it stops when they leave. A stream's samples come from a
`StreamSource`:

| Member | What it is |
| --- | --- |
| `name` | What it is, shown while it plays. |
| `rate` | Its sample rate, one the protocol takes: 8, 11.025, 16, 22.05, 24, 32, 44.1 or 48 kHz. |
| `samples()` | The samples known so far, 16-bit mono. Asked again on every send, so a source still decoding gives more each time. |
| `complete` | Whether every sample is known. |
| `failure` | Why it cannot play, or null. |
| `expected` | Its length in samples when known in advance, or null. |
| `speed` | How much faster than its samples it plays what it holds: a stretched source's; 1 when absent. |

A component works the viewer's stream through its services:

| Service | What it does |
| --- | --- |
| `stream(source, session, fromMs?)` | Plays `source` to the viewer, from `fromMs` in; a new stream replaces theirs. |
| `pauseStream(session)`, `resumeStream(session)` | Pauses where they have heard to; resumes from there. |
| `seekStream(session, ms)` | Moves to `ms` in; a paused stream stays paused there. |
| `streamGain(session, gain)` | How loud, 0 to 100, for this stream and the next. |
| `stopStream(session)` | Stops it. |
| `listening(session)` | What plays: its name, how far, how long, its state and gain. |
| `streamPlace(session, name)` | Where their stream of `name` last stopped short of its end, for taking it up again. |

The places are kept in the channel's memory for each viewer, the 64
most recent, and go when the viewer goes.

## The audio player

`AudioPlayer` plays a viewer's tracks: a queue to choose from and edit,
the transport, and its modes.

```ts
// decodeTrack is the program's own: it answers a StreamSource for a file.
h(AudioPlayer, {
  tracks: [
    { name: "Morning news", source: () => decodeTrack("news.wav") },
    { name: "The weather", source: () => decodeTrack("weather.wav") },
  ],
  resume: true,
  spectrum: 3,
});
```

A `Track` is its name and a function that makes its source when it is
played, so a long list costs nothing until a track plays. Without
`tracks` the player works whatever stream something else started.

What it does, and its keys:

| | Remote | Keyboard |
| --- | --- | --- |
| Play or pause, stop, previous, next | the buttons | `p`, `s`, `<`, `>` |
| Seek 5 seconds, or 30 in a track of 10 minutes or more | Left, Right | |
| Jump to a tenth of the way (with `digits`) | 0 to 9 | |
| Seek to a place | | a click on the bar |
| Volume | Up, Down on a button | `+`, `-`; `m` mutes |
| Repeat off, all, one; shuffle | | `r`; `z` |
| Speed, half to double, its pitch kept | | `[`, `]` |
| Loop a part, A to B | | `l` from, `l` to, `l` off |
| Sleep after 15, 30 or 60 minutes | | `t` |
| Edit the queue at the list's choice | | `x` or Delete out, `K` `J` up and down, `.` next |

Previous starts the track again once it is more than 5 seconds in.
`PLAYER_KEYS` lists the keyboard's keys for a page's `KeyHelp`. Its
speed is a WSOLA time-stretch (`src/feedback/time-stretch.ts`), made a
couple of seconds ahead as the track plays, and it keeps a track's
pitch.

The player's parts are components too, for a player of another shape:
`ListeningView`, `Transport`, `PlayerStatus`, `PlayQueue`, `Spectrum`
and `PlayerView`. `NowPlaying` shows only what plays.
