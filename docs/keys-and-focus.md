# Keys and focus

How a key, typed text or a click reaches a component, which component
has the keys, and how to build a page that a viewer with only a
television remote can use.

## What a viewer has

A viewer may have a keyboard and a mouse (the browser), a phone, or only
a remote. Every page should work from the remote alone: the arrows,
Enter, Escape, the digits 0 to 9, and the four coloured keys, red,
green, yellow and cyan. A keyboard sends F1 to F4 for the coloured keys.
Typed letters, Tab, Home, End, Page Up and Page Down, and the pointer,
are extras: use them, but never need them.

## Before the page: page selection and Fastext

The protocol kit's navigation (`Navigation`, in the channel program,
before any component) sees every input first. On a page that does not
own them:

- the **digits** select a page, three digits to a page number, as on a
  television;
- the **coloured keys** follow the page's Fastext links: the frame's
  prompts (`Frame`'s `prompts`), red, green, yellow and cyan.

A page owns the digits, or the coloured keys, when a component on it
needs them: a numbered menu, a list picked by digit, a quiz answered by
colour, a field typed on with the keypad. The library finds this itself
by rendering the page's root once before anything runs (`core/needs.ts`),
and `PageSpec`'s `ownsDigits` and `ownsColourKeys` say it outright. A
page that owns the digits cannot be left by typing a page number, so it
should offer a way out on a coloured key or a link.

## Who has the keys

Exactly one component on a page has the keys: the focused one. It is:

- the first component that takes the keys (`focusable()`), in the order
  they are drawn, when the page opens;
- a control told `autoFocus`, when it arrives (a dialog's field, a newly
  chosen tab's list);
- the control a click lands on, or the nearest one round it that takes
  the keys;
- **after a dialog closes, the control that had the keys before it**:
  the mount remembers which components had them, and gives them back to
  the most recent one still on the page, not to the page's first.

A focused control draws itself so: its label marked `>` and in yellow,
its band in the chosen look (`core/look.ts`).

## The way a key goes

Each key goes through these steps, and stops at the first that takes it
(answers `true`):

1. **Capture.** Each component above the focused one, from the root down
   (`onKeyCapture`). Jump labels and anything that must see a key before
   a field does take keys here.
2. **The focused component's key** (`onKey`).
3. **The focused component's typing.** A key that types a character goes
   to the focused component as text (`onText`) before any component above
   it sees it as a key. So a field typed in gets the letter `p`, even on a
   page whose player pauses at `p`.
4. **The components above it**, nearest first (`onKey`), as a key.
5. **Page-wide keys.** Every component on the page (`onPageKey`): a
   toast's undo key is heard wherever the keys are.
6. **Moving the keys.** Tab moves them to the next component that takes
   them, in the order drawn, wrapping round. An arrow moves them to the
   control nearest that way (`core/focus.ts`). A remote has no Tab, so
   the arrows are how a remote gets from control to control.
7. **Typing for the components above.** Text no one took is offered up the
   tree (`onText`).

A key no component takes is dropped: page selection and Fastext had
their turn first. A click no component takes follows the page link under
it, if there is one.

A click goes to the component drawn in the cell clicked, then up its
parents (`onClick`, `onPointer`); the wheel the same (`onWheel`). The
pointer coming onto a control a component declared tells it (`onHover`).

## Saying what the keys do

Each control says its keys once, as a list (`keyBindings()`), each entry
a key and what it does:

```ts
override keyBindings(): readonly KeyHelpEntry[] {
  return [
    ["Up Down", "choose"],
    ["Enter", "plays"],
  ];
}
```

That one list is what the frame's hint row (row 23) says while the
control has the keys, as "Up Down choose, Enter plays", and what
`KeyHelp` lists when it is given no keys of its own: help for the
control that has the keys, which follows the focus. The hint row has 39
cells; a list longer than that is cut, which the catalogue's checks
report. A control's `hint` prop says something else instead.

## Reaching any control in one or two presses

- **Arrows** move between controls.
- **Jump labels** (`JumpLabels`): `0` puts a digit in the first plain cell
  of each control under it, keeping the control's colours, and the digit
  gives that control the keys. The first nine controls are labelled. The
  page owns the digits.
- **Pick by key** (`ChoiceList`'s `pick`): the rows shown are numbered and
  a digit chooses one, or the first four are lettered R, G, Y, C and a
  coloured key chooses one.
- **Numbered menus** (`Menu`'s `numbered`) and **Fastext tabs**
  (`TabView`'s `fastext` style) do the same for menus and tabs.

## Typing without a keyboard

- `TextField` relies on the receiver echoing what is typed, so it needs a
  keyboard or a phone.
- `SegmentField` takes digits into a template: a PIN, a date, a time.
- `MultiTapField` takes letters from the digit keys as a phone keypad
  does (ITU-T E.161), the yellow key for capitals.
- `TypeToConfirm` shows a code of digits a remote can type in place of a
  name.

## A page for the remote, in short

1. Put the controls in the order a viewer will use them: the arrows and
   Tab follow the drawing.
2. Give a page that owns the digits a way out that is not a page number.
3. Prefer pick-by-key, numbered menus and jump labels to long walks with
   the arrows.
4. Keep each control's keys inside the hint row's 39 cells.
5. Never need a key a remote lacks.
