// The picture sub-page of an article's home (story-pages.ts): the lead
// picture's own TTI page under the frame's links, or a frame that says
// there is none.

import { type Child, h } from "../core/element.ts";
import { RawSubPage } from "../core/raw-sub-page.ts";
import { Colour } from "../kit.ts";
import { fastextLinks } from "../frame/fastext-bar.ts";
import { Placeholder } from "../text/placeholder.ts";
import { framed, type Framing } from "./document.ts";

/** `picture`, a whole-page TTI from the engine's converter, as the sub-page "Picture". */
export function storyPicture(framing: Framing, picture: string | undefined): Child {
  if (picture === undefined) {
    return framed(framing, "Picture", "picture", h(Placeholder, { text: "No picture for this one" }));
  }
  return h(RawSubPage, {
    key: "picture",
    tti: picture,
    title: "Picture",
    background: framing.background,
    foreground: framing.foreground ?? Colour.White,
    fastext: fastextLinks(framing.prompts),
  });
}
