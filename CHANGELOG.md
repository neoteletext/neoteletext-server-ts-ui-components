# Changes

Each release of the library: what changed for a program built on it,
and what such a program has to change to take it.

## 3.0.0 (28 October 2026)

### To take it

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
- **Pointer areas are gone.** INPUT.md withdrew them on 28 October 2026
  (section 7.4): every move over the page now comes, a button held or not,
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
