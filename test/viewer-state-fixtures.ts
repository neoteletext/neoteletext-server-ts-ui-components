// What the viewer-state tests share: a channel of a poll, a kept counter, a
// language picker and a "forget me" page on a store, and what they read
// back of it.

import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";

import { fakeOpus, Harness, shows } from "neoteletext-server-ts-protocol/testing";
import {
  type Child,
  Component,
  ComponentChannel,
  type Element,
  Frame,
  h,
  isPress,
  type KeptAs,
  type KeyEvent,
  LanguagePicker,
  Poll,
  type StateStore,
  Tally,
  Text,
} from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

export const POLL = 0x150;
export const COUNTER = 0x151;
export const LANGUAGES = 0x152;
export const FORGET = 0x153;

/** A folder of its own for a test's database, in the repository's ignored tmp/. */
export function scratch(): string {
  const root = join(import.meta.dirname, "..", "tmp");
  mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, "viewer-state-"));
}

/** A channel's "forget me": Enter ends the viewer's state and deletes what is kept for them. */
class ForgetMe extends Component {
  override focusable(): boolean {
    return true;
  }

  override render(): Child {
    return h(Text, { text: "Enter forgets you" });
  }

  override onKey(event: KeyEvent): boolean {
    if (!isPress(event, Key.Enter)) {
      return false;
    }
    this.services.forgetViewer(event.connection);
    return true;
  }
}

/** A count Enter raises, kept for its viewer. */
class KeptCounter extends Component<object, { readonly count: number }> {
  override state = { count: 0 };

  override focusable(): boolean {
    return true;
  }

  override keptAs(): KeptAs {
    return { key: "counter", version: 1 };
  }

  override render(): Child {
    return h(Text, { text: `count ${this.state.count}` });
  }

  override onKey(event: KeyEvent): boolean {
    if (!isPress(event, Key.Enter)) {
      return false;
    }
    this.setState({ count: this.state.count + 1 });
    return true;
  }
}

/** `child` in a frame titled `title`. */
function framed(title: string, child: Element): Element {
  return h(Frame, { title, background: Colour.Blue }, child);
}

/** A channel of a poll, a kept counter and a language picker on `store`, and the poll's tally. */
export function channel(store: StateStore): { readonly harness: Harness; readonly tally: Tally } {
  const tally = new Tally("best", ["one", "two", "three"], store);
  const harness = new Harness([
    new ComponentChannel(
      [
        { page: POLL, title: "Poll", perViewer: true, root: (): Element => framed("Poll", h(Poll, { tally })) },
        { page: COUNTER, title: "Counter", perViewer: true, root: (): Element => framed("Counter", h(KeptCounter, {})) },
        {
          page: LANGUAGES,
          title: "Languages",
          root: (): Element => framed("Languages", h(LanguagePicker, { shown: 4, autoFocus: true, languages: ["en", "ru"] })),
        },
        { page: FORGET, title: "Forget me", perViewer: true, root: (): Element => framed("Forget me", h(ForgetMe, {})) },
      ],
      { opus: fakeOpus(), state: store },
    ),
  ]);
  return { harness, tally };
}

/** The lines the program sent of `type`. */
export function linesOf(harness: Harness, type: string): unknown[] {
  return harness.sent.filter((message) => message["type"] === type);
}

/** Whether the poll's copy for `connection` marks an option as its viewer's vote. */
export function marksAVote(harness: Harness, connection: number): boolean {
  return shows(harness.seen(connection, POLL).rows, "* is yours");
}
