// A slider: a value in a range, set by a knob on a track of mosaic sixels,
// two to a cell, so the knob moves half a cell at a time. Left and Right
// step, Page Up and Page Down step ten times, Home and End go to the ends,
// and the pointer sets it where the track is pressed or dragged. The track
// is its control, since a press anywhere on it moves the knob there, and
// the browser holds its pressed look while the knob is dragged; a move
// with no button held is not its. The wheel over it
// steps it, up for more. Filled, the track is thicker up to the knob. The
// value is in a column of its own after the track, as wide whatever its
// unit, so sliders stacked together line up; the label alone marks the
// keys, and the track keeps its colour.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type PointerEvent, type WheelEvent } from "../core/events.ts";
import { WheelLines } from "../core/list-cursor.ts";
import { DISABLED } from "../core/look.ts";
import { BOTTOM_ROW, LEFT_HALF, MIDDLE_ROW, RIGHT_HALF } from "../core/mosaics.ts";
import { cells, padStart } from "../core/text.ts";
import { Colour, COLUMNS, Key, SIXELS_ACROSS } from "../kit.ts";
import { type ValueProps, ValueControl, type KeyHelpEntry } from "./value-control.ts";

export interface SliderProps extends ValueProps<number> {
  /** What it is, in a column of its own before the track. */
  readonly label: string;
  /** The track's left end, and its value when it is given none. */
  readonly min: number;
  /** The track's right end. */
  readonly max: number;
  /** What Left, Right and the wheel move it by, every value a whole number of steps from min; 1 when absent or not more than nought. */
  readonly step?: number;
  /** The track's colour; cyan when absent. */
  readonly foreground?: Colour;
  /** The track is thicker up to the knob. */
  readonly filled?: boolean;
  /** What follows the value: "%", "dB". */
  readonly unit?: string;
  /** The value's text cells after the track, the unit's included: the widest of min and max with the unit, and no fewer than VALUE_TEXT, when absent. Sliders given the same line up. */
  readonly valueCells?: number;
}

/** The value's text cells at the least: a sign, three digits and a unit of one cell, "-100%", or two digits and one of two, "-10dB", so the common ranges line up untold. */
const VALUE_TEXT = 5;
/** The most text cells a value is given: a page's row, so a column from props is not taken on trust. */
const MOST_VALUE_TEXT = COLUMNS;
/** The value's colour, a cell before its text. */
const VALUE_COLOUR_CELLS = 1;
/** Page Up and Page Down move this many steps. */
const PAGE_STEPS = 10;
/** The region its track is. */
const TRACK = "track";

export class Slider extends ValueControl<number, SliderProps> {
  readonly #wheel = new WheelLines();

  protected empty(): number {
    return this.props.min;
  }

  /** Its step: one where it is given none, or one that is not more than nought. */
  get #step(): number {
    const step = this.props.step ?? 1;
    return Number.isFinite(step) && step > 0 ? step : 1;
  }

  #clamp(value: number): number {
    const step = this.#step;
    const stepped = this.props.min + Math.round((value - this.props.min) / step) * step;
    return Math.max(this.props.min, Math.min(this.props.max, stepped));
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Left Right or the wheel", "step"],
      ["PgUp PgDn", "more"],
      ["the knob", "drags"],
    ];
  }

  /** The value's text cells: as told, or the widest of its ends with the unit, never fewer than VALUE_TEXT. */
  get #valueText(): number {
    const told = this.props.valueCells;
    if (told !== undefined && Number.isFinite(told)) {
      return Math.max(1, Math.min(MOST_VALUE_TEXT, Math.trunc(told)));
    }
    const unit = cells(this.props.unit ?? "");
    const widest = Math.max(cells(String(this.props.min)), cells(String(this.props.max))) + unit;
    return Math.min(MOST_VALUE_TEXT, Math.max(VALUE_TEXT, widest));
  }

  /** The track's cells, after its mosaic colour's cell. */
  #trackCells(width: number): number {
    return Math.max(1, width - this.labelCells - 1 - VALUE_COLOUR_CELLS - this.#valueText);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  get #ink(): Colour {
    return this.disabled ? DISABLED : (this.props.foreground ?? Colour.Cyan);
  }

  override paint(canvas: Canvas): void {
    const at = this.paintLabel(canvas);
    const track = this.#trackCells(canvas.width);
    const sixels = track * SIXELS_ACROSS;
    const range = this.props.max - this.props.min;
    const knob = range <= 0 ? 0 : Math.round(((this.value - this.props.min) / range) * (sixels - 1));
    const codes = Array.from({ length: track }, (_, cell) => {
      if (Math.floor(knob / SIXELS_ACROSS) === cell) {
        return (knob % SIXELS_ACROSS === 0 ? LEFT_HALF : RIGHT_HALF) | MIDDLE_ROW;
      }
      const before = (cell + 1) * SIXELS_ACROSS - 1 < knob;
      return this.props.filled === true && before ? MIDDLE_ROW | BOTTOM_ROW : MIDDLE_ROW;
    });
    const after = canvas.mosaics(0, at, this.#ink, codes);
    if (!this.disabled) {
      canvas.control(0, at + 1, track, 1, TRACK);
    }
    canvas.coloured(0, after, this.disabled ? DISABLED : Colour.White, padStart(`${String(this.value)}${this.props.unit ?? ""}`, this.#valueText));
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const step = this.#step;
    const { value } = this;
    const moves: Readonly<Record<string, number>> = {
      [Key.Right]: value + step,
      [Key.Left]: value - step,
      [Key.PageUp]: value + PAGE_STEPS * step,
      [Key.PageDown]: value - PAGE_STEPS * step,
      [Key.Home]: this.props.min,
      [Key.End]: this.props.max,
    };
    const to = event.action === "release" ? undefined : moves[event.key];
    if (to === undefined || !Object.keys(moves).some((key) => isPress(event, key))) {
      return false;
    }
    this.change(this.#clamp(to), event.session);
    return true;
  }

  /** A notch a step: the wheel turned up (dy negative) is more. */
  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const notches = -this.#wheel.lines(event.dy);
    if (notches !== 0) {
      this.change(this.#clamp(this.value + notches * this.#step), event.session);
    }
    return true;
  }

  override onPointer(event: PointerEvent): boolean {
    if (event.action === "release") {
      return true;
    }
    if (this.disabled || (event.action === "move" && event.buttons === 0)) {
      return false;
    }
    const track = this.#trackCells(this.box.width);
    const cell = Math.max(0, Math.min(track - 1, event.local.column - this.labelCells - 1));
    if (event.action === "press" && event.region !== TRACK) {
      return false;
    }
    const fraction = track <= 1 ? 0 : cell / (track - 1);
    this.change(this.#clamp(this.props.min + fraction * (this.props.max - this.props.min)), event.session);
    return true;
  }
}
