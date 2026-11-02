# Changes

Each release of the library: what changed for a program built on it,
and what such a program has to change to take it.

## 14.0.0 (2 November 2026)

### To take it

- **Still built on `neoteletext-server-ts-protocol` 7.0.0, protocol version 6.** A
  program changes nothing of its own. A `RawSubPage` does not take the new prop:
  its screen colour is in its TTI.

### What changed

- **`screenColour` on `Frame` and `SubPage`** sets the colour of the screen around
  the page: a Colour Map entry from 0 to 31, sent as a Full Screen Colour triplet
  (EN 300 706 Table 28), the first of the sub-page's X/26 as Annex A.5 asks. Each
  sub-page has its own, and it is seen at Level 2.5. It takes one of the local
  data's 208 triplets, so a page whose controls would fill them keeps one fewer
  run. A value outside 0 to 31 throws a `RangeError` at the draw.

## 13.0.0 (2 November 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 7.0.0, still protocol version 6.** A
  program installs kit 7.0.0 beside this release. A program that places a cursor
  itself keeps it on rows 1 to 23: `Screen.cursor` now throws on row 0 or 24,
  which the server refused already, so a field with its cursor on either row
  fails at the draw rather than at the server.

### What changed

- **`context.deny(session, status)`** ends a viewer's selection without a page,
  from the kit, for an application beside the library's.
- **What `joined` sends reaches the viewer who joined,** from the kit.

## 12.0.0 (1 November 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 6.0.0, still protocol version 6,**
  whose message set gained `describe` and `description`. A program installs kit
  6.0.0 beside this release and changes nothing of its own.

### What changed

- **A page may say what it shows on the web.** A `PageSpec`'s `describe()` gives
  `{ public: true, title, text }` for a page anyone may read at its address, as
  a picture of the channel's copy with its text hidden for search engines.
  Without it a page is not public, and it is called with nothing, so that it can
  hold no viewer's data.

## 11.0.0 (1 November 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 5.0.0, protocol version 6.** A
  program installs kit 5.0.0 beside this release. The kit copies a selection's
  number, so nothing changes in a program for that.

### What changed

- **A viewer's query reaches `root(params)`.** On a page that keeps a copy for
  each viewer, the query of the address selected is what the page is made
  with, as `services.redirect(session, page, params)`'s params are, so
  `?article=5` shows that article. Its values are strings, and untrusted: a
  root reads them as it would any text from a viewer. A selection with no
  query leaves behind what a query gave, and never what a redirect gave.

## 10.0.0 (1 November 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 4.0.0, protocol version 5.** A
  program installs kit 4.0.0 beside this release. A program with its own
  `Application` beside the library's moves its `query` and `parameters`
  hooks to the kit's one `request` hook.
- **`services.query(session)` is gone.** A viewer's query no longer arrives on
  the connection: it always comes with a selection, so there is one kind of
  parameter, and **`services.parameters(session)`** gives it for this page, as
  before, the query of the address selected. A component that read the query
  of the address opened reads the parameters of the page it is on.
- **`params` are not touched:** a page's `root(params)` still has what
  `services.redirect(session, page, params)` gave it.

## 9.0.0 (1 November 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 3.0.1, protocol version 4.** A
  program installs kit 3.0.1 beside this release and changes nothing of its
  own.
- **`services.query(session)`** gives the query of the address a viewer
  opened, and **`services.parameters(session)`** the page parameters of what
  they selected on this page, both null when there are none, both untrusted
  text from the viewer, undecoded. The bus's `parameters` event says when a
  page's change, with null once another selection has left them behind.

## 7.0.3 (31 October 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 1.0.3**, for the server of
  neoteletext-common's DEC-1538: input comes for the sub-page the viewer
  was looking at, and a program installs kit 1.0.3 beside this release
  and changes nothing of its own.

### What is new

- **`lost` on a key's release and a pointer's release:** the page lost the
  input, the key or button did not come up, because the viewer moved
  away, the keys left the page or the connection went (the engine's
  REQ-207). A component holding something, such as a slider in the middle
  of a drag, can tell that from the viewer letting go. It is no click.

## 7.0.2 (31 October 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 1.0.2**, which numbers a
  page's sub-pages by the code of practice (the engine's REQ-317 version
  2): one sub-page 0000; 2 to 79 sub-pages 0001 to 0079; more than 79
  only sub-codes above 0079, the decimal ones first from 0100, then those
  with a hexadecimal digit, at most 8,069. A page of 80 or more sub-pages
  is numbered from 0100, not 0001. A program installs kit 1.0.2 beside
  this release and changes nothing of its own. The 7.0.0 entry's
  `decimal_subpages` numbering no longer holds.

## 7.0.0 (30 October 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 1.0.0, protocol version 2**
  (DEC-1482): the server asks the program for each tab's sub-page
  (`connected`, `selected`) and the kit answers from the pages the
  library publishes, one sub-page at a time; nothing is published for
  everyone in the server any more. A program installs kit 1.0.0 beside
  this release and needs no change of its own to its components.
