# Changes

Each release of the library: what changed for a program built on it,
and what such a program has to change to take it.

## 22.0.0 (18 November 2026)

### To take it

- **Take the protocol kit 14.0.0 with it**, which speaks program protocol
  12: the library pins the kit exactly, and a program on an older kit
  stops at the server's `start`. A channel that sends synthesizer sounds
  through the kit renames them as DEC-6461 says; the library sends none.
- **Every browser tab is a session of its own (DEC-6443, the kit
  13.0.0).** The `session` a component, a handler or the bus is given is
  now one tab's, numbered as its connection. Nothing has to change to
  compile; what a channel keeps by session it now keeps by tab.

### What changed

- **By tab, where it was by session:** a viewer's own copy of a page and
  everything in it (the keys' place, a field's text, a wizard's step, the
  pointer); what `play`, `stream`, `redirect` and `deny` reach; a page's
  parameters and params; the bus's events for one session; and a cookie a
  component sets, which reaches the tab that set it at once and the
  viewer's other tabs when they next connect, so a language chosen in one
  tab is drawn in that tab alone until then.
- **`ended` comes for each tab when the server's session closes,** five
  minutes after the viewer's last tab closed, not when the tab closes.
- **State kept for a session (`keptAs`, a poll's vote) is kept under the
  tab's number.** A tab that connects again has another number and starts
  without it, and the server numbers connections from 1 each time it
  starts, so a value kept in a store can be read by another viewer's tab
  of the same number after a restart. Not yet settled: do not keep
  anything private this way until it is.
- **`pick` and `drawingHover`,** the inputs of a page drawn in ReGIS, are
  given to no component: they are the channel's to take through its
  application's input.

## 21.1.0 (4 November 2026)

### To take it

- **Take the protocol kit 12.1.0 with it.** The library pins the kit
  exactly, and now names 12.1.0; nothing else must change.

### What changed

- **Text from outside the program (DEC-2326).** An element takes the prop
  `outside`, read like `language`: under `outside: true` a component's text
  is sent as runs from outside the program, so the server shows a stand-in
  for a character the run's language cannot show instead of refusing the
  page. Give it to what shows text the channel did not write, a dataset's
  or a feed's; the channel's own words stay unmarked, and so do the marks a
  component draws for itself.
- **The kit 12.1.0:** a program can be reached over the Unix domain socket
  `NEOTELETEXT_SOCKET` names, and the testing entry tells tests the
  server's reply limit of 7,000 ms.

## 21.0.0 (4 November 2026)

### To take it

- **Nothing must change.** A channel that passes no store keeps nothing, as
  before. The version is major because the library's interface grew:
  `SqliteStateStore`, `StateStore`, `KeptAs`, `Component.keptAs`, the
  option `state` of `ComponentChannel`, and `Tally`'s third argument.

### What changed

- **What outlasts the program (REQ-1057).** `SqliteStateStore` keeps a
  channel's values in a SQLite database of its own, through Node's built-in
  `node:sqlite`: what every viewer shares by name, and what one viewer owns
  by their session's number and a name, each plain JSON with a version; a
  value of another version is dropped as it is read. Its tables are STRICT,
  every value is a bound parameter, and its schema is made by numbered
  migrations, recorded in the database. A viewer's values go 30 days after
  they were last read or written, the life of a session's cookie, and at
  most 262,144 of 8,192 characters each are kept, the oldest going first.
- **A component's state kept when asked (REQ-1058).** A component whose
  `keptAs()` names a key and a version has its state written to the
  channel's store (`ComponentChannelOptions.state`) as it changes, and laid
  over its own state when it is mounted again for the same session, after
  a restart too; state of another version is dropped. On a viewer's own
  copy of a page only.
- **A poll's votes and ballots kept.** `new Tally(name, options, store)`
  keeps its votes and each viewer's ballot in the store, so a viewer back
  after a restart moves their vote rather than casting another.

## 20.0.0 (4 November 2026)

### To take it

- **Take the protocol kit 12.0.0** beside it: the server speaks program
  protocol 11, and the kit stops on any other.
- **The server's figures are typed** (the kit's `ServerStats` is
  `ServerFigures` and `ChannelCounts`): a component or page that read them
  with the kit's `figure`, `figuresIn` or `Figures`, which are gone, reads
  their fields instead, `most_opened` being a list of pages and their opens,
  the most opened first. A test gives a channel figures with the kit's
  `serverStats` from its testing entry.
