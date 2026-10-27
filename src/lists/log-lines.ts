// A log's entries as lines (log-view.ts): each with its time, its level's
// tag in the level's colour, and its text cut to the row.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { paintEmpty } from "../core/look.ts";
import { fit } from "../core/text.ts";
import { Colour, textColour } from "../kit.ts";
import { DATE_FORMATS, formatDate } from "../time/date-text.ts";
import type { LogEntry, LogLevel } from "./log-view.ts";

/** Each level's tag and colour: the tag says it without colour. */
const LEVELS: Readonly<Record<LogLevel, { readonly tag: string; readonly foreground: Colour }>> = {
  debug: { tag: "DBG", foreground: Colour.Blue },
  info: { tag: "INF", foreground: Colour.Cyan },
  warning: { tag: "WRN", foreground: Colour.Yellow },
  error: { tag: "ERR", foreground: Colour.Red },
};

/** Where an entry's parts start: its time after the line's colour cell ("HH:MM:SS"), its tag after its colour's cell, its text after its own. */
const TIME_CELLS = 8;

const TAG_AT = 1 + TIME_CELLS;

const TAG_CELLS = 3;

const TEXT_AT = TAG_AT + 1 + TAG_CELLS;

function time(epochMs: number): string {
  return formatDate(epochMs, DATE_FORMATS.seconds);
}

function known(level: string): level is LogLevel {
  return Object.hasOwn(LEVELS, level);
}

/** An entry's level as the log draws it: a level it does not know, as a feed taken on trust may send, is information. */
function levelOf(level: string): (typeof LEVELS)[LogLevel] {
  return known(level) ? LEVELS[level] : LEVELS.info;
}

export class LogLines extends Component<{ readonly entries: readonly LogEntry[]; readonly empty: string }> {
  override measure(space: Size): Size {
    return space;
  }

  override paint(canvas: Canvas): void {
    if (this.props.entries.length === 0) {
      paintEmpty(canvas, this.props.empty);
      return;
    }
    this.props.entries.forEach((entry, row) => {
      const level = levelOf(entry.level);
      canvas.codes(row, 0, [textColour(Colour.White)]);
      canvas.text(row, 1, time(entry.at));
      canvas.coloured(row, TAG_AT, level.foreground, level.tag);
      canvas.coloured(row, TEXT_AT, entry.level === "error" ? Colour.Red : Colour.White, fit(entry.text, canvas.width - TEXT_AT - 1));
    });
  }
}
