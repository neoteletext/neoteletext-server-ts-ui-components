// LogLines: split from log-view.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { paintEmpty } from "../core/look.ts";
import { fit } from "../core/text.ts";
import { Colour, textColour } from "../kit.ts";
import { DATE_FORMATS, formatDate } from "../time/date-text.ts";
import { type LogEntry, type LogLevel } from "./log-view.ts";

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
      const level = LEVELS[entry.level];
      canvas.codes(row, 0, [textColour(Colour.White)]);
      canvas.text(row, 1, time(entry.at));
      canvas.coloured(row, TAG_AT, level.foreground, level.tag);
      canvas.coloured(row, TEXT_AT, entry.level === "error" ? Colour.Red : Colour.White, fit(entry.text, canvas.width - TEXT_AT - 1));
    });
  }
}
