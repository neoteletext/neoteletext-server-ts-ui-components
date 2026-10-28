// What the viewer is listening to (core/stream.ts): its name, how far it
// has played of how long, and whether it is waiting, playing, paused or
// cannot play, looked at again twice a second while someone watches. When
// nothing plays it draws nothing, as the owner asked, or keeps its rows
// empty when told to so what is under it does not move; the copy every
// viewer shares has nobody to look for, and so draws nothing too.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { Listening } from "../core/stream.ts";
import { Colour } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { ListeningView } from "./listening-view.ts";

/** How often it looks again at what is playing. */
export const LOOK_MS = 500;

/** The rows the display takes: what plays, then how far. */
export const LISTENING_ROWS = 2;

/** Whether `listening` is something to show: a stream waiting, playing, paused or failing, not one stopped or played to the end. */
export function playing(listening: Listening | null): listening is Listening {
  return listening !== null && listening.state !== "ended";
}

/** What a player draws when nothing plays: nothing, or its empty rows when it keeps them. */
export function nothingPlaying(keepRows: boolean, rows: number): Child {
  return keepRows ? h(Gap, { rows }) : null;
}

export interface NowPlayingProps {
  /** The bar's colour; magenta when absent. */
  readonly foreground?: Colour;
  /** While nothing plays its rows stay, empty, so what is under it does not move. */
  readonly keepRows?: boolean;
}

/** What a player last saw playing for its viewer, or null for nothing. */
export interface PlayerState {
  readonly listening: Listening | null;
}

/** The viewer's stream, looked at again twice a second. */
export class NowPlaying extends Component<NowPlayingProps, PlayerState> {
  override state: PlayerState = { listening: null };

  override componentDidMount(): void {
    const session = this.services.session;
    if (session === null) {
      return;
    }
    const look = (): void => {
      this.setState({ listening: this.services.listening(session) });
    };
    look();
    this.setInterval(look, LOOK_MS, { whileViewed: true });
  }

  override render(): Child {
    const { listening } = this.state;
    if (!playing(listening)) {
      return nothingPlaying(this.props.keepRows === true, LISTENING_ROWS);
    }
    return h(ListeningView, { listening, ...(this.props.foreground === undefined ? {} : { foreground: this.props.foreground }) });
  }
}
