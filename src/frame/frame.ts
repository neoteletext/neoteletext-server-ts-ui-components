// Every page's frame, as Ceefax laid it out: the server's header on row 0,
// a title band in double height on rows 1 and 2 that names the sub-page
// (the browser lists sub-pages by it), the body on rows 3 to 22, a hint of
// the keys on row 23, and the Fastext prompts on row 24 with their links.

import type { Box, LayoutChild } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { SubPage, type SubPageLinks } from "../core/page.ts";
import { type Colour, COLUMNS } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { FastextBar, fastextLinks } from "./fastext-bar.ts";
import { HintLine } from "./hint-line.ts";
import { TitleBand } from "./title-band.ts";

/** The rows of the frame, from row 0 (the server's header) to row 24. */
export const BAND_ROW = 1;
export const BAND_ROWS = 2;
export const BODY_ROW = 3;
export const BODY_ROWS = 20;
export const HINT_ROW = 23;
export const FASTEXT_ROW = 24;

/** One Fastext prompt: its label and the page it goes to, or none. */
export type Prompt = readonly [label: string, page: number | null];

export type Prompts = readonly [Prompt, Prompt, Prompt, Prompt];

export interface FrameProps {
  /** The title band's text: the sub-page's name. */
  readonly title: string;
  readonly background: Colour;
  readonly foreground?: Colour;
  readonly prompts: Prompts;
  readonly hint?: string;
  /** The Index key's page. */
  readonly index?: number;
  /** No title band: the body starts on row 1, for a page with its own heading (the front page's emblem). */
  readonly bare?: boolean;
}

/** A sub-page with the frame: band, body, hint and prompts. Its children are the body. */
export class Frame extends SubPage<FrameProps> {
  override links(): SubPageLinks {
    return { fastext: fastextLinks(this.props.prompts), index: this.props.index ?? null };
  }

  override render(): Child {
    return [
      this.props.bare === true
        ? null
        : h(TitleBand, {
            key: "band",
            title: this.props.title,
            background: this.props.background,
            ...(this.props.foreground === undefined ? {} : { foreground: this.props.foreground }),
          }),
      h(Rows, { key: "body" }, ...(this.props.children ?? [])),
      h(HintLine, { key: "hint", ...(this.props.hint === undefined ? {} : { text: this.props.hint }) }),
      h(FastextBar, { key: "prompts", prompts: this.props.prompts }),
    ];
  }

  override arrange(_box: Box, children: readonly LayoutChild[]): void {
    // In render's order: the band unless bare, the body, the hint, the prompts.
    const bare = this.props.bare === true;
    const [first, ...rest] = children;
    const parts = bare ? children : rest;
    if (!bare && first !== undefined) {
      first.place({ row: BAND_ROW, column: 0, width: COLUMNS, height: BAND_ROWS });
    }
    const [body, ...after] = parts;
    const top = bare ? BAND_ROW : BODY_ROW;
    body?.place({ row: top, column: 0, width: COLUMNS, height: BODY_ROW + BODY_ROWS - top });
    const prompts = after.at(-1);
    after[0]?.place({ row: HINT_ROW, column: 0, width: COLUMNS, height: 1 });
    prompts?.place({ row: FASTEXT_ROW, column: 0, width: COLUMNS, height: 1 });
  }
}
