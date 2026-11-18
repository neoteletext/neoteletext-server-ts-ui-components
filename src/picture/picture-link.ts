// A component that is a link on a picture page (renderer parity PAR-42):
// its drawing or object becomes the picture's link (`regisLinks`,
// `naplpsLinks`), which the viewer's receiver marks, reaches with Tab and
// follows itself (PAR-28, PAR-30).

import type { Component } from "../core/component.ts";

/** What a component that is a link says. */
export interface PictureLinked {
  /** Where its link goes, as a link's target (`"200"`, `"200:0001"`, `"news:300"`), or null for nowhere now. */
  pictureLink(): string | null;
}

/** Where `component`'s link goes on a picture page, or null when it is no link. */
export function pictureLinkOf(component: Component): string | null {
  if (!("pictureLink" in component) || typeof component.pictureLink !== "function") {
    return null;
  }
  const link: unknown = Reflect.apply(component.pictureLink, component, []);
  return typeof link === "string" ? link : null;
}
