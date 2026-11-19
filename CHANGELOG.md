# Changes

Each release of the library: what changed for a program built on it,
and what such a program has to change to take it.

## 27.2.0 (19 November 2026)

### What it changes

- **Snapshots for tabs' pictures** (DEC-6875, REQ-6903;
  `neoteletext-common`'s `docs/tab-thumbnails.md` section 7.4): built on
  neoteletext-server-ts-protocol 19.2.1, which answers the server's
  `snapshot` by running the page's selection for a stranger on a
  connection of its own. The library draws that page as for someone who
  has just arrived: no parameters, no viewer, every kept component at its
  own start, the channel's language, and nothing beyond drawing (no state
  asked for, no remember offer, no sound, no stream, no language chosen).
  Its copy is unmounted with its timers before the answer goes.
- **`Services.isSnapshot(connection)`**: whether a connection is a
  snapshot's, for a component with an effect of its own beyond drawing.
- **`PageSpec.snapshots`**: `false` declines every snapshot of the page,
  passed to the kit's `PageEntry.snapshots`. A page that denies a
  connection with no viewer as it is drawn is declined as well.

### To take it

- Take neoteletext-server-ts-protocol 19.2.1 with it (the peer
  dependency is 19.2.1) and replace 27.1.0 with 27.2.0 in `vendor/`.
  Nothing a channel calls changes. A channel whose pages are closed to
  strangers, drawn from one viewer's data, or count visitors looks at
  each: `snapshots: false`, a deny, or an `isSnapshot` check.
- A program on 27.1.0 or before takes the server's `snapshot` for an
  unknown message: the channel moves before the server that sends it.

## 27.1.0 (19 November 2026)

### What it changes

- **Double height in NAPLPS** (DEC-6889, RAS-8 item 5): built on
  neoteletext-server-ts-protocol 19.1.0, whose `text` takes `rows: 2`,
  double-height text in a NAPLPS picture is drawn two rows high again,
  each character 12 dots by 40 lines from its upper row, the same pixels
  as teletext's double height: the frame's title band, headings and
  every double-height component. ReGIS and teletext are unchanged.
- The goldens are drawn again at format 7; only NAPLPS pictures change,
  and only on the rows of double-height text.

### To take it

- Take neoteletext-server-ts-protocol 19.1.0 with it (the peer
  dependency is 19.1.0) and replace 27.0.0 with 27.1.0 in `vendor/`.
  Nothing a channel calls changes.

## 27.0.0 (19 November 2026)

### What it changes

- **NAPLPS on the teletext raster** (DEC-6853, DEC-6857): built on
  neoteletext-server-ts-protocol 19.0.0, a picture page's NAPLPS is
  written in dots of the 480 by 500 teletext raster at six-byte
  precision, shown on the 480 by 460 dots of lines 20 to 479, teletext
  rows 1 to 23. A cell of row r and column c is dots 12c to 12c + 11 of
  lines 20r to 20r + 19, filled exactly by the kit's `rect`; an object's
  rectangle (`naplps_objects`) is its component's cells in those dots;
  rows 0 and 24 are the teletext page's and nothing of the picture is
  drawn there. The 640 by 480 design picture is gone.
- **Text one Noto cell a character** (RAS-8): text is written through the
  kit's `text` at its cell, so every character lies on its own 12 by 20
  cell along a whole row. Double-height text is drawn at single height
  on its upper row in NAPLPS until the kit can write a two-row field
  (DEC-6889, needs the owner's confirmation); ReGIS keeps double height.
- **Program protocol 16**, the kit's: a channel built on 27.0.0 stops on
  a server at 15, and one on 26 stops on a server at 16.
- The goldens are drawn again at format 6; only NAPLPS pictures change.
  A NAPLPS picture's bytes grow by about 32 % (the catalogue's from
  358,809 to 473,433).

### To take it

