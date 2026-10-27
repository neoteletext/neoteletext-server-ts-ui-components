// Text typed with the remote's digit keys, as on a phone's keypad: each
// key has its letters (2 abc to 9 wxyz, 1 punctuation, 0 a space), and
// pressing it again soon after goes on to its next letter, round to the
// first. Another key, Enter or a pause takes the letter; a key with one
// character types it at once. The yellow key, or `#` as a phone's keypad
// has it, changes between small letters and capitals. Typing from a
// keyboard or a phone goes in as it is. The server draws the text, the
// letter being chosen, a block for the cursor and, under them, the case and
// the chosen key's letters, since the receiver's echo would show the
// digits pressed rather than the letters they mean (text-field.ts).
// Backspace takes back the letter being chosen, or else the last; Enter
// sends submit up the tree; Escape clears, or sends cancel when it is
// clear.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type PointerEvent, type TextEvent } from "../core/events.ts";
import { colourKeyOf, digitOf } from "../core/keys.ts";
import { DISABLED, EMPTY } from "../core/look.ts";
import type { PageNeeds } from "../core/needs.ts";
import { fit } from "../core/text.ts";
import { Colour, Key } from "../kit.ts";
import { characters, paintDrawnLine, typedCharacters } from "./drawn-line.ts";
import { type ValueProps, ValueControl, type ValueState, type KeyHelpEntry } from "./value-control.ts";

export interface MultiTapFieldProps extends ValueProps<string> {
  /** The most characters it takes; LONGEST when absent. */
  readonly longest?: number;
  readonly onSubmit?: (text: string, session: number) => void;
  readonly background?: Colour;
  /** Enter leaves the text there rather than clearing it. */
  readonly keep?: boolean;
}

/** The key being pressed again, and the letter of its letters it has come to. */
interface Tapping {
  readonly digit: number;
  readonly letter: number;
  readonly session: number;
}

interface MultiTapFieldState extends ValueState<string> {
  readonly tapping: Tapping | null;
  readonly capitals: boolean;
}

/**
 * Each digit key's letters, 0 to 9: ITU-T E.161's letters for 2 to 9, and
 * a phone's space on 0 and its common punctuation on 1.
 */
