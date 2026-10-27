// A single-elimination bracket: a column for each round, each match its two
// entrants on two rows with their scores, and each match of a later round
// level with the middle of the two it follows. The first round shown takes
// three rows a match, its two entrants and a row between; each round after
// it, twice the rows of the one before. As many rounds are shown as fit
// across; when they do not all fit, Left and Right move the rounds shown
// a round at a time, or a click on the heading's arrows, and when the
// matches do not fit down, Up and Down move them. A winner is marked as
// well as coloured, so it is not told by colour alone (core/look.ts).

import type { Canvas } from "../core/canvas.ts";
import { type Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type PointerEvent } from "../core/events.ts";
import { DISABLED, LABEL, paintEmpty } from "../core/look.ts";
import { cells, fit, pad, padStart } from "../core/text.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { Colour, Key } from "../kit.ts";
import { cellCount } from "./numbers.ts";

/** A match: its two entrants, their scores when it has them, and its winner, 0 for the first entrant and 1 for the second, once there is one. */
export interface BracketMatch {
  readonly entrants: readonly [string, string];
  readonly scores?: readonly [number, number];
  readonly winner?: 0 | 1;
}

/** A round: its name, as its heading, and its matches from the top. */
export interface BracketRound {
  readonly name: string;
  readonly matches: readonly BracketMatch[];
}

export interface BracketProps extends ControlProps {
  readonly rounds: readonly BracketRound[];
  /** The cells each round's column takes. */
  readonly roundCells?: number;
  readonly empty?: string;
}

/** The first round shown and the first row of matches shown. */
interface BracketState {
  readonly first: number;
  readonly top: number;
}

/** A round's cells, when not given: three rounds across a page of forty. */
const ROUND_CELLS = 13;
/** The fewest cells a round can be drawn in: its colour, the mark, a letter of a name, a space and the score. */
const LEAST_ROUND_CELLS = 6;
/** The heading's row over the rounds. */
const HEADING_ROWS = 1;
/** The rows a match of the first round shown takes: its two entrants and a row between it and the next. */
const MATCH_ROWS = 3;
/** The cells an entrant's line takes before the name: its colour and its mark. */
const LEAD_CELLS = 2;
/** The cells of a score: up to 99, as most sports' are. */
const SCORE_CELLS = 2;
/** The space between a name and its score. */
const SCORE_GAP_CELLS = 1;
/** What marks a match's winner. */
const WINNER_MARK = "*";
/** A winner's colour, beside its mark. */
const WINNER = Colour.Yellow;
/** The headings' colour. */
const HEADING = Colour.Cyan;
/** What an entrant not yet known is shown as. */
const UNKNOWN = "tbd";
/** The regions of the heading's arrows. */
const EARLIER = "earlier";
const LATER = "later";

/** The first row of the match `index` of a round `rounds` after the first shown: the middle of the two it follows, in whole rows. */
function matchRow(rounds: number, index: number): number {
  const span = MATCH_ROWS * 2 ** rounds;
  return Math.floor(span * index + (span - MATCH_ROWS) / 2);
}

/** A score as it is shown: a number in its cells, or nothing for one that is not a number. */
function scoreText(score: number | undefined): string {
  return score === undefined || !Number.isFinite(score) ? "" : padStart(String(score), SCORE_CELLS);
}