- Take neoteletext-server-ts-protocol 19.0.0 with it (the peer
  dependency is 19.0.0), and replace 26.x with 27.0.0 in `vendor/`. A
  channel that gives NAPLPS objects or coordinates of its own writes them
  in raster dots (the kit's 19.0.0 notes). Deploy with a server at
  program protocol 16.

## 26.3.0 (19 November 2026)

### What it changes

- **NAPLPS cells meet exactly** (DEC-6849): built on
  neoteletext-server-ts-protocol 18.4.0, whose NAPLPS builder writes
  coordinates at four-byte precision, a picture page's NAPLPS fills
  begin and end on their cells' own raster pixels, so two cells meet
  exactly in one drawing and between drawings, and the raster's last
  dot, 479, is painted. The growing of fills past their cells of 26.2.2
  is gone, and a stream row or component is no longer drawn again when
  only the objects beside it change. Text keeps to its cells along a
  whole line: its field is written in four bytes, where at three a
  line's 32nd character drew two cells left of its own. The goldens are
  drawn again at format 5; only NAPLPS pictures change. A NAPLPS
  picture's bytes grow by about 30 % (the catalogue's from 276,356 to
  358,809).

### To take it

- Take neoteletext-server-ts-protocol 18.4.0 with it (the peer
  dependency is 18.4.0), and replace 26.2.2 with 26.3.0 in `vendor/`.

## 26.2.2 (19 November 2026)

### What it changes

- **NAPLPS cells meet without a black line** (DEC-6847): a picture
  page's NAPLPS fills reach a step past an object's rectangle, which the
  renderer cuts exactly, and into cells an object draws over them, so the
  line or dot that three-byte coordinates fell short by is painted. The
  format 3 goldens showed a black raster line where two rows of objects
  met. The goldens are drawn again at format 4; only NAPLPS pictures
  change, and a stream row or component is drawn again when the objects
  beside it change.

### To take it

- Nothing to change: replace 26.2.1 with 26.2.2 in `vendor/`.

## 26.2.1 (19 November 2026)

### What it changes

- **Test data only.** The picture goldens are drawn again, at format 3,
  by the server whose NAPLPS renderer gives an object exactly the canvas
  pixels whose centre lies in its design rectangle (its DEC-6829). The
  format 2 goldens froze an object's background painting the next row's
  first raster line, so the audio player's "Repeat off" read "ott".
  Nothing the library writes or exports changed.

### To take it

- Nothing to change: replace 26.2.0 with 26.2.1 in `vendor/`.

## 26.2.0 (19 November 2026)

### What it changes

- **ReGIS text is drawn at its width** (DEC-6818): a picture page's
  ReGIS text is written in a unit cell of 16 by 20 (`T(U[16,20])`) in
  place of 15 by 20, which the VT340 draws as 8 by 20 since a unit
  cell's width is a multiple of 8 (the VT330/VT340 manual, volume 2,
  chapter 7, "Unit Cell Size"). Letters were small and widely spaced;
  they now fill their cell as the engine's text pages do. Every ReGIS
  picture's text pixels change; nothing else does.

### To take it

- **Take the protocol kit 18.3.0 with it**, in place of 18.2.0: the
  library pins the kit exactly as its peer. Nothing the library calls
  changed; the kit adds the rule commands `regis_links`, `regis_cursor`,
  `naplps_links` and `naplps_cursor` for a group or a rule.
- A channel that compares its own ReGIS pictures draws them again.

## 26.1.0 (19 November 2026)

### What it adds

- **Pages drawn as pictures** (renderer parity PAR-42, REQ-6774): a
  `PageSpec`'s `renderer`, `"teletext"` when absent as before, `"regis"`
  or `"naplps"`, draws the same components as a ReGIS or NAPLPS picture
  on the page's cell grid, with the same props, state, events and focus.
  Each interactive component is a numbered drawing or an object with its
  hover and pressed looks, named by the page's rule table; a `PageLink`
  is the picture's link and the focused field's caret its cursor; a
  change sends only the drawings or objects that changed. The channel's
  copy is kept by the server (`{ kept: true }`), and a picture page's
  public picture is its kept first sub-page. New exports: `RegisCanvas`,
  `NaplpsCanvas` (each a `Canvas` with its `renderer`), the `Renderer`
  type and the `PictureLinked` interface, which a component that is a
  link implements (`pictureLink()`).