const KEYPAD = [" ", ".,?!'-", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"] as const;

/** How long a key's letter waits for its next press before it is taken: a phone's, long enough to press again, short enough not to wait on. */
export const MULTI_TAP_COMMIT_MS = 1_000;

/** The most characters it takes when not told: a line of the field's at the least label. */
const LONGEST = 30;
/** The most a program may ask it to take: a field is a line, and what is not shown is not checked by its viewer. */
const MOST_LONGEST = 240;

/** The coloured key that changes the case: yellow, the third (EN 300 706 clause 9.6). */
const CASE_COLOUR_KEY = 2;
/** The key a phone's keypad changes the case with. */
const CASE_KEY = "#";
/** The cells a background takes before the line: its colour and New Background. */
const BACKGROUND_CELLS = 2;
/** The region its band is. */
const FIELD = "field";
/** The case's word on the row under the text. */
const SMALL = "abc";
const CAPITALS = "ABC";

/** Key `digit`'s letters, in the case. */
function lettersOf(digit: number, capitals: boolean): string[] {
  const letters = characters(KEYPAD[digit] ?? "");
  return capitals ? letters.map((letter) => letter.toUpperCase()) : letters;
}

/** The letter `tapping` has come to, in the case. */
function letterOf(tapping: Tapping, capitals: boolean): string {
  const letters = lettersOf(tapping.digit, capitals);
  return letters[tapping.letter % letters.length] ?? "";
}

export class MultiTapField extends ValueControl<string, MultiTapFieldProps, MultiTapFieldState> {
  override state: MultiTapFieldState = { own: this.props.initial ?? "", tapping: null, capitals: false };
  /** The timer that takes the letter being chosen, or null while none is. */
  #taking: number | null = null;

  protected empty(): string {
    return "";
  }

  /** A page with letters to tap on the digit keys takes the digits, and the yellow key for the case. */
  protected override keyNeeds(): PageNeeds {
    return { digits: true, colourKeys: true };
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Digit keys", "type letters"],
      ["yellow", "ABC"],
    ];
  }

  /** The most it takes: a program's figure, whole, from none to MOST_LONGEST. */
  get #longest(): number {
    const longest = this.props.longest ?? LONGEST;
    return Number.isNaN(longest) ? 0 : Math.max(0, Math.min(MOST_LONGEST, Math.floor(longest)));
  }

  /** The text with the letter being chosen. */
  get #shown(): string {
    const { tapping, capitals } = this.state;
    return tapping === null ? this.value : `${this.value}${letterOf(tapping, capitals)}`;
  }

  override measure(space: Size): Size {
    // The row under the text says the case and the key's letters, or what is wrong.
    return { width: space.width, height: Math.min(2, space.height) };
  }

  override paint(canvas: Canvas): void {
    const field = this.paintLabel(canvas);
    canvas.background(0, field, this.disabled ? Colour.Black : (this.props.background ?? Colour.Blue));
    const at = field + BACKGROUND_CELLS;
    if (this.disabled) {
      const shown = this.value === "" ? "(disabled)" : this.value;
      paintDrawnLine(canvas, 0, at, DISABLED, shown, false);
      return;
    }
    canvas.bandControl(0, field, 1, FIELD);
    paintDrawnLine(canvas, 0, at, Colour.Yellow, this.#shown, this.focused);
    const complaint = this.value === "" ? null : this.complaint;
    if (complaint !== null) {
      canvas.coloured(1, field, Colour.Red, fit(`! ${complaint}`, canvas.width - field - 1));
    } else if (this.focused) {
      canvas.coloured(1, field, EMPTY, fit(this.#status(), canvas.width - field - 1));
    }
  }

  /** The case, and the letters of the key being pressed again with the one it has come to in brackets. */
  #status(): string {
    const { tapping, capitals } = this.state;
    const word = capitals ? CAPITALS : SMALL;
    if (tapping === null) {
      return word;
    }
    // Round brackets: the English set has arrows where ASCII has square ones (EN 300 706 Table 36).
    const letters = lettersOf(tapping.digit, capitals).map((letter, index) => (index === tapping.letter ? `(${letter})` : letter));
    return `${word}  ${tapping.digit}: ${letters.join("")}`;
  }

  /** A press on the band has given it the keys already (core/mount.ts); the click is taken so it goes no further. */
  override onClick(event: PointerEvent): boolean {
    return !this.disabled && event.region === FIELD;
  }

  #stopTaking(): void {
    if (this.#taking !== null) {
      this.clearTimer(this.#taking);
      this.#taking = null;
    }
  }

  /** The text with the letter being chosen taken, which is kept, and nothing being chosen any more. */
  #take(): string {
    this.#stopTaking();
    const { tapping } = this.state;
    if (tapping === null) {
      return this.value;
    }
    const text = `${this.value}${letterOf(tapping, this.state.capitals)}`;
    this.setState({ tapping: null });
    this.change(text, tapping.session);
    return text;
  }

  /** Key `digit` pressed: its next letter if it was the key pressed last, or else its first. */
  #tap(digit: number, session: number): void {
    const { tapping, capitals } = this.state;
    const letters = lettersOf(digit, capitals);
    this.#stopTaking();
    if (tapping?.digit === digit && letters.length > 1) {
      this.setState({ tapping: { digit, letter: (tapping.letter + 1) % letters.length, session } });
      this.#waitToTake();
      this.play("move", session);
      return;
    }
    const text = this.#take();
    if (characters(text).length >= this.#longest) {
      this.play("error", session);
      return;
    }
    if (letters.length === 1) {
      this.change(`${text}${letters[0] ?? ""}`, session);
      return;
    }
    this.setState({ tapping: { digit, letter: 0, session } });
    this.#waitToTake();
    this.play("move", session);
  }

  #waitToTake(): void {
    this.#taking = this.setTimeout(() => {
      this.#taking = null;
      this.#take();
    }, MULTI_TAP_COMMIT_MS);
  }

  /** The keys went elsewhere: the letter being chosen is taken as it is. */
  override componentDidBlur(): void {
    this.#take();
  }

  override onText(event: TextEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const text = this.#take();
    const room = this.#longest - characters(text).length;
    this.change(`${text}${typedCharacters(event.text, room)}`, event.session);
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled || event.action === "release") {
      return false;
    }
    const digit = digitOf(event);
    if (digit !== null) {
      this.#tap(digit, event.session);
      return true;
    }
    if (colourKeyOf(event) === CASE_COLOUR_KEY || isPress(event, CASE_KEY)) {
      this.setState({ capitals: !this.state.capitals });
      return true;
    }
    if (isPress(event, Key.Backspace)) {
      if (this.state.tapping === null) {
        this.change(characters(this.value).slice(0, -1).join(""), event.session);
      } else {
        this.#stopTaking();
        this.setState({ tapping: null });
      }
      return true;
    }
    if (isPress(event, Key.Escape)) {
      if (this.state.tapping === null && this.value === "") {
        this.cancel(event.session);
        return false;
      }
      this.#stopTaking();
      this.setState({ tapping: null });
      this.change("", event.session);
      return true;
    }
    if (isPress(event, Key.Enter)) {
      return this.#submit(event.session);
    }
    return false;
  }

  /** Enter: the letter being chosen taken, and the text, when there is some and nothing is wrong with it, sent. */
  #submit(session: number): boolean {
    const shown = this.#shown;
    const text = shown.trim();
    if (text === "" || (this.props.validate?.(shown) ?? null) !== null) {
      this.#take();
      return false;
    }
    this.emit({ type: "submit", value: text, session, origin: "viewer" });
    this.play("choose", session);
    this.props.onSubmit?.(text, session);
    if (this.props.keep === true) {
      this.#take();
    } else {
      // The value is cleared from what it was: a change to the letter and then to nothing, in one event, would compare the nothing with the value before the letter.
      this.#stopTaking();
      this.setState({ tapping: null });
      this.change("", session);
    }
    return this.props.onSubmit !== undefined;
  }
}
