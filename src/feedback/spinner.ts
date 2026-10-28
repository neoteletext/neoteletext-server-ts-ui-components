// Something is happening: a spinner and what it is doing, moved by a timer
// of its own. Teletext has no spinner glyphs, so the frames are mosaics: a
// sixel going round a cell, a block going to and fro, a cell filling and
// emptying; or dots after the words. Done, it says so and stops. Its words
// start in one column whatever its style, and once it is done, so a
// spinner that changes style or finishes does not move them.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { framePeriod } from "../core/timers.ts";
import { type Size } from "../core/layout.ts";
import { FULL_BLOCK, MOSAIC_BASE, SIXEL } from "../core/mosaics.ts";
import { fit } from "../core/text.ts";
import { Colour, mosaicColour } from "../kit.ts";

export type SpinnerStyle = "orbit" | "bounce" | "fill" | "dots";

export interface SpinnerProps {
  /** What it is doing, after the frames; after "OK" once it is done. */
  readonly label: string;
  /** Its frames; orbit when absent. */
  readonly style?: SpinnerStyle;
  /** The mosaic frames' colour; cyan when absent. */
  readonly foreground?: Colour;
  /** Milliseconds a frame. */
  readonly everyMs?: number;
  /** It has finished: "OK" in green, and the timer stops. */
  readonly done?: boolean;
}

interface SpinnerState {
  readonly frame: number;
}

/** The sixels round a cell, clockwise from the top left. */
const ORBIT = [SIXEL.topLeft, SIXEL.topRight, SIXEL.middleRight, SIXEL.bottomRight, SIXEL.bottomLeft, SIXEL.middleLeft].map((sixel) => MOSAIC_BASE | sixel);
/** A cell filling from the bottom, then emptying from the top: its first frame the bottom row, so it shows from the start, and its empty frame last. */
const FILL = [
  MOSAIC_BASE | SIXEL.bottomLeft | SIXEL.bottomRight,
  MOSAIC_BASE | SIXEL.bottomLeft | SIXEL.bottomRight | SIXEL.middleLeft | SIXEL.middleRight,
  FULL_BLOCK,
  MOSAIC_BASE | SIXEL.middleLeft | SIXEL.middleRight | SIXEL.bottomLeft | SIXEL.bottomRight,
  MOSAIC_BASE | SIXEL.bottomLeft | SIXEL.bottomRight,
  MOSAIC_BASE,
];
/** The cells a bouncing block goes across. */
const BOUNCE_CELLS = 4;
/** The frames' cells, after their colour's: the widest style's, the bouncing block's, so every style's words start in one column. */
const FRAME_CELLS = BOUNCE_CELLS;
/** The words' colour's cell: after the frames' colour and their cells. */
const WORDS_AT = 1 + FRAME_CELLS;
/** What a spinner that is done says before its words, in the frames' place. */
const DONE = "OK";
/** The most dots after the words. */
const MOST_DOTS = 3;
/** Milliseconds a frame when not told: four a second, which the server publishes as page updates. */
const FRAME_MS = 250;

export class Spinner extends Component<SpinnerProps, SpinnerState> {
  override state: SpinnerState = { frame: 0 };
  /** The frames' timer, -1 for none: none once it is done. */
  #timer = -1;

  override componentDidMount(): void {
    this.#start();
  }

  override componentDidUpdate(previous: Readonly<SpinnerProps>): void {
    if (previous.done !== this.props.done) {
      this.#start();
    }
  }

  override componentWillUnmount(): void {
    this.clearTimer(this.#timer);
  }

  #start(): void {
    this.clearTimer(this.#timer);
    if (this.props.done !== true) {
      this.#timer = this.setInterval(
        () => {
          this.setState((state) => ({ frame: state.frame + 1 }));
        },
        framePeriod(this.props.everyMs ?? FRAME_MS),
        { whileViewed: true },
      );
    }
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  /** The mosaic cells this frame. */
  // oxlint-disable-next-line typescript/consistent-return -- every style has a case that returns; the rule does not see that the switch is exhaustive, which tsc checks (noImplicitReturns, switch-exhaustiveness-check)
  #cells(): number[] {
    const { frame } = this.state;
    switch (this.props.style ?? "orbit") {
      case "orbit": {
        return [ORBIT[frame % ORBIT.length] ?? MOSAIC_BASE];
      }
      case "fill": {
        return [FILL[frame % FILL.length] ?? MOSAIC_BASE];
      }
      case "bounce": {
        const span = 2 * (BOUNCE_CELLS - 1);
        const at = frame % span < BOUNCE_CELLS ? frame % span : span - (frame % span);
        return Array.from({ length: BOUNCE_CELLS }, (_, cell) => (cell === at ? FULL_BLOCK : MOSAIC_BASE));
      }
      case "dots": {
        // Its frames are dots after the words.
        return [];
      }
    }
  }

  override paint(canvas: Canvas): void {
    if (this.props.done === true) {
      // "OK" where the frames were, and the words where they always are: the words' colour's cell is a space of the one run of green.
      canvas.coloured(0, 0, Colour.Green, fit(`${DONE.padEnd(WORDS_AT)}${this.props.label}`, canvas.width - 1));
      return;
    }
    const cells = this.#cells();
    if (cells.length > 0) {
      const padding = Array.from({ length: Math.max(0, FRAME_CELLS - cells.length) }, () => MOSAIC_BASE);
      canvas.codes(0, 0, [mosaicColour(this.props.foreground ?? Colour.Cyan), ...cells, ...padding]);
    }
    const dots = this.props.style === "dots" ? ".".repeat(this.state.frame % (MOST_DOTS + 1)) : "";
    canvas.coloured(0, WORDS_AT, Colour.White, fit(`${this.props.label}${dots}`, canvas.width - WORDS_AT - 1));
  }
}
