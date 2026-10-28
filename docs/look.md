# The look

How the library's components look, and the rules a page built on them
should keep, so that every page looks and reads as one channel. The
values are in `src/core/look.ts`.

## What teletext gives

- **40 columns by 25 rows** of cells. Row 0 is the receiver's header;
  the frame (`Frame`) puts its title band on rows 1 and 2, its hint on
  row 23 and its Fastext prompts on row 24, leaving rows 3 to 22 for the
  page.
- **Eight colours**: black, red, green, yellow, blue, magenta, cyan and
  white (EN 300 706 Table 26). No grey, no dim, no underline.
- **Mosaics**: each cell can be 2 by 3 sixels, solid or separated, in
  one colour.
- **Every change costs a cell.** A colour, a new background, a switch to
  mosaics or back is a code that takes the cell it is in, shown as a
  space. A row's look is a run of codes and characters from its first
  cell. This is why a component's text starts a cell or two in from its
  box, why two colours cannot touch, and why a band ends with a black
  cell.

## State is never told by colour alone

Each state has a colour and a mark or a word, so a viewer who cannot
tell the colours apart, or a set that shows them badly, still sees it:

| State | Look |
| --- | --- |
| Chosen, in the list with the keys | blue on a yellow band |
| Chosen, in a list without the keys | cyan, after a `>` |
| A control with the keys | its label marked `>` and yellow |
| Cannot be used (disabled) | blue, the dimmest foreground on black; a band dropped |
| Nothing to show | its words in brackets, in cyan: `(no tracks)` |
| Info | `i` on a cyan chip |
| Success | `OK` on a green chip |
| Warning | `!` on a yellow chip |
| Error | `X` on a red chip |

A control's state shows in words where it has room: "Playing",
"Paused", "Repeat all", "Shuffle on".

## How far a thing stands off the page

Four steps, the same everywhere:

1. **Flat**: text and controls on the page.
2. **A panel**: a frame of mosaic line (`Panel`, `JoinedPanels`) or a
   band of its own colour round its children.
3. **A dialog**: its own background over whole rows, and, with
   `shadow`, a drop shadow: a checker of sixels a cell to its right and a
   row beneath, two cells across, the grey teletext does not have.
4. **A modal**: a dialog over the page, the page dimmed behind it
   (`Modal`'s scrim): every colour the page set drawn in the disabled
   blue and its bands ended, its words kept where they were.

## Rules a page should keep

- **Level 1 first.** A page's rows use only the attributes a Level 1
  decoder acts on. Alpha black, mosaic black, double width and double
  size have no response at Levels 1 and 1.5 (EN 300 706 Table 26), so a
  row that needs them misreads on such a decoder: ink is blue on light
  bands and white on dark ones (`inkOn`), never black, and a black
  background is set with Black Background. What Level 2.5 adds, such as
  double width, goes in the page's enhancement data (packets X/26), over
  Level 1 rows that read correctly on their own.
- **Contrast.** Text is drawn in a colour at least 2:1 against its
  background (WCAG 2.2's contrast ratio). Blue on black, 2.4:1, is as
  dim as it goes, and is kept for what cannot be used. Never yellow,
  cyan or green on white, or green on cyan.
- **Nothing unseen.** No text in its own background's colour.
- **Fit.** Text that does not fit is cut with `..`; a page should not
  need it. The hint row has 39 cells.
- **One focus.** Exactly one control looks focused.
- **Words for state.** Pair every colour that means something with a
  mark or a word.

The catalogue's checks (`test/catalogue/checks.ts`) hold every example
in the docs to the first four, in the gate.