### To take it

- **Take the protocol kit 18.2.0 with it**, in place of 18.1.0: the
  library pins the kit exactly as its peer, and its pictures are the
  kit's `Regis` and `Naplps` builders and its `{ kept: true }` audience.
  A picture page needs a server with the kit's schema (the server's
  renderer parity, program protocol 15). A teletext page is unchanged.

## 26.0.1 (19 November 2026)

### To take it

- **Take the protocol kit 18.1.0 with it**, in place of 18.0.0: the
  library pins the kit exactly as its peer. Vendor both releases under
  the channel's `vendor/`. Nothing the library offers has changed; the
  kit's additions (NAPLPS labels, a picture's title and one object
  redefined) are in its DEPLOYMENT.md.

## 26.0.0 (19 November 2026)

### To take it

- **Take the protocol kit 18.0.0 with it**: the library pins the kit
  exactly. Vendor both releases under the channel's `vendor/`. The kit's
  own changes (`objectPage` takes the object page by its objects; the
  rule table's limits exported by the engine's names; a page entry's
  `keysOf`) are in its DEPLOYMENT.md.
- **`tableLimits` and `TableLimits` are gone**: a table's limits are the
  kit's `MAX_RECTS`, `MAX_RULES` and the rest, by the engine's names
  (REQ-6608). Write a limit by its name, never its figure.
- **A page of several sub-pages** asks for page selection on each
  sub-page by that sub-page's own components (DEC-6599): a sub-page of
  text beside a sub-page with a field now asks for the digits, the keypad
  and the coloured keys, and a page number typed there selects that page.
  A test that compared such a sub-page's table finds `select_digits`,
  `select_keypad` and `fastext_keys` in it.
- **Each sub-page has its own keys**: its own focused component and focus
  history, Tab and the arrows moving among its components, and page keys
  (`onPageKey`) offered to its own components and those it is drawn
  within. A page of one sub-page behaves as before.

## 25.0.0 (19 November 2026)

### To take it

- **Take the protocol kit 17.0.0 with it**, which speaks program protocol
  15, the second form of the page rule table (DEC-6587, DEC-6599,
  DEC-6635): the library pins the kit exactly, and a program on an older
  kit stops at the server's `start`. Vendor both releases under the
  channel's `vendor/`, as DEPLOYMENT.md says. The kit's own changes (every
  call that concerns a page takes its sub-code: `rules`, `queryState`,
  `spriteSheet`, `stopTimeline` and the rest; groups of commands; rows of
  one parameter; modes) are in its README; a channel calls them itself
  only where its own code, beside the library's, sends a page a table or
  animation.
- **A channel that says `ruleTables: "none"` changes nothing else**: the
  library sends no rule table, of any page or sub-page, exactly as on
  24.0.0, and with `"default_rules": "send_all"` the channel is sent every
  input.
- **A test that compares what the channel sent** now finds each `rules`
  message with its `sub`, and every rule's `do` as
  `[{ "type": "report" }]` in place of `[{ "action": "send" }]`. A test
  that read a mount's `rules` reads `subPages.rules`, one table a
  sub-page. `MOST_RECTS` and `MOST_RULES` are gone: `tableLimits(limits)`
  gives both, as the kit's schema has them.
- **A page of several sub-pages** now declares the controls of every
  sub-page, with their rollover colours, where 24.0.0 declared the first
  sub-page's alone: a snapshot of such a page's later sub-pages changes,
  and their buttons and list rows now work for the pointer there.

### A sub-page is a page

- **Each sub-page has its own rule table**, written from the components
  drawn on it and those it is drawn within, and its own cells (REQ-6539
  item 9; neoteletext-common's `docs/page-rules.md`, RULE-54 and
  RULE-112). It is sent for that sub-page's sub-code at every selection
  of it, a selection of another sub-page of the same page included, since
  the server keeps no table and the viewer's browser drops everything of
  a page it leaves; and again only when it changes. The library reads
  which sub-page a selection shows from the kit's `request`; a selection
  of the page with none in particular shows its first.