/** A bracket of rounds in columns, a window of them when they do not all fit. */
export class Bracket extends Control<BracketProps, BracketState> {
  override state: BracketState = { first: 0, top: 0 };

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Left Right", "rounds"],
      ["Up Down", "matches"],
    ];
  }

  get #roundCells(): number {
    return Math.max(LEAST_ROUND_CELLS, cellCount(this.props.roundCells ?? ROUND_CELLS));
  }

  /** The rounds a box `width` cells wide shows at once. */
  #shown(width: number): number {
    return Math.max(1, Math.min(this.props.rounds.length, Math.floor(width / this.#roundCells)));
  }

  /** The first round shown in a box `width` wide: the state's, kept so the last rounds fill the box. */
  #first(width: number): number {
    return Math.max(0, Math.min(this.state.first, this.props.rounds.length - this.#shown(width)));
  }

  /** The rows the matches take from `first`, its matches three rows each, less the gap after the last. */
  #rowsFrom(first: number): number {
    return Math.max(0, MATCH_ROWS * (this.props.rounds[first]?.matches.length ?? 0) - 1);
  }

  /** The first row of matches shown in a box `height` tall, kept so the last matches fill it. */
  #top(first: number, height: number): number {
    return Math.max(0, Math.min(this.state.top, this.#rowsFrom(first) - (height - HEADING_ROWS)));
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, HEADING_ROWS + Math.max(1, this.#rowsFrom(0))) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.rounds.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no rounds");
      return;
    }
    const shown = this.#shown(canvas.width);
    const first = this.#first(canvas.width);
    const top = this.#top(first, canvas.height);
    const more = first + shown < this.props.rounds.length;
    this.props.rounds.slice(first, first + shown).forEach((round, offset) => {
      this.#paintRound(canvas, round, offset, top, {
        earlier: offset === 0 && first > 0,
        later: offset === shown - 1 && more,
      });
    });
  }

  #paintRound(canvas: Canvas, round: BracketRound, offset: number, top: number, arrows: { readonly earlier: boolean; readonly later: boolean }): void {
    const column = offset * this.#roundCells;
    const headingCells = this.#roundCells - 1;
    const lead = arrows.earlier ? "← " : "";
    const trail = arrows.later ? " →" : "";
    // The name padded when an arrow follows it, so the arrow is at the column's end.
    const nameCells = headingCells - cells(lead) - cells(trail);
    const name = arrows.later ? pad(round.name, nameCells) : fit(round.name, nameCells);
    canvas.coloured(0, column, this.disabled ? DISABLED : HEADING, `${lead}${name}${trail}`);
    if (!this.disabled && arrows.earlier) {
      canvas.control(0, column + 1, 1, 1, EARLIER);
    }
    if (!this.disabled && arrows.later) {
      canvas.control(0, column + headingCells, 1, 1, LATER);
    }
    const rows = canvas.height - HEADING_ROWS;
    const entrantCells = this.#roundCells - LEAD_CELLS - SCORE_GAP_CELLS - SCORE_CELLS;
    // Only the matches in view: a round of many is not drawn past the box's foot.
    for (let index = 0; index < round.matches.length; index += 1) {
      const row = matchRow(offset, index) - top;
      if (row >= rows) {
        break;
      }
      const match = round.matches[index];
      for (const entrant of [0, 1] as const) {
        const at = row + entrant;
        if (match === undefined || at < 0 || at >= rows) {
          continue;
        }
        const won = match.winner === entrant;
        const named = match.entrants[entrant] === "" ? UNKNOWN : match.entrants[entrant];
        const line = `${won ? WINNER_MARK : " "}${pad(named, entrantCells)} ${scoreText(match.scores?.[entrant])}`;
        canvas.coloured(HEADING_ROWS + at, column, won ? WINNER : LABEL, line);
      }
    }
  }

  /** Moves the rounds shown by `step`, the rows shown with them so the same matches stay in view: a round on, a match takes twice the rows. */
  #moveRounds(step: number): boolean {
    const { width, height } = this.box;
    const first = this.#first(width);
    const to = Math.max(0, Math.min(this.props.rounds.length - this.#shown(width), first + step));
    if (to === first) {
      return false;
    }
    const top = this.#top(first, height);
    this.setState({ first: to, top: Math.floor(top * 2 ** (first - to)) });
    return true;
  }

  #moveRows(step: number): boolean {
    const { width, height } = this.box;
    const first = this.#first(width);
    const top = this.#top(first, height);
    const to = Math.max(0, Math.min(this.#rowsFrom(first) - (height - HEADING_ROWS), top + step));
    if (to === top) {
      return false;
    }
    this.setState({ top: to });
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    if (isPress(event, Key.Left) || isPress(event, Key.Right)) {
      return this.#moveRounds(isPress(event, Key.Right) ? 1 : -1);
    }
    if (isPress(event, Key.Up) || isPress(event, Key.Down)) {
      return this.#moveRows(isPress(event, Key.Down) ? MATCH_ROWS : -MATCH_ROWS);
    }
    return false;
  }

  override onClick(event: PointerEvent): boolean {
    if (this.disabled || (event.region !== EARLIER && event.region !== LATER)) {
      return false;
    }
    this.#moveRounds(event.region === LATER ? 1 : -1);
    return true;
  }
}
