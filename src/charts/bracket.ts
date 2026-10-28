// A single-elimination bracket: a column for each round, each match its two
// entrants on two rows with their scores, and each match of a later round
// level with the middle of the two it follows. The first round shown takes
// three rows a match, its two entrants and a row between; each round after
// it, twice the rows of the one before. As many rounds are shown as fit
// across; when they do not all fit, Left and Right move the rounds shown
// a round at a time, or a click on the heading's arrows, and when the
// matches do not fit down, Up and Down move them. A round's name longer
// than its column, as "Quarter-finals" is in the thirteen cells three
// rounds across a page have, takes a second row of the heading, broken at
// a space or after a hyphen. A winner is marked as well as coloured, so it
// is not told by colour alone (core/look.ts).

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
  /** Its two entrants, the first on top; an empty name shows as "tbd". */
  readonly entrants: readonly [string, string];
  /** Their scores, in the entrants' order; one that is no finite number is left blank. */
  readonly scores?: readonly [number, number];
  /** Its winner, 0 for the first entrant and 1 for the second: marked "*" and in yellow. */
  readonly winner?: 0 | 1;
}

/** A round: its name, as its heading, and its matches from the top. */
export interface BracketRound {
  /** Its heading, over its column. */
  readonly name: string;
  /** Its matches, from the top. */
  readonly matches: readonly BracketMatch[];
}

export interface BracketProps extends ControlProps {
  /** The rounds, first to last, a column each. */
  readonly rounds: readonly BracketRound[];
  /** The cells each round's column takes. */
  readonly roundCells?: number;
  /** What it says when there are no rounds; "no rounds" when absent. */
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
/** The heading's rows over the rounds: one, or two for a name longer than its column. */
const HEADING_ROWS = 1;
const MOST_HEADING_ROWS = 2;
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
/** The heading's arrows, before the name and after it. */
const EARLIER_ARROW = "← ";
const LATER_ARROW = " →";
/** Where a name may be broken: at spaces, which go, and after a hyphen, which stays. */
const NAME_BREAKS = /(?<=-)|\s+/u;
const HYPHEN = "-";

/** `name` on at most the heading's rows of `width`, broken at a space or after a hyphen, a line still too long cut with the cut mark. */
function nameLines(name: string, width: number): string[] {
  if (cells(name) <= width) {
    return [name];
  }
  const lines: string[] = [];
  let line = "";
  for (const piece of name.split(NAME_BREAKS).filter((each) => each !== "")) {
    const joined = line === "" ? piece : `${line}${line.endsWith(HYPHEN) ? "" : " "}${piece}`;
    if (line !== "" && cells(joined) > width && lines.length < MOST_HEADING_ROWS - 1) {
      lines.push(line);
      line = piece;
    } else {
      line = joined;
    }
  }
  return [...lines, line].map((each) => fit(each, width));
}

/** A round's heading in `width` cells, its rows from the top: the first with its arrows, the name padded when one follows it so it is at the column's end. */
function headingOf(name: string, width: number, earlier: boolean, later: boolean): string[] {
  const lead = earlier ? EARLIER_ARROW : "";
  const trail = later ? LATER_ARROW : "";
  const nameCells = width - cells(lead) - cells(trail);
  const [first = "", ...rest] = nameLines(name, nameCells);
  return [`${lead}${later ? pad(first, nameCells) : first}${trail}`, ...rest.map((line) => `${" ".repeat(cells(lead))}${line}`)];
}

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

  /** The headings of the rounds a box `width` wide shows, each its rows, with an arrow each way there are more rounds. */
  #headings(width: number): string[][] {
    const shown = this.#shown(width);
    const first = this.#first(width);
    const more = first + shown < this.props.rounds.length;
    return this.props.rounds
      .slice(first, first + shown)
      .map((round, offset) => headingOf(round.name, this.#roundCells - 1, offset === 0 && first > 0, offset === shown - 1 && more));
  }

  /** The heading's rows in a box `width` wide: two when a round shown has a name too long for one. */
  #headingRows(width: number): number {
    return this.#headings(width).some((heading) => heading.length > HEADING_ROWS) ? MOST_HEADING_ROWS : HEADING_ROWS;
  }

  /** The rows of matches a box `width` by `height` shows, under the heading. */
  #matchRows(width: number, height: number): number {
    return height - this.#headingRows(width);
  }

  /** The first row of matches shown in a box, kept so the last matches fill it. */
  #top(first: number, width: number, height: number): number {
    return Math.max(0, Math.min(this.state.top, this.#rowsFrom(first) - this.#matchRows(width, height)));
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.#headingRows(space.width) + Math.max(1, this.#rowsFrom(0))) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.rounds.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no rounds");
      return;
    }
    const shown = this.#shown(canvas.width);
    const first = this.#first(canvas.width);
    const top = this.#top(first, canvas.width, canvas.height);
    const headings = this.#headings(canvas.width);
    const headingRows = this.#headingRows(canvas.width);
    const more = first + shown < this.props.rounds.length;
    this.props.rounds.slice(first, first + shown).forEach((round, offset) => {
      const column = offset * this.#roundCells;
      (headings[offset] ?? []).forEach((line, row) => {
        canvas.coloured(row, column, this.disabled ? DISABLED : HEADING, line);
      });
      if (!this.disabled && offset === 0 && first > 0) {
        canvas.control(0, column + 1, 1, 1, EARLIER);
      }
      if (!this.disabled && offset === shown - 1 && more) {
        canvas.control(0, column + this.#roundCells - 1, 1, 1, LATER);
      }
      this.#paintMatches(canvas, round, offset, top, headingRows);
    });
  }

  /** The matches of `round`, the round `offset` after the first shown, from the row `top` of them, under the heading's `headingRows`. */
  #paintMatches(canvas: Canvas, round: BracketRound, offset: number, top: number, headingRows: number): void {
    const column = offset * this.#roundCells;
    const rows = canvas.height - headingRows;
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
        canvas.coloured(headingRows + at, column, won ? WINNER : LABEL, line);
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
    const top = this.#top(first, width, height);
    this.setState({ first: to, top: Math.floor(top * 2 ** (first - to)) });
    return true;
  }

  #moveRows(step: number): boolean {
    const { width, height } = this.box;
    const first = this.#first(width);
    const top = this.#top(first, width, height);
    const to = Math.max(0, Math.min(this.#rowsFrom(first) - this.#matchRows(width, height), top + step));
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