- **A test that read a page's TTI through its own copy of `kept-tti.ts`**
  imports `keptTti` from the kit's testing entry and deletes the copy.

### What changed

- **The pointer gone from the page** (protocol 11's mouse `gone`) leaves the
  control it was over, as a HOVER leave would, and lets go of a component
  holding the pointer. A second finger (`touch`) is taken by no component;
  a channel's application still hears it.
- **The kit refuses, before it sends, every message the server would
  refuse**, and checks Opus packets as the server does; its `fakeOpus`
  writes packets of the profile.

## 19.0.1 (3 November 2026)

### What changed

- **`LanguagePicker` and `DayPages` render before they are mounted**, as the
  probe of a page's needs does, instead of reaching the channel: 19.0.0's log
  named them on every channel that used them.

## 19.0.0 (3 November 2026)

### To take it

- **Take the protocol kit 11.0.0** beside it: the server speaks program
  protocol 10 (DEC-2326), and the kit stops on any other.

### What changed

- **What a viewer types is text from outside** (DEC-2326, REQ-2150): the
  text field, the segment field and the typed line of TypeToConfirm and
  the multi-tap field send it as runs marked `outside`, so a character
  its language cannot show becomes a stand-in instead of refusing the
  page. `Canvas.typed` writes such text for a component of your own.
- **`Services.deny(session, status)`** ends a viewer's selection with no
  page, as the kit's `Context.deny` does (DEC-2375).
- **Sub-pages are named in their page's sub-page list** by their frame's
  or page given whole's title, cut to 40 characters (REQ-1503).
- **`PageSpec.level`**: `"3.5"` says the page's text is written for
  Level 3.5, which the server then keeps it within (REQ-2151).
- **A drawn page stops at the 8,069 sub-pages the kit numbers**, reporting
  the rest, instead of making the kit throw past them (TODO-1579 in rdm).
- **A render that reads the services before it is mounted** is named in
  the channel's log at start, since the probe of the page's needs cannot
  see under it.

## 18.0.0 (3 November 2026)

### To take it

- **Take the protocol kit 10.0.0** beside it: the server's languages
  no longer carry `mark_rows`, and Thai (`th`), Lao (`lo`) and Yoruba
  (`yo`) are not among them (DEC-2239, DEC-2240).
- **`oneLineRows(doubleHeight?)`** takes no language: one row a line, two
  in double height, in every language.
- **Gone**: `ListRow`'s `lines` and `markRoom`, `ItemText`'s `pitch`,
  `ListRows`' `lineText`, and `Component.laysOutMarks`. A program that
  passed them drops them.
- **A page laid out for Thai or Lao** has rows to spare: every line takes
  one row.

### What changed

- **Thai and Lao are gone** (DEC-2239): NeoTeletext dropped them, the only
  languages whose lines took more than one row. The mark-row layout
  (`marks.ts`), the rows a list, tab strip, ticker, title band and text
  component kept for marks, the ink, Conceal and Flash copied onto mark
  rows, the single-height rule for double height in Thai and Lao, the
  Fastext row's page number in place of a Thai label, the language
  picker's English name for Thai and Lao, and stand-in text's English for
  components without mark rows are removed. Every language takes one row
  a line.
- **Yoruba is gone** (DEC-2240): its own codes and the characters its sets
  cannot show are no longer listed.

## 17.0.2 (3 November 2026)

### What changed

- **Concealed and flashing Thai and Lao keep their marks with their
  letters**: a line's mark rows take every attribute its letters' row sets
  from its colour on (Conceal, Flash), not the colour alone.

## 17.0.1 (3 November 2026)

### What changed

- **Thai and Lao marks on a band show**: a line's mark rows take its
  letters' ink, so on a band (the title band, a Band, a ticker, a chosen
  list row) the marks are no longer drawn in the band's own colour.