- **`limits().standard.numberedSubpages` is gone:** a page holds up to
  `limits().standard.subpages` sub-pages (8,190), the first
  `decimal_subpages` of them numbered with sub-codes a viewer can key.

## 5.0.0 (28 October 2026)

### To take it

- **Local echo is withdrawn** (the engine's E.134): the receiver draws
  nothing of what is typed, and the page shows it, as `TextField` always
  did. `Canvas.cursor` takes the row, the column and the flags, no width;
  `CursorFlag.Echo` and `CursorFlag.Masked` are gone, `CursorFlag.Block`
  stays. A component that drew a cursor with a width drops it.
- **Built on `neoteletext-server-ts-protocol` 0.5.0**, whose `Screen.cursor`
  takes no width and writes the CU line's third field as 0: a program
  installs it beside this release.

## 4.0.0 (28 October 2026)

### To take it

- **Sound is Opus.** Receivers on macOS, Windows, Linux, iOS and Android
  play Opus alone, which the program encodes and the server carries
  unchanged (teletext-server's decision 21); a channel on 3.x was silent
  on them. Every stored sound and stream now goes as Opus, encoded with
  ffmpeg's libopus: the host has ffmpeg with libopus on its path, or the
  channel gives `ComponentChannel` an encoder,
  `new ComponentChannel(pages, { opus })`. A test gives the protocol's
  `fakeOpus()`, which runs nothing. Microcontroller receivers, which
  decode no Opus, hear nothing until they are supported.
- **Built on `neoteletext-server-ts-protocol` 0.4.0**, which has the
  Opus members and encoder: a program installs it beside this release.
- **A stream starts once its encoder's first packets come**, a few tens
  of milliseconds after it is asked for, and its listening state is
  `waiting` until then. An encoder that fails shows as the stream's
  failure; a sound that cannot be encoded is said in the channel's log
  and not played.

## 3.1.0 (28 October 2026)

### Fixed

- The hint row cut what a hovered row is, or what a click does, at its
  first comma, so "By Tom Hallett, 100 words: …" showed as "By Tom
  Hallett". Only what the keys do keeps whole entries; such words are cut
  where the row ends, with `..`. A component of the program's own whose
  `hint()` says what it is answers true from `hintDescribes()`; a hint row
  of the program's own reads `hintIsKeys`.

## 3.0.0 (28 October 2026)

### To take it

- **The packages are renamed.** This one is
  `neoteletext-server-ts-ui-components`, built on
  `neoteletext-server-ts-protocol` 0.3.0, the protocol under its new name.
  A program installs both releases from its `vendor/` and imports from
  the new names.
- **A control says its keys as a list.** `Control`'s `keysHint()` is gone:
  a control of the program's own overrides `keyBindings()` instead,
  answering entries of a key and what it does, as
  `[["Up Down", "choose"], ["Enter", "plays"]]`. The hint row says them
  in a line, and `KeyHelp` lists them.
- **A modal dims the page behind its dialog.** Give `Modal`
  `scrim: false` for the old look.
- **Typed text reaches the focused component first.** A key that types a
  character now goes to the focused component's `onText` before the
  `onKey` of the components above it. A page whose shortcut on a letter
  sits above a field now sees the field typed in instead; put such a
  shortcut on a key that is not a letter, or in `onPageKey`.
- **`Listening` has `gain`**, and `Services` has `seekStream`,
  `streamGain` and `streamPlace`, and `stream` takes a start: a program
  that makes its own `Listening` or `Services`, as a test double might,
  adds them.
- **The audio player is taller**: five rows with its modes' two, and its
  queue under them when it has tracks. A page laid out round it moves
  what is under it down.
- **A dialog's hint is shorter**, to fit the hint row: "Tab chooses,
  Enter answers, Esc cancels". The hint row now shows as many whole key
  entries as fit, never one cut short.
- **No black ink.** Black as a colour code (alpha and mosaic black) has
  no response at Level 1 (EN 300 706 Table 26), so a page drawn with it
  misreads on a Level 1 decoder. The success and warning looks, buttons'
  and dialogs' labels, switches, wizard steps, number inputs and Fastext
  tabs now ink in blue on light bands and white on dark ones (`inkOn`), a
  disabled chip has no band, as a disabled button does, and a black
  background is set with Black Background. A program that drew black ink
  of its own sees the gate refuse it in its catalogue.
- **Pointer areas are gone.** The input protocol withdrew them on 28 October
  2026 (DEC-657): every move over the page now comes, a button held or not,
  so a page declares nothing for the pointer's moves. `Canvas`'s
  `pointerArea` and `wholePagePointerArea` are removed, with the pointer
  part of `readDeclarations`; column mode 01010 is never written. A move
  with no button held goes, as a click does, to the component drawn in its
  cell and up from it: a component of the program's own that takes moves
  in `onPointer` answers false to one with no button held that it does not
  want. Controls (section 7.3) and hovers are as they were.
- **A dialog's title starts with its kind's mark** (`i`, `OK`, `!`, `X`),
  so its kind shows without its colour.
- **Layouts that move:** `NumberInput` takes two rows, for its complaint;
  a `RadioGroup` across a row too narrow wraps; `ProgressBar`'s solid
  track is a cell shorter, so solid and separated bars line up; a
  `ColumnChart` whose labels do not fit puts them on two rows; a `Tree`
  indents each level four cells, for its guides; `PieChart` is larger
  and round on the screen.
- **`PageRequests` has `displayAttributes`**: a program that makes a
  `Canvas` itself, as a test might, passes
  `{ cursor: null, displayAttributes: [] }`.
- **`Article` has no `summary` or `link`.** Neither was drawn; a
  program that gave them drops them.
- **A component that lays a background under its children** says it
  with `innerBackground()`, for their bands to end back to: a component
  of the program's own that paints a band round its children overrides
  it, as `Dialog` and a banded `Panel` do.
- **`DoubleWidth` reads at Level 1**: its letters are spaced out on the
  row, each followed by the space it covers at Level 2.5, and its double
  width is in the page's X/26 enhancement data, not the Level 2.5-only
  Double Width code (EN 300 706 Table 26).

### Keys and focus

- When a dialog closes, the keys go back to the control that had them
  before it, not to the page's first control.
- An arrow no control takes moves the keys to the control nearest that
  way, for a remote, which has no Tab.
- A component above the focused one may take a key before it
  (`onKeyCapture`); one anywhere on the page may take a key no other took
  (`onPageKey`).
- `JumpLabels`: `0` puts a digit on each control, and the digit goes
  there.
- `KeyHelp` with no keys of its own lists those of the control that has
  them.

### Lists

- `ChoiceList`'s `itemKey`, `Menu`'s `itemKey` and `DataTable`'s
  `rowKey` keep the chosen item chosen as items arrive above it.
- `ChoiceList`'s `pick`: the rows shown chosen by a digit or a coloured
  key.
- `FilterList`, a list that narrows as the viewer types, and
  `PageFinder`, which finds a page by name.

### The look

- `canvas.displayAttributes(row, column, flags)` asks for Level 2.5
  display attributes (`DisplayAttribute`) in the sub-page's X/26
  enhancement data, on every sub-page that paints them.
- `Dialog`'s `shadow`, a drop shadow, and `disabledButtons`.
- `Modal`'s `scrim`, the page dimmed behind it.
- `JoinedPanels`: panes in one frame, their borders shared.
- A toast can carry an `undo`, run by its key (`u`) or a click.

### Audio

- `AudioPlayer` plays `tracks`: a queue to choose from and edit,
  Previous and Next, repeat and shuffle, seeking (by step, by digit, by a
  click on the bar), volume and mute, speed from half to double with the
  pitch kept, an A–B loop, a sleep timer, a `spectrum`, and, with
  `resume`, each track from where the viewer left it.
- `stretched`, a source played faster or slower; `ProgressBar`'s
  `onSeek`.

### New components

`BreakdownBar`, `PieChart`, `Bracket`, `Spectrum`, `MapMarkers`,
`MetricCard`, `TaskList`, `ProgressList`, `Loading`, `Skeleton`,
`Stopwatch`, `BigText`, `SegmentField`, `MultiTapField` and
`TypeToConfirm`.

### Fixed

- Typing into a field inside a dialog was lost: the dialog took every
  key.
- A page whose only component was an audio player was shared, and so
  showed nothing.
- Jump labels no longer overwrite the controls they label.
- `DoubleWidth` drew nothing: its colour code fell under its first
  letter.
- List rows kept their leading spaces, so a tree's leaves and a toggle
  list's unstarred items line up with the others; a tree's guides join
  its items to their parents; a tree item of no children is a leaf.
- `TabStrip` drew a later tab in the place of one that did not fit;
  `DataTable` and `Table` kept their choice and their label column within
  bounds; `FilterList` counts characters and goes to the best match;
  `DayPages` goes on over sub-pages instead of dropping headlines;
  `QrPanel` with no code says nothing of scanning; a disabled or finished
  `Wizard` takes no keys.
- `NumberInput`'s range shows whole and its step is checked; `Button`
  inks its label to read on its background; `Calendar` follows its props
  and normalises its month; `BigDigits` counts characters and bounds its
  work; `ListeningView` shows hours and no bar for a failed stream;
  `TaskList`'s waiting mark is not the cut mark; `Spinner`'s label keeps
  its column; `Transport` and `PlayQueue` claim only their own keys.
- A chip inside a dialog or a banded panel no longer ends in a black
  notch: its band ends back to the colour round it.
- A donut `PieChart`'s colours fall where fewer sixels are drawn wrong,
  so its ring keeps its shape beside the hole.
- `PieChart` has no seam or notches; `Wheel` is symmetric and marks its
  lit segment by shape; `ColumnChart`, `Bracket` and `Roulette` no longer
  cut their words; `ScatterPlot` and `Sparkline` drop values that are no
  number; `Heatmap` and `Sparkline` bound their label column;
  `PaintCanvas` follows its size; `MapMarkers` counts names it dropped.

## 2.0.0

Every component a class: no function components, and no hooks.

## 1.0.0

The first release.
