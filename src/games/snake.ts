// Snake: a game a frame a tick for each viewer on the page. The arrows
// turn it, or a click on the field turns it toward the click; once it has
// crashed, Enter or a click plays again, and the line that says so is a
// control. The field is not one: under the pointer the browser would light
// the whole field.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/component.ts";
import { isPress, type KeyEvent, type PointerEvent } from "../core/events.ts";
import { cells } from "../core/text.ts";
import type { Sound } from "../core/sound.ts";
import { Colour, COLUMNS, Key, Sixels, SIXELS_ACROSS, SIXELS_DOWN } from "../kit.ts";
import { Control, type ControlProps } from "../input/control.ts";

/** A snake's cell on the field, in sixel pairs: two sixels across a step, so it moves a cell's width. */
interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SnakeProps extends ControlProps {
  /** Milliseconds a frame. */
  readonly everyMs: number;
  readonly rows: number;
  readonly eat?: Sound;
  readonly crash?: Sound;
}

interface SnakeState {
  readonly body: readonly Point[];
  readonly heading: Point;
  readonly food: Point;
  readonly score: number;
  readonly over: boolean;
}

/** The field's size in steps: each step is a block of sixels a cell's width and a third of its height. */
const FIELD_ACROSS = (COLUMNS - 2) * SIXELS_ACROSS;

const START_LENGTH = 4;
/** The region of the line that says a click plays again. */
const AGAIN = "again";

/** Snake: the arrows turn, food makes it longer, the walls and itself end it; Enter starts again. A timer of its own moves it each frame. */
export class Snake extends Control<SnakeProps, SnakeState> {
  override state: SnakeState = this.#fresh();

  protected override keysHint(): string {
    return "The arrows or a click turn; Enter plays again";
  }
  #timer = -1;

  get #down(): number {
    return this.props.rows * SIXELS_DOWN;
  }

  #fresh(): SnakeState {
    const y = Math.floor((this.props.rows * SIXELS_DOWN) / 2);
    const body = Array.from({ length: START_LENGTH }, (_, index) => ({ x: 10 - index, y }));
    return { body, heading: { x: 1, y: 0 }, food: { x: 30, y }, score: 0, over: false };
  }

  override componentDidMount(): void {
    // The copy every viewer shares is the title screen; a viewer's own copy plays.
    if (this.services.session !== null) {
      this.#timer = this.setInterval(() => this.#frame(), this.props.everyMs);
    }
  }

  override componentWillUnmount(): void {
    this.clearTimer(this.#timer);
  }


  #frame(): void {
    const state = this.state;
    if (state.over) {
      return;
    }
    const head = state.body[0];
    if (head === undefined) {
      return;
    }
    const next = { x: head.x + state.heading.x, y: head.y + state.heading.y };
    const crashed = next.x < 0 || next.x >= FIELD_ACROSS || next.y < 0 || next.y >= this.#down || state.body.some((point) => point.x === next.x && point.y === next.y);
    if (crashed) {
      this.setState({ over: true });
      if (this.props.crash !== undefined) {
        this.services.play(this.props.crash);
      }
      return;
    }
    const eaten = next.x === state.food.x && next.y === state.food.y;
    const body = [next, ...(eaten ? state.body : state.body.slice(0, -1))];
    const food = eaten ? { x: this.services.below(FIELD_ACROSS), y: this.services.below(this.#down) } : state.food;
    if (eaten && this.props.eat !== undefined) {
      this.services.play(this.props.eat);
    }
    this.setState({ body, food, score: state.score + (eaten ? 1 : 0) });
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.props.rows + 1) };
  }

  override paint(canvas: Canvas): void {
    const sixels = new Sixels(FIELD_ACROSS, this.#down);
    for (const point of this.state.body) {
      sixels.set(point.x, point.y, true);
    }
    sixels.set(this.state.food.x, this.state.food.y, true);
    canvas.sixels(0, 1, this.state.over ? Colour.Red : Colour.Green, sixels);
    const line = this.state.over ? `Score ${this.state.score}: crashed. Enter plays again` : `Score ${this.state.score}`;
    canvas.coloured(this.props.rows, 0, Colour.Yellow, line);
    if (this.state.over && !this.disabled) {
      canvas.control(this.props.rows, 1, cells(line), 1, AGAIN);
    }
  }

  /** Turns toward `heading` unless that turns it back on itself. */
  #turn(heading: Point): void {
    if (heading.x !== -this.state.heading.x || heading.y !== -this.state.heading.y) {
      this.setState({ heading });
    }
  }

  override onKey(event: KeyEvent): boolean {
    if (this.state.over) {
      if (isPress(event, Key.Enter)) {
        this.setState(this.#fresh());
        return true;
      }
      return false;
    }
    const headings: Record<string, Point> = { [Key.Up]: { x: 0, y: -1 }, [Key.Down]: { x: 0, y: 1 }, [Key.Left]: { x: -1, y: 0 }, [Key.Right]: { x: 1, y: 0 } };
    const heading = event.action === "release" ? undefined : headings[event.key];
    if (heading === undefined) {
      return false;
    }
    this.#turn(heading);
    return true;
  }

  /** A click plays again once it has crashed; while it plays, a click on the field turns it toward the click, along the way the click is further. */
  override onClick(event: PointerEvent): boolean {
    if (this.disabled) {
      return false;
    }
    if (this.state.over) {
      this.setState(this.#fresh());
      return true;
    }
    const head = this.state.body[0];
    if (head === undefined || event.local.row >= this.props.rows) {
      return false;
    }
    // In cells, from the head to the middle of the cell clicked: the field starts after its mosaic colour's cell.
    const across = event.local.column - 1 + 0.5 - (head.x + 0.5) / SIXELS_ACROSS;
    const down = event.local.row + 0.5 - (head.y + 0.5) / SIXELS_DOWN;
    const along = Math.abs(across) >= Math.abs(down) ? { x: Math.sign(across), y: 0 } : { x: 0, y: Math.sign(down) };
    const other = Math.abs(across) >= Math.abs(down) ? { x: 0, y: Math.sign(down) } : { x: Math.sign(across), y: 0 };
    // The other way when the nearer one would turn it back on itself, or when the click is on its own line already.
    const backwards = (point: Point): boolean => point.x === -this.state.heading.x && point.y === -this.state.heading.y;
    const heading = (along.x === 0 && along.y === 0) || backwards(along) ? other : along;
    if (heading.x !== 0 || heading.y !== 0) {
      this.#turn(heading);
    }
    return true;
  }
}