## 17.0.0 (3 November 2026)

### To take it

- **Take the protocol kit 9.2.0** beside it.
- **`lineRows` is gone**: `oneLineRows(language, doubleHeight?)` answers the
  rows one line takes (three in Thai and Lao, its text on the middle one).
  A block of lines in such a language takes fewer rows than before, so a
  page laid out for three rows a line has rows to spare.
- **A list row's props**: `ListRow` takes `lines` and `markRoom`, `ItemText`
  takes `pitch`, and `ListRows` takes `lineText` (an item's text where
  `render` draws it) for laying out Thai and Lao.

### What changed

- **Thai and Lao lines two rows apart** (DEC-2236): in Paragraph,
  LinesBlock, RichText, Headline and a ScrollView's units of text, a line's
  lower vowels share a row with the next line's upper marks, as DEC-604 and
  the server lay them out; a row more only where one column needs both. A
  block of n lines takes 2n + 1 rows, not 3n.
- **Thai and Lao in one-row components**: list rows (ChoiceList,
  LanguagePicker, ToggleList, Menu, Tree, Autocomplete), tabs, Ticker,
  Newsflash, Flashing and Concealed take their mark rows and show the
  language; a list row's control is its letters' row.
- **Stand-in text** (DEC-2237): `ComponentChannelOptions.standIn` gives
  text in a language, and on a page in a viewer's language other than the
  channel's, the channel's own words are drawn as that text, cell for cell,
  so every component shows the language's script. Text that names its
  language, the Fastext row and what a viewer typed are drawn as written
  (`Canvas.asWritten`).
- **Pages in any language fit protocol 8** (DEC-2238): the library tells
  the kit which ASCII each language's set shows at its own codes, so a
  page past 64 runs leaves those runs to their codes; punctuation between
  Arabic-script or kana words is written as the script's own; a Thai or
  Lao line keeps its digits and punctuation in its run.

## 16.0.1 (3 November 2026)

### To take it

- Take the protocol kit 9.1.0 beside it.

### What changed

- **A page in English past the protocol's 64 runs of text is sent**: the kit
  9.1.0 leaves its plain English runs to the codes under them, which are
  what the server's encoder writes. The UI components demo's catalogue page
  came to 86 runs.

## 16.0.0 (3 November 2026)

### To take it

- **Take the protocol kit 9.0.0** (program protocol 8) beside it: its
  `englishCodes`, `foldCharacter`, `SPACE_CODE`, `UNSHOWN` and `ENGLISH` are
  gone. A program that wrote codes for text writes text: `canvas.text`,
  `coloured` and `codes` with strings (`CanvasCell`), and the kit's
  `Screen.text(row, column, text, language)`.
- **A page is published as content, not TTI.** `Mount.render()` answers a
  `DrawnPage` (`key`, `subpages`) and `Mount.lastTti` is `lastPage`; a test
  that read the TTI a channel published reads the kept content.
- **`ComponentChannelOptions` and `LANGUAGE_COOKIE_SECONDS`** come from the
  package as before; a channel that wants another language than English for
  viewers who chose none passes `language`.

### What changed

