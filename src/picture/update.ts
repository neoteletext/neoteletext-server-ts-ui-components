// What one render of a picture page sends (renderer parity PAR-42): the
// stream's new bytes, as parts, and its companions where they changed. A
// writer (regis-picture.ts, naplps-picture.ts) makes it from the scene
// before and the scene now, so that a change of state sends only the
// drawings or objects of the components that changed and the base rows
// that changed, as a teletext render sends the rows that changed.

import type { NaplpsObject, PicturePart } from "../kit.ts";
import type { PictureScene } from "./scene.ts";

/** A link of the picture: a drawing or an object and where it goes. */
export interface PictureLink {
  readonly number: number;
  readonly target: string;
}

/** The NAPLPS objects to send: the whole set, or objects redefined one at a time (ANIM-11, `ONE`). */
export type ObjectsUpdate = { readonly whole: readonly NaplpsObject[] } | { readonly one: readonly NaplpsObject[] };

export interface PictureUpdate {
  /** The stream begins again from these bytes: a new generation, replacing what the receiver has. */
  readonly restart: boolean;
  /** The stream's bytes in order, in pieces that each stand alone, so a message may end between any two. */
  readonly units: readonly (readonly PicturePart[])[];
  /** The links, when they changed; null when not. */
  readonly links: readonly PictureLink[] | null;
  /** The cursor's drawing or object, 0 for none, when it changed; null when not. */
  readonly cursor: number | null;
  /** NAPLPS only: the objects, when they changed; null when not. */
  readonly objects: ObjectsUpdate | null;
}

/** Makes a picture page's updates, keeping what it last made them from. */
export interface PictureWriter {
  /** What to send for `scene`: everything from a restart when `restart`, else what changed since the last scene. */
  update(scene: PictureScene, restart: boolean): PictureUpdate;
}

/** Nothing to send. */
export function isEmpty(update: PictureUpdate): boolean {
  return !update.restart && update.units.length === 0 && update.links === null && update.cursor === null && update.objects === null;
}