- **An input is found on the cells of the sub-page it names**, so a click
  on a later sub-page reaches the component drawn there, not the one in
  the same cell of the first (REQ-3776).
- **Every rule only reports**: its one command is a `report` of the
  firing, which the server makes one group every rule shares. The
  browser draws a control's hover and pressed looks itself, so no rule
  forces one (DEC-6670 item 9). Input is still routed by where it landed
  and who has the keys, not by the rule's name or row.
- **`MAX_RECTS` and `MAX_RULES`** are read from the kit's schema, not
  written as figures (REQ-6608), and the channel's log names them, with
  the page and sub-code, when a sub-page asks the whole page for the
  pointer.

## 24.0.0 (18 November 2026)

### To take it

- **Take the protocol kit 16.0.0 with it**, which speaks program protocol
  14 (DEC-6522, DEC-6524): the library pins the kit exactly, and a program
  on an older kit stops at the server's `start`. The kit's own changes
  (a page's rule table, animation, an input's `rule`, `tick` and `target`)
  are in its README.
- **A channel that is to behave exactly as on 23.0.0 says
  `ruleTables: "none"`** in its `ComponentChannel` options and keeps
  `"default_rules": "send_all"` in its entry of the server's
  `channels.json`: the library then sends no rule table, every page has
  the server's default table, and every input is sent as before. Nothing
  else in the channel's code changes.
- **A channel that says nothing, or `ruleTables: "components"`**, has
  each page ask for its own input, as below. Its entry may say
  `"default_rules": "none"`, or leave it out; `"send_all"` changes nothing
  for it, since the default table is only for a page given no table. A
  component, a page and a test written for 23.0.0 work as they are,
  except a test that compares everything the channel sent with a list,
  which now also holds the `rules` messages.

### Each page asks for its own input

- **The library writes each page's rule table from the components on it**
  (REQ-6539; neoteletext-common's `docs/page-rules.md`, RULE-54) and sends
  it to each connection as it opens the page, and again when the
  components come to take something else. A viewer's browser then sends
  the page only what its components take: the keys where one takes them,
  a press on a button's cells, the release and a drag's moves for a
  slider, the wheel over a list that scrolls, the pointer on a control
  where the hint row says what it is. `docs/how-it-works.md` lists every
  rule and when it is asked.
- **Page selection goes on everywhere.** A page whose components take no
  keys asks for the press of the digits (the digit row's keys and the
  keypad's) and of the coloured keys (F1 to F4 and the remote's four),
  which the protocol kit selects pages by, unless the page owns them
  (`ownsDigits`, `ownsColourKeys`). So a page of text is sent those keys
  and nothing else, and a typed page number selects the page as before.
  Only a page that owns both and has no component that takes input sends
  a table with no rules.
- **Three things the kit did are not asked for** on a page whose
  components do not take them: a paste of digits as a page number, a
  click on a page number in a page's text (the browser follows the links
  a page declares itself), and a digit from a key that is neither on the
  digit row nor the keypad.
- **What a channel's own application took of a library page's input
  beside the library** (a second finger, a ReGIS pick) is no longer sent,
  since no rule of the library's asks for it.
- **Input reaches components as before**: by the cell it landed on and by
  who has the keys. `input.rule` says which rule asked for it and is not
  what routes it.

### New

- **`ruleTables`** in `ComponentChannelOptions`: `"components"` (the
  default) or `"none"`, which has the library send no rule table.
- **`pointerInput()`** on a component says what it takes of the pointer on
  its cells (`PointerInput`: `press`, `release`, `moves` of `none`, `held`
  or `all`, `wheel`), where that is less than its handlers could take;
  absent, it is read from the handlers (`takenByHandlers`). `Slider` and
  `ScrollBar` take a drag's moves only; a modal's `Shield` takes nothing
  (`NO_POINTER_INPUT`).