- **Text in any language** (REQ-2152, DEC-2199). Components hand the canvas
  Unicode in their language, and the page names its own, for the server to
  encode: no component chooses a code for text. Every element takes a
  `language` prop (a tag of the server's languages) for itself and everything
  under it, a `PageSpec` takes `language` for the whole page, and otherwise a
  page is in the viewer's language. What a language's sets lack (a Latin word
  in Russian, a digit in Arabic, an arrow) is written in English, which every
  page reaches; what no set has (`[ ] { } \ | ~`) is folded as the kit folded
  it before.
- **Right to left.** In Arabic, Hebrew and the other right-to-left languages,
  `Text`, `Paragraph`, `LinesBlock`, `DoubleHeight`, `DateText` and the title
  band are flush with the right edge, breadcrumbs run from the right with a
  left arrow, and a line of several runs is in visual order.
- **Thai and Lao take three rows a line**, their marks on the rows around it:
  `Text`, `Paragraph`, `LinesBlock` and a `ScrollView` unit without a height
  take three rows, the title band three single-height rows, and the body
  starts on row 4. Their text is written only where its marks stay in the
  component's own rows on rows 2 to 23; a Fastext prompt in them shows its
  page number.
- **Double height** (DEC-2222): never on rows 0 and 22 to 24, never in Thai
  and Lao, never for a control. `Text`, `Paragraph`, `LinesBlock`,
  `RichText`, `Band`, `Placeholder`, `Notice`, `MetricCard` and `DateText`
  take `doubleHeight`, false by default, a row more for each line.
- **Cookies and the viewer's language** (REQ-2217). `Services.cookies(session)`,
  `Services.setCookie(session, name, value, options)`, `Services.language(session)`
  (the `language` cookie when the server lists it, else the channel's) and
  `Services.languages()`. A new language draws every page the viewer has open
  again in it, and the bus says `language`. `LanguagePicker` lists the server's
  languages and sets the cookie.
- **The rollover packet leaves the designations to the server**, which writes
  them for the page's language.

- **`ScrollView` scrolls any components** beside a scroll bar (REQ-2153, DEC-2219).
  Its children are its units, each as many rows as its `height` prop says, one when
  absent: `h(ScrollView, { shown: 10 }, h(DoubleHeight, { text: "News", height: 2 }),
  "a line", ...)`. A unit is never cut at the view's edge; the arrows move it a unit,
  Page Up and Page Down a screen less one unit, Home and End to the ends, the wheel a
  unit a notch, and a press or a drag on the bar where it is put. Only the units in
  view are rendered, so units out of view are not painted and declare nothing on the
  page; a unit's own state goes when it leaves the view. Where the view stands is each
  viewer's own.
- **`ScrollingText` is a `ScrollView` of its lines,** a line a unit, with the same props
  and the same look. It is no longer a control itself: the `ScrollView` it renders is.
- **The wheel and a press where no component is drawn go to the page's root
  component,** as a key with nothing focused does. A page given whole
  (`RawSubPage`), which declares no cells, now hears the wheel and the pointer
  in its root's `onWheel` and `onPointer` (TODO-2013).

## 15.1.0 (2 November 2026)

### To take it

- Nothing to change: every new field is optional and absent when the receiver sends nothing.

### What changed

- **A component hears what protocol 7 brings a program.** A `KeyEvent` has `mods`, the
  modifier keys held as the kit's `Mods` bits, so a component can tell Control-C from
  `c`; a `PointerEvent` and a `WheelEvent` have `mods`, and `px` and `py`, the dot of
  the page image under the pointer, 12 to a cell across and 20 down, when the receiver
  knows it. Each is absent when the input had none.
- **`compose` reaches a component,** as a `ComposeEvent` (`cursor`, `text`) to the new
  `onCompose`, from the component with the keys and then up. No component of the library
  shows it yet: a field takes what the input method commits, as `text`, and a key with
  Control, Alt or Super held, which brings no text, still types nothing.

## 15.0.0 (2 November 2026)

### To take it

- **Built on `neoteletext-server-ts-protocol` 8.0.0, protocol version 7.** A program
  installs kit 8.0.0 beside this release, and changes nothing of its own unless it
  switches over every kind of `Input`, which has a new one, `compose`.

### What changed

- **A `start` ends every viewer.** A program on a socket that hears `start` again
  gets the application's `ended` for each session it knew, before `start`, from
  kit 8.0.0: a session that returns joins afresh, and what a viewer held goes.
- **`compose` is taken by nothing.** No component shows an input method's text as
  it stands; what it commits still comes as `text`. The new `mods`, `px` and `py`
  of an `Input` do not reach a component yet.

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