- **`MOST_RECTS` and `MOST_RULES`**, the table's limits, past which a
  page asks the whole page for the pointer, and the channel's log says
  so.
- **A fault a viewer's browser reports of a page's table** is written to
  the channel's log.

## 23.0.0 (18 November 2026)

### To take it

- **Take the protocol kit 15.0.0 with it**, which speaks program protocol
  13 (DEC-6462, DEC-6471): the library pins the kit exactly, and a
  program on an older kit stops at the server's `start`. The kit's own
  changes (sounds as generated members, `{ connection }` audiences,
  `gone`, no cookies) are in its release notes.
- **`session` is `connection` everywhere** (viewer-state.md VS-403): in
  every event a component hears (`event.connection`), every callback the
  library gives (`onPress(connection)` and the rest), `services.connection`,
  the bus's audiences and its events. There is no server session.
- **Cookies are gone** (VS-408): `Services.cookies`, `Services.setCookie`,
  `ViewerCookies`, `LANGUAGE_COOKIE` and `LANGUAGE_COOKIE_SECONDS` are
  removed, with no replacement for a channel's own cookies; what a channel
  kept in one it keeps per viewer in its store. A viewer's language is
  set with `services.setLanguage(connection, tag)`, which the
  `LanguagePicker` calls.
- **The store is keyed by viewer** (VS-405, VS-406): `ofViewer`,
  `keepForViewer`, `update`, `atomically`, `forgetViewer` and
  `forgetViewers` replace `ofSession` and `keepForSession`;
  `MOST_VIEWER_VALUES`, `MOST_VIEWER_VALUE_LENGTH`, `VISIT_VALUE_IDLE_MS`
  and `REMEMBERED_VALUE_IDLE_MS` replace `MOST_SESSION_VALUES`,
  `MOST_SESSION_VALUE_LENGTH` and `SESSION_LIFETIME_MS`. A viewer is a
  `KeptViewer`, their handle and whether they are remembered. The
  database's migration 2 drops every value kept by a session's number at
  the first open: they cannot be given to their viewers.
- **`Tally`'s `vote` and `ballotOf` take a `Voter`** (the connection and
  its viewer, `services.viewer(connection)`); a `Poll` does this itself.
- **The bus's `ended` is `gone`,** told when a connection closes for good.

### What is per viewer now

- **A poll's ballot, a component's kept state (`keptAs`) and a viewer's
  language** are kept under the viewer's handle, so two tabs of one
  viewer share them, a reconnect keeps them, and a connection number the
  server gives again after a restart is given no one's (TODO-6463's leak
  is closed). A vote and its ballot are one transaction.
- **A connection with no viewer** keeps them for its own life. The library
  asks for the viewer's state after the input that made them
  (`requestState`), once; granted, what the connection held becomes the
  viewer's (a vote cast before in another tab is taken back, so the last
  is the one vote); refused, it is not asked again.
- **A viewer's language** is read from the store as each of their
  connections joins and drawn at once in every tab of theirs when they
  choose another.
- **A visit's values** go 24 hours after their last use, a remembered
  viewer's 180 days after; at most 262,144 viewers' values are kept.
- **`services.forgetViewer(connection)`** is a channel's "forget me": it
  ends the viewer's state and deletes what the store keeps for them.
  `services.viewer(connection)` says whether the connection has a viewer
  and whether they are remembered; `services.offerRemember(connection)`
  asks their browser to offer "remember me". A reset of every handle
  deletes every viewer's values.
- **Still per connection:** a viewer's own copy of a page and everything
  in it, what `play`, `stream`, `redirect` and `deny` reach, a page's
  parameters, and a stream's gain and places.
- **The rule** (VS-409): a channel may use a viewer's handle only to
  provide what the viewer asked for on that channel, never for
  advertising, profiling, analytics beyond aggregate counts or sharing;
  it deletes what it keeps for a handle when the viewer's state ends and
  says on its privacy page what it keeps.

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
